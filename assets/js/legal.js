(function () {
  'use strict';
  var root = document.querySelector('.lp');
  if (!root) return;
  var html = document.documentElement;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var store = {
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* theme */
  var toggle = document.getElementById('theme-toggle');
  function applyTheme(light) {
    root.classList.toggle('light', light);
    html.classList.toggle('light', light);
    if (toggle) {
      toggle.setAttribute('aria-pressed', light ? 'true' : 'false');
      toggle.setAttribute('aria-label', light ? 'Passa al tema scuro' : 'Passa al tema chiaro');
    }
  }
  applyTheme(root.classList.contains('light'));
  if (toggle) toggle.addEventListener('click', function () {
    var light = !root.classList.contains('light');
    applyTheme(light);
    store.set('domotty-theme', light ? 'light' : 'dark');
  });

  /* scroll: progress bar, section reveal, active index */
  var secs = Array.prototype.slice.call(document.querySelectorAll('[data-sc]'));
  var toc = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  var raf = 0;
  function update() {
    raf = 0;
    var H = window.innerHeight || 800;
    var rr = root.getBoundingClientRect();
    root.style.setProperty('--g', clamp(-rr.top / Math.max(1, rr.height - H)).toFixed(4));
    var active = 0;
    for (var k = 0; k < secs.length; k++) {
      var r = secs[k].getBoundingClientRect();
      secs[k].style.setProperty('--p', clamp((H - r.top) / (H * 0.6)).toFixed(4));
      if (r.top < H * 0.35) active = k;
    }
    for (var t = 0; t < toc.length; t++) toc[t].classList.toggle('on', t === active);
  }
  function req() { if (!raf) raf = requestAnimationFrame(update); }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  update();

  /* cookie page: reset saved preferences */
  var reset = document.getElementById('reset-prefs');
  if (reset) reset.addEventListener('click', function () {
    store.del('domotty-consent');
    store.del('domotty-theme');
    var ok = document.getElementById('reset-ok');
    if (ok) ok.hidden = false;
  });
})();
