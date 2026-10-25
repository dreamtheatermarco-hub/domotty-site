(function () {
  'use strict';
  var root = document.querySelector('.dm');
  if (!root) return;
  var html = document.documentElement;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var cfg = window.DOMOTTY_CONFIG || {};
  var fnUrl = function (name) { return String(cfg.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/' + name; };

  /* ---------- mobile lite ---------- */
  var lite = !!(window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
  if (lite) {
    root.classList.add('m-lite');
    var sel = '.label, .h2, .man-text, .hero ~ * h2, .dleft p, .dstep, .house, .shot, .card, .sec, .cl, .mode, .schema-box, .ninety-card, .ninety-wrap h2, .step, .tcard, .nl, .close p, .rv';
    var items = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (el) { return !el.closest('.hero'); });
    var counter = document.querySelector('[data-count]');
    var stage = document.querySelector('.dstage');
    function runCounter() {
      if (!counter || counter._done) return;
      counter._done = true;
      var t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var q = Math.min(1, (ts - t0) / 1800);
        q = 1 - Math.pow(1 - q, 3);
        counter.style.setProperty('--n', String(Math.round(q * 90)));
        counter.style.setProperty('--m', String(Math.round(100 - q * 90)));
        if (q < 1) requestAnimationFrame(step);
      }
      counter.style.setProperty('--n', '0'); counter.style.setProperty('--m', '100');
      requestAnimationFrame(step);
    }
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('rvl', 'in'); });
      if (stage) stage.classList.add('built');
    } else {
      items.forEach(function (el) { el.classList.add('rvl'); });
      if (counter) counter.style.setProperty('--n', '0'), counter.style.setProperty('--m', '100');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          if (el === stage) { el.classList.add('built'); io.unobserve(el); return; }
          if (el.classList.contains('ninety-card')) runCounter();
          el.classList.add('in');
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      items.forEach(function (el) { io.observe(el); });
      if (stage) io.observe(stage);
      // Rete di sicurezza: se un browser non notifica l'osservatore, mostra comunque
      // ciò che è già passato sullo schermo (controllo leggero, al massimo 4 volte al secondo).
      var pending = false;
      var sweep = function () {
        pending = false;
        var H = window.innerHeight || 700;
        items.forEach(function (el) {
          if (el.classList.contains('in')) return;
          if (el.getBoundingClientRect().top < H) {
            if (el.classList.contains('ninety-card')) runCounter();
            el.classList.add('in');
          }
        });
        if (stage && !stage.classList.contains('built') && stage.getBoundingClientRect().top < H * 0.8) stage.classList.add('built');
      };
      window.addEventListener('scroll', function () { if (!pending) { pending = true; setTimeout(sweep, 250); } }, { passive: true });
      setTimeout(sweep, 1200);
    }
  }

  /* ---------- scroll-driven animations (desktop) ---------- */
  var scEls = Array.prototype.slice.call(document.querySelectorAll('[data-sc]'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var raf = 0;
  function update() {
    raf = 0;
    var H = window.innerHeight || 800;
    var rr = root.getBoundingClientRect();
    root.style.setProperty('--g', (reduce ? 0 : clamp(-rr.top / Math.max(1, rr.height - H))).toFixed(4));
    for (var k = 0; k < scEls.length; k++) {
      var el = scEls[k];
      var r = el.getBoundingClientRect();
      if (r.bottom < -H * 1.5 || r.top > H * 2.5) continue;
      var t = el.getAttribute('data-sc');
      var p;
      if (reduce) p = t === 'out' ? 0 : 1;
      else if (t === 'pin') { var span = r.height - H; p = span > 60 ? clamp(-r.top / span) : clamp((H - r.top) / (H * 0.8)); }
      else if (t === 'out') p = clamp(-r.top / (r.height * 0.7));
      else if (t === 'through') p = clamp((H - r.top) / (H + r.height));
      else { var len = parseFloat(el.getAttribute('data-len') || '0.6'); p = clamp((H - r.top) / (H * len)); }
      el.style.setProperty('--p', p.toFixed(4));
      if (el.hasAttribute('data-count')) {
        var q = clamp((p - 0.34) / 0.5);
        el.style.setProperty('--n', String(Math.round(q * 90)));
        el.style.setProperty('--m', String(Math.round(100 - q * 90)));
      }
    }
    for (var c = 0; c < cards.length; c++) {
      var v = 0;
      if (!reduce && c < cards.length - 1) {
        var a = cards[c].getBoundingClientRect();
        var b = cards[c + 1].getBoundingClientRect();
        v = clamp((a.bottom - b.top) / Math.max(1, a.height));
      }
      cards[c].style.setProperty('--c', v.toFixed(4));
    }
  }
  function req() { if (!raf) raf = requestAnimationFrame(update); }
  if (!lite) {
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    window.addEventListener('load', req);
    update();
  }

  /* ---------- theme ---------- */
  var toggle = document.getElementById('theme-toggle');
  function applyTheme(light) {
    root.classList.toggle('light', light);
    html.classList.toggle('light', light);
    if (toggle) {
      toggle.setAttribute('aria-pressed', light ? 'true' : 'false');
      toggle.setAttribute('aria-label', light ? 'Passa al tema scuro' : 'Passa al tema chiaro');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#FFFFFF' : '#0B1A33');
  }
  applyTheme(root.classList.contains('light'));
  if (toggle) toggle.addEventListener('click', function () {
    var light = !root.classList.contains('light');
    applyTheme(light);
    store.set('domotty-theme', light ? 'light' : 'dark');
  });

  /* ---------- torna su ---------- */
  var totop = document.getElementById('totop');
  if (totop) {
    var shown = false, tick = false;
    var check = function () {
      tick = false;
      var on = (window.scrollY || window.pageYOffset) > 700;
      if (on !== shown) { shown = on; totop.classList.toggle('show', on); }
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(check); } }, { passive: true });
    check();
    totop.addEventListener('click', function () {
      try { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
      var b = document.querySelector('.brand'); if (b) setTimeout(function () { b.focus({ preventScroll: true }); }, 600);
    });
  }

  /* ---------- spotlight on cards ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-spot]'), function (g) {
    g.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.sec, .cl');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- cookie notice ---------- */
  var cookie = document.getElementById('cookie');
  var seen = parseInt(store.get('domotty-consent') || '0', 10);
  if (cookie && !(seen > 0 && Date.now() - seen < 1000 * 60 * 60 * 24 * 182)) {
    setTimeout(function () { cookie.hidden = false; }, 1000);
  }
  var ok = document.getElementById('cookie-ok');
  if (ok) ok.addEventListener('click', function () {
    store.set('domotty-consent', String(Date.now()));
    cookie.hidden = true;
  });

  /* ---------- helpers ---------- */
  function post(name, payload) {
    if (!cfg.supabaseUrl || cfg.supabaseUrl.indexOf('YOUR-PROJECT') !== -1) {
      return Promise.reject(new Error('config'));
    }
    return fetch(fnUrl(name), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.ok) { var err = new Error(j.error || 'server'); err.code = j.error; throw err; }
        return j;
      });
    });
  }
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- contact modal ---------- */
  var modal = document.getElementById('modal');
  var form = document.getElementById('contact-form');
  var sent = document.getElementById('sent');
  var errBox = document.getElementById('form-err');
  var typeBtns = Array.prototype.slice.call(document.querySelectorAll('.tp[data-type]'));
  var current = 'Informazioni generali';
  var lastFocus = null;

  function setType(t) {
    current = t;
    typeBtns.forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-type') === t ? 'true' : 'false'); });
    Array.prototype.forEach.call(modal.querySelectorAll('.js-type'), function (s) { s.textContent = t; });
  }
  function openModal(t) {
    lastFocus = document.activeElement;
    setType(t || 'Informazioni generali');
    form.hidden = false; sent.hidden = true; errBox.textContent = '';
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(function () { var f = form.querySelector('input[name="nome"]'); if (f) f.focus(); }, 50);
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var o = e.target.closest && e.target.closest('[data-open]');
    if (o) { e.preventDefault(); openModal(o.getAttribute('data-open')); return; }
    if (e.target.closest && e.target.closest('[data-close]') && e.target.closest('#modal')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
    if (e.key === 'Tab' && !modal.hidden) {
      var f = Array.prototype.filter.call(modal.querySelectorAll('button, input, textarea, a[href]'), function (x) { return !x.closest('[hidden]') && x.tabIndex !== -1; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  typeBtns.forEach(function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-type')); }); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var nome = String(d.get('nome') || '').trim();
    var email = String(d.get('email') || '').trim();
    errBox.textContent = '';
    if (!nome) { errBox.textContent = 'Scrivi il tuo nome e cognome.'; form.nome.focus(); return; }
    if (!emailRe.test(email)) { errBox.textContent = 'Controlla l’indirizzo email.'; form.email.focus(); return; }
    if (!form.privacy.checked) { errBox.textContent = 'Per inviare la richiesta conferma di aver letto l’informativa privacy.'; return; }
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('.js-send');
    btn.disabled = true; label.textContent = 'Invio in corso';
    post('contact', {
      tipo: current, nome: nome, email: email,
      azienda: String(d.get('azienda') || '').trim(),
      telefono: String(d.get('telefono') || '').trim(),
      messaggio: String(d.get('messaggio') || '').trim(),
      privacy: true, website: String(d.get('website') || '')
    }).then(function () {
      form.reset(); form.hidden = true; sent.hidden = false;
      var c = sent.querySelector('button'); if (c) c.focus();
    }).catch(function () {
      errBox.textContent = 'Non siamo riusciti a inviare la richiesta. Riprova tra poco oppure scrivi a assistenza@domotty.it.';
    }).then(function () { btn.disabled = false; label.textContent = 'Invia richiesta'; });
  });

  /* ---------- newsletter ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('form.js-nl'), function (nl) {
    var nlMsg = document.getElementById(nl.getAttribute('data-msg'));
    nl.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = String(nl.email.value || '').trim();
      nlMsg.className = 'nl-msg';
      if (!emailRe.test(email)) { nlMsg.className = 'nl-msg err'; nlMsg.textContent = 'Controlla l\u2019indirizzo email.'; return; }
      var btn = nl.querySelector('button');
      btn.disabled = true;
      post('newsletter', { action: 'subscribe', email: email, website: nl.website.value || '' }).then(function () {
        nl.hidden = true;
        nlMsg.textContent = 'Quasi fatto! Ti abbiamo inviato un\u2019email: clicca il link per confermare l\u2019iscrizione.';
      }).catch(function () {
        nlMsg.className = 'nl-msg err';
        nlMsg.textContent = 'Non siamo riusciti a completare l\u2019iscrizione. Riprova tra poco.';
      }).then(function () { btn.disabled = false; });
    });
  });

  /* ---------- newsletter popup (barra in alto su mobile) ---------- */
  var nlModal = document.getElementById('nl-modal');
  var nlLast = null;
  function openNl() {
    nlLast = document.activeElement;
    nlModal.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(function () { var i = nlModal.querySelector('input[name="email"]'); if (i && !i.closest('[hidden]')) i.focus(); }, 60);
  }
  function closeNl() {
    nlModal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (nlLast && nlLast.focus) nlLast.focus();
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    if (e.target.closest('[data-nl-open]')) { e.preventDefault(); openNl(); return; }
    if (e.target.closest('[data-close]') && e.target.closest('#nl-modal')) closeNl();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nlModal && !nlModal.hidden) closeNl(); });
  /* ---------- Maistu: il marchio si costruisce una volta quando entra in vista ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-mx]'), function (el) {
    if (reduce || !('IntersectionObserver' in window)) { el.classList.add('mx-go'); return; }
    var mo = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { el.classList.add('mx-go'); mo.disconnect(); } });
    }, { threshold: 0.35 });
    mo.observe(el);
  });
  /* ---------- Maistu: notifica che entra da destra dopo l'intro ---------- */
  (function () {
    var n = document.getElementById('mxn');
    if (!n) return;
    var KEY = 'domotty-maistu-nota';
    var last = parseInt(store.get(KEY) || '0', 10);
    if (last && Date.now() - last < 14 * 864e5) return;
    function show() {
      n.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { n.classList.add('in', 'mx-go'); }); });
    }
    function hide(remember) {
      if (remember) store.set(KEY, String(Date.now()));
      n.classList.remove('in'); n.classList.add('out');
      setTimeout(function () { n.hidden = true; n.classList.remove('out'); }, 520);
    }
    setTimeout(show, reduce ? 800 : lite ? 2600 : 6400);
    Array.prototype.forEach.call(n.querySelectorAll('[data-mxn-close]'), function (b) { b.addEventListener('click', function () { hide(true); }); });
    var seen = n.querySelector('[data-mxn-seen]');
    if (seen) seen.addEventListener('click', function () { hide(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !n.hidden && n.classList.contains('in')) hide(true); });
    /* su telefono la notifica sta sopra il contenuto: si fa da parte quando si arriva alla sezione Maistu */
    var panel = document.getElementById('maistu');
    if (panel && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting && n.classList.contains('in')) hide(false); });
      }, { threshold: 0.2 }).observe(panel);
    }
  })();
})();
