// Full-size buttons on prep, order and wastage lines, lists that do not jump, and a confirmation for every add and tick (pull request 155).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const active = page => page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-k') || a.className || a.tagName) : ''; });
function past(n) { const d = new Date(); d.setDate(d.getDate() - n); return L.ymd(d); }
(async () => {
  const b = await L.start();
  const learned = {}; learned[fsKey(['learned', 'mise-onions'])] = { text: 'Mise onions', uses: 6, typed: 6, secs: { larder: { name: 'Larder', n: 6 } }, dow: {} };
  let p = await L.open(b, '#/prep', { extra: learned, wait: 1600 });

  const sizes = await p.evaluate(() => { const m = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }); return { box: m('.nb-row .nb-box'), star: m('.nb-star'), go: m('.nb-go'), x: m('.nb-x') }; });
  ok(sizes.box.every(s => s[0] >= 44 && s[1] >= 44), 'phone: tick boxes are 44x44 ' + JSON.stringify(sizes.box[0]));
  ok(sizes.star.every(s => s[0] >= 44 && s[1] >= 44), 'phone: urgent buttons are 44x44 ' + JSON.stringify(sizes.star[0]));
  ok(sizes.go.every(s => s[1] >= 44), 'phone: recipe links are 44 tall ' + JSON.stringify(sizes.go[0]));
  ok(sizes.x.every(s => s[1] >= 44), 'phone: remove is 44 tall ' + JSON.stringify(sizes.x[0]));
  ok(!(await L.overflow(p)), 'phone: no sideways scroll');

  // tick: the line stays in place, struck through, then leaves
  const before = await p.evaluate(() => [...document.querySelectorAll('.nb-row')].map(r => r.id));
  await p.click('#nbr-i5 .nb-box');
  await L.settle(p, 400);
  ok(await p.evaluate(() => { const r = document.querySelector('#nbr-i5'); return r && r.classList.contains('is-done'); }), 'tick: line stays, struck through');
  const mid = await p.evaluate(() => [...document.querySelectorAll('.nb-row')].map(r => r.id));
  ok(JSON.stringify(before) === JSON.stringify(mid), 'tick: no line moved');
  ok(/^Ticked\s*Undo/.test((await txt(p, '.p-toast') || '').trim()), 'tick: toast says just Ticked, with Undo (' + await txt(p, '.p-toast') + ')');
  await L.settle(p, 3600);
  ok(await p.$('#nbr-i5') === null, 'tick: line leaves after 3.5 seconds');

  // quick add from Handy: toast with Undo
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-p="quick"]')].find(x => /Mise onions/.test(x.textContent)); b.scrollIntoView(); b.click(); });
  await L.settle(p, 300);
  ok(/^Added to Larder\s*Undo/.test((await txt(p, '.p-toast') || '').trim()), 'one tap add: says where it went, not the line (' + await txt(p, '.p-toast') + ')');
  await p.click('.p-toast-btn');
  await L.settle(p, 300);
  let s = await store(p);
  const added = Object.keys(s).filter(k => k.indexOf('/days/' + today + '/items/') > 0 && s[k].text === 'Mise onions');
  ok(added.length === 1 && s[added[0]].deleted === true, 'one tap add: Undo takes it off');

  // Enter in Section with no line moves to the line; typed add says Added
  await p.fill('#p-section', 'Larder');
  await p.press('#p-section', 'Enter');
  await L.settle(p, 150);
  ok(await active(p) === 'p-text', 'add box: Enter in Section moves to the line');
  await p.fill('#p-text', 'Pick mint');
  await p.press('#p-text', 'Enter');
  await L.settle(p, 300);
  ok(/^Added to Larder\s*Undo/.test((await txt(p, '.p-toast') || '').trim()), 'add box: typed line says Added to Larder without the line (' + await txt(p, '.p-toast') + ')');
  ok(await p.getAttribute('#p-section', 'enterkeyhint') === 'next' && await p.getAttribute('#p-text', 'enterkeyhint') === 'done', 'add box: keyboard hints set');

  // section tab with everything ticked says so
  await p.click('.nb-tab[data-v="Grill"]');
  await L.settle(p, 200);
  await p.click('#nbr-i3 .nb-box');
  await L.settle(p, 3800);
  ok(/Nothing left to do in Grill/.test(await p.evaluate(() => document.querySelector('.nb-left').innerText)), 'tabs: an empty section says so');
  await p.click('.nb-tab[data-v=""]');
  await L.settle(p, 150);

  // Write a line button on phones
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.click('[data-p="write"]');
  await L.settle(p, 500);
  ok(await active(p) === 'p-text', 'phone: Write a line goes to the add box');

  // recipe picker: Close gives focus back to its button
  await p.click('[data-p="recipe-toggle"]');
  await L.settle(p, 150);
  await p.click('[data-p="recipe-close"]');
  await L.settle(p, 150);
  ok(/p-pickbtn/.test(await active(p)), 'picker: Close returns focus to Add from the recipes');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // orders: ticked line keeps its place, toast with Undo; regulars say Tap to add; Everything to order has Undo
  const oh = {};
  for (let k = 1; k <= 6; k++) oh[fsKey(['orders', past(k), 'lines', 'h' + k])] = { text: 'Eggs', qty: '15 dozen', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - k * 86400000, ordered: true, deleted: false };
  oh[fsKey(['orders', past(1), 'lines', 'old1'])] = { text: 'Cream', qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000, ordered: false, deleted: false };
  p = await L.open(b, '#/orders', { extra: oh, wait: 1800 });
  const ob = await p.evaluate(() => [...document.querySelectorAll('.o-main .nb-row .nb-t')].map(t => t.firstChild.textContent));
  await p.click('[data-p="otick"][data-id="o1"]');
  await L.settle(p, 400);
  const oa = await p.evaluate(() => [...document.querySelectorAll('.o-main .nb-row .nb-t')].map(t => t.firstChild.textContent));
  ok(JSON.stringify(ob) === JSON.stringify(oa), 'orders: ordered line keeps its place ' + JSON.stringify(oa));
  ok(/^Ordered\s*Undo/.test((await txt(p, '.p-toast') || '').trim()), 'orders: tick says just Ordered with Undo (' + await txt(p, '.p-toast') + ')');
  await p.click('.p-toast-btn');
  await L.settle(p, 300);
  s = await store(p);
  ok(s[fsKey(['orders', today, 'lines', 'o1'])].ordered === false, 'orders: Undo takes the tick back');
  ok(/Tap to add/.test(await p.evaluate(() => (document.querySelector('.w-often .nb-ql') || {}).textContent || '')), 'orders: regulars say Tap to add');
  await p.click('[data-p="oreg"]');
  await L.settle(p, 300);
  ok(/^Added to the order list\s*Undo/.test((await txt(p, '.p-toast') || '').trim()), 'orders: one tap regular says Added to the order list (' + await txt(p, '.p-toast') + ')');
  await p.click('[data-p="oview"][data-v="all"]');
  await L.settle(p, 600);
  await p.evaluate(() => { const g = [...document.querySelectorAll('[data-p="ogroup"]')].find(b => /Cream/.test(b.getAttribute('aria-label'))); g.click(); });
  await L.settle(p, 400);
  ok(/^Ordered( \d+ lines)?\s*Undo/.test((await txt(p, '.p-toast') || '').trim()), 'orders: Everything to order tick says Ordered (' + await txt(p, '.p-toast') + ')');
  await p.click('.p-toast-btn');
  await L.settle(p, 400);
  s = await store(p);
  ok(s[fsKey(['orders', past(1), 'lines', 'old1'])].ordered === false, 'orders: Everything to order Undo works');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // wastage: the box to fix gets the cursor; reason sheet keeps Tab inside
  p = await L.open(b, '#/waste', { wait: 1500, touch: true });
  await p.click('.w-add .nb-addbtn');
  await L.settle(p, 150);
  ok(await active(p) === 'w-text', 'waste: no item, cursor goes to What was wasted');
  await p.fill('#w-text', 'Rice');
  await p.click('.w-add .nb-addbtn');
  await L.settle(p, 150);
  ok(await active(p) === 'w-amt', 'waste: no amount, cursor goes to Amount');
  await p.fill('#w-amt', '2');
  await p.click('.w-add .nb-addbtn');
  await L.settle(p, 150);
  ok(/w-rbtn/.test(await active(p)), 'waste: no reason, focus goes to the reason button');
  await p.click('.w-rbtn');
  await L.settle(p, 150);
  for (let k = 0; k < 9; k++) await p.keyboard.press('Tab');
  ok(await p.evaluate(() => !!document.activeElement.closest('.sheet')), 'waste: Tab stays inside the reason sheet');
  await p.click('.sheet [data-v="excess"]');
  await L.settle(p, 150);
  await p.click('.w-add .nb-addbtn');
  await L.settle(p, 300);
  ok(await active(p) === 'w-text', 'waste: after Log it the cursor is back on What was wasted');
  await p.context().close();

  // PIN screens: page name on the button; mismatch empties the second box
  const nopin = {}; nopin[fsKey(['pinset', 'bo'])] = undefined; nopin[fsKey(['staffpins', 'bo'])] = undefined;
  p = await L.open(b, '#/orders', { who: 'bo', noTok: true, extra: nopin, wait: 1500 });
  await p.type('#pf1', '4444');
  await p.type('#pf2', '5555');
  await L.settle(p, 400);
  ok(/do not match/.test(await txt(p, '.p-err') || '') && await p.inputValue('#pf2') === '' && await active(p) === 'pf2', 'PIN: mismatch empties Type it again and puts the cursor there');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', noTok: true, wait: 1500 });
  ok(/Open the order list/.test(await txt(p, '.p-card button[type="submit"]') || ''), 'PIN: button names the page (' + await txt(p, '.p-card button[type="submit"]') + ')');
  const nl = await p.evaluate(() => { const r = document.querySelector('[data-p="who-change"]').getBoundingClientRect(); return r.height; });
  ok(nl >= 44, 'PIN: Not me / Not you are 44 tall');
  await p.context().close();

  const mins = {}; mins[fsKey(['minutes', 'm1'])] = { no: 1, v: 1, status: 'published', date: today, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam', att: [{ id: 'ann', st: 'present' }, { id: 'sam', st: 'present' }, { id: 'bo', st: 'apology' }], guests: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '', acts: [], next: '', pubAt: L.NOW, removed: false, at: 1, upd: 1, by: 'sam' };
  // minutes to sign show as a card on the landing page, not as a second bell in the top bar
  p = await L.open(b, '#/', { who: 'ann', extra: mins, wait: 1800 });
  ok(await p.$('.wtop a[href="#/minutes"]') === null, 'minutes: no minutes button in the top bar');
  ok(/Minutes not signed yet/.test(await txt(p, '.wall-mn .mn-nudge') || ''), 'minutes: card on the landing page');
  await p.click('.wall-mn .mn-nudge-btn');
  await L.settle(p, 800);
  ok(await p.evaluate(() => location.hash) === '#/minutes', 'minutes: Read and sign on the landing card opens the minutes');
  await p.click('.mn-signbtn');
  await L.settle(p, 600);
  s = await store(p);
  ok(!!s[fsKey(['minutes', 'm1', 'signs', '1_ann'])], 'minutes: one tap on Sign signs the minutes');
  await p.evaluate(() => { location.hash = '#/'; });
  await L.settle(p, 600);
  ok(await txt(p, '.wall-mn') === '', 'minutes: landing card gone once signed');
  ok(p.errors.length === 0, 'minutes: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin: people tick boxes are full-size
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'people');
  await L.settle(p, 200);
  const cl = await p.evaluate(() => { const r = document.querySelector('.a-cl').getBoundingClientRect(); return [r.width, r.height]; });
  ok(cl[0] >= 44 && cl[1] >= 44, 'admin: permission tick boxes are 44x44 ' + JSON.stringify(cl));
  await p.click('.a-cl >> nth=2');
  await L.settle(p, 100);
  ok(await p.evaluate(() => window.LK_PREP.state.draft.people[0].del === false), 'admin: tapping the cell toggles the box');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
