// Checks nightly-learn.mjs against the Firestore emulator: seeds two days, runs it twice, compares the counts and the
// summaries (wastage, transfers, usage, the learned lists).
// Run from scripts/: FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 node emulator-check.mjs (inside "firebase emulators:exec")
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execFileSync } from 'child_process';
initializeApp({ projectId: 'demo-test' });
const db = getFirestore(), K = db.collection('kitchens').doc('000000');
const pad = n => (n < 10 ? '0' : '') + n;
const day = n => { const d = new Date(Date.now() + 10 * 3600000 - n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
const y = day(1), y2 = day(2), today = day(0);
const it = (text, x) => Object.assign({ text, station: 'Larder', qty: '', recipe: '', addedBy: 'Ann', addedAt: Date.now() - 86400000, deleted: false }, x || {});
const w = (p, v) => K.collection(p[0]).doc(p[1]).collection(p[2]).doc(p[3]).set(v);
await w(['days', y, 'items', 'a'], it('Slice onions', { qty: '2 tubs' }));
await w(['days', y, 'items', 'b'], it('Slice onions', { qty: '2 tubs', station: 'Grill' }));
await w(['days', y, 'items', 'c'], it('Laksa', { recipe: 'laksa' }));
await w(['days', y, 'items', 'd'], it('Removed thing', { deleted: true }));
await w(['days', y, 'items', 'e'], it('Slice onions', { rolled: 1 }));
await w(['days', y2, 'items', 'f'], it('Slice onions', { qty: '3 tubs' }));
await w(['days', today, 'items', 'g'], it('Slice onions'));
await w(['orders', y, 'lines', 'o1'], { text: 'Flour', qty: '2 bags', addedBy: 'Sam', addedAt: Date.now() - 86400000, deleted: false });
await w(['orders', y, 'lines', 'o2'], { text: 'Flour', qty: '2 bags', addedBy: 'Sam', addedAt: Date.now() - 86000000, deleted: false, rolled: 1 });
await K.collection('learnlog').doc('o-' + y2).set({ at: 1, who: 'live' });  // already learned live on a phone
// wastage for the nightly summary (22 Oct 2026): Rice twice (newest in Pans), Chips once, one removed, and today's left out
const wl = (text, x) => Object.assign({ text, amount: 1, unit: 'portions', reason: 'expired', action: '', station: 'Larder', addedBy: 'Bo', addedAt: Date.now() - 2 * 86400000, deleted: false }, x || {});
await w(['waste', y2, 'lines', 'w1'], wl('Rice'));
await w(['waste', y, 'lines', 'w2'], wl('rice ', { amount: 2, station: 'Pans', addedAt: Date.now() - 86400000 }));
await w(['waste', y, 'lines', 'w3'], wl('Chips', { unit: 'kg', reason: 'excess' }));
await w(['waste', y, 'lines', 'w4'], wl('Gone', { deleted: true }));
await w(['waste', today, 'lines', 'w5'], wl('Rice'));
// words that are also keys on every object: an item or section typed like that counts like any other word
await w(['waste', y, 'lines', 'w6'], wl('constructor', { station: 'constructor' }));
await w(['waste', y, 'lines', 'w7'], wl('__proto__', { station: '__proto__', reason: 'excess' }));
// transfers for the nightly summary (23 Oct 2026): Riviera three times in two spellings (Butter twice out, once in), the
// Bowls Club twice (Lemons in, the second on the oldest day kept); one removed, one practice, one with no venue, today's
// and one from 29 days ago left out. The two kg amounts of Butter tie, so the newer one (3) is the usual amount.
const tl = (n, text, x) => Object.assign({ dir: 'out', venue: 'Riviera', person: '', text, amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: Date.now() - n * 86400000, deleted: false, by: 'bo' }, x || {});
await w(['transfers', y2, 'lines', 't1'], tl(2, 'Butter', { person: 'Jess' }));
await w(['transfers', y, 'lines', 't2'], tl(1, 'butter ', { venue: ' riviera  ', person: 'Tom', amount: 3 }));
await w(['transfers', day(5), 'lines', 't3'], tl(5, 'Butter', { dir: 'in', person: 'jess', amount: 500, unit: 'g' }));
await w(['transfers', y, 'lines', 't4'], tl(1, 'Lemons', { dir: 'in', venue: 'Bowls Club', amount: 2, unit: 'boxes' }));
await w(['transfers', day(28), 'lines', 't5'], tl(28, 'Lemons', { dir: 'in', venue: 'Bowls Club', amount: 1, unit: 'boxes' }));
await w(['transfers', y, 'lines', 't6'], tl(1, 'Gone', { deleted: true, deletedBy: 'boss', deletedAt: 1 }));
await w(['transfers', y, 'lines', 't7'], tl(1, 'Practice', { tst: true }));
await w(['transfers', y, 'lines', 't8'], tl(1, 'Mystery', { venue: '  ' }));
await w(['transfers', today, 'lines', 't9'], tl(0, 'Butter'));
await w(['transfers', day(29), 'lines', 't10'], tl(29, 'Old stock', { venue: 'Old Pub' }));
const run = () => execFileSync(process.execPath, ['nightly-learn.mjs'], { env: Object.assign({}, process.env, { KITCHEN_PIN: '000000', LEARN_DAYS: '5' }), encoding: 'utf8' });
await K.collection('daily').doc(y + '_aa').set({ day: y, tag: 'aa', sg: { quick: { s: 1, t: 3, d: 0 } }, pf: { lcp: [1, 2, 0, 0, 0] }, at: 1 });
await K.collection('daily').doc(y + '_bb').set({ day: y, tag: 'bb', sg: { quick: { s: 1, t: 1, d: 1 } }, pf: { lcp: [0, 1, 0, 0, 1] }, at: 1 });
await K.collection('daily').doc(day(9) + '_cc').set({ day: day(9), tag: 'cc', sg: {}, pf: {}, at: 1 });
await w(['days', y, 'items', 'tst1'], it('Practice thing', { tst: true }));
// tomorrow's list (22 Oct 2026): 8 lines written in one go last night, at 21:00 kitchen time, or at 16:00 when this runs
// in the evening (so the other seeded lines, written 24 hours ago, never join the batch). Three older nights are
// already in last night's summary, so they are kept and not read again.
const kMins = ms => { const d = new Date(ms + 10 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const batchAt = kMins(Date.now()) >= 18 * 60 ? 16 * 60 : 21 * 60;
const atK = (dd, m) => { const p = dd.split('-'); return Date.UTC(+p[0], p[1] - 1, +p[2]) - 10 * 3600000 + m * 60000; };
for (let i = 0; i < 8; i++) await w(['days', y, 'items', 'n' + i], it('Night line ' + i, { addedAt: atK(y, batchAt + i) }));
await K.collection('summary').doc('learned').set({ day: day(1), items: [], lists: { days: { [day(6)]: { m: 1250, n: 9 }, [day(7)]: { m: 1270, n: 9 }, [day(8)]: { m: 1290, n: 9 } } } });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const out1 = run();
ok(/Learned \d+ kitchen days/.test(out1) && !/000000/.test(out1), 'runs and prints no PIN: ' + out1.trim());
const on = (await K.collection('learned').doc('slice-onions').get()).data();
ok(on.uses === 3 && on.typed === 3, 'prep: 3 uses over two days, rolled and today not counted (' + on.uses + ')');
ok(on.secs.larder.n === 2 && on.secs.grill.n === 1, 'prep: sections counted');
ok(on.qtys['2-tubs'].n === 2 && on.qtys['3-tubs'].n === 1, 'prep: amounts counted');
const lk = (await K.collection('learned').doc('laksa').get()).data();
ok(lk.picked === 1 && !lk.typed, 'prep: a line with a recipe counts as picked');
ok(!(await K.collection('learned').doc('removed-thing').get()).exists, 'prep: removed lines not counted');
const fl = (await K.collection('ordlearned').doc('flour').get()).data();
ok(fl.uses === 1 && fl.qtys['2-bags'].n === 1, 'orders: counted once (rolled copy left out)');
ok((await K.collection('learnlog').doc(y).get()).exists && (await K.collection('learnlog').doc('o-' + y).get()).exists, 'days claimed');
ok(!(await K.collection('learnlog').doc(today).get()).exists, 'today is not learned yet');
const ws = (await K.collection('summary').doc('waste').get()).data() || {};
const rice = (ws.items || []).find(x => x.t.trim().toLowerCase() === 'rice') || {};
ok(ws.day === today && ws.to === y, 'summary: made today, up to yesterday (' + ws.day + ', ' + ws.to + ')');
ok(rice.n === 2 && rice.r.expired === 2 && rice.unit === 'portions', 'summary: Rice twice as expired stock, today not counted (' + JSON.stringify(rice) + ')');
ok(rice.last && rice.last.sec === 'Pans' && rice.last.amt === 2, 'summary: the last time is the newest entry');
ok((ws.items || []).some(x => x.t === 'Chips' && x.r.excess === 1) && !(ws.items || []).some(x => x.t === 'Gone'), 'summary: Chips once, the removed entry left out');
ok(/Wastage summary: 4 items/.test(out1), 'summary: the run says how many items');
const odd = k => (ws.items || []).find(x => x.t === k) || {};
ok(odd('constructor').n === 1 && odd('constructor').r.expired === 1 && odd('constructor').sec === 'constructor', 'summary: an item and a section typed "constructor" count like any other word (' + JSON.stringify(odd('constructor')) + ')');
ok(odd('__proto__').n === 1 && odd('__proto__').r.excess === 1 && odd('__proto__').sec === '__proto__', 'summary: an item and a section typed "__proto__" count like any other word (' + JSON.stringify(odd('__proto__')) + ')');
const ts = (await K.collection('summary').doc('transfers').get()).data() || {};
const tv = ts.venues || [], ti = ts.items || [], tj = o => JSON.stringify(o);
ok(ts.day === today && ts.from === day(28) && ts.to === y && typeof ts.at === 'number', 'transfers: made today, the 28 days up to yesterday (' + ts.day + ', ' + ts.from + ', ' + ts.to + ')');
ok(Object.keys(ts).sort().join() === 'at,day,from,items,to,venues' && tv.every(v => Object.keys(v).sort().join() === 'in,n,out,people,v') && ti.every(x => Object.keys(x).sort().join() === 'amt,dir,n,t,unit,venue'), 'transfers: only the fields the spec lists');
ok(tv.length === 2 && tv[0].v === 'Riviera' && tv[0].n === 3 && tv[0].out === 2 && tv[0].in === 1, 'transfers: Riviera and " riviera  " are one venue, most used spelling, out and in counted (' + tj(tv[0]) + ')');
ok(tj(tv[0].people) === '["Jess","Tom"]', 'transfers: people most often first, Jess and jess together (' + tj(tv[0].people) + ')');
ok(tv[1].v === 'Bowls Club' && tv[1].n === 2 && tv[1].out === 0 && tv[1].in === 2 && tv[1].people.length === 0, 'transfers: Bowls Club second, the oldest day kept, nobody named (' + tj(tv[1]) + ')');
ok(ti.length === 2 && tj(ti[0]) === tj({ t: 'Butter', n: 3, unit: 'kg', amt: 3, dir: 'out', venue: 'Riviera' }), 'transfers: Butter 3 times (today\'s line left out), kg, the newer of two tied amounts, out to Riviera (' + tj(ti[0]) + ')');
ok(tj(ti[1]) === tj({ t: 'Lemons', n: 2, unit: 'boxes', amt: 2, dir: 'in', venue: 'Bowls Club' }) && typeof ti[1].amt === 'number', 'transfers: Lemons twice, in from the Bowls Club, amt a plain number (' + tj(ti[1]) + ')');
ok(!ti.some(x => /gone|practice|mystery|old stock/i.test(x.t)) && !tv.some(v => /old pub/i.test(v.v)), 'transfers: removed, practice, no venue and older than 28 days left out');
ok(/Transfer summary: \d+ items, \d+ venues/.test(out1) && /Transfer summary: 2 items, 2 venues from 28 days/.test(out1), 'transfers: the run says how many items and venues');
ok(!/\b(riviera|bowls|butter|lemons|jess|tom)\b/i.test(out1), 'transfers: the run prints no venue, item or name');
const us = (await K.collection('summary').doc('usage').get()).data() || {}, uy = (us.days || {})[y] || {};
ok(uy.phones === 2 && uy.sg && uy.sg.quick && uy.sg.quick.t === 4 && uy.sg.quick.d === 1 && uy.pf.lcp.join() === '1,3,0,0,1', 'usage: yesterday added up from two phones (' + JSON.stringify(uy) + ')');
ok(!(await K.collection('daily').doc(day(9) + '_cc').get()).exists && (await K.collection('daily').doc(y + '_aa').get()).exists, 'usage: records older than 7 days deleted, yesterday kept');
const sl = (await K.collection('summary').doc('learned').get()).data() || {}, so = (await K.collection('summary').doc('ordlearned').get()).data() || {};
const slo = (sl.items || []).find(x => x.id === 'slice-onions') || {};
ok(sl.day === today && slo.uses === 3 && slo.qtys && slo.qtys['2-tubs'].n === 2 && !('by' in slo), 'summary/learned: the prep items with their counts, fields the phones use only (' + JSON.stringify(slo) + ')');
ok(so.day === today && (so.items || []).some(x => x.id === 'flour' && x.uses === 1), 'summary/ordlearned: the order items');
ok(/Summaries for the phones: \d+ prep items, \d+ order items/.test(out1), 'the run says how many summary items');
ok(!(await K.collection('learned').doc('practice-thing').get()).exists, 'practice lines (tst) are not learned');
const ls = sl.lists || {}, ly = (ls.days || {})[y] || {};
ok(ly.m === batchAt && ly.n === 8, "tomorrow's list: last night's batch clocked at " + batchAt + ' (' + JSON.stringify(ly) + ')');
ok(Object.keys(ls.days || {}).length === 28 && ls.days[day(7)].m === 1270 && ls.days[day(2)].m === -1, "tomorrow's list: 28 nights, last night's summary kept, a night with no list is -1");
ok(ls.usual === 1270 && ls.n === 4, "tomorrow's list: the usual time from 4 nights (" + ls.usual + ')');
ok(/Tomorrow's list: usually from 21:10 \(4 of the last 28 nights\)/.test(out1) && / 20 nights read again/.test(out1), "tomorrow's list: the run prints the time, and reads only the nights it had not seen");
// words that are also built-in object names count like any other word (23 Oct 2026): a venue "Constructor", an item
// "__proto__" and a person "constructor", logged yesterday, are in the second run's transfer summary
await w(['transfers', y, 'lines', 't11'], tl(1, '__proto__', { venue: 'Constructor', person: 'constructor', amount: 1, unit: 'packs' }));
await K.collection('daily').doc(y2 + '_late').set({ day: y2, tag: 'late', sg: { ordfill: { s: 1, t: 0, d: 0, e: 1 } }, pf: {}, at: 1 });
const out2 = run();
const lateUsage = ((await K.collection('summary').doc('usage').get()).data().days || {})[y2];
ok(lateUsage && lateUsage.phones === 1 && lateUsage.sg.ordfill.e === 1, 'usage: late feedback and edited quantities are included once');
const on2 = (await K.collection('learned').doc('slice-onions').get()).data();
ok(on2.uses === 3, 'second run counts nothing twice (' + on2.uses + ')');
const ly2 = ((((await K.collection('summary').doc('learned').get()).data() || {}).lists || {}).days || {})[y] || {};
ok(/ 0 nights read again/.test(out2) && ly2.m === batchAt, "tomorrow's list: a second run reads no night again and keeps last night (" + JSON.stringify(ly2) + ')');
const ts2 = (await K.collection('summary').doc('transfers').get()).data() || {};
ok(/Transfer summary: 3 items, 3 venues from 28 days/.test(out2) && !/Transfer summary failed/.test(out2), 'transfers: a venue "Constructor" and an item "__proto__" do not stop the summary (' + (out2.match(/Transfer summary[^\n]*/) || [''])[0] + ')');
ok((ts2.venues || []).some(v => v.v === 'Constructor' && v.n === 1 && JSON.stringify(v.people) === '["constructor"]') && (ts2.items || []).some(x => x.t === '__proto__' && x.unit === 'packs' && x.venue === 'Constructor'), 'transfers: they are listed like any other venue, item and person');
// phone pushes for order cut-offs (24 Oct 2026): scripts/cutoff-push.mjs at set times on Friday 23 Oct 2026. On the
// emulator nothing is sent: it prints what it would send. Two Saturday deliveries close Friday 14:00 (one reminded 4
// hours before, one 6), one closes Friday 14:00 but was ticked off as ordered (Veg was ticked and taken off again, so it still goes), one closes Saturday 06:00 (8 hours before, so
// Friday 22:00). Pushes go to the sous chef's and the Google account's phones, never staff's.
await K.collection('config').doc('main').set({ sousIds: ['sam'], headId: 'hd', cutoffs: [
  { id: 'pfd', name: 'PFD', dd: [6], at: 840, pre: 1, lead: 240 },
  { id: 'veg', name: 'Veg', dd: [6], at: 840, pre: 1, lead: 360 },
  { id: 'chk', name: 'Chicken', dd: [6], at: 840, pre: 1 },
  { id: 'bread', name: 'Bread', dd: [0], at: 360, pre: 1, lead: 480 }
] }, { merge: true });
await K.collection('cutdone').doc('2026-10-23_chk').set({ day: '2026-10-23', sid: 'chk', on: true, at: 1, by: 'sam' });   // Chicken ticked
await K.collection('cutdone').doc('2026-10-23_veg').set({ day: '2026-10-23', sid: 'veg', on: false, at: 2, by: 'sam' });   // Veg ticked, then taken off
await K.collection('push').doc('p1').set({ tok: 'tok-sam', at: 1, ua: 'Android', by: 'sam' });
await K.collection('push').doc('p2').set({ tok: 'tok-own', at: 1, ua: 'iPhone', by: 'owner' });
await K.collection('push').doc('p3').set({ tok: 'tok-ann', at: 1, ua: 'Android', by: 'ann' });
const at = (h, mi) => String(Date.UTC(2026, 9, 23, h - 10, mi));   // Friday 23 Oct 2026, kitchen time
const push = t => execFileSync(process.execPath, ['cutoff-push.mjs'], { env: Object.assign({}, process.env, { KITCHEN_PIN: '000000', PUSH_NOW: t }), encoding: 'utf8' });
const would = out => { const l = out.split('\n').filter(x => x.indexOf('{"would"') === 0)[0]; return l ? JSON.parse(l).would : []; };
let p1 = push(at(7, 0));
ok(/Nothing due/.test(p1), 'pushes: nothing due at 07:00');
p1 = push(at(8, 5));
let wd = would(p1);
ok(wd.length === 2 && wd.every(x => x.data.title === 'Veg: order by 14:00' && x.data.body === "For Saturday's delivery. 5 h 55 min to go.") && wd.map(x => x.by).sort().join() === 'owner,sam', 'pushes: 08:05, Veg (6 hours) goes to the sous chef and the Google account, not staff (' + JSON.stringify(wd) + ')');
wd = would(push(at(10, 3)));
ok(wd.length === 2 && wd.every(x => x.data.title === 'PFD: order by 14:00'), 'pushes: 10:03, PFD (4 hours); Veg is not sent again, Chicken was ordered');
ok(/Nothing new to send/.test(push(at(10, 13))), 'pushes: the next run sends nothing');
wd = would(push(at(13, 2)));
ok(wd.length === 4 && wd.filter(x => x.data.title === 'Order now: PFD' && /^Closes at 14:00 for Saturday's delivery\. 58 min to go\.$/.test(x.data.body)).length === 2 && wd.filter(x => x.data.tag === 'cut-veg').length === 2, 'pushes: 13:02, Order now for PFD and Veg');
ok(/Nothing due/.test(push(at(14, 5))), 'pushes: nothing once the cut-off has passed');
wd = would(push(at(22, 4)));
ok(wd.length === 2 && wd.every(x => x.data.title === 'Bread: order by tomorrow 06:00'), 'pushes: 22:04, an early cut-off is pushed the night before');
const ps = ((await K.collection('pushsent').doc('2026-10-23').get()).data() || {}).sent || {};
ok(ps['pfd|2026-10-23'] === 'now' && ps['veg|2026-10-23'] === 'now' && !ps['chk|2026-10-23'], 'pushes: what was sent is kept per cut-off day');
// Longer delivery lead times (25 Oct 2026): all four deliveries below close on Friday. Sunday less nine days
// crosses a week boundary; one and two weeks keep Friday. The reminders still use the cut-off day's own key.
await K.collection('config').doc('main').set({ cutoffs: [
  { id: 'week-test', name: 'Weekly Test', dd: [5], at: 840, pre: 7, lead: 240 },
  { id: 'eight-test', name: 'Eight Day Test', dd: [6], at: 840, pre: 8, lead: 240 },
  { id: 'nine-test', name: 'Nine Day Test', dd: [0], at: 840, pre: 9, lead: 240 },
  { id: 'fortnight-test', name: 'Fortnight Test', dd: [5], at: 840, pre: 14, lead: 240 },
  { id: 'done-test', name: 'Done Test', dd: [5], at: 840, pre: 14, lead: 240 }
] }, { merge: true });
await K.collection('cutdone').doc('2026-10-23_done-test').set({ day: '2026-10-23', sid: 'done-test', on: true, at: 1, by: 'sam' });
wd = would(push(at(10, 5)));
const longBodies = {
  'week-test': 'For Friday in 1 week. 3 h 55 min to go.',
  'eight-test': 'For Saturday in 8 days. 3 h 55 min to go.',
  'nine-test': 'For Sunday in 9 days. 3 h 55 min to go.',
  'fortnight-test': 'For Friday in 2 weeks. 3 h 55 min to go.'
};
ok(wd.length === 8 && Object.keys(longBodies).every(sid => wd.filter(x => x.data.sid === sid && x.data.body === longBodies[sid]).length === 2), 'pushes: 7, 8, 9 and 14 days retain the correct weekday and delivery lead time');
ok(wd.every(x => ['owner', 'sam'].includes(x.by) && x.data.day === '2026-10-23' && x.data.sid !== 'done-test'), 'pushes: long lead times still target only chefs, use the cut-off date and skip completed orders');
ok(/Nothing new to send/.test(push(at(10, 15))), 'pushes: long lead reminders are not sent twice');
await K.collection('cutdone').doc('2026-10-23_fortnight-test').set({ day: '2026-10-23', sid: 'fortnight-test', on: true, at: 2, by: 'sam' });
wd = would(push(at(13, 5)));
ok(wd.length === 6 && ['week-test', 'eight-test', 'nine-test'].every(sid => wd.filter(x => x.data.sid === sid && /^Order now: /.test(x.data.title) && /55 min to go\.$/.test(x.data.body)).length === 2), 'pushes: the final-hour stage still runs, and a completed two-week order gets no further push');
const longSent = ((await K.collection('pushsent').doc('2026-10-23').get()).data() || {}).sent || {};
ok(longSent['week-test|2026-10-23'] === 'now' && longSent['eight-test|2026-10-23'] === 'now' && longSent['nine-test|2026-10-23'] === 'now' && longSent['fortnight-test|2026-10-23'] === 'start' && !longSent['done-test|2026-10-23'], 'pushes: long lead stages are kept per cut-off, with completed orders left untouched');
process.exit(fails ? 1 : 0);
