/**
 * Animações de entrada e micro interações (GSAP + ScrollTrigger).
 * Regras para conviver com o runtime da página (que controla opacity/transform dos blocos data-reveal):
 *  - o GSAP anima só os FILHOS desses blocos e limpa (clearProps) o que aplicou;
 *  - hover/active de cards e botões ficam em CSS com !important, nunca em GSAP.
 * Sem GSAP (falha de rede) ou com "reduzir movimento": nada é escondido nem animado.
 */
(function () {
  var root = document.documentElement;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CLEAR = 'transform,opacity,visibility';

  function release() { root.classList.remove('anim-pending'); }
  if (reduced || !window.gsap || !window.ScrollTrigger) { release(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // ---------- CSS: transições suaves + hover/active ----------
  var BTN = 'button[style*="uppercase"]';
  var CARDS = [
    'section[data-screen-label="Para quem é"] div[style*="grid-template"] > div',
    'section[data-screen-label="O que você vai ver"] div[style*="grid-template"] > div',
    'section[data-screen-label="Palestrantes"] div[style*="grid-template"] > div'
  ];
  var css =
    '[data-reveal]{transition:opacity .8s ease,transform .8s cubic-bezier(.22,1,.36,1)!important}' +
    CARDS.join(',') + '{transition:opacity .8s ease,transform .45s cubic-bezier(.22,1,.36,1),border-color .3s,box-shadow .35s!important}' +
    CARDS.map(function (s) { return s + ':hover'; }).join(',') +
      '{transform:translateY(-6px)!important;border-color:rgba(255,106,0,.5)!important;box-shadow:0 18px 48px rgba(255,106,0,.14)!important}' +
    'section[data-screen-label="Palestrantes"] image-slot{transition:transform .7s cubic-bezier(.22,1,.36,1)}' +
    'section[data-screen-label="Palestrantes"] div[style*="grid-template"] > div:hover image-slot{transform:scale(1.05)}' +
    BTN + ':active{transform:scale(.96)!important}' +
    '@keyframes stickyIn{from{transform:translateY(100%)}to{transform:none}}' +
    'div[style*="fixed"][style*="bottom"]{animation:stickyIn .5s cubic-bezier(.22,1,.36,1)}' +
    '.gsap-ripple{position:absolute;border-radius:50%;background:rgba(0,0,0,.18);pointer-events:none;transform:scale(0)}' +
    '#scroll-progress{position:fixed;top:0;left:0;height:3px;width:100%;background:linear-gradient(90deg,#FF6A00,#FFB27A);' +
      'transform:scaleX(0);transform-origin:0 50%;z-index:60;pointer-events:none}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  // ---------- helpers ----------
  function q(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function onEnter(targets, from, opts) {
    if (!targets.length) return;
    gsap.set(targets, Object.assign({ autoAlpha: 0 }, from));
    var first = targets[0];
    ScrollTrigger.create({
      trigger: first.closest('[data-reveal]') || first,
      start: 'top 90%',
      once: true,
      onEnter: function () {
        gsap.to(targets, Object.assign({
          autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.8, ease: 'power3.out', stagger: 0.09, clearProps: CLEAR
        }, opts || {}));
      }
    });
  }

  // ---------- hero ----------
  function initHero() {
    var hero = document.querySelector('section[data-screen-label="Hero"]');
    var logo = hero.querySelector('.hero-head');
    var col = hero.querySelector('[data-reveal]');
    var badge = col.querySelector('span');
    var h1 = col.querySelector('h1');
    var p = col.querySelector('p');
    var date = col.querySelector('div');
    var note = col.querySelectorAll('p')[1];
    var cta = col.querySelector('button');
    var photo = hero.querySelector('[data-reveal] img[src*="hero-palestrantes"]');

    gsap.set([logo, badge, p, date, note, cta].filter(Boolean), { autoAlpha: 0, y: 20 });
    gsap.set(h1, { autoAlpha: 0, y: 30, filter: 'blur(8px)' });
    gsap.set(photo, { autoAlpha: 0, x: 60, scale: 0.94 });
    release();

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(logo, { autoAlpha: 1, y: 0, duration: 0.7 })
      .to(badge, { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.45')
      .to(h1, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1, clearProps: 'transform,opacity,visibility,filter' }, '-=0.35')
      .to(p, { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.5')
      .to(date, { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.45')
      .to([cta, note].filter(Boolean), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, clearProps: CLEAR }, '-=0.4')
      .to(photo, { autoAlpha: 1, x: 0, scale: 1, duration: 1.2, ease: 'power4.out', clearProps: CLEAR }, 0.3)
      .add(function () {
        gsap.set([logo, badge, p, date], { clearProps: CLEAR });
      });
  }

  // ---------- seções ----------
  function initSections() {
    var S = function (label) { return document.querySelector('section[data-screen-label="' + label + '"]'); };
    var s;

    if ((s = S('Avisos'))) onEnter(q(':scope > div > *', s).reduce(function (a, el) {
      return a.concat(el.style.display === 'flex' ? q(':scope > *', el) : [el]);
    }, []), { y: 30 });

    if ((s = S('Frase de impacto'))) {
      onEnter([s.querySelector('p')], { y: 22 }, { duration: 0.9 });
    }

    if ((s = S('Comunidade'))) onEnter(q('[data-reveal] > *', s), { y: 28 });

    ['Para quem é', 'O que você vai ver', 'Palestrantes'].forEach(function (label) {
      s = S(label);
      if (!s) return;
      onEnter(q('h2', s), { y: 28 });
      q('div[style*="grid-template"] > div', s).forEach(function (card) {
        var kids = q(':scope > *', card);
        onEnter(kids, { y: 26 }, { stagger: 0.12 });
        q('svg', card).slice(0, 1).forEach(function (icon) {
          ScrollTrigger.create({
            trigger: card, start: 'top 90%', once: true,
            onEnter: function () { gsap.from(icon, { scale: 0, rotate: -25, duration: 0.7, ease: 'back.out(2.2)', delay: 0.15 }); }
          });
        });
      });
    });

    if ((s = S('Formulário'))) {
      onEnter(q('h2, h2 ~ p', s), { y: 28 });
      var form = s.querySelector('form');
      onEnter(q(':scope > *', form), { y: 26 }, { stagger: 0.08 });
    }

    if ((s = S('Segurança OAB'))) onEnter(q(':scope > div > *', s), { y: 20 });

    if ((s = S('Chamada final'))) onEnter(q('[data-reveal] > *', s), { y: 28 });
  }

  // ---------- micro interações ----------
  function initMicro() {
    // barra de progresso de leitura
    var bar = document.createElement('div');
    bar.id = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    // ripple nos botões CTA (delegado: sobrevive a re-renders)
    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest && e.target.closest(BTN);
      if (!btn || btn.disabled) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var dot = document.createElement('span');
      dot.className = 'gsap-ripple';
      dot.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
      var wrap = document.createElement('span');
      wrap.style.cssText = 'position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0';
      wrap.appendChild(dot);
      btn.appendChild(wrap);
      gsap.to(dot, { scale: 1, autoAlpha: 0, duration: 0.7, ease: 'power2.out', onComplete: function () { wrap.remove(); } });
    });

    // mensagens de erro do formulário: entram com leve shake no campo
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          var alerts = n.matches && n.matches('[role="alert"]') ? [n] : q('[role="alert"]', n);
          alerts.forEach(function (a) {
            gsap.fromTo(a, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: CLEAR });
            var field = a.parentElement;
            if (field && field.tagName === 'DIV') {
              gsap.fromTo(field, { x: 0 }, { keyframes: { x: [-7, 7, -5, 5, 0] }, duration: 0.42, ease: 'power1.inOut', clearProps: 'transform' });
            }
          });
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ---------- boot: espera o runtime renderizar E estabilizar (ele refaz o DOM logo após montar) ----------
  var started = false;
  function ready() {
    return document.querySelector('section[data-screen-label="Hero"] h1') &&
           document.querySelector('section[data-screen-label="Palestrantes"] h3') &&
           document.querySelector('section[data-screen-label="Formulário"] form');
  }
  var heroStarted = false;
  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    initHero();
  }
  function start() {
    if (started) return;
    started = true;
    window.__animStart = Math.round(performance.now());
    startHero();
    initSections();
    initMicro();
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  // O runtime refaz parte do DOM ~1s após montar (import da config): a hero (só opacity/transform, sobrevive)
  // começa já; as seções (abaixo da dobra) esperam esse momento.
  var SETTLE_MS = 1300;
  function poll() {
    if (started) return;
    if (ready()) { startHero(); setTimeout(start, Math.max(0, SETTLE_MS - performance.now())); return; }
    if (performance.now() > 5000) { release(); return; }
    requestAnimationFrame(poll);
  }
  poll();
  setTimeout(release, 6000); // segurança: nunca deixa a hero escondida
})();
