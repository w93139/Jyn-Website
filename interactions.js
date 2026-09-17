/* Native LineSidebar, BorderGlow and ProfileCard adapters.
 * Copyright (c) 2026 David Haz; React Bits, see THIRD_PARTY_NOTICES.md.
 * Adaptations add semantic navigation, scroll tracking, and bounded animation loops.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const canAnimate = () => !document.hidden && !reduced.matches && pointer.matches;
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const sidebar = document.querySelector('.line-sidebar');
  const rows = [...sidebar.querySelectorAll('li')];
  const chapters = rows.map(row => document.querySelector(row.querySelector('a').getAttribute('href')));
  const navLinks = [...document.querySelectorAll('.line-sidebar a, #primary-nav a')];
  let active = -1, frame = 0, lastTime = 0;
  const current = rows.map(() => 0);
  const proximity = rows.map(() => 0);
  const target = rows.map(() => 0);
  function tick(time) {
    frame = 0;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60;
    lastTime = time;
    const smoothing = 1 - Math.exp(-delta / .1);
    let unsettled = false;
    rows.forEach((row, index) => {
      current[index] += (target[index] - current[index]) * smoothing;
      if (Math.abs(target[index] - current[index]) < .0015) current[index] = target[index];
      else unsettled = true;
      row.style.setProperty('--effect', current[index].toFixed(4));
    });
    if (unsettled) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }
  function updateTargets() {
    rows.forEach((row, i) => {
      target[i] = Math.max(proximity[i], i === active ? 1 : 0);
      if (!canAnimate()) {
        current[i] = target[i];
        row.style.setProperty('--effect', current[i]);
      }
    });
    if (canAnimate() && !frame) frame = requestAnimationFrame(tick);
  }
  function trackChapter() {
    const threshold = Math.min(innerHeight * .3, 240);
    let next = 0;
    chapters.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= threshold) next = i;
    });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) next = chapters.length - 1;
    if (active === next) return;
    active = next;
    const href = '#' + chapters[active].id;
    navLinks.forEach(link => {
      if (link.getAttribute('href') === href) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    updateTargets();
  }
  let scrollFrame = 0;
  const scheduleTrack = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; trackChapter(); });
  };
  addEventListener('scroll', scheduleTrack, { passive: true });
  addEventListener('resize', scheduleTrack, { passive: true });
  addEventListener('hashchange', scheduleTrack);
  document.addEventListener('toggle', scheduleTrack, true);
  sidebar.addEventListener('pointermove', event => {
    if (!canAnimate()) return;
    rows.forEach((row, i) => {
      const rect = row.getBoundingClientRect();
      const p = clamp(1 - Math.abs(event.clientY - rect.top - rect.height / 2) / 100);
      proximity[i] = p * p * (3 - 2 * p);
    });
    updateTargets();
  });
  sidebar.addEventListener('pointerleave', () => { proximity.fill(0); updateTargets(); });
  trackChapter();

  const controls = [...document.querySelectorAll('.glass-control')];
  controls.forEach(control => {
    const edge = document.createElement('span');
    edge.className = 'button-edge';
    edge.setAttribute('aria-hidden', 'true');
    control.appendChild(edge);
    control.addEventListener('pointermove', event => {
      if (!canAnimate()) return;
      const bounds = control.getBoundingClientRect();
      const dx = event.clientX - bounds.left - bounds.width / 2;
      const dy = event.clientY - bounds.top - bounds.height / 2;
      const proximity = clamp(Math.max(Math.abs(dx) / (bounds.width / 2), Math.abs(dy) / (bounds.height / 2)));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      edge.style.setProperty('--cursor-angle', angle + 'deg');
      edge.style.setProperty('--edge-opacity', clamp((proximity - .3) / .7).toFixed(3));
    });
    control.addEventListener('pointerleave', () => edge.style.setProperty('--edge-opacity', 0));
  });

  const shell = document.querySelector('.profile-shell');
  let tiltFrame = 0, tiltTime = 0;
  const tilt = { x: 50, y: 50, tx: 50, ty: 50 };
  function drawTilt() {
    shell.style.setProperty('--pointer-x', tilt.x.toFixed(3) + '%');
    shell.style.setProperty('--pointer-y', tilt.y.toFixed(3) + '%');
    shell.style.setProperty('--rotate-x', (-(tilt.x - 50) / 5).toFixed(3) + 'deg');
    shell.style.setProperty('--rotate-y', ((tilt.y - 50) / 6).toFixed(3) + 'deg');
  }
  function tickTilt(time) {
    tiltFrame = 0;
    const dt = tiltTime ? Math.min((time - tiltTime) / 1000, .05) : 1 / 60;
    tiltTime = time;
    const ease = 1 - Math.exp(-dt / .12);
    tilt.x += (tilt.tx - tilt.x) * ease;
    tilt.y += (tilt.ty - tilt.y) * ease;
    const settled = Math.abs(tilt.x - tilt.tx) < .02 && Math.abs(tilt.y - tilt.ty) < .02;
    if (settled) { tilt.x = tilt.tx; tilt.y = tilt.ty; tiltTime = 0; }
    drawTilt();
    if (!settled) tiltFrame = requestAnimationFrame(tickTilt);
  }
  function startTilt() { if (!tiltFrame) tiltFrame = requestAnimationFrame(tickTilt); }
  shell.addEventListener('pointermove', event => {
    if (!canAnimate() || event.pointerType === 'touch') return;
    const bounds = shell.getBoundingClientRect();
    tilt.tx = clamp((event.clientX - bounds.left) / bounds.width) * 100;
    tilt.ty = clamp((event.clientY - bounds.top) / bounds.height) * 100;
    shell.classList.add('is-active');
    startTilt();
  });
  shell.addEventListener('pointerleave', () => {
    shell.classList.remove('is-active');
    tilt.tx = tilt.ty = 50;
    if (canAnimate()) startTilt();
  });
  function resetMotion() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    proximity.fill(0); updateTargets();
    cancelAnimationFrame(tiltFrame); tiltFrame = 0; tiltTime = 0;
    tilt.x = tilt.y = tilt.tx = tilt.ty = 50;
    shell.classList.remove('is-active'); drawTilt();
    controls.forEach(control => control.querySelector('.button-edge').style.setProperty('--edge-opacity', 0));
  }
  reduced.addEventListener('change', resetMotion);
  pointer.addEventListener('change', resetMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetMotion(); });
})();
