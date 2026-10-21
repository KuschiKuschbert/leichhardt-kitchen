// Screens (coding rules, 22 Oct 2026): the chef hat menu dims the page behind it like the other popups, tab rows that
// scroll sideways fade at their edge, and the recipe a line links to is found by typing, not picked from 119 in a list.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
(async () => {
  const b = await L.start();

  // the chef hat menu: the page behind it is dimmed, and a tap on it closes the menu
  let p = await L.open(b, '#/prep', { who: 'sam', wait: 1500 });
  await p.click('.wtop-who'); await L.settle(p, 200);
  const bg = await p.evaluate(() => { const e = document.querySelector('.wm-bg'); return e ? getComputedStyle(e).backgroundColor : ''; });
  ok(/rgba\(28, 29, 31, 0\.45\)/.test(bg), 'chef menu: the page behind is dimmed (' + bg + ')');
  await p.mouse.click(10, 800); await L.settle(p, 200);
  ok(!(await p.$('.wm')), 'chef menu: a tap on the dimmed page closes it');
  // the section tabs on a phone fade at their edge
  const mask = await p.evaluate(() => { const e = document.querySelector('.nb-tabs'); if (!e) return 'none'; const s = getComputedStyle(e); return s.maskImage || s.webkitMaskImage || 'none'; });
  ok(/linear-gradient/.test(mask), 'prep tabs: the row fades at its edge on a phone');
  ok(p.errors.length === 0, 'chef menu: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the same tabs on a computer are a column: no fade
  p = await L.open(b, '#/prep', { who: 'sam', wait: 1500, width: 1280, height: 900 });
  const mask2 = await p.evaluate(() => { const e = document.querySelector('.nb-tabs'); if (!e) return 'none'; const s = getComputedStyle(e); return s.maskImage || s.webkitMaskImage || 'none'; });
  ok(!/linear-gradient/.test(mask2), 'prep tabs: no fade where they stand in a column (' + mask2 + ')');
  await p.context().close();

  // the recipe link: a box that finds recipes as you type, from one list for the whole form
  p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1500 });
  await L.waitFor(p, () => !!document.getElementById('mg-name'), null, 10000);
  ok(await p.evaluate(() => !document.querySelector('select.mg-link') && document.querySelectorAll('input.mg-link[list="mg-rx"]').length > 0), 'manage: the link is a type-to-find box, not a dropdown');
  ok(await p.evaluate(() => document.querySelectorAll('#mg-rx option').length) > 50, 'manage: one list of recipes for the whole form');
  const k = await p.evaluate(() => [...document.querySelectorAll('input.mg-link[data-fl^="ing."]')].findIndex(e => !e.getAttribute('data-id')));
  ok(k >= 0, 'manage: an ingredient without a link (' + k + ')');
  const box = 'input.mg-link[data-fl="ing.' + k + '.link"]';
  const label = await p.evaluate(() => document.querySelector('#mg-rx option').value);
  await p.fill(box, label); await p.dispatchEvent(box, 'change');
  await L.waitFor(p, b => { const e = document.querySelector(b); return !!e && !!e.getAttribute('data-id'); }, box, 5000).catch(() => {});
  const id = await p.$eval(box, e => e.getAttribute('data-id'));
  ok(!!id && await p.$eval(box, e => e.value) === label, 'manage: picking ' + label + ' links it (' + id + ')');
  // the form keeps its draft 400 ms after the last change (keepDraft() in js/manage.js): wait for it, not for a fixed time
  await L.waitFor(p, i => (localStorage.getItem('lk.mg.draft.burger') || '').indexOf('"link":"' + i + '"') >= 0, id, 5000).catch(() => {});
  const draft = await p.evaluate(() => localStorage.getItem('lk.mg.draft.burger') || '');
  ok(draft.indexOf('"link":"' + id + '"') >= 0, 'manage: the link is in the draft');
  // a name that is not on the list goes back
  await p.fill(box, 'Not a recipe at all'); await p.dispatchEvent(box, 'change'); await L.settle(p, 400);
  ok(await p.$eval(box, e => e.value) === label && /Pick a recipe from the list/.test(await L.txt(p, '.mg-toasts') || ''), 'manage: a name not on the list goes back, with a hint');
  // empty means no link
  await p.fill(box, ''); await p.dispatchEvent(box, 'change');
  // the draft drops the link 400 ms later (keepDraft()), so this waits for that too
  const gone = a => { const e = document.querySelector(a.box); return !!e && !e.getAttribute('data-id') && (localStorage.getItem('lk.mg.draft.burger') || '').indexOf('"link":"' + a.id + '"') < 0; };
  await L.waitFor(p, gone, { box, id }, 5000).catch(() => {});
  const seen = await p.evaluate(a => { const e = document.querySelector(a.box); return (e ? 'box "' + e.value + '" id "' + (e.getAttribute('data-id') || '') + '"' : 'no box') + ', draft has the link: ' + ((localStorage.getItem('lk.mg.draft.burger') || '').indexOf('"link":"' + a.id + '"') >= 0); }, { box, id });
  ok(await p.evaluate(gone, { box, id }), 'manage: an empty box takes the link off (' + seen + ')');
  ok(p.errors.length === 0, 'manage: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
