// The Install the app card and the Settings section on computers (20 Oct 2026): Windows and Mac computers see them too,
// with an Install button when the browser offers one and the right steps by hand when it does not.
const L = require('./lib');
const { R, ok } = L.results();
const WIN_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const WIN_EDGE = WIN_CHROME + ' Edg/130.0.0.0';
const WIN_FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const MAC_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const card = p => p.evaluate(() => { const e = document.querySelector('.wall-install'); return e ? { text: e.querySelector('.wi-m').textContent, btn: !!e.querySelector('[data-act="install"]') } : null; });
const setting = p => p.evaluate(() => { const e = document.querySelector('[aria-label="Install the app"].set-block'); return e ? { text: e.textContent, btn: !!e.querySelector('[data-act="install"]') } : null; });
const offer = p => p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => Promise.resolve(); e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });
(async () => {
  const b = await L.start();
  const open = (ua, hash) => L.open(b, hash || '#/', { ua, width: 1280, height: 800, settings: { installNo: false }, wait: 900 });

  // Windows, Chrome or Edge, before the browser has offered its own button: the steps by hand
  let p = await open(WIN_CHROME);
  let c = await card(p);
  ok(c && !c.btn && /install icon at the right of the address bar/.test(c.text) && /Edge/.test(c.text), 'Windows, Chrome: the card shows on a computer with the steps by hand (' + JSON.stringify(c) + ')');
  ok(!(await L.overflow(p)), 'Windows, Chrome: no sideways scroll with the card (' + await L.overflow(p) + ')');
  // the browser then offers its own Install button
  await offer(p);
  await L.settle(p, 300);
  c = await card(p);
  ok(c && c.btn && /on this computer/.test(c.text) && /taskbar or Dock/.test(c.text), 'Windows, Chrome: when the browser offers it, the card has an Install button for this computer (' + JSON.stringify(c) + ')');
  await p.click('.wall-install [data-act="install"]');
  await L.settle(p, 400);
  ok(!(await card(p)) || !(await card(p)).btn, 'Windows, Chrome: tapping Install uses the browser offer once (no second button)');
  ok(p.errors.length === 0, 'Windows, Chrome: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Not now hides the card on that computer
  p = await open(WIN_EDGE);
  ok(!!(await card(p)), 'Windows, Edge: the card shows');
  await p.click('.wall-install [data-act="installno"]');
  await L.settle(p, 300);
  ok(!(await card(p)), 'Windows, Edge: Not now hides the card');
  await p.context().close();

  // Mac: Safari uses File, Add to Dock; Chrome has the address bar icon
  p = await open(MAC_SAFARI);
  c = await card(p);
  ok(c && /File, Add to Dock/.test(c.text), 'Mac, Safari: the card says File, Add to Dock (' + JSON.stringify(c) + ')');
  await p.context().close();
  p = await open(MAC_CHROME);
  c = await card(p);
  ok(c && /install icon at the right of the address bar/.test(c.text), 'Mac, Chrome: the card points to the install icon (' + JSON.stringify(c) + ')');
  await p.context().close();

  // Firefox on a computer cannot install apps: the card says so and names Edge and Chrome
  p = await open(WIN_FIREFOX);
  c = await card(p);
  ok(c && /Firefox on a computer cannot install apps/.test(c.text) && /Edge/.test(c.text) && /Chrome/.test(c.text), 'Windows, Firefox: the card says to use Edge or Chrome (' + JSON.stringify(c) + ')');
  await p.context().close();

  // Settings has the same section on a computer, with the button once the browser offers it
  p = await open(WIN_CHROME, '#/settings');
  let s = await setting(p);
  ok(s && !s.btn && /install icon at the right of the address bar/.test(s.text), 'Windows, Settings: the steps by hand (' + JSON.stringify(s) + ')');
  await offer(p);
  await L.settle(p, 300);
  s = await setting(p);
  ok(s && s.btn, 'Windows, Settings: an Install button once the browser offers it (' + JSON.stringify(s) + ')');
  await p.context().close();
  p = await open(MAC_SAFARI, '#/settings');
  s = await setting(p);
  ok(s && /File, Add to Dock/.test(s.text), 'Mac, Safari, Settings: File, Add to Dock (' + JSON.stringify(s) + ')');
  await p.context().close();

  // iPhone is unchanged: Share, then Add to Home Screen
  p = await L.open(b, '#/', { ua: IPHONE, width: 390, height: 844, touch: true, settings: { installNo: false }, wait: 900 });
  c = await card(p);
  ok(c && /Add to Home Screen/.test(c.text), 'iPhone: still Share, then Add to Home Screen (' + JSON.stringify(c) + ')');
  ok(!(await L.overflow(p)), 'iPhone: no sideways scroll with the card (' + await L.overflow(p) + ')');
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
