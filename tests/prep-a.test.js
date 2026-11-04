// Prep, Clean notebook (3 Nov 2026, work pages redesign A, docs/work-pages-design-options/brief.md): the list comes
// first. Add a line opens the add form as a sheet (on a phone the button floats above the tab bar). Start here is
// numbered on the lines themselves, "3 of 13 done" is the way to Done today, the line's ! is the one urgent control, and
// the lines written after tonight's list was started sit last under Tonight, for tomorrow.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = p => p.evaluate(() => window.__fake.dump());
const lines = async (p, text) => Object.entries(await store(p)).filter(([k, v]) => k.indexOf(fsKey(['days', today, 'items'])) === 0 && v.text === text);
const extra = {};
extra[fsKey(['days', today, 'items', 'stuck1'])] = { text: 'Cure salmon', station: 'Larder', qty: '', recipe: '', addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 8 * 3600000, rolled: 3, done: false, deleted: false };
(async () => {
  const b = await L.start();

  // a sous chef's phone: the list first, the form behind Add a line
  let p = await L.open(b, '#/prep', { who: 'sam', extra, wait: 1600 });
  ok(!(await p.$('#p-text')) && !(await p.$('.nb-foot .nb-add')), 'phone: no add form on the page until Add a line');
  const btn = await p.evaluate(() => { const b = document.querySelector('.nb-addline').getBoundingClientRect(), t = document.querySelector('.tabbar').getBoundingClientRect(); return { above: b.bottom <= t.top, inView: b.top >= 0 && b.right <= innerWidth, h: Math.round(b.height) }; });
  ok(btn.above && btn.inView && btn.h >= 48, 'phone: Add a line floats above the tab bar, in thumb reach (' + JSON.stringify(btn) + ')');
  ok(await p.evaluate(() => document.querySelector('.nb-row').getBoundingClientRect().top < 420), 'phone: the first line starts in the top half of the screen');

  // Start here, numbered on the lines
  const nums = await p.$$eval('.nb-row .nb-num', l => l.map(e => e.firstChild.textContent).join(','));
  ok(nums.split(',').sort().join(',') === '1,2,3' && !(await p.$('.nb-start')), 'Start here: 1, 2 and 3 on three lines, no separate Start here box (' + nums + ')');

  // one urgent control: Stuck lines (rolled 3 times) offers no Urgent button of its own
  ok(/Cure salmon/.test(await txt(p, '.nb-stuck') || '') && !(await p.$('.nb-stuck [data-p="urgent"]')) && !!(await p.$('[data-ln$="/stuck1"] .nb-star')), 'one urgent control: the line\'s !, no Urgent button in Stuck lines');

  // Add a line: a sheet over a dimmed page, the cursor in the box; Escape closes it and keeps the words
  await p.click('[data-p="write"]'); await L.settle(p, 250);
  ok(await p.evaluate(() => !!document.querySelector('.p-sheet[role="dialog"]') && !!document.querySelector('.sheet-bg') && document.activeElement && document.activeElement.id === 'p-text'), 'Add a line: a sheet over a dimmed page, the cursor in the box');
  await p.keyboard.type('Zest limes');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('.p-sheet')) && await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('nb-addline')), 'Escape closes it, back on Add a line');
  await L.pLog(p);
  ok(await p.evaluate(() => document.getElementById('p-text').value) === 'Zest limes', 'the words typed are still there');
  await p.evaluate(() => document.getElementById('p-text').focus()); await p.keyboard.press('Enter'); await L.settle(p, 500);
  ok((await lines(p, 'Zest limes')).length === 1 && !!(await p.$('.p-sheet')) && await p.evaluate(() => document.activeElement && document.activeElement.id === 'p-text' && !document.activeElement.value), 'Add saves the line; the sheet stays for the next one, the box empty');
  ok(await p.evaluate(() => { const t = document.querySelector('.p-toast'), s = document.querySelector('.p-sheet'); return !!t && t.getBoundingClientRect().bottom <= s.getBoundingClientRect().top; }), 'the toast shows above the sheet');
  await p.click('.p-sheet [data-p="p-log-close"]'); await L.settle(p, 200);
  ok(!(await p.$('.p-sheet')), 'Close closes it');

  // Done today behind the count
  ok(!(await p.$('[data-p="donejump"]')), 'nothing ticked: the count is not a button');
  await p.click('.nb-row .nb-box'); await L.settle(p, 400);
  await p.evaluate(() => window.scrollTo(0, 0));
  ok(/^1 of \d+ done$/.test((await txt(p, 'button.nb-prog') || '').trim()), 'one ticked: "1 of n done" is a button');
  await p.click('button.nb-prog'); await L.settle(p, 900);
  ok(await p.evaluate(() => { const r = document.getElementById('nb-donebox').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }), 'a tap on the count goes to Done today');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'phone: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Tonight, for tomorrow: a line written after tonight's list was started sits last under its own heading
  p = await L.open(b, '#/prep', { who: 'sam', wait: 1600 });
  await p.clock.fastForward('07:00:00'); await L.settle(p, 600);
  await L.pLog(p);
  await p.fill('#p-text', 'Pickle red onion'); await p.press('#p-text', 'Enter'); await L.settle(p, 500);
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  const last = await p.evaluate(() => { const hs = [...document.querySelectorAll('.nb-left .nb-hd')]; const h = hs[hs.length - 1]; const row = h && h.nextElementSibling && h.nextElementSibling.nextElementSibling; return { head: h ? h.textContent : '', row: row ? row.textContent : '' }; });
  ok(/^Tonight, for tomorrow/.test(last.head) && /Pickle red onion/.test(last.row), 'tonight: the new line is last, under Tonight, for tomorrow (' + JSON.stringify(last) + ')');
  ok(p.errors.length === 0, 'tonight: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // laptop: the button sits in the page header, the sheet in the middle
  for (const [w, h] of [[768, 1024], [1280, 900]]) {
    p = await L.open(b, '#/prep', { who: 'sam', width: w, height: h, wait: 1600 });
    const inHead = await p.evaluate(() => !!document.querySelector('.nb-ph .nb-addline') && getComputedStyle(document.querySelector('.nb-addline')).position !== 'fixed');
    await L.pLog(p);
    const fits = await p.evaluate(() => { const s = document.querySelector('.p-sheet').getBoundingClientRect(); return s.left >= 0 && s.right <= innerWidth && s.top >= 0 && s.bottom <= innerHeight; });
    ok(inHead && fits && !(await L.overflow(p)), w + ' px: Add a line in the page header, the sheet fits, no sideways scroll');
    ok(p.errors.length === 0, w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
