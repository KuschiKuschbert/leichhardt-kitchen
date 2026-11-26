// Does a tick move lines across the spine (C) or a column (B, unmended)? Ticks Larder's first line and Fryer's two
// lines where they are, waits past the linger, and lists the rows that changed column or moved by more than the shared
// move of Top tickers appearing (see round2/evidence.cjs). Preview only, Ann's own device (no who-did-it sheet).
const path = require('path'), fs = require('fs'), ROOT = process.cwd();
const S = require(path.join(__dirname, '../../device-coverage/step2/shots.cjs'));
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const src = fs.readFileSync(path.join(__dirname, 'previews.cjs'), 'utf8');
const css = name => src.match(new RegExp('const ' + name + ' = \\{[^`]*`([\\s\\S]*?)`'))[1];
const places = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.nb-left .nb-row, .wb-col .nb-row')].filter(e => e.id && e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [e.id, [Math.round(r.left), Math.round(r.top)]]; })));
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  for (const [name, wall] of [['B', true], ['C', false]]) for (const what of [/Slice onions/, /Blanch chips|Crumb the calamari/]) {
    const p = await L.open(b, '#/prep', Object.assign({ base, who: 'ann', width: 1920, height: 1008, touch: true, extra: S.extra, wait: 2200 }, wall ? { init: "localStorage.setItem('lk.wall', '1')" } : {}));
    await S.fonts(p); await p.addStyleTag({ content: css(name) });
    await p.evaluate(() => document.querySelectorAll('.wb-col[aria-label="Larder"]').forEach(c => c.classList.add('pv-mine'))); await L.settle(p, 600);
    const before = await places(p);
    const ids = await p.evaluate(src => [...document.querySelectorAll('.nb-row')].filter(r => new RegExp(src).test(r.textContent) && !r.classList.contains('is-done')).map(r => r.id), what.source);
    for (const id of ids) { await p.evaluate(id => document.querySelector('#' + id + ' .nb-box').click(), id); await L.settle(p, 300); }
    await p.evaluate(() => document.querySelectorAll('.wb-col[aria-label="Larder"]').forEach(c => c.classList.add('pv-mine'))); await L.settle(p, 4500);
    const after = await places(p);
    const keys = Object.keys(before).filter(k => after[k] && !ids.includes(k)), tally = {};
    const d = k => (after[k][0] - before[k][0]) + ',' + (after[k][1] - before[k][1]);
    keys.forEach(k => { tally[d(k)] = (tally[d(k)] || 0) + 1; });
    const shared = Object.keys(tally).sort((x, y) => tally[y] - tally[x])[0];
    const side = keys.filter(k => Math.abs(after[k][0] - before[k][0]) > 2), other = keys.filter(k => d(k) !== shared);
    out[name + ' ticks ' + what.source] = { ticked: ids.length, inView: keys.length, sharedMove: shared, changedColumn: side.length, movedOtherwise: other.length, examples: other.slice(0, 5).map(k => k + ' ' + before[k] + ' -> ' + after[k]) };
    await p.context().close();
  }
  fs.writeFileSync(path.join(__dirname, 'reflow.json'), JSON.stringify(out, null, 1) + '\n'); console.log(JSON.stringify(out, null, 1));
  await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
