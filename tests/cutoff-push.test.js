// Phone pushes for order cut-offs (24 Oct 2026): a chef turns them on for their own phone on the order list. The phone
// gets a push address (Firebase Cloud Messaging, the stand-in in tests/fake) and keeps it in push/<hash>; the server
// sends the pushes (scripts/cutoff-push.mjs, checked on the emulator by scripts/emulator-check.mjs). Ordered on the bar
// tells the server too (cutdone/<day>). The pages open at 14:00.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW)), dow = new Date(L.NOW).getDay(), next = (dow + 1) % 7;
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const CUTS = [{ id: 'pfd', name: 'PFD', dd: [next], at: 15 * 60, pre: 1 }];
const extra = { [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, cutoffs: CUTS } };
const pushes = s => Object.keys(s).filter(k => k.indexOf('/push/') > 0).map(k => s[k]);
// what the test browser lacks: the notification permission (granted, or as set) and a running service worker
const init = perm => () => {
  let p = 'default';
  try { Object.defineProperty(Notification, 'permission', { get: () => p, configurable: true }); } catch (e) {}
  Notification.requestPermission = () => { p = window.__answer || PERM; return Promise.resolve(p); };
  if (!window.PushManager) window.PushManager = function () {};
  try { Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve({ scope: '/' }), configurable: true }); } catch (e) {}
};
const withPerm = perm => '(' + init.toString().replace('PERM', JSON.stringify(perm)) + ')()()';

(async () => {
  const b = await L.start();
  let p, s;

  // Sam, a sous chef, turns pushes on
  p = await L.open(b, '#/orders', { who: 'sam', extra, wait: 1500, init: withPerm('granted') });
  await L.waitFor(p, () => !!document.querySelector('[data-p="cut-push-on"]'), null, 10000);
  ok(/even with the book closed/.test(await txt(p, '.cut-push')), 'sous chef: the order list offers pushes');
  await p.click('[data-p="cut-push-on"]');
  await L.waitFor(p, () => !!document.querySelector('[data-p="cut-push-off"]'), null, 10000);
  s = await store(p);
  let ps = pushes(s);
  ok(ps.length === 1 && ps[0].tok === 'fake-push-token-1' && ps[0].by === 'sam' && typeof ps[0].at === 'number' && typeof ps[0].ua === 'string', 'turn on: the push address is saved as Sam\'s (' + JSON.stringify(ps) + ')');
  ok(await p.evaluate(() => window.__pushReg === true), 'turn on: the address comes through the book\'s own service worker');
  ok(/Pushes are on/.test(await txt(p, '.cut-push')) && /hour before/.test(await txt(p, '.cut-push-msg')), 'turn on: the page says it is on');
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.push')));
  ok(kept && kept.by === 'sam' && kept.day && /^[0-9a-f]{64}$/.test(kept.h), 'turn on: the phone remembers it (lk.push)');
  // Ordered on the bar tells the server
  await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"]'), null, 10000);
  await p.click('#cut-band [data-cut="done"]'); await L.settle(p, 500);
  s = await store(p);
  const cd = s[fsKey(['cutdone', today + '_pfd'])];
  ok(cd && cd.on === true && cd.by === 'sam' && cd.sid === 'pfd' && cd.day === today && typeof cd.at === 'number', 'Ordered: ticked for everyone, so no more pushes for PFD today (' + JSON.stringify(cd) + ')');
  // turn off
  await p.click('[data-p="cut-push-off"]');
  await L.waitFor(p, () => !!document.querySelector('[data-p="cut-push-on"]'), null, 10000);
  s = await store(p);
  ok(pushes(s).length === 0 && await p.evaluate(() => !localStorage.getItem('lk.push') && window.__pushDeleted === true), 'turn off: the address is removed, here and from Firebase');
  ok(!(await L.overflow(p)), 'fits a phone');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a new kitchen day: a phone that is on writes its address again by itself (no tap)
  p = await L.open(b, '#/orders', { who: 'sam', extra, wait: 1500, init: '(' + (() => { if (!sessionStorage.getItem('kept')) { sessionStorage.setItem('kept', '1'); localStorage.setItem('lk.push', JSON.stringify({ h: 'old', by: 'sam', day: '2026-01-01' })); } }).toString() + ')();' + withPerm('granted') });
  await p.evaluate(() => { try { Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true }); } catch (e) {} });
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 300);
  await p.evaluate(() => { location.hash = '#/orders'; });
  await L.waitFor(p, () => { try { return JSON.parse(localStorage.getItem('lk.push')).day !== '2026-01-01'; } catch (e) { return false; } }, null, 10000);
  s = await store(p);
  ok(pushes(s).length === 1 && pushes(s)[0].by === 'sam', 'next day: the address is written again by itself');
  await p.context().close();

  // the phone says no
  p = await L.open(b, '#/orders', { who: 'sam', extra, wait: 1500, init: withPerm('denied') });
  await L.waitFor(p, () => !!document.querySelector('[data-p="cut-push-on"]'), null, 10000);
  await p.click('[data-p="cut-push-on"]');
  await L.waitFor(p, () => /said no/.test((document.querySelector('.cut-push-msg') || {}).textContent || ''), null, 10000);
  s = await store(p);
  ok(pushes(s).length === 0, 'denied: nothing is saved, and the page says how to allow it');
  await p.context().close();

  // an iPhone in Safari, not from the home screen: add it to the home screen first
  p = await L.open(b, '#/orders', { who: 'sam', extra, wait: 1500, init: withPerm('granted'), ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  await L.waitFor(p, () => !!document.querySelector('.cut-push'), null, 10000);
  ok(/home screen/.test(await txt(p, '.cut-push')), 'iPhone: it says to add the book to the home screen first');
  await p.click('[data-p="cut-push-on"]'); await L.settle(p, 500);
  s = await store(p);
  ok(pushes(s).length === 0 && await p.evaluate(() => !window.__pushGot), 'iPhone: nothing is asked or saved from Safari');
  await p.context().close();

  // staff see none of it
  p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 2000, init: withPerm('granted') });
  await L.settle(p, 500);
  ok(!(await p.$('.cut-push')), 'staff: no pushes offered');
  await p.context().close();

  // the head chef's Google account, nobody signed in: on the admin Order cut-offs page, saved as owner
  p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 2000, init: withPerm('granted') });
  await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => !!document.querySelector('[data-p="cut-push-on"]'), null, 10000);
  await p.click('[data-p="cut-push-on"]');
  await L.waitFor(p, () => !!document.querySelector('[data-p="cut-push-off"]'), null, 10000);
  s = await store(p);
  ok(pushes(s).length === 1 && pushes(s)[0].by === 'owner', 'Google account: saved as the head chef\'s (owner)');
  await p.context().close();

  await b.close();
  L.report(R);
})();
