// Draws the library on tests/contact.html: every item at its real size, grouped by category and subcategory.
(function () {
  var L = window.LK_LIB, q = new URLSearchParams(location.search), out = document.getElementById('out');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load(i) {
    if (i >= L.files.length) return draw();
    var s = document.createElement('script');
    s.src = '../' + L.files[i];
    s.onload = s.onerror = function () { load(i + 1); };
    document.head.appendChild(s);
  }
  // one piece, framed so a 30 cm plate's worth of space (200 units) never shrinks a small piece to nothing
  function cell(it) {
    var b = L.body(it.id), w = Math.max(it.w || 60, 30), h = Math.max(it.h || 60, 30), m = 8, s = Math.max(w, h * 138 / 110);
    // side and build pieces stand on y = 0 and grow upwards; the others are drawn around 0,0
    var cy = it.cat === 'build' ? -(it.h || 60) / 2 : 0;
    var vb = (-s / 2 - m) + ' ' + (cy - s * 110 / 138 / 2 - m) + ' ' + (s + 2 * m) + ' ' + (s * 110 / 138 + 2 * m);
    return '<div class="cell"><svg viewBox="' + vb + '">' + b + '</svg><b>' + esc(it.name) + (it.of ? ' <i>(variant)</i>' : '') + '</b><i>' + esc(it.id) + ' · ' + esc(it.form || '') + ' · ' + esc(it.role || '') + (it.g ? ' · ' + it.g + ' g' : it.n ? ' · ' + it.n + ' pcs' : '') + '</i>' + (b ? '' : '<div class="err">did not draw</div>') + '</div>';
  }
  function draw() {
    var html = '', cat = q.get('cat'), qs = q.get('q');
    if (q.get('ware')) {
      document.getElementById('h').textContent = 'Servingware';
      L.WARE.forEach(function (f) {
        html += '<h2>' + esc(f.name) + '</h2><div class="grid ware">' + f.list.map(function (x) {
          var s = L.surface(x.p), m = 12, vb = (-s.w / 2 - m) + ' ' + (-s.h / 2 - m) + ' ' + (s.w + 2 * m + 6) + ' ' + (s.h + 2 * m + 8);
          return '<div class="cell"><svg viewBox="' + vb + '">' + s.body + '</svg><b>' + esc(x.name) + '</b></div>';
        }).join('') + '</div>';
      });
    } else {
      var items = qs ? L.search(qs) : L.items.filter(function (it) { return !cat || it.cat === cat; });
      document.getElementById('h').textContent = (qs ? 'Search: ' + qs : cat ? (L.cats.filter(function (c) { return c.id === cat; })[0] || {}).name : 'Library') + ' (' + items.length + ' items, ' + items.filter(function (it) { return !it.of; }).length + ' distinct)';
      var groups = {};
      items.forEach(function (it) { var k = qs ? 'Results' : (it.cat + ': ' + (it.sub || '')); (groups[k] = groups[k] || []).push(it); });
      Object.keys(groups).forEach(function (k) { html += '<h2>' + esc(k) + ' (' + groups[k].length + ')</h2><div class="grid">' + groups[k].map(cell).join('') + '</div>'; });
    }
    out.innerHTML = html;
    document.body.setAttribute('data-ready', '1');
  }
  load(0);
})();
