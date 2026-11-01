(function () {
  'use strict';
  var shapes = {
    check: '<path d="m5 12 4 4L19 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    waste: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    book: '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16"/>',
    prep: '<path d="M8 4H5v17h14V4h-3M9 2h6v5H9zM8 11h8M8 15h6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    chevron: '<path d="m8 4 8 8-8 8"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
    team: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a6 6 0 0 1 3 5v1"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    leaf: '<path d="M20 3C7 2 2 8 5 15s15 4 15-12ZM4 21 15 10"/>'
  };
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function icon(name, size) { return '<svg aria-hidden="true" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + (shapes[name] || shapes.book) + '</svg>'; }
  window.Study = { esc: esc, icon: icon };
  function preservationNote() {
    if (!document.body || document.body.dataset.preview === 'prep-attribution' || document.querySelector('.preview-preservation')) return;
    var note = document.createElement('details');
    note.className = 'preview-preservation';
    note.innerHTML = '<summary>Add-on preview: your normal sheets stay</summary><div><p>These examples show the encouragement layer with a few sample rows. The full existing Prep and Wastage sheets stay available when a design is integrated.</p><p>Normal items, sections, quantities, adding, ticking and waste entry controls are preserved. Existing history, chef reviews and permissions keep their current access rules. Encouragement can be hidden and never blocks normal work.</p><p class="preview-live-label">These links open the real Kitchen Book in a new tab:</p><div class="row"><a class="btn" href="https://kuschikuschbert.github.io/leichhardt-kitchen/#/prep" target="_blank" rel="noopener">Current Prep (live)</a><a class="btn" href="https://kuschikuschbert.github.io/leichhardt-kitchen/#/waste" target="_blank" rel="noopener">Current Wastage (live)</a></div><p class="hint">Use the example controls below for simulated entries. The live links are your actual app.</p></div>';
    document.body.insertBefore(note, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preservationNote);
  else preservationNote();

})();
