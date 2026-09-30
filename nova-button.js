/**
 * Nova Glow Button (Framer): anima a rotação do degradê cônico da borda/brilho.
 * O visual em si está em premium.css (seção "BOTÕES"). Um único rAF para todos os botões.
 */
(function () {
  var root = document.documentElement;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.style.setProperty('--nova-rot', '42deg');
  if (reduced) return;
  var SPEED = 5; // igual ao padrão do componente (graus/s = SPEED * 24)
  var rot = 0, last = performance.now();
  function tick(now) {
    if (document.visibilityState !== 'hidden') {
      rot = (rot + ((now - last) / 1000) * SPEED * 24) % 360;
      root.style.setProperty('--nova-rot', rot.toFixed(1) + 'deg');
    }
    last = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
