/**
 * Fundo da hero: "Codex Reveal" (Framer) — ondas ASCII que reagem ao mouse, portado para JS puro.
 * Canvas 2D com dois buffers (simulação de onda), caracteres brancos translúcidos.
 * Um degradê preto→transparente cobre a base da hero, por cima do canvas, para suavizar o corte.
 */
(function () {
  var SECTION_SEL = 'section[data-screen-label="Hero"]';
  var FONT_SIZE = 13, DENSITY = 1, DAMPING = 0.96, VELOCITY = 0.48, MAX_OPACITY = 0.22;
  var CHARS = ['·', '.', '-', '~', '=', '+', 'x', '*', 'o'];
  var CHARS_LEN = CHARS.length - 1;
  var ALPHA_STEPS = 14;

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var palette = [];
  for (var i = 0; i <= ALPHA_STEPS; i++) {
    palette.push('rgba(255,255,255,' + ((i / ALPHA_STEPS) * MAX_OPACITY).toFixed(3) + ')');
  }

  var colSpacing = (FONT_SIZE * 0.85) / DENSITY;
  var rowSpacing = (FONT_SIZE * 1.15) / DENSITY;

  var state = null; // { section, canvas, ctx, ro, cols, rows, w, h, buf1, buf2, mouse, sleeping, idle, raf }

  function build(section) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block';
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var fade = document.createElement('div');
    fade.setAttribute('aria-hidden', 'true');
    fade.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:22%;z-index:0;pointer-events:none;' +
      'background:linear-gradient(to bottom, transparent, #000 92%)';

    var s = {
      section: section, canvas: canvas, ctx: ctx, fade: fade,
      cols: 0, rows: 0, w: 0, h: 0, buf1: null, buf2: null,
      mouse: { x: -1, y: -1, prevX: -1, prevY: -1, down: false },
      sleeping: false, idle: 0, raf: 0
    };
    return s;
  }

  function initBuffers(s) {
    var rect = s.section.getBoundingClientRect();
    s.w = s.canvas.width = Math.max(1, Math.round(rect.width));
    s.h = s.canvas.height = Math.max(1, Math.round(rect.height));
    s.cols = Math.ceil(s.w / colSpacing) + 2;
    s.rows = Math.ceil(s.h / rowSpacing) + 2;
    var size = s.cols * s.rows;
    s.buf1 = new Float32Array(size);
    s.buf2 = new Float32Array(size);
  }

  function drop(s, x, y, radius, strength) {
    var gx = Math.floor(x / colSpacing), gy = Math.floor(y / rowSpacing);
    for (var r = -radius; r <= radius; r++) {
      for (var c = -radius; c <= radius; c++) {
        var nx = gx + c, ny = gy + r;
        if (nx > 0 && nx < s.cols - 1 && ny > 0 && ny < s.rows - 1) {
          var dist = c * c + r * r, radSq = radius * radius;
          if (dist < radSq) {
            var idx = ny * s.cols + nx;
            s.buf1[idx] += strength * (1 - dist / radSq);
          }
        }
      }
    }
    wake(s);
  }

  function wake(s) {
    s.idle = 0;
    if (s.sleeping) { s.sleeping = false; render(s); }
  }

  function onMove(e) {
    var s = state;
    if (!s) return;
    var rect = s.section.getBoundingClientRect();
    var m = s.mouse;
    m.x = e.clientX - rect.left;
    m.y = e.clientY - rect.top;
    if (m.prevX === -1) { m.prevX = m.x; m.prevY = m.y; }
    var dx = m.x - m.prevX, dy = m.y - m.prevY, speedSq = dx * dx + dy * dy;
    if (speedSq > 2) {
      var speed = Math.sqrt(speedSq);
      var steps = Math.min(Math.floor(speed / 6), 8);
      var strength = Math.min(speed * 0.12, 3.5) * (m.down ? 1.8 : 1);
      var radius = m.down ? 3 : 2;
      for (var i = 0; i <= steps; i++) {
        var t = steps === 0 ? 0 : i / steps;
        drop(s, m.prevX + dx * t, m.prevY + dy * t, radius, strength);
      }
    }
    m.prevX = m.x; m.prevY = m.y;
  }
  function onDown(e) {
    var s = state;
    if (!s) return;
    s.mouse.down = true;
    if (s.mouse.x !== -1) drop(s, s.mouse.x, s.mouse.y, 5, 7);
  }
  function onUp() { if (state) state.mouse.down = false; }
  function onLeave() { if (state) { state.mouse.prevX = -1; state.mouse.prevY = -1; } }

  function render(s) {
    var ctx = s.ctx;
    ctx.clearRect(0, 0, s.w, s.h);
    ctx.font = FONT_SIZE + 'px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    var active = 0;
    var cols = s.cols, rows = s.rows, buf1 = s.buf1, buf2 = s.buf2;
    for (var y = 1; y < rows - 1; y++) {
      var ro = y * cols;
      for (var x = 1; x < cols - 1; x++) {
        var i = ro + x;
        buf2[i] = (buf1[i - 1] + buf1[i + 1] + buf1[i - cols] + buf1[i + cols]) * VELOCITY - buf2[i];
        buf2[i] *= DAMPING;
      }
    }
    s.buf1 = buf2; s.buf2 = buf1;
    buf1 = s.buf1;
    for (y = 1; y < rows - 1; y++) {
      ro = y * cols;
      var posY = y * rowSpacing;
      for (x = 1; x < cols - 1; x++) {
        i = ro + x;
        var intensity = Math.abs(buf1[i]);
        if (intensity > 0.008) {
          active++;
          var posX = x * colSpacing;
          var ci = Math.min((intensity * 2.2) | 0, CHARS_LEN);
          var coli = Math.min((intensity * 6) | 0, ALPHA_STEPS);
          ctx.fillStyle = palette[coli];
          ctx.fillText(CHARS[ci], posX, posY);
        }
      }
    }
    if (active === 0 && !s.mouse.down) {
      s.idle++;
      if (s.idle > 30) { s.sleeping = true; return; }
    } else {
      s.idle = 0;
    }
    s.raf = requestAnimationFrame(function () { render(s); });
  }

  function seedCenterDrop(s) {
    drop(s, s.w / 2, s.h / 2, 6, 8);
  }

  var ro;
  function scan() {
    var section = document.querySelector(SECTION_SEL);
    if (!section || (state && state.section === section)) return;
    var s = build(section);
    if (!s) return;
    state = s;
    section.insertBefore(s.fade, section.firstChild);
    section.insertBefore(s.canvas, section.firstChild);
    initBuffers(s);
    seedCenterDrop(s);
    if (!reduced) {
      render(s);
      section.addEventListener('pointermove', onMove, { passive: true });
      section.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      section.addEventListener('pointerleave', onLeave, { passive: true });
    }
    ro = new ResizeObserver(function () {
      if (!state) return;
      initBuffers(state);
      if (reduced) seedCenterDrop(state);
    });
    ro.observe(section);
  }

  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; scan(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
