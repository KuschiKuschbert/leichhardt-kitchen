// The head chef's whole day on Home: today's board (fixed hours) and options A, B, C, served as changed copies of
// js/prep.js and css/app.css to the stand-in (synthetic people). node preview-run.cjs
const fs = require('fs'), path = require('path');  // run from the repo: CHROME=<chrome-headless-shell> node docs/home-roster-options/preview-run.cjs
const REPO = path.join(__dirname, '../..'), V = __dirname + '/preview/', OUT = process.env.OUT || __dirname + '/';
fs.mkdirSync(OUT, { recursive: true });
const L = require(REPO + '/tests/lib');
const F = require(REPO + '/docs/team-one-break-options/fixture.cjs');
const H = F.H;
const fx = () => {
  const x = F.fixture(), t = x[F.TEAM];
  t.on = t.on.map(o => Object.assign({}, o, { sec: o.id === 'gus' || o.id === 'sam' ? '' : o.id === 'mo' && o.sh === 'dinner' ? 'grill' : (F.plan[o.id] || [''])[0] }));
  t.br = [{ id: 'ari', sh: 'lunch', at: H(12), len: 30 }, { id: 'bea', sh: 'lunch', at: H(13), len: 30 }, { id: 'cal', sh: 'lunch', at: H(13, 45), len: 30 },
    { id: 'dev', sh: 'allday', at: H(15, 30), len: 30 }, { id: 'eli', sh: 'dinner', at: H(18), len: 30 }, { id: 'fen', sh: 'dinner', at: H(18, 30), len: 30 },
    { id: 'mo', sh: 'allday', at: H(15), len: 30 }, { id: 'gus', sh: 'lunch', at: H(14), len: 30 }];
  // Jo (round 2 repairs): a split, Pans 10:00 to 14:00 then Larder 17:00 to 21:00 with a dinner break 19:00
  if (process.env.JO) {
    x[F.CFG].people = x[F.CFG].people.concat([{ id: 'jo', name: 'Jo', role: 'staff', active: true, add: true, tick: true }]); x[F.CFG].staffIds = x[F.CFG].staffIds.concat(['jo']);
    t.on = t.on.concat([{ id: 'jo', sh: 'lunch', sec: 'pans', from: H(10), to: H(14) }, { id: 'jo', sh: 'dinner', sec: 'larder', from: H(17), to: H(21) }]);
    t.br = t.br.concat([{ id: 'jo', sh: 'dinner', at: H(19), len: 30 }]);
  }
  for (const id of ['ari']) x[['kitchens', L.PIN, 'pinset', id].join('/')] = { at: 1 };
  return x;
};
const prep = fs.readFileSync(REPO + '/js/prep.js', 'utf8'), css = fs.readFileSync(REPO + '/css/app.css', 'utf8');
const over = v => {
  if (v === 'now') return {};
  const anchor = '  function homeRotaHTML(rec, rows, m) {';
  if (prep.split(anchor).length !== 2) throw new Error('anchor');
  const js = prep.replace(anchor, fs.readFileSync(V + 'common.js', 'utf8') + fs.readFileSync(V + v + '.js', 'utf8') + '  function homeRotaBoard(rec, rows, m) {');
  return { '/js/prep.js': { body: js, lastModified: new Date().toUTCString(), etag: '"' + v + 'j"' }, '/css/app.css': { body: css + '\n' + fs.readFileSync(V + v + '.css', 'utf8'), lastModified: new Date().toUTCString(), etag: '"' + v + 'c"' } };
};
(async () => {
  const b = await L.start();
  for (const v of (process.argv[2] || 'now,a,b,c').split(',')) {
    const srv = require(REPO + '/tests/serve').make(over(v));
    await new Promise(r => srv.listen(8777, '127.0.0.1', r));
    for (const [who, w] of (process.env.ONLY ? [['gus', 390]] : [['gus', 390], ['gus', 768], ['gus', 1280], ['ari', 390]])) {
      const p = await L.open(b, '#/', Object.assign(who === 'gus' ? { admin: true } : { who }, { width: w, height: w === 390 ? 844 : 1000, extra: fx(), wait: 2000 }, process.env.AT ? { clock: L.NOW + Number(process.env.AT) * 60000 } : {}));
      await L.waitFor(p, () => !!document.querySelector('#hm-with .hm-tp'), null, 9000).catch(() => {});
      await p.addStyleTag({ content: '.tabbar { display: none !important; }' });
      let sel = '#hm-with';
      if (who === 'ari') { await p.click('#hm-full-team > summary').catch(() => {}); await L.settle(p, 400); sel = '#hm-full-team'; }
      const m = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; }, sel);
      const el = await p.$(sel); if (el) await el.screenshot({ path: OUT + v + '-' + who + '-' + w + '.png' });
      console.log(v, who, w, JSON.stringify(m), 'overflow', await L.overflow(p), 'errors', JSON.stringify(p.errors));
      await p.context().close();
    }
    await new Promise(r => srv.close(r));
  }
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
