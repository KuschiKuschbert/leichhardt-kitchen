/* Ink in motion. Shared presentation only: callers own the real loading, save and connection states. */
(function () {
  'use strict';
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function path(d) { return '<path d="' + d + '"/>'; }
  // The same outlines as the book's navigation. Only these detail strokes receive orange ink.
  var icons = {
    prep: [64, 3, '<rect x="12" y="10" width="40" height="48" rx="5"/>' + path('M24 10V7h16v3') + path('M20 24l3 3 5-6M20 38l3 3 5-6'), path('M34 25h12M34 39h12')],
    orders: [64, 3, path('M8 20l24-12 24 12v26L32 58 8 46z'), path('M8 20l24 12 24-12M32 32v26') + path('M20 14l24 12')],
    recipes: [64, 3, '<circle cx="32" cy="32" r="22"/>' + path('M6 14v14M10 14v14M14 14v14M6 28h8M10 28v22') + path('M58 14c-3 2-5 6-5 11v3h5v22'), '<circle cx="32" cy="32" r="13" stroke-dasharray="4 5"/>'],
    waste: [64, 3, path('M10 18h44') + path('M25 18v-6h14v6') + path('M15 18l3 38h28l3-38'), path('M27 28v18M37 28v18')],
    transfers: [64, 3, '', path('M10 22h40') + path('M42 14l8 8-8 8') + path('M54 42H14') + path('M22 34l-8 8 8 8')],
    guides: [64, 3, path('M32 16c-6-4-14-6-24-6v38c10 0 18 2 24 6 6-4 14-6 24-6V10c-10 0-18 2-24 6z') + path('M32 16v38'), path('M14 21c4 0 8 1 12 3M14 31c4 0 8 1 12 3M38 24c4-2 8-3 12-3M38 34c4-2 8-3 12-3')],
    chef: [24, 1.9, path('M7 14.2A3.6 3.6 0 1 1 8.6 7.4a4.6 4.6 0 0 1 6.8 0A3.6 3.6 0 1 1 17 14.2V20H7Z'), path('M7 16.8h10')],
    // A document is still being written. The success check is used only when the caller confirms it.
    save: [24, 1.9, path('M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z'), path('M9.5 11h5M9.5 14.5h5M9.5 18h3')]
  };
  function stateOf(state) { return state === 'still' || state === 'done' ? state : 'busy'; }
  function icon(name, state) {
    state = stateOf(state);
    if (state === 'done') return '<span class="ink-icon" data-state="done" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><path class="ink-check" d="M3 8.5 L6.5 12 L13 4.5" pathLength="100"/></svg></span>';
    name = Object.prototype.hasOwnProperty.call(icons, name) ? name : 'save';
    var i = icons[name], detail = i[3].replace(/<(path|circle) /g, '<$1 pathLength="100" ');
    return '<span class="ink-icon" data-state="' + state + '" data-icon="' + name + '" aria-hidden="true">' +
      '<svg viewBox="0 0 ' + i[0] + ' ' + i[0] + '" fill="none" stroke="currentColor" stroke-width="' + i[1] + '" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">' +
      '<g>' + i[2] + i[3] + '</g>' + (state === 'busy' ? '<g class="ink-stroke">' + detail + '</g>' : '') + '</svg></span>';
  }
  function label(text, name, state) {
    return '<span class="ink-label">' + icon(name || 'save', state) + '<span class="ink-label-text">' + esc(text) + '</span></span>';
  }
  function skeleton(rows) {
    rows = typeof rows === 'number' && isFinite(rows) ? Math.max(0, Math.min(8, Math.floor(rows))) : 0;
    if (!rows) return '';
    var out = '<div class="ink-skeleton" aria-hidden="true">';
    for (var n = 0; n < rows; n++) {
      out += '<div class="ink-skeleton-row"><span class="ink-skeleton-box"></span><svg class="ink-skeleton-line ink-line-' + (n % 5) + '" viewBox="0 0 220 24" preserveAspectRatio="none" focusable="false" aria-hidden="true"><path d="M4 ' + (n % 2 ? 14 : 12) + ' Q30 7 60 12 T115 11 T170 12 T216 10"/></svg></div>';
    }
    return out + '</div>';
  }
  function status(text, options) {
    var o = options || {}, state = stateOf(o.state);
    return '<div class="ink-status" data-state="' + state + '" role="status" aria-live="polite" aria-atomic="true">' +
      icon(o.icon || 'save', state) + '<span class="ink-copy"><span class="ink-message">' + esc(text) + '</span>' +
      (o.detail ? '<small class="ink-detail">' + esc(o.detail) + '</small>' : '') + '</span></div>' + skeleton(o.rows);
  }
  function progress(completed, total, text, options) {
    var known = typeof total === 'number' && isFinite(total) && total > 0 && typeof completed === 'number' && isFinite(completed);
    var value = known ? Math.min(total, Math.max(0, completed)) : 0;
    return '<div class="ink-progress">' + status(text, options) + (known ? '<progress max="' + total + '" value="' + value + '" aria-label="' + esc(text) + '"></progress>' : '') + '</div>';
  }
  window.LK_MOTION = { icon: icon, label: label, status: status, skeleton: skeleton, progress: progress };
}());
