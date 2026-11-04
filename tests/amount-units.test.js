// One amount control (S3, 4 Nov 2026, as drawn in the agreed work pages design, docs/work-pages-design-options/
// options.html): under the amount box on Prep and Orders the units as chips, like Wastage and Transfers. The box still
// reads "2 tubs" typed; a chip puts its unit after the number ("2" becomes "2 tubs", "2 kg" becomes "2 tubs") and lights
// while the box says that unit; with no number yet the unit goes in with the cursor before it, so the number comes next.
const L = require('./lib');
const path = require('path');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const saved = (p, col, text) => p.evaluate(([pre, t]) => Object.entries(window.__fake.dump()).filter(([k, v]) => k.indexOf(pre) === 0 && v && v.text === t).map(([, v]) => v.qty), [fsKey(col), text]);
const lit = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s + ' [aria-checked="true"]')].map(e => e.textContent), sel);
(async () => {
  const b = await L.start();
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const tag = w + ' px ';
    // Prep
    let p = await L.open(b, '#/prep', { who: 'sam', width: w, height: h, wait: 1600 });
    await L.pLog(p);
    const units = await p.$$eval('#p-units [data-p="punit"]', l => l.map(e => e.textContent));
    ok(units.join(',') === 'tubs,L,kg,batch,portions', tag + 'prep: the units as drawn under the amount (' + units.join(', ') + ')');
    if (process.env.AUDIT_DIR && w === 390) await p.screenshot({ path: path.join(process.env.AUDIT_DIR, 'units-prep-390.png') });
    await p.fill('#p-text', 'Slice shallots'); await p.fill('#p-qty', '2');
    await p.click('#p-units [data-v="tubs"]'); await L.settle(p, 150);
    ok(await p.inputValue('#p-qty') === '2 tubs' && (await lit(p, '#p-units')).join() === 'tubs', tag + 'prep: a unit chip puts its unit after the number, and lights');
    await p.click('#p-units [data-v="kg"]'); await L.settle(p, 150);
    ok(await p.inputValue('#p-qty') === '2 kg' && (await lit(p, '#p-units')).join() === 'kg', tag + 'prep: another chip swaps the unit, the number stays');
    await p.press('#p-qty', 'Enter'); await L.settle(p, 500);
    ok(JSON.stringify(await saved(p, ['days', today, 'items'], 'Slice shallots')) === '["2 kg"]', tag + 'prep: Add saves "2 kg"');
    // no number yet: the unit goes in, the cursor before it
    await p.fill('#p-text', 'Make stock');
    await p.click('#p-units [data-v="batch"]'); await L.settle(p, 150);
    await p.keyboard.type('3'); await L.settle(p, 150);
    ok(await p.inputValue('#p-qty') === '3 batch' && (await lit(p, '#p-units')).join() === 'batch', tag + 'prep: with no number, the unit goes in and the number typed next comes before it (' + await p.inputValue('#p-qty') + ')');
    await p.press('#p-qty', 'Enter'); await L.settle(p, 500);
    ok(JSON.stringify(await saved(p, ['days', today, 'items'], 'Make stock')) === '["3 batch"]', tag + 'prep: Add saves "3 batch"');
    // typed: the chip of the unit typed lights, plural or not
    await p.fill('#p-qty', '1 tub'); await L.settle(p, 150);
    ok((await lit(p, '#p-units')).join() === 'tubs', tag + 'prep: "1 tub" typed lights tubs');
    ok(!(await L.overflow(p)) && p.errors.length === 0, tag + 'prep: no sideways scroll, no page errors ' + p.errors.join(' | '));
    await p.context().close();

    // Orders
    p = await L.open(b, '#/orders', { who: 'sam', width: w, height: h, wait: 1600 });
    await L.oLog(p);
    const ounits = await p.$$eval('#o-units [data-p="ounit"]', l => l.map(e => e.textContent));
    ok(ounits.join(',') === 'L,kg,box,packs,bunches', tag + 'orders: the units as drawn under the amount (' + ounits.join(', ') + ')');
    if (process.env.AUDIT_DIR && w === 390) await p.screenshot({ path: path.join(process.env.AUDIT_DIR, 'units-orders-390.png') });
    await p.fill('#o-text', 'Coriander'); await p.fill('#o-qty', '6');
    await p.click('#o-units [data-v="bunches"]'); await L.settle(p, 150);
    ok(await p.inputValue('#o-qty') === '6 bunches' && (await lit(p, '#o-units')).join() === 'bunches', tag + 'orders: a unit chip puts its unit after the number, and lights');
    await p.press('#o-text', 'Enter'); await L.settle(p, 500);
    ok(JSON.stringify(await saved(p, ['orders', today, 'lines'], 'Coriander')) === '["6 bunches"]', tag + 'orders: Add saves "6 bunches"');
    ok(!(await L.overflow(p)) && p.errors.length === 0, tag + 'orders: no sideways scroll, no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
