// Kitchen mail: a person writes to the head chef from the chef mark in the top bar (#/mail), and the head chef reads it
// as a tick-off list in the admin panel's Mail tab, with a count on the Admin key and a popup after 10 hours unread.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const pop = p => p.evaluate(() => { const e = document.querySelector('.mlp'); return e ? e.textContent : ''; });
const badge = p => txt(p, '.adm .adm-n');
(async () => {
  const b = await L.start();

  // staff: the chef mark opens a menu with Kitchen mail
  let p = await L.open(b, '#/', { who: 'ann', wait: 1500 });
  await tap(p, '.wtop-who');
  await p.waitForTimeout(200);
  ok(!!(await p.$('.wm a[href="#/mail"]')), 'chef mark: the menu offers Kitchen mail');
  ok(await p.evaluate(() => document.querySelector('.wtop-who').getAttribute('aria-expanded')) === 'true', 'chef mark: aria-expanded is true while the menu is open');
  await p.keyboard.press('Escape');
  ok(!(await p.$('.wm')), 'chef mark: Escape closes the menu');
  await tap(p, '.wtop-who'); await p.waitForTimeout(100);
  await p.click('.wm a[href="#/mail"]');
  await p.waitForTimeout(800);
  ok(/Kitchen mail/.test(await txt(p, '#prep-root') || ''), 'mail page: opens from the menu');
  ok(!(await p.$('.wm')), 'mail page: the menu closed');
  // nothing picked: it asks first
  await p.fill('[data-k="ml-text"]', 'Fryer 1 keeps tripping');
  await tap(p, '[data-p="ml-send"]'); await p.waitForTimeout(200);
  ok(/Pick what it is about/.test(await txt(p, '#prep-root') || ''), 'mail page: sending without a category asks for one');
  // roster: the Humanforce hint, 2 weeks ahead
  await tap(p, '[data-p="ml-cat"][data-v="roster"]'); await p.waitForTimeout(200);
  const ros = await txt(p, '.ml-roster') || '';
  ok(/Humanforce/.test(ros) && /2 weeks/.test(ros), 'mail page: Roster request put in says Humanforce, 2 weeks ahead');
  ok(await p.$eval('[data-k="ml-text"]', e => e.value) === 'Fryer 1 keeps tripping', 'mail page: the message stays while picking');
  await tap(p, '[data-p="ml-cat"][data-v="equipment"]'); await p.waitForTimeout(100);
  ok(!(await p.$('.ml-roster')), 'mail page: the roster hint goes with another category');
  await tap(p, '[data-p="ml-pri"][data-v="today"]'); await p.waitForTimeout(100);
  await tap(p, '[data-p="ml-send"]'); await p.waitForTimeout(800);
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
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok(/Seen/.test(await txt(p, '.ml-sent .ml-st') || ''), 'status: Seen once the head chef has read it');
  ok(p.errors.length === 0, 'staff mail: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // another person on the same phone does not see Ann's sent mail
  p = await L.open(b, '#/mail', { who: 'bo', wait: 1200 });
  ok(!(await p.$('.ml-sent')), 'shared phone: Bo does not see what Ann sent (fresh phone)');
  await p.context().close();

  // the head chef: 3 open mails, the Mail tab last opened 11 hours ago, 14:00: popup and count
  const extra = Object.assign(L.mail(), { [fsKey(['config', 'admins'])]: { x: 1, mailOpened: L.NOW - 11 * 3600000 } });
  p = await L.open(b, '#/', { admin: true, extra, wait: 1800 });
  ok(await badge(p) === '3', 'admin key: shows 3 open mails (' + await badge(p) + ')');
  ok(/3 messages waiting/.test(await pop(p)), 'nudge: the popup says 3 messages waiting');
  ok(/1 is food safety or for today|2 are food safety or for today/.test(await pop(p)), 'nudge: it counts the urgent ones');
  await tap(p, '[data-ml="later"].mlp-later'); await p.waitForTimeout(200);
  ok(!(await pop(p)), 'nudge: Later closes it');
  const later = await p.evaluate(() => +localStorage.getItem('lk.mail.later'));
  ok(later - L_NOW() >= 9.9 * 3600000, 'nudge: Later holds it off for 10 hours');
  function L_NOW() { return L.NOW; }
  await p.context().close();

  // opened recently: no popup, the count still shows
  const recent = Object.assign(L.mail(), { [fsKey(['config', 'admins'])]: { x: 1, mailOpened: L.NOW - 3600000 } });
  p = await L.open(b, '#/', { admin: true, extra: recent, wait: 1800 });
  ok(!(await pop(p)), 'nudge: no popup when the Mail tab was opened an hour ago');
  ok(await badge(p) === '3', 'admin key: the count shows anyway');
  await p.context().close();
  // 23:00: no popup outside 10:00 to 22:00
  p = await L.open(b, '#/', { admin: true, extra, clock: L.NOW + 9 * 3600000, wait: 1800 });
  ok(!(await pop(p)), 'nudge: no popup at 23:00');
  await p.context().close();
  // a staff phone never gets the count or the popup
  p = await L.open(b, '#/', { who: 'ann', extra, wait: 1500 });
  ok(!(await p.$('.adm-n')) && !(await pop(p)), 'staff phone: no mail count, no popup');
  await p.context().close();

  // the Mail tab: most urgent first, opening it marks all seen, a tick moves a line to Done
  p = await L.open(b, '#/', { admin: true, extra, wait: 1800 });
  await tap(p, '[data-ml="open"]'); await p.waitForTimeout(1500);
  ok(/#\/admin$/.test(p.url()) && !!(await p.$('.ml-admin')), 'nudge: Open mail goes to the Mail tab');
  const order = await p.$$eval('.ml-admin [data-lv="mail"] .ml-row .ml-text', l => l.map(e => e.textContent));
  ok(order.length === 3 && /Cool room/.test(order[0]) && /Fryer 2/.test(order[1]) && /Pickle/.test(order[2]), 'mail tab: food safety first, then Today, then This week (' + order.join(' / ') + ')');
  ok(/Bo/.test(await txt(p, '.ml-admin .ml-row .ml-from') || ''), 'mail tab: shows who sent it');
  s = await store(p);
  ok(['m1', 'm2', 'm3'].every(i => s[fsKey(['mail', i])].seen === true && s[fsKey(['mailstat', i])].seen === true), 'mail tab: opening it marks every mail seen, and its status');
  ok(s[fsKey(['config', 'admins'])].mailOpened >= L.NOW, 'mail tab: the opened time is saved with the head chef\'s account');
  await tap(p, '[data-p="ml-tick"][data-id="m2"]'); await p.waitForTimeout(700);
  s = await store(p);
  ok(s[fsKey(['mail', 'm2'])].done === true && s[fsKey(['mail', 'm2'])].doneAt >= L.NOW && s[fsKey(['mailstat', 'm2'])].done === true, 'tick: the mail and its status are done');
  ok(s[fsKey(['mail', 'm2'])].from === 'bo', 'tick: the sender is kept');
  ok((await p.$$('.ml-admin [data-lv="mail"] .ml-row')).length === 2, 'tick: the line leaves the open list');
  ok(/Done in the last 30 days \(1\)/.test(await txt(p, '.ml-donebox summary') || ''), 'tick: it shows under Done');
  ok(await badge(p) === '2', 'tick: the count on the key goes down to 2');
  // change how soon it matters
  await p.selectOption('[data-k="ml-pri:m3"]', 'today'); await p.waitForTimeout(500);
  s = await store(p);
  ok(s[fsKey(['mail', 'm3'])].pri === 'today', 'priority: the head chef changes This week to Today');
  // untick
  await p.click('.ml-donebox summary'); await p.waitForTimeout(200);
  await tap(p, '[data-lv="maildone"] [data-p="ml-tick"][data-id="m2"]'); await p.waitForTimeout(700);
  s = await store(p);
  ok(s[fsKey(['mail', 'm2'])].done === false && s[fsKey(['mailstat', 'm2'])].done === false, 'untick: back to open');
  ok(await badge(p) === '3', 'untick: the count is 3 again');
  ok(p.errors.length === 0, 'admin mail: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
