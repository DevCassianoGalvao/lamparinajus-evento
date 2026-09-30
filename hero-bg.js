/**
 * Fundo animado da hero: shader "Chroma Strands" (Framer) portado para WebGL puro,
 * paleta laranja (Solar Ember) e opacidade baixa para ficar suave atrás do conteúdo.
 */
(function () {
  var SECTION_SEL = 'section[data-screen-label="Hero"]';
  var OPACITY = 0.15;
  var SPEED = 0.3; // 1 = velocidade original do componente
  var RENDER_SCALE = 0.5; // resolução interna relativa ao CSS (o shader é pesado e fica suave mesmo assim)

  // Shape "Silken Twist" + paleta "Solar Ember"; fundo preto para combinar com a hero.
  var U = { FLOW_SPEED: .553, FLOW_DIRECTION: -1.43, ZOOM: 1.59, TILT: -2.8, POSITION_X: -.21, POSITION_Y: .06,
    THETA: 1.58, TWIST: -.52, SHEAR: -.55, SHRINK: .899, LINE_WIDTH: 3.05, WAVE_AMOUNT: .235, WAVE_SCALE: 1.59,
    SIDE_SPREAD: .05, GLOW_SIZE: .0029, SOFTNESS: .0071, FALLOFF: 2.9, BREATH_RATE: .34, BREATH_AMOUNT: .15,
    PHASE: 32.41, ECHO_AMOUNT: 0, ECHO_SHIFT: -2, COLOR_TRAVEL: -.32, COLOR_CYCLE: 2, VIGNETTE: .1, NOISE_AMOUNT: .0033 };
  var LAYERS = 59;
  var COLORS = { COLOR_1: '#B91805', COLOR_2: '#FF630F', COLOR_3: '#F6BB39', BACKGROUND_COLOR: '#000000' };

  var FRAG = 'precision highp float; uniform float iTime; uniform vec2 iResolution; uniform float iDpr; uniform float FLOW_SPEED; uniform float FLOW_DIRECTION; uniform float ZOOM; uniform float TILT; uniform float POSITION_X; uniform float POSITION_Y; uniform int LAYERS; uniform float THETA; uniform float TWIST; uniform float SHEAR; uniform float SHRINK; uniform float LINE_WIDTH; uniform float WAVE_AMOUNT; uniform float WAVE_SCALE; uniform float SIDE_SPREAD; uniform float GLOW_SIZE; uniform float SOFTNESS; uniform float FALLOFF; uniform float BREATH_RATE; uniform float BREATH_AMOUNT; uniform float PHASE; uniform float ECHO_AMOUNT; uniform float ECHO_SHIFT; uniform vec3 COLOR_1; uniform vec3 COLOR_2; uniform vec3 COLOR_3; uniform vec3 BACKGROUND_COLOR; uniform float COLOR_TRAVEL; uniform float COLOR_CYCLE; uniform float VIGNETTE; uniform float NOISE_AMOUNT; const int MAX_LINES=64; vec3 C(float x){ x=fract(x)*3.; if(x<1.) return mix( COLOR_1, COLOR_2, smoothstep(0.,1.,x) ); if(x<2.) return mix( COLOR_2, COLOR_3, smoothstep(0.,1.,x-1.) ); return mix( COLOR_3, COLOR_1, smoothstep(0.,1.,x-2.) ); } float N(vec2 p,float f){ vec3 q= fract( vec3(p.xyx)* vec3(.1031,.103,.0973) ); q+= dot( q, q.yzx+33.33+f*.013 ); return fract( (q.x+q.y)*q.z ); } vec2 R( vec2 p, float a ){ float c=cos(a); float s=sin(a); return mat2( c,s, -s,c )*p; } float lineProfile( float distanceToLine, float width ){ float cssPixel= max( ZOOM, .001 )* iDpr/ max( iResolution.y, 1. ); float halfWidth= max( width, .01 )* .5* cssPixel; float aa= cssPixel* 1.15; return 1.- smoothstep( halfWidth, halfWidth+aa, distanceToLine ); } float glowProfile( float distanceToLine, float width ){ float cssPixel= max( ZOOM, .001 )* iDpr/ max( iResolution.y, 1. ); float halfWidth= max( width, .01 )* .5* cssPixel; float outside= max( distanceToLine- halfWidth, 0. ); float d= outside* 2.19; float glow= GLOW_SIZE/ max( d*d+ SOFTNESS, 1e-6 ); return glow*.055; } float lineShape( vec2 p, float index, float count, float time, float breath ){ float n= count>1. ? index/(count-1.) : .5; vec2 q= R( p, -THETA ); float distribution= n-.5; float spreadScale= mix( .75, 1.25, clamp( ( SHRINK-.85 )/.2, 0., 1. ) ); float offset= distribution* SIDE_SPREAD* spreadScale; float curve= SHEAR* .035* q.y*q.y; float phase= distribution* 1.35; float wave= sin( q.y* ( 1.18* WAVE_SCALE )+ time*.46+ phase )* WAVE_AMOUNT; wave+= sin( q.y* ( 2.31* WAVE_SCALE )- time*.18+ phase*.63 )* ( WAVE_AMOUNT* .19 ); wave+= cos( q.y* ( .54* WAVE_SCALE )+ time*.11+ phase*.31 )* ( WAVE_AMOUNT* .08 ); float twistAmount= abs(TWIST)* .055; float twistDirection= TWIST<0. ? -1. : 1.; float twistFrequency= 5.+ abs(TWIST)* 5.; float twistPhase= q.y* twistFrequency+ time* .12* twistDirection+ index* .17; float twistX= sin( twistPhase )* twistAmount; float twistDepth= .5+ .5* cos( twistPhase ); twistX+= sin( twistPhase* 2.+ .8 )* twistAmount* .12; float breathing= distribution* breath* .025; float x= q.x- offset- curve- wave- breathing- twistX; float twistStrength= clamp( abs(TWIST), 0., 1. ); float wireWidth= LINE_WIDTH* mix( 1., mix( .78, 1.16, twistDepth ), twistStrength ); float distanceToLine= abs(x); float core= lineProfile( distanceToLine, wireWidth ); float glow= glowProfile( distanceToLine, wireWidth ); float wireLight= mix( 1., mix( .72, 1.18, twistDepth ), twistStrength ); float value= max( core, glow )* wireLight; if(ECHO_AMOUNT>0.){ float echoDistance= abs( x- ECHO_SHIFT ); float echoCore= lineProfile( echoDistance, wireWidth ); float echoGlow= glowProfile( echoDistance, wireWidth ); value+= ECHO_AMOUNT* max( echoCore, echoGlow ); } value*= exp2( -abs(q.y)* FALLOFF ); return value; } void mainImage( out vec4 O, in vec2 I ){ vec2 screenP= ( I- .5* iResolution.xy )/ iResolution.y; float t= iTime* FLOW_SPEED* FLOW_DIRECTION+ PHASE; float breath= .5+ .25* ( sin( iTime* BREATH_RATE+ 1. )- sin( iTime* BREATH_RATE* 1.5 ) ); vec2 p= screenP; p-= vec2( POSITION_X, POSITION_Y ); p*= max( .001, ZOOM- breath* BREATH_AMOUNT ); p= R( p, -TILT ); vec3 z= vec3(0.); float count= max(float(LAYERS), 1.0); for( int j=0; j<MAX_LINES; j++ ){ if(j>=LAYERS) break; float i= float(j); float n= LAYERS>1 ? i/float(LAYERS-1) : .5; float g= lineShape( p, i, count, t, breath ); float along= length(p); float k= .5+ .5* sin( n* 6.283+ i* COLOR_CYCLE+ t*1.2+ along* COLOR_TRAVEL ); z+= g* C(k); } vec3 x= max( z, 0. ); z= x* ( 2.51*x+ .03 )/ max( x* ( 2.43*x+ .59 )+ .14, vec3(1e-6) ); z= pow( clamp( z, 0., 1. ), vec3( .85, .92, .98 ) ); z*= 1.- VIGNETTE* smoothstep( .5, 1.6, length(screenP) ); z= 1.- ( 1.- BACKGROUND_COLOR )* ( 1.-z ); vec2 noiseCoord= floor( I/ max( iDpr, 1e-4 ) ); float grain= N( noiseCoord, floor( iTime* 24. ) )- .5; z+= grain* NOISE_AMOUNT; O= vec4( clamp( z, 0., 1. ), 1. ); } void main(){ mainImage( gl_FragColor, gl_FragCoord.xy ); gl_FragColor.rgb = mix(12.92 * gl_FragColor.rgb, 1.055 * pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), gl_FragColor.rgb)); }';
  var VERT = 'attribute vec2 position; void main(){ gl_Position = vec4(position, 0., 1.); }';

  function srgbToLinear(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (b) {
      var v = b / 255;
      return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    });
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = null; // { section, cv, gl, locs, w, h, visible }
  var t0 = performance.now();
  var raf = 0;

  function build(section) {
    var cv = document.createElement('canvas');
    cv.className = 'hero-bg-canvas';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:' + OPACITY;
    var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;
    try {
      var prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var attr = gl.getAttribLocation(prog, 'position');
      gl.enableVertexAttribArray(attr);
      gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
      var loc = function (n) { return gl.getUniformLocation(prog, n); };
      Object.keys(U).forEach(function (k) { gl.uniform1f(loc(k), U[k]); });
      gl.uniform1i(loc('LAYERS'), LAYERS);
      Object.keys(COLORS).forEach(function (k) {
        var c = srgbToLinear(COLORS[k]);
        gl.uniform3f(loc(k), c[0], c[1], c[2]);
      });
      return { section: section, cv: cv, gl: gl, uTime: loc('iTime'), uRes: loc('iResolution'), uDpr: loc('iDpr'),
               w: 0, h: 0, visible: true };
    } catch (e) {
      return null;
    }
  }

  function draw(time) {
    var s = state;
    var w = Math.max(1, Math.round(s.section.clientWidth * RENDER_SCALE));
    var h = Math.max(1, Math.round(s.section.clientHeight * RENDER_SCALE));
    if (w !== s.w || h !== s.h) {
      s.w = w; s.h = h;
      s.cv.width = w; s.cv.height = h;
      s.gl.viewport(0, 0, w, h);
      s.gl.uniform2f(s.uRes, w, h);
      s.gl.uniform1f(s.uDpr, RENDER_SCALE);
    }
    s.gl.uniform1f(s.uTime, time);
    s.gl.drawArrays(s.gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    raf = 0;
    if (!state) return;
    if (!state.section.isConnected) { state = null; scan(); return; }
    if (!state.cv.isConnected) state.section.insertBefore(state.cv, state.section.firstChild);
    if (state.visible && document.visibilityState !== 'hidden') draw(((now - t0) / 1000) * SPEED);
    if (!reduced) raf = requestAnimationFrame(frame);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (state && en.target === state.section) state.visible = en.isIntersecting; });
  });

  function scan() {
    var section = document.querySelector(SECTION_SEL);
    if (!section || (state && state.section === section)) return;
    var s = build(section);
    if (!s) return;
    state = s;
    section.insertBefore(s.cv, section.firstChild);
    io.observe(section);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; scan(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
