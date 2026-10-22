// For the functions (22 Oct 2026, review F1): Handy lists what today's and tomorrow's function platters need, every item
// on the platter cards added up, with Add (a normal prep line with that amount) and Not needed. No reads of its own.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), tmr = M.addDays(today, 1);
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
function fn(o) {
  const R0 = o.rounds.map(x => ({ at: at(o.date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date: o.date, start: at(o.date, o.start), st: false, loc: '', guests: 40, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0, rounds: R0,
    lines: o.lines.map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: 'Per platter.', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 });
}
(async () => {
  const b = await L.start();
  const extra = {
    [fsKey(['functions', 'smith'])]: fn({ name: 'Smith 50th', date: today, start: '18:00', rounds: ['18:30'], lines: [['aussie-platter', 'Aussie Platter', [5]]] }),
    [fsKey(['functions', 'brown'])]: fn({ name: 'Brown 21st', date: tmr, start: '19:00', rounds: ['19:30'], lines: [['antipasto-platter', 'Antipasto Platter', [4]]] }),
    [fsKey(['days', today, 'items', 'fn-smith-aussie-platter'])]: { text: 'Aussie Platter', qty: '5 platters', station: 'Functions', recipe: 'aussie-platter', fn: 'smith', dupOk: true, addedBy: 'Fay', addedById: 'fay', addedAt: L.NOW - 3600000, done: false, deleted: false }
  };
  const p = await L.open(b, '#/prep', { extra, wait: 1800 });
  await L.waitFor(p, () => /What the platters need: 8 today, 10 tomorrow/.test(document.body.textContent)).catch(() => {});
  ok(/What the platters need: 8 today, 10 tomorrow/.test(await L.txt(p, '.nb-right') || '') && !(await p.$('.fnn')), 'folded: one line with the counts');
  await p.click('[data-p="fnneed-fold"]'); await L.settle(p, 200);
  const t = (await L.txt(p, '.nb-right') || '').replace(/\s+/g, ' ');
  ok(/Party pies 50 pieces/.test(t) && /Smith 50th: 5 platters/.test(t), 'today: 5 Aussie platters need 50 party pies, and it says for whom');
  ok(/Leg ham 400 g/.test(t) && /Cheese selection 1\.2 kg/.test(t) && /Brown 21st: 4 platters/.test(t), 'tomorrow: 4 Antipasto platters, leg ham 400 g and cheese 1.2 kg');
  ok(/Dried fruit salad amount to come/.test(t), 'an amount the card does not give says amount to come');
  await p.click('[data-p="fnneed"][aria-label="Add Party pies, 50 pieces"]'); await L.settle(p, 600);
  const line = await p.evaluate(() => Object.values(window.__fake.dump()).filter(v => v && v.text === 'Party pies' && !v.fn)[0]);
  ok(line && line.qty === '50 pieces' && line.qn === 50 && line.qu === 'pieces', 'Add puts Party pies, 50 pieces on the prep list');
  ok(/Party pies 50 pieces[^]*?On the list/.test((await L.txt(p, '.nb-right') || '').replace(/\s+/g, ' ')), 'then it says On the list');
  await p.click('[data-p="fnneed-hide"][aria-label="Not needed: Sausage rolls"]'); await L.settle(p, 300);
  ok(!/Sausage rolls/.test(await L.txt(p, '.fnn') || ''), 'Not needed hides it');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  ok(!(await L.overflow(p)), 'phone: no sideways scroll');
  await p.context().close();

  // Pace counts the day's own lines, like the header: a function's platter line is not one of them (23 Oct 2026)
  const pc = Object.assign({}, extra);
  [1, 2, 3].forEach(n => { const d = L.ymd(new Date(L.NOW - n * 86400000)); for (let k = 0; k < 5; k++) pc[fsKey(['days', d, 'items', 'p' + n + k])] = { text: 'Past job ' + n + k, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - n * 86400000 - 7200000, done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - n * 86400000 - 3600000 * (k + 1), deleted: false }; });
  pc[fsKey(['days', today, 'items', 'i1'])] = Object.assign({}, { text: 'Slice onions', station: 'Larder', qty: '2 tubs', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, deleted: false }, { done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - 600000 });
  const q = await L.open(b, '#/prep', { extra: pc, width: 1280, height: 900, wait: 1800 });
  await L.waitFor(q, () => !!document.querySelector('.nb-pace'), null, 6000).catch(() => {});
  const prog = await L.txt(q, '.nb-prog') || '', paceT = await L.txt(q, '.nb-pace') || '';
  const pn = (paceT.match(/\((\d+) of (\d+)\)/) || []).slice(1).join(' of '), hn = (prog.match(/(\d+) of (\d+) done/) || []).slice(1).join(' of ');
  ok(!!pn && pn === hn && hn === '1 of 6', 'Pace says the same count as the header, without the platter line (Pace ' + pn + ', header ' + hn + ')');
  ok(q.errors.length === 0, 'pace: no page errors ' + q.errors.join(' | '));
  await q.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
