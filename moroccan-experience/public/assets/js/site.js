/* Moroccan Experience — site chrome: nav, reveal, carousel, back-to-top,
   cookie consent, newsletter, filter autosubmit. No dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------- header + mobile nav */
  var header = $('#siteHeader');
  var heroOnTop = $('.hero, .phero, .bhero');
  if (header && heroOnTop && header.classList.contains('site-header')) {
    var onScrollChrome = function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle('is-scrolled', y > 12);
      var overlap = heroOnTop.getBoundingClientRect();
      header.classList.toggle('on-hero', overlap.top <= 0 && overlap.bottom > 80 && y < overlap.bottom - 80);
    };
    onScrollChrome();
    window.addEventListener('scroll', onScrollChrome, { passive: true });
  }

  var toggle = $('#navToggle');
  var mobile = $('#mobileNav');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      mobile.hidden = open;
    });
    mobile.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { mobile.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mobile.hidden) { mobile.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
  }

  /* -------------------------------------------------------------- reveal */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --------------------------------------------------------- back to top */
  var top = $('#backToTop');
  var ring = $('.dock__ring-fill');
  if (top) {
    var CIRC = 125.66;
    var update = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY || doc.scrollTop;
      top.classList.toggle('is-visible', y > 380);
      if (ring && max > 0) {
        var pct = Math.min(1, y / max);
        ring.style.strokeDashoffset = String(CIRC - CIRC * pct);
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    top.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var target = $('#main') || document.body;
      setTimeout(function () { (target.querySelector('h1') || target).setAttribute('tabindex', '-1'); (target.querySelector('h1') || target).focus({ preventScroll: true }); }, reduce ? 0 : 420);
    });
  }

  /* ------------------------------------------------------------ carousel */
  $$('[data-carousel]').forEach(function (track) {
    var slides = $$('.voice', track);
    if (!slides.length) return;
    var i = 0;
    var timer = null;
    var dots = $$('[data-carousel-dots] .dot');
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    }
    function play() { stop(); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { show(i + 1); }, 7000); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    var next = $('[data-carousel-next]');
    var prev = $('[data-carousel-prev]');
    if (next) next.addEventListener('click', function () { show(i + 1); play(); });
    if (prev) prev.addEventListener('click', function () { show(i - 1); play(); });
    dots.forEach(function (d) { d.addEventListener('click', function () { show(+d.dataset.i); play(); }); });
    track.addEventListener('mouseenter', stop);
    track.addEventListener('mouseleave', play);
    track.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else play(); });
    play();
  });

  /* --------------------------------------------------------- finder form */
  var finder = $('[data-finder]');
  if (finder) {
    finder.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = new URLSearchParams();
      ['feeling', 'when', 'who'].forEach(function (k) {
        var v = finder.querySelector('[name="' + k + '"]').value;
        if (v) p.set(k, v);
      });
      var qs = p.toString();
      var url = '/journeys' + (qs ? '?' + qs : '');
      if (window.MX_nav) window.MX_nav(url); else window.location.href = url;
    });
  }

  /* ------------------------------------------------------- filter autosubmit */
  var filters = $('[data-filterform]');
  if (filters) {
    var submitFilters = function () {
      var p = new URLSearchParams();
      $$('select[name], input[name]', filters).forEach(function (el) {
        if (el.value) p.set(el.name, el.value);
      });
      var qs = p.toString();
      var url = '/journeys' + (qs ? '?' + qs : '');
      if (window.MX_nav) window.MX_nav(url); else window.location.href = url;
    };
    $$('[data-autosubmit]', filters).forEach(function (el) { el.addEventListener('change', submitFilters); });
    var nights = filters.querySelector('[name="nights"]');
    if (nights) {
      var t;
      nights.addEventListener('input', function () { clearTimeout(t); t = setTimeout(submitFilters, 700); });
    }
    $$('[data-pill="type"]', filters).forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); var v = a.dataset.value; if (v) window.location.href = '/journeys?type=' + v; else window.location.href = '/journeys'; });
    });
  }

  /* ----------------------------------------------------------- cookie bar */
  var bar = $('#cookieBar');
  var KEY = 'mx_consent';
  function setConsent(value) {
    try { localStorage.setItem(KEY, JSON.stringify({ value: value, at: Date.now() })); } catch (e) {}
    if (bar) bar.hidden = true;
    var chip = $('[data-open-cookie]');
    if (chip) chip.textContent = 'Cookie preferences (accepted: ' + (value === 'all' ? 'all' : 'necessary') + ')';
  }
  if (bar) {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!stored) bar.hidden = false;
    $$('[data-cookie]', bar).forEach(function (b) { b.addEventListener('click', function () { setConsent(b.dataset.cookie); }); });
    $$('[data-open-cookie]').forEach(function (b) {
      b.addEventListener('click', function () { if (bar) { bar.hidden = false; bar.scrollIntoView({ block: 'nearest' }); } });
    });
  }

  /* ------------------------------------------------------------ newsletter */
  $$('[data-newsletter]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type="email"]').value.trim();
      var note = form.querySelector('[data-nl-note]');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { if (note) note.textContent = 'Please enter a valid email address.'; return; }
      var btn = form.querySelector('button');
      btn.classList.add('is-busy'); btn.disabled = true;
      fetch('/api/newsletter', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email, source: 'footer' }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) { if (note) note.textContent = res.ok ? res.j.message : (res.j.error || 'Something went wrong.'); if (res.ok) form.reset(); })
        .catch(function () { if (note) note.textContent = 'Could not reach the server — email ' + 'journeys@moroccan-experience.com'; })
        .finally(function () { btn.classList.remove('is-busy'); btn.disabled = false; });
    });
  });

  /* ------------------------------------------------------- external links */
  $$('a[href^="http"]').forEach(function (a) {
    if (a.host && a.host !== location.host && !a.target) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  });

  /* ------------------------------------------------- tiny client router */
  window.MX_nav = function (url) { window.location.href = url; };

  /* ---------------------------------------------------- smooth anchor focus */
  $$('a[href^="#"]:not(.hero__scroll)').forEach(function (a) {
    a.addEventListener('click', function () {
      var el = document.querySelector(a.getAttribute('href'));
      if (el) { el.setAttribute('tabindex', '-1'); setTimeout(function () { el.focus({ preventScroll: true }); }, 300); }
    });
  });
})();
