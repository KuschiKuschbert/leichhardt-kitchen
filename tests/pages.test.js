// Every page and every admin tab on a phone (390 px), a tablet (768 px) and a computer (1280 px): no sideways
// scroll and no page errors. With SHOTS=1 it also saves a screenshot of each page to tests/shots/.
const L = require('./lib');
const fs = require('fs'), path = require('path');
const SHOTS = process.env.SHOTS ? path.join(__dirname, 'shots') : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await L.start(), R = [];
  const pages = ['#/', '#/recipes', '#/r/barra', '#/r/laksa', '#/r/rice', '#/settings', '#/prep', '#/orders', '#/waste', '#/minutes', '#/mail', '#/drinks', '#/guides', '#/guides/combi', '#/guides/fryer'];
  for (const [w, h, touch] of [[390, 844, true], [768, 1024, true], [1280, 900, false]]) {
    for (const hash of pages) {
      const p = await L.open(b, hash, { width: w, height: h, touch, wait: 1400, extra: L.guides() });
      const of = await L.overflow(p);
      L.check(!of && !p.errors.length, w + ' ' + hash + (of ? ' sideways scroll: ' + of : '') + (p.errors.length ? ' errors: ' + p.errors.join(' | ') : ''), R);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, w + '-' + (hash.replace(/[#/]/g, '') || 'landing') + '.png') });
      await p.context().close();
    }
    const p = await L.open(b, '#/admin', { width: w, height: h, touch, admin: true, wait: 1600, extra: Object.assign(L.guides(), L.mail(), { ['kitchens/' + L.PIN + '/config/admins']: { x: 1, mailOpened: L.NOW } }) });   // Mail opened just now: no nudge popup over the tabs
    for (const t of ['insights', 'team', 'waste', 'learning', 'notes', 'minutes', 'guides', 'mail', 'people', 'tools']) {
      await p.click('[data-p="a-tab"][data-t="' + t + '"]'); await p.waitForTimeout(500);
      const ofa = await L.overflow(p);
      L.check(!ofa, w + ' admin ' + t + ' no sideways scroll' + (ofa ? ': ' + ofa : ''), R);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, w + '-admin-' + t + '.png') });
    }
    L.check(!p.errors.length, w + ' admin no page errors ' + p.errors.join(' | '), R);
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
