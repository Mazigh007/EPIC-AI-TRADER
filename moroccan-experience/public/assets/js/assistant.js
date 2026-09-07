/* In-site AI travel assistant.
   - Keeps the transcript in localStorage (never in a cookie), respects the
     "don't use my messages for training" opt-out, and carries slot state so
     it can follow a multi-turn conversation and prefill the booking form. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var btn = $('#chatToggle');
  var panel = $('#chatPanel');
  if (!btn || !panel) return;

  var log = $('#chatLog');
  var chips = $('#chatChips');
  var form = $('#chatForm');
  var input = $('#chatInput');
  var badge = $('#chatBadge');
  var closeBtn = $('#chatClose');
  var noTrain = $('#chatNoTrain');

  var STORE = 'mx_chat_v1';
  var state = load();
  var open = false;
  var busy = false;
  var lastFocus = null;

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (raw && Array.isArray(raw.messages)) return raw;
    } catch (e) {}
    return { messages: [], slots: {}, noTraining: false, greeted: false };
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ messages: state.messages.slice(-24), slots: state.slots, noTraining: state.noTraining, greeted: true })); } catch (e) {}
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function md(text) {
    var escd = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    escd = escd.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, href) {
      var ext = /^https?:/.test(href);
      return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
    });
    escd = escd.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escd = escd.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return escd.replace(/\n/g, '<br>');
  }

  function bubble(role, text, extra) {
    var b = el('div', 'msg msg--' + (role === 'me' ? 'me' : 'bot'), md(text));
    if (extra) b.appendChild(extra);
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function typing() {
    var b = el('div', 'msg msg--bot msg--typing', '<i></i><i></i><i></i>');
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function renderChips(list) {
    chips.innerHTML = '';
    (list || []).forEach(function (label) {
      var b = el('button', null, md(label));
      b.type = 'button';
      b.addEventListener('click', function () { send(label); });
      chips.appendChild(b);
    });
  }

  function sources(list) {
    if (!list || !list.length) return null;
    var wrap = el('div', 'chat__sources', 'Source: ' + list.slice(0, 3).map(function (s) { return s.replace('_', ' '); }).join(' · '));
    return wrap;
  }

  function send(text) {
    if (busy || !text || !text.trim()) return;
    busy = true;
    bubble('me', text);
    state.messages.push({ role: 'user', text: text });
    var dots = typing();
    renderChips([]);
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text.trim().slice(0, 600), history: state.messages.slice(0, -1), slots: state.slots, noTraining: state.noTraining }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        dots.remove();
        if (!data || data.error) throw new Error(data && data.error ? data.error : 'unavailable');
        var extra = null;
        if (data.action && data.action.type === 'prefill_booking' && data.action.journey) {
          extra = document.createElement('div');
          var a = el('a', 'chat__action', 'Open this in the booking form →');
          a.href = '/book/' + data.action.journey + qsp(data.action);
          extra.appendChild(a);
          try { localStorage.setItem('mx_booking_prefill', JSON.stringify({ journey: data.action.journey, travellers: data.action.travellers, nights: data.action.nights, month: data.action.month, at: Date.now() })); } catch (e) {}
        }
        var node = bubble('bot', data.text, extra);
        var src = sources(data.sources);
        if (src) node.appendChild(src);
        state.messages.push({ role: 'assistant', text: data.text });
        if (data.slots) state.slots = data.slots;
        save();
        renderChips(data.chips);
      })
      .catch(function (err) {
        dots.remove();
        bubble('bot', 'The assistant is not reachable right now — the fastest route to a human is **' + (window.MX_CONTACT && window.MX_CONTACT.phoneDisplay) + '** or WhatsApp. ' + (err.message || ''));
      })
      .finally(function () { busy = false; setTimeout(function () { input.focus(); }, 60); });
  }

  function qsp(a) {
    var p = [];
    ['travellers', 'nights', 'month'].forEach(function (k) { if (a[k]) p.push(k + '=' + encodeURIComponent(a[k])); });
    return p.length ? '?' + p.join('&') : '';
  }

  function setOpen(v) {
    open = v;
    panel.hidden = !v;
    btn.setAttribute('aria-expanded', String(v));
    if (v) {
      if (badge) badge.classList.add('is-hidden');
      if (!state.messages.length) {
        fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hello', slots: {} }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d && d.text) { bubble('bot', d.text); renderChips(d.chips); state.messages.push({ role: 'assistant', text: d.text }); save(); } })
          .catch(function () { bubble('bot', 'Marhba. Ask me about journeys, prices, group sizes, deposits or cancellation — or call the Marrakech desk.'); });
      } else {
        state.messages.forEach(function (m) { bubble(m.role === 'user' ? 'me' : 'bot', m.text); });
        renderChips(['Price a 7-day luxury tour', 'Women-only group, 14 travellers', 'How does the 25% deposit work?']);
      }
      setTimeout(function () { input.focus(); }, 80);
    } else if (lastFocus) {
      lastFocus.focus();
    }
  }

  btn.addEventListener('click', function () { lastFocus = document.activeElement; setOpen(!open); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); btn.focus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); }
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) {
      e.preventDefault(); lastFocus = document.activeElement; setOpen(true);
    }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; send(v); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var v = input.value; input.value = ''; send(v); } });
  if (noTrain) {
    noTrain.checked = !!state.noTraining;
    noTrain.addEventListener('change', function () { state.noTraining = noTrain.checked; save(); });
  }

  /* Open from data-chat attributes anywhere on the page (e.g. "ask the assistant"). */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ask]');
    if (!t) return;
    e.preventDefault();
    setOpen(true);
    setTimeout(function () { input.value = t.getAttribute('data-ask') || ''; input.focus(); if (t.dataset.autosend === 'true') send(input.value); }, 120);
  });

  /* Proactive, once, after a long read — never for booking-form mistakes. */
  var prompted = false;
  setTimeout(function () {
    if (prompted || open || state.greeted || document.hidden) return;
    if (window.scrollY < document.documentElement.scrollHeight * 0.55) return;
    prompted = true;
    if (badge) badge.textContent = '?';
  }, 45000);

  /* Deep link: ?ask=… opens the panel with the question ready. */
  var params = new URLSearchParams(location.search);
  if (params.get('openchat') === '1') setOpen(true);
  if (params.get('ask')) setTimeout(function () { setOpen(true); input.value = params.get('ask'); send(params.get('ask')); }, 300);
})();
