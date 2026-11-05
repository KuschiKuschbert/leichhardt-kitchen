// Browser controls and the SDK stand-in use the same owner-approved capability lists.
const L = require('./lib');
const { R, ok } = L.results();
const configPath = 'kitchens/' + L.PIN + '/config/main';
const today = L.ymd(new Date(L.NOW));
async function direct(p, path, value) {
  return p.evaluate(async ({ path, value }) => {
    const fs = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    try { await fs.updateDoc(fs.doc(fs.getFirestore(), ...path.split('/')), value); return 'allowed'; }
    catch (e) { return e.code; }
  }, { path, value });
}
(async () => {
  const b = await L.start(), cfg = L.seed()[configPath];
  cfg.tickIds = ['sam', 'bo'];
  let p = await L.open(b, '#/prep', { who: 'ann', extra: { [configPath]: cfg }, wait: 1500 });
  await L.waitFor(p, () => LK_PREP.state.configFull && LK_PREP.state.itemsState === 'ok');
  ok(await p.locator('[data-p="tick"]').first().isDisabled(), 'Add-only staff have no enabled prep tick');
  const path = 'kitchens/' + L.PIN + '/days/' + today + '/items/i1';
  ok(await direct(p, path, { done: true, doneAt: L.NOW, doneById: 'ann', by: 'ann' }) === 'permission-denied', 'direct SDK completion also requires Tick');
  ok(await direct(p, path, { deleted: true, deletedBy: 'Ann', deletedAt: L.NOW, by: 'ann' }) === 'permission-denied', 'Add-only staff cannot remove another recorder\'s line');
  await p.fill('#p-text', 'Synthetic capability item'); await p.fill('#p-qty', '3 kg'); await p.click('.nb-addbtn');
  await L.waitFor(p, () => Object.values(__fake.dump()).some(x => x && x.text === 'Synthetic capability item'));
  const made = await p.evaluate(() => Object.entries(__fake.dump()).find(([, x]) => x && x.text === 'Synthetic capability item')[0]);
  ok(!!made, 'Add-only staff still add prep');
  // Undo in the open sheet's receipt (step 2b, 5 Nov 2026), the same own-add Undo the slip gave
  await p.locator('.p-sheet [data-p="just-undo"]').last().click();
  await L.waitFor(p, path => __fake.dump()[path].deleted === true, made);
  ok(await p.evaluate(path => __fake.dump()[path].addedById === 'ann', made), 'own Add Undo retains its original recorder');
  await p.evaluate(path => {
    const c = structuredClone(__fake.dump()[path]); c.people.find(x => x.id === 'ann').add = false;
    __fake.write(path, c);
  }, configPath);
  await L.waitFor(p, () => LK_PREP.state.config.people.find(x => x.id === 'ann').add === false);
  await p.fill('#p-text', 'Approved Add remains');
  ok(await p.locator('.nb-addbtn').isEnabled(), 'a requested people-flag change does not silently revoke approved Add');
  await p.evaluate(path => { const c = structuredClone(__fake.dump()[path]); c.addIds = c.addIds.filter(x => x !== 'ann'); __fake.write(path, c); }, configPath);
  await L.waitFor(p, () => !document.querySelector('.nb-addbtn') || document.querySelector('.nb-addbtn').disabled);
  ok(await direct(p, path, { text: 'Unapproved edit', by: 'ann' }) === 'permission-denied', 'canonical revocation immediately stops direct body edits');
  ok(p.errors.length === 0, 'capability changes have no browser errors');
  await p.context().close();

  const duplicate = { text: 'Synthetic duplicate', station: 'Larder', qty: '1 kg', done: false, deleted: false, addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 600000 };
  const first = 'kitchens/' + L.PIN + '/days/' + today + '/items/cap-dup-1', second = first.replace('-1', '-2');
  p = await L.open(b, '#/prep', { who: 'ann', extra: { [first]: duplicate, [second]: { ...duplicate, addedAt: L.NOW - 300000 } }, wait: 3500 });
  ok(await p.evaluate(([a, b]) => !__fake.dump()[a].deleted && !__fake.dump()[b].deleted, [first, second]), 'Add-only staff leave existing duplicates for a remover');
  ok(await p.evaluate(() => !__fake.reads.some(path => /\/items\/cap-dup-/.test(path))), 'Add-only background consolidation adds no duplicate reconciliation reads');
  await p.context().close();

  p = await L.open(b, '#/prep', { who: 'sam', wait: 1500 });
  const original = await p.evaluate(path => structuredClone(__fake.dump()[path]), configPath);
  await p.evaluate(async () => {
    const c = structuredClone(LK_PREP.state.config); c.people.find(x => x.id === 'ann').del = true;
    await LK_PREP.saveConfig(c);
  });
  await L.waitFor(p, () => LK_PREP.state.config.people.find(x => x.id === 'ann').del === true);
  ok(await p.evaluate(([path, before]) => JSON.stringify(__fake.dump()[path].delIds) === JSON.stringify(before.delIds), [configPath, original]), 'sous staff save preserves canonical Delete');
  ok(await direct(p, configPath, { delIds: ['ann', 'sam'], by: 'sam' }) === 'permission-denied', 'stand-in refuses a sous canonical grant');
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', wait: 1500 });
  await L.adminTab(p, 'people');
  await p.evaluate(async () => { const c = structuredClone(LK_PREP.state.config); c.people.find(x => x.id === 'ann').tick = false; await LK_PREP.saveConfig(c); });
  await L.waitFor(p, () => !LK_PREP.state.config.tickIds.includes('ann'));
  ok(await p.evaluate(path => __fake.dump()[path].addIds.includes('ann') && !__fake.dump()[path].tickIds.includes('ann'), configPath), 'owner changes one canonical capability while preserving the others');
  ok(p.errors.length === 0, 'owner capability save has no browser errors');
  await p.context().close();

  const custom = L.seed()[configPath];
  custom.tickIds = custom.tickIds.filter(id => id !== 'sam');
  custom.people.find(x => x.id === 'sam').role = 'staff';
  custom.people.find(x => x.id === 'sam').tick = false;
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', extra: { [configPath]: custom }, wait: 1500 });
  await L.adminTab(p, 'people');
  await p.click('[data-p="a-ids-undo"]');
  await L.waitFor(p, () => LK_PREP.state.config.people.find(x => x.id === 'sam').role === 'sous' && !LK_PREP.state.idBusy);
  ok(await p.evaluate(path => !__fake.dump()[path].tickIds.includes('sam') && __fake.dump()[path].people.find(x => x.id === 'sam').tick === false, configPath), 'owner Undo of a role-only request preserves a custom-disabled Tick');
  ok(p.errors.length === 0, 'owner role Undo has no browser errors');
  await p.context().close();

  for (const mixed of ['old editor', 'old app', 'old function model']) {
    const c = L.seed()[configPath]; c.fnIds = ['sam']; c.people.find(x => x.id === 'sam').fn = true;
    p = await L.open(b, '#/prep', { who: 'sam', extra: { [configPath]: c }, wait: 1000 });
    await p.evaluate(() => localStorage.setItem('lk.fe.draft.new', 'synthetic unsent draft'));
    if (mixed === 'old editor') await p.context().route(/\/js\/fnedit\.js(?:\?|$)/, r => r.fulfill({ contentType: 'text/javascript', body: 'window.LK_FE={api:9,mount:function(){window.oldEditorMounted=true},unmount:function(){},hasDraft:function(){return true}};' }));
    if (mixed === 'old app') {
      const oldApp = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8').replace('var FE_API = 10', 'var FE_API = 9');
      await p.context().route(/\/js\/app\.js(?:\?|$)/, r => r.fulfill({ contentType: 'text/javascript', body: oldApp }));
      await p.reload(); await L.settle(p, 1200);
    }
    if (mixed === 'old function model') await p.evaluate(() => { delete LK_FN.M.effects; });
    await p.evaluate(() => { location.hash = '#/functions/new'; });
    await L.waitFor(p, () => /Reload the book/.test((document.querySelector('#fe-root') || {}).textContent || ''));
    ok(await p.evaluate(() => !window.oldEditorMounted && !document.querySelector('[data-fe="save"]')), mixed + ': incompatible editor refuses to mount before a save');
    ok(await p.evaluate(() => localStorage.getItem('lk.fe.draft.new') === 'synthetic unsent draft'), mixed + ': refresh prompt preserves the unsent draft');
    ok(await p.evaluate(() => !Object.keys(__fake.dump()).some(k => /\/functions\/[^/]+$/.test(k))), mixed + ': no partial booking is written');
    ok(p.errors.length === 0, mixed + ': clear reload prompt has no browser errors');
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
