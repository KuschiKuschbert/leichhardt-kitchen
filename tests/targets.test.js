// Contrast and tap targets (usability U12c): the faint grey passes contrast, admin fields and selects are 44 px,
// admin ticks are 28 px.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800 });
  if (L.adminTab) await L.adminTab(p, 'people'); else { await p.click('[data-p="a-tab"][data-t="people"]'); await L.settle(p, 300); }
  const m = await p.evaluate(() => {
    const h = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : -1; };
    return { name: h('.a-table .a-name'), sel: h('.a-table .p-select'), cb: h('.a-table input[type=checkbox]'), faint: getComputedStyle(document.documentElement).getPropertyValue('--faint').trim() };
  });
  ok(m.name >= 44 && m.sel >= 44, 'admin: name fields and role menus are 44 px (' + m.name + ', ' + m.sel + ')');
  ok(m.cb >= 28, 'admin: ticks are 28 px (' + m.cb + ')');
  ok(m.faint.toUpperCase() === '#6B7077', 'the faint grey is the darker one (' + m.faint + ')');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await b.close();
  L.report(R);
})();
