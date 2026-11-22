// Contrast and tap targets (usability U12c): the faint grey passes contrast, admin fields and selects are 44 px,
// admin ticks are 28 px.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800 });
  if (L.adminTab) await L.adminTab(p, 'people'); else { await p.click('[data-p="a-tab"][data-t="people"]'); await L.settle(p, 300); }
  // The name opens one editor. Its fields, ticks and buttons keep the target sizes.
  await L.tap(p, '[data-p="a-person-open"][data-id="ann"]'); await L.settle(p, 200);
  const m = await p.evaluate(() => {
    const h = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : -1; };
    return { name: h('#pp-editor .a-name'), sel: h('#pp-editor .p-select + .ux-picker-trigger'), cb: h('#pp-editor input[type=checkbox]'), tk: h('#pp-editor .pp-tk'),
      open: h('.pp-row:not(.is-open) [data-p="a-person-open"]'), pin: h('#pp-editor [data-p="a-reset-pin"]'), leave: h('#pp-editor [data-p="a-remove-person"]'), del: h('#pp-editor [data-p="a-delete-person"]'),
      faint: getComputedStyle(document.documentElement).getPropertyValue('--faint').trim() };
  });
  ok(m.name >= 44 && m.sel >= 44, 'admin: name fields and role menus are 44 px (' + m.name + ', ' + m.sel + ')');
  ok(m.cb >= 28 && m.tk >= 44, 'admin: ticks are 28 px, their labels 44 px (' + m.cb + ', ' + m.tk + ')');
  ok(m.open >= 44 && m.pin >= 44 && m.leave >= 44 && m.del >= 44, 'admin People: the name, Reset PIN, Stopped working here and Delete for good are 44 px (' + [m.open, m.pin, m.leave, m.del].join(', ') + ')');
  ok(m.faint.toUpperCase() === '#6B7077', 'the faint grey is the darker one (' + m.faint + ')');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await b.close();
  L.report(R);
})();
