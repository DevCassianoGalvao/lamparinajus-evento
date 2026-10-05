/**
 * Hero: painéis dos palestrantes. Um por vez expande, fica colorido e mostra nome + título.
 * Loop automático a cada INTERVAL ms; hover/toque num painel o ativa e pausa o loop.
 * O estado vive em data-active no .hero-art (o CSS faz o resto), reaplicado se o runtime refizer o DOM.
 */
(function () {
  var INTERVAL = 7000;
  var active = 0, paused = false, timer = 0;

  function art() { return document.querySelector('section[data-screen-label="Hero"] .hero-art'); }

  function apply() {
    var el = art();
    if (!el) return;
    el.style.setProperty('--sp-interval', INTERVAL + 'ms');
    if (el.getAttribute('data-active') !== String(active)) el.setAttribute('data-active', String(active));
    if (paused) el.setAttribute('data-paused', ''); else el.removeAttribute('data-paused');
    if (!el.__spBound) {
      el.__spBound = true;
      Array.prototype.forEach.call(el.querySelectorAll('.sp-panel'), function (panel, i) {
        panel.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; paused = true; go(i); });
        panel.addEventListener('click', function () { go(i); schedule(); });
      });
      el.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; paused = false; apply(); schedule(); });
    }
  }

  function go(i) {
    var el = art();
    var n = el ? el.querySelectorAll('.sp-panel').length || 3 : 3;
    active = ((i % n) + n) % n;
    apply();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function tick() {
      if (!paused && !document.hidden) go(active + 1);
      timer = setTimeout(tick, INTERVAL);
    }, INTERVAL);
  }

  // o runtime pode recriar o DOM logo após montar: reaplica o estado quando isso acontecer
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; var el = art(); if (el && (!el.__spBound || el.getAttribute('data-active') !== String(active))) apply(); });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-active'] });

  apply();
  schedule();
})();
