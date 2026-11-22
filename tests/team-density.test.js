// Today's team preserves the native date tools, staffing warnings and Save feedback in its denser layout.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW));
const team = key('team', today);
const config = L.seed()[key('config','main')];
const secs = [{id:'grill',name:'Grill'}, {id:'larder',name:'Larder'}];
const shift = {id:'lunch',name:'Lunch',from:600,to:900};
const extra = options => ({
  [key('config','main')]: { ...config, kitSecs:secs, kitShifts:[{...shift, ...options?.shift}] },
  [team]: { day:today, on:[{id:'sam',sh:'lunch',sec:'grill'}, {id:'ann',sh:'lunch',sec:'larder'}],
    br:options?.br || [], at:L.NOW-3600000, upd:L.NOW-3600000, v:1, by:'sam' }
});
const open = (b, width, options) => L.open(b, '#/team', { who:'sam', width, height:844, extra:extra(options) });
const ready = p => L.waitFor(p, () => !!document.querySelector('.tm-tlrow'));
const dates = '[data-p="tm-date-toggle"]';
const save = '[data-p="tm-save"]';
const dock = '.tm-focus-save';
const assignment = 'select[data-k="tm-sec:sam:lunch"]';
const sameRow = p => p.evaluate(() => {
  const date = document.querySelector('.tm-date-controls').getBoundingClientRect();
  const tools = document.querySelector('.tm-focus-toolbar').getBoundingClientRect();
  return date.right < tools.left && date.top < tools.bottom && date.bottom > tools.top;
});

(async () => {
  const b = await L.start();
  let p = await open(b, 390);
  await ready(p);
  ok(!await p.isVisible(dock) && /Saved/.test(await L.txt(p,'.tm-draftstate')), 'phone: the idle dock gives the rows room and the header still says Saved');
  await L.pick(p, assignment, 'larder');
  ok(await p.isVisible(dock) && await p.isEnabled(save), 'phone: an edited assignment reveals the native Save');
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click(save);
  await L.waitFor(p, s => document.querySelector(s)?.getAttribute('aria-busy') === 'true', save);
  ok(await p.isVisible(dock) && await p.isDisabled(save), 'phone: a pending Save stays visible');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.waitFor(p, k => window.__fake.dump()[k]?.v === 2, team);
  await L.waitFor(p, s => document.querySelector(s)?.getAttribute('data-sv') === 'done', save);
  ok(await p.isVisible(dock) && (await p.locator(save).boundingBox()).height >= 44, 'phone: acknowledged Save feedback stays visible and full height');
  ok(!await L.overflow(p) && p.errors.length === 0, 'phone: no sideways scroll or browser errors');
  await p.context().close();

  p = await open(b, 390, { shift:{busy:{from:780,to:890,n:3}}, br:[{id:'ann',sh:'lunch',at:835,len:30}] });
  await ready(p);
  ok(await p.isVisible(dock) && await p.isVisible('[data-p="tm-short-ok"]') && await p.isVisible('[data-p="tm-short-go"]'), 'phone: a staffing warning retains its own dock and actions while Save is idle');
  ok(await p.isVisible('.tm-live-strip'), 'phone: the live break board stays visible');
  await p.context().close();

  p = await open(b, 1280);
  await ready(p);
  ok(await sameRow(p) && await p.isVisible(dock), 'desktop: the date and roster tools share a row with the existing Save dock');
  await p.click(dates);
  ok(await p.isVisible('.tm-week-reveal') && !await sameRow(p), 'desktop: the open week has the original full-row layout');
  await p.click(dates);
  ok(!await p.isVisible('.tm-week-reveal') && await sameRow(p), 'desktop: closing the week puts the tools back beside the date');
  await p.evaluate(() => { document.documentElement.dataset.text='xlarge'; });
  ok(!await L.overflow(p) && p.errors.length === 0, 'desktop: no sideways scroll at large text and no browser errors');
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
