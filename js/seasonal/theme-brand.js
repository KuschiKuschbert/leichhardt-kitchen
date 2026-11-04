/* Seasonal art only. The Kitchenbook application and recipe illustrations are untouched. */
(function () {
  'use strict';
  const cache = new Map();
  // National flags retain their semantic colours; decorative art uses the primary brand palette.
  const semanticExceptionIds = Object.freeze(['ph-independence-day']);
  const semanticAccentIds = Object.freeze(['fun-st-patricks-day']);
  const tokens = Object.freeze({
    ink: '#1C1D1F', paper: '#FFFEFA', accent: '#E2602A', 'accent-ink': '#C2451A',
    beige: '#F2EFE8', edge: '#D9D4C8', steel: '#CFD3D8', 'steel-dark': '#A9AFB6', stone: '#A39A88'
  });
  const rgb = hex => hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));
  const swatches = Object.entries(tokens).map(([name, hex]) => ({ name, rgb: rgb(hex.slice(1)) }));
  function paint(value, kind, preserveSemanticPaint = false) {
    if (!value || value === 'none' || value === 'transparent' || value.startsWith('url(') || value.startsWith('var(')) return value;
    if (value === 'currentColor') return kind === 'stroke' ? 'var(--kb-festive-outline)' : 'currentColor';
    const match = /^#([\da-f]{3,8})$/i.exec(value.trim());
    if (!match) return value;
    if (preserveSemanticPaint) return value;
    let hex = match[1];
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(char => char + char).join('');
    if (hex.length !== 6 && hex.length !== 8) return value;
    const channels = rgb(hex.slice(0, 6)), alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
    let best = swatches[0], distance = Infinity;
    for (const swatch of swatches) {
      const next = channels.reduce((sum, channel, index) => sum + (channel - swatch.rgb[index]) ** 2 * [0.3, 0.59, 0.11][index], 0);
      if (next < distance) { best = swatch; distance = next; }
    }
    // Warm festive accents borrow Kitchenbook orange; cooler botanical/metal tones stay neutral.
    const [red, green, blue] = channels, chroma = Math.max(...channels) - Math.min(...channels);
    if (chroma > 35 && red > green * 1.12 && red > blue * 1.12) {
      best = swatches.find(swatch => swatch.name === (red < 150 ? 'accent-ink' : 'accent'));
    }
    const name = kind === 'stroke' && best.name === 'ink' ? 'outline' : best.name;
    const token = 'var(--kb-festive-' + name + ')';
    return alpha < 1 ? 'color-mix(in srgb, ' + token + ' ' + Math.round(alpha * 100) + '%, transparent)' : token;
  }
  function style(markup, options = {}) {
    if (!markup || typeof markup !== 'string') return '';
    const themeId = typeof options === 'string' ? options : options.themeId;
    const preserveSemanticPaint = semanticExceptionIds.includes(themeId);
    const key = (preserveSemanticPaint ? themeId : 'primary') + '|' + markup;
    if (cache.has(key)) return cache.get(key);
    const template = document.createElement('template'); template.innerHTML = markup.trim();
    const svg = template.content.querySelector('svg');
    if (!svg) return markup;
    svg.classList.add('kb-brand-art'); svg.dataset.kbBrand = 'kitchenbook';
    if (preserveSemanticPaint) svg.dataset.kbSemanticPaint = 'national-flag';
    const clover = svg.querySelector('.kb-clover-leaf');
    if (clover) {
      // The requested green is a deliberate complementary accent, not a new generic paint swatch.
      // Keeping it separate from nearest-colour matching leaves every other festival unchanged.
      svg.dataset.kbSemanticAccent = 'clover-green';
      svg.querySelector('.kb-four-leaf-clover > path:first-child')?.classList.add('kb-clover-stem');
    }
    const view = (svg.getAttribute('viewBox') || '0 0 64 64').split(/[ ,]+/).map(Number), width = view[2] || 64;
    svg.setAttribute('stroke', 'var(--kb-festive-outline)');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('stroke-width', width > 100 ? '2.4' : width >= 60 ? '2.8' : '1.5');
    for (const node of [svg, ...svg.querySelectorAll('*')]) {
      for (const kind of ['fill', 'stroke', 'color']) {
        const value = node.getAttribute(kind);
        if (value) node.setAttribute(kind, paint(value, kind, preserveSemanticPaint));
        if (node.style && node.style[kind]) node.style[kind] = paint(node.style[kind], kind, preserveSemanticPaint);
      }
      if (node !== svg && node.hasAttribute('stroke-width')) {
        const weight = Number(node.getAttribute('stroke-width'));
        if (Number.isFinite(weight)) node.setAttribute('stroke-width', Math.min(width > 100 ? 3.2 : 4, Math.max(.8, weight)));
      }
      if (node.hasAttribute('stroke')) { node.setAttribute('stroke-linecap', 'round'); node.setAttribute('stroke-linejoin', 'round'); }
      if (node.tagName.toLowerCase() === 'rect' && node.hasAttribute('rx')) {
        const radius = Number(node.getAttribute('rx'));
        if (Number.isFinite(radius)) node.setAttribute('rx', Math.min(radius, width / 8));
      }
    }
    if (clover) {
      svg.querySelectorAll('.kb-clover-leaf').forEach(leaf => leaf.setAttribute('fill', 'var(--kb-festive-clover)'));
      svg.querySelectorAll('.kb-clover-stem').forEach(stem => stem.setAttribute('stroke', 'var(--kb-festive-clover)'));
      svg.querySelectorAll('.kb-four-leaf-clover > circle').forEach(join => join.setAttribute('fill', 'var(--kb-festive-clover)'));
    }
    const result = svg.outerHTML;
    if (cache.size >= 1024) cache.clear();
    cache.set(key, result);
    return result;
  }
  window.KB_THEME_BRAND = Object.freeze({ style, paint, tokens, semanticExceptionIds, semanticAccentIds, cacheSize: () => cache.size });
})();
