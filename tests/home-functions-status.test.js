const fs = require('node:fs');
const L = require('./lib');
const M = require('../js/functions');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW));
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const cfg = key('config', 'main');
const fnPath = '^kitchens/[^/]+/functions$';
const at = hm => M.kat(day, M.hmMin(hm));
const booking = M.derive({ v: 1, status: 'confirmed', name: 'Test supper', date: day, start: at('18:00'), loc: 'Garden', guests: 30, mode: 'all',
  rounds: [{ at: at('18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', qty: 2, u: M.toU([2]) }], upd: L.NOW - 1000 });
const functionData = { [key('functions', 'supper')]: booking };
const withReminders = {
  [cfg]: { ...L.seed()[cfg], cutoffs: [{ id: 'produce', name: 'Test produce', dd: [(new Date(L.NOW).getDay() + 1) % 7], at: 15 * 60, pre: 1, lead: 120 }] },
  [key('notes', 'n1')]: { text: 'Test ping', tag: 'none', start: day, until: day, dows: [], tm: 835, removed: false, at: 1, by: 'sam' }
};

const read = p => p.evaluate(() => {
  const board = document.getElementById('hm-board');
  const notes = [...(board?.querySelectorAll('.hm-none, .hm-warn, .p-readerr') || [])].map(e => ({ text: e.textContent.trim(), role: e.getAttribute('role') }));
  const rows = [...(board?.querySelectorAll('.hm-a') || [])].map(e => e.querySelector('.hm-t').textContent);
  return { visible: !!board && !board.hidden, notes, rows, retry: board?.querySelectorAll('[data-fn="retry"]').length || 0, hash: location.hash };
});
const listeners = p => p.evaluate(() => (window.__fake?.bill || []).filter(x => x.kind === 'listen' && /\/functions$/.test(x.path)).length);
const fnState = (p, state) => L.waitFor(p, state => window.LK_FN?.state().state === state, state, 8000);
const open = (b, opts) => L.open(b, '#/', { who: 'sam', ...opts });

async function failed(b, width, extra) {
  const p = await open(b, { width, height: width === 390 ? 844 : 800, exhausted: fnPath, extra });
  try {
    await fnState(p, 'error');
    const x = await read(p);
    ok(x.visible && x.notes.length === 1 && x.notes[0].role === 'status' && !x.notes.some(n => /checking|signal|connection/i.test(n.text)), width + ': an online quota refusal shows one settled status');
    ok(/read limit/i.test(x.notes[0]?.text || '') && x.retry === 1, width + ': the failure names the read limit and has one retry in the board');
    if (width === 1280) ok(x.rows.includes('Test produce order closes') && x.rows.includes('1 new ping'), 'desktop: a Functions failure leaves the cut-off and ping actions visible');
    else {
      const before = await listeners(p);
      await p.evaluate(() => {
        __fake.exhausted = null;
        const button = document.querySelector('#hm-board [data-fn="retry"]');
        if (!button) return;
        const second = button.cloneNode(true); second.hidden = true; document.body.append(second);
        button.focus(); button.click(); second.click(); second.remove();
      });
      if (x.retry) await fnState(p, 'ok');
      const back = await read(p);
      ok(back.rows.includes('Test supper') && !back.notes.length && back.hash === '#/', 'retry recovers the function on the same Home board');
      ok(await listeners(p) - before === 1, 'two retry taps start exactly one Functions listener');
    }
    ok(!p.errors.length, width + ': no browser errors after a quota refusal');
  } finally { await p.context().close(); }
}

async function knownCopy(b) {
  const p = await open(b, { extra: functionData });
  try {
    await fnState(p, 'ok');
    // The Welcome still can arrive before the first clip. Let Home's art load before cutting the signal.
    await L.waitFor(p, () => {
      const mascot = window.LK_MASCOT;
      if (!mascot) return false;
      const state = mascot.state();
      return mascot.artOff() || state?.plays > 0 || (state?.rest === 'rest' &&
        (state.hidden || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches));
    }, null, 8000);
    await p.context().setOffline(true);
    await L.settle(p, 250);
    let x = await read(p);
    ok(x.rows.includes('Test supper') && /No signal.*14:00/s.test(x.notes[0]?.text || '') && !x.retry, 'offline: a proven copy stays in place with its last confirmed time');
    await p.context().setOffline(false);
    await p.evaluate(regex => {
      const f = LK_FN.state();
      f.unsub(); f.unsub = null; f.key = '';
      __fake.exhausted = new RegExp(regex);
      LK_FN.watch();
    }, fnPath);
    await fnState(p, 'error');
    x = await read(p);
    ok(x.rows.includes('Test supper') && /read limit.*copy from 14:00/s.test(x.notes[0]?.text || '') && x.retry === 1, 'failed refresh: a proven copy stays in place with its timestamp and Retry');
    ok(!p.errors.length, 'known copy: no browser errors');
  } finally { await p.context().close(); }
}

(async () => {
  const b = await L.start();
  try {
    const sdk = fs.readFileSync(__dirname + '/fake/firebase-firestore.js', 'utf8');
    const first = '  setTimeout(() => { if (subs.has(s)) deliver(s); }, 5);';
    if (!sdk.includes(first)) throw new Error('The fixture must be able to hold a Functions answer');
    const held = sdk.replace(first, '  if (/\\/functions$/.test(ref.path.join("/"))) window.__releaseFunctions = () => { if (subs.has(s)) deliver(s); };\n  else' + first);
    let p = await open(b, { fakeSDK: { 'firebase-firestore.js': held } });
    await L.waitFor(p, () => !!window.__releaseFunctions);
    let x = await read(p);
    ok(x.visible && /Checking the work/.test(x.notes[0]?.text || '') && !x.retry, 'the pending first answer shows checking');
    await p.evaluate(() => __releaseFunctions());
    await fnState(p, 'ok');
    ok(!(await read(p)).visible, 'a confirmed empty board closes once the first answer arrives');
    await p.context().close();

    p = await open(b, { cold: fnPath, extra: functionData });
    await fnState(p, 'offline');
    x = await read(p);
    ok(x.visible && /No signal/.test(x.notes[0]?.text || '') && !x.rows.length && !x.retry && !/copy from|checking/i.test(x.notes[0]?.text || ''), 'cold offline distinguishes unread data from an empty or proven saved list');
    await p.context().close();

    await failed(b, 390, functionData);
    await failed(b, 1280, { ...functionData, ...withReminders });
    await knownCopy(b);

    p = await open(b, { noPin: true, who: '', extra: functionData });
    ok(!(await read(p)).visible && await listeners(p) === 0, 'signed-out Home has no private board or Functions read');
    await p.context().close();
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
