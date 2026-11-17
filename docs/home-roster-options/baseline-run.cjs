// Home's On today board on a roster day (synthetic people): node home-shot.cjs
const REPO = '/home/user/leichhardt-kitchen';
const L = require(REPO + '/tests/lib');
const F = require(REPO + '/docs/team-one-break-options/fixture.cjs');
const OUT = __dirname + '/';
const H = F.H;
const fx = () => {
  const x = F.fixture(), t = x[F.TEAM];
  t.on = t.on.map(o => Object.assign({}, o, { sec: o.id === 'gus' || o.id === 'sam' ? '' : (F.plan[o.id] || [''])[0] }));
  t.br = [{ id: 'ari', sh: 'lunch', at: H(12), len: 30 }, { id: 'bea', sh: 'lunch', at: H(13), len: 30 }, { id: 'cal', sh: 'lunch', at: H(13, 45), len: 30 },
    { id: 'dev', sh: 'allday', at: H(15, 30), len: 30 }, { id: 'eli', sh: 'dinner', at: H(18), len: 30 }, { id: 'fen', sh: 'dinner', at: H(18, 30), len: 30 },
    { id: 'mo', sh: 'allday', at: H(15), len: 30 }, { id: 'gus', sh: 'lunch', at: H(14), len: 30 }];
  for (const id of ['ari', 'eli', 'mo']) x[['kitchens', L.PIN, 'pinset', id].join('/')] = { at: 1 };
  return x;
};
(async () => {
  const srv = require(REPO + '/tests/serve');
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  for (const [who, w] of [['gus', 390], ['ari', 390], ['mo', 390], ['gus', 1280]]) {
    const p = await L.open(b, '#/', Object.assign(who === 'gus' ? { admin: true } : { who }, { width: w, height: w === 390 ? 844 : 900, extra: fx(), wait: 2000 }));
    await L.waitFor(p, () => !!document.querySelector('#hm-with .hm-tp'), null, 9000).catch(() => {});
    const top = await p.evaluate(() => { const e = document.querySelector('#hm-with'); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : 0; });
    const box = await p.evaluate(() => { const e = document.querySelector('#hm-with'); if (!e) return { hash: location.hash, ids: [...document.querySelectorAll('[id^=hm]')].map(x => x.id).join(','), body: document.body.innerText.slice(0, 300) }; const r = e.getBoundingClientRect(); return { h: Math.round(r.height), text: e.innerText.replace(/\n+/g, ' | ').slice(0, 900) }; });
    console.log(who, w, JSON.stringify(box));
    await p.evaluate(t => window.scrollTo(0, Math.max(0, t - 120)), top); await L.settle(p, 300);
    await p.screenshot({ path: OUT + 'now-' + who + '-' + w + '.png', fullPage: w !== 390 });
    console.log('errors', p.errors, 'overflow', await L.overflow(p));
    await p.context().close();
  }
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
