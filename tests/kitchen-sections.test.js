// Kitchen sections (21 Oct 2026): the head chef sets them in the admin People tab, staff pick one straight after their PIN
// (a popup, once a day), and their prep lines and wastage go under it unless they write another section. The head chef and
// sous chefs are given their role. Each pick is shifts/<day>_<id>, so the admin panel shows who is on which section today.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const today = L.ymd(new Date(L.NOW));
const store = page => page.evaluate(() => window.__fake.dump());
const SECS = [{ id: 'grill', name: 'Grill', off: false }, { id: 'pass', name: 'Pass', off: false }, { id: 'pans', name: 'Pans', off: false }, { id: 'old', name: 'Smoker', off: true }];
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const withSecs = x => Object.assign({ [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, kitSecs: SECS } }, x || {});
const lineOf = (s, text) => { const k = Object.keys(s).filter(k => k.indexOf('/days/' + today + '/items/') > 0 && s[k].text === text && !s[k].deleted)[0]; return k ? s[k] : null; };
const addLine = async (p, text, sec) => {
  await p.fill('[data-k="p-text"]', text);
  if (sec !== undefined) { await p.fill('[data-k="p-section"]', sec); }
  await p.press('[data-k="p-text"]', 'Enter'); await L.settle(p, 500);
};

(async () => {
  const b = await L.start();
  let p, s;

  // Ann opens the book: the picker comes up, Smoker (taken off the list) is not offered
  p = await L.open(b, '#/prep', { who: 'ann', extra: withSecs(), wait: 1500 });
  ok(!!(await p.$('.ks-wrap')), 'staff: the section picker comes up after sign-in');
  const offered = await p.evaluate(() => [...document.querySelectorAll('.ks-b')].map(e => e.textContent));
  ok(offered.join(',') === 'Grill,Pass,Pans', 'staff: the sections on the list are offered, a removed one is not (' + offered.join(',') + ')');
  ok(!(await L.overflow(p)), 'staff: the picker fits a phone');
  ok(await p.$eval('.ks', e => Math.abs(e.getBoundingClientRect().bottom - window.innerHeight) < 2), 'staff: the picker is a sheet at the bottom of the screen');
  ok(await p.$eval('.ks-b', e => e.getBoundingClientRect().height) >= 44, 'staff: the section buttons are big enough to tap');
  await p.click('.ks-b[data-v="grill"]'); await L.settle(p, 500);
  s = await store(p);
  const rec = s[fsKey(['shifts', today + '_ann'])];
  ok(!!rec && rec.sec === 'grill' && rec.name === 'Grill' && rec.by === 'ann' && rec.day === today && rec.auto === false, 'staff: the pick is saved under Ann\'s id for today');
  ok(!(await p.$('.ks-wrap')), 'staff: the picker closes');
  ok(/Grill/.test(await txt(p, '.ks-tag') || ''), 'staff: Grill shows next to Writing as');
  ok(await p.$eval('[data-k="p-section"]', e => e.value) === 'Grill', 'prep: the section box starts on Grill');
  await addLine(p, 'Dice carrots');
  s = await store(p);
  ok((lineOf(s, 'Dice carrots') || {}).station === 'Grill', 'prep: a line with the box left alone goes under Grill');
  ok(await p.$eval('[data-k="p-section"]', e => e.value) === 'Grill', 'prep: the box is back on Grill for the next line');
  await addLine(p, 'Pick mint', 'Larder');
  s = await store(p);
  ok((lineOf(s, 'Pick mint') || {}).station === 'Larder', 'prep: a section typed by hand wins');

  // changing it later: the tag opens the picker with Close
  await p.fill('[data-k="p-section"]', '');
  await tap(p, '.ks-tag'); await L.settle(p, 300);
  ok(!!(await p.$('.ks-wrap [data-ks="close"]')) && await p.$eval('.ks-b[data-v="grill"]', e => e.getAttribute('aria-pressed')) === 'true', 'change: the picker opens with Grill marked');
  await p.click('.ks-b[data-v="pass"]'); await L.settle(p, 500);
  s = await store(p);
  ok(s[fsKey(['shifts', today + '_ann'])].sec === 'pass', 'change: Pass is saved for today');
  await addLine(p, 'Wipe the pass');
  s = await store(p);
  ok((lineOf(s, 'Wipe the pass') || {}).station === 'Pass', 'change: the next line goes under Pass');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));

  // the same day again: not asked twice
  await p.reload(); await L.settle(p, 1500);
  ok(!(await p.$('.ks-wrap')), 'reload: not asked again today');

  // the chef hat menu has My section
  const items = await L.chefItems(p);
  ok(items.indexOf('section') >= 0, 'menu: My section is in the chef hat menu (' + items.join(',') + ')');
  await p.click('.wtop-who'); await L.settle(p, 150);
  ok(/Pass/.test(await txt(p, '.wm [data-who="sec"]') || ''), 'menu: it says Pass');
  await p.click('.wm [data-who="sec"]'); await L.settle(p, 300);
  ok(!!(await p.$('.ks-wrap')), 'menu: a tap opens the picker');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('.ks-wrap')), 'menu: Escape closes it');

  // wastage: the section box starts on the person's section
  await p.evaluate(() => { location.hash = '#/waste'; }); await L.settle(p, 900);
  ok(await p.$eval('[data-k="w-sec"]', e => e.value) === 'Pass', 'waste: the section box starts on Pass');
  await p.context().close();

  // a fresh PIN: the picker comes straight after it
  p = await L.open(b, '#/prep', { who: 'bo', noTok: true, extra: withSecs(), wait: 1200 });
  ok(!(await p.$('.ks-wrap')), 'PIN: not asked before the PIN');
  await p.keyboard.type('3333'); await L.settle(p, 1200);
  ok(!!(await p.$('.ks-wrap')), 'PIN: asked straight after the PIN');
  await p.click('.ks-out'); await L.settle(p, 300);
  ok(!(await p.$('.ks-wrap')) && /Pick a section/.test(await txt(p, '.ks-tag') || ''), 'skip: closed, and the tag offers to pick one');
  ok(await p.$eval('[data-k="p-section"]', e => e.value) === '', 'skip: the section box stays empty');
  await p.reload(); await L.settle(p, 1500);
  ok(!(await p.$('.ks-wrap')), 'skip: not asked again today');
  await p.context().close();

  // picked on another phone today: not asked, that section is used
  p = await L.open(b, '#/prep', { who: 'bo', extra: withSecs({ [fsKey(['shifts', today + '_bo'])]: { day: today, sec: 'pans', name: 'Pans', auto: false, at: L.NOW - 3600000, by: 'bo' } }), wait: 1500 });
  ok(!(await p.$('.ks-wrap')), 'other phone: not asked again');
  ok(await p.$eval('[data-k="p-section"]', e => e.value) === 'Pans', 'other phone: the section box starts on Pans');
  await p.context().close();

  // the end of the day: yesterday's pick no longer counts, the next day asks again
  const yday = L.ymd(new Date(L.NOW - 86400000));
  p = await L.open(b, '#/prep', { who: 'bo', extra: withSecs({ [fsKey(['shifts', yday + '_bo'])]: { day: yday, sec: 'grill', name: 'Grill', auto: false, at: L.NOW - 86400000, by: 'bo' } }), wait: 300 });
  await p.evaluate(d => { localStorage.setItem('lk.sec.bo', JSON.stringify({ d, sec: 'grill', name: 'Grill' })); }, yday);
  await p.reload(); await L.settle(p, 1500);
  ok(!!(await p.$('.ks-wrap')) && await p.$eval('.ks-b[data-v="grill"]', e => e.getAttribute('aria-pressed')) === 'false', 'next day: yesterday\'s Grill is gone and Bo is asked again');
  await p.click('.ks-out'); await L.settle(p, 300);
  ok(await p.$eval('[data-k="p-section"]', e => e.value) === '', 'next day: no section until Bo picks one');
  await p.context().close();

  // a sous chef is not asked: their section is their role
  p = await L.open(b, '#/prep', { who: 'sam', extra: withSecs(), wait: 1500 });
  s = await store(p);
  ok(!(await p.$('.ks-wrap')), 'sous chef: not asked');
  const sr = s[fsKey(['shifts', today + '_sam'])];
  ok(!!sr && sr.sec === 'sous' && sr.name === 'Sous chef' && sr.auto === true, 'sous chef: given Sous chef for the day');
  ok(await p.$eval('[data-k="p-section"]', e => e.value) === '', 'sous chef: the section box is left empty');
  ok(!(await p.$('.ks-tag')), 'sous chef: no section tag');
  await p.context().close();

  // no sections set up yet: nobody is asked
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  ok(!(await p.$('.ks-wrap')), 'none set up: nobody is asked');
  s = await store(p);
  ok(!s[fsKey(['shifts', today + '_ann'])], 'none set up: nothing written');
  await p.context().close();

  // the head chef sets them up in the admin People tab
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  ok(/Kitchen sections/.test(await txt(p, '.a-ks') || ''), 'admin: the People tab has Kitchen sections');
  await tap(p, '[data-p="ks-usual"]'); await L.settle(p, 200);
  ok(await p.evaluate(() => document.querySelectorAll('.a-ks-row').length) === 7, 'admin: the usual seven are added');
  await p.fill('[data-k="a-ks6"]', 'Prep and butchery');
  await tap(p, '[data-p="ks-add"]'); await L.settle(p, 200);
  await p.fill('[data-k="a-ks7"]', 'Breakfast');
  await tap(p, '[data-p="ks-rm"][data-i="4"]'); await L.settle(p, 150);
  ok(!(await L.overflow(p)), 'admin: the section list fits a phone');
  await tap(p, '[data-p="a-save"]'); await L.settle(p, 700);
  s = await store(p);
  const ks = s[CFG].kitSecs || [];
  ok(ks.map(x => x.name).join(',') === 'Grill,Pass,Pans,Fryers,Hot larder,Salads and dessert,Prep and butchery,Breakfast', 'admin: saved in order, with the rename and the new one (' + ks.map(x => x.name).join(',') + ')');
  ok(ks[4].off === true && ks[0].off === false, 'admin: a removed one is kept, marked off');
  ok(ks[6].id === 'prep', 'admin: a renamed section keeps its id');
  ok(s[CFG].people.length === 3 && (s[CFG].sousIds || []).join() === 'sam', 'admin: the people list is left as it was');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the admin panel shows who is on which section today and who worked where
  const shifts = {
    [fsKey(['shifts', today + '_ann'])]: { day: today, sec: 'grill', name: 'Grill', auto: false, at: L.NOW - 3600000, by: 'ann' },
    [fsKey(['shifts', today + '_sam'])]: { day: today, sec: 'sous', name: 'Sous chef', auto: true, at: L.NOW - 3600000, by: 'sam' },
    [fsKey(['shifts', L.ymd(new Date(L.NOW - 86400000)) + '_ann'])]: { day: L.ymd(new Date(L.NOW - 86400000)), sec: 'pass', name: 'Pass', auto: false, at: L.NOW - 86400000, by: 'ann' }
  };
  p = await L.open(b, '#/admin', { admin: true, extra: withSecs(shifts), wait: 1800 });
  await L.adminTab(p, 'people'); await L.settle(p, 600);
  const board = await txt(p, '.a-ks-today') || '';
  ok(/Grill\s*Ann/.test(board) && /Sous chef\s*Sam/.test(board) && /Pass\s*Nobody yet/.test(board), 'admin: On today shows Ann on Grill and Sam as Sous chef (' + board + ')');
  const days = await txt(p, '[data-lvb="ks-days"]') || '';
  ok(/Ann/.test(days) && /Grill 1/.test(days) && /Pass 1/.test(days), 'admin: who worked where lists Ann on Grill and Pass');
  ok(p.errors.length === 0, 'admin board: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
