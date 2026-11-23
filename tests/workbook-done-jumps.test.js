// Orders and Transfers can go straight to their existing finished work while keeping the normal service actions.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW));
const order = id => ['kitchens', L.PIN, 'orders', day, 'lines', id].join('/');
const transfer = id => ['kitchens', L.PIN, 'transfers', day, 'lines', id].join('/');
const seed = L.seed();
const result = p => p.evaluate(() => window.__fake.writes.length);
const oJump = '[data-p="o-done-jump"]';
const tJump = '[data-p="tr-done-jump"]';
const oTarget = '#o-donebox > summary';
const tTarget = '#tr-donebox';
const active = (p, s) => p.evaluate(s => document.activeElement === document.querySelector(s), s);
const size = async (p,s) => {
  const r = await p.locator(s).boundingBox();
  return r && r.height >= 44 && r.width >= 44;
};
const made = (id,minutes) => ({...seed[order(id)],ordered:true,orderedBy:'Sam',orderedAt:L.NOW-minutes*60000});
const orders = { [order('o1')]:made('o1',40), [order('o2')]:made('o2',2) };
const transfers = {};
for (let i = 0; i < 10; i++) {
  transfers[transfer('t'+i)] = { dir:'out', venue:'Riviera', person:'Jess', text:'Brioche buns '+i,
    amount:2, unit:'packs', note:'', addedBy:'Bo', addedById:'bo', addedAt:L.NOW-(46-i)*120000, deleted:false, by:'bo' };
}
transfers[transfer('done')] = { ...transfers[transfer('t0')], text:'Returned lemons',
  returned:true, returnedBy:'Sam', returnedById:'sam', returnedAt:L.NOW-600000 };

(async () => {
  const browser = await L.start();
  let p = await L.open(browser, '#/orders', {who:'sam',extra:orders});
  await L.waitFor(p, () => !!document.querySelector('#o-donebox'));
  ok(await p.locator('#o-donebox[open]').count() === 0 && await p.getAttribute(oJump,'aria-controls') === 'o-donebox', 'Orders: the count targets the existing closed Ordered today fold');
  const orderWrites = await result(p);
  await p.focus(oJump);
  await p.keyboard.press('Enter');
  ok(await p.locator('#o-donebox[open]').count() === 1 && await active(p,oTarget), 'Orders: one activation opens Ordered today and focuses its summary');
  ok(await p.getAttribute('.o-requests [data-p="otick"][data-id="o2"]','aria-pressed') === 'true' &&
    await p.locator('#o-donebox [data-p="otick"][data-id="o2"]').count() === 0, 'Orders: the recent tick stays in its row for the ten-minute Undo hold');
  ok(await p.locator('#o-donebox [data-p="otick"][data-id="o1"]').count() === 1 && await result(p) === orderWrites, 'Orders: the original archive Undo stays available and the jump writes nothing');
  await p.keyboard.press('Space');
  ok(await p.locator('#o-donebox[open]').count() === 0, 'Orders: the summary still closes on the keyboard');
  for (const w of [390,768,1280]) {
    await p.setViewportSize({width:w,height:844});
    ok(await size(p,oJump) && !(await L.overflow(p)), w + ' px Orders: the progress jump is at least 44 px and fits the page');
  }
  ok(!p.errors.length, 'Orders: no page errors');
  await p.context().close();

  p = await L.open(browser, '#/transfers', {who:'sam',extra:transfers});
  await L.waitFor(p, () => !!document.querySelector('#tr-donebox') && !!document.querySelector('[data-p="tr-done-jump"]'));
  const transferWrites = await result(p);
  ok(await p.getAttribute(tJump,'aria-controls') === 'tr-donebox' && await p.locator('.tr-outstanding [data-p="tr-return"]').count() === 10,
    'Transfers: the Done jump has a destination and all original Mark returned actions stay under Still out');
  await p.click(tJump);
  const landed = await p.evaluate(s => {
    const el = document.querySelector(s), r = el.getBoundingClientRect(), dock = document.querySelector('.tr-logbtn').getBoundingClientRect();
    return scrollY > 0 && document.activeElement === el && r.top >= 0 && r.bottom <= dock.top;
  },tTarget);
  ok(landed && await result(p) === transferWrites, 'Transfers: one tap scrolls to the focused Done today heading above the dock without writing');
  ok((await L.txt(p,'.tr-done')).includes('Returned lemons'), 'Transfers: Done today still shows the returned line');
  for (const w of [390,768,1280]) {
    await p.setViewportSize({width:w,height:844});
    ok(await size(p,tJump) && !(await L.overflow(p)), w + ' px Transfers: the jump is at least 44 px and fits the page');
  }
  ok(!p.errors.length, 'Transfers: no page errors');
  await p.context().close();
  await browser.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
