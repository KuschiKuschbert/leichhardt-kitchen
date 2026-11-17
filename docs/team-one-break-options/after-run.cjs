// Row heights once everyone has a break (the book's own times), and C's fill words (17 Nov 2026). Port 8779.
const path = require('path');
const L = require(path.join(__dirname, '../../tests/lib'));
const F = require('./fixture.cjs');
const OUT = __dirname + '/';
(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8779, '127.0.0.1', r));
  const b = await L.start();
  for (const v of (process.argv.slice(2).length ? process.argv.slice(2).map(x => x === 'today' ? '' : x) : ['', 'A', 'B', 'C'])) for (const w of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w, height: w === 390 ? 844 : 900, extra: F.fixture(), wait: 1800, init: 'window.__ob=' + JSON.stringify(v) });
    await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000);
    let fill = '';
    if (v === 'C') { await p.locator('[data-p="tm-ob-fill"]').click(); await L.settle(p, 300); fill = await p.evaluate(() => { const m = document.body.innerText.match(/Filled for you[^\n]*/); return m ? String(m[0]) : ''; }); }
    else for (const id of ['gus', 'sam', 'ari', 'bea', 'cal', 'dev', 'eli', 'fen', 'mo']) {
      const sel = v ? '[data-p="tm-ob-add"][data-id="' + id + '"]' : '[data-p="tm-addbr"][data-id="' + id + '"]';
      await p.locator(sel).first().click(); await L.settle(p, 120);
    }
    const hs = await p.evaluate(() => ({ mo: 0, bea: 0, gus: 0, ...Object.fromEntries(['mo', 'bea', 'gus'].map(id => [id, Math.round(document.querySelector('.tm-person-row[data-id="' + id + '"]').getBoundingClientRect().height)])), list: Math.round(document.querySelector('.tm-people').getBoundingClientRect().height), breakList: Math.round((document.querySelector('.ob-list') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height), fillLine: (document.querySelector('.ob-fill') || { innerText: '' }).innerText }));
    console.log((v || 'today') + ' ' + w + ' everyone a break: ' + JSON.stringify(Object.assign(hs, fill ? { said: fill } : {})));
    if (w === 390 && v === 'C') { await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 150); await p.screenshot({ path: OUT + 'C-filled-390.png' }); await p.evaluate(() => { const e = document.querySelector('.tm-person-row[data-id="gus"]'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }); await L.settle(p, 150); await p.screenshot({ path: OUT + 'C-rows-390.png' }); }
    if (w === 390 && v === 'B') { await p.evaluate(() => { const e = document.querySelector('.ob-list'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }); await L.settle(p, 150); await p.screenshot({ path: OUT + 'B-list-390.png' }); }
    if (w === 390 && (v === 'A' || v === 'D')) { await p.evaluate(() => { const e = document.querySelector('.tm-person-row[data-id="gus"]'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }); await L.settle(p, 150); await p.screenshot({ path: OUT + v + '-rows-390.png' }); if (v === 'D') { await p.evaluate(() => { const e = document.querySelector('.tm-person-row[data-id="dev"]'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }); await L.settle(p, 150); await p.screenshot({ path: OUT + 'D-rows2-390.png' }); } }
    if (w === 390 && !v) { await p.evaluate(() => { const e = document.querySelector('.tm-person-row[data-id="gus"]'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }); await L.settle(p, 150); await p.screenshot({ path: OUT + 'today-rows-390.png' }); }
    await p.context().close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
