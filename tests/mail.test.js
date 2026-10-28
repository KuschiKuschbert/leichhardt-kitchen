// Kitchen mail: a person writes to the head chef from the chef mark in the top bar (#/mail), and the head chef reads it
// as a tick-off list in the admin panel's Mail tab, with a count on the chef hat (and Admin panel in its menu) and a popup after 10 hours unread.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const pop = p => p.evaluate(() => { const e = document.querySelector('.mlp'); return e ? e.textContent : ''; });
const badge = p => txt(p, '.wtop-who .adm-n');
const mailReads = p => p.evaluate(() => (window.__fake.reads || []).filter(k => /\/mail$/.test(k)).length);
(async () => {
  const b = await L.start();

  // staff: the chef mark opens a menu with Kitchen mail
  let p = await L.open(b, '#/', { who: 'ann', wait: 1500 });
  await tap(p, '.wtop-who');
  await L.settle(p, 200);
  ok(!!(await p.$('.wm a[href="#/mail"]')), 'chef mark: the menu offers Kitchen mail');
  ok(await p.evaluate(() => document.querySelector('.wtop-who').getAttribute('aria-expanded')) === 'true', 'chef mark: aria-expanded is true while the menu is open');
  await p.keyboard.press('Escape');
  ok(!(await p.$('.wm')), 'chef mark: Escape closes the menu');
  await tap(p, '.wtop-who'); await L.settle(p, 100);
  await p.click('.wm a[href="#/mail"]');
  await L.settle(p, 800);
  ok(/Kitchen mail/.test(await txt(p, '#prep-root') || ''), 'mail page: opens from the menu');
  ok(!(await p.$('.wm')), 'mail page: the menu closed');
  // nothing picked: it asks first
  await p.fill('[data-k="ml-text"]', 'Fryer 1 keeps tripping');
  await tap(p, '[data-p="ml-send"]'); await L.settle(p, 200);
  ok(/Pick what it is about/.test(await txt(p, '#prep-root') || ''), 'mail page: sending without a category asks for one');
  // roster: the Humanforce hint, 2 weeks ahead
  await tap(p, '[data-p="ml-cat"][data-v="roster"]'); await L.settle(p, 200);
  const ros = await txt(p, '.ml-roster') || '';
  ok(/Humanforce/.test(ros) && /2 weeks/.test(ros), 'mail page: Roster request put in says Humanforce, 2 weeks ahead');
  ok(await p.$eval('[data-k="ml-text"]', e => e.value) === 'Fryer 1 keeps tripping', 'mail page: the message stays while picking');
  await tap(p, '[data-p="ml-cat"][data-v="equipment"]'); await L.settle(p, 100);
  ok(!(await p.$('.ml-roster')), 'mail page: the roster hint goes with another category');
  await tap(p, '[data-p="ml-pri"][data-v="today"]'); await L.settle(p, 100);
  await tap(p, '[data-p="ml-send"]'); await L.settle(p, 800);
  let s = await store(p);
  const mk = Object.keys(s).filter(k => /\/mail\/[^/]+$/.test(k))[0], m = mk && s[mk], id = mk && mk.split('/').pop();
  ok(!!m && m.from === 'ann' && m.by === 'ann' && m.cat === 'equipment' && m.pri === 'today' && m.text === 'Fryer 1 keeps tripping' && m.done === false && m.seen === false, 'send: the mail is saved with sender, category and priority');
  const st = s[fsKey(['mailstat', id])];
  ok(!!st && st.seen === false && st.done === false && st.by === 'ann', 'send: its status record is saved with it');
  ok(await p.$eval('[data-k="ml-text"]', e => e.value) === '', 'send: the box is empty again');
  ok(/What you sent/.test(await txt(p, '#prep-root') || '') && /Fryer 1 keeps tripping/.test(await txt(p, '.ml-sent') || ''), 'send: the message shows under What you sent');
  ok(/Sent/.test(await txt(p, '.ml-sent .ml-st') || ''), 'send: marked Sent');
  // the head chef reads it: next time the phone opens the page, it says Seen
  await p.evaluate(k => { const f = JSON.parse(localStorage.getItem('fake.fs')); f[k].seen = true; localStorage.setItem('fake.fs', JSON.stringify(f)); }, fsKey(['mailstat', id]));
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1500);
  ok(/Seen/.test(await txt(p, '.ml-sent .ml-st') || ''), 'status: Seen once the head chef has read it');
  ok(p.errors.length === 0, 'staff mail: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // another person on the same phone does not see Ann's sent mail
  p = await L.open(b, '#/mail', { who: 'bo', wait: 1200 });
  ok(!(await p.$('.ml-sent')), 'shared phone: Bo does not see what Ann sent (fresh phone)');
  await p.context().close();

  // the head chef: 3 open mails, the Mail tab last opened 11 hours ago, 14:00: popup and count
  const extra = Object.assign(L.mail(), { [fsKey(['config', 'admins'])]: { x: 1, mailOpened: L.NOW - 11 * 3600000 } });
  p = await L.open(b, '#/', { admin: true, who: '', extra, wait: 1800 });
  // the mail is read after the Google sign-in and the admin list, so wait for the count itself
  await L.waitFor(p, () => !!document.querySelector('.wtop-who .adm-n'), null, 5000).catch(() => {});
  ok(await badge(p) === '3', 'chef hat: shows 3 open mails (' + await badge(p) + ')');
  ok(/3 messages waiting/.test(await pop(p)), 'nudge: the popup says 3 messages waiting');
  ok(/1 is food safety or for today|2 are food safety or for today/.test(await pop(p)), 'nudge: it counts the urgent ones');
  await tap(p, '[data-ml="later"].mlp-later'); await L.settle(p, 200);
  ok(!(await pop(p)), 'nudge: Later closes it');
  const later = await p.evaluate(() => +localStorage.getItem('lk.mail.later'));
  ok(later - L_NOW() >= 9.9 * 3600000, 'nudge: Later holds it off for 10 hours');
  function L_NOW() { return L.NOW; }
  await p.context().close();

  // opened recently: no popup, the count still shows
  const recent = Object.assign(L.mail(), { [fsKey(['config', 'admins'])]: { x: 1, mailOpened: L.NOW - 3600000 } });
  p = await L.open(b, '#/', { admin: true, who: '', extra: recent, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.wtop-who .adm-n'), null, 5000).catch(() => {});   // the mail is in (see above)
  ok(!(await pop(p)), 'nudge: no popup when the Mail tab was opened an hour ago');
  ok(await badge(p) === '3', 'chef hat: the count shows anyway');
  await p.click('.wtop-who'); await L.settle(p, 150);
  ok(await txt(p, '.wm .wm-adm .adm-n') === '3' && !/open mail/.test(await txt(p, '.wm .wm-adm')) && await p.$eval('.wm .wm-adm', e => e.getAttribute('aria-label')) === 'Admin panel, 3 open kitchen mail', 'chef hat menu: Admin panel shows the 3 open mails once, as the orange count, and says so to a screen reader');
  await p.keyboard.press('Escape'); await L.settle(p, 100);
  await p.context().close();
  // new mail and the head chef on the device (nobody signed in, or their own PIN): Admin panel in the chef hat menu opens
  // Kitchen mail (23 Oct 2026). A sous chef on the same tablet still lands on the last page and marks nothing seen.
  const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
  const headCfg = { [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } };
  const atab = q => q.evaluate(() => (window.LK_PREP.state.atab || 'insights'));
  async function hatAdmin(q) {
    await L.waitFor(q, () => !!document.querySelector('.wtop-who .adm-n'), null, 5000).catch(() => {});
    await q.click('.wtop-who'); await L.settle(q, 150);
    await q.click('.wm .wm-adm');
    await L.waitFor(q, () => /#\/admin$/.test(location.hash) && !!document.querySelector('.a-nav'), null, 6000).catch(() => {});
    await L.settle(q, 400);
  }
  for (const who of ['', 'ann']) {
    const name = who ? 'head chef by PIN' : 'nobody signed in';
    p = await L.open(b, '#/', { admin: true, who, extra: Object.assign({}, recent, headCfg), wait: 1800 });
    await hatAdmin(p);
    await L.waitFor(p, () => !!document.querySelector('.ml-admin [data-lv="mail"]'), null, 6000).catch(() => {});
    ok(await atab(p) === 'mail' && !!(await p.$('.ml-admin')), name + ': Admin panel opens Kitchen mail while new mail waits (' + await atab(p) + ')');
    await L.settle(p, 600);
    s = await store(p);
    ok(['m1', 'm2', 'm3'].every(i => s[fsKey(['mail', i])].seen === true), name + ': the mail is seen once Kitchen mail is open');
    // read now: Admin panel goes back to the last page, with the count still on it
    await L.adminTab(p, 'insights');
    await p.evaluate(() => { location.hash = '#/'; }); await L.settle(p, 500);
    await hatAdmin(p);
    ok(await atab(p) === 'insights' && !(await p.$('.ml-admin')), name + ': with nothing new, Admin panel opens the last page (' + await atab(p) + ')');
    ok(p.errors.length === 0, name + ' Admin panel: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  p = await L.open(b, '#/mail', { who: 'sam', extra: Object.assign({}, recent, headCfg), wait: 1800 });
  ok(!await p.$('.ml-admin') && !await p.$('.a-groups'), 'sous chef cannot read admin mail while sous-mail access is off');
  await p.context().close();
  const headOn = { [fsKey(['config','main'])]: Object.assign({}, headCfg[fsKey(['config','main'])], { sousMail: true }) };
  p = await L.open(b, '#/mail', { who: 'sam', extra: Object.assign({}, recent, headOn), wait: 1800 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="mail"] .ml-row').length === 3);
  s=await store(p);
  ok(['m1','m2','m3'].every(i => s[fsKey(['mail',i])].seen === false), 'authorised sous chef reads kitchen mail without marking it seen as admin');
  await p.context().close();
  // 23:00: no popup outside 10:00 to 22:00
  p = await L.open(b, '#/', { admin: true, who: '', extra, clock: L.NOW + 9 * 3600000, wait: 1800 });
  ok(!(await pop(p)), 'nudge: no popup at 23:00');
  await p.context().close();
  // a staff phone never gets the count or the popup
  p = await L.open(b, '#/', { who: 'ann', extra, wait: 1500 });
  ok(!(await p.$('.adm-n')) && !(await pop(p)), 'staff phone: no mail count, no popup');
  await p.context().close();

  // the Mail tab: most urgent first, opening it marks all seen, a tick moves a line to Done
  p = await L.open(b, '#/', { admin: true, who: '', extra, wait: 1800 });
  // the popup and the Mail tab come after the mail is read: wait for each itself (a slow read missed a fixed pause)
  await L.waitFor(p, () => !!document.querySelector('[data-ml="open"]'), null, 8000).catch(() => {});
  await tap(p, '[data-ml="open"]');
  await L.waitFor(p, () => document.querySelectorAll('.ml-admin [data-lv="mail"] .ml-row').length === 3, null, 8000).catch(() => {});
  await L.settle(p, 1500);
  ok(/#\/admin$/.test(p.url()) && !!(await p.$('.ml-admin')), 'nudge: Open mail goes to the Mail tab');
  const order = await p.$$eval('.ml-admin [data-lv="mail"] .ml-row .ml-text', l => l.map(e => e.textContent));
  ok(order.length === 3 && /Cool room/.test(order[0]) && /Fryer 2/.test(order[1]) && /Pickle/.test(order[2]), 'mail tab: food safety first, then Today, then This week (' + order.join(' / ') + ')');
  ok(/Bo/.test(await txt(p, '.ml-admin .ml-row .ml-from') || ''), 'mail tab: shows who sent it');
  s = await store(p);
  ok(['m1', 'm2', 'm3'].every(i => s[fsKey(['mail', i])].seen === true && s[fsKey(['mailstat', i])].seen === true), 'mail tab: opening it marks every mail seen, and its status');
  ok(s[fsKey(['config', 'admins'])].mailOpened >= L.NOW, 'mail tab: the opened time is saved with the head chef\'s account');
  await tap(p, '[data-p="ml-tick"][data-id="m2"]'); await L.settle(p, 700);
  s = await store(p);
  ok(s[fsKey(['mail', 'm2'])].done === true && s[fsKey(['mail', 'm2'])].doneAt >= L.NOW && s[fsKey(['mailstat', 'm2'])].done === true, 'tick: the mail and its status are done');
  ok(s[fsKey(['mail', 'm2'])].from === 'bo', 'tick: the sender is kept');
  ok((await p.$$('.ml-admin [data-lv="mail"] .ml-row')).length === 2, 'tick: the line leaves the open list');
  ok(/Done in the last 30 days \(1\)/.test(await txt(p, '.ml-donebox summary') || ''), 'tick: it shows under Done');
  ok(await badge(p) === '2', 'tick: the count on the key goes down to 2');
  // change how soon it matters
  await p.selectOption('[data-k="ml-pri:m3"]', 'today'); await L.settle(p, 500);
  s = await store(p);
  ok(s[fsKey(['mail', 'm3'])].pri === 'today', 'priority: the head chef changes This week to Today');
  // untick
  await p.click('.ml-donebox summary'); await L.settle(p, 200);
  await tap(p, '[data-lv="maildone"] [data-p="ml-tick"][data-id="m2"]'); await L.settle(p, 700);
  s = await store(p);
  ok(s[fsKey(['mail', 'm2'])].done === false && s[fsKey(['mailstat', 'm2'])].done === false, 'untick: back to open');
  ok(await badge(p) === '3', 'untick: the count is 3 again');
  // the switch for sous chefs, off by default (23 Oct 2026): the head chef turns it on in the Mail tab
  ok(!!(await p.$('[data-k="ml-sous"]')) && !(await p.$eval('[data-k="ml-sous"]', e => e.checked)), 'sous chef switch: on the Mail tab, off by default');
  await p.click('[data-k="ml-sous"]'); await L.settle(p, 500);
  s = await store(p);
  ok(s[fsKey(['config', 'main'])].sousMail === true, 'sous chef switch: ticking it saves sousMail on config/main');
  ok(p.errors.length === 0, 'admin mail: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the done mail could not be read (no signal, 28 Oct 2026): no "(0)" and no "Nothing ticked off", no read on every
  // draw, and it is read again once the phone is back online
  const doneX = Object.assign(L.mail(), { [fsKey(['mail', 'm4'])]: { from: 'bo', by: 'bo', cat: 'idea', pri: 'any', text: 'Label the dry store shelves', at: L.NOW - 3 * 86400000, done: true, doneAt: L.NOW - 86400000, seen: true },
    [fsKey(['mailstat', 'm4'])]: { seen: true, done: true, by: 'bo' } });
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: doneX, width: 1280, height: 900, wait: 2000 });
  await L.waitFor(p, () => (window.__fake.reads || []).some(k => /\/mail$/.test(k)), null, 8000).catch(() => {});
  await L.settle(p, 800);
  await p.evaluate(() => { window.__fake.failReads = /\/mail$/; });
  const dn0 = await mailReads(p);
  await L.adminTab(p, 'mail'); await L.settle(p, 800);
  for (let i = 0; i < 3; i++) { await L.adminTab(p, 'insights'); await L.adminTab(p, 'mail'); }
  const dn1 = await mailReads(p), box = await p.evaluate(() => { const d = document.querySelector('.ml-donebox'); return d ? d.textContent : ''; });
  ok(!/\(0\)/.test(await txt(p, '.ml-donebox summary') || '') && !/Nothing ticked off/.test(box) && /Could not load the done mail\. Check the signal\./.test(box), 'done mail unreadable: it says so, with no (0) and no "Nothing ticked off" (' + box.slice(0, 120) + ')');
  ok(dn1 - dn0 <= 1, 'done mail unreadable: no read on every draw (' + (dn1 - dn0) + ' reads)');
  for (const w of [390, 768, 1280]) { await p.setViewportSize({ width: w, height: 900 }); await L.settle(p, 250); const o = await L.overflow(p); ok(!o, 'done mail unreadable: no sideways scroll at ' + w + ' px' + (o ? ' (' + o + ')' : '')); }
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  ok(await L.waitFor(p, () => /Done in the last 30 days \(1\)/.test((document.querySelector('.ml-donebox summary') || {}).textContent || ''), null, 6000).then(() => true, () => false), 'done mail, signal back: read again by itself, Done (1)');
  ok(p.errors.length === 0, 'done mail: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // the same, read again after its wait with no online event (wifi that stayed up): an online event later, with
  // nothing failed, reads nothing (review of 28 Oct 2026: the retry stayed set and read the done mail again)
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: doneX, width: 1280, height: 900, wait: 2000 });
  await L.waitFor(p, () => (window.__fake.reads || []).some(k => /\/mail$/.test(k)), null, 8000).catch(() => {});
  await L.settle(p, 800);
  await p.evaluate(() => { window.__fake.failReads = /\/mail$/; });
  await L.adminTab(p, 'mail'); await L.settle(p, 800);
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.clock.fastForward('06:00');
  await L.adminTab(p, 'insights'); await L.adminTab(p, 'mail');
  ok(await L.waitFor(p, () => /Done in the last 30 days \(1\)/.test((document.querySelector('.ml-donebox summary') || {}).textContent || ''), null, 6000).then(() => true, () => false), 'done mail, after the wait: read again at the next draw');
  const dn2 = await mailReads(p);
  await L.adminTab(p, 'insights');
  await p.evaluate(() => { window.dispatchEvent(new Event('offline')); window.dispatchEvent(new Event('online')); });
  await L.settle(p, 2500);
  ok(await mailReads(p) === dn2, 'done mail in, then an online event: nothing read again (' + dn2 + ' then ' + await mailReads(p) + ')');
  ok(p.errors.length === 0, 'done mail after the wait: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef's own phone: no mail list while it is off
  const cfgMain = (await (async () => { const q = await L.open(b, '#/', { who: 'sam', wait: 800 }); await L.waitFor(q, () => !!window.__fake, null, 5000); const d = (await store(q))[fsKey(['config', 'main'])]; await q.context().close(); return d; })());
  p = await L.open(b, '#/mail', { who: 'sam', extra: L.mail(), wait: 1500 });
  ok(!/Mail to Chef/.test(await txt(p, '#prep-root') || '') && /Only Chef reads it/.test(await txt(p, '#prep-root') || ''), 'sous chef, switch off: no mail list, only Chef reads it');
  ok(!(await mailReads(p)), 'sous chef, switch off: the phone never reads the mail');
  await p.context().close();
  // switched on: Sam reads the open mail on #/mail and ticks one off; seen stays for the head chef
  const on = Object.assign(L.mail(), { [fsKey(['config', 'main'])]: Object.assign({}, cfgMain, { sousMail: true }) });
  p = await L.open(b, '#/mail', { who: 'sam', extra: on, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="mail"] .ml-row').length === 3, null, 6000).catch(() => {});
  ok(/Mail to Chef/.test(await txt(p, '#prep-root') || '') && (await p.$$('[data-lv="mail"] .ml-row')).length === 3, 'sous chef, switch on: the 3 open mails show on Kitchen mail');
  ok(/Only Chef and the sous chefs read it/.test(await txt(p, '#prep-root') || ''), 'sous chef, switch on: the page says the sous chefs read it too');
  await tap(p, '[data-p="ml-tick"][data-id="m2"]'); await L.settle(p, 700);
  s = await store(p);
  ok(s[fsKey(['mail', 'm2'])].done === true && s[fsKey(['mail', 'm2'])].by === 'sam' && s[fsKey(['mailstat', 'm2'])].done === true, 'sous chef: a tick saves the mail and its status as done');
  ok(s[fsKey(['mail', 'm2'])].seen === false && s[fsKey(['mailstat', 'm2'])].seen === false && ['m1', 'm3'].every(i => s[fsKey(['mail', i])].seen === false), 'sous chef: nothing is marked seen');
  ok(!(await p.$('[data-k="ml-sous"]')), 'sous chef: no switch on their phone');
  ok(p.errors.length === 0, 'sous chef mail: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // staff never get the list, switch on or off
  p = await L.open(b, '#/mail', { who: 'bo', extra: on, wait: 1500 });
  ok(!/Mail to Chef/.test(await txt(p, '#prep-root') || '') && !(await p.$('[data-lv="mail"]')), 'staff, switch on: no mail list');
  ok(/Only Chef and the sous chefs read it/.test(await txt(p, '#prep-root') || ''), 'staff, switch on: the page says the sous chefs read it too');
  ok(!(await mailReads(p)), 'staff, switch on: the phone never reads the mail');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
