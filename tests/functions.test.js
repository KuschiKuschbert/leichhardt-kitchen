// Functions (21 Oct 2026): a Functions coordinator books a function once, the kitchen sees it in the band under the top
// bar on the day with the right numbers and times, staff only read, and taking the tick away stops the next save.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(today, 1), day2 = M.addDays(today, 2), yesterday = M.addDays(today, -1);
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const PEOPLE = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true },
  { id: 'finn', name: 'Finn', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
const CFG = { people: PEOPLE, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'fay', 'finn'], fnIds: ['fay', 'finn'], showBadges: true };
const base = {
  [fsKey(['config', 'main'])]: CFG,
  [fsKey(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [fsKey(['pinset', 'fay'])]: { at: 1 },
  [fsKey(['staffpins', 'finn'])]: { hash: L.sha('lk:finn:5252') }, [fsKey(['pinset', 'finn'])]: { at: 1 },
  [fsKey(['drinks', 'fay'])]: { kind: 'flat', at: 1, by: 'fay' }, [fsKey(['drinks', 'finn'])]: { kind: 'flat', at: 1, by: 'finn' }
};
// a saved function the way the book writes it
function fn(o) {
  const date = o.date || today, R = (o.rounds || ['18:30']).map(x => Array.isArray(x) ? { at: at(x[0], x[1]), note: '' } : { at: at(date, x), note: '' });
  const f = { v: o.v || 1, status: o.status || 'confirmed', name: o.name || 'Smith 50th', date, start: at(date, o.start || '18:00'), loc: o.loc === undefined ? 'Beer garden' : o.loc, guests: o.guests || 60,
    mode: R.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: o.kc || '', kcBy: o.kcBy || '', kcAt: o.kc ? L.NOW - 3600000 : 0, rounds: R,
    lines: (o.lines || [['antipasto-platter', 'Antipasto Platter', [3]]]).map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: 'Per platter.', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: o.was || {}, chg: o.chg || [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: o.by || 'fay', upd: L.NOW - 3600000 };
  if (o.status === 'cancelled') { f.canBy = 'finn'; f.canAt = L.NOW - 1800000; }
  return M.derive(f);
}
const extra = docs => Object.assign({}, base, ...Object.keys(docs).map(id => ({ [fsKey(['functions', id])]: docs[id] })));
const setV = async (p, sel, v) => { await p.fill(sel, v); await p.$eval(sel, e => e.dispatchEvent(new Event('change', { bubbles: true }))); await L.settle(p, 80); };
// Inspect contact fields and text at every depth. Numeric timestamps may contain a phone prefix by coincidence.
function hasPrivateContact(value) {
  const textHasContact = text => {
    const t = text.toLowerCase();
    return t.includes('jo smith') || t.includes('jo@example.com') || t.replace(/\D/g, '').includes('0400111222');
  };
  if (typeof value === 'string') return textHasContact(value);
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(k => /^(cname|phone|email)$/i.test(k) || textHasContact(k) || hasPrivateContact(value[k]));
}

(async () => {
  const b = await L.start();

  // 1. a coordinator books a function: menu, form, platters, staggered rounds by hand, kitchen comment, review, confirm
  let p = await L.open(b, '#/', { who: 'fay', extra: base, wait: 1200 });
  const items = await L.chefItems(p);
  ok(items.indexOf('functions') >= 0 && items.indexOf('fn') < 0, 'menu: a coordinator ticked for Functions sees Functions (to book) in the chef hat, once (' + items.join(' | ') + ')');
  await p.keyboard.press('Escape');
  await p.goto(L.BASE + '#/functions/new'); await L.settle(p, 900);
  ok(/New function/.test(await txt(p, '#fe-root') || ''), 'form: New function opens');
  await p.fill('[data-ff="name"]', 'Smith 50th');
  await setV(p, '[data-ff="date"]', today);
  await setV(p, '[data-ff="startT"]', '18:00');
  await p.click('[data-ff="gu"]'); await L.settle(p, 150);
  ok(await p.$eval('[data-ff="guests"]', e => e.disabled) && /guests not known yet/.test(await txt(p, '#fe-live') || ''), 'guests: Not known yet empties and locks the number');
  await p.click('[data-ff="gu"]'); await L.settle(p, 150);
  await p.fill('[data-ff="guests"]', '60');
  await p.fill('[data-ff="loc"]', 'Beer garden');
  await p.fill('[data-ff="cname"]', 'Jo Smith');
  await p.fill('[data-ff="phone"]', '0400 111 222');
  await p.fill('[data-ff="email"]', 'jo@example.com');
  await p.fill('[data-ff="pq"]', 'anti'); await L.settle(p, 100);
  ok((await p.$$('[data-fe="addline"]')).length === 1, 'platters: the search narrows the book\'s Functions platters');
  await tap(p, '[data-fe="addline"][data-v="antipasto-platter"]'); await L.settle(p, 100);
  await tap(p, '[data-fe="addline"][data-v="aussie-platter"]'); await L.settle(p, 100);
  await tap(p, '[data-fe="addline"][data-v="pizza-platter"]'); await L.settle(p, 100);
  await setV(p, '[data-ff="qty0"]', '3'); await setV(p, '[data-ff="qty1"]', '4'); await setV(p, '[data-ff="qty2"]', '5');
  ok(/12 platters/.test(await txt(p, '#fe-live') || ''), 'platters: the bar adds up 12 platters (no guest multiplying)');
  await tap(p, '[data-fe="mode"][data-v="stag"]'); await L.settle(p, 100);
  await setV(p, '[data-ff="foodT"]', '1830');
  ok(await p.$eval('[data-ff="foodT"]', e => e.value) === '18:30', 'times: 1830 is read as 18:30 (24-hour)');
  ok(await p.$eval('[data-ff="a2_0"]', e => e.value) === '2' && await p.$eval('[data-ff="a2_1"]', e => e.value) === '2' && await p.$eval('[data-ff="a2_2"]', e => e.value) === '1', 'staggered: 5 pizza platters over 3 rounds start as 2, 2, 1');
  ok(await p.$eval('[data-ff="rt1"]', e => e.value) === '19:00' && await p.$eval('[data-ff="rt2"]', e => e.value) === '19:30', 'staggered: rounds every 30 minutes from 18:30');
  // the brief's example: antipasto first, aussie in the first two rounds, pizza later
  for (const [k, v] of [['a0_0', '3'], ['a0_1', '0'], ['a0_2', '0'], ['a1_0', '2'], ['a1_1', '2'], ['a1_2', '0'], ['a2_0', '0'], ['a2_1', '2'], ['a2_2', '2']]) await setV(p, '[data-ff="' + k + '"]', v);
  ok(/4 of 5/.test(await txt(p, '.fe-grid .fn-tot') || ''), 'grid: under-allocation shows "4 of 5"');
  await tap(p, '[data-fe="review"]'); await L.settle(p, 200);
  ok(/Pizza: 4 of 5 placed\. Place 1 more/.test(await txt(p, '.fe-probs') || ''), 'confirm: refused while a line does not add up, and says what to fix');
  await setV(p, '[data-ff="a2_2"]', '4');
  ok(/6 placed but 5 booked/.test(await txt(p, '.fe-probs') || '') || /1 too many/.test(await txt(p, '.fe-grid') || ''), 'grid: over-allocation is flagged');
  await setV(p, '[data-ff="a2_2"]', '3');
  await p.fill('[data-ff="notes"]', 'Two vegetarians.');
  await p.fill('[data-ff="kc"]', 'Cake comes out at 20:00.\nKeep the pass clear.');
  await tap(p, '[data-fe="review"]'); await L.settle(p, 200);
  const rv = await txt(p, '.fe-review') || '';
  ok(/Check before confirming/.test(rv) && /18:30/.test(rv) && /event 18:00/.test(rv) && /Next out/.test(rv) && /Kitchen comment/.test(rv) && !/0400/.test(rv), 'review: the summary shows times, platters and the comment, never the phone');
  await p.click('[data-fe="confirm"]'); await p.click('[data-fe="confirm"]').catch(() => {});
  await L.waitFor(p, () => /Confirmed/.test((document.querySelector('.fe-head') || {}).textContent || ''));
  let s = await store(p);
  const ids = Object.keys(s).filter(k => /\/functions\/[^/]+$/.test(k));
  ok(ids.length === 1, 'save: one function, even with two taps on Confirm (' + ids.length + ')');
  const saved = s[ids[0]], id = ids[0].split('/').pop(), contact = s[fsKey(['fncontact', id])];
  ok(saved.status === 'confirmed' && saved.by === 'fay' && saved.confBy === 'fay' && saved.kcBy === 'fay' && saved.guests === 60, 'save: confirmed, written by Fay with her own id');
  ok(JSON.stringify(saved.lines.map(l => [l.rid, l.qty, M.fromU(l.u, 3)])) === JSON.stringify([['antipasto-platter', 3, [3, 0, 0]], ['aussie-platter', 4, [2, 2, 0]], ['pizza-platter', 5, [0, 2, 3]]]), 'save: every line keeps its platter id and adds up across the rounds');
  ok(saved.first === at(today, '18:30') && saved.last === at(today, '19:30') && saved.start === at(today, '18:00') && saved.until === at(today, '20:00'), 'save: first, last and the end of the band come from the saved rounds');
  ok(!!contact && contact.cname === 'Jo Smith' && contact.phone === '0400 111 222' && contact.email === 'jo@example.com' && !hasPrivateContact(saved), 'save: phone and email only in the contact record, not the kitchen\'s copy');
  ok(hasPrivateContact(Object.assign({}, saved, { debug: { phone: '0400 111 222' } })) &&
    hasPrivateContact(Object.assign({}, saved, { notes: 'Contact jo@example.com' })) &&
    hasPrivateContact(Object.assign({}, saved, { notes: 'Call 0400-111-222' })), 'save: the privacy check still rejects nested contact fields and embedded email or phone text');
  // the platters are on today's prep list, one line each, under Functions, linked to the recipe card
  const pl = rid => s[fsKey(['days', today, 'items', 'fn-' + id + '-' + rid])];
  ok(!!pl('antipasto-platter') && pl('antipasto-platter').text === 'Antipasto Platter: Smith 50th, from 18:30' && pl('antipasto-platter').qty === '3 platters' && pl('antipasto-platter').station === 'Functions' && pl('antipasto-platter').recipe === 'antipasto-platter' && pl('antipasto-platter').fn === id && pl('antipasto-platter').dupOk === true && !('done' in pl('antipasto-platter')),
    'prep list: each platter is a prep line under Functions (' + JSON.stringify(pl('antipasto-platter')) + ')');
  ok(!!pl('pizza-platter') && pl('pizza-platter').text === 'Pizza Platter: Smith 50th, from 19:00' && pl('pizza-platter').qty === '5 platters', 'prep list: the line says when that platter first goes out');
  await p.goto(L.BASE + '#/prep'); await L.settle(p, 1200);
  ok(!/Pizza Platter: Smith 50th/.test(await txt(p, '.nb-left') || ''), 'prep list: the platters are not mixed into All');
  ok(/Functions\s*3/.test(await txt(p, '.nb-tab-fn') || ''), 'prep list: a highlighted Functions tab with 3 to do');
  await tap(p, '.nb-tab-fn'); await L.settle(p, 300);
  ok(/Pizza Platter: Smith 50th, from 19:00/.test(await txt(p, '.nb-left') || '') && !/Slice onions/.test(await txt(p, '.nb-left') || ''), 'prep list: the Functions tab shows only the function platters');
  ok(/0 of 3 done/.test(await txt(p, '.nb-prog') || ''), 'prep list: the Functions tab counts only its own lines');
  await tap(p, '.nb-tab[data-v=""]'); await L.settle(p, 300);
  ok(/0 of 6 done/.test(await txt(p, '.nb-prog') || ''), 'prep list: All counts only the day\'s own lines');
  // booked today: its stock goes on today's order list (short notice), once
  const ol = s[fsKey(['orders', today, 'lines', 'fn-' + id])];
  ok(!!ol && /^Function stock: Smith 50th, .*: 3 Antipasto, 4 Aussie, 5 Pizza$/.test(ol.text) && ol.qty === '12 platters' && ol.fn === id && !('ordered' in ol) && saved.od === today, 'order: the stock is on today\'s order list (' + (ol && ol.text) + ')');
  // the band on the same phone
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 900);
  await L.waitFor(p, () => /Smith 50th/.test((document.getElementById('fn-band') || {}).textContent || ''));
  const band = await txt(p, '#fn-band') || '';
  ok(/Smith 50th/.test(band) && /Beer garden/.test(band) && !/guests/.test(band) && /18:30 Smith 50th/.test(band) && /Round 1 of 3: 3 × Antipasto, 2 × Aussie \(5 of 12\)/.test(band), 'band: the next round\'s time leads, then what goes in it against the total (' + band.replace(/\s+/g, ' ').slice(0, 200) + ')');
  ok(/Kitchen comment/.test(band), 'band: kitchen comment marked');
  ok(/^Functions today/.test(await txt(p, '#fn-band .fn-band-h') || '') && /1 on today/.test(await txt(p, '#fn-band .fn-band-n') || ''), 'band: a label says what the band holds');
  ok(p.errors.length === 0, 'coordinator: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. staff on another phone: read only, the sheet has the full comment and its author, no contact, no saving
  const smith = fn({ rounds: ['18:30', '19:00', '19:30'], lines: [['antipasto-platter', 'Antipasto Platter', [3, 0, 0]], ['aussie-platter', 'Aussie Platter', [2, 2, 0]], ['pizza-platter', 'Pizza Platter', [0, 2, 3]]], kc: 'Cake comes out at 20:00.\nKeep the pass clear.', kcBy: 'fay', notes: 'Two vegetarians.' });
  p = await L.open(b, '#/', { who: 'ann', extra: Object.assign(extra({ smith }), { [fsKey(['fncontact', 'smith'])]: { cname: 'Jo', phone: '0400 111 222', email: 'jo@example.com', upd: 1 } }), wait: 1200 });
  await L.waitFor(p, () => !!document.querySelector('#fn-band .fn-row'));
  { const m = await L.chefItems(p); ok(m.indexOf('functions') < 0 && m.indexOf('fn') >= 0, 'staff: Ann\'s chef hat has Functions to read (#/fn), not the managers\' page (' + m + ')'); }
  await p.click('.wtop-who'); await L.settle(p, 150); await p.click('.wm a[href="#/fn"]'); await L.settle(p, 500);
  { const pg = await txt(p, '#main') || ''; ok(/#\/fn$/.test(p.url()) && /Upcoming functions/.test(pg) && /Smith 50th/.test(pg) && !/Manage functions|New function/.test(pg), 'staff: Functions opens today and the next days, with no way to book or change one'); }
  await p.goto(L.BASE + '#/'); await L.settle(p, 600);
  // today's function is in the band right above, so the landing card does not list it again (23 Oct 2026)
  ok(/Smith 50th/.test(await txt(p, '#fn-band') || '') && await p.evaluate(() => { const e = document.getElementById('fn-land'); return !!e && e.hidden && !/Smith 50th/.test(e.textContent); }), 'landing: today\'s function is in the band, not again in a Functions card');
  await tap(p, '#fn-band .fn-row'); await L.settle(p, 200);
  const sh = await txt(p, '.fn-sheet') || '';
  ok(/Cake comes out at 20:00\.\s*Keep the pass clear\./.test(sh) && /Fay,/.test(sh), 'sheet: the whole kitchen comment with its author');
  ok(await p.$eval('.fn-kc .fn-text', e => getComputedStyle(e).whiteSpace) === 'pre-wrap', 'sheet: the comment keeps its lines');
  ok(/Two vegetarians/.test(sh) && /Tick each round as it goes out/.test(sh), 'sheet: notes, and it asks for each round to be ticked as it goes out');
  ok(!/0400|jo@example|Jo Smith/.test(await p.content()), 'staff: no phone, email or contact name anywhere on the page');
  ok(!(await p.$('.fn-sheet a[href^="#/functions/"]')), 'staff: no Change this function');
  await p.keyboard.press('Escape'); await L.settle(p, 100);
  ok(!(await p.$('.fn-pop')), 'sheet: Escape closes it');
  const refused = await p.evaluate(() => { const a = window.LK_PREP.book(); return a.W([['set', a.docRef('functions', 'smith'), { v: 2, status: 'cancelled', kc: '' }]]).then(() => 'saved', e => e && e.code); });
  ok(refused === 'permission-denied', 'staff: a direct save to a function is refused (' + refused + ')');
  await p.goto(L.BASE + '#/functions'); await L.settle(p, 900);
  ok(/Only function managers change functions/.test(await txt(p, '#fe-root') || ''), 'staff: #/functions says only function managers change them');
  ok(!(await p.$('script[src*="fnedit"]')), 'staff: the managers\' form is never downloaded');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. the band's timing: on at 00:00, gone at the end, an overnight function past midnight, a cancel and a move noticed
  const late = fn({ name: 'Late one', rounds: ['18:30', '19:30', '20:30'] });   // gone at 21:00
  p = await L.open(b, '#/recipes', { who: 'ann', extra: extra({ late }), clock: at(today, '20:58'), wait: 1200 });
  await L.waitFor(p, () => /Late one/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(/18:30 Late one[\s\S]*Round 1 of 3 not sent yet/.test(await txt(p, '#fn-band') || ''), 'timing: at 20:58 with nothing ticked, the band says round 1 is not sent yet (time alone never marks it served)');
  await p.clock.fastForward(3 * 60000);
  await L.waitFor(p, () => { const el = document.getElementById('fn-band'); return !el || el.hidden; }, null, 30000).catch(() => {});
  ok(await p.$eval('#fn-band', e => e.hidden), 'timing: gone by itself at 21:00 (30 minutes after the last round), page left open');
  await p.context().close();
  const night = fn({ name: 'Night owls', date: yesterday, start: '22:00', rounds: [[yesterday, '23:30'], [today, '00:30']] });
  p = await L.open(b, '#/recipes', { who: 'ann', extra: extra({ night }), clock: at(today, '00:45'), wait: 1200 });
  await L.waitFor(p, () => /Night owls/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(/Night owls/.test(await txt(p, '#fn-band') || ''), 'overnight: yesterday\'s late function still shows at 00:45 (until 01:00)');
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'ann', extra: extra({ smith }), clock: at(today, '00:00') + 1000, tz: 'America/New_York', wait: 1200 });
  await L.waitFor(p, () => /Smith 50th/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(/18:30 Smith 50th/.test(await txt(p, '#fn-band') || ''), 'time zone: a phone set to New York shows it from 00:00 kitchen time, at 18:30 kitchen time');
  await p.context().close();
  const gone = fn({ name: 'Jones wake', status: 'cancelled', start: '15:00', rounds: ['15:00'] });
  const moved = fn({ name: 'Brown 21st', date: day2, was: { date: today, start: at(today, '17:00'), first: at(today, '17:00'), from: at(today, '00:00'), until: at(today, '19:00') } });
  const draft = fn({ name: 'Draft do', status: 'draft' });
  p = await L.open(b, '#/prep', { who: 'ann', extra: extra({ smith, gone, moved, draft }), wait: 1200 });
  await L.waitFor(p, () => document.querySelectorAll('#fn-band .fn-row').length >= 2);
  let bt = await txt(p, '#fn-band') || '';
  ok(/\+1 more/.test(bt) && (await p.$$('#fn-band .fn-row')).length === 2, 'several: two show, then "+1 more"');
  await tap(p, '#fn-band [data-fn="more"]'); await L.settle(p, 100);
  bt = await txt(p, '#fn-band') || '';
  ok(/Cancelled/.test(bt) && /Jones wake/.test(bt) && /Do not send/.test(bt), 'cancel: a cancelled function shows as a notice in its old window');
  ok(/Rescheduled/.test(bt) && /Brown 21st/.test(bt) && new RegExp('now ' + M.dayName(day2)).test(bt), 'move: a moved function says where it went');
  ok(!/Draft do/.test(bt), 'draft: a draft never shows to the kitchen');
  await p.goto(L.BASE + '#/fn'); await L.settle(p, 900);
  const pg = await txt(p, '#main') || '';
  ok(/Upcoming functions/.test(pg) && new RegExp(M.dayName(day2)).test(pg) && /Brown 21st/.test(pg) && !/Draft do/.test(pg), '#/fn: the next three days, without drafts');
  await p.context().close();

  // guests not known yet: it can be confirmed, and the kitchen's views never show guests (22 Oct 2026)
  const unk = fn({ name: 'Mystery do', guests: 0 }); unk.gu = true; unk.guests = 0;
  p = await L.open(b, '#/recipes', { who: 'ann', extra: extra({ unk }), wait: 1200 });
  await L.waitFor(p, () => /Mystery do/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(!/guest/i.test(await txt(p, '#fn-band') || ''), 'guests: the band never mentions guests');
  await tap(p, '#fn-band .fn-row'); await L.settle(p, 200);
  ok(!/guest/i.test(await txt(p, '.fn-sheet') || ''), 'guests: the sheet never mentions guests');
  ok(/One round: this is the whole function, 3 platters/.test(await txt(p, '.fn-sheet .fn-whole') || '') && !(await p.$('.fn-sheet .fn-whole-list')), 'sheet: one round says it is the whole function, with no second list of the same platters');
  await p.context().close();

  // start time TBC: the coordinator confirms anyway, the kitchen sees TBC all day
  p = await L.open(b, '#/functions/new', { who: 'fay', extra: base, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="st"]'));
  await p.fill('[data-ff="name"]', 'Tbc party');
  await setV(p, '[data-ff="date"]', today);
  await p.click('[data-ff="st"]'); await L.settle(p, 150);
  await p.click('[data-ff="gu"]'); await L.settle(p, 150);
  ok(await p.$eval('[data-ff="startT"]', e => e.disabled), 'TBC: the start time box is locked');
  await tap(p, '[data-fe="addline"][data-v="pizza-platter"]'); await L.settle(p, 100);
  await setV(p, '[data-ff="qty0"]', '4');
  await tap(p, '[data-fe="review"]'); await L.settle(p, 200);
  ok(!!(await p.$('.fe-review')) && /TBC/.test(await txt(p, '.fe-review') || ''), 'TBC: confirming is allowed and the review says TBC');
  await tap(p, '[data-fe="confirm"]');
  await L.waitFor(p, () => /Confirmed/.test((document.querySelector('.fe-head') || {}).textContent || ''));
  const tb = Object.values(await store(p)).filter(x => x && x.name === 'Tbc party')[0];
  ok(!!tb && tb.status === 'confirmed' && tb.st === true && tb.start === 0 && tb.gu === true && tb.until === at(M.addDays(today, 1), '00:00'), 'TBC: saved confirmed, shown until midnight');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 900);
  await L.waitFor(p, () => /Tbc party/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(/Times TBC: 4 × Pizza/.test(await txt(p, '#fn-band') || ''), 'TBC: the band says Times TBC with the platters');
  ok(p.errors.length === 0, 'TBC: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a function's platter line left unticked yesterday never rolls over onto today; the kitchen's own line does
  const yd = {}, yline = x => Object.assign({ station: 'Sauce', qty: '1', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 90000000, done: false, deleted: false }, x);
  yd[fsKey(['days', yesterday, 'items', 'y1'])] = yline({ text: 'Make stock' });
  yd[fsKey(['days', yesterday, 'items', 'fn-old-pizza-platter'])] = yline({ text: 'Pizza Platter: Old do, at 18:00', station: 'Functions', fn: 'old', dupOk: true });
  p = await L.open(b, '#/prep', { extra: Object.assign({}, base, yd), wait: 3000 });
  await L.waitFor(p, () => /Make stock/.test((document.getElementById('prep-root') || {}).textContent || ''), null, 15000).catch(() => {});
  const tday = Object.keys(await store(p)).filter(k => k.indexOf('/days/' + today + '/items/r') >= 0).map(k => k.split('/').pop());
  ok(tday.some(k => /y1$/.test(k)) && !tday.some(k => /fn-old/.test(k)), 'rollover: yesterday\'s Make stock rolls over, the function\'s platter line does not (' + tday.join(',') + ')');
  await p.context().close();

  // sent ticks: Ann ticks round 1 in the sheet, the band moves on; she can undo a mis-tap; a missed round says so
  p = await L.open(b, '#/recipes', { who: 'ann', extra: extra({ smith }), clock: at(today, '18:31'), wait: 1200 });
  await L.waitFor(p, () => /Smith 50th/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(/Round 1 of 3 not sent yet: 3 × Antipasto, 2 × Aussie/.test(await txt(p, '#fn-band') || ''), 'sent: a round past its time and not ticked says "not sent yet" (' + (await txt(p, '#fn-band') || '').replace(/\s+/g, ' ').slice(0, 160) + ')');
  await tap(p, '#fn-band .fn-row'); await L.settle(p, 200);
  // the sheet leads with what goes out next: the date line, then the next round's time and platters, then every round
  const order = await p.evaluate(() => [...document.querySelectorAll('.fn-sheet .fn-sub, .fn-sheet .fn-next, .fn-sheet .fn-whole, .fn-sheet .fn-rounds, .fn-sheet .fn-kc')].map(e => e.className.split(' ')[0]));
  ok(JSON.stringify(order) === JSON.stringify(['fn-sub', 'fn-next', 'fn-whole', 'fn-rounds', 'fn-kc']), 'sheet: date line, next out, the whole function, every round, then the kitchen comment (' + order.join(',') + ')');
  // under Next out, the whole function added up (22 Oct 2026), each platter linked to its card, and no second platter list
  const wh = (await txt(p, '.fn-sheet .fn-whole') || '').replace(/\s+/g, ' ');
  ok(/Whole function 12 platters/.test(wh) && /All 3 rounds added up/.test(wh) && /3 × Antipasto Platter/.test(wh) && /4 × Aussie Platter/.test(wh) && /5 × Pizza Platter/.test(wh), 'sheet: the whole function under Next out, 12 platters over 3 rounds (' + wh.slice(0, 160) + ')');
  ok((await p.$$('.fn-sheet .fn-whole a[href^="#/r/"]')).length === 3 && (await p.$$('.fn-sheet .fn-next a[href^="#/r/"]')).length === 2, 'sheet: every platter links to its recipe card');
  ok(/^Function/.test(await txt(p, '.fn-sheet .fn-eb') || '') && !!(await p.$('.fn-sheet .fn-grip')), 'sheet: the book\'s sheet top, a grip and the Function label');
  ok(new RegExp(M.dayName(today) + ' · Beer garden · event 18:00').test(await txt(p, '.fn-sub') || ''), 'sheet: one line for the day, the place and the event start');
  const nx = (await txt(p, '.fn-next') || '').replace(/\s+/g, ' ');
  ok(/Next out 18:30 · round 1 of 3/.test(nx) && /Due 18:30, not sent yet/.test(nx) && /3 ?× ?Antipasto Platter ?2 ?× ?Aussie Platter/.test(nx), 'sheet: next out is round 1 at 18:30 with 3 Antipasto and 2 Aussie, late (' + nx.slice(0, 160) + ')');
  await tap(p, '.fn-next [data-fn="sent"]'); await L.settle(p, 400);
  ok(/19:00 · round 2 of 3/.test(await txt(p, '.fn-next') || ''), 'sheet: Sent in the next box moves it on to round 2');
  s = await store(p);
  const st = s[fsKey(['fnsent', 'smith_' + at(today, '18:30')])];
  ok(!!st && st.sent === true && st.sentBy === 'ann' && st.by === 'ann' && st.day === today, 'sent: the tick is saved as Ann\'s');
  ok(/Ann/.test(await txt(p, '.fn-sheet .fn-sent') || '') && !!(await p.$('.fn-sheet [data-fn="unsent"]')), 'sent: the sheet shows who ticked it, with Undo');
  await p.keyboard.press('Escape'); await L.settle(p, 100);
  const bs = await txt(p, '#fn-band') || '';
  ok(/19:00 Smith 50th/.test(bs) && /Round 2 of 3: 2 × Aussie, 2 × Pizza \(4 of 12\)/.test(bs), 'sent: the band moves on to round 2 (' + bs.replace(/\s+/g, ' ').slice(0, 200) + ')');
  await tap(p, '#fn-band .fn-row'); await L.settle(p, 200);
  await tap(p, '.fn-sheet [data-fn="unsent"]'); await L.settle(p, 400);
  ok((await store(p))[fsKey(['fnsent', 'smith_' + at(today, '18:30')])].sent === false, 'sent: Undo takes the tick back');
  ok(p.errors.length === 0, 'sent: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: '', extra: extra({ smith }), clock: at(today, '18:31'), wait: 1200 });
  await L.waitFor(p, () => /Smith 50th/.test((document.getElementById('fn-band') || {}).textContent || ''));
  await tap(p, '#fn-band .fn-row'); await L.settle(p, 200);
  await tap(p, '.fn-sheet [data-fn="sent"][data-r="0"]'); await L.settle(p, 500);
  ok(/#\/prep/.test(p.url()) && !(await store(p))[fsKey(['fnsent', 'smith_' + at(today, '18:30')])], 'sent: with nobody signed in, Sent asks who you are first and saves nothing');
  await p.context().close();

  // the service view (22 Oct 2026): two functions on at once, everything due in one list, late first, platters added up
  const jones = fn({ name: 'Jones 40th', loc: 'Function room', rounds: ['18:40'], lines: [['pizza-platter', 'Pizza Platter', [2]], ['antipasto-platter', 'Antipasto Platter', [1]]] });
  p = await L.open(b, '#/recipes', { who: 'ann', extra: extra({ smith, jones }), clock: at(today, '18:31'), wait: 1200 });
  await L.waitFor(p, () => /Jones 40th/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(!!(await p.$('#fn-band a.fn-svc[href="#/fn/now"]')), 'service: with two functions on, the band offers the service view');
  await tap(p, '#fn-band a.fn-svc'); await L.settle(p, 500);
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-row').length === 2);
  let sv = await p.$$eval('.fn-svc-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  ok(/18:30 Late Smith 50th · Beer garden · round 1 of 3/.test(sv[0]) && /3 × Antipasto/.test(sv[0]) && /18:40 Jones 40th · Function room/.test(sv[1]) && /2 × Pizza/.test(sv[1]), 'service: the late round first, then the one due at 18:40 (' + sv.join(' / ').slice(0, 260) + ')');
  const tp = (await txt(p, '.fn-svc-page .fn-next') || '').replace(/\s+/g, ' ');
  ok(/To plate now 8 platters/.test(tp) && /4 ?× ?Antipasto Platter ?2 ?× ?Aussie Platter ?2 ?× ?Pizza Platter/.test(tp), 'service: to plate now adds both functions up, most first (' + tp.slice(0, 200) + ')');
  await tap(p, '.fn-svc-row [data-fn="sent"][data-id="smith"]'); await L.settle(p, 400);
  sv = await p.$$eval('.fn-svc-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  ok(/18:40 Jones 40th/.test(sv[0]) && /19:00 Later Smith 50th · Beer garden · round 2 of 3/.test(sv[1]), 'service: Sent moves Smith on to round 2, after Jones (' + sv.join(' / ').slice(0, 200) + ')');
  ok(/Smith 50th round 1 sent 18:3\d, Ann/.test(await txt(p, '.fn-svc-just') || '') && !!(await p.$('.fn-svc-just [data-fn="unsent"]')), 'service: just sent shows who, with Undo');
  ok(await p.$eval('#fn-band', e => e.hidden), 'service: no band above the service view (it shows the same rounds)');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 600);
  await L.waitFor(p, () => /Jones 40th/.test((document.getElementById('fn-band') || {}).textContent || ''));
  const bj = (await txt(p, '#fn-band') || '').replace(/\s+/g, ' ');
  ok(bj.indexOf('Jones 40th') >= 0 && bj.indexOf('Jones 40th') < bj.indexOf('Smith 50th'), 'band: sorted by what is still to go out, so Jones comes before Smith once Smith round 1 is sent');
  await p.evaluate(() => { document.body.style.minHeight = '4000px'; window.scrollTo(0, 1500); }); await L.settle(p, 300);
  ok(await p.$eval('.fn-strip', e => !e.hidden && /^18:40/.test(e.textContent.trim()) && /\+1/.test(e.textContent)) && !!(await p.$('.fn-strip a.fn-strip-b[href="#/fn/now"]')), 'strip: the most urgent leads, +1 apart, and a tap opens the service view');
  ok(p.errors.length === 0, 'service: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the band the day before: an order reminder on the order day, and tomorrow's function; and the strip while scrolling
  const tm = fn({ name: 'Tomorrow do', date: tomorrow, rounds: ['12:00'] }); tm.od = today;
  p = await L.open(b, '#/prep', { who: 'ann', extra: extra({ smith, tm }), wait: 1500 });
  await L.waitFor(p, () => /Tomorrow do/.test((document.getElementById('fn-band') || {}).textContent || ''));
  const bn = (await txt(p, '#fn-band') || '').replace(/\s+/g, ' ');
  ok(/Order today\s*Short notice Stock for Tomorrow do/.test(bn) && /on the order list/.test(bn), 'order: the band reminds the kitchen to order on the order day (' + bn.slice(0, 260) + ')');
  ok(/Tomorrow\s*Tomorrow do · event 18:00 · food 12:00/.test(bn), 'tomorrow: a short line for tomorrow\'s function');
  ok(/^Functions today and soon/.test(bn), 'band: the label says today and soon (' + bn.slice(0, 60) + ')');
  // the round minus folds the band to one line for the rest of the day on this phone; the plus opens it again
  ok(await p.$eval('#fn-band [data-fn="fold"]', e => e.textContent === '\u2212' && e.getAttribute('aria-label') === 'Hide functions' && e.offsetWidth <= 40), 'fold: the button is a small round minus');
  await tap(p, '#fn-band [data-fn="fold"]'); await L.settle(p, 150);
  ok(await p.$eval('#fn-band [data-fn="fold"]', e => e.textContent === '+' && e.getAttribute('aria-label') === 'Show functions'), 'fold: folded, the button is a plus');
  ok(!(await p.$('#fn-band .fn-row')) && /Smith 50th/.test(await txt(p, '#fn-band .fn-band-sum') || '') && await p.$eval('#fn-band .fn-sum-more', e => !e.hidden && e.textContent === '+2') && await p.evaluate(() => localStorage.getItem('lk.fn.fold')) === today, 'fold: on a phone Hide folds the band to one line, the next function and +2');
  await p.setViewportSize({ width: 1280, height: 800 }); await L.settle(p, 200);
  ok(await p.$$eval('#fn-band .fn-sum-i:not([hidden])', e => e.length) === 3 && await p.$eval('#fn-band .fn-sum-more', e => e.hidden), 'fold: on a wide screen the one line shows all three, with no +N');
  await p.setViewportSize({ width: 390, height: 844 }); await L.settle(p, 200);
  await p.reload(); await L.settle(p, 1200);
  await L.waitFor(p, () => /Smith 50th/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(!(await p.$('#fn-band .fn-row')) && !!(await p.$('#fn-band .is-fold')), 'fold: still folded after a reload the same day');
  await tap(p, '#fn-band [data-fn="fold"]'); await L.settle(p, 150);
  ok((await p.$$('#fn-band .fn-row')).length >= 2 && await p.evaluate(() => localStorage.getItem('lk.fn.fold')) === null, 'fold: Show opens the band again');
  ok(!(await p.$('.fn-strip:not([hidden])')), 'strip: not there while the band is on screen');
  await p.evaluate(() => { document.body.style.minHeight = '4000px'; window.scrollTo(0, 1500); }); await L.settle(p, 300);
  ok(/Smith 50th/.test(await txt(p, '.fn-strip') || '') && await p.$eval('.fn-strip', e => !e.hidden && e.getBoundingClientRect().top === 0), 'strip: scrolled down, today\'s function stays pinned to the top');
  ok(await p.evaluate(() => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fn-stick'))) > 30, 'strip: the bars that stick to the top move down below it');
  await tap(p, '.fn-strip-b'); await L.settle(p, 200);
  ok(!!(await p.$('.fn-sheet')), 'strip: a tap opens the sheet');
  await p.keyboard.press('Escape'); await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 300);
  ok(await p.$eval('.fn-strip', e => e.hidden), 'strip: gone again back at the top');
  ok(p.errors.length === 0, 'strip: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the landing card (23 Oct 2026): the band has its own rows for today's and tomorrow's functions, so the card leaves
  // those out and lists the rest up to 3 days out, by day, then by when food goes out, times TBC last in a day; with
  // nothing left there is no card
  p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith, tm }), wait: 1500 });
  await L.waitFor(p, () => /Tomorrow do/.test((document.getElementById('fn-band') || {}).textContent || ''));
  ok(await p.evaluate(() => { const e = document.getElementById('fn-land'); return !!e && e.hidden && !/Smith 50th|Tomorrow do/.test(e.textContent); }), 'landing: only today and tomorrow booked, no Functions card (the band has both)');
  await p.context().close();
  // names against the alphabet, so only a sort by time passes: Zed at 12:00, Brown at 18:30, Adams with times TBC
  const zed = fn({ name: 'Zed lunch', date: day2, start: '11:30', rounds: ['12:00'] });
  const brown = fn({ name: 'Brown 21st', date: day2, rounds: ['18:30'] });
  const wake = M.derive(Object.assign(fn({ name: 'Adams wake', date: day2 }), { start: 0, st: true, rounds: [], mode: 'all' }));
  const green = fn({ name: 'Green 30th', date: M.addDays(today, 3), start: '11:00', rounds: ['11:30'] });
  const far = fn({ name: 'Far off', date: M.addDays(today, 4) });
  p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith, tm, wake, brown, zed, green, far }), wait: 1500 });
  await L.waitFor(p, () => /Green 30th/.test((document.getElementById('fn-land') || {}).textContent || ''));
  let land = (await txt(p, '#fn-land') || '').replace(/\s+/g, ' ');
  ok(/Smith 50th/.test(await txt(p, '#fn-band') || '') && !/Smith 50th|Tomorrow do|Far off/.test(land), 'landing: the card leaves out today\'s and tomorrow\'s functions (in the band) and the ones further off (' + land + ')');
  ok(new RegExp(M.dayName(day2) + ' Zed lunch, food 12:00.*' + M.dayName(day2) + ' Brown 21st, food 18:30.*' + M.dayName(day2) + ' Adams wake, food TBC.*Green 30th, food 11:30').test(land), 'landing: 2 and 3 days out, by day, then by food time, times TBC last in a day (' + land + ')');
  ok(/Open functions$/.test(land) && await p.$eval('#fn-land .fn-land-go', e => e.getAttribute('href')) === '#/fn', 'landing: the card opens Functions');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'landing: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a busy Sunday: three functions today and two order reminders push a function today and tomorrow's behind the
  // band's "+2 more", so the card names them; one already over today is left out; with the band opened, no card
  const ward = fn({ name: 'Ward 60th', start: '16:30', rounds: ['17:00'] }), lee = fn({ name: 'Lee 18th', start: '17:30', rounds: ['18:00'] });
  const abbott = fn({ name: 'Abbott do', start: '18:30', rounds: ['19:00'] }), brekky = fn({ name: 'Brekky do', start: '07:00', rounds: ['07:30'] });
  const kerr = fn({ name: 'Kerr lunch', date: tomorrow, start: '11:30', rounds: ['12:00'] });
  const o5 = fn({ name: 'Order five', date: M.addDays(today, 5) }), o6 = fn({ name: 'Order six', date: M.addDays(today, 6) }); o5.od = today; o6.od = today;
  p = await L.open(b, '#/', { who: 'ann', extra: extra({ ward, lee, abbott, brekky, kerr, o5, o6 }), wait: 1500 });
  await L.waitFor(p, () => /Kerr lunch/.test((document.getElementById('fn-land') || {}).textContent || ''));
  const bnd = (await txt(p, '#fn-band') || '').replace(/\s+/g, ' ');
  land = (await txt(p, '#fn-land') || '').replace(/\s+/g, ' ');
  ok(/Ward 60th/.test(bnd) && /Lee 18th/.test(bnd) && /Order five/.test(bnd) && /Order six/.test(bnd) && !/Abbott do|Kerr lunch/.test(bnd) && /\+2 more/.test(bnd), 'landing: the band shows two of today\'s and the two order reminders, then +2 more (' + bnd.slice(0, 200) + ')');
  ok(/Today Abbott do, food 19:00.*Tomorrow Kerr lunch, food 12:00/.test(land) && !/Ward 60th|Lee 18th|Brekky do|Order five|Order six/.test(land), 'landing: the card names today\'s and tomorrow\'s functions behind +2 more, and not one already over (' + land + ')');
  await tap(p, '#fn-band [data-fn="more"]'); await L.settle(p, 200);
  ok(/Abbott do/.test(await txt(p, '#fn-band') || '') && /Kerr lunch/.test(await txt(p, '#fn-band') || '') && await p.$eval('#fn-land', e => e.hidden), 'landing: +2 more opens them in the band, and the card goes (nothing left to list)');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'landing busy day: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. upcoming totals: each booked line once, confirmed only
  const t1 = fn({ name: 'Tomorrow A', date: tomorrow, rounds: ['12:00', '12:30'], lines: [['pizza-platter', 'Pizza Platter', [2, 3]]] });
  const t2 = fn({ name: 'Tomorrow B', date: tomorrow, guests: 200, lines: [['pizza-platter', 'Pizza Platter', [4]], ['vege-platter', 'Vege Platter', [2]]] });
  const t3 = fn({ name: 'Tomorrow C', date: tomorrow, status: 'cancelled', lines: [['pizza-platter', 'Pizza Platter', [9]]] });
  p = await L.open(b, '#/fn', { who: 'ann', extra: extra({ t1, t2, t3 }), wait: 1200 });
  await L.waitFor(p, () => /Tomorrow A/.test((document.getElementById('main') || {}).textContent || ''));
  const day = await p.$$eval('.fn-day', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  ok(/To make for the day ?9 × Pizza Platter ?2 × Vege Platter/.test(day[0] || ''), 'totals: tomorrow is 9 pizza (5 + 4, rounds not counted twice, cancelled and guests left out) and 2 vege (' + (day[0] || '').slice(0, 220) + ')');
  await p.context().close();

  // 5. two coordinators: Finn changes the comment, both names stay; Fay's open form meets Finn's save; then her tick goes
  p = await L.open(b, '#/functions/smith', { who: 'finn', extra: extra({ smith }), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="kc"]'));
  ok(/Saved comment by Fay/.test(await txt(p, '.fe-kcb') || ''), 'comment: the saved comment shows its author');
  await p.fill('[data-ff="kc"]', 'Cake at 20:30 now.');
  await tap(p, '[data-fe="save"]');
  await L.waitFor(p, () => /Version 2/.test((document.getElementById('fe-root') || {}).textContent || ''));
  s = await store(p);
  let f2 = s[fsKey(['functions', 'smith'])];
  ok(f2.v === 2 && f2.kcBy === 'finn' && f2.by === 'finn' && f2.cBy === 'fay' && f2.confBy === 'fay' && /Kitchen comment changed/.test(f2.chg[0].what) && f2.chg[0].by === 'finn', 'comment: Finn\'s change is his, Fay stays the one who made and confirmed it');
  ok(!!s[fsKey(['functions', 'smith', 'hist', '1'])], 'history: version 1 is kept');
  ok(p.errors.length === 0, 'duplicate: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/functions/smith', { who: 'fay', extra: extra({ smith }), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="guests"]'));
  await p.evaluate(f => window.__fake.write('kitchens/000000/functions/smith', f), Object.assign({}, smith, { v: 2, by: 'finn', guests: 70, upd: L.NOW }));
  await p.evaluate(f => { window.__fake.server = { 'kitchens/000000/functions/smith': f }; }, Object.assign({}, smith, { v: 2, by: 'finn', guests: 70, upd: L.NOW }));
  await p.fill('[data-ff="guests"]', '65');
  await tap(p, '[data-fe="save"]');
  await L.waitFor(p, () => !!document.querySelector('.fe-conflict'));
  ok(/Someone else saved this function/.test(await txt(p, '.fe-conflict') || '') && /Finn/.test(await txt(p, '.fe-conflict') || ''), 'conflict: Fay is told Finn saved first, nothing is overwritten');
  ok((await store(p))[fsKey(['functions', 'smith'])].guests === 70, 'conflict: Finn\'s version stays until Fay chooses');
  // the head chef takes Fay's tick away (on the admin device): her open form closes at once and nothing more is saved
  await p.evaluate(c => window.__fake.write('kitchens/000000/config/main', c), Object.assign({}, CFG, { fnIds: ['finn'], people: PEOPLE.map(x => x.id === 'fay' ? Object.assign({}, x, { fn: false }) : x) }));
  await L.waitFor(p, () => /Only function managers/.test((document.getElementById('fe-root') || {}).textContent || ''));
  ok(/kept on this device/.test(await txt(p, '#fe-root') || ''), 'revoked: the form closes straight away and says her changes are kept on the device');
  const after = await p.evaluate(() => { const a = window.LK_PREP.book(); return a.W([['set', a.docRef('functions', 'smith'), { v: 3, status: 'confirmed', guests: 65 }]]).then(() => 'saved', e => e && e.code); });
  ok(after === 'permission-denied', 'revoked: her next save is refused (' + after + ')');
  ok((await L.chefItems(p)).indexOf('functions') < 0, 'revoked: Functions leaves her chef hat'); await p.keyboard.press('Escape');
  ok(p.errors.length === 0, 'two coordinators: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 6. duplicate makes a new draft with its own id and no date; cancel tells the kitchen
  p = await L.open(b, '#/functions/smith', { who: 'fay', extra: extra({ smith }), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-fe="dup"]'));
  await tap(p, '[data-fe="dup"]'); await L.settle(p, 300);
  ok(await p.$eval('[data-ff="name"]', e => e.value) === 'Smith 50th (copy)' && await p.$eval('[data-ff="date"]', e => e.value) === '', 'duplicate: a new draft with the date left for you to pick');
  await setV(p, '[data-ff="date"]', day2);
  await tap(p, '[data-fe="save"]');
  // the save itself: "Version 1" shows once it is saved (the draft tag is on the form before the save)
  await L.waitFor(p, () => /Version 1\./.test((document.getElementById('fe-root') || {}).textContent || ''), null, 15000);
  s = await store(p);
  const copies = Object.keys(s).filter(k => /\/functions\/[^/]+$/.test(k) && !/\/smith$/.test(k)).map(k => s[k]);
  ok(copies.length === 1 && copies[0].status === 'draft' && copies[0].date === day2 && copies[0].rounds[0].at === at(day2, '18:30') && copies[0].kq === 0, 'duplicate: saved as a draft on the new date, times kept, never in the kitchen\'s list');
  await p.context().close();
  p = await L.open(b, '#/functions/smith', { who: 'fay', extra: extra({ smith }), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-fe="cancel"]'), null, 15000);
  await tap(p, '[data-fe="cancel"]'); await L.settle(p, 100);
  ok(/Tap again to cancel/.test(await txt(p, '[data-fe="cancel"]') || ''), 'cancel: asks for a second tap');
  await tap(p, '[data-fe="cancel"]');
  await L.waitFor(p, () => /Cancelled/.test((document.querySelector('.fe-head') || {}).textContent || ''));
  s = await store(p);
  f2 = s[fsKey(['functions', 'smith'])];
  const gone2 = s[fsKey(['days', today, 'items', 'fn-smith-pizza-platter'])];
  ok(!!gone2 && gone2.deleted === true && gone2.deletedBy === 'Fay', 'prep list: cancelling removes the function\'s platter lines');
  ok(f2.status === 'cancelled' && f2.canBy === 'fay' && f2.kq === f2.until && /Cancelled/.test(f2.chg[0].what), 'cancel: kept, marked cancelled by Fay, still in the kitchen\'s list for its notice');
  ok(p.errors.length === 0, 'duplicate and cancel: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 8. the admin People tab: only the head chef's save gives Functions; the role ticks it, the tick is what counts
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: base, wait: 1800 });
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  ok(await p.evaluate(() => [...document.querySelectorAll('#a-r1 option')].some(o => o.value === 'fnc' && /Functions coordinator/.test(o.textContent))), 'admin: Functions coordinator is a role');
  await p.selectOption('#a-r1', 'fnc'); await L.settle(p, 200);
  await p.click('input[data-perm="fn"][data-i="2"]'); await L.settle(p, 100);
  await p.click('[data-p="a-save"]'); await L.settle(p, 600);
  s = await store(p);
  let c = s[fsKey(['config', 'main'])];
  ok(['ann', 'bo', 'fay', 'finn'].every(x => c.fnIds.indexOf(x) >= 0) && c.fnIds.indexOf('sam') < 0, 'admin: picking the role and ticking Bo give both Functions (' + c.fnIds.join(',') + ')');
  ok(c.people.filter(x => x.id === 'ann')[0].add === false && c.sousIds.indexOf('ann') < 0, 'admin: the coordinator role gives no other rights');
  await p.click('input[data-perm="fn"][data-i="3"]'); await L.settle(p, 100);
  await p.click('[data-p="a-save"]'); await L.settle(p, 600);
  c = (await store(p))[fsKey(['config', 'main'])];
  ok(c.fnIds.indexOf('fay') < 0 && c.people.filter(x => x.id === 'fay')[0].active !== false, 'admin: untick takes Functions away, Fay stays on the list');
  await p.context().close();
  // a tick changed outside the admin panel (a sous chef's save sends the whole people list) does not count until the head chef keeps it
  const sneaky = Object.assign({}, base, { [fsKey(['config', 'main'])]: Object.assign({}, CFG, { people: PEOPLE.map(x => x.id === 'bo' ? Object.assign({}, x, { fn: true }) : x) }) });
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: sneaky, wait: 1800 });
  await L.settle(p, 600);
  ok(/Bo\s*is now ticked for Functions/.test(await txt(p, '.a-ids') || ''), 'admin: a Functions tick changed elsewhere is shown to the head chef to keep or undo');
  c = (await store(p))[fsKey(['config', 'main'])];
  ok(c.fnIds.indexOf('bo') < 0, 'admin: and Bo cannot book functions until the head chef keeps it');
  await p.context().close();

  // 7. layout: the band, #/fn, the service view and the form at three widths, no sideways scroll, no errors
  for (const w of [390, 768, 1280]) {
    for (const [hash, who] of [['#/', 'ann'], ['#/fn/smith', 'ann'], ['#/fn/now', 'ann'], ['#/functions', 'fay'], ['#/functions/smith', 'fay']]) {
      p = await L.open(b, hash, { who, width: w, extra: extra({ smith, gone, t1, jones }), wait: 1500 });
      await L.settle(p, 600);
      const of = await L.overflow(p);
      ok(!of, w + ' px ' + hash + ': no sideways scroll ' + (of || ''));
      ok(p.errors.length === 0, w + ' px ' + hash + ': no page errors ' + p.errors.join(' | '));
      await p.context().close();
    }
  }
  await b.close();
  L.report(R);
})();
