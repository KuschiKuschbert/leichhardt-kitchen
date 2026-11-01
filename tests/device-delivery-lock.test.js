// Delivery drafts and exact saves stay private across 04:00, then resume only for their original person.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), cutoff = Date.parse(day + 'T04:00:00+10:00');
const prefix = 'kitchens/' + L.PIN + '/deliveries/';
const fields = ['supplier', 'day', 'time', 'chilled', 'frozen', 'note'];
const receiptList = p => p.evaluate(prefix => Object.entries(__fake.dump()).filter(([path]) => path.startsWith(prefix)), prefix);
const values = p => p.evaluate(fields => Object.fromEntries(fields.map(name => [name, document.getElementById('dl-' + name).value])), fields);
async function fill(p, supplier) {
  await p.fill('#dl-supplier', supplier);
  await p.fill('#dl-time', '03:45');
  await p.fill('#dl-chilled', '0');
  await p.fill('#dl-frozen', '-18.5');
  await p.fill('#dl-note', 'Original receiving details');
}
async function unlock(p, id, pin) {
  const choice = p.locator('.p-name[data-id="' + id + '"]');
  if (await choice.count() && await choice.isVisible()) { await choice.click(); await L.settle(p, 200); }
  await p.locator('#pf1').fill(pin);
  await L.waitFor(p, id => LK_PREP.state.authed && LK_PREP.state.who === id && LK_PREP.privateAccess(), id, 8000);
  await L.waitFor(p, () => !!document.querySelector('#dl-supplier'));
}
async function open(b, mode) {
  const p = await L.open(b, '#/deliveries', { who: 'ann', deviceMode: mode, clock: cutoff - 60000, width: 390, height: 844, touch: true, wait: 1000 });
  await L.waitFor(p, () => !!document.querySelector('#dl-supplier') && !LK_PREP.unsent());
  return p;
}
async function dailyLock(p) {
  await p.clock.runFor(90000); await L.settle(p, 300);
  await L.waitFor(p, () => !LK_PREP.privateAccess() && !!LK_PREP.workLock());
}
(async () => {
  const b = await L.start();
  for (const mode of ['personal', 'shared']) {
    const p = await open(b, mode);
    await fill(p, 'Draft receiving example');
    const before = await values(p), identity = await p.evaluate(() => LK_PREP.identity());
    await dailyLock(p);
    ok(!await p.$('#dl-form,.dl-receipt') && await p.evaluate(() => LK_DELIVERY.dirty() && LK_PREP.dirtyForUpdate()), mode + ': 04:00 hides the delivery but keeps its actual unsaved draft');
    ok(await p.evaluate(id => LK_PREP.workLock().identity === id && LK_PREP.blockedRecorder() === 'ann', identity), mode + ': the retained draft stays bound to its original device and person');
    await p.locator('#pf1').fill('3333'); await L.settle(p, 300);
    ok(!await p.$('#dl-form') && !await p.evaluate(() => LK_PREP.privateAccess()) && !(await receiptList(p)).length, mode + ': another person\'s PIN cannot reveal or save the retained receiving form');
    await p.clock.runFor(21000); await unlock(p, 'ann', '2222');
    ok(JSON.stringify(await values(p)) === JSON.stringify(before), mode + ': the original PIN restores every receiving field, including zero and a negative decimal');
    ok(!(await receiptList(p)).length, mode + ': unlocking the draft does not record a delivery');
    await p.click('#dl-form button[type="submit"]');
    await L.waitFor(p, () => /Delivery saved/.test((document.querySelector('#dl-save-note') || {}).textContent || ''));
    const entries = await receiptList(p), record = entries[0] && entries[0][1];
    ok(entries.length === 1 && record.by === 'ann' && record.receivedById === 'ann' && record.receivedBy === 'Ann' && record.supplier === before.supplier && record.receivedAt === Date.parse(day + 'T03:45:00+10:00') && record.chilled === 0 && record.frozen === -18.5 && record.note === before.note, mode + ': explicit Save records the restored delivery once with its actual receiver');
    ok(!p.errors.length, mode + ': draft restoration has no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  for (const mode of ['personal', 'shared']) for (const result of ['refusal', 'acknowledgement']) {
    const p = await open(b, mode), label = mode + ' late ' + result;
    await fill(p, 'Pending receiving example');
    await p.evaluate(result => {
      const fs = LK_PREP.book().fs(), make = fs.writeBatch;
      fs.writeBatch = function () {
        const batch = make.apply(fs, arguments), set = batch.set, commit = batch.commit;
        let delivery = false;
        batch.set = function (ref, value) {
          const path = Array.isArray(ref.path) ? ref.path.join('/') : ref.path;
          if (/\/deliveries\//.test(path)) { delivery = true; window.__deliveryOriginal = { path, data: JSON.parse(JSON.stringify(value)) }; }
          return set.apply(batch, arguments);
        };
        batch.commit = function () { if (delivery) __fake.mode = result === 'refusal' ? 'deny' : 'hold'; return commit.apply(batch, arguments); };
        return batch;
      };
      if (result === 'refusal') {
        const reject = Promise.reject;
        Promise.reject = function (error) {
          if (error && error.code === 'permission-denied') {
            Promise.reject = reject; __fake.mode = 'ok';
            return new Promise((resolve, no) => { window.__releaseDeliveryRefusal = () => no(error); });
          }
          return reject.call(Promise, error);
        };
      }
    }, result);
    await p.click('#dl-form button[type="submit"]');
    await L.waitFor(p, result => !!window.__deliveryOriginal && LK_PREP.unsent() && (result !== 'refusal' || !!window.__releaseDeliveryRefusal), result);
    const original = await p.evaluate(() => window.__deliveryOriginal);
    await dailyLock(p);
    ok(!await p.$('#dl-form,.dl-receipt') && await p.evaluate(() => LK_DELIVERY.dirty() && LK_PREP.unsent()), label + ': the pending receipt stays hidden and retained through the PIN boundary');
    await p.evaluate(result => { if (result === 'refusal') window.__releaseDeliveryRefusal(); else { __fake.mode = 'ok'; __fake.release(); } }, result);
    await L.settle(p, 300);
    ok(await p.evaluate(() => !LK_PREP.privateAccess() && LK_PREP.unsent() && LK_PREP.blockedRecorder() === 'ann' && LK_DELIVERY.dirty()), label + ': a late server result does not unlock the form or release its original recorder');
    ok(await p.evaluate(() => !LK_PREP.signOut(true)) && !await p.$('#dl-form'), label + ': pending work cannot be handed to another person');
    await unlock(p, 'ann', '2222');
    await L.waitFor(p, () => !LK_PREP.unsent() && /Delivery saved/.test((document.querySelector('#dl-save-note') || {}).textContent || ''), null, 10000);
    const entries = await receiptList(p), saved = entries.find(([path]) => path === original.path);
    ok(entries.length === 1 && saved && Object.keys(original.data).every(k => saved[1][k] === original.data[k]) && saved[1].by === 'ann' && saved[1].receivedById === 'ann' && saved[1].receivedBy === 'Ann', label + ': fresh same-person PIN finishes exactly the original id, payload and receiver once');
    ok(await p.inputValue('#dl-supplier') === '' && !await p.evaluate(() => LK_DELIVERY.dirty()), label + ': confirmed recovery clears the form only after the valid unlock');
    ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  const reset = await open(b, 'shared');
  await fill(reset, 'PIN version receiving example');
  const resetFields = await values(reset);
  await dailyLock(reset);
  await reset.evaluate(async () => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lk:ann:5555'));
    const hash = [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
    const root = 'kitchens/' + LK_PREP.state.pin + '/';
    __fake.write(root + 'staffpins/ann', { hash, name: 'Ann', setAt: LK_TIME.now() });
    __fake.write(root + 'pinset/ann', { at: LK_TIME.now(), name: 'Ann' });
  });
  await reset.locator('#pf1').fill('2222'); await L.settle(reset, 300);
  ok(!await reset.$('#dl-form') && !await reset.evaluate(() => LK_PREP.privateAccess()) && !(await receiptList(reset)).length, 'a retained delivery cannot bypass a changed PIN version using the previous PIN');
  await reset.clock.runFor(21000); await unlock(reset, 'ann', '5555');
  ok(JSON.stringify(await values(reset)) === JSON.stringify(resetFields), 'a new valid PIN for the same person restores their receiving draft after the PIN version changes');
  ok(!reset.errors.length, 'PIN-version receiving recovery has no browser errors ' + reset.errors.join(' | '));
  await reset.context().close();

  const removed = await open(b, 'shared');
  await fill(removed, 'Removed member receiving example'); await dailyLock(removed);
  await removed.evaluate(() => {
    const root = 'kitchens/' + LK_PREP.state.pin + '/', store = __fake.dump();
    for (const path of ['config/main', 'login/roster']) {
      const value = store[root + path];
      __fake.write(root + path, { ...value, staffIds: (value.staffIds || []).filter(id => id !== 'ann'), people: value.people.map(p => p.id === 'ann' ? { ...p, active: false } : p) });
    }
  });
  await L.settle(removed, 300);
  ok(!await removed.$('#dl-form,.dl-receipt') && !await removed.evaluate(() => LK_PREP.privateAccess()) && !(await receiptList(removed)).length, 'matching retained identity cannot reveal or save a delivery after staff membership is removed');
  ok(!removed.errors.length, 'removed-member receiving lock has no browser errors ' + removed.errors.join(' | '));
  await removed.context().close();

  const p = await open(b, 'shared');
  await fill(p, 'Discarded handover example');
  await p.evaluate(() => LK_PREP.signOut(true)); await L.settle(p, 300);
  ok(!await p.evaluate(() => LK_DELIVERY.dirty()) && !await p.$('#dl-form'), 'manual sign-out clears the delivery draft and private screen');
  await unlock(p, 'bo', '3333');
  ok(await p.inputValue('#dl-supplier') === '' && await p.inputValue('#dl-note') === '' && !(await receiptList(p)).length, 'the next signed-in person receives a fresh form and no previous receiver\'s payload');
  ok(!p.errors.length, 'manual receiving handover has no browser errors ' + p.errors.join(' | '));
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
