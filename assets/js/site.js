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
  /* =================== JANA =================== */
  var dmRoot = root;
  var introDelay = reduce ? 600 : lite ? 2200 : 5800;

  /* ---------- linguette Novità ---------- */
  (function () {
    var tabs = document.getElementById('tabs');
    if (!tabs) return;
    setTimeout(function () { tabs.classList.add('in'); }, introDelay);
    var hover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var all = Array.prototype.slice.call(tabs.querySelectorAll('.tab'));
    function set(t, open) {
      t.classList.toggle('open', open);
      var b = t.querySelector('.tab-h'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    all.forEach(function (t) {
      var timer = 0;
      if (hover) {
        t.addEventListener('mouseenter', function () { clearTimeout(timer); all.forEach(function (o) { if (o !== t) set(o, false); }); set(t, true); });
        t.addEventListener('mouseleave', function () { timer = setTimeout(function () { set(t, false); }, 260); });
      }
      t.querySelector('.tab-h').addEventListener('click', function () {
        var open = !t.classList.contains('open');
        all.forEach(function (o) { set(o, false); });
        set(t, open);
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('#tabs')) all.forEach(function (o) { set(o, false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') all.forEach(function (o) { set(o, false); }); });
  })();

  /* ---------- pulsante Prova Jana ---------- */
  var fab = document.getElementById('jfab');
  if (fab) setTimeout(function () { fab.classList.add('in'); }, introDelay + 400);

  /* ---------- prova di Jana: casa dimostrativa + chat ---------- */
  (function () {
    var dlg = document.getElementById('jdemo');
    if (!dlg) return;
    var ROOMS = ['soggiorno', 'cucina', 'camera', 'bagno', 'studio', 'tecnico', 'giardino'];
    var SH = ['soggiorno', 'cucina', 'camera', 'bagno', 'studio'];
    var NAME = { soggiorno: 'Soggiorno', cucina: 'Cucina', camera: 'Camera', bagno: 'Bagno', studio: 'Studio', tecnico: 'Locale tecnico', giardino: 'Giardino' };
    var APP = { lavatrice: 'Lavatrice', lavastoviglie: 'Lavastoviglie', forno: 'Forno' };
    var WX = [
      { c: 'sereno', t: 21, p: 5, sun: 1, cl: 0, r: 0 },
      { c: 'poco nuvoloso', t: 19, p: 15, sun: 0.8, cl: 0.45, r: 0 },
      { c: 'nuvoloso', t: 17, p: 40, sun: 0.35, cl: 1, r: 0 },
      { c: 'pioggia leggera', t: 15, p: 85, sun: 0.15, cl: 1, r: 1 }
    ];
    var SUG = ['Accendi le luci in soggiorno', 'Abbassa tutte le tapparelle', 'Che tempo fa?', 'Quanto produce il fotovoltaico?', 'Modalità cinema', 'Ho freddo', 'Cos’è Maistu?', 'Buonanotte'];
    var now = new Date();
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    var wx = WX[doy % 4], wx2 = WX[(doy + 1) % 4];
    function hourNow() { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
    function isNight() { var h = hourNow(); return h < 7 || h >= 19.5; }
    var S = {
      luci: {}, tapparelle: {},
      clima: { acceso: false, modalita: 'auto', temperatura: 21, interna: wx.t < 18 ? 19.6 : 21.2 },
      allarme: false, elettrodomestici: { lavatrice: false, lavastoviglie: false, forno: false }, batteria: 78
    };
    ROOMS.forEach(function (r) { S.luci[r] = 0; });
    SH.forEach(function (r) { S.tapparelle[r] = 100; });
    if (isNight()) { S.luci.soggiorno = 70; S.luci.giardino = 100; S.tapparelle.camera = 0; S.tapparelle.soggiorno = 40; }
    var built = false, house = null, busy = false, conv = null, left = 20, hist = [], lastFocus = null, pulse = 0;
    var log = document.getElementById('jd-log'), hud = document.getElementById('jd-hud'), roomsBox = document.getElementById('jd-rooms');
    var form = document.getElementById('jd-form'), input = document.getElementById('jd-in'), leftEl = document.getElementById('jd-left');
    var sym = dlg.querySelector('.jd-id .jsym');
    var nf = function (v, d) { return v.toFixed(d == null ? 1 : d).replace('.', ','); };
    var clamp100 = function (v) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null; };

    function energy() {
      var h = hourNow();
      var solar = isNight() ? 0 : 4.2 * wx.sun * Math.max(0, Math.sin(Math.PI * (h - 7) / 12.5));
      var load = 0.28;
      ROOMS.forEach(function (r) { load += S.luci[r] / 100 * 0.05; });
      if (S.clima.acceso) load += 0.85;
      if (S.elettrodomestici.lavatrice) load += 0.55;
      if (S.elettrodomestici.lavastoviglie) load += 0.7;
      if (S.elettrodomestici.forno) load += 1.6;
      return { solar: solar, load: load, grid: load - solar };
    }
    function heating() { return S.clima.acceso && (S.clima.modalita === 'caldo' || (S.clima.modalita === 'auto' && S.clima.temperatura > S.clima.interna)); }
    function cooling() { return S.clima.acceso && (S.clima.modalita === 'freddo' || (S.clima.modalita === 'auto' && S.clima.temperatura < S.clima.interna)); }

    function buildHouse() {
      var src = document.querySelector('#domotica .house');
      var box = document.getElementById('jd-house');
      if (!src || !box) return;
      house = src.cloneNode(true);
      house.setAttribute('class', 'jhouse');
      house.setAttribute('role', 'img');
      house.setAttribute('aria-label', 'Casa dimostrativa comandata da Jana');
      house.removeAttribute('aria-hidden');
      Array.prototype.forEach.call(house.querySelectorAll('[style]'), function (el) {
        el.setAttribute('style', el.getAttribute('style').replace(/var\(--(O2|O|F|L|C|T|H|E|S|A)\)/g, 'var(--j$1)'));
      });
      Array.prototype.forEach.call(house.querySelectorAll('[data-jl]'), function (el) {
        var o = el.getAttribute('data-o'), v = 'var(--jl-' + el.getAttribute('data-jl') + ')';
        el.style.opacity = o ? 'calc(' + v + ' * ' + o + ')' : v;
      });
      var lon = house.querySelector('.lon'); if (lon) lon.style.opacity = '1';
      Array.prototype.forEach.call(house.querySelectorAll('[data-sh]'), function (el) {
        var k = el.getAttribute('data-k');
        el.style.transform = 'scaleY(' + (k ? 'calc(var(--jsh-' + el.getAttribute('data-sh') + ') * ' + k + ')' : 'var(--jsh-' + el.getAttribute('data-sh') + ')') + ')';
      });
      var rays = house.querySelector('[data-rays]'); if (rays) rays.style.opacity = 'var(--jsun)';
      var sol = house.querySelector('[data-solar]'); if (sol) { sol.style.opacity = '1'; sol.style.transform = 'none'; }
      var NS = 'http://www.w3.org/2000/svg';
      var wxg = document.createElementNS(NS, 'g');
      var rain = '';
      for (var k = 0; k < 34; k++) { var x = 20 + k * 23 + (k % 3) * 5, y = 20 + (k * 37) % 110; rain += '<path class="jrainl" style="animation-delay:' + ((k * 0.13) % 0.7).toFixed(2) + 's" d="M' + x + ' ' + y + ' l-8 26"/>'; }
      wxg.innerHTML = '<g style="opacity:var(--jcloud)" fill="#4A6488"><ellipse cx="520" cy="72" rx="62" ry="20"/><ellipse cx="560" cy="60" rx="42" ry="22"/><ellipse cx="486" cy="66" rx="30" ry="16"/><ellipse cx="250" cy="100" rx="54" ry="16"/><ellipse cx="282" cy="90" rx="34" ry="18"/></g>' +
        '<g style="opacity:var(--jrain)" stroke="#9CC8FF" stroke-width="1.6" stroke-linecap="round" opacity=".75">' + rain + '</g>';
      var anchor = house.querySelector('rect[fill="url(#room)"]');
      if (anchor) house.insertBefore(wxg, anchor); else house.appendChild(wxg);
      box.appendChild(house);
      roomsBox.innerHTML = '';
      ROOMS.forEach(function (r) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-room', r);
        b.innerHTML = '<i></i>' + NAME[r];
        b.addEventListener('click', function () { S.luci[r] = S.luci[r] > 0 ? 0 : 80; render(['luci']); });
        roomsBox.appendChild(b);
      });
      var sug = document.getElementById('jd-sug');
      sug.innerHTML = '';
      SUG.forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.addEventListener('click', function () { send(t); }); sug.appendChild(b); });
      built = true;
    }

    function card(id, label, big, small) { return '<div class="jd-card" data-c="' + id + '"><small>' + label + '</small><b>' + big + '</b><span>' + small + '</span></div>'; }
    function render(flash) {
      if (!house) return;
      var e = energy(), night = isNight();
      var st = house.style;
      st.setProperty('--jO', '1'); st.setProperty('--jO2', '1'); st.setProperty('--jF', '1'); st.setProperty('--jL', '1');
      st.setProperty('--jN', night ? '1' : '0'); st.setProperty('--jT', 'var(--jN)');
      st.setProperty('--jsun', night ? '0' : String(wx.sun)); st.setProperty('--jcloud', String(wx.cl)); st.setProperty('--jrain', String(wx.r));
      st.setProperty('--jC', cooling() ? '1' : '0'); st.setProperty('--jH', heating() ? '1' : '0');
      st.setProperty('--jE', (S.elettrodomestici.lavatrice || S.elettrodomestici.lavastoviglie || S.elettrodomestici.forno) ? '1' : '0');
      st.setProperty('--jS', S.allarme ? '1' : '0'); st.setProperty('--jA', pulse ? '1' : '0.12');
      ROOMS.forEach(function (r) { st.setProperty('--jl-' + r, String(S.luci[r] / 100)); });
      SH.forEach(function (r) { st.setProperty('--jsh-' + r, String(1 - S.tapparelle[r] / 100)); });
      var cl = S.clima.acceso ? (heating() ? 'Caldo ' : cooling() ? 'Freddo ' : 'Auto ') + nf(S.clima.temperatura, 0) + '°' : 'Spento';
      hud.innerHTML =
        card('meteo', 'Meteo · simulato', nf(wx.t, 0) + '° ' + (night ? 'notte' : wx.c), 'Pioggia ' + wx.p + '% · domani ' + wx2.c) +
        card('solare', 'Fotovoltaico', nf(e.solar) + ' kW', 'Batteria ' + S.batteria + '%') +
        card('consumi', 'Consumo', nf(e.load) + ' kW', e.grid < 0 ? 'Immetti in rete ' + nf(-e.grid) + ' kW' : 'Prelievo dalla rete ' + nf(e.grid) + ' kW') +
        card('clima', 'Clima', cl, 'Interno ' + nf(S.clima.interna) + '° · allarme ' + (S.allarme ? 'inserito' : 'spento'));
      (flash || []).forEach(function (f) { var c = hud.querySelector('[data-c="' + f + '"]'); if (c) c.classList.add('flash'); });
      Array.prototype.forEach.call(roomsBox.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', S.luci[b.getAttribute('data-room')] > 0 ? 'true' : 'false'); });
    }
    setInterval(function () {
      if (dlg.hidden || !S.clima.acceso) return;
      var d = S.clima.temperatura - S.clima.interna;
      if (Math.abs(d) < 0.05) return;
      S.clima.interna += Math.max(-0.2, Math.min(0.2, d));
      render();
    }, 2500);

    function scene(n) {
      var dark = isNight();
      if (n === 'cinema') { ROOMS.forEach(function (r) { if (r !== 'giardino') S.luci[r] = 0; }); S.luci.soggiorno = 20; S.tapparelle.soggiorno = 0; S.clima.acceso = true; S.clima.modalita = 'auto'; S.clima.temperatura = 22; }
      else if (n === 'buonanotte') { ROOMS.forEach(function (r) { S.luci[r] = 0; }); S.luci.giardino = 30; SH.forEach(function (r) { S.tapparelle[r] = 0; }); S.allarme = true; S.clima.temperatura = 19; }
      else if (n === 'esco') { ROOMS.forEach(function (r) { S.luci[r] = 0; }); SH.forEach(function (r) { S.tapparelle[r] = 0; }); S.allarme = true; S.clima.acceso = false; S.elettrodomestici.forno = false; }
      else if (n === 'rientro') { S.allarme = false; if (dark) { S.luci.soggiorno = 70; S.luci.cucina = 60; S.luci.giardino = 100; } else SH.forEach(function (r) { S.tapparelle[r] = 100; }); S.clima.acceso = true; S.clima.modalita = 'auto'; S.clima.temperatura = 21; }
      else if (n === 'buongiorno') { SH.forEach(function (r) { S.tapparelle[r] = 100; }); S.allarme = false; if (dark) S.luci.cucina = 60; S.luci.giardino = 0; S.clima.acceso = true; S.clima.modalita = 'auto'; S.clima.temperatura = 21; }
      else return null;
      return 'Scenario · ' + n;
    }
    function apply(list) {
      var labels = [], fl = {};
      (Array.isArray(list) ? list : []).slice(0, 14).forEach(function (a) {
        if (!a || typeof a !== 'object') return;
        var rooms;
        if (a.tipo === 'luci') {
          var v = clamp100(a.valore != null ? a.valore : (a.acceso === false ? 0 : 80)); if (v == null) return;
          rooms = a.stanza === 'tutte' || !a.stanza ? ROOMS : (ROOMS.indexOf(a.stanza) >= 0 ? [a.stanza] : []);
          rooms.forEach(function (r) { S.luci[r] = v; });
          if (rooms.length) { labels.push('Luci ' + (rooms.length > 1 ? 'tutte' : NAME[rooms[0]].toLowerCase()) + ' · ' + (v ? v + '%' : 'spente')); fl.consumi = 1; }
        } else if (a.tipo === 'tapparelle') {
          var p = clamp100(a.valore != null ? a.valore : (a.acceso === false ? 0 : 100)); if (p == null) return;
          rooms = a.stanza === 'tutte' || !a.stanza ? SH : (SH.indexOf(a.stanza) >= 0 ? [a.stanza] : []);
          rooms.forEach(function (r) { S.tapparelle[r] = p; });
          if (rooms.length) labels.push('Tapparelle ' + (rooms.length > 1 ? 'tutte' : NAME[rooms[0]].toLowerCase()) + ' · ' + (p === 0 ? 'chiuse' : p === 100 ? 'aperte' : 'aperte ' + p + '%'));
        } else if (a.tipo === 'clima') {
          if (typeof a.acceso === 'boolean') S.clima.acceso = a.acceso;
          if (['caldo', 'freddo', 'auto'].indexOf(a.modalita) >= 0) { S.clima.modalita = a.modalita; S.clima.acceso = a.acceso !== false; }
          var t = Number(a.temperatura); if (isFinite(t) && a.temperatura != null) { S.clima.temperatura = Math.max(16, Math.min(28, Math.round(t * 2) / 2)); S.clima.acceso = a.acceso !== false; }
          labels.push(S.clima.acceso ? 'Clima · ' + S.clima.modalita + ' ' + nf(S.clima.temperatura, S.clima.temperatura % 1 ? 1 : 0) + ' °C' : 'Clima · spento'); fl.clima = 1; fl.consumi = 1;
        } else if (a.tipo === 'allarme') {
          S.allarme = a.acceso !== false; labels.push('Allarme · ' + (S.allarme ? 'inserito' : 'disinserito')); fl.clima = 1;
        } else if (a.tipo === 'elettrodomestico') {
          if (!APP[a.nome]) return; S.elettrodomestici[a.nome] = a.acceso !== false; labels.push(APP[a.nome] + ' · ' + (S.elettrodomestici[a.nome] ? 'avviato' : 'spento')); fl.consumi = 1;
        } else if (a.tipo === 'scenario') {
          var l = scene(a.nome); if (l) { labels.push(l); fl.clima = 1; fl.consumi = 1; }
        }
      });
      if (labels.length) {
        pulse = 1; render(Object.keys(fl));
        setTimeout(function () { pulse = 0; render(); }, 1800);
      }
      return labels;
    }
    function snapshot() {
      var e = energy(), d = new Date(), tl = {}, li = {};
      ROOMS.forEach(function (r) { li[r] = S.luci[r]; });
      SH.forEach(function (r) { tl[r] = S.tapparelle[r]; });
      return {
        ora: ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2), notte: isNight(),
        meteo: { dati: 'simulati per la demo', luogo: 'San Sperate (CA)', condizioni: wx.c, temperatura_esterna: wx.t, probabilita_pioggia: wx.p, domani: { condizioni: wx2.c, temperatura: wx2.t } },
        energia: { fotovoltaico_kw: +e.solar.toFixed(1), consumo_kw: +e.load.toFixed(1), rete_kw: +e.grid.toFixed(1), batteria_percento: S.batteria },
        luci_percento: li, tapparelle_apertura_percento: tl,
        clima: { acceso: S.clima.acceso, modalita: S.clima.modalita, temperatura_impostata: S.clima.temperatura, temperatura_interna: +S.clima.interna.toFixed(1) },
        allarme_inserito: S.allarme, elettrodomestici_accesi: S.elettrodomestici
      };
    }

    function bubble(cls, text) { var m = document.createElement('div'); m.className = 'jd-m ' + cls; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    function chips(labels) { if (!labels.length) return; var c = document.createElement('div'); c.className = 'jd-acts'; labels.forEach(function (l) { var s = document.createElement('span'); s.textContent = l; c.appendChild(s); }); log.appendChild(c); log.scrollTop = log.scrollHeight; }
    function sysMsg(text, contact) {
      var m = bubble('sys', text);
      if (contact) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-or'; b.style.cssText = 'display:flex;margin:10px auto 0;min-height:40px;font-size:14px';
        b.textContent = 'Parla con noi'; b.addEventListener('click', function () { close(); openModal('Domotica casa o ufficio'); });
        m.appendChild(b);
      }
    }
    function setLeft(n) { left = n; leftEl.textContent = n === 1 ? '1 messaggio rimasto' : n + ' messaggi rimasti'; }
    function lock(on) { busy = on; form.querySelector('button').disabled = on || left <= 0; if (sym) sym.classList.toggle('talk', on); }

    function send(text) {
      text = String(text || '').trim().slice(0, 300);
      if (!text || busy) return;
      if (left <= 0) { sysMsg('Hai usato tutti i messaggi di questa prova. Se vuoi Jana a casa tua, parliamone!', true); return; }
      bubble('me', text);
      hist.push({ role: 'user', content: text });
      input.value = '';
      lock(true);
      var ty = document.createElement('div'); ty.className = 'jd-typing'; ty.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(ty); log.scrollTop = log.scrollHeight;
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
      var base = String(cfg.supabaseUrl || '');
      var p = base ? fetch(fnUrl('jana'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv: conv, messages: hist.slice(-20), state: snapshot() }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); }) : Promise.reject(new Error('nocfg'));
      p.then(function (j) {
        if (j.conv) conv = j.conv;
        if (typeof j.left === 'number') setLeft(j.left);
        if (j.ok && j.reply) {
          hist.push({ role: 'assistant', content: String(j.reply) });
          bubble('ja', String(j.reply));
          chips(apply(j.actions));
          if (left <= 0) sysMsg('Questa era l’ultima risposta della prova. Ti è piaciuta? Possiamo portare Jana a casa tua.', true);
        } else {
          hist.pop();
          if (j.error === 'limit_conv') { setLeft(0); sysMsg('Hai usato tutti i messaggi di questa prova. Se vuoi Jana a casa tua, parliamone!', true); }
          else if (j.error === 'limit_day' || j.error === 'limit_client') sysMsg('Per oggi le prove di Jana sono esaurite. Torna domani, oppure scrivici: te la mostriamo dal vivo.', true);
          else sysMsg('Jana non riesce a rispondere in questo momento. Riprova tra poco.');
        }
      }).catch(function () {
        hist.pop();
        sysMsg('Jana di prova non è raggiungibile in questo momento. Riprova tra poco.');
      }).then(function () { clearTimeout(to); if (ty.parentNode) ty.parentNode.removeChild(ty); lock(false); input.focus(); });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

    function open(pre) {
      if (!built) buildHouse();
      lastFocus = document.activeElement;
      dlg.hidden = false;
      document.body.classList.add('jdemo-lock');
      dmRoot.classList.add('jdemo-on');
      render();
      requestAnimationFrame(function () { requestAnimationFrame(function () { dlg.classList.add('in'); }); });
      if (!log.children.length) {
        bubble('ja', 'Ciao, sono Jana, l’assistente di Domotty! Questa è una casa dimostrativa: chiedimi di accendere le luci, abbassare le tapparelle o regolare il clima, oppure chiedimi che tempo fa e quanto produce il fotovoltaico. Posso anche raccontarti di Domotty e di Maistu.');
      }
      setTimeout(function () { if (pre) send(pre); else input.focus(); }, 380);
    }
    function close() {
      dlg.classList.remove('in');
      document.body.classList.remove('jdemo-lock');
      dmRoot.classList.remove('jdemo-on');
      setTimeout(function () { dlg.hidden = true; }, 320);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('[data-jana-open]');
      if (o) { e.preventDefault(); open(o.getAttribute('data-jana-open') || ''); return; }
      if (e.target.closest && e.target.closest('[data-jd-close]')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (dlg.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(dlg.querySelectorAll('button, input, a[href]'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
  })();
})();
