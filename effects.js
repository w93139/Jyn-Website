/* MouseSparkles, adapted from the user-supplied React component for this static site.
 * Keeps the supplied colors, sizes and three falling-star animations without a React runtime.
 */
(() => {
  'use strict';
  const button = document.querySelector('.motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const layer = document.createElement('div');
  layer.className = 'mouse-sparkles';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const settings = Object.freeze({ starDuration: 1500, minimumTime: 250, minimumDistance: 75,
    glowDuration: 75, glowSpacing: 10, maxStars: 24, maxGlows: 72,
    colors: ['249 146 253', '252 254 255'], sizes: ['1.4rem', '1rem', '.6rem'] });
  const particles = new Map();
  let paused = false, pageActive = true, frame = 0, latest = null, last = null;
  let lastStar = null, lastStarTime = -Infinity, sequence = 0, stars = 0, glows = 0;
  const enabled = () => !paused && !reduced.matches && pointer.matches && !document.hidden && pageActive;
  const random = items => items[Math.floor(Math.random() * items.length)];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function removeParticle(node) {
    const particle = particles.get(node);
    if (!particle) return;
    clearTimeout(particle.timer);
    if (particle.star) stars--; else glows--;
    particles.delete(node);
    node.remove();
  }
  function addParticle(node, duration, star) {
    if (star) stars++; else glows++;
    layer.appendChild(node);
    particles.set(node, { star, timer: setTimeout(() => removeParticle(node), duration + 30) });
    node.addEventListener('animationend', () => removeParticle(node), { once: true });
  }
  function createStar(position) {
    if (stars >= settings.maxStars) return;
    const star = document.createElement('span');
    star.className = 'mouse-sparkles-star';
    star.style.left = position.x + 'px';
    star.style.top = position.y + 'px';
    star.style.fontSize = random(settings.sizes);
    star.style.color = `rgb(${random(settings.colors)})`;
    star.style.animationName = 'mouse-fall-' + (sequence++ % 3 + 1);
    star.style.animationDuration = settings.starDuration + 'ms';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 2 Q13.5 10.5 22 12 Q13.5 13.5 12 22 Q10.5 13.5 2 12 Q10.5 10.5 12 2Z');
    svg.appendChild(path);
    star.appendChild(svg);
    addParticle(star, settings.starDuration, true);
  }
  function createGlow(position) {
    if (glows >= settings.maxGlows) return;
    const glow = document.createElement('span');
    glow.className = 'mouse-sparkles-glow-point';
    glow.style.left = position.x + 'px';
    glow.style.top = position.y + 'px';
    glow.style.animationDuration = settings.glowDuration + 'ms';
    addParticle(glow, settings.glowDuration, false);
  }
  function paint(now) {
    frame = 0;
    if (!enabled() || !latest) return;
    const current = latest;
    latest = null;
    if (!last) last = current;
    const sinceStar = now - lastStarTime;
    // Retain the sample's distance-or-time rule, with a floor for fast pointer sweeps.
    if (sinceStar >= 45 && (!lastStar || distance(lastStar, current) >= settings.minimumDistance || sinceStar >= settings.minimumTime)) {
      createStar(current);
      lastStar = current;
      lastStarTime = now;
    }
    const quantity = Math.min(12, Math.max(1, Math.ceil(distance(last, current) / settings.glowSpacing)));
    for (let i = 1; i <= quantity; i++) {
      const amount = i / quantity;
      createGlow({ x: last.x + (current.x - last.x) * amount, y: last.y + (current.y - last.y) * amount });
    }
    last = current;
  }
  function resetPointer() {
    cancelAnimationFrame(frame); frame = 0;
    latest = last = lastStar = null;
    lastStarTime = -Infinity;
  }
  function clear() {
    resetPointer();
    for (const node of particles.keys()) removeParticle(node);
  }
  function sync() {
    document.body.dataset.motionPaused = String(paused);
    if (button) {
      button.hidden = reduced.matches;
      button.querySelector('.motion-text').textContent = paused ? '播放动画' : '暂停动画';
      button.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
      button.title = '控制波浪背景、棱镜和鼠标星光';
    }
    layer.dataset.state = enabled() ? 'ready' : 'disabled';
    if (!enabled()) clear();
    document.dispatchEvent(new CustomEvent('site-motion-change'));
  }
  window.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType !== 'mouse') return;
    latest = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetPointer);
  window.addEventListener('pointercancel', resetPointer);
  window.addEventListener('blur', clear);
  button?.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', sync);
  pointer.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; sync(); });
  sync();
})();
