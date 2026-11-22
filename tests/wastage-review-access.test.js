// Keep the original single review within reach for chefs while the log and printed page keep their controls.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW));
const path = ['kitchens', L.PIN, 'waste', day].join('/');
const button = '.w-rvbtn';
const review = '.w-sheet[aria-labelledby="w-rv-h"]';
const fixture = {[path]:{ avoidable:'Too many bread rolls', change:'Bake a smaller second batch',
  reviewBy:'Sam', reviewAt:L.NOW - 60000 }};
for (let i = 0; i < 12; i++) fixture[path + '/lines/w'+(i+1)] = {
  text:'Sample roll '+i,amount:2,unit:'kg',reason:'excess',action:'',station:'Fryer',
  addedBy:'Ann',addedById:'ann',addedAt:L.NOW - (25-i)*60000,deleted:false
};
const ready = p => L.waitFor(p, () => /Saved by Sam/.test(document.querySelector('.w-rvbtn')?.textContent || ''));

(async () => {
  const browser = await L.start();
  const p = await L.open(browser, '#/waste', {who:'sam',extra:fixture,width:390,height:844});
  await ready(p);
  ok(await p.locator(button).count() === 1 && await p.locator(review).count() === 0, 'chef: one review action and no unsolicited editor');
  for (const width of [390,768,1280]) {
    await p.setViewportSize({width,height:844});
    const opening = await p.evaluate(() => {
      const button = document.querySelector('.w-rvbtn').getBoundingClientRect(), first = document.querySelector('.w-page .nb-row').getBoundingClientRect();
      const bottom = innerWidth < 720 ? document.querySelector('.wk-dock').getBoundingClientRect().top : innerHeight;
      return button.width >= 44 && button.height >= 44 && button.top >= 0 && button.bottom < first.top && first.bottom <= bottom && scrollY === 0;
    });
    ok(opening && !(await L.overflow(p)), width + ' px: the original 44 px review and first live entry both fit on opening');
  }
  await p.setViewportSize({width:390,height:844});
  await p.focus(button);
  await p.keyboard.press('Enter');
  ok(await p.locator(review).count() === 1 && await p.evaluate(() => document.activeElement.id === 'w-ra'), 'chef: enter opens the original editor and focuses its first field');
  ok(await p.inputValue('#w-ra') === 'Too many bread rolls' && await p.isDisabled('[data-p="wreview"][data-v="page"]'), 'chef: the saved review is shown and Save waits for an edit');
  await p.fill('#w-rc','Bake only to the forecast');
  await p.keyboard.press('Escape');
  ok(await p.locator(review).count() === 0 && await p.evaluate(() => document.activeElement.matches('.w-rvbtn')), 'chef: Escape returns focus to the moved action');
  await p.click(button);
  ok(await p.inputValue('#w-rc') === 'Bake only to the forecast' && await p.locator(review).count() === 1, 'chef: the draft survives closing the same editor');
  await p.click('[data-p="wreview"][data-v="page"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.change === 'Bake only to the forecast' && !document.querySelector('[aria-labelledby="w-rv-h"]'), path);
  ok(/Saved by Sam/.test(await L.txt(p,button)), 'chef: the original Save updates its review status after writing');
  await p.emulateMedia({media:'print'});
  ok(await p.evaluate(() => document.querySelector('.w-rvbtn').getBoundingClientRect().top >=
    document.querySelector('.w-page .nb-row:last-child').getBoundingClientRect().bottom) &&
    await p.isVisible('#w-review-help'), 'print: review status and explanation still follow the entries');
  ok(!p.errors.length, 'chef: no browser errors');
  await p.context().close();

  const staff = await L.open(browser, '#/waste', {who:'ann',extra:fixture});
  ok(await staff.locator(button).count() === 0 && await staff.isVisible('.w-logbtn'), 'staff: the original logger is available and the review is private');
  await staff.context().close();

  const failed = await L.open(browser, '#/waste', {who:'sam',extra:fixture,failReads:path+'$'});
  await L.waitFor(failed, () => /Could not load it/.test(document.querySelector('.w-rvbtn')?.textContent || ''));
  await failed.click(button);
  ok(/Could not load today.s review/.test(await L.txt(failed,review)) && await failed.locator('#w-ra, [data-p="wreview"][data-v="page"]').count() === 0,
    'failed read: the original warning stays in view and no blank editable review appears');
  await failed.context().close();
  await browser.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
