// The installed app opened again with an address (the kitchen tablet's Home button, a shared link) moves the open
// book to that page instead of loading it again (16 Nov 2026, manifest launch_handler focus-existing + launchQueue).
// Chrome's launchQueue is stood in for: the consumer the book sets is called the way Chrome calls it.
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const { R, ok } = L.results();
// Chrome has its own launchQueue (a read-only property), so the stand-in is defined over it.
const init = () => { Object.defineProperty(window, 'launchQueue', { configurable: true, value: { setConsumer(f) { window.__launch = f; } } }); };
const launch = (p, h) => p.evaluate(v => { window.__launch({ targetURL: location.origin + location.pathname + v }); }, h);
const hash = p => p.evaluate(() => location.hash);

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  ok(JSON.stringify(manifest.launch_handler) === JSON.stringify({ client_mode: ['focus-existing', 'auto'] }), 'the manifest keeps the open book on a launch (focus-existing, then auto)');
  const b = await L.start();

  let p = await L.open(b, '#/orders', { width: 1280, height: 800, init, wait: 1500 });
  ok(await p.evaluate(() => typeof window.__launch === 'function'), 'the book takes the app launches');
  await p.evaluate(() => { window.__same = 1; });
  await launch(p, '#/');
  await L.settle(p, 300);
  ok(await hash(p) === '#/orders', 'a plain launch of the start page leaves the book where it is');
  await launch(p, '#/kiosk-home');
  await L.waitFor(p, () => location.hash === '#/', null, 6000);
  await L.settle(p, 300);
  ok(await p.evaluate(() => window.__same === 1), 'the tablet Home button goes Home without loading the book again');
  ok(await p.evaluate(() => !document.querySelector('.wtop [data-act="back"]')), 'and shows the book Home page');
  await launch(p, '#/prep');
  await L.waitFor(p, () => location.hash === '#/prep', null, 6000);
  ok(await p.evaluate(() => window.__same === 1), 'a link to a page moves the open book there, without loading it again');
  ok(p.errors.length === 0, 'open book: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // The app started cold by the Home button: #/kiosk-home becomes #/ in place (no extra Back step).
  p = await L.open(b, '#/kiosk-home', { width: 1280, height: 800, init, wait: 1500 });
  const before = await p.evaluate(() => history.length);
  await launch(p, '#/kiosk-home');
  await L.waitFor(p, () => location.hash === '#/', null, 6000);
  ok(await p.evaluate(() => history.length) === before, 'a cold start from the Home button lands on #/ without an extra history step');
  ok(p.errors.length === 0, 'cold start: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
