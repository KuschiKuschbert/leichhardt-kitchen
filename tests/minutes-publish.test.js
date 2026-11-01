// Publishing minutes says what is happening (23 Oct 2026): the head chef tapped Publish on a weak signal and could not
// tell whether the minutes went out. The button said nothing, the register still showed the older minutes. Now the
// button says Publishing..., a save with no answer after 4 s says it is waiting for the signal, and a publish that went
// through says so on screen, in a toast and in the register (with its time). A refused publish or missing attendance
// is said where the head chef is looking, on a phone with a long staff list.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: true, active: true });
const names = ['Sam', 'Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ida', 'Jo', 'Kit', 'Lou', 'Max', 'Ned', 'Oli', 'Pip', 'Roo'];
const people = names.map((n, i) => P(n.toLowerCase(), n, i === 0 ? 'sous' : 'staff'));
const week = L.NOW - 7 * 86400000;
const extra = {
  [fsKey(['config', 'main'])]: { people, sousIds: ['sam'], showBadges: true },
  [fsKey(['minutes', 'm1'])]: { no: 1, v: 1, status: 'published', date: L.ymd(new Date(week)), decisions: 'Old decision', att: people.map(p => ({ id: p.id, st: 'present' })), acts: [], pubAt: week, at: week, upd: week, removed: false }
};
// the message box the minutes write into, and whether all of it is on screen: under the sticky admin bar and above the
// tab bar at the foot of a phone screen (which covers the bottom 68 px)
const say = p => p.evaluate(() => {
  const e = document.querySelector('.mn-say:not(:empty)'); if (!e) return null;
  const r = e.getBoundingClientRect(), bar = document.querySelector('.a-nav'), tb = document.querySelector('.tabbar');
  const top = bar ? bar.getBoundingClientRect().bottom : 0, foot = tb && tb.getClientRects().length ? tb.getBoundingClientRect().top : innerHeight;
  return { t: e.textContent, seen: r.top >= top - 1 && r.bottom <= foot + 1, top: Math.round(r.top), bottom: Math.round(r.bottom), bar: Math.round(top), foot: Math.round(foot) };
});
const store = p => p.evaluate(() => window.__fake.dump());
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, who: '', wait: 1800, extra });
  await L.adminTab(p, 'minutes');
  await L.settle(p, 400);
  await p.click('[data-p="mn-tpl"]');
  await L.settle(p, 300);

  // attendance not set: the message shows where the head chef is looking, not under the 18 names that just opened.
  // Safari on an iPhone does not hold the page still while a box above grows (Chrome's scroll anchoring), so neither
  // does this page: the message has to be brought on screen by the book itself
  await p.addStyleTag({ content: '* { overflow-anchor: none !important; }' });
  await p.$eval('[data-p="mn-pub"]', e => e.scrollIntoView({ block: 'end' }));
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 300);
  let s = await say(p);
  ok(s && /Set attendance for Sam/.test(s.t) && s.seen, 'no attendance: the message is on screen (' + JSON.stringify(s) + ')');

  await p.click('[data-p="mn-all"]'); await L.settle(p, 150);
  // a weak signal: the write waits for the server
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 150);
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 200);
  ok(/Publishing\.\.\./.test(await txt(p, '[data-p="mn-pub"]') || ''), 'publishing: the button says Publishing...');
  s = await say(p);
  ok(s && /^Publishing\.\.\.$/.test(s.t), 'publishing: the message says Publishing... (' + (s && s.t) + ')');
  await L.waitFor(p, () => /Waiting for the signal/.test((document.querySelector('.mn-say:not(:empty)') || {}).textContent || ''), null, 7000).catch(() => {});
  s = await say(p);
  // 27 Oct 2026: a write waiting for the signal lives only in this tab's memory, so it says to keep the book open, not "kept on this device"
  ok(s && /Waiting for the signal\. Keep the book open: the minutes go to the team when the signal is back/.test(s.t) && !/kept on this device/.test(s.t) && s.seen, 'no answer after 4 s: it says it is waiting for the signal and to keep the book open, on screen (' + JSON.stringify(s) + ')');
  ok(!!(await p.$('.mn-form')), 'still waiting: the form stays open');

  // the signal is back: the publish goes through
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.waitFor(p, () => /published at/.test((document.querySelector('.mn-say:not(:empty)') || {}).textContent || ''), null, 5000).catch(() => {});
  s = await say(p);
  ok(s && /^Minutes 02 published at \d\d:\d\d\. Staff can read and sign them now\.$/.test(s.t) && s.seen, 'published: the message names the minutes and the time, on screen (' + JSON.stringify(s) + ')');
  ok(/Minutes 02 published\./.test(await txt(p, '.p-toast') || ''), 'published: a toast says so');
  ok(!(await p.$('.mn-form')), 'published: the form is closed');
  const hint = await txt(p, '.mn-print .hint') || '';
  ok(/^Minutes 02, .*version 1, published \w+, \d+ \w+ at \d\d:\d\d\./.test(hint), 'published: the register shows the new minutes and when they were published (' + hint.slice(0, 80) + ')');
  ok(/Not signed/.test(await txt(p, '.mn-tiles') || '') && /0\s*of 19/.test(await txt(p, '.mn-tiles') || ''), 'published: the register counts all 19 people, including the daily head-PIN owner');
  const st = await store(p), key = Object.keys(st).find(k => /\/minutes\/[^/]+$/.test(k) && st[k].no === 2);
  ok(!!key && st[key].status === 'published' && typeof st[key].pubAt === 'number', 'published: minutes 02 are in the store, published');

  // refused (the rules say no): said on screen, the form stays so nothing is lost
  await p.click('[data-p="mn-new"]'); await L.settle(p, 300);
  await p.fill('[data-k="mn-decisions"]', 'Probe every chicken');
  await p.evaluate(() => { const b = document.querySelector('[data-p="mn-attopen"]'); if (b && !document.querySelector('[data-p="mn-all"]')) b.click(); });
  await L.settle(p, 100);
  await p.click('[data-p="mn-all"]'); await L.settle(p, 150);
  await p.evaluate(() => { window.__fake.mode = 'deny'; });
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 150);
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 400);
  s = await say(p);
  ok(s && /^Not published\. Only the head chef can write minutes/.test(s.t) && s.seen, 'refused: it says Not published, on screen (' + JSON.stringify(s) + ')');
  ok(/Probe every chicken/.test(await p.$eval('[data-k="mn-decisions"]', e => e.value).catch(() => '')), 'refused: the form keeps what was written');

  ok(!(await L.overflow(p)), 'minutes publish: no sideways scroll');
  ok(p.errors.length === 0, 'minutes publish: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
