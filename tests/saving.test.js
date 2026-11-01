// No signal and Not sent yet, typed text kept when a save fails, and the self-update waiting for unsaved work (pull request 154).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { wait: 1500 });

  // still sending: writes held like with no signal
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.fill('#p-text', 'Slice tomatoes');
  await p.press('#p-text', 'Enter');
  await L.settle(p, 500);
  ok(await p.$('.p-sync') === null, 'sync: no strip in the first 3 seconds');
  await L.settle(p, 3200);
  ok(/Not sent yet/.test(await txt(p, '.p-sync') || ''), 'sync: "Not sent yet" strip after 3 seconds');
  ok(await p.evaluate(() => window.LK_PREP.unsaved()), 'sync: unsaved() is true while writes wait');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.settle(p, 2500);
  ok(await p.$('.p-sync') === null, 'sync: strip goes when the writes are sent');
  ok(!(await p.evaluate(() => window.LK_PREP.unsaved())), 'sync: unsaved() is false again');

  // offline flag
  await p.context().setOffline(true);
  await L.settle(p, 300);
  ok(/No signal/.test(await txt(p, '.p-sync') || ''), 'sync: "No signal" strip when the phone goes offline');
  await p.context().setOffline(false);
  await L.settle(p, 300);
  ok(await p.$('.p-sync') === null, 'sync: strip goes when the signal is back');

  // half-written line blocks the self-update even after leaving the box
  await p.fill('#p-text', 'Half written');
  await p.click('.nb-title');
  ok(await p.evaluate(() => window.LK_PREP.unsaved()), 'update guard: a half-written line counts as unsaved');
  await L.clear(p, '#p-text');
  await p.click('.nb-title');

  // connection error: text comes back, the message stays with OK
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await p.fill('#p-text', 'Crumb schnitzels');
  await p.fill('#p-qty', '40');
  await p.press('#p-text', 'Enter');
  await L.settle(p, 400);
  ok(/Not saved\. Check the connection/.test(await txt(p, '.p-toast') || ''), 'failed: connection error message');
  ok(await p.$('.p-toast .p-toast-btn') !== null, 'failed: message has an OK button');
  ok(await p.inputValue('#p-text') === 'Crumb schnitzels' && await p.inputValue('#p-qty') === '40', 'failed: the line and amount are back in the boxes');
  await L.settle(p, 9500);
  ok(await p.$('.p-toast') !== null, 'failed: message still up after 9.5 seconds');

  // refused: PIN was reset, so sign in again and the text is still there
  await p.evaluate(() => { window.__fake.mode = 'deny'; });
  await p.press('#p-text', 'Enter');
  await L.settle(p, 500);
  ok(/sign in again with your PIN/.test(await txt(p, '.p-toast') || ''), 'refused: asks to sign in again');
  ok(await p.$('#pf1') !== null, 'refused: own PIN screen shows');
  await p.evaluate(() => { window.__fake.mode = 'ok'; });
  await p.type('#pf1', '1111');
  await L.settle(p, 800);
  ok(await p.$('#p-text') !== null && await p.inputValue('#p-text') === 'Crumb schnitzels', 'refused: after the PIN, the line is still in the box');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // orders: text back on failure
  p = await L.open(b, '#/orders', { wait: 1500 });
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await p.fill('#o-text', 'Cream');
  await p.fill('#o-qty', '4 L');
  await p.press('#o-text', 'Enter');
  await L.settle(p, 400);
  ok(await p.inputValue('#o-text') === 'Cream' && await p.inputValue('#o-qty') === '4 L', 'orders: failed line goes back in the box');
  await p.context().close();

  // waste: form back on failure
  p = await L.open(b, '#/waste', { wait: 1500 });
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await p.fill('#w-text', 'Rice');
  await p.fill('#w-amt', '1.5');
  await p.evaluate(() => { const b = document.querySelector('.w-rchips [data-v="excess"]') || document.querySelector('[data-p="wreason"][data-v="excess"]'); b.click(); });
  await L.settle(p, 100);
  await p.click('.w-add .nb-addbtn');
  await L.settle(p, 400);
  ok(await p.inputValue('#w-text') === 'Rice' && await p.inputValue('#w-amt') === '1.5', 'waste: failed entry goes back in the form');
  await p.context().close();

  // admin: the Add several names box keeps its text through a redraw
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'people');
  await L.settle(p, 200);
  await p.fill('#a-bulk', 'Kim\nLee');
  await p.click('[data-p="a-add-person"]');
  await L.settle(p, 200);
  ok(await p.inputValue('#a-bulk') === 'Kim\nLee', 'admin: Add several names keeps its text through a redraw');
  ok(await p.evaluate(() => window.LK_PREP.unsaved()), 'admin: unsaved staff changes block the self-update');
  await p.click('[data-p="a-bulk-add"]');
  await L.settle(p, 200);
  ok(await p.inputValue('#a-bulk') === '' && (await p.$$('.a-name')).length >= 6, 'admin: Add these names adds them and clears the box');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
