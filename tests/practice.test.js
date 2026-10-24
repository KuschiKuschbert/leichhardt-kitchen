// Practice on this device (22 Oct 2026, review Q9): on the head chef's device Settings has a Practice switch; lines
// written while it is on are marked tst (the nightly job leaves them out), and the prep pages say practice mode is on.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/settings', { admin: true, who: '', wait: 1800 });
  // The owner-only control appears after the Google account check, just as the following click waits for it.
  await L.waitFor(p, () => !!document.querySelector('[data-act="setpractice"][data-val="1"]'), null, 8000);
  ok(!!(await p.$('[data-act="setpractice"][data-val="1"]')), 'head chef device: Settings has Practice on this device');
  await p.click('[data-act="setpractice"][data-val="1"]'); await L.settle(p, 200);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lk.settings.v1')).practice === true), 'On is kept on this device');
  await p.context().close();

  p = await L.open(b, '#/prep', { settings: { practice: true }, wait: 1800 });
  ok(/Practice mode/.test(await L.txt(p, '.p-practice') || ''), 'practice on: the prep list says so');
  await p.fill('#p-text', 'Try a line'); await p.keyboard.press('Enter'); await L.settle(p, 500);
  const line = await p.evaluate(() => Object.values(window.__fake.dump()).filter(v => v && v.text === 'Try a line')[0]);
  ok(line && line.tst === true, 'practice on: a new line is marked as practice');
  await p.context().close();

  p = await L.open(b, '#/prep', { wait: 1800 });
  ok(!(await p.$('.p-practice')), 'practice off: no strip');
  await p.fill('#p-text', 'Real line'); await p.keyboard.press('Enter'); await L.settle(p, 500);
  const real = await p.evaluate(() => Object.values(window.__fake.dump()).filter(v => v && v.text === 'Real line')[0]);
  ok(real && !('tst' in real), 'practice off: lines are not marked');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/settings', { who: 'ann', wait: 1500 });
  ok(!(await p.$('[data-act="setpractice"]')), 'a staff phone has no Practice switch');
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
