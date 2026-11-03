/* The admin Dashboard (3 Nov 2026, head chef: The Pass board with three written headlines on top).
   Reads one record, analysis/dashboard, written by the nightly analysis job (scripts/dashboard.mjs), plus
   analysis/health: 2 reads when the page first opens, kept in this access context's memory until Refresh or a
   change of person. Nothing is saved on the device. Every number links to the report it came from.
   Waste is counted in lines and amounts, never prices. Delivery temperatures are not judged here. */
(function () {
  'use strict';
  var API = 1, api, context = '', state, charts = {};
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HEAT = 5;
  function reset() { context = ''; charts = {}; state = { period: 30, data: undefined, health: null, error: false, loading: false, req: 0 }; }
  reset();
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function valid() { return !!(api && api.allowed() && api.context() === context); }
  function bind(adapter) {
    if (adapter) api = adapter;
    if (!api || !api.allowed()) { reset(); return false; }
    if (context !== api.context()) { reset(); context = api.context(); }
    return true;
  }
  function redraw() { if (valid()) api.draw(); }

  /* ---------- reading the record: everything from Firestore is checked by type before use ---------- */
  function n(v) { return typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0; }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max || 80) : ''; }
  function counts(o) { var out = {}; if (o && typeof o === 'object') Object.keys(o).slice(0, 60).forEach(function (k) { if (n(o[k])) out[str(k)] = n(o[k]); }); return out; }
  function mins(o) {
    var out = {};
    if (o && typeof o === 'object') Object.keys(o).slice(0, 60).forEach(function (k) { if (Array.isArray(o[k])) out[str(k)] = o[k].filter(function (m) { return n(m) > 0; }).slice(0, 2000); });
    return out;
  }
  function clean(d) {
    if (!d || !Array.isArray(d.days)) return null;
    var days = d.days.filter(function (r) { return r && /^\d{4}-\d{2}-\d{2}$/.test(r.day); }).map(function (r) {
      var p = r.p || {}, w = r.w || {}, x = r.x || {};
      return { day: r.day, p: { n: n(p.n), w: n(p.w), t: n(p.t), r: n(p.r), sec: counts(p.sec), mins: mins(p.mins) },
        w: { n: n(w.n), reason: counts(w.reason), sec: counts(w.sec), items: (Array.isArray(w.items) ? w.items : []).slice(0, 400).filter(function (i) { return i && str(i.t); }).map(function (i) { return { t: str(i.t), u: str(i.u, 40), a: n(i.a), n: n(i.n) }; }) },
        x: { out: n(x.out), in: n(x.in) } };
    }).sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
    return { at: n(d.at), from: str(d.from, 10), to: str(d.to, 10), days: days };
  }
  function load(force) {
    // A failed read waits for Refresh: never an automatic retry loop.
    if (!valid() || state.loading || (!force && (state.data !== undefined || state.error))) return;
    var req = ++state.req;
    state.loading = true; state.error = false;
    // On open, then only on Refresh: one read of each record, never a timer.
    Promise.all([api.get('analysis/dashboard'), api.get('analysis/health').catch(function () { return null; })]).then(function (res) {
      if (!valid() || req !== state.req) return;
      state.loading = false; state.data = clean(res[0]); state.health = res[1] && typeof res[1] === 'object' ? res[1] : null;
      redraw();
    }, function () {
      if (!valid() || req !== state.req) return;
      // A failed read is shown as failed, never as zero, and nothing is kept.
      state.loading = false; state.error = true; state.data = undefined;
      redraw();
    });
  }

  /* ---------- sums over a period ---------- */
  function rowsOf(len, back) { var d = state.data.days, end = d.length - (back || 0); return end - len < 0 ? null : d.slice(end - len, end); }
  function sum(rows, f) { return rows.reduce(function (s, r) { return s + f(r); }, 0); }
  function pct(rows) { var all = sum(rows, function (r) { return r.p.n; }); return all ? Math.round(100 * sum(rows, function (r) { return r.p.t; }) / all) : null; }
  function median(list) { if (!list.length) return null; var v = list.slice().sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; }
  function allMins(rows, sec) { var out = []; rows.forEach(function (r) { Object.keys(r.p.mins).forEach(function (k) { if (!sec || k === sec) out = out.concat(r.p.mins[k]); }); }); return out; }
  function dur(m) { if (m == null) return 'No ticks'; m = Math.round(m); var h = Math.floor(m / 60), r = m % 60; return h ? h + ' h' + (r ? ' ' + r + ' min' : '') : r + ' min'; }
  function tileDur(m) { if (m == null) return 'No ticks'; m = Math.round(m); var h = Math.floor(m / 60), r = m % 60; return (h ? h + '<small>h</small> ' : '') + (h && !r ? '' : r + '<small>m</small>'); }
  function dow(day) { return new Date(day + 'T12:00:00Z').getUTCDay(); }
  function dayLabel(day) { var d = new Date(day + 'T12:00:00Z'); return DAYS[d.getUTCDay()].slice(0, 3) + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function shortDay(day) { var d = new Date(day + 'T12:00:00Z'); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function weeks(rows) { var out = []; for (var i = rows.length % 7; i < rows.length; i += 7) out.push(rows.slice(i, i + 7)); return out; }
  function reasonName(k) { return k === 'none' ? 'No reason given' : api.reasonName ? api.reasonName(k) : k; }
  function top(o) { var k = Object.keys(o).sort(function (a, b) { return o[b] - o[a] || (a < b ? -1 : 1); })[0]; return k ? [k, o[k]] : null; }
  function addTo(o, from) { Object.keys(from).forEach(function (k) { o[k] = (o[k] || 0) + from[k]; }); return o; }

  /* ---------- small marks ---------- */
  function delta(now, before, goodUp, unit, fmt, label) {
    if (now == null || before == null) return '<span class="dsh-delta dsh-flat">' + esc(label || 'Nothing to compare yet') + '</span>';
    var diff = now - before, show = fmt ? fmt(Math.abs(diff)) : String(Math.abs(Math.round(diff)));
    if (Math.abs(diff) < 0.5) return '<span class="dsh-delta dsh-flat">Same as before</span>';
    var better = goodUp ? diff > 0 : diff < 0;
    return '<span class="dsh-delta ' + (better ? 'dsh-good' : 'dsh-bad') + '"><span aria-hidden="true">' + (diff > 0 ? '&#9650;' : '&#9660;') + '</span> ' +
      (diff > 0 ? 'Up ' : 'Down ') + esc(show + (unit || '')) + ', ' + (better ? 'better' : 'worse') + '</span>';
  }
  function spark(vals) {
    var v = vals.filter(function (x) { return x != null; });
    if (v.length < 2) return '<span class="dsh-spark" aria-hidden="true"></span>';
    var max = Math.max.apply(null, v), min = Math.min.apply(null, v); if (max === min) { max += 1; min -= 1; }
    var pts = [], last = null;
    vals.forEach(function (x, i) { if (x == null) return; var px = (i / (vals.length - 1)) * 100, py = 30 - ((x - min) / (max - min)) * 26 - 2; pts.push(px.toFixed(2) + ' ' + py.toFixed(2)); last = [px, py]; });
    var d = 'M' + pts.join(' L');
    return '<span class="dsh-spark" aria-hidden="true"><svg viewBox="0 0 100 30" preserveAspectRatio="none" focusable="false"><path class="dsh-spark-area" d="' + d + ' L' + last[0].toFixed(2) + ' 30 L' + pts[0].split(' ')[0] + ' 30 Z"/><path class="dsh-spark-line" d="' + d + '"/></svg><i style="left:' + last[0].toFixed(2) + '%;top:' + (last[1] / 30 * 100).toFixed(2) + '%"></i></span>';
  }
  function niceMax(v) { if (v <= 0) return 4; var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), m = [1, 2, 2.5, 5, 10]; for (var i = 0; i < m.length; i++) if (m[i] * p >= v) return m[i] * p; return 10 * p; }
  function num(x) { return Math.round(x * 10) / 10; }

  /* ---------- the three headlines (fixed rules, the same every night) ---------- */
  function headlines() {
    var out = [], d = state.data.days, last = d[d.length - 1];
    if (last && last.p.n >= 3) {
      var same = d.filter(function (r) { return dow(r.day) === dow(last.day) && r.p.n >= 3; }).slice(-8), p = Math.round(100 * last.p.t / last.p.n);
      var others = same.slice(0, -1).map(function (r) { return Math.round(100 * r.p.t / r.p.n); }), name = DAYS[dow(last.day)];
      var tone = 'flat', note = '';
      if (others.length >= 3) {
        if (p > Math.max.apply(null, others)) { tone = 'good'; note = 'The best ' + name + ' in ' + same.length + ' weeks.'; }
        else if (p < Math.min.apply(null, others)) { tone = 'bad'; note = 'The lowest ' + name + ' in ' + same.length + ' weeks.'; }
        else note = 'A usual ' + name + ': the middle of the last ' + same.length + ' was ' + median(others.concat([p])) + '%.';
      }
      out.push({ tone: tone, tag: tone === 'good' ? 'Better' : tone === 'bad' ? 'Worse' : 'Steady', open: 'insights',
        h: p + '% of ' + name + '\'s prep list was ticked off.', p: (note ? note + ' ' : '') + last.p.t + ' of ' + last.p.n + ' lines, ' + last.p.r + ' rolled over from earlier days.' });
    }
    var w7 = rowsOf(7, 0), w14 = rowsOf(7, 7);
    if (w7 && w14) {
      var a = sum(w7, function (r) { return r.w.n; }), b = sum(w14, function (r) { return r.w.n; });
      if (a || b) {
        var reasons = w7.reduce(function (o, r) { return addTo(o, r.w.reason); }, {}), secs = w7.reduce(function (o, r) { return addTo(o, r.w.sec); }, {}), tr = top(reasons), ts = top(secs);
        out.push({ tone: a > b ? 'bad' : a < b ? 'good' : 'flat', tag: a > b ? 'Worse' : a < b ? 'Better' : 'Steady', open: 'waste',
          h: a === b ? 'Waste is the same as the week before: ' + a + ' lines.' : 'Waste is ' + (a > b ? 'up' : 'down') + ': ' + a + ' lines in the last 7 days, ' + b + ' the 7 before.',
          p: a ? 'The most common reason was ' + reasonName(tr[0]) + ' (' + tr[1] + ' of ' + a + ').' + (ts ? ' ' + ts[0] + ' logged the most (' + ts[1] + ').' : '') : 'No waste was logged in the last 7 days.' });
      }
    }
    if (w7) {
      var bySec = {};
      w7.forEach(function (r) { Object.keys(r.p.mins).forEach(function (k) { bySec[k] = (bySec[k] || []).concat(r.p.mins[k]); }); });
      var slow = Object.keys(bySec).filter(function (k) { return bySec[k].length >= 3; }).map(function (k) { return [k, median(bySec[k])]; }).sort(function (x, y) { return y[1] - x[1]; });
      if (slow.length >= 2) {
        var before = w14 ? allMins(w14, slow[0][0]) : [], was = before.length >= 3 ? median(before) : null, fast = slow[slow.length - 1];
        var change = was == null ? '' : Math.abs(was - slow[0][1]) < 5 ? ' About the same as the week before.' : ' ' + dur(Math.abs(was - slow[0][1])) + (slow[0][1] < was ? ' quicker' : ' slower') + ' than the week before.';
        out.push({ tone: was == null || Math.abs(was - slow[0][1]) < 5 ? 'flat' : slow[0][1] < was ? 'good' : 'bad', tag: 'Slowest section', open: 'insights',
          h: slow[0][0] + ' was the slowest section to tick: typical ' + dur(slow[0][1]) + '.', p: 'From writing a line to ticking it, last 7 days.' + change + ' ' + fast[0] + ' was quickest at ' + dur(fast[1]) + '.' });
      }
    }
    return out.slice(0, 3);
  }
  function headlinesHTML() {
    var h = headlines();
    if (!h.length) return '';
    return '<section class="dsh-heads" aria-label="What changed"><h3 class="dsh-h">What changed</h3><div class="dsh-head-list">' + h.map(function (x) {
      return '<article class="dsh-head"><p class="dsh-tag dsh-tag-' + x.tone + '">' + esc(x.tag) + '</p><h4>' + esc(x.h) + '</h4><p>' + esc(x.p) + '</p><button type="button" class="dsh-more" data-dsh="open" data-t="' + x.open + '">Look into it</button></article>';
    }).join('') + '</div></section>';
  }

  /* ---------- tiles ---------- */
  function tilesHTML(cur, prev, len) {
    var big = len === 90, cmp = !!prev, noPrev = 'No earlier ' + len + ' days to compare';
    function series(f) { return big ? weeks(cur).map(function (w) { return f(w); }) : cur.map(function (r) { return f([r]); }); }
    var p = pct(cur), pp = cmp ? pct(prev) : null;
    var tm = median(allMins(cur)), tp = cmp ? median(allMins(prev)) : null;
    var r = sum(cur, function (x) { return x.p.r; }), rp = cmp ? sum(prev, function (x) { return x.p.r; }) : null;
    var w = sum(cur, function (x) { return x.w.n; }), wp = cmp ? sum(prev, function (x) { return x.w.n; }) : null;
    var xo = sum(cur, function (x) { return x.x.out; }), xi = sum(cur, function (x) { return x.x.in; });
    var tiles = [
      ['insights', 'Prep list ticked off', p == null ? 'No lines' : p + '<small>%</small>', delta(p, pp, true, ' pts', null, noPrev), series(pct), sum(cur, function (x) { return x.p.t; }) + ' of ' + sum(cur, function (x) { return x.p.n; }) + ' lines'],
      ['insights', 'Lines rolled over', String(r), delta(r, rp, false, '', null, noPrev), series(function (rs) { return sum(rs, function (x) { return x.p.r; }); }), 'Not finished, moved on'],
      ['insights', 'Typical time to tick', tileDur(tm), delta(tm, tp, false, '', dur, noPrev), series(function (rs) { return median(allMins(rs)); }), 'From written to ticked'],
      ['waste', 'Wastage lines', String(w), delta(w, wp, false, '', null, noPrev), series(function (rs) { return sum(rs, function (x) { return x.w.n; }); }), 'Lines logged, not dollars'],
      ['transfers', 'Transfers out / in', xo + ' / ' + xi, '<span class="dsh-delta dsh-flat">Lines with other venues</span>', series(function (rs) { return sum(rs, function (x) { return x.x.out + x.x.in; }); }), 'Out to and in from other venues']
    ];
    return '<div class="dsh-tiles">' + tiles.map(function (t) {
      return '<button type="button" class="dsh-tile" data-dsh="open" data-t="' + t[0] + '"><span class="dsh-tile-lab">' + esc(t[1]) + '</span><span class="dsh-tile-num">' + t[2] + '</span>' + t[3] + spark(t[4]) + '<span class="dsh-tile-sub">' + esc(t[5]) + '<span class="sr-only">. Opens the report.</span></span></button>';
    }).join('') + '</div>';
  }

  /* ---------- charts ---------- */
  function lineHTML(cur, len) {
    var big = len === 90, groups = big ? weeks(cur) : cur.map(function (r) { return [r]; });
    var labels = groups.map(function (g) { return (big ? 'Week of ' : '') + dayLabel(g[0].day); });
    var wr = groups.map(function (g) { return sum(g, function (r) { return r.p.w; }); }), tk = groups.map(function (g) { return sum(g, function (r) { return r.p.t; }); });
    var max = niceMax(Math.max.apply(null, wr.concat(tk))), id = 'line' + len;
    charts[id] = { labels: labels, series: [['Written', 'dsh-c-w', wr], ['Ticked off', 'dsh-c-t', tk]], max: max };
    function path(v) { return 'M' + v.map(function (x, i) { return (v.length === 1 ? 50 : i / (v.length - 1) * 100).toFixed(2) + ' ' + (100 - x / max * 100).toFixed(2); }).join(' L'); }
    var ticks = [0, max / 2, max].map(function (t) { return '<span class="dsh-ytick" style="bottom:' + (t / max * 100) + '%">' + num(t) + '</span>'; }).join('');
    var step = Math.max(1, Math.ceil(labels.length / 5)), xl = '';
    for (var i = 0; i < labels.length; i += step) xl += '<span style="left:' + (labels.length === 1 ? 50 : i / (labels.length - 1) * 100) + '%">' + esc(big ? shortDay(groups[i][0].day) : shortDay(groups[i][0].day)) + '</span>';
    var ends = charts[id].series.map(function (s) { var v = s[2][s[2].length - 1]; return '<i class="dsh-end ' + s[1] + '" style="bottom:' + (v / max * 100) + '%"></i>'; }).join('');
    var table = '<details class="a-details"><summary>Show these numbers as a table</summary><div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">' + (big ? 'Week of' : 'Day') + '</th><th scope="col">Written</th><th scope="col">Ticked off</th></tr></thead><tbody>' +
      labels.map(function (l, i) { return '<tr><th scope="row">' + esc(big ? dayLabel(groups[i][0].day) : l) + '</th><td>' + wr[i] + '</td><td>' + tk[i] + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    return '<div class="dsh-panel dsh-wide"><div class="dsh-panel-head"><h3 class="a-ch-h">Prep list ' + (big ? 'each week' : 'each day') + '</h3><button type="button" class="dsh-more" data-dsh="open" data-t="insights">Open Insights</button></div>' +
      '<p class="dsh-legend"><span><i class="dsh-c-w"></i>Written</span><span><i class="dsh-c-t"></i>Ticked off</span></p>' +
      '<div class="dsh-line"><div class="dsh-plot" tabindex="0" role="img" data-dsh-chart="' + id + '" aria-label="Prep lines written and ticked off. Use the arrow keys to read each ' + (big ? 'week' : 'day') + ', or open the table below.">' + ticks +
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false" aria-hidden="true"><line x1="0" x2="100" y1="50" y2="50" class="dsh-gridline"/><line x1="0" x2="100" y1="100" y2="100" class="dsh-gridline"/>' +
      charts[id].series.map(function (s) { return '<path class="' + s[1] + '" d="' + path(s[2]) + '"/>'; }).join('') + '</svg>' +
      '<div class="dsh-ends" aria-hidden="true">' + ends + '</div><div class="dsh-cross" hidden></div><div class="dsh-tip" role="status" hidden></div></div><div class="dsh-xticks" aria-hidden="true">' + xl + '</div></div>' + table + '</div>';
  }
  function reasonsHTML(cur, prev) {
    var a = cur.reduce(function (o, r) { return addTo(o, r.w.reason); }, {}), b = prev ? prev.reduce(function (o, r) { return addTo(o, r.w.reason); }, {}) : null;
    var keys = Object.keys(a).concat(b ? Object.keys(b) : []).filter(function (k, i, all) { return all.indexOf(k) === i; }).sort(function (x, y) { return (a[y] || 0) - (a[x] || 0) || (b ? (b[y] || 0) - (b[x] || 0) : 0); }).slice(0, 6);
    var body;
    if (!keys.length) body = '<p class="hint">No waste was logged in this period.</p>';
    else {
      var max = niceMax(Math.max.apply(null, keys.map(function (k) { return Math.max(a[k] || 0, b ? b[k] || 0 : 0); })));
      body = '<div class="dsh-bars">' + keys.map(function (k) {
        var tip = reasonName(k) + ': ' + (a[k] || 0) + ' lines' + (b ? ', ' + (b[k] || 0) + ' the period before' : '');
        return '<div class="dsh-bar" tabindex="0" data-dsh-tip="' + esc(tip) + '"><span class="dsh-bar-name">' + esc(reasonName(k)) + '</span><span class="dsh-track"><span class="dsh-fill" style="width:' + ((a[k] || 0) / max * 100).toFixed(1) + '%"></span>' +
          (b ? '<span class="dsh-was" style="left:' + ((b[k] || 0) / max * 100).toFixed(1) + '%"></span>' : '') + '</span><span class="dsh-bar-val">' + (a[k] || 0) + '</span></div>';
      }).join('') + '</div>';
    }
    return '<div class="dsh-panel"><div class="dsh-panel-head"><h3 class="a-ch-h">Wastage by reason</h3><button type="button" class="dsh-more" data-dsh="open" data-t="waste">Open Wastage</button></div>' +
      '<p class="hint">Lines logged.' + (b ? ' The dark mark is the period before.' : '') + '</p>' + body + '<div class="dsh-tip" role="status" hidden></div></div>';
  }
  function heatHTML(cur) {
    var tot = {}, per = {}, cnt = [0, 0, 0, 0, 0, 0, 0];
    cur.forEach(function (r) { var d = dow(r.day); cnt[d]++; Object.keys(r.p.sec).forEach(function (s) { tot[s] = (tot[s] || 0) + r.p.sec[s]; (per[s] = per[s] || [0, 0, 0, 0, 0, 0, 0])[d] += r.p.sec[s]; }); });
    var secs = Object.keys(tot).sort(function (x, y) { return tot[y] - tot[x]; });
    if (secs.length > 6) {
      var other = [0, 0, 0, 0, 0, 0, 0]; secs.slice(5).forEach(function (s) { per[s].forEach(function (v, i) { other[i] += v; }); });
      per['Other sections'] = other; secs = secs.slice(0, 5).concat(['Other sections']);
    }
    var order = [1, 2, 3, 4, 5, 6, 0], max = 0;
    secs.forEach(function (s) { order.forEach(function (d) { if (cnt[d]) max = Math.max(max, per[s][d] / cnt[d]); }); });
    var body = !secs.length ? '<p class="hint">No prep lines in this period.</p>' : '<div class="dsh-heat" style="--dsh-cols:' + order.length + '"><span></span>' + order.map(function (d) { return '<span class="dsh-heat-d"><abbr title="' + DAYS[d] + '">' + DAYS[d].charAt(0) + '</abbr></span>'; }).join('') +
      secs.map(function (s) {
        return '<span class="dsh-heat-s">' + esc(s) + '</span>' + order.map(function (d) {
          if (!cnt[d]) return '<span class="dsh-cell dsh-cell-none" tabindex="0" data-dsh-tip="' + esc(s + ', ' + DAYS[d] + ': no ' + DAYS[d] + ' in this period') + '">-</span>';
          var v = per[s][d] / cnt[d], step = max ? Math.min(HEAT, 1 + Math.floor(v / max * (HEAT - 0.001))) : 1;
          return '<span class="dsh-cell dsh-h' + step + '" tabindex="0" data-dsh-tip="' + esc(s + ', ' + DAYS[d] + ': ' + num(v) + ' lines a day on average') + '">' + Math.round(v) + '</span>';
        }).join('');
      }).join('') + '</div>';
    return '<div class="dsh-panel"><div class="dsh-panel-head"><h3 class="a-ch-h">Load by weekday</h3><button type="button" class="dsh-more" data-dsh="open" data-t="insights">Open Insights</button></div>' +
      '<p class="hint">Prep lines written, on average per day. Darker is busier.</p>' + body + '<div class="dsh-tip" role="status" hidden></div></div>';
  }
  // Five rows need no search or sort: data-ux-table tells the shared report-table controls (js/controls.js) to leave it.
  function itemsHTML(cur, prev) {
    function agg(rows) { var m = {}; rows.forEach(function (r) { r.w.items.forEach(function (i) { var k = i.t.toLowerCase(); var a = m[k] = m[k] || { t: i.t, n: 0, amt: {} }; a.n += i.n; if (i.a) a.amt[i.u] = (a.amt[i.u] || 0) + i.a; }); }); return m; }
    var a = agg(cur), b = prev ? agg(prev) : null;
    var keys = Object.keys(a).sort(function (x, y) { return a[y].n - a[x].n || (x < y ? -1 : 1); }).slice(0, 5);
    var body = !keys.length ? '<p class="hint">No waste was logged in this period.</p>' : '<div class="dsh-scroll" tabindex="0" role="region" aria-label="Most wasted items, scrolls sideways"><table class="dsh-items" data-ux-table="none"><thead><tr><th scope="col">Item</th><th scope="col">Lines</th><th scope="col">Amount</th>' + (b ? '<th scope="col">Lines before</th>' : '') + '</tr></thead><tbody>' +
      keys.map(function (k) {
        var x = a[k], amt = Object.keys(x.amt).map(function (u) { return num(x.amt[u]) + (u ? ' ' + u : ''); }).join(', ') || 'Not recorded', was = b ? (b[k] ? b[k].n : 0) : null;
        return '<tr><th scope="row">' + esc(x.t) + '</th><td>' + x.n + '</td><td>' + esc(amt) + '</td>' + (b ? '<td>' + was + (x.n > was ? ' <span class="dsh-delta dsh-bad"><span aria-hidden="true">&#9650;</span> more now</span>' : x.n < was ? ' <span class="dsh-delta dsh-good"><span aria-hidden="true">&#9660;</span> fewer now</span>' : '') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    return '<div class="dsh-panel"><div class="dsh-panel-head"><h3 class="a-ch-h">Most wasted</h3><button type="button" class="dsh-more" data-dsh="open" data-t="waste">All items</button></div><p class="hint">By lines logged. Amounts as typed, by unit.</p>' + body + '</div>';
  }

  /* ---------- the page ---------- */
  function freshHTML() {
    var h = state.health, d = state.data, failed = h && h.status === 'failed' && n(h.at) > d.at;
    return '<p class="dsh-fresh' + (failed ? ' dsh-fresh-bad' : '') + '" role="status"><span class="dsh-dot" aria-hidden="true"></span>' +
      (failed ? 'The last nightly run did not finish. These numbers are from ' + esc(api.clock(d.at)) + '.' : 'Numbers from the nightly run, ' + esc(api.clock(d.at)) + '.') + '</p>';
  }
  function toolsHTML() {
    return '<div class="dsh-tools"><div class="dsh-periods" role="group" aria-label="Period">' + [7, 30, 90].map(function (p) {
      return '<button type="button" class="chip" data-dsh="period" data-v="' + p + '" aria-pressed="' + (state.period === p) + '">' + p + ' days</button>';
    }).join('') + '</div><button type="button" class="chip" data-dsh="refresh"' + (state.loading ? ' disabled' : '') + '>Refresh</button></div>';
  }
  function render(adapter) {
    if (!bind(adapter)) return '';
    load(false);
    // Opened once on this device: from now on the panel returns to the last page used (lk.dash.intro, never out of date).
    if (api.seen) api.seen();
    var head = '<section class="set-block dsh">' + toolsHTML();
    if (state.loading && state.data === undefined) return head + api.wait('Loading the dashboard...') + '</section>';
    if (state.error) return head + '<p class="p-err" role="status">Could not load the dashboard numbers. Check the connection and tap Refresh.</p></section>';
    if (!state.data) return head + '<p class="hint" role="status">The dashboard numbers come from the nightly run at 03:00. They will be here after the next run.</p></section>';
    if (!state.data.days.length) return head + freshHTML() + '<p class="hint" role="status">No finished kitchen days in the nightly numbers yet.</p></section>';
    var len = state.period, have = state.data.days.length, cur = rowsOf(Math.min(len, have), 0), prev = rowsOf(len, len);
    charts = {};
    return head + freshHTML() + '<p class="hint dsh-range">' + esc(dayLabel(cur[0].day) + ' to ' + dayLabel(cur[cur.length - 1].day)) +
      (have < len ? '. Only ' + have + ' finished days so far.' : prev ? ', compared with the ' + len + ' days before.' : '. The nightly run keeps 90 days, so there is no earlier period to compare.') + ' Today is counted tonight.</p>' +
      headlinesHTML() + tilesHTML(cur, have >= len ? prev : null, len) +
      '<div class="dsh-grid">' + lineHTML(cur, len) + reasonsHTML(cur, have >= len ? prev : null) + heatHTML(cur) + itemsHTML(cur, have >= len ? prev : null) + '</div></section>';
  }

  /* ---------- reading a chart: pointer, touch and arrow keys ---------- */
  function showPoint(plot, i) {
    var c = charts[plot.getAttribute('data-dsh-chart')]; if (!c) return;
    var len = c.labels.length; i = Math.max(0, Math.min(len - 1, i)); plot.setAttribute('data-i', i);
    var x = len === 1 ? 50 : i / (len - 1) * 100, cross = plot.querySelector('.dsh-cross'), tip = plot.querySelector('.dsh-tip');
    cross.hidden = false; cross.style.left = x + '%';
    tip.hidden = false;
    tip.innerHTML = '<b>' + esc(c.labels[i]) + '</b>' + c.series.map(function (s) { return '<span><i class="' + s[1] + '"></i>' + esc(s[0]) + ' ' + s[2][i] + '</span>'; }).join('');
    tip.style.left = x + '%'; tip.classList.toggle('dsh-tip-left', x > 60);
  }
  function hidePoint(plot) { plot.querySelector('.dsh-cross').hidden = true; plot.querySelector('.dsh-tip').hidden = true; }
  function plotIndex(plot, ev) { var r = plot.getBoundingClientRect(), c = charts[plot.getAttribute('data-dsh-chart')]; return c ? Math.round((ev.clientX - r.left) / Math.max(1, r.width) * (c.labels.length - 1)) : 0; }
  function tipFor(el, show) {
    var panel = el.closest('.dsh-panel'), tip = panel && panel.querySelector(':scope > .dsh-tip'); if (!tip) return;
    if (!show) { tip.hidden = true; return; }
    var pr = panel.getBoundingClientRect(), er = el.getBoundingClientRect();
    tip.textContent = el.getAttribute('data-dsh-tip'); tip.hidden = false;
    tip.style.left = Math.min(pr.width - 12, Math.max(12, er.left - pr.left + er.width / 2)) + 'px'; tip.style.top = (er.top - pr.top) + 'px';
    tip.classList.toggle('dsh-tip-left', er.left - pr.left > pr.width * 0.6);
  }
  function inside(el) { return valid() && el && el.closest && el.closest('.dsh'); }
  document.addEventListener('pointermove', function (e) { var plot = inside(e.target) && e.target.closest('.dsh-plot'); if (plot) showPoint(plot, plotIndex(plot, e)); });
  document.addEventListener('pointerdown', function (e) { var plot = inside(e.target) && e.target.closest('.dsh-plot'); if (plot) showPoint(plot, plotIndex(plot, e)); });
  document.addEventListener('pointerout', function (e) {
    var plot = inside(e.target) && e.target.closest('.dsh-plot'); if (plot && !plot.contains(e.relatedTarget)) hidePoint(plot);
    var bar = inside(e.target) && e.target.closest('[data-dsh-tip]'); if (bar && !bar.contains(e.relatedTarget)) tipFor(bar, false);
  });
  document.addEventListener('pointerover', function (e) { var bar = inside(e.target) && e.target.closest('[data-dsh-tip]'); if (bar) tipFor(bar, true); });
  document.addEventListener('focusin', function (e) {
    if (!inside(e.target)) return;
    if (e.target.matches('.dsh-plot')) { var c = charts[e.target.getAttribute('data-dsh-chart')]; if (c) showPoint(e.target, c.labels.length - 1); }
    else if (e.target.matches('[data-dsh-tip]')) tipFor(e.target, true);
  });
  document.addEventListener('focusout', function (e) { if (!inside(e.target)) return; if (e.target.matches('.dsh-plot')) hidePoint(e.target); else if (e.target.matches('[data-dsh-tip]')) tipFor(e.target, false); });
  document.addEventListener('keydown', function (e) {
    var plot = inside(e.target) && e.target.matches('.dsh-plot') ? e.target : null; if (!plot) return;
    var c = charts[plot.getAttribute('data-dsh-chart')], i = +(plot.getAttribute('data-i') || 0);
    if (!c) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); showPoint(plot, e.key === 'Home' ? 0 : e.key === 'End' ? c.labels.length - 1 : i + (e.key === 'ArrowLeft' ? -1 : 1));
    } else if (e.key === 'Escape') hidePoint(plot);
  });

  function click(el) {
    if (!valid()) return;
    var a = el.getAttribute('data-dsh');
    if (a === 'period') { var v = +el.getAttribute('data-v'); if ([7, 30, 90].indexOf(v) >= 0) { state.period = v; redraw(); } return; }
    if (a === 'refresh') { if (!state.loading) { state.data = undefined; load(true); redraw(); } return; }
    if (a === 'open') { var t = el.getAttribute('data-t'); if (['insights', 'waste', 'transfers'].indexOf(t) >= 0) api.open(t, state.period); }
  }
  window.LK_DASH = { API: API, render: render, click: click, reset: reset };
})();
