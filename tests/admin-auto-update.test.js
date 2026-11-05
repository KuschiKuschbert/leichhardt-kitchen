// An update nobody asked for opens the admin panel on the Dashboard (Plan B, option 2.6 of docs/firestore-usage.md,
// 5 Nov 2026). Insights, Team, Wastage, Transfers, Learning and the Proofreader read up to 60 days of lines on every
// open, about 2,400 reads with a month of data, and the head chef's laptop left on one paid it again at every update.
// Update now, a reload by hand and opening the book still land on the page the head chef left.
const L = require('./lib');
const { R, ok } = L.results();
const mark = p => p.evaluate(() => { window.__mark = 1; });
const waitReload = p => L.waitFor(p, () => window.__mark !== 1, null, 20000).then(() => true, () => false);
const atab = p => p.evaluate(() => window.LK_PREP && window.LK_PREP.state.atab);
// the update strip, as when the service worker has saved a new version (more than 8 seconds after opening)
async function updBar(p) {
  await p.clock.fastForward(10000);
  await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
  await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 3000).catch(() => {});
}
const laptop = (page, hash) => ({ admin: true, who: '', adminPage: page, width: 1280, height: 900, wait: 2500 });
(async () => {
  const b = await L.start();

  // the laptop left on Insights takes an update by itself: it reopens on the Dashboard
  let p = await L.open(b, '#/admin', laptop('insights'));
  await L.waitFor(p, () => window.LK_PREP && window.LK_PREP.state.atab === 'insights', null, 10000).catch(() => {});
  ok(await atab(p) === 'insights', 'the laptop opens on Insights, the page it was left on');
  await updBar(p); await mark(p);
  await p.clock.fastForward('02:30');   // 2 minutes untouched: the automatic update
  // it looks every 20 seconds and checks the signal first; an idle screen keeps ticking until it reloads
  let went = false;
  for (let i = 0; i < 4 && !went; i++) { went = await L.waitFor(p, () => window.__mark !== 1, null, 8000).then(() => true, () => false); if (!went) await p.clock.fastForward('00:30').catch(() => {}); }
  await L.waitFor(p, () => !!(window.LK_PREP && window.LK_PREP.state && document.querySelector('#prep-root')), null, 15000).catch(() => {});
  await L.settle(p, 1500);
  ok(went, 'the update nobody asked for reloads the book');
  ok(await atab(p) === 'dashboard', 'after it the admin panel opens on the Dashboard, not Insights (' + await atab(p) + ')');
  ok(await p.evaluate(() => { try { return sessionStorage.getItem('lk.upd.auto'); } catch (e) { return 'x'; } }) === null, 'the note is read once and gone');
  await p.evaluate(() => { location.reload(); }); await L.settle(p, 3000);
  ok(await atab(p) === 'dashboard', 'a reload by hand after that keeps the Dashboard, the page now open');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Update now, tapped: the head chef asked, so the panel stays on the report
  p = await L.open(b, '#/admin', laptop('team'));
  await L.waitFor(p, () => window.LK_PREP && window.LK_PREP.state.atab === 'team', null, 10000).catch(() => {});
  await updBar(p); await mark(p);
  await p.click('.upd-bar button').catch(() => {});
  await waitReload(p);
  await L.waitFor(p, () => !!(window.LK_PREP && window.LK_PREP.state), null, 15000).catch(() => {});
  await L.settle(p, 1500);
  ok(await atab(p) === 'team', 'Update now keeps the page the head chef was on (' + await atab(p) + ')');
  await p.context().close();

  // a reload by hand with no update: the page stays
  p = await L.open(b, '#/admin', laptop('waste'));
  await L.waitFor(p, () => window.LK_PREP && window.LK_PREP.state.atab === 'waste', null, 10000).catch(() => {});
  await p.evaluate(() => { location.reload(); }); await L.settle(p, 3000);
  ok(await atab(p) === 'waste', 'a reload by hand keeps Wastage');
  await p.context().close();

  // a light page stays as it is after an update nobody asked for
  p = await L.open(b, '#/admin', Object.assign(laptop('people'), { init: () => { try { if (!sessionStorage.getItem('seen')) { sessionStorage.setItem('lk.upd.auto', '1'); sessionStorage.setItem('seen', '1'); } } catch (e) {} } }));
  await L.settle(p, 1500);
  ok(await atab(p) === 'people', 'Team, People reads little, so it stays after an update nobody asked for');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
