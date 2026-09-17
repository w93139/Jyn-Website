/* Prism shader adapted from React Bits, Copyright (c) 2026 David Haz.
 * Original: https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/Prism/Prism.jsx
 * MIT + Commons Clause; see THIRD_PARTY_NOTICES.md.
 * Native WebGL adapter for this website. No remote runtime dependencies.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('#prism-canvas');
  const stage = document.querySelector('.prism-stage');
  if (!canvas || !stage) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) { stage.dataset.state = 'fallback'; return; }
  const settings = Object.freeze({ animationType: 'rotate', timeScale: .5, height: 3.5,
    baseWidth: 5.5, scale: 3.6, hueShift: 0, colorFrequency: 1, noise: 0, glow: 1 });
  const vertex = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
  const fragment = `
      precision highp float;

      uniform vec2  iResolution;
      uniform float iTime;

      uniform float uHeight;
      uniform float uBaseHalf;
      uniform mat3  uRot;
      uniform int   uUseBaseWobble;
      uniform float uGlow;
      uniform vec2  uOffsetPx;
      uniform float uNoise;
      uniform float uSaturation;
      uniform float uScale;
      uniform float uHueShift;
      uniform float uColorFreq;
      uniform float uBloom;
      uniform float uCenterShift;
      uniform float uInvBaseHalf;
      uniform float uInvHeight;
      uniform float uMinAxis;
      uniform float uPxScale;
      uniform float uTimeScale;
      uniform float uLightMode;

      vec4 tanh4(vec4 x){
        vec4 e2x = exp(min(2.0*x, vec4(80.0)));
        return (e2x - 1.0) / (e2x + 1.0);
      }

      float rand(vec2 co){
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float sdOctaAnisoInv(vec3 p){
        vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
        float m = q.x + q.y + q.z - 1.0;
        return m * uMinAxis * 0.5773502691896258;
      }

      float sdPyramidUpInv(vec3 p){
        float oct = sdOctaAnisoInv(p);
        float halfSpace = -p.y;
        return max(oct, halfSpace);
      }

      mat3 hueRotation(float a){
        float c = cos(a), s = sin(a);
        mat3 W = mat3(
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114
        );
        mat3 U = mat3(
           0.701, -0.587, -0.114,
          -0.299,  0.413, -0.114,
          -0.300, -0.588,  0.886
        );
        mat3 V = mat3(
           0.168, -0.331,  0.500,
           0.328,  0.035, -0.500,
          -0.497,  0.296,  0.201
        );
        return W + U * c + V * s;
      }

      void main(){
        vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

        float z = 5.0;
        float d = 0.0;

        vec3 p;
        vec4 o = vec4(0.0);

        float centerShift = uCenterShift;
        float cf = uColorFreq;

        mat2 wob = mat2(1.0);
        if (uUseBaseWobble == 1) {
          float t = iTime * uTimeScale;
          float c0 = cos(t + 0.0);
          float c1 = cos(t + 33.0);
          float c2 = cos(t + 11.0);
          wob = mat2(c0, c1, c2, c0);
        }

        const int STEPS = 100;
        for (int i = 0; i < STEPS; i++) {
          p = vec3(f, z);
          p.xz = p.xz * wob;
          p = uRot * p;
          vec3 q = p;
          q.y += centerShift;
          d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
          z -= d;
          o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
        }

        o = tanh4(o * o * (uGlow * uBloom) / 1e5);

        vec3 col = o.rgb;
        float n = rand(gl_FragCoord.xy + vec2(iTime));
        col += (n - 0.5) * uNoise;
        col = clamp(col, 0.0, 1.0);

        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

        if(abs(uHueShift) > 0.0001){
          col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
        }

        if (uLightMode > 0.5) {
          float peak = max(col.r, max(col.g, col.b));
          vec3 chroma = pow(clamp(col / max(peak, 0.0001), 0.0, 1.0), vec3(1.14));
          gl_FragColor = vec4(mix(vec3(1.0), chroma, o.a * 0.94), 1.0);
        } else {
          gl_FragColor = vec4(col, o.a);
        }
      }
    `;

  let program, buffer;
  let uniforms = {};
  let raf = 0;
  let visible = true;
  const userPaused = () => document.body.dataset.motionPaused === 'true';
  let contextLost = false;
  let pageActive = true;
  let elapsed = 0;
  let previous = 0;
  let lastPaint = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const identity = new Float32Array([1,0,0,0,1,0,0,0,1]);
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Shader compilation failed');
    }
    return shader;
  };
  const setFloat = (name, value) => gl.uniform1f(uniforms[name], value);
  function initialize() {
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const name of ['iResolution','iTime','uHeight','uBaseHalf','uRot','uUseBaseWobble','uGlow','uOffsetPx','uNoise','uSaturation','uScale','uHueShift','uColorFreq','uBloom','uCenterShift','uInvBaseHalf','uInvHeight','uMinAxis','uPxScale','uTimeScale','uLightMode']) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    const baseHalf = settings.baseWidth / 2;
    for (const [name, value] of Object.entries({
      uHeight: settings.height, uBaseHalf: baseHalf, uGlow: settings.glow,
      uNoise: settings.noise, uSaturation: 1.5, uScale: settings.scale,
      uHueShift: settings.hueShift, uColorFreq: settings.colorFrequency,
      uBloom: 1, uCenterShift: settings.height * .25,
      uInvBaseHalf: 1 / baseHalf, uInvHeight: 1 / settings.height,
      uMinAxis: Math.min(baseHalf, settings.height), uTimeScale: settings.timeScale, uLightMode: 0
    })) setFloat(name, value);
    gl.uniform1i(uniforms.uUseBaseWobble, 1);
    gl.uniformMatrix3fv(uniforms.uRot, false, identity);
    gl.uniform2f(uniforms.uOffsetPx, 0, 0);
  }
  function draw() {
    if (contextLost || !program) return;
    setFloat('iTime', elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stage.classList.add('prism-ready');
  }
  function resize() {
    if (contextLost || !program) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const area = Math.max(1, rect.width * rect.height);
    // A bounded drawing buffer and 30 fps keep the full raymarched effect affordable.
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(520000 / area));
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.iResolution, canvas.width, canvas.height);
    // Fit the reference's full-width prism into a narrower editorial column.
    const framing = Math.min(.63, (canvas.width / canvas.height) * .55);
    setFloat('uPxScale', 1 / (canvas.height * .1 * settings.scale * framing));
    draw();
  }
  const shouldRun = () => visible && !document.hidden && !reduced.matches && !userPaused() && !contextLost && pageActive;
  function tick(now) {
    raf = 0;
    if (!shouldRun()) { previous = 0; return; }
    if (previous) elapsed += Math.min((now - previous) / 1000, .1);
    previous = now;
    if (now - lastPaint >= 1000 / 30) { draw(); lastPaint = now; }
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = 0;
    stage.dataset.state = contextLost ? 'fallback' : reduced.matches ? 'reduced-motion' : userPaused() ? 'paused' : shouldRun() ? 'running' : 'suspended';
    if (shouldRun()) raf = requestAnimationFrame(tick);
    else if (!contextLost) draw();
  }
  try { initialize(); resize(); } catch (error) {
    console.warn('Prism uses its static fallback:', error.message);
    stage.dataset.state = 'fallback';
    return;
  }
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(canvas.parentElement);
  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    sync();
  }, { rootMargin: '80px' });
  visibilityObserver.observe(stage);
  document.addEventListener('site-motion-change', sync);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; sync(); });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); contextLost = true; stage.classList.remove('prism-ready'); sync();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try { contextLost = false; initialize(); resize(); sync(); }
    catch { contextLost = true; stage.classList.remove('prism-ready'); sync(); }
  });
  sync();
})();
