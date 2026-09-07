/* Booking form: 5 steps, live indicative quote, then Stripe Checkout for the
   25% deposit. Prices are always re-derived on the server before payment —
   this script only previews them. */
(function () {
  'use strict';

  var form = document.querySelector('[data-booking-form]');
  if (!form) return;

  var $ = function (s) { return form.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(form.querySelectorAll(s)); };

  var cfg = {};
  try { cfg = JSON.parse(document.getElementById('bookingConfig').textContent || '{}'); } catch (e) {}

  var panels = $$('.bpanel');
  var stepItems = $$('#bsteps li');
  var current = 0;
  var quoteTimer = null;
  var lastQuote = null;

  /* ------------------------------------------------------------- prefill */
  try {
    var pre = JSON.parse(localStorage.getItem('mx_booking_prefill') || 'null');
    if (pre && Date.now() - pre.at < 30 * 60000 && pre.journey && pre.journey !== cfg.journey) {
      var sel = $('select[name="journey"]');
      if (sel && Array.prototype.some.call(sel.options, function (o) { return o.value === pre.journey; })) {
        window.location.href = '/book/' + pre.journey + '?pax=' + (pre.travellers || 2) + (pre.nights ? '&nights=' + pre.nights : '') + (pre.month ? '&month=' + pre.month : '');
      }
    }
  } catch (e) {}

  /* --------------------------------------------------------- step machine */
  function show(i) {
    current = Math.max(0, Math.min(panels.length - 1, i));
    panels.forEach(function (p, k) { p.classList.toggle('is-active', k === current); });
    stepItems.forEach(function (li, k) {
      li.classList.toggle('is-active', k === current);
      li.classList.toggle('is-done', k < current);
    });
    $$('.bstep').forEach(function (b) { b.disabled = +b.dataset.step - 1 > current; });
    var back = $('[data-bf-back]');
    var next = $('[data-bf-next]');
    if (back) back.style.visibility = current === 0 ? 'hidden' : 'visible';
    if (next) next.style.display = current === panels.length - 1 ? 'none' : 'inline-flex';
    if (current === panels.length - 1) { renderReview(); refreshQuote(true); }
    var h = panels[current].querySelector('legend');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); }
    window.scrollTo({ top: Math.max(0, form.getBoundingClientRect().top + window.scrollY - 90), behavior: 'smooth' });
    try { localStorage.setItem('mx_booking_draft', JSON.stringify(draft())); } catch (e) {}
  }

  $$('.bstep').forEach(function (b) {
    b.addEventListener('click', function () {
      var target = +b.dataset.step - 1;
      if (target <= current) return show(target);
      if (!validate(current, true)) return;
      var max = 0;
      for (var k = 0; k < panels.length; k++) if (stepItems[k].classList.contains('is-done') || k === current) max = k + 1;
      show(Math.min(target, max));
    });
  });

  $('[data-bf-next]').addEventListener('click', function () {
    if (!validate(current, true)) return;
    show(current + 1);
  });
  $('[data-bf-back]').addEventListener('click', function () { show(current - 1); });

  /* ---------------------------------------------------------- validation */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldsOf(i) {
    return $$('[name]', panels[i]).filter(function (el) {
      return !el.disabled && el.type !== 'hidden' && el.closest('[data-panel]') === panels[i];
    });
  }

  function validate(i, report) {
    var ok = true;
    var firstBad = null;
    fieldsOf(i).forEach(function (el) {
      var bad = false;
      var v = (el.value || '').trim();
      if (el.required && !v) bad = true;
      if (el.type === 'email' && v && !EMAIL.test(v)) bad = true;
      if (el.type === 'number' && v) {
        var n = Number(v);
        if (Number.isNaN(n)) bad = true;
        else if (el.min && n < Number(el.min)) { bad = true; el.value = el.min; nudge(el); }
        else if (el.max && n > Number(el.max)) { bad = true; el.value = el.max; nudge(el); }
      }
      if (el.name === 'travellers' && cfg.isGroup) {
        var t = Number(el.value);
        if (t < cfg.groupMin) { bad = true; if (report) setGroupError('Group journeys need at least ' + cfg.groupMin + ' travellers.'); }
      }
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) { ok = false; if (!firstBad) firstBad = el; }
    });
    // required checkboxes on the consent step
    if (panels[i].querySelector('.consents')) {
      ['agreeTerms', 'agreePrivacy'].forEach(function (n) {
        var cb = form.querySelector('[name="' + n + '"]');
        if (cb && !cb.checked) { ok = false; cb.setAttribute('aria-invalid', 'true'); if (!firstBad) firstBad = cb; }
        if (cb && cb.checked) cb.setAttribute('aria-invalid', 'false');
      });
    }
    if (!ok && report) {
      showError(firstBad && firstBad.name === 'travellers' ? groupMsg() : 'Please complete the highlighted field' + (countMissing(i) > 1 ? 's' : '') + ' before continuing.');
      if (firstBad) firstBad.focus();
    }
    return ok;
  }

  function countMissing(i) {
    return fieldsOf(i).filter(function (el) { return el.getAttribute('aria-invalid') === 'true'; }).length;
  }
  var _groupMsg = '';
  function groupMsg() { return _groupMsg || 'Group journeys need between ' + cfg.groupMin + ' and ' + cfg.groupMax + ' travellers.'; }
  function setGroupError(m) { _groupMsg = m; }
  var notes = {};
  function nudge(el) {
    if (!el.dataset.nudged) {
      el.dataset.nudged = '1';
      setTimeout(function () { delete el.dataset.nudged; }, 4000);
    }
  }

  /* ------------------------------------------------------------- data glue */
  function draft() {
    var extras = $$('[name="extras"]:checked').map(function (e) { return e.value; });
    var party = [];
    $$('[data-bf-travellers] input').forEach(function (el, idx) {
      if (el.value.trim()) party.push({ name: el.value.trim(), note: idx === 0 ? 'lead traveller' : '' });
    });
    return {
      journey: $('select[name="journey"]') ? $('select[name="journey"]').value : cfg.journey,
      pricing: {
        travellers: Number($('[name="travellers"]').value) || (cfg.isGroup ? 12 : 2),
        nights: Number($('[name="nights"]').value) || 7,
        month: $('[name="month"]').value ? Number($('[name="month"]').value) : null,
        roomMode: $('[name="roomMode"]').value || 'shared',
        extras: extras,
        insurance: !!$('[name="insurance"]').checked,
      },
      departureDate: ($('[name="departure"]') && $('[name="departure"]').value) || null,
      groupStyle: (cfg.isGroup && form.querySelector('[name="groupStyle"]:checked')) ? form.querySelector('[name="groupStyle"]:checked').value : null,
      routeNotes: ($('[name="routeNotes"]') && $('[name="routeNotes"]').value) || '',
      access: ($('[name="access"]') && $('[name="access"]').value) || '',
      notes: ($('[name="notes"]') && $('[name="notes"]').value) || '',
      contact: {
        firstName: ($('[name="firstName"]') && $('[name="firstName"]').value) || '',
        lastName: ($('[name="lastName"]') && $('[name="lastName"]').value) || '',
        email: ($('[name="email"]') && $('[name="email"]').value) || '',
        phone: ($('[name="phone"]') && $('[name="phone"]').value) || '',
        country: ($('[name="country"]') && $('[name="country"]').value) || '',
        airport: ($('[name="airport"]') && $('[name="airport"]').value) || '',
      },
      party: party,
      newsletter: !!$('[name="newsletter"]').checked,
      agreed: !!$('[name="agreeTerms"]').checked && !!$('[name="agreePrivacy"]').checked,
      insuranceAcknowledged: !!$('[name="agreeInsurance"]').checked,
    };
  }

  function refreshQuote(force) {
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(function () {
      var d = draft();
      if (!d.journey) return;
      var box = $('.pricebox');
      if (box) box.classList.add('is-loading');
      fetch('/api/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d.pricing ? { journey: d.journey, travellers: d.pricing.travellers, nights: d.pricing.nights, month: d.pricing.month, roomMode: d.pricing.roomMode, extras: d.pricing.extras, insurance: d.pricing.insurance } : d.pricing) })
        .then(function (r) { return r.json(); })
        .then(function (q) {
          if (q.error) throw new Error(q.error);
          lastQuote = q;
          paintQuote(q);
        })
        .catch(function () { /* keep last known figures */ })
        .finally(function () { if (box) box.classList.remove('is-loading'); });
    }, force ? 0 : 340);
  }

  function money(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('en-US'); }

  function paintQuote(q) {
    var dep = $('[data-bf-depositlabel]');
    if (dep) dep.textContent = 'Deposit ' + money(q.deposit) + ' · total ' + money(q.total);
    var pay = $('[data-bf-paylabel]');
    if (pay) pay.textContent = 'Pay the ' + money(q.deposit) + ' deposit & confirm';
    // journey page price rail, when the form is embedded there
    var pb = $('.pricebox');
    if (pb) {
      var set = function (sel, v) { var n = pb.querySelector(sel); if (n) n.textContent = v; };
      set('[data-pb-total]', money(q.perPersonTotal));
      set('[data-pb-trip]', money(q.total));
      set('[data-pb-deposit]', money(q.deposit));
      set('[data-pb-balance]', money(q.balance));
    }
    renderReview();
  }

  function renderReview() {
    var wrap = $('[data-bf-review]');
    var table = $('[data-bf-breakdown] tbody');
    if (!wrap || !table) return;
    if (!lastQuote) { wrap.innerHTML = '<p class="fine">Preparing your quote…</p>'; return; }
    var q = lastQuote;
    var d = draft();
    var dep = q.deposit;
    var rows = [
      ['Journey', q.journeyTitle],
      ['Nights', q.nights + ' nights' + (q.month ? ' · ' + new Date(2026, q.month - 1, 1).toLocaleString('en-US', { month: 'long' }) : '')],
      ['Party', q.travellers + ' traveller' + (q.travellers === 1 ? '' : 's') + (q.leadersFree ? ' (incl. ' + q.leadersFree + ' leader place' + (q.leadersFree === 1 ? '' : 's') + ' free)' : '')],
      ['Rooms', q.roomMode === 'single' ? 'Each traveller alone' : q.roomMode === 'suite' ? 'Suite / family rooms' : 'Two sharing'],
      ['Lead traveller', (d.contact.firstName + ' ' + d.contact.lastName).trim() || '—'],
      ['Email', d.contact.email || '—'],
      ['Phone', d.contact.phone || '—'],
    ];
    wrap.innerHTML =
      '<h3 style="margin:0 0 .5rem;font-size:1rem">Your booking</h3><dl>' +
      rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(String(r[1])) + '</dd>'; }).join('') +
      '</dl>' +
      (d.access ? '<p class="fine" style="margin-top:.6rem"><strong>Access & dietary:</strong> ' + esc(d.access) + '</p>' : '') +
      (q.extras && q.extras.length ? '<p class="fine" style="margin-top:.4rem"><strong>Experiences:</strong> ' + q.extras.map(function (e) { return esc(e.label); }).join(', ') + '</p>' : '') +
      '<p class="fine" style="margin-top:.4rem">' + esc(q.notes[1] || '') + '</p>';

    table.innerHTML = q.breakdown
      .map(function (row) {
        var cls = row.kind === 'total' ? 'is-total' : row.kind === 'deposit' ? 'is-deposit' : row.kind === 'balance' ? 'is-balance' : '';
        var sign = row.kind === 'deposit' ? ' → ' + new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
        return '<tr class="' + cls + '"><td>' + esc(row.label) + '</td><td>' + money(row.amount) + (row.kind === 'credit' ? ' <span class="fine">(credit)</span>' : '') + '</td></tr>';
      })
      .join('');
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* --------------------------------------------------------------- inputs */
  $$('input[name="nights"], input[name="travellers"], select[name="month"], select[name="roomMode"], input[name="extras"], input[name="insurance"], select[name="journey"]').forEach(function (el) {
    var ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(ev, function () { refreshQuote(); if (el.name === 'journey' && el.value !== cfg.journey) { window.location.href = '/book/' + el.value; } });
  });

  /* ------------------------------------------------------- errors + submit */
  function showError(msg) {
    var e = $('[data-bf-error]');
    if (!e) return;
    e.textContent = msg;
    e.hidden = false;
    clearTimeout(showError._t);
    showError._t = setTimeout(function () { e.hidden = true; }, 12000);
  }

  function setBusy(on, label) {
    var pay = $('[data-bf-pay]');
    var quote = $('[data-bf-quote]');
    [pay, quote].forEach(function (b) { if (!b) return; b.classList.toggle('is-busy', on); b.disabled = on; });
    if (pay && label) { var s = pay.querySelector('[data-bf-paylabel]'); if (s) s.textContent = label; }
  }

  function submitAs(mode) {
    // Steps 1–4 must all be valid before anything leaves the browser.
    for (var i = 0; i < panels.length - 1; i++) {
      if (!validate(i, false)) { show(i); validate(i, true); return; }
    }
    var d = draft();
    d.mode = mode;
    d.sourceUrl = location.pathname + location.search;
    d.referrer = document.referrer || '';
    setBusy(true, mode === 'pay' ? 'Creating secure checkout…' : 'Sending…');

    fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.status >= 400 || res.j.error) throw new Error(res.j.error || 'Could not start the booking.');
        if (mode === 'quote') {
          window.location.href = '/booking/confirmation/' + res.j.reference;
          return;
        }
        var ck = res.j.checkout || {};
        if (ck.url) { window.location.href = ck.url; return; }
        window.location.href = '/booking/confirmation/' + res.j.reference;
      })
      .catch(function (err) {
        setBusy(false, 'Pay the ' + (lastQuote ? money(lastQuote.deposit) : 'deposit') + ' deposit & confirm');
        showError(err.message + ' You can also call the Marrakech desk and we will take the booking over the phone.');
      });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); submitAs('pay'); });
  var qb = $('[data-bf-quote]');
  if (qb) qb.addEventListener('click', function (e) { e.preventDefault(); submitAs('quote'); });

  /* --------------------------------------------------------- restore draft */
  try {
    var saved = JSON.parse(localStorage.getItem('mx_booking_draft') || 'null');
    if (saved && saved.journey === cfg.journey && !location.search.match(/pax=/)) {
      if (saved.pricing) {
        if (!location.search.match(/travellers=/)) $('[name="travellers"]').value = saved.pricing.travellers;
        $('[name="nights"]').value = saved.pricing.nights;
      }
    }
  } catch (e) {}

  // Restore contact details only when the URL carries a reference (returning from Stripe).
  if (/[?&]reference=/.test(location.search)) {
    var ref = location.search.match(/[?&]reference=([A-Z0-9-]+)/i);
    if (ref) {
      fetch('/api/bookings/' + ref[1])
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (b) {
          if (!b) return;
          var note = document.createElement('p');
          note.className = 'note note--info';
          note.innerHTML = 'Returning to reference <strong>' + esc(b.reference) + '</strong> — status: ' + esc(String(b.status).replace(/_/g, ' ')) + '.';
          form.appendChild(note);
        })
        .catch(function () {});
    }
  }

  refreshQuote(true);
  stepItems[0] && stepItems[0].classList.add('is-active');
})();
