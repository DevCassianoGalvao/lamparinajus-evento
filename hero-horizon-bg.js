/**
 * Fundo da hero: grade 3D em perspectiva ("Digital Horizon"), laranja, muito lenta e a ~10% de opacidade.
 * Canvas 2D; um degradê preto→transparente cobre a base da hero para não haver corte seco.
 */
(function () {
  var SECTION_SEL = 'section[data-screen-label="Hero"]';
  var RGB = '255,106,0';
  var MAX_ALPHA = 0.10;      // opacidade máxima das linhas
  var HORIZON = 0.40;        // altura do horizonte (fração da hero)
  var ROWS = 16;             // linhas horizontais visíveis
  var COLS = 28;             // linhas verticais (de cada lado do centro: COLS/2)
  var CYCLE_SECONDS = 14;    // tempo para a grade avançar uma linha (bem lento)
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = null;

  function build(section) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block';
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var fade = document.createElement('div');
    fade.setAttribute('aria-hidden', 'true');
    fade.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:34%;z-index:0;pointer-events:none;' +
      'background:linear-gradient(to bottom, transparent, #000 95%)';
    return { section: section, canvas: canvas, fade: fade, ctx: ctx, w: 0, h: 0, dpr: 1,
             raf: 0, visible: true, t0: performance.now(), ro: null, io: null };
  }

  function resize(s) {
    var r = s.section.getBoundingClientRect();
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    s.w = Math.max(1, Math.round(r.width));
    s.h = Math.max(1, Math.round(r.height));
    s.canvas.width = Math.round(s.w * s.dpr);
    s.canvas.height = Math.round(s.h * s.dpr);
    draw(s, performance.now());
  }

  function draw(s, now) {
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var hy = h * HORIZON, cx = w / 2, floor = h - hy;
    var phase = reduced ? 0 : ((now - s.t0) / 1000 / CYCLE_SECONDS) % 1;
    ctx.lineWidth = 1;

    // linhas horizontais: espaçamento cresce com a proximidade (perspectiva)
    for (var k = 0; k <= ROWS; k++) {
      var p = (k + phase) / ROWS;           // 0 = horizonte, 1 = base
      var y = hy + floor * Math.pow(p, 2.2);
      var a = MAX_ALPHA * Math.min(1, p * 2.2);
      ctx.strokeStyle = 'rgba(' + RGB + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // linhas verticais convergindo ao ponto de fuga, esmaecendo rumo ao horizonte
    var g = ctx.createLinearGradient(0, hy, 0, h);
    g.addColorStop(0, 'rgba(' + RGB + ',0)');
    g.addColorStop(1, 'rgba(' + RGB + ',' + MAX_ALPHA + ')');
    ctx.strokeStyle = g;
    var spread = w * 1.6 / COLS;            // espaçamento na base
    var half = COLS / 2;
    for (var i = -half; i <= half; i++) {
      ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx + i * spread, h); ctx.stroke();
    }

    // brilho suave no horizonte
    var glow = ctx.createLinearGradient(0, hy - 60, 0, hy + 60);
    glow.addColorStop(0, 'rgba(' + RGB + ',0)');
    glow.addColorStop(0.5, 'rgba(' + RGB + ',' + (MAX_ALPHA * 0.6).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(' + RGB + ',0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, hy - 60, w, 120);
  }

  function loop(s) {
    return function tick(now) {
      if (state !== s) return;
      if (s.visible && !document.hidden) draw(s, now);
      s.raf = requestAnimationFrame(tick);
    };
  }

  function destroy(s) {
    cancelAnimationFrame(s.raf);
    if (s.ro) s.ro.disconnect();
    if (s.io) s.io.disconnect();
  }

  function scan() {
    var section = document.querySelector(SECTION_SEL);
    if (!section || (state && state.section === section && state.canvas.isConnected)) return;
    if (state) destroy(state);
    var s = build(section);
    if (!s) return;
    state = s;
    section.insertBefore(s.fade, section.firstChild);
    section.insertBefore(s.canvas, section.firstChild);
    resize(s);
    s.ro = new ResizeObserver(function () { resize(s); });
    s.ro.observe(section);
    s.io = new IntersectionObserver(function (e) { s.visible = e[0].isIntersecting; });
    s.io.observe(section);
    if (!reduced) s.raf = requestAnimationFrame(loop(s));
  }

  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; scan(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
