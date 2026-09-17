/* GlassSurface adapted from React Bits, Copyright (c) 2026 David Haz.
 * https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/GlassSurface/GlassSurface.jsx
 * MIT + Commons Clause; see THIRD_PARTY_NOTICES.md.
 * Filter is on the surface's ::before layer; labels remain unfiltered.
 */
(() => {
  'use strict';
  const controls = [...document.querySelectorAll('.glass-control')];
  const settings = Object.freeze({ displace: .5, distortionScale: -180,
    redOffset: 0, greenOffset: 10, blueOffset: 20,
    brightness: 50, opacity: .93, mixBlendMode: 'screen',
    borderWidth: .07, blur: 11 });
  const ua = navigator.userAgent;
  const nonChromium = /Firefox\//.test(ua) || (/Safari\//.test(ua) && !/(Chrome|Chromium|Edg)\//.test(ua));
  // The upstream component uses frosted glass in WebKit and Firefox.
  if (nonChromium || !window.CSS || !CSS.supports('backdrop-filter', 'url("#glass-test")') || !('ResizeObserver' in window)) {
    controls.forEach((control) => { control.dataset.glass = 'frosted'; });
    return;
  }
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('class', 'glass-filter-defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const defs = document.createElementNS(namespace, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  const create = (tag, attrs, parent) => {
    const node = document.createElementNS(namespace, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    parent.appendChild(node);
    return node;
  };
  const records = new Map();
  controls.forEach((control, index) => {
    const id = 'glass-surface-' + index;
    const filter = create('filter', {id, x:'0%', y:'0%', width:'100%', height:'100%', 'color-interpolation-filters':'sRGB'}, defs);
    const map = create('feImage', {x:0, y:0, width:'100%', height:'100%', preserveAspectRatio:'none', result:'map'}, filter);
    const channels = [
      {name:'red', offset:settings.redOffset, matrix:'1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'},
      {name:'green', offset:settings.greenOffset, matrix:'0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'},
      {name:'blue', offset:settings.blueOffset, matrix:'0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'}
    ];
    const displacements = [];
    channels.forEach(({name, offset, matrix}) => {
      displacements.push(create('feDisplacementMap', {in:'SourceGraphic', in2:'map', scale:settings.distortionScale + offset, xChannelSelector:'R', yChannelSelector:'G', result:'disp-' + name}, filter));
      create('feColorMatrix', {in:'disp-' + name, type:'matrix', values:matrix, result:name}, filter);
    });
    create('feBlend', {in:'red', in2:'green', mode:'screen', result:'rg'}, filter);
    create('feBlend', {in:'rg', in2:'blue', mode:'screen', result:'output'}, filter);
    create('feGaussianBlur', {in:'output', stdDeviation:settings.displace}, filter);
    records.set(control, {id, map, displacements, key:''});
  });
  function update(control) {
    const record = records.get(control);
    const rect = control.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return; // Hidden navigation/copy controls initialize when shown.
    const width = Math.round(rect.width * 100) / 100;
    const height = Math.round(rect.height * 100) / 100;
    const radius = Math.min(parseFloat(getComputedStyle(control).borderTopLeftRadius) || 50, width / 2, height / 2);
    const key = [width, height, radius].join('/');
    if (key === record.key) return;
    record.key = key;
    // The sample uses a 200px panel; fit its -180 displacement to compact buttons.
    const strength = Math.min(1, height / 160);
    [settings.redOffset, settings.greenOffset, settings.blueOffset].forEach((offset, i) => {
      record.displacements[i].setAttribute('scale', (settings.distortionScale + offset) * strength);
    });
    const edge = Math.min(width, height) * settings.borderWidth * .5;
    const mapSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>
        <linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="black"/>
      <rect width="${width}" height="${height}" rx="${radius}" fill="url(#r)"/>
      <rect width="${width}" height="${height}" rx="${radius}" fill="url(#b)" style="mix-blend-mode:${settings.mixBlendMode}"/>
      <rect x="${edge}" y="${edge}" width="${width-edge*2}" height="${height-edge*2}" rx="${radius}" fill="hsl(0 0% ${settings.brightness}% / ${settings.opacity})" style="filter:blur(${settings.blur}px)"/>
    </svg>`;
    record.map.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(mapSVG));
    control.style.setProperty('--glass-filter', 'url("#' + record.id + '")');
    control.classList.add('glass-svg');
    control.dataset.glass = 'refraction';
  }
  // Batch only size changes; no animation loop or pointer listeners are required.
  const pending = new Set();
  let raf = 0;
  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => pending.add(entry.target));
    if (raf) return;
    raf = requestAnimationFrame(() => {
      pending.forEach(update);
      pending.clear();
      raf = 0;
    });
  });
  controls.forEach((control) => { update(control); observer.observe(control); });
})();
