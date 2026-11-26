// The admin panel and the chef panel on the head chef's computer and a laptop (head chef, 27 Nov 2026, step 4 of the
// device coverage plan, docs/device-coverage/step4/findings.md, Chosen). One section per fix; each check fails on the
// code before the fix. Synthetic people and data on the click-test stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const K = (...p) => ['kitchens', L.PIN, ...p].join('/');
const store = p => p.evaluate(() => window.__fake.dump());

(async () => {
  const b = await L.start();

  // Chef to-do: Ctrl+Enter (Cmd+Enter on a Mac) adds the job; Enter alone keeps a new line
  {
    const p = await L.open(b, '#/todo', { who: 'sam', width: 1280, height: 800, touch: false, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('[data-k="todo-text"]'), null, 8000).catch(() => {});
    const jobs = async () => Object.values(await store(p)).filter(x => x && x.st === 'open' && typeof x.text === 'string').map(x => x.text);
    await p.click('[data-k="todo-text"]'); await p.keyboard.type('Ring the knife man'); await p.keyboard.press('Enter'); await L.settle(p, 200);
    const nl = await p.$eval('[data-k="todo-text"]', e => e.value);
    ok(/Ring the knife man\n/.test(nl) && !(await jobs()).includes('Ring the knife man'), 'Chef to-do: Enter alone starts a new line and adds nothing (' + JSON.stringify(nl) + ')');
    await p.$eval('[data-k="todo-text"]', e => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }); await L.settle(p, 150);
    await p.click('[data-k="todo-text"]'); await p.keyboard.type('Ring the knife man'); await p.keyboard.press('Control+Enter');
    await L.waitFor(p, () => Object.values(window.__fake.dump()).some(x => x && x.text === 'Ring the knife man'), null, 5000).catch(() => {});
    ok((await jobs()).includes('Ring the knife man'), 'Chef to-do: Ctrl+Enter adds the job');
    await L.settle(p, 400);
    await p.click('[data-k="todo-text"]'); await p.keyboard.type('Sharpen the slicer'); await p.keyboard.press('Meta+Enter');
    await L.waitFor(p, () => Object.values(window.__fake.dump()).some(x => x && x.text === 'Sharpen the slicer'), null, 5000).catch(() => {});
    ok((await jobs()).includes('Sharpen the slicer'), 'Chef to-do: Cmd+Enter adds the job too');
    ok(!p.errors.length, 'Chef to-do: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // the chef Dashboard: the one orange button is Set today's team while no team is saved, Chef to-do once one is
  {
    const today = L.ymd(new Date(L.NOW)), dark = p => p.$$eval('.ad-main .btn.dark', e => e.filter(x => x.getClientRects().length).map(x => x.textContent.trim()));
    let p = await L.open(b, '#/chef', { who: 'sam', width: 1920, height: 1008, touch: false, wait: 1800 });
    await L.waitFor(p, () => /Set the team/.test(document.body.textContent), null, 8000).catch(() => {});
    let d = await dark(p);
    ok(d.length === 1 && d[0] === "Set today's team", 'chef Dashboard, no team saved: the one orange button is Set today\'s team (' + JSON.stringify(d) + ')');
    await p.click('.ad-main .btn.dark'); await L.settle(p, 500);
    ok(await p.evaluate(() => (window.LK_PREP && window.LK_PREP.state || {}).ctab) === 'plan', 'chef Dashboard: it opens Today\'s team');
    ok(!p.errors.length, 'chef Dashboard: no page errors ' + p.errors.join(' | '));
    await p.context().close();
    p = await L.open(b, '#/chef', { who: 'sam', width: 1920, height: 1008, touch: false, wait: 1800, extra: { [K('team', today)]: { day: today, on: [{ id: 'bo', sh: 'lunch', sec: '' }], at: L.NOW - 3600000, by: 'sam' } } });
    await L.waitFor(p, () => /Plan saved/.test(document.body.textContent), null, 8000).catch(() => {});
    d = await dark(p);
    ok(d.length === 1 && d[0] === 'Chef to-do', 'chef Dashboard, a team saved: Chef to-do is the orange button, as before (' + JSON.stringify(d) + ')');
    await p.context().close();
  }

  // one place, one name, one date style: the chef Dashboard is called Dashboard, its date and Prep standards' read time
  // read as the rest of both panels do ("Fri, 27 Nov", "Read 14:00")
  {
    let p = await L.open(b, '#/chef', { who: 'sam', width: 1280, height: 800, touch: false, wait: 1800 });
    await L.waitFor(p, () => !!document.querySelector('.c-tiles'), null, 8000).catch(() => {});
    const h = await p.evaluate(() => ({ title: document.querySelector('#rtitle').textContent, date: (document.querySelector('.c-tiles') || {}).previousElementSibling.textContent }));
    ok(h.title === 'Dashboard' && /^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2}\. From today/.test(h.date), 'chef Dashboard: named Dashboard, the day as "Fri, 27 Nov" (' + JSON.stringify(h) + ')');
    await p.context().close();
    const secs = { [K('config', 'main')]: Object.assign({}, L.seed()[K('config', 'main')], { kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }] }) };
    p = await L.open(b, '#/admin', { admin: true, adminPage: 'prep-standards', who: '', width: 1280, height: 800, touch: false, extra: secs, wait: 1800 });
    await L.waitFor(p, () => !!document.querySelector('.ps-read'), null, 8000).catch(() => {});
    const read = await p.evaluate(() => (document.querySelector('.ps-read') || {}).textContent || '');
    ok(/^Read \d\d:\d\d\. /.test(read), 'Prep standards: read today says "Read 14:00." (' + read + ')');
    await p.context().close();
  }

  // the Inbox's kitchen mail row is red only while a mail is new, or one marked Today or Food safety is open
  {
    const row = p => p.evaluate(() => { const r = [...document.querySelectorAll('.dsh-need')].find(e => /kitchen mails? open/.test(e.textContent)); return r ? { cls: r.className, tag: (r.querySelector('.dsh-tag') || {}).className, text: r.textContent.replace(/\s+/g, ' ').trim() } : null; });
    const open = extra => L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width: 1280, height: 800, touch: false, wait: 1800, extra: Object.assign({ [K('config', 'admins')]: { x: 1, mailOpened: L.NOW } }, extra) });
    let p = await open(L.mail());
    await L.waitFor(p, () => /kitchen mails? open/.test(document.body.textContent), null, 8000).catch(() => {}); await L.settle(p, 400);
    let r = await row(p);
    ok(!!r && /dsh-need-due/.test(r.cls) && /dsh-tag-bad/.test(r.tag), 'Inbox: open mail with one marked Today and one Food safety stays red (' + JSON.stringify(r) + ')');
    await p.context().close();
    const idea = { [K('mail', 'm3')]: { from: 'sam', by: 'sam', cat: 'idea', pri: 'week', text: 'Pickle the leftover red onion', at: L.NOW - 5 * 3600000, done: false, seen: true },
      [K('mailstat', 'm3')]: { seen: true, done: false, by: 'sam' } };
    p = await open(idea);
    await L.waitFor(p, () => /kitchen mail open/.test(document.body.textContent), null, 8000).catch(() => {}); await L.settle(p, 400);
    r = await row(p);
    ok(!!r && /dsh-need-wait/.test(r.cls) && !/dsh-tag-bad/.test(r.tag) && /All read, not done yet\./.test(r.text), 'Inbox: one read idea for this week is the quiet waiting row, not red (' + JSON.stringify(r) + ')');
    ok(!p.errors.length, 'Inbox: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // one Inbox count: on a laptop the rail's Inbox shows its count and Today none; a phone keeps Today (3)
  for (const [w, h, touch] of [[1280, 800, false], [390, 844, true]]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width: w, height: h, touch, wait: 1800, extra: Object.assign({ [K('config', 'admins')]: { x: 1, mailOpened: L.NOW } }, L.mail()) });
    await L.waitFor(p, () => /kitchen mails? open/.test(document.body.textContent), null, 8000).catch(() => {}); await L.settle(p, 400);
    const c = await p.evaluate(() => ({ today: (document.querySelector('[data-p="a-group"][data-g="today"]') || {}).innerText || '', inbox: ((document.querySelector('.a-quick[data-v="inbox"] em') || {}).innerText || '') }));
    ok(w === 1280 ? c.today.trim() === 'Today' && /^\d+$/.test(c.inbox) : /^Today \(3\)$/.test(c.today.trim()), w + ': one count for the Inbox (' + JSON.stringify(c) + ')');
    await p.context().close();
  }

  // Prep standards: the Section picker, the read time and Add standard share one row on the laptop and the computer
  for (const [w, h] of [[1920, 1008], [1280, 800]]) {
    const secs = { [K('config', 'main')]: Object.assign({}, L.seed()[K('config', 'main')], { kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }] }) };
    const p = await L.open(b, '#/admin', { admin: true, adminPage: 'prep-standards', who: '', width: w, height: h, touch: false, extra: secs, wait: 1800 });
    await L.waitFor(p, () => !!document.querySelector('.ps-read'), null, 8000).catch(() => {});
    const r = await p.evaluate(() => { const t = e => e && e.getBoundingClientRect(), s = t(document.querySelector('.ps-manager .ps-bar > .ps-section')), a = t(document.querySelector('[data-ps="new"]'));
      return s && a ? { selTop: Math.round(s.top), addTop: Math.round(a.top), addBottom: Math.round(a.bottom), vh: innerHeight } : null; });
    ok(!!r && Math.abs(r.addTop - r.selTop) < 30 && r.addBottom <= r.vh, w + ': Prep standards: Section and Add standard on one row, Add standard on the first screen (' + JSON.stringify(r) + ')');
    ok(!p.errors.length && !(await L.overflow(p)), w + ': Prep standards: no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
