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

  /* ---------- scroll-driven animations ---------- */
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
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  window.addEventListener('load', req);
  update();

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
    if (e.target.closest && e.target.closest('[data-close]')) closeModal();
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
  var nl = document.getElementById('nl-form');
  var nlMsg = document.getElementById('nl-msg');
  if (nl) nl.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = String(nl.email.value || '').trim();
    nlMsg.className = 'nl-msg';
    if (!emailRe.test(email)) { nlMsg.className = 'nl-msg err'; nlMsg.textContent = 'Controlla l’indirizzo email.'; return; }
    var btn = nl.querySelector('button');
    btn.disabled = true;
    post('newsletter', { action: 'subscribe', email: email, website: nl.website.value || '' }).then(function () {
      nl.hidden = true;
      nlMsg.textContent = 'Quasi fatto! Ti abbiamo inviato un’email: clicca il link per confermare l’iscrizione.';
    }).catch(function () {
      nlMsg.className = 'nl-msg err';
      nlMsg.textContent = 'Non siamo riusciti a completare l’iscrizione. Riprova tra poco.';
    }).then(function () { btn.disabled = false; });
  });
})();
