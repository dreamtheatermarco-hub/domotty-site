/* Domotty - menu per cellulare (sotto i 900 px): pulsante con le tre righe e pannello con le sezioni */
(function () {
  var nav = document.querySelector('.nav'), wrap = nav && nav.querySelector('.wrap'), m = wrap && wrap.querySelector('.menu');
  if (!m) return;
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'burger'; b.setAttribute('aria-label', 'Apri il menu'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'mnav');
  b.innerHTML = '<span></span><span></span><span></span>';
  wrap.appendChild(b);
  var p = document.createElement('div');
  p.className = 'mnav'; p.id = 'mnav'; p.hidden = true;
  var h = '';
  [].forEach.call(m.querySelectorAll('a'), function (a) {
    h += '<a href="' + a.getAttribute('href') + '"' + (a.hasAttribute('aria-current') ? ' aria-current="page"' : '') + '>' + a.textContent + '<span aria-hidden="true">›</span></a>';
  });
  p.innerHTML = '<div class="mnav-in">' + h + '</div>';
  nav.appendChild(p);
  function set(o) {
    p.hidden = !o; b.setAttribute('aria-expanded', o ? 'true' : 'false'); b.setAttribute('aria-label', o ? 'Chiudi il menu' : 'Apri il menu');
    b.classList.toggle('is-open', o); document.body.classList.toggle('mnav-open', o);
  }
  b.addEventListener('click', function (e) { e.stopPropagation(); set(p.hidden); });
  p.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function (e) { if (!p.hidden && !e.target.closest('.nav')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  addEventListener('resize', function () { if (innerWidth > 900) set(false); });
})();
