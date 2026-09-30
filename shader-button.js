/**
 * Botões com shader "Liquid Gradient" (WebGL2), portado do componente Shader Button do Framer
 * e recolorido em laranja. Aplica em todo <button> CTA (uppercase). Sem WebGL, cai no fundo escuro + brilho CSS.
 */
(function () {
  var SEL = 'button[style*="uppercase"]';
  var COLORS = [[10, 18, 2], [26, 46, 5], [101, 163, 13], [163, 230, 53]];
  var P = { scale: 0.4, seed: 32, speed: 1.6, amp: 0.6, freq: 0.1, iter: 4, bands: 2.4,
            dither: 0.08, exposure: 1.1, contrast: 1.1, saturation: 1 };

  var css = SEL + '{position:relative!important;isolation:isolate;overflow:hidden!important;border:none!important;' +
    'border-radius:999px!important;background:#0a1202!important;box-shadow:0 10px 30px rgba(132,204,22,.35)!important;' +
    'font-weight:600!important;text-shadow:0 1px 6px rgba(0,0,0,.55);letter-spacing:.06em!important}' +
    SEL + '::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' +
    'box-shadow:inset 0 0 16px rgba(217,249,157,.64);mix-blend-mode:hard-light;transition:opacity .4s cubic-bezier(.4,0,.6,1)}' +
    SEL + '::after{content:"";position:absolute;inset:0;z-index:1;border-radius:inherit;pointer-events:none;' +
    'border:2px solid rgba(255,255,255,.24)}' +
    SEL + ' canvas.sb-canvas{position:absolute;inset:-2px;width:calc(100% + 4px);height:calc(100% + 4px);z-index:-2;' +
    'pointer-events:none;transition:opacity .4s cubic-bezier(.4,0,.6,1)}' +
    SEL + ':hover canvas.sb-canvas,' + SEL + ':hover::before{opacity:.4}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var VERT = '#version 300 es\nin vec2 a;out vec2 v_uv;void main(){v_uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
  var FRAG = [
    '#version 300 es',
    'precision highp float;in vec2 v_uv;out vec4 fragColor;',
    'uniform vec2 u_resolution;uniform float u_time,u_scale,u_seed,u_speed,u_turbAmp,u_turbFreq,u_turbIter,u_waveFreq,u_dither,u_exposure,u_contrast,u_saturation;uniform vec3 u_colors[4];',
    'const float GA=2.3999632,TAU=6.2831853;',
    'uvec3 hash3(uvec3 v){v=v*1664525u+1013904223u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;v^=v>>16u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;return v;}',
    'vec3 seedRandom(float s){uvec3 u=uvec3(floatBitsToUint(s),floatBitsToUint(s*1.5+7.31),floatBitsToUint(s*2.7+13.37));u=hash3(u);return vec3(u)/float(0xFFFFFFFFu);}',
    'vec3 toLinear(vec3 c){return pow(c,vec3(2.2));}vec3 toSrgb(vec3 c){return pow(clamp(c,0.,1.),vec3(.4545));}',
    'vec3 linearToOklab(vec3 c){float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b;float m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b;float s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;l=pow(max(l,0.),1./3.);m=pow(max(m,0.),1./3.);s=pow(max(s,0.),1./3.);return vec3(.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s);}',
    'vec3 oklabToLinear(vec3 c){float l=c.x+.3963377774*c.y+.2158037573*c.z;float m=c.x-.1055613458*c.y-.0638541728*c.z;float s=c.x-.0894841775*c.y-1.291485548*c.z;l=l*l*l;m=m*m*m;s=s*s*s;return vec3(4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s);}',
    'vec3 mixLch(vec3 a,vec3 b,float t){vec3 h0=vec3(a.x,length(a.yz),atan(a.z,a.y));vec3 h1=vec3(b.x,length(b.yz),atan(b.z,b.y));if(h0.y<.05)h0.z=h1.z;if(h1.y<.05)h1.z=h0.z;float dh=h1.z-h0.z;if(dh>3.14159265)dh-=TAU;if(dh<-3.14159265)dh+=TAU;float L=mix(h0.x,h1.x,t),C=mix(h0.y,h1.y,t),H=h0.z+dh*t;return vec3(L,C*cos(H),C*sin(H));}',
    'vec3 palette(float t){float seg=1./3.;t=clamp(t,0.,1.);int i=min(int(floor(t/seg)),2);float lt=clamp((t-float(i)*seg)/seg,0.,1.);return oklabToLinear(mixLch(linearToOklab(toLinear(u_colors[i])),linearToOklab(toLinear(u_colors[i+1])),lt));}',
    'float IGN(vec2 uv){return fract(52.9829189*fract(dot(uv,vec2(.06711056,.00583715))));}',
    'vec3 softGamut(vec3 c){float mx=max(c.r,max(c.g,c.b));float mn=min(c.r,min(c.g,c.b));if(mn>=0.&&mx<=1.)return c;vec3 lab=linearToOklab(max(c,0.));float L=clamp(lab.x,0.,1.);float C=length(lab.yz);float h=atan(lab.z,lab.y);float mc=.4*(1.-pow(abs(2.*L-1.),2.));if(C>mc*.7){float k=mc*.7;C=k+(mc-k)*tanh((C-k)/(mc-k+.001));}return clamp(oklabToLinear(vec3(L,C*cos(h),C*sin(h))),0.,1.);}',
    'void main(){vec2 fc=v_uv*u_resolution;vec2 r=u_resolution;vec2 p=(fc*2.-r)/r.y;float t=u_time*.3;',
    'vec3 so=seedRandom(u_seed);vec3 so2=seedRandom(u_seed+100.);float sa=u_seed*GA;vec2 sp=(so2.xy-.5)*TAU;float cs=cos(sa),sn=sin(sa);p=mat2(cs,-sn,sn,cs)*p;',
    'float dither=IGN(floor(fc));float tv=0.,tw=0.;int ti=int(u_turbIter);float freq=1./max(u_turbFreq,.01);',
    'for(float i=0.;i<4.;i++){float eph=i/4.;vec2 q=p*u_scale;float a=sp.x,d=sp.y;',
    'for(int j=2;j<13;j++){if(j>=ti)break;float fj=float(j);float t1=t*u_speed;q+=u_turbAmp*sin(q.yx/freq*fj+t1+vec2(a,d)+so.xy*fj)/fj;a+=cos(fj+d*1.2+q.x*2.-t1+so2.z);d+=sin(fj*q.y+a+so.z+t1+so2.y);}',
    'float v=.5+.5*sin(length(q.yx+vec2(a,d)*.2)*u_waveFreq+i*i+so.x);float w=smoothstep(0.,.5,eph)*smoothstep(1.,.5,eph);tv+=v*w;tw+=w;}',
    'float val=tv/tw;val=clamp((val-.3)/.4,0.,1.);val=clamp(val+(dither-.5)*u_dither,0.,1.);',
    'vec3 col=palette(val)*u_exposure;vec3 lab=linearToOklab(col);float C=length(lab.yz),h=atan(lab.z,lab.y);lab.x=clamp((lab.x-.5)*u_contrast+.5,0.,1.);C*=u_saturation;lab.y=C*cos(h);lab.z=C*sin(h);col=oklabToLinear(lab);',
    'fragColor=vec4(toSrgb(softGamut(col)),1.);}'
  ].join('\n');

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = [];
  var t0 = performance.now();

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      items.forEach(function (it) { if (it.btn === en.target) it.visible = en.isIntersecting; });
    });
  });

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function setup(btn) {
    var cv = document.createElement('canvas');
    cv.className = 'sb-canvas';
    cv.setAttribute('aria-hidden', 'true');
    var gl = cv.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
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
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var u = function (n) { return gl.getUniformLocation(prog, n); };
      var flat = [];
      COLORS.forEach(function (c) { flat.push(c[0] / 255, c[1] / 255, c[2] / 255); });
      gl.uniform3fv(u('u_colors'), new Float32Array(flat));
      gl.uniform1f(u('u_scale'), P.scale);
      gl.uniform1f(u('u_seed'), P.seed);
      gl.uniform1f(u('u_speed'), P.speed);
      gl.uniform1f(u('u_turbAmp'), P.amp);
      gl.uniform1f(u('u_turbFreq'), P.freq);
      gl.uniform1f(u('u_turbIter'), P.iter);
      gl.uniform1f(u('u_waveFreq'), P.bands);
      gl.uniform1f(u('u_dither'), P.dither);
      gl.uniform1f(u('u_exposure'), P.exposure);
      gl.uniform1f(u('u_contrast'), P.contrast);
      gl.uniform1f(u('u_saturation'), P.saturation);
      var it = { btn: btn, cv: cv, gl: gl, uTime: u('u_time'), uRes: u('u_resolution'), visible: true, w: 0, h: 0 };
      btn.insertBefore(cv, btn.firstChild);
      io.observe(btn);
      return it;
    } catch (e) {
      return null;
    }
  }

  function draw(it, time) {
    var r = it.btn.getBoundingClientRect();
    var w = Math.max(1, Math.round((r.width + 4) * 0.5));
    var h = Math.max(1, Math.round((r.height + 4) * 0.5));
    if (w !== it.w || h !== it.h) {
      it.w = w; it.h = h;
      it.cv.width = w; it.cv.height = h;
      it.gl.viewport(0, 0, w, h);
      it.gl.uniform2f(it.uRes, w, h);
    }
    it.gl.uniform1f(it.uTime, time);
    it.gl.drawArrays(it.gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now) {
    var time = (now - t0) / 1000;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.btn.isConnected) { io.unobserve(it.btn); items.splice(i--, 1); continue; }
      if (!it.cv.isConnected) it.btn.insertBefore(it.cv, it.btn.firstChild);
      if (it.visible) draw(it, time);
    }
    if (!reduced) requestAnimationFrame(frame);
  }

  function scan() {
    document.querySelectorAll(SEL).forEach(function (b) {
      if (items.some(function (it) { return it.btn === b; })) return;
      var it = setup(b);
      if (it) items.push(it);
    });
    if (reduced) requestAnimationFrame(frame);
  }

  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; scan(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
  if (!reduced) requestAnimationFrame(frame);
})();
