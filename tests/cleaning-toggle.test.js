// Cleaning is prepared privately by canonical chefs and released through the existing admin Save flow.
// Every task and person here is synthetic; missing flags deliberately override the launched default fixture.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CFG = key('config', 'main'), TODAY = L.ymd(new Date(L.NOW)), OPEN = 253402178400000;
const TASK = { root: 'coldroom', prev: '', next: '', text: 'Wipe coldroom handles', area: 'Coldroom', section: 'larder', sectionName: 'Larder', shared: false,
  dows: [0, 1, 2, 3, 4, 5, 6], guide: '', from: L.NOW - 14 * 86400000, until: OPEN, at: L.NOW - 15 * 86400000, by: 'sam' };
const FLAG = '[data-a="staffsee"][data-f="cleaning"]';
const reads = p => p.evaluate(() => (__fake.reads || []).filter(k => /\/cleaning(Tasks|Done)(\/|$)/.test(k)));
const writes = p => p.evaluate(() => (__fake.writes || []).flat().filter(x => /\/cleaning(Tasks|Done)\//.test(x.path)));
const config = p => p.evaluate(k => __fake.dump()[k], CFG);
const records = p => p.evaluate(() => Object.fromEntries(Object.entries(__fake.dump()).filter(([k]) => /\/cleaning(Tasks|Done)\//.test(k))));
const shown = (p, selector) => p.evaluate(s => Array.from(document.querySelectorAll(s)).some(e => e.getClientRects().length), selector);
function fixture(flag, role = 'staff') {
  const c = L.seed()[CFG];
  delete c.staffSee;
  if (flag !== undefined) c.staffSee = { cleaning: flag };
  c.people = c.people.map(p => p.id === 'ann' ? { ...p, role } : p);
  if (role === 'view') c.tickIds = c.tickIds.filter(id => id !== 'ann');
  if (role === 'fnc') { c.fnOnlyIds = ['ann']; c.fnIds = ['ann']; }
  c.kitSecs = [{ id: 'larder', name: 'Larder' }];
  return { [CFG]: c, [key('sections', 'larder')]: { name: 'Larder', uses: 1, hidden: false },
    [key('cleaningTasks', 'coldroom')]: TASK,
    [key('cleaningTasks', 'pass')]: { ...TASK, root: 'pass', text: 'Wipe the pass', area: 'Pass', section: '', sectionName: '', shared: true },
    [key('cleaningDone', '2026-01-01_coldroom')]: { day: '2026-01-01', task: 'coldroom', version: 1, done: true, doneAt: 1767254400000, doneById: 'ann', doneBy: 'Ann', workerId: 'ann', worker: 'Ann', by: 'ann' } };
}
async function open(b, route = '#/', options = {}) {
  return L.open(b, route, { who: 'ann', extra: fixture(), wait: 900, init: () => {
    const d = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
    ['ann', 'sam', 'bo', 'head'].forEach(id => localStorage.setItem('lk.sec.' + id, JSON.stringify({ d, sec: 'larder', name: 'Larder', self: true, at: Date.now() })));
  }, ...options });
}
async function route(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 400); }
async function loaded(p) { await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2 && !document.querySelector('.cln-loading')); }
async function remoteFlag(p, flag) {
  await p.evaluate(({ key, flag }) => { const c = __fake.dump()[key]; __fake.write(key, { ...c, staffSee: { ...c.staffSee, cleaning: flag } }); }, { key: CFG, flag });
  await L.settle(p, 350);
}
async function menuLink(p) {
  return (await L.chefItems(p)).includes('cleaning');
}
async function closed(p) {
  await L.waitFor(p, () => /Cleaning is not open to the team yet/.test(document.body.textContent));
  return !(await shown(p, '.cln-page')) && !/Wipe coldroom handles|Wipe the pass/.test(await L.txt(p, '#main'));
}
async function save(p) {
  await p.click('[data-p="a-save"]'); await L.settle(p, 500);
  await L.waitFor(p, () => !LK_PREP.state.busy);
}

(async () => {
  const b = await L.start(); let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.stack || e).split('\n').slice(0, 2).join(' ')); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  for (const [label, flag, role] of [['missing', undefined, 'staff'], ['false', false, 'staff'], ['string true', 'true', 'staff'], ['number one', 1, 'staff'], ['lead', false, 'lead'], ['view only', false, 'view'], ['editable sous label', false, 'sous']]) {
    await step('closed ' + label, async () => {
      p = await open(b, '#/', { extra: fixture(flag, role) });
      await L.waitFor(p, () => LK_PREP.state.configFull && LK_PREP.state.authed);
      ok(!(await shown(p, '.tabbar a[href="#/cleaning"], .pnav a[href="#/cleaning"], .dockets a[href="#/cleaning"]')) && !(await menuLink(p)), label + ': no Cleaning tab, docket or chef-hat link');
      ok(!(await reads(p)).length, label + ': the landing page makes no cleaning read');
      await route(p, '#/cleaning');
      ok(await closed(p), label + ': a direct Cleaning URL explains that the team page is not open');
      ok(!(await reads(p)).length && !(await p.evaluate(() => !!window.LK_CLEANING)), label + ': disabled direct route neither reads records nor downloads the lazy page');
      const denied = await p.evaluate(async d => {
        const C = LK_PREP.cleaning();
        const ops = [() => C.load(d.day, d.day), () => C.tick({ ...d.task, id: 'coldroom' }, d.day, null, 'ann'), () => C.saveTask(d.task, null)];
        return Promise.all(ops.map(op => Promise.resolve().then(op).then(() => 'allowed', e => e.code)));
      }, { day: TODAY, task: TASK });
      ok(denied.every(code => code === 'permission-denied') && !(await reads(p)).length && !(await writes(p)).length, label + ': direct bridge calls cannot read, tick or edit the prepared schedule');
    });
  }

  for (const [label, options] of [['Functions only', { extra: fixture(true, 'fnc') }], ['Google only', { who: '', bootstrapOwner: true, extra: fixture(true) }]]) await step(label, async () => {
    p = await open(b, '#/cleaning', options);
    ok(!(await shown(p, '.cln-page')) && !(await reads(p)).length, label + ': an enabled flag never bypasses the existing private-kitchen boundary');
    ok(!(await shown(p, FLAG)), label + ': no release control');
  });

  for (const who of ['sam', 'bo']) await step('canonical chef ' + who, async () => {
    const extra = fixture(false); extra[CFG].headId = 'bo';
    p = await open(b, '#/cleaning', { who, extra }); await loaded(p);
    ok(await shown(p, '[data-cln="week"]') && await shown(p, '[data-cln="setup"]'), who + ': a canonical head/sous can inspect and prepare the page while off');
    await p.click('[data-cln="tick"][data-id="coldroom"]');
    await L.waitFor(p, k => !!__fake.dump()[k] && !LK_PREP.unsent(), key('cleaningDone', TODAY + '_coldroom'));
    ok((await records(p))[key('cleaningDone', TODAY + '_coldroom')].doneById === who, who + ': setup access also permits a recorded practice tick while off');
    await p.click('[data-cln="setup"]'); await p.click('[data-cln="add"]');
    ok(await shown(p, '#cln-form'), who + ': repeat-task form is available before release');
    ok(!(await shown(p, FLAG)) && (await config(p)).staffSee.cleaning === false, who + ': setup does not release Cleaning to the team');
    await route(p, '#/admin');
    ok(!(await shown(p, FLAG)), who + ': a daily chef PIN alone does not expose the admin release control');
  });

  await step('admin release and rollback', async () => {
    const extra = fixture(); extra[CFG].staffSee = { guides: false, pings: true, minutes: false };
    p = await open(b, '#/admin', { admin: true, who: undefined, extra }); await L.kitchenRow(p, 'see');
    const before = await records(p), readCount = (await reads(p)).length, originalFlag = (await config(p)).staffSee.cleaning;
    ok(!(await p.isChecked(FLAG)) && await shown(p, '#k-b-see a[href="#/cleaning"]'), 'admin: missing Cleaning flag starts off with a direct setup link');
    ok(/Turning it off keeps the schedule and completed records/.test(await L.txt(p, '#k-b-see')), 'admin: rollback copy explains that the saved programme and history remain');
    await p.check(FLAG); await L.settle(p, 150);
    ok(originalFlag !== true && (await config(p)).staffSee.cleaning === originalFlag && await p.isChecked(FLAG), 'admin: checking the control only edits the existing draft until Save');
    ok((await reads(p)).length === readCount && readCount === 0, 'admin: showing and editing the release setting makes no cleaning read');
    await save(p);
    const enabled = await config(p);
    ok(enabled.staffSee.cleaning === true && enabled.staffSee.guides === false && enabled.staffSee.pings === true && enabled.staffSee.minutes === false, 'admin: Save releases Cleaning and preserves the other page settings');
    const staff = await open(b, '#/', { extra: { ...extra, [CFG]: enabled } });
    try {
      ok(await shown(staff, '.tabbar a[href="#/cleaning"], .pnav a[href="#/cleaning"]') && await menuLink(staff), 'saved release: staff see Cleaning in the navigation and chef hat');
      ok(!(await reads(staff)).length, 'saved release: visibility does not preload private cleaning data');
      await route(staff, '#/cleaning'); await loaded(staff);
      ok(!(await shown(staff, '[data-cln="setup"], [data-cln="week"]')), 'saved release: staff receive daily ticks without chef setup controls');
      ok(!staff.errors.length, 'saved release: no staff browser errors');
    } finally { await staff.context().close(); }
    await p.uncheck(FLAG); await L.settle(p, 150);
    ok((await config(p)).staffSee.cleaning === true, 'admin: an unsaved switch-off does not withdraw the published page');
    await save(p);
    ok((await config(p)).staffSee.cleaning === false && JSON.stringify(await records(p)) === JSON.stringify(before), 'admin: saved switch-off retains every task revision and completed record');
    await p.click('#k-b-see a[href="#/cleaning"]'); await loaded(p);
    ok(await shown(p, '[data-cln="setup"]'), 'admin: the setup link still opens the prepared schedule after rollback');
  });

  await step('failed release save', async () => {
    p = await open(b, '#/admin', { admin: true, who: undefined, extra: fixture(false) }); await L.kitchenRow(p, 'see');
    await p.check(FLAG); await p.evaluate(() => { __fake.deny = /\/config\/main$/; }); await save(p);
    ok((await config(p)).staffSee.cleaning === false && await p.isChecked(FLAG), 'failed admin save: the team remains closed while the checked draft is retained');
    ok(await p.locator('[data-p="a-save"]').isEnabled(), 'failed admin save: the existing Save flow offers retry');
    await p.evaluate(() => { __fake.deny = null; }); await save(p);
    ok((await config(p)).staffSee.cleaning === true, 'failed admin save: retry publishes the retained choice');
  });

  await step('concurrent admin merge', async () => {
    p = await open(b, '#/admin', { admin: true, who: undefined, extra: fixture(false) }); await L.kitchenRow(p, 'see');
    await p.uncheck('[data-a="staffsee"][data-f="guides"]');
    await remoteFlag(p, true); await save(p);
    const c = await config(p);
    ok(c.staffSee.cleaning === true && c.staffSee.guides === false && c.staffSee.pings === true && c.staffSee.minutes === true, 'concurrent admin: saving another page setting preserves the remote Cleaning release and untouched defaults');
  });

  await step('live disable and re-enable', async () => {
    p = await open(b, '#/cleaning', { deviceMode: 'shared', extra: fixture(true) }); await loaded(p);
    const before = await records(p), count = (await reads(p)).length;
    await p.click('[data-cln="tick"][data-id="coldroom"]');
    await L.waitFor(p, () => !!document.querySelector('#cln-worker-sheet'));
    await remoteFlag(p, false);
    ok(await closed(p) && !(await p.$('#cln-worker-sheet')), 'live disable: private tasks and the open worker picker disappear immediately');
    ok(!(await menuLink(p)) && !(await shown(p, '.tabbar a[href="#/cleaning"], .pnav a[href="#/cleaning"]')), 'live disable: navigation and the chef-hat link update without reload');
    const denied = await p.evaluate(async ({ task, day }) => {
      const C = LK_PREP.cleaning();
      return Promise.all([C.load(day, day), C.tick({ ...task, id: 'coldroom' }, day, null, 'ann')].map(x => x.then(() => 'allowed', e => e.code)));
    }, { task: TASK, day: TODAY });
    ok(denied.every(x => x === 'permission-denied') && (await reads(p)).length === count && !(await writes(p)).length, 'live disable: retained bridge references cannot start more reads or ticks');
    ok(JSON.stringify(await records(p)) === JSON.stringify(before), 'live disable: closing access neither deletes history nor records the unfinished picker');
    await remoteFlag(p, true); await loaded(p);
    ok((await reads(p)).length === count + 2 && /Wipe coldroom handles/.test(await L.txt(p, '.cln-page')), 're-enable: one fresh bounded pair of queries restores the existing schedule');
  });

  await step('late read after disable', async () => {
    p = await open(b, '#/recipes', { extra: fixture(true) });
    await p.evaluate(() => {
      const fs = LK_PREP.book().fs(), read = fs.getDocsFromServer;
      window.heldCleaning = []; window.restoreCleaningReads = () => { fs.getDocsFromServer = read; };
      fs.getDocsFromServer = function (ref) {
        const path = Array.isArray(ref.path) ? ref.path.join('/') : ref.path;
        return read.apply(this, arguments).then(result => /\/cleaning(Tasks|Done)$/.test(path) ? new Promise(resolve => heldCleaning.push(() => resolve(result))) : result);
      };
    });
    await route(p, '#/cleaning');
    await L.waitFor(p, () => heldCleaning.length === 2);
    await remoteFlag(p, false); const count = (await reads(p)).length;
    await p.evaluate(() => heldCleaning.splice(0).forEach(f => f())); await L.settle(p, 400);
    ok(await closed(p), 'late server reply: completed queries cannot repopulate the disabled page');
    ok((await reads(p)).length === count && !(await menuLink(p)), 'late server reply: cancellation neither retries nor restores the link');
    await p.evaluate(() => restoreCleaningReads()); await remoteFlag(p, true); await loaded(p);
    ok((await reads(p)).length === count + 2, 'late server reply: reopening loads fresh records rather than the cancelled response');
  });

  await step('pending completion through disable', async () => {
    p = await open(b, '#/cleaning', { extra: fixture(true) }); await loaded(p);
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.click('[data-cln="tick"][data-id="coldroom"]'); await L.waitFor(p, () => LK_PREP.unsent());
    await remoteFlag(p, false);
    ok(await closed(p) && await p.evaluate(() => LK_PREP.unsent()), 'pending completion: disabling hides the page while preserving the existing unsent-write guard');
    ok(await p.evaluate(async () => !(await LK_PREP.changeDevice('shared', true)) && LK_PREP.unsent()), 'pending completion: the existing device-change guard still blocks replacing the recorder');
    const count = (await writes(p)).length;
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await L.waitFor(p, () => !LK_PREP.unsent());
    ok(await closed(p) && (await writes(p)).length === count, 'pending acknowledgement: completion cannot reopen the disabled page or submit a duplicate');
    const kept = (await records(p))[key('cleaningDone', TODAY + '_coldroom')];
    ok(kept && kept.done && kept.doneById === 'ann', 'pending acknowledgement: a tick already accepted before disable retains its recorder and history');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
