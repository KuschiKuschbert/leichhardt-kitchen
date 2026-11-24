// The consistency sweep, step 3, choices 5 to 8 (head chef, 20 Nov 2026; docs/head-chef-decisions.md):
// 5. every search is the Recipes pill, its magnifier inside (.find-wrap, .find-i) and its label for screen readers only;
// 6. one frame for every Save bar that stays at the bottom (.sv-dock): the page colour, an ink line on top, no box;
// 7. the function form's Save and Check and confirm sit in its bar, like the recipe editor's;
// 8. empty lists outside the notebooks are a plain grey sentence, no dashed box.
// At 390 px, on a phone with the tab bar. Made-up people, functions and suppliers, and the stand-in only.
const L = require('./lib');
const F = require('./supplier-fixtures');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role, x) => Object.assign({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true }, x || {});
const headCfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const today = L.ymd(new Date(L.NOW)), day2 = M.addDays(today, 2);
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
function fn(o) {
  const date = day2, f = { v: 1, status: o.status || 'confirmed', name: o.name, date, start: at(date, '18:00'), st: false, loc: 'Beer garden', guests: 60, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: at(date, '18:30'), note: '' }], lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: M.toU([3]) }],
    was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 };
  return M.derive(f);
}
const FN = { [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('fay', 'Fay', 'fnc', { add: false, tick: false, del: false, fn: true })], sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'fay'], fnIds: ['fay'], showBadges: true },
  [fsKey(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [fsKey(['pinset', 'fay'])]: { at: 1 }, [fsKey(['drinks', 'fay'])]: { kind: 'flat', at: 1, by: 'fay' },
  [fsKey(['functions', 'f1'])]: fn({ name: 'Smith 50th' }), [fsKey(['functions', 'f2'])]: fn({ name: 'Lee 21st', status: 'draft' }) };
const TK = (...q) => ['kitchens', L.PIN, ...q].join('/');
const tPeople = [P('gus', 'Gus', 'head'), P('sam', 'Sam K', 'sous'), ...['Ari', 'Bea', 'Cal'].map(n => P(n.toLowerCase(), n, 'staff'))];
const TEAM = () => ({ [TK('config', 'main')]: { people: tPeople, headId: 'gus', sousIds: ['sam'], staffIds: tPeople.map(p => p.id), kitSecs: ['Grill', 'Pans', 'Larder'].map(n => ({ id: n.toLowerCase(), name: n })),
  kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false, occ: false }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, off: false, occ: false }] },
  [TK('team', today)]: { day: today, on: [['sam', 'lunch', ''], ['ari', 'lunch', 'grill'], ['bea', 'dinner', 'pans'], ['cal', 'dinner', 'larder']].map(([id, sh, sec]) => ({ id, sh, sec })), br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' } });

// one search box: in the pill wrapper, the magnifier inside its left end and centred on it, round ends, the old words
// as its placeholder, and its label read out but not shown
const pill = (p, id) => p.evaluate(id => {
  const box = document.getElementById(id); if (!box) return { none: true };
  const wrap = box.closest('.find-wrap'), icon = wrap && wrap.querySelector('svg.find-i'), b = box.getBoundingClientRect(), cs = getComputedStyle(box);
  const lab = document.querySelector('label[for="' + id + '"]'), lr = lab && lab.getBoundingClientRect(), i = icon && icon.getBoundingClientRect();
  return { wrap: !!wrap, icon: !!icon, hidden: !!icon && icon.getAttribute('aria-hidden') === 'true',
    inside: !!i && i.left >= b.left && i.right <= b.left + 56 && Math.abs((i.top + i.bottom) / 2 - (b.top + b.bottom) / 2) <= 3,
    clear: !!i && parseFloat(cs.paddingLeft) >= i.right - b.left,
    round: parseFloat(cs.borderTopLeftRadius) >= b.height / 2 - 1, label: lab ? lab.textContent.trim() : '', labelHidden: !!lr && lr.width <= 1 && lr.height <= 1,
    placeholder: box.getAttribute('placeholder') || '', h: Math.round(b.height) };
}, id);
// a Save bar: the shared frame, and where it sits against the tab bar
const bar = (p, sel) => p.evaluate(sel => {
  const e = document.querySelector(sel); if (!e) return { none: true };
  const cs = getComputedStyle(e), r = e.getBoundingClientRect(), tb = document.querySelector('.tabbar'), t = tb && tb.getBoundingClientRect();
  return { dock: e.classList.contains('sv-dock'), bg: cs.backgroundColor, top: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, side: cs.borderLeftWidth + ' ' + cs.borderBottomWidth,
    radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, pos: cs.position, bottom: Math.round(r.bottom), topY: Math.round(r.top), tab: t ? Math.round(t.top) : innerHeight, vh: innerHeight };
}, sel);
const INK = '2px solid rgb(28, 29, 31)', PAGE = 'rgb(251, 250, 247)', NOTEBOOK = 'rgb(251, 248, 241)';
const frameOk = (b, bg) => !b.none && b.dock && b.top === INK && b.side === '0px 0px' && b.radius === '0px' && b.bg === bg;
const shown = b => !b.none && b.topY < b.tab && b.bottom <= b.tab + 1;

const searches = [
  ['Recipes', '#/recipes', {}, 'find', 'Search', null, null],
  ['Manage', '#/manage', { who: 'ann', extra: headCfg() }, 'mg-q', 'Find a recipe', 'Name, card number or ingredient', null],
  ['Print cards', '#/manage/print', { who: 'ann', extra: headCfg() }, 'rcp-q', 'Find a card', 'Name or card number', null],
  ['Settings', '#/settings', { admin: true, who: '' }, 'st-find', 'Find a setting', 'Sound, PIN, sections...', null],
  ['Guides', '#/guides', { who: 'sam', extra: L.guides() }, 'g-q', 'Search the guides', 'Search: oven, fryer, cleaning', null],
  ['A list (Chef to-do, lvHTML)', '#/todo', { who: 'sam' }, null, 'Search', null, p => p.$eval('.lv-q', e => e.id)],
  ['Find a drawing', '#/manage/draw/new/burger/plate', { who: 'ann', extra: headCfg() }, 'dw-q', 'Find a drawing', 'For example: chips, pepper sauce, lemon wedge', p => L.dwAdd(p).then(() => 'dw-q')],
  // the same list helper in the admin panel, whose own box rule is taller and squarer
  ['A list (admin People, lvHTML)', '#/admin', { admin: true, adminPage: 'people', who: '' }, null, 'Search', 'Search names', p => L.waitFor(p, () => !!document.querySelector('.a-pane .lv-q'), null, 15000).then(() => p.$eval('.a-pane .lv-q', e => e.id))]
];

(async () => {
  const b = await L.start();
  let p;

  /* ---------- 5. every search is the Recipes pill ---------- */
  for (const [name, hash, o, id0, label, ph, ready] of searches) {
    p = await L.open(b, hash, Object.assign({ wait: 1500 }, o));
    try {
      let id = id0;
      if (ready) id = await ready(p) || id0;
      else await L.waitFor(p, id => !!document.getElementById(id), id, 15000);
      await L.waitFor(p, id => !!document.getElementById(id), id, 15000); await L.settle(p, 300);
      const s = await pill(p, id);
      ok(s.wrap && s.icon && s.hidden, name + ': the search is the pill with its magnifier (' + JSON.stringify({ wrap: s.wrap, icon: s.icon, hidden: s.hidden }) + ')');
      ok(s.inside && s.clear, name + ': the magnifier sits inside the box at its left end, clear of the words (' + JSON.stringify({ inside: s.inside, clear: s.clear }) + ')');
      ok(s.round && s.h >= 44, name + ': round ends and at least 44 px tall (' + s.h + ' px)');
      ok(s.label === label && s.labelHidden, name + ': its label "' + label + '" is read out but not shown (' + JSON.stringify(s.label) + ', hidden ' + s.labelHidden + ')');
      if (ph) ok(s.placeholder === ph, name + ': keeps its own words in the box (' + s.placeholder + ')');
      // typing still finds, and the caret stays in the box
      await p.click('#' + id); await p.keyboard.type('ch'); await L.settle(p, 400);
      ok(await p.evaluate(id => document.activeElement && document.activeElement.id === id && document.activeElement.value === 'ch', id), name + ': typing keeps the focus and the words in the box');
      // while it finds, the "Filtering by" line shows under the box: the magnifier stays on the box (it was pulled down)
      const s2 = await pill(p, id);
      ok(s2.inside, name + ': the magnifier stays centred on the box while it finds');
      ok(!p.errors.length, name + ': no page errors ' + p.errors.join(' | '));
    } catch (e) { ok(false, name + ': ' + e.message.split('\n')[0]); }
    await p.context().close();
  }

  /* ---------- 6. one frame for every Save bar, above the tab bar ---------- */
  // the admin panel's Save bar (People), once something is not saved
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', who: '', wait: 1800 });
  try {
    await L.waitFor(p, () => !!document.querySelector('.pp-row'), null, 15000); await L.openPerson(p, 1);
    const nm = p.locator('.pp-ed [data-a="name"]').first(); await nm.fill('Ann B'); await nm.blur(); await L.settle(p, 300);
    await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 200);
    const a = await bar(p, '.a-savebar');
    ok(frameOk(a, PAGE), 'admin Save bar: the shared frame (' + JSON.stringify(a) + ')');
    ok(shown(a), 'admin Save bar: on the first screen, above the tab bar (' + a.topY + ' to ' + a.bottom + ', tab bar at ' + a.tab + ')');
    ok(await p.evaluate(() => { const w = document.querySelector('.a-savebar .a-unsaved'), s = document.querySelector('.a-savebar [data-p="a-save"]'); return !!w && !!s && w.getBoundingClientRect().top <= s.getBoundingClientRect().top + 1 && (w.getBoundingClientRect().bottom <= s.getBoundingClientRect().top + 1 || w.getBoundingClientRect().right <= s.getBoundingClientRect().left + 1); }),
      'admin Save bar: what is not saved comes first, before Save changes');
  } catch (e) { ok(false, 'admin Save bar: ' + e.message.split('\n')[0]); }
  await p.context().close();

  // the recipe editor
  p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: headCfg(), wait: 1500 });
  try {
    await L.waitFor(p, () => !!document.querySelector('.mg-bar'), null, 15000); await L.settle(p, 300);
    const a = await bar(p, '.mg-bar');
    ok(frameOk(a, PAGE), 'recipe editor Save bar: the shared frame (' + JSON.stringify(a) + ')');
    ok(shown(a), 'recipe editor Save bar: above the tab bar (' + a.topY + ' to ' + a.bottom + ', tab bar at ' + a.tab + ')');
  } catch (e) { ok(false, 'recipe editor Save bar: ' + e.message.split('\n')[0]); }
  await p.context().close();

  // the supplier order's Review bar
  p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), wait: 1800 });
  try {
    await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000); await p.fill('input[data-sf="qty"]', '2'); await L.settle(p, 300);
    await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 200);
    const a = await bar(p, '.su-order-actions');
    ok(frameOk(a, PAGE), 'supplier order bar: the shared frame (' + JSON.stringify(a) + ')');
    ok(shown(a), 'supplier order bar: above the tab bar (' + a.topY + ' to ' + a.bottom + ', tab bar at ' + a.tab + ')');
  } catch (e) { ok(false, 'supplier order bar: ' + e.message.split('\n')[0]); }
  await p.context().close();

  // Today's team: the notebook's paper is its page
  p = await L.open(b, '#/team', { who: 'sam', extra: TEAM(), wait: 1800 });
  try {
    await L.waitFor(p, () => document.querySelectorAll('.tm-tlrow').length >= 3, null, 15000);
    await L.pick(p, 'select[data-k="tm-sec:sam:lunch"]', 'pans'); await L.settle(p, 400);
    const a = await bar(p, '.tm-focus-save');
    ok(frameOk(a, NOTEBOOK), 'Today\'s team Save dock: the shared frame on the notebook\'s paper (' + JSON.stringify(a) + ')');
    ok(shown(a), 'Today\'s team Save dock: above the tab bar (' + a.topY + ' to ' + a.bottom + ', tab bar at ' + a.tab + ')');
  } catch (e) { ok(false, 'Today\'s team Save dock: ' + e.message.split('\n')[0]); }
  await p.context().close();

  // Print cards
  p = await L.open(b, '#/manage/print', { who: 'ann', extra: headCfg(), wait: 1500 });
  try {
    await L.waitFor(p, () => !!document.querySelector('.rcp-bar'), null, 15000); await L.settle(p, 300);
    const a = await bar(p, '.rcp-bar');
    ok(frameOk(a, PAGE), 'Print cards bar: the shared frame (' + JSON.stringify(a) + ')');
    ok(shown(a) && a.pos === 'fixed', 'Print cards bar: fixed above the tab bar (' + a.topY + ' to ' + a.bottom + ', tab bar at ' + a.tab + ')');
  } catch (e) { ok(false, 'Print cards bar: ' + e.message.split('\n')[0]); }
  await p.context().close();

  /* ---------- 6 and 7. the function form: the frame, and its Save buttons in the bar ---------- */
  for (const [id, words, buttons] of [['f1', 'Smith 50th', ['save']], ['f2', 'Lee 21st', ['review', 'save']]]) {
    p = await L.open(b, '#/functions/' + id, { who: 'fay', extra: FN, wait: 1500 });
    try {
      await L.waitFor(p, () => !!document.querySelector('[data-ff="notes"]'), null, 15000);
      await p.fill('[data-ff="name"]', words + ' party'); await L.settle(p, 200);
      await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); }); await L.settle(p, 200);
      const a = await bar(p, '.fe-bar');
      ok(frameOk(a, PAGE), words + ': the function form\'s bar has the shared frame (' + JSON.stringify(a) + ')');
      ok(shown(a), words + ': its bar is on the first screen, above the tab bar (' + a.topY + ' to ' + a.bottom + ', tab bar at ' + a.tab + ')');
      ok(/3 platters/.test(await L.txt(p, '.fe-bar') || ''), words + ': the bar keeps its summary (' + (await L.txt(p, '.fe-bar') || '').replace(/\s+/g, ' ').slice(0, 90) + ')');
      for (const k of buttons) {
        const r = await p.evaluate(k => { const e = document.querySelector('[data-fe="' + k + '"]'), r = e && e.getBoundingClientRect(), t = document.querySelector('.tabbar').getBoundingClientRect(); return e ? { inBar: !!e.closest('.fe-bar'), top: r.top, bottom: r.bottom, tab: t.top, h: r.height, on: !e.disabled, text: e.textContent.trim() } : null; }, k);
        ok(r && r.inBar && r.top >= 0 && r.bottom <= r.tab + 1 && r.h >= 44, words + ': ' + (r ? r.text : k) + ' sits in the bar, on the first screen (' + JSON.stringify(r) + ')');
      }
      ok(await p.evaluate(() => !document.querySelector('.fe-bar [data-fe="dup"]') && !!document.querySelector('[data-fe="dup"]') && !document.querySelector('.fe-bar [data-fe="hist"]') && !!document.querySelector('[data-fe="hist"]')),
        words + ': Duplicate and History stay at the foot of the form');
      ok(await p.evaluate(() => !document.querySelector('.fe-bar .fn-cancel, .fe-bar [data-fe="cancel"], .fe-bar [data-fe$="cancel"]')), words + ': Cancel function is not in the bar');
      // Save from the bar: the slip says so above the bar, not over it (the bar is taller now it holds the buttons)
      await p.click('.fe-bar [data-fe="save"]');
      await L.waitFor(p, () => !!document.querySelector('.fe-toasts .p-toast'), null, 8000);
      const sl = await p.evaluate(() => { const t = document.querySelector('.fe-toasts .p-toast').getBoundingClientRect(), b = document.querySelector('.fe-bar').getBoundingClientRect(); return { slip: Math.round(t.bottom), bar: Math.round(b.top), text: document.querySelector('.fe-toasts').textContent.trim() }; });
      ok(sl.slip <= sl.bar + 1, words + ': the slip after Save sits above the bar (' + JSON.stringify(sl) + ')');
      ok(!p.errors.length, words + ': no page errors ' + p.errors.join(' | '));
    } catch (e) { ok(false, words + ': ' + e.message.split('\n')[0]); }
    await p.context().close();
  }

  /* ---------- 8. empty lists: a plain grey sentence, no dashed box ---------- */
  const plain = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return { dashed: [cs.borderTopStyle, cs.borderLeftStyle].indexOf('dashed') >= 0, border: cs.borderTopWidth, color: cs.color, text: e.textContent.replace(/\s+/g, ' ').trim() }; }, sel);
  const MUTED = 'rgb(85, 88, 94)';
  p = await L.open(b, '#/suppliers', { who: 'sam', wait: 1500 });
  try {
    await L.waitFor(p, () => !!document.querySelector('#supplier-root .empty'), null, 15000);
    const e = await plain(p, '#supplier-root .empty');
    ok(e && !e.dashed && e.border === '0px' && e.color === MUTED && /^No supplier catalogue yet/.test(e.text), 'Suppliers: no catalogue is a plain grey sentence with its words (' + JSON.stringify(e) + ')');
  } catch (x) { ok(false, 'Suppliers empty: ' + x.message.split('\n')[0]); }
  await p.context().close();
  p = await L.open(b, '#/fn', { who: 'sam', wait: 1500 });
  try {
    await L.waitFor(p, () => !!document.querySelector('.fn-quiet'), null, 15000);
    const e = await plain(p, '.fn-quiet');
    ok(e && !e.dashed && e.border === '0px' && e.color === MUTED && e.text === 'Nothing booked in the next 7 days.', 'Functions: nothing booked is a plain grey sentence (' + JSON.stringify(e) + ')');
  } catch (x) { ok(false, 'Functions empty: ' + x.message.split('\n')[0]); }
  await p.context().close();
  p = await L.open(b, '#/recipes', { wait: 1500 });
  try {
    await L.waitFor(p, () => !!document.getElementById('find'));
    await p.fill('#find', 'zzzzqq'); await p.press('#find', 'Enter'); await L.waitFor(p, () => !!document.querySelector('.empty'));
    const e = await plain(p, '.empty');
    ok(e && !e.dashed && e.border === '0px' && e.color === MUTED && /^(No recipes match|Nothing on the pass matches)\./.test(e.text), 'Recipes: no match is a plain grey sentence with Clear search and filters (' + JSON.stringify(e) + ')');
  } catch (x) { ok(false, 'Recipes empty: ' + x.message.split('\n')[0]); }
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
