/* GradientWaves shader adapted from React Bits, Copyright (c) 2026 David Haz.
 * https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/GradientWaves/GradientWaves.jsx
 * MIT + Commons Clause; see THIRD_PARTY_NOTICES.md.
 * Native WebGL2 adapter: animated waves in a fixed viewport, without scroll parallax.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('#waves-canvas');
  const surface = document.querySelector('.site-background');
  if (!canvas || !surface) return;
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true,
    antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  if (!gl) { surface.dataset.state = 'fallback'; return; }
  const vertexSource = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
  const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uTilt;
uniform float uZoom;
uniform float uHeight;
uniform float uFogDepth;
uniform float uSteps;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform float uParallax;
uniform bool uEnableMouse;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;
out vec4 fragColor;

const float MAX_DIST = 20000.0;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
  float my = r.y - tc.z;
  my += uTurbulence * cos(r.x / 23.0 + tc.w);
  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
}

float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float dscene = plasma(pos + dist * dir, freq, tc);
    if (abs(dscene) < 0.1) break;
    dist += 0.9 * dscene;
    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
  }
  return dist;
}

void main() {
  float T = iTime * uSpeed;
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
  float c, s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, 30.0);
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot); s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  c = nuv.x; s = nuv.y;
  dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt); s = sin(uTilt);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

  if (uEnableMouse) {
    float yaw = (uMouse.x - 0.5) * uParallax * 0.4;
    float pitch = (uMouse.y - 0.5) * uParallax * 0.4;
    c = cos(yaw); s = sin(yaw);
    dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
    c = cos(pitch); s = sin(pitch);
    dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  }

  float dist = raymarch(cam, dir, freq, tc);
  vec3 pos = cam + dist * dir;

  float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
  vec3 col = mix(uHorizonColor, body, t);
  col *= uBrightness;
  col = clamp(col, 0.0, 1.0);

  float alpha = clamp(t, 0.0, 1.0) * uOpacity;
  if (uGrain > 0.5) {
    float g = hash21(gl_FragCoord.xy + mod(iTime, 64.0) * 11.0);
    alpha += (g - 0.5) * uGrainIntensity;
  }
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}
`;
  let program = null, buffer = null, sizeKey = '', resizeFrame = 0, renders = 0;
  let resolution, timeUniform;
  let frame = 0, previous = 0, lastPaint = 0, elapsed = 0, pageActive = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const paused = () => document.body.dataset.motionPaused === 'true';
  const shouldRun = () => program && !gl.isContextLost() && !document.hidden && pageActive && !paused() && !reduced.matches;
  const fallback = () => {
    surface.classList.remove('waves-ready');
    surface.dataset.state = 'fallback';
  };
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('GradientWaves shader compilation failed');
    }
    return shader;
  }
  function initialize() {
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    let fragment;
    try { fragment = compile(gl.FRAGMENT_SHADER, fragmentSource); }
    catch (error) { gl.deleteShader(vertex); throw error; }
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program); program = null;
      throw new Error('GradientWaves program linking failed');
    }
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    resolution = gl.getUniformLocation(program, 'iResolution');
    timeUniform = gl.getUniformLocation(program, 'iTime');
    const settings = { iTime: 0, uSpeed: .4, uAmplitude: 2.5, uWaveScale: .6,
      uWaveRatio: .9, uSwell: 35, uTurbulence: 20, uTilt: 1.11, uZoom: 1,
      uHeight: 5.5, uFogDepth: 15, uSteps: 70, uBrightness: 1, uOpacity: 1,
      uGrain: 1, uGrainIntensity: .05, uParallax: 0 };
    for (const [name, value] of Object.entries(settings)) {
      gl.uniform1f(gl.getUniformLocation(program, name), value);
    }
    // Pointer feedback is provided by the sparkle trail; the waves keep a stable camera.
    gl.uniform1i(gl.getUniformLocation(program, 'uEnableMouse'), 0);
    gl.uniform2f(gl.getUniformLocation(program, 'uMouse'), .5, .5);
    for (const [name, rgb] of Object.entries({
      uHorizonColor: [82/255,39/255,1], uWaveColor: [1,159/255,252/255], uCrestColor: [1,1,1]
    })) gl.uniform3f(gl.getUniformLocation(program, name), ...rgb);
    gl.clearColor(0, 0, 0, 0);
  }
  function draw() {
    if (!program || gl.isContextLost()) return;
    gl.uniform1f(timeUniform, elapsed);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.renders = String(++renders);
    canvas.dataset.time = elapsed.toFixed(3);
    surface.classList.add('waves-ready');
  }
  function resize() {
    resizeFrame = 0;
    if (!program || gl.isContextLost()) return;
    const bounds = surface.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    // Bound raymarching cost; CSS scales the soft background to the viewport.
    const budget = bounds.width <= 760 ? 420000 : 600000;
    const ratio = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(budget / (bounds.width * bounds.height)));
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    const nextKey = width + '/' + height;
    if (nextKey === sizeKey) return;
    canvas.width = width; canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolution, width, height);
    sizeKey = nextKey;
    draw();
  }
  function tick(now) {
    frame = 0;
    if (!shouldRun()) { previous = 0; return; }
    if (previous) elapsed += Math.min((now - previous) / 1000, .1);
    previous = now;
    if (now - lastPaint >= 1000 / 30 - .5) { draw(); lastPaint = now; }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    if (!program || gl.isContextLost()) { fallback(); return; }
    surface.dataset.state = reduced.matches ? 'reduced-motion' : paused() ? 'paused' : shouldRun() ? 'running' : 'suspended';
    if (shouldRun()) frame = requestAnimationFrame(tick);
    else if (!document.hidden && pageActive) draw();
  }
  function scheduleSize() {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(resize);
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    cancelAnimationFrame(resizeFrame); resizeFrame = 0;
    program = buffer = null; sizeKey = '';
    fallback();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try { initialize(); resize(); sync(); } catch { fallback(); }
  });
  try { initialize(); resize(); } catch { fallback(); return; }
  if ('ResizeObserver' in window) new ResizeObserver(scheduleSize).observe(surface);
  else addEventListener('resize', scheduleSize, { passive: true });
  reduced.addEventListener('change', sync);
  document.addEventListener('site-motion-change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => { pageActive = false; sync(); });
  addEventListener('pageshow', () => { pageActive = true; sync(); });
  sync();
})();
