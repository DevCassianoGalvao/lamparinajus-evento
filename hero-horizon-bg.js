/**
 * Fundo da hero: terreno 3D de pontos com colinas ("Digital Horizon"), laranja, muito lento e a ~10% de opacidade.
 * Canvas 2D; um degradê preto→transparente cobre a base da hero para não haver corte seco.
 */
(function () {
  var SECTION_SEL = 'section[data-screen-label="Hero"]';
  var RGB = '255,106,0';
  var MAX_ALPHA = 0.10;      // opacidade máxima dos pontos
  var HORIZON = 0.36;        // altura do horizonte (fração da hero)
  var CAM_Y = 2.4;           // altura da câmera
  var Z_NEAR = 1.6, Z_FAR = 46, DZ = 0.36;   // profundidade e espaçamento das fileiras
  var X_HALF = 66, DX = 1.5; // largura do terreno e espaçamento das colunas
  var SPEED = 0.18;          // unidades/segundo (bem lento)
  var DRIFT = 0.05;          // velocidade de ondulação das colinas
  var GLYPH_Z = 11;          // abaixo dessa profundidade, os pontos viram caracteres
  var GLYPHS = ['0', '1', 'I', 'o', '+'];
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

  function height(x, zw, t) {
    var amp = 0.5 + zw * 0.11;
    return amp * (Math.sin(x * 0.21 + zw * 0.12 + t * DRIFT) +
                  0.7 * Math.sin(x * 0.11 - zw * 0.16 - t * DRIFT * 0.8) +
                  0.4 * Math.sin(x * 0.31 + zw * 0.23));
  }

  function draw(s, now) {
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var t = reduced ? 0 : (now - s.t0) / 1000;
    var travel = t * SPEED;
    var hy = h * HORIZON, cx = w / 2, f = w * 0.6;
    var rows = Math.ceil((Z_FAR - Z_NEAR) / DZ);
    var shift = travel % DZ;                     // fileiras deslizam rumo à câmera
    var base = Math.floor(travel / DZ);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var k = rows; k >= 0; k--) {            // do fundo para a frente
      var z = Z_NEAR + k * DZ - shift;
      if (z < Z_NEAR * 0.7) continue;
      var zw = z + (base + 0) * DZ + shift;       // z no mundo (fixo para cada fileira)
      var scale = f / z;
      var fog = Math.max(0, 1 - z / Z_FAR);
      var alpha = MAX_ALPHA * (0.25 + 0.75 * Math.min(1, Math.pow(fog, 0.8) * 1.6));
      var size = Math.max(0.7, 2.6 / Math.sqrt(z));
      var glyph = z < GLYPH_Z;
      ctx.fillStyle = 'rgba(' + RGB + ',' + alpha.toFixed(3) + ')';
      if (glyph) ctx.font = '600 ' + Math.round(Math.max(8, 70 / z)) + 'px monospace';
      var colOff = (Math.floor(zw / DZ) % 2) * DX * 0.5;   // fileiras alternadas
      for (var x = -X_HALF + colOff; x <= X_HALF; x += DX) {
        var sy = hy + (CAM_Y - height(x, zw, t)) * scale;
        if (sy < 0 || sy > h) continue;
        var sx = cx + x * scale;
        if (sx < -20 || sx > w + 20) continue;
        if (glyph && ((x * 7 + zw * 13) | 0) % 5 === 0) {
          ctx.fillText(GLYPHS[Math.abs((x * 3 + zw * 5) | 0) % GLYPHS.length], sx, sy);
        } else {
          ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        }
      }
    }
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
