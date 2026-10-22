// Shift pings at a set time of day (22 Oct 2026). A ping with its own time (tm, minutes after midnight) stays out of
// sight until then and pops up at that time from the phone's own once-a-minute check: no reads. A ping saved for today
// stamps config/main.pastEdit.n, so the other phones read the pings again at once (one query each) instead of after
// 30 minutes away. Every page opens at 14:00 kitchen time; the clock then runs on. The phones are touch phones, so the
// laptop idle lock (7.5 minutes) does not send them to the PIN screen while the clock runs an hour on.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const ping = (id, text, x) => ({ [fsKey(['notes', id])]: Object.assign({ text, tag: 'none', start: today, until: today, dows: [], removed: false, at: 1, upd: 1, by: 'sam', author: 'sam' }, x || {}) });
const popTexts = p => p.evaluate(() => [...document.querySelectorAll('.nt .nt-i')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
const bell = p => p.evaluate(() => { const b = document.querySelector('.nbell'); return b ? (b.hidden ? 0 : +(String(b.getAttribute('aria-label')).match(/^\d+/) || [0])[0]) : -1; });
const notesReads = p => p.evaluate(k => window.__fake.reads.filter(r => r === k).length, fsKey(['notes']));

(async () => {
  const b = await L.start();

  // 14:00: the usual ping pops up; the 15:00 one is out of sight until 15:00, then pops up marked New with its time
  let p = await L.open(b, '#/prep', { who: 'ann', touch: true, extra: Object.assign(ping('n1', 'Delivery: Bidfood at the back door'), ping('n2', 'Fryer oil change before service', { tm: 900 })), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt')).catch(() => {});
  let t = await popTexts(p);
  ok(t.length === 1 && /Bidfood/.test(t[0]), 'at 14:00 the popup shows only the usual ping (' + t.join(' | ') + ')');
  ok(await bell(p) === 1, 'and the bell counts 1 (' + await bell(p) + ')');
  await p.click('.nt-got'); await L.settle(p, 200);
  await p.clock.runFor(61 * 60000); await L.settle(p, 400);
  await L.waitFor(p, () => !!document.querySelector('.nt')).catch(() => {});
  t = await popTexts(p);
  ok(t.length === 2 && t.some(x => /^New Ping 15:00\s*Fryer oil/.test(x)) && t.some(x => /^Ping\s*Delivery: Bidfood/.test(x)), 'at 15:00 it pops up again: the 15:00 ping marked New with its time, the other one not (' + t.join(' | ') + ')');
  ok(await bell(p) === 2, 'and the bell counts 2 (' + await bell(p) + ')');
  ok(p.errors.length === 0, 'timed: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a ping set for 08:00 pops up at 08:00, before the usual 10:30
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, clock: L.NOW - 7 * 3600000, extra: ping('n3', 'Safety: walk-in door sticks, use the side handle', { tag: 'safety', tm: 480 }), wait: 2000 });
  ok(await p.$('.nt') === null && await bell(p) === 0, 'at 07:00 the 08:00 ping is out of sight (no popup, no bell)');
  await p.clock.runFor(61 * 60000); await L.settle(p, 400);
  await L.waitFor(p, () => !!document.querySelector('.nt')).catch(() => {});
  t = await popTexts(p);
  ok(t.length === 1 && /^Safety 08:00\s*Safety: walk-in/.test(t[0]), 'at 08:00 it pops up, before 10:30 (' + t.join(' | ') + ')');
  await p.context().close();

  // a sous chef sets a time in the editor, then takes it away; a ping for today stamps pastEdit.n
  p = await L.open(b, '#/prep', { who: 'sam', wait: 2000 });
  await L.chef(p, 'pings'); await L.settle(p, 400);
  await tap(p, '[data-p="n-new"]'); await L.settle(p, 200);
  await p.fill('[data-k="n-text"]', 'Pre-service briefing at the pass');
  await p.fill('[data-k="n-tm"]', '15:30'); await p.$eval('[data-k="n-tm"]', e => e.dispatchEvent(new Event('change', { bubbles: true }))); await L.settle(p, 150);
  ok(/Today, from 15:30/.test(await txt(p, '.nt-whenline') || ''), 'editor: the time shows in when it shows (' + await txt(p, '.nt-whenline') + ')');
  await tap(p, '[data-p="n-save"]'); await L.settle(p, 600);
  let s = await store(p), id = Object.keys(s).filter(k => k.indexOf('/notes/') > 0 && s[k].text === 'Pre-service briefing at the pass')[0];
  ok(id && s[id].tm === 930, 'editor: saved with tm 930 (15:30) (' + (id && s[id].tm) + ')');
  ok(s[CFG].pastEdit && s[CFG].pastEdit.n > 0, 'a ping for today stamps config/main.pastEdit.n, so the other phones read the pings again');
  await tap(p, '[data-p="n-edit"][data-id="' + id.split('/').pop() + '"]'); await L.settle(p, 200);
  ok(await p.inputValue('[data-k="n-tm"]') === '15:30', 'editor: an edit opens with its time');
  await tap(p, '[data-p="n-tmclr"]'); await L.settle(p, 150);
  await tap(p, '[data-p="n-save"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[id].tm === null, 'editor: No set time saves tm as null, so the time is gone (' + s[id].tm + ')');
  ok(p.errors.length === 0, 'editor: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // another phone stamps a change to today's pings: this phone reads the pings again, once per stamp
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2000 });
  const before = await notesReads(p);
  await p.evaluate(a => window.__fake.write(a.k, Object.assign({}, window.__fake.dump()[a.k], { pastEdit: { n: Date.now() + 60000 } })), { k: CFG });
  await L.waitFor(p, a => window.__fake.reads.filter(r => r === a.k).length > a.n, { k: fsKey(['notes']), n: before }).catch(() => {});
  const after = await notesReads(p);
  ok(after === before + 1, 'a stamp from another phone: the pings are read again, once (' + before + ' then ' + after + ')');
  await p.evaluate(a => window.__fake.write(a.k, Object.assign({}, window.__fake.dump()[a.k], { showBadges: false })), { k: CFG });
  await L.settle(p, 400);
  ok(await notesReads(p) === after, 'another change to the config with the same stamp reads nothing more');
  ok(p.errors.length === 0, 'stamp: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
