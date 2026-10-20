// The Handy page beside the prep list shows only what the list does not already show. No "Do these first" box and no
// "Progress by section" bars. Quick add is one row of one-tap chips: due today, then usual for this weekday, then
// regulars, each line once and never one that is already on the list.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const ago = n => L.ymd(new Date(L.NOW - n * 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const dow = String(new Date(L.NOW).getDay());
const dname = new Date(L.NOW).toLocaleDateString('en-AU', { weekday: 'long' });
const side = page => page.evaluate(() => {
  const r = document.querySelector('.nb-right');
  return {
    heads: [...r.querySelectorAll('h3.nb-sh')].map(e => e.textContent.trim()),
    text: r.innerText,
    sub: (r.querySelector('.nb-ph .nb-date') || {}).textContent,
    chips: [...r.querySelectorAll('.nb-usual .chip')].map(e => ({ p: e.getAttribute('data-p'), t: e.textContent.trim() })),
    due: document.querySelectorAll('[data-p="due"]').length
  };
});
(async () => {
  const b = await L.start();
  const extra = {}, dw = {};
  dw[dow] = 3;
  // Make aioli: made every 2 days, last 2 days ago, so it is due. It is a regular too, but shows once (as due).
  [6, 4, 2].forEach(n => { extra[fsKey(['days', ago(n), 'items', 'a' + n])] = { text: 'Make aioli', station: 'Sauce', qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - n * 86400000, done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - n * 86400000 + 3600000, deleted: false }; });
  extra[fsKey(['learned', 'make-aioli'])] = { text: 'Make aioli', uses: 5, typed: 5, secs: { sauce: { name: 'Sauce', n: 5 } }, dow: {} };
  extra[fsKey(['learned', 'pick-mint'])] = { text: 'Pick mint', uses: 3, typed: 3, secs: { larder: { name: 'Larder', n: 3 } }, dow: dw };
  extra[fsKey(['learned', 'mise-onions'])] = { text: 'Mise onions', uses: 6, typed: 6, secs: { larder: { name: 'Larder', n: 6 } }, dow: {} };
  // on today's list already, so never a chip
  extra[fsKey(['learned', 'slice-onions'])] = { text: 'Slice onions', uses: 9, typed: 9, secs: { larder: { name: 'Larder', n: 9 } }, dow: dw };

  for (const w of [390, 1280]) {
    const tag = w + ' px: ';
    const p = await L.open(b, '#/prep', { extra, width: w, height: w > 400 ? 900 : 844, wait: 1600 });
    const h = await side(p);
    ok(h.sub === 'Done today and quick add', tag + 'Handy says what is on it (' + h.sub + ')');
    ok(!/Do these first/.test(h.text), tag + 'no Do these first box');
    ok(!h.heads.some(x => /Progress by section|^Due today$|^Regulars$|^Usual for/.test(x)), tag + 'no separate Progress, Due today, Usual or Regulars headings (' + h.heads.join(', ') + ')');
    ok(h.heads.indexOf('Quick add') > h.heads.indexOf('Done today (0)') && h.heads.indexOf('Done today (0)') >= 0 && h.heads.indexOf('Tools') < 0, tag + 'Done today, then Quick add, and no Tools (they moved to the chef menu)');
    ok(new RegExp('Due today, usual for a ' + dname + ' and regulars\\. Tap to add\\.').test(h.text), tag + 'Quick add says what is in it');
    const names = h.chips.map(c => c.t.replace(/\s+/g, ' '));
    ok(names.length === 3 && /^Make aioli/.test(names[0]) && /^Pick mint/.test(names[1]) && /^Mise onions/.test(names[2]), tag + 'one row: due, then usual, then regular, each once (' + names.join(' | ') + ')');
    ok(!names.some(n => /Slice onions/.test(n)), tag + 'a line already on the list is not offered');
    ok(/every 2 days, last \w{3}/.test(names[0] || ''), tag + 'due chip says how often and when last');
    ok(new RegExp('3 ' + dname + 's').test(names[1] || ''), tag + 'usual chip says how many ' + dname + 's');
    ok(/6x/.test(names[2] || ''), tag + 'regular chip says how many times');
    ok(h.chips.every(c => c.p === 'quick') && h.due === 0, tag + 'every chip uses the one quick add tap');
    ok(!(await L.overflow(p)), tag + 'no sideways scroll');

    if (w === 390) {
      // tap the due chip: it goes on with its section, says so, and leaves Quick add
      await p.evaluate(() => { const c = [...document.querySelectorAll('.nb-right [data-p="quick"]')].find(x => /Make aioli/.test(x.textContent)); c.scrollIntoView(); c.click(); });
      await p.waitForTimeout(400);
      const t = await p.evaluate(() => { const e = document.querySelector('.p-toast'); return e ? e.textContent : ''; });
      ok(/^Added to Sauce/.test(t.trim()) && !/aioli/.test(t), 'tap: the due chip says Added to Sauce, without the line (' + t + ')');
      const s = await store(p);
      ok(Object.keys(s).filter(k => k.indexOf('/days/' + today + '/items/') > 0 && s[k].text === 'Make aioli' && s[k].station === 'Sauce' && !s[k].deleted).length === 1, 'tap: one Make aioli line written for today');
      const after = await side(p);
      ok(!after.chips.some(c => /Make aioli/.test(c.t)), 'tap: the chip leaves Quick add once the line is on the list');
    }
    ok(p.errors.length === 0, tag + 'no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})();
