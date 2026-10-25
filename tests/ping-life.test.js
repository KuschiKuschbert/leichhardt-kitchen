// A shift ping is on screen for 30 minutes from when it pops up, then gone for everyone (head chef, 24 Oct 2026:
// Safety and Allergen alert too, no erase button): it pops up at 10:30, at its own time, or when it was saved for today
// after that. Close puts it off and it never pops up again by itself; a sheet nobody touches goes after 30 minutes;
// removing a ping does not pop the rest up again; nothing pops up over Who are you? or a live Undo. No reads for any of it.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000));
const MIN = 60000;
const ping = (id, text, x) => ({ [fsKey(['notes', id])]: Object.assign({ text, tag: 'none', start: today, until: today, dows: [], tm: null, removed: false, at: 1, by: 'sam', author: 'sam' }, x || {}) });
const mins = () => ({ [fsKey(['minutes', 'm1'])]: { no: 1, v: 1, status: 'published', date: today, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
  att: [{ id: 'ann', st: 'present' }, { id: 'sam', st: 'present' }], guests: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '',
  acts: [], next: '', pubAt: L.NOW - 3600000, removed: false, at: 1, upd: 1, by: 'sam' } });
const sheet = p => p.$('.nt-wrap').then(Boolean);
const dot = p => p.evaluate(() => { const b = document.querySelector('.nbell'); return !!b && !b.hidden && b.classList.contains('has-new'); });
const label = p => p.evaluate(() => (document.querySelector('.nbell') || { getAttribute: () => '' }).getAttribute('aria-label') || '');
// a change saved on another phone: the ping itself, then the stamp that makes this phone read the pings again
async function fromAnotherPhone(p, id, data) {
  await p.evaluate(a => { const d = window.__fake.dump(); window.__fake.write(a.k, Object.assign({}, d[a.k] || {}, a.data, { upd: Date.now() })); window.__fake.write(a.c, Object.assign({}, d[a.c], { pastEdit: { n: Date.now() + 1000 } })); }, { k: fsKey(['notes', id]), data, c: CFG });
  await L.settle(p, 800);
}

(async () => {
  const b = await L.start();
  let p;

  // a ping with no set time: out of sight at 10:29, pops up at 10:30, still on at 10:59, gone for everyone at 11:00
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, clock: L.NOW - (3 * 60 + 31) * MIN, extra: ping('n1', 'Special: pork belly tonight', { tag: 'special' }), wait: 2000 });
  ok(!(await sheet(p)) && !(await dot(p)) && /^No shift pings on now/.test(await label(p)), '10:29: nothing yet (' + await label(p) + ')');
  await p.clock.runFor(61000); await L.settle(p, 500);
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(await sheet(p) && /pork belly/.test(await txt(p, '.nt-list') || ''), '10:30: it pops up');
  await p.clock.runFor(29 * MIN); await L.settle(p, 300);
  ok(await sheet(p) && await dot(p), '10:59: still on, with the dot');
  await p.clock.runFor(61000); await L.settle(p, 400);
  ok(!(await sheet(p)) && !(await dot(p)) && /^No shift pings on now/.test(await label(p)), '11:00: gone for everyone, the sheet closed by itself, no dot');
  ok(await p.evaluate(() => !localStorage.getItem('lk.note.seen.ann')), '11:00: nothing was marked read');
  await p.click('.nbell'); await L.settle(p, 300);
  ok(/No pings right now/.test(await txt(p, '.nt') || ''), '11:00: the bell has no pings');
  ok(p.errors.length === 0, 'no time: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a ping saved at 13:00 for today: it pops up then and is on until 13:30
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, clock: L.NOW - 50 * MIN, extra: ping('n2', 'Delivery: PFD is running late', { tag: 'delivery', at: L.NOW - 60 * MIN, upd: L.NOW - 60 * MIN }), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(await sheet(p), '13:10: the ping saved at 13:00 is on');
  await p.clock.runFor(21 * MIN); await L.settle(p, 400);
  ok(!(await sheet(p)) && !(await dot(p)), '13:31: gone (saved at 13:00, on until 13:30)');
  await p.context().close();

  // Close puts it off: it never pops up again by itself, not even after a reload. A new ping still pops up.
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, extra: ping('n3', 'Safety: walk-in door sticks', { tag: 'safety', tm: 835 }), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-later')).catch(() => {});
  ok(await txt(p, '.nt-later') === 'Close' && /^Got it$/.test(await txt(p, '.nt-got') || ''), 'the sheet: Got it and Close, no Later');
  await p.click('.nt-later'); await L.settle(p, 300);
  await p.clock.runFor(16 * MIN); await L.settle(p, 300);
  ok(!(await sheet(p)) && await dot(p), 'Close: no come-back after 15 minutes, the dot stays while it is on');
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1500);
  await p.clock.runFor(61000); await L.settle(p, 300);
  ok(!(await sheet(p)), 'Close: not after a reload either');
  await fromAnotherPhone(p, 'n4', { text: 'Delivery: Bidfood at the back door', tag: 'delivery', start: today, until: today, dows: [], tm: null, removed: false, at: 1, by: 'sam', author: 'sam' });
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(/Bidfood/.test(await txt(p, '.nt-list') || ''), 'a new ping saved on another phone still pops up');
  ok(p.errors.length === 0, 'Close: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // removing one ping on another phone does not pop the rest up again
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, extra: Object.assign(ping('n5', 'Special: pork belly', { tag: 'special', tm: 835 }), ping('n6', 'Delivery: PFD at 15:00', { tag: 'delivery', tm: 835 })), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  await p.click('.nt-got'); await L.settle(p, 300);
  await fromAnotherPhone(p, 'n6', { removed: true });
  await p.clock.runFor(61000); await L.settle(p, 300);
  ok(!(await sheet(p)) && !(await dot(p)), 'a ping removed elsewhere: no sheet and no dot for the pings already read');
  await p.context().close();

  // a ping set for every day comes back the next day at its time, for another 30 minutes
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, clock: L.NOW + 86400000, extra: ping('n7', 'Fryer oil change before service', { start: today, until: tomorrow, tm: 835 }), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(/Fryer oil/.test(await txt(p, '.nt-list') || ''), 'the next day: on again from its time');
  await p.clock.runFor(26 * MIN); await L.settle(p, 300);
  ok(!(await sheet(p)), 'the next day: gone again 30 minutes later');
  await p.context().close();

  // a sheet nobody touches goes after 30 minutes, minutes to sign and all; the bell keeps its dot for the minutes
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, extra: mins(), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nbell.has-new')).catch(() => {});
  await p.click('.nbell'); await L.settle(p, 300);
  ok(/Kitchen meeting/.test(await txt(p, '.nt') || ''), 'the bell: the minutes to sign');
  await p.clock.runFor(31 * MIN); await L.settle(p, 300);
  ok(!(await sheet(p)) && await dot(p), 'untouched for 30 minutes: the sheet goes, the dot stays for the minutes');
  await p.context().close();

  // nothing pops up over Who are you?: it waits until someone signs in, or the page changes
  p = await L.open(b, '#/prep', { who: '', touch: true, extra: ping('n8', 'Safety: fryer 2 is out', { tag: 'safety', tm: 835 }), wait: 2000 });
  await p.clock.runFor(61000); await L.settle(p, 300);
  ok(!(await sheet(p)) && !!(await p.$('.p-names')), 'Who are you?: no sheet over the names');
  await p.evaluate(() => { location.hash = '#/'; }); await L.settle(p, 500);
  await p.clock.runFor(61000); await L.settle(p, 300);
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(!(await sheet(p)), 'signed out: pings remain hidden on every page');
  await p.context().close();

  // nothing pops up over a live Undo: a ping due at 14:01 waits while the Ticked toast is up, then comes at the next minute
  p = await L.open(b, '#/prep', { who: 'sam', touch: true, extra: ping('n9', 'Delivery: Bidfood at 14:30', { tag: 'delivery', tm: 841, by: 'ann', author: 'ann' }), wait: 2000 });
  await p.clock.runFor(55000); await L.settle(p, 200);
  await p.click('[data-p="tick"][data-id="i1"]'); await L.settle(p, 200);
  ok(await p.evaluate(() => !!window.LK_PREP.state.toastAct), 'tick: the Undo toast is up');
  await p.clock.runFor(6000); await L.settle(p, 300);
  ok(!(await sheet(p)) && await p.evaluate(() => !!document.querySelector('.p-toast-btn')), '14:01: the ping waits, the Undo stays in reach');
  await p.clock.runFor(61000); await L.settle(p, 300);
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(await sheet(p) && /Bidfood/.test(await txt(p, '.nt-list') || ''), '14:02: the ping pops up once the toast has gone');
  await p.context().close();

  // the writer sees in the editor when today's ping is on screen
  p = await L.open(b, '#/prep', { who: 'sam', touch: true, extra: Object.assign(ping('na', 'Special: pork belly', { tag: 'special', tm: 835, by: 'ann', author: 'ann' }), ping('nb', 'Delivery: PFD', { tag: 'delivery', tm: 900, by: 'ann', author: 'ann' }), ping('nc', 'Ping: fridge seals', { tm: 600, by: 'ann', author: 'ann' })), wait: 2000 });
  await p.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); }); await L.settle(p, 200);
  await L.chef(p, 'pings'); await L.settle(p, 400);
  const lst = await txt(p, '#prep-root') || '';
  ok(/On screen until 14:25/.test(lst) && /Pops up at 15:00/.test(lst) && /Gone for today at 10:30/.test(lst), 'editor: on screen until, pops up at, gone for today');
  ok(p.errors.length === 0, 'editor: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
