const L = require('./lib'), { R, ok } = L.results();
const fs = require('fs');
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), past = L.ymd(new Date(L.NOW - 86400000));
const people = ['head', 'sous', 'lead', 'staff', 'fnc', 'view'].map((role, i) => ({ id: ['head', 'sam', 'lead', 'ann', 'fay', 'viewer'][i], name: ['Head', 'Sam', 'Lead', 'Ann', 'Fay', 'Viewer'][i], role, active: true, add: role !== 'view' && role !== 'fnc', tick: true, del: false }));
const cfg = { people, staffIds: people.map(x => x.id), headId: 'head', sousIds: ['head', 'sam'], fnIds: ['fay'], fnOnlyIds: ['fay'] };
const extra = { [key('config', 'main')]: cfg };
for (const p of people) extra[key('pinset', p.id)] = { at: 1 };
const receipt = (day, supplier) => ({ day, supplier, receivedAt: L.NOW - 60000 - (day === past ? 86400000 : 0), recordedAt: L.NOW, chilled: 2.5, frozen: -18, note: 'Sample goods', receivedBy: 'Ann', receivedById: 'ann', by: 'ann' });
extra[key('deliveries', 'older')] = receipt(past, 'Earlier supplier');
const open = async (b, o = {}) => { const p = await L.open(b, '#/deliveries', { extra, wait: 1800, ...o }); await p.waitForSelector('#dl-supplier'); return p; };
const records = p => p.evaluate(prefix => Object.entries(window.__fake.dump()).filter(([k]) => k.startsWith(prefix)).map(([id, d]) => ({ id, ...d })), key('deliveries') + '/');
const fill = async (p, c = '3.5', f = '-18.5') => { await p.fill('#dl-supplier', 'Test supplier'); await p.fill('#dl-chilled', c); await p.fill('#dl-frozen', f); await p.fill('#dl-note', 'Chicken and frozen goods'); };
const save = async p => { await p.click('#dl-form button[type="submit"]'); await L.settle(p, 1000); };
(async () => {
  const b = await L.start();
  // Every role has the actual menu link, and can persist a mixed delivery as themselves.
  for (const person of people) {
    const p = await open(b, { who: person.id });
    ok((await L.chefItems(p)).includes('deliveries'), person.role + ': menu includes Delivery received');
    ok(await p.inputValue('#dl-day') === today && await p.inputValue('#dl-time') === '14:00', person.role + ': kitchen date and 24-hour time are filled in');
    await fill(p, '0', '-18.5'); await save(p);
    const d = (await records(p)).find(x => x.supplier === 'Test supplier');
    ok(!!d && d.day === today && d.chilled === 0 && d.frozen === -18.5 && d.by === person.id && d.receivedById === person.id && d.receivedBy === person.name, person.role + ': zero, negative decimal, date, time and receiver survive saving');
    ok(/Delivery saved/.test(await p.locator('#dl-save-note').innerText()) && await p.inputValue('#dl-supplier') === '', person.role + ': confirmed save clears form and appears in today\'s list');
    ok((await p.locator('.dl-receipt').innerText()).includes(person.name) && !(await p.$('#dl-view-day')), person.role + ': today only, with receiving name');
    ok(!p.errors.length, person.role + ': no page errors ' + p.errors.join(' | ')); await p.context().close();
  }
  let p = await open(b, { who: 'ann' });
  await save(p); ok(/supplier name/.test(await p.locator('#dl-save-note').innerText()), 'empty supplier is rejected');
  await p.fill('#dl-supplier', 'Test supplier'); await save(p); ok(/either|both|Enter a chiller/.test(await p.locator('#dl-save-note').innerText()), 'at least one reading is required');
  for (const value of ['abc', '-101', '101', '1e2']) {
    await p.fill('#dl-chilled', value); await save(p); ok(/Enter a temperature/.test(await p.locator('#dl-save-note').innerText()), 'invalid reading rejected: ' + value);
  }
  ok(await p.$eval('#dl-time', e => e.type === 'time' && e.step === '60'), 'delivery arrival uses a minute picker');
  await p.fill('#dl-chilled', '3,5'); await p.fill('#dl-time', '23:59'); await save(p); ok(/future/.test(await p.locator('#dl-save-note').innerText()), 'future receipt time is rejected');
  await p.fill('#dl-time', '13:45'); await save(p);
  let saved = (await records(p)).find(x => x.supplier === 'Test supplier');
  ok(saved && saved.chilled === 3.5 && saved.frozen === null && saved.receivedAt === L.NOW - 15 * 60000, 'comma decimal and changed delivery time persist, unused temperature stays null');
  await p.reload(); await p.waitForSelector('.dl-receipt'); ok(/Test supplier/.test(await p.locator('.dl-receipts').innerText()), 'saved delivery survives reopening the app');
  await fill(p, '', '-20'); await p.evaluate(() => { window.__fake.mode = 'deny'; }); await save(p);
  ok(/refused/.test(await p.locator('#dl-save-note').innerText()) && await p.inputValue('#dl-frozen') === '-20' && await p.inputValue('#dl-supplier') === 'Test supplier', 'refused save keeps the entered details');
  await p.evaluate(() => { window.__fake.mode = 'ok'; }); await save(p);
  ok((await records(p)).filter(x => x.supplier === 'Test supplier').length === 2, 'retry after refusal saves one additional frozen-only delivery');
  await fill(p); await p.evaluate(() => { window.__fake.mode = 'hold'; }); await save(p);
  ok(/could not be confirmed/.test(await p.locator('#dl-save-note').innerText()) && await p.inputValue('#dl-chilled') === '3.5', 'connection failure preserves an exact retry');
  await p.evaluate(() => { window.__fake.mode = 'ok'; }); await save(p);
  ok((await records(p)).filter(x => x.supplier === 'Test supplier').length === 3, 'connection retry creates exactly one receipt');
  // Lost acknowledgement: the server has this id even though the caller sees an error. Retrying reads and confirms it.
  await fill(p, '2', '-19');
  await p.evaluate(() => { const old = window.LK_PREP.book; window.LK_PREP.book = () => old(); const f = old().fs(), real = f.writeBatch; f.writeBatch = (...args) => { const batch = real(...args), commit = batch.commit; batch.commit = () => commit().then(() => Promise.reject({ code: 'unavailable' })); return batch; }; });
  await save(p);
  const count = (await records(p)).length;
  await save(p);
  ok((await records(p)).length === count && /Delivery saved/.test(await p.locator('#dl-save-note').innerText()), 'lost acknowledgement is confirmed by the same id without a duplicate');
  await p.context().close();
  // Draft survives ordinary navigation, but sign-out drops the draft and loaded private records.
  p = await open(b, { who: 'ann' }); await fill(p); await p.goto(L.BASE + '#/recipes'); await L.settle(p, 300); await p.goto(L.BASE + '#/deliveries'); await p.waitForSelector('#dl-supplier');
  ok(await p.inputValue('#dl-supplier') === 'Test supplier', 'draft survives leaving and returning to the page');
  await p.evaluate(() => window.LK_PREP.signOut(true)); await L.settle(p, 500);
  ok(!await p.$('#dl-supplier, .dl-receipt') && !await p.evaluate(() => window.LK_DELIVERY.dirty()), 'sign-out removes receipt data and pending form'); await p.context().close();
  for (const offset of [-3, 26]) {
    p = await open(b, { who: 'ann', clock: L.NOW + offset * 3600000, server: L.NOW, tz: 'Europe/London' });
    ok(await p.inputValue('#dl-day') === today && await p.inputValue('#dl-time') === '14:00', 'server clock overrides phone time and time zone: ' + offset + ' hours');
    await p.context().close();
  }
  // Admin selects history with one query. Ordinary roles never query past days.
  p = await open(b, { who: 'head', admin: true });
  await p.fill('#dl-view-day', past); await p.dispatchEvent('#dl-view-day', 'change'); await L.settle(p, 300);
  ok(/Earlier supplier/.test(await p.locator('.dl-receipts').innerText()), 'verified admin can open earlier delivery records');
  await p.evaluate(() => { window.__fake.failReads = /\/deliveries/; }); await p.click('[data-dl="refresh"]'); await L.settle(p, 300);
  ok(/Could not read/.test(await p.locator('.dl-history').innerText()) && !/No deliveries/.test(await p.locator('.dl-history').innerText()), 'history read failure shows an error, never an empty history');
  await p.evaluate(() => { window.__fake.failReads = null; }); await p.click('[data-dl="refresh"]'); await L.settle(p, 300);
  ok(/Earlier supplier/.test(await p.locator('.dl-receipts').innerText()), 'refresh recovers a failed history read');
  await p.fill('#dl-day', past); await fill(p, '4', ''); await save(p);
  ok((await records(p)).some(x => x.day === past && x.supplier === 'Test supplier' && x.by === 'head' && x.receivedById === 'head' && x.receivedBy === 'Head'), 'the verified head-chef device records a past delivery with the authenticated receiver');
  ok(/Test supplier/.test(await p.locator('.dl-receipts').innerText()), 'past-date save appears immediately without another history read');
  await p.context().close();
  p = await L.open(b, '#/deliveries', { who: '', extra, wait: 1500 });
  ok(!await p.$('#dl-form, .dl-receipt') && /Who are you/.test(await p.locator('body').innerText()), 'direct delivery URL requires a personal sign-in'); await p.context().close();
  p = await L.open(b, '#/deliveries', { extra, who: 'ann', block: 'js/deliveries\\.js', wait: 1500 });
  ok(!!await p.$('[data-delivery-retry]') && /Could not open/.test(await p.locator('#delivery-root').innerText()), 'failed module download has a retry state'); await p.context().close();
  // Layout and screenshots use synthetic people and delivery data only.
  fs.mkdirSync('shots', { recursive: true });
  for (const width of [390, 768, 1280]) {
    p = await open(b, { who: 'ann', width, extra: { ...extra, [key('deliveries', 'sample')]: receipt(today, 'Test supplier') } });
    await fill(p); await L.settle(p, 200);
    ok(!await L.overflow(p), width + ' px: no horizontal overflow');
    ok((await p.locator('#dl-chilled').boundingBox()).height >= 44 && (await p.locator('#dl-frozen').boundingBox()).height >= 44, width + ' px: readable temperature fields with 44 px tap height');
    ok(!p.errors.length, width + ' px: no JavaScript errors');
    if (width !== 768) await p.screenshot({ path: 'shots/delivery-' + width + '.png', fullPage: true });
    await p.context().close();
  }
  await b.close(); console.log(R.join('\n')); process.exit(R.some(r => r.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
