// Transfers between venues (head chef decision, 23 Oct 2026): stock shared with the other venues, both ways. Like the
// wastage log: everyone signed in logs and sees today's transfers; the venues and people come as chips from today's lines
// and the nightly summary, a chip for an item fills its unit and usual amount, and the next item of the same pick-up keeps
// the venue and the person. Past days, the totals per venue and item, Remove and Put back are in the admin panel
// (the head chef's Google account, the only one the rules let read past days).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW)), yest = L.ymd(new Date(L.NOW - 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
// listeners do not count here: only getDoc and getDocs of a transfer list
const lineReads = page => page.evaluate(() => window.__fake.reads.filter(k => /\/transfers\/[^/]+\/lines$/.test(k)));
const todayN = p => p.evaluate(d => Object.keys(window.__fake.dump()).filter(k => k.indexOf('/transfers/' + d + '/lines/') > 0).length, today);
const saved = (p, text) => p.evaluate(a => { const s = window.__fake.dump(); return Object.keys(s).filter(k => k.indexOf('/transfers/' + a.d + '/lines/') > 0 && s[k].text === a.t).map(k => s[k]); }, { d: today, t: text });
const extra = {};
extra[fsKey(['transfers', today, 'lines', 't1'])] = { dir: 'out', venue: 'Riviera', person: 'Jess', text: 'Brioche buns', amount: 2, unit: 'packs', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1800000, deleted: false };
extra[fsKey(['transfers', yest, 'lines', 'y1'])] = { dir: 'in', venue: 'Riviera', person: 'Kim', text: 'Milk', amount: 6, unit: 'L', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000 - 7200000, deleted: false };
extra[fsKey(['summary', 'transfers'])] = { day: today, from: yest, to: yest, at: L.NOW - 3600000,
  venues: [{ v: 'Riviera', n: 5, out: 4, in: 1, people: ['Jess', 'Tom'] }, { v: 'Grand Hotel', n: 2, out: 0, in: 2, people: ['Lee'] }, { v: 'Constructor', n: 1, out: 1, in: 0, people: ['__proto__'] }],
  items: [{ t: 'Butter', n: 3, unit: 'kg', amt: 2, dir: 'out', venue: 'Riviera' }, { t: 'Lemons', n: 2, unit: 'pieces', amt: 12, dir: 'in', venue: 'Grand Hotel' }] };
(async () => {
  const b = await L.start();

  // staff and a sous chef: today only, chips from the summary, a pick-up logged item by item, the checks
  for (const who of ['ann', 'sam']) {
    const p = await L.open(b, '#/transfers', { extra, who, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('.tr-row'));
    const body = await txt(p, '.o-page') || '';
    ok(/Transfers/.test(await txt(p, '#rtitle') || '') && /Brioche buns/.test(body) && !/Milk/.test(body), who + ': the page shows today\'s Brioche buns and not yesterday\'s Milk');
    ok(/To Riviera, Jess came for it/.test(body) && /1 out/.test(await txt(p, '.nb-date') || ''), who + ': a row says where it went and who came for it, the header counts it');
    ok(!(await p.$('[data-p="tr-del"]')) && !(await p.$('.w-past')), who + ': no Remove and no admin link');
    ok(await p.evaluate(() => document.querySelector('#tr-venue').getBoundingClientRect().top < document.querySelector('.tr-row').getBoundingClientRect().top), who + ': the form sits above the day\'s transfers');

    // nothing typed: the checks say what is missing, in order, and nothing is saved
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 250);
    ok(/Write which venue took it/.test(await txt(p, '.p-toast') || ''), who + ': no venue asks for one');
    await L.waitFor(p, () => !!document.querySelector('[data-p="tr-vpick"]'));
    const vchips = await p.$$eval('[data-p="tr-vpick"]', l => l.map(e => e.textContent));
    ok(vchips[0] === 'Riviera' && vchips.indexOf('Grand Hotel') > 0 && vchips.indexOf('Constructor') > 0, who + ': venue chips from today and the summary, a venue called Constructor too (' + vchips.join(', ') + ')');
    await L.choose(p, '[data-p="tr-vpick"][data-v="Riviera"]'); await L.settle(p, 200);
    ok(await p.inputValue('#tr-venue') === 'Riviera' && await p.evaluate(() => document.activeElement && document.activeElement.id) === 'tr-person', who + ': the venue chip fills the box and moves on to who came');
    const pchips = await p.$$eval('[data-p="tr-ppick"]', l => l.map(e => e.textContent));
    ok(pchips.join(',') === 'Jess,Tom', who + ': who came before for Riviera (' + pchips.join(', ') + ')');
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 250);
    ok(/Write who came for it/.test(await txt(p, '.p-toast') || ''), who + ': out needs who came for it');
    await L.choose(p, '[data-p="tr-ppick"][data-v="Tom"]'); await L.settle(p, 200);
    ok(await p.inputValue('#tr-person') === 'Tom', who + ': the person chip fills the box');

    // the often taken chip fills the item, the unit and the usual amount
    ok(/Often taken/.test(await txt(p, '#tr-often') || ''), who + ': Often taken shows what Riviera usually takes');
    await p.click('[data-p="tr-often"][data-i="0"]'); await L.settle(p, 200);
    ok(await p.inputValue('#tr-text') === 'Butter' && await p.inputValue('#tr-amt') === '2' && await p.getAttribute('[data-p="tr-unit"][data-v="kg"]', 'aria-checked') === 'true', who + ': Butter, 2 and kg are filled in');
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 400);
    const bt = await saved(p, 'Butter');
    ok(bt.length === 1 && bt[0].dir === 'out' && bt[0].venue === 'Riviera' && bt[0].person === 'Tom' && bt[0].amount === 2 && bt[0].unit === 'kg' && bt[0].addedById === who && bt[0].by === who && bt[0].deleted === false, who + ': saved through W() as ' + who + ' (' + JSON.stringify(bt[0]) + ')');
    ok(Object.keys(bt[0] || {}).sort().join(',') === 'addedAt,addedBy,addedById,amount,by,deleted,dir,note,person,text,unit,venue', who + ': only the fields the rules allow (' + Object.keys(bt[0] || {}).sort().join(',') + ')');
    ok(await p.inputValue('#tr-venue') === 'Riviera' && await p.inputValue('#tr-person') === 'Tom' && await p.inputValue('#tr-text') === '' && await p.evaluate(() => document.activeElement && document.activeElement.id) === 'tr-text', who + ': the next item of the pick-up keeps the venue and Tom, the item box is ready');
    const toastT = await txt(p, '.p-toast') || '';
    ok(/Logged: Riviera took 2 kg Butter/.test(toastT), who + ': the toast says what was logged (' + toastT + ')');
    if (who === 'ann') ok(/Wrong\? Ask the head chef/.test(toastT) && !(await p.$('.p-toast [data-p="toast-act"]')), 'ann: staff are told to ask the head chef, no Undo');
    else {
      ok(!!(await p.$('.p-toast [data-p="toast-act"]')), 'sam: a sous chef gets Undo');
      await p.click('.p-toast [data-p="toast-act"]'); await L.settle(p, 400);
      ok((await saved(p, 'Butter'))[0].deleted === true, 'sam: Undo takes the line back');
    }

    // a big number for its unit asks once
    await p.fill('#tr-text', 'Flour'); await p.fill('#tr-amt', '200');
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 300);
    ok((await saved(p, 'Flour')).length === 0 && /200 kg\? Check the unit/.test(await txt(p, '.p-toast') || ''), who + ': 200 kg asks first and saves nothing');
    await L.choose(p, '[data-p="tr-unit"][data-v="g"]'); await L.settle(p, 150);
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 400);
    ok((await saved(p, 'Flour')).some(x => x.amount === 200 && x.unit === 'g'), who + ': 200 g logs straight away');

    // the other way: we took from them; a venue typed in other letters is saved the way the book knows it, who gave it is optional
    await L.choose(p, '[data-p="tr-dir"][data-v="in"]'); await L.settle(p, 200);
    ok(await p.getAttribute('#tr-text', 'placeholder') === 'What did we take?' && /optional/.test(await p.getAttribute('#tr-person', 'placeholder')), who + ': We took from them changes the boxes');
    await p.fill('#tr-venue', '  grand   HOTEL '); await L.clear(p, '#tr-person');
    const n0 = await todayN(p);
    await p.press('#tr-venue', 'Enter'); await L.settle(p, 150);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id) === 'tr-person' && await todayN(p) === n0, who + ': Next on the venue goes to who gave it, nothing is sent');
    await p.fill('#tr-text', 'Lemons'); await L.settle(p, 100);
    await p.fill('#tr-amt', '12'); await L.choose(p, '[data-p="tr-unit"][data-v="pieces"]');
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 400);
    const lm = await saved(p, 'Lemons');
    ok(lm.length === 1 && lm[0].dir === 'in' && lm[0].venue === 'Grand Hotel' && lm[0].person === '' && lm[0].amount === 12 && lm[0].unit === 'pieces', who + ': we took 12 pieces of Lemons from Grand Hotel (' + JSON.stringify(lm[0]) + ')');
    await L.waitFor(p, () => /From Grand Hotel/.test(document.querySelector('.o-page').textContent));
    ok(/1 in/.test(await txt(p, '.nb-date') || ''), who + ': the header counts what came in');

    // a typed note goes with the line
    await p.click('[data-p="tr-note-open"]'); await L.settle(p, 150);
    await p.fill('#tr-text', 'Limes'); await p.fill('#tr-amt', '6'); await p.fill('#tr-note', 'Giving it back Friday');
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 400);
    ok(((await saved(p, 'Limes'))[0] || {}).note === 'Giving it back Friday', who + ': the note is saved');

    ok((await lineReads(p)).length === 0, who + ': no past transfer lines are read (' + (await lineReads(p)).join(' | ') + ')');
    ok(p.errors.length === 0, who + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // a View only person reads the list and cannot write
  {
    const e2 = Object.assign({}, extra);
    e2[fsKey(['config', 'main'])] = { sousIds: ['sam'], showBadges: true, people: [
      { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
      { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
      { id: 'bo', name: 'Bo', role: 'view', add: false, tick: false, del: false, active: true }] };
    const p = await L.open(b, '#/transfers', { extra: e2, who: 'bo', wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('.tr-row'));
    ok(!(await p.$('.tr-add')) && /read the transfer list but not write/.test(await txt(p, '.o-page') || ''), 'view only: no form, says so');
    await p.context().close();
  }

  // A shared kitchen tablet locks its private page, then accepts another person's own PIN through Change person.
  {
    const p = await L.open(b, '#/transfers', { extra, who: 'sam', touch: true, deviceMode: 'shared', wait: 1200 });
    await p.clock.runFor(11 * 60000); await L.settle(p, 300);
    ok(!!await p.$('[data-k="pf1"]') && !await p.$('.tr-row'), 'shared tablet: transfers are hidden behind the idle PIN lock');
    await p.click('[data-p="who-change"]'); await L.settle(p, 200);
    await p.click('.p-name[data-id="ann"]'); await L.settle(p,250); await p.keyboard.type('2222'); await L.settle(p,1000);
    await p.fill('#tr-venue', 'Riviera'); await p.fill('#tr-person', 'Jess'); await p.fill('#tr-text', 'Cream'); await p.fill('#tr-amt', '2');
    await L.choose(p, '[data-p="tr-unit"][data-v="L"]');
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 300);
    ok(!await p.$('.p-name'), 'shared tablet: authenticated staff can log a transfer');
    const cr = await saved(p, 'Cream');
    ok(cr.length === 1 && cr[0].addedById === 'ann' && cr[0].venue === 'Riviera' && cr[0].person === 'Jess' && cr[0].unit === 'L', 'shared tablet: after the PIN it is logged by Ann (' + JSON.stringify(cr[0]) + ')');
    ok(p.errors.length === 0, 'shared tablet: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // the head chef's admin panel: past days, the totals per venue, Remove and Put back with no new read
  {
    const ea = Object.assign({}, extra);
    // words that are also built-in object names are words like any other (review, 23 Oct 2026)
    ea[fsKey(['transfers', yest, 'lines', 'y3'])] = { dir: 'out', venue: 'constructor', person: '__proto__', text: '__proto__', amount: 1, unit: 'packs', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000 - 1800000, deleted: false };
    ea[fsKey(['transfers', yest, 'lines', 'y2'])] = { dir: 'in', venue: 'grand hotel', person: 'Lee', text: 'Lemons', amount: 12, unit: 'pieces', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000 - 3600000, deleted: false };
    const p = await L.open(b, '#/admin', { extra: ea, admin: true, wait: 1500 });
    await L.adminTab(p, 'transfers');
    await L.waitFor(p, () => /Milk/.test((document.querySelector('[data-lv="xfer-log"]') || {}).textContent || ''));
    const page = await txt(p, '.a-pane') || '';
    ok(/Brioche buns/.test(await txt(p, '[data-lv="xfer-log"]') || ''), 'admin: today\'s Brioche buns and yesterday\'s Milk are both listed');
    const rv = await txt(p, '[data-lv="xfer-venues"]') || '';
    ok(/Riviera/.test(rv) && /1 \(2 packs\)/.test(rv) && /1 \(6 L\)/.test(rv), 'admin: By venue adds up what Riviera took and what we took (' + rv.replace(/\s+/g, ' ').slice(0, 160) + ')');
    ok(/By item/.test(page) && /Every transfer/.test(page), 'admin: By item and Every transfer are on the page');
    ok(/constructor\s*1 \(1 packs\)/.test(rv) && /__proto__/.test(await txt(p, '[data-lv="xfer-items"]') || ''), 'admin: a venue "constructor" and an item "__proto__" are listed like any other');
    const reads = (await lineReads(p)).length;
    ok(reads >= 30 && reads <= 31, 'admin: the first open reads the last 30 days once (' + reads + ')');
    await p.click('[data-lv="xfer-log"] [data-p="tr-del"][data-id="y1"]'); await L.settle(p, 400);
    let s = await store(p);
    ok(s[fsKey(['transfers', yest, 'lines', 'y1'])].deleted === true && s[fsKey(['transfers', yest, 'lines', 'y1'])].deletedBy === 'Head chef', 'admin: Remove flags yesterday\'s Milk');
    ok(/Removed Milk/.test(await txt(p, '.p-toast') || '') && !!(await p.$('[data-lv="xfer-log"] [data-p="tr-restore"][data-id="y1"]')), 'admin: the toast says so and Milk stays with Put back');
    await p.click('[data-lv="xfer-log"] [data-p="tr-restore"][data-id="y1"]'); await L.settle(p, 400);
    s = await store(p);
    ok(s[fsKey(['transfers', yest, 'lines', 'y1'])].deleted === false, 'admin: Put back restores it');
    ok((await lineReads(p)).length === reads, 'admin: Remove and Put back read nothing again');
    ok(!!(await p.$('[data-p="csv"][data-v="transfers"]')), 'admin: Export has a CSV of the transfers');
    // the venue filter
    await L.pick(p, '[data-k="af-venue"]', 'Riviera'); await L.settle(p, 300);
    const fl = await txt(p, '[data-lv="xfer-log"]') || '';
    ok(/Showing: Riviera/.test(await txt(p, '.a-pane') || '') && /Milk/.test(fl) && !/Lemons/.test(fl), 'admin: the venue filter shows Riviera only');
    await p.click('[data-p="af-reset"]'); await L.settle(p, 200);
    ok(/Lemons/.test(await txt(p, '[data-lv="xfer-log"]') || ''), 'admin: Clear filters shows every venue again');
    ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // a past day that could not be read is said, never shown as nothing moved
  {
    const p = await L.open(b, '#/admin', { extra, admin: true, wait: 1500, failReads: '/transfers/' + yest + '/lines$' });
    await L.adminTab(p, 'transfers');
    await L.waitFor(p, () => /Could not read 1 day/.test((document.querySelector('.a-pane') || {}).textContent || ''));
    ok(/Could not read 1 day/.test(await txt(p, '.a-pane') || ''), 'admin: a day that failed to read is said');
    await p.context().close();
  }

  // the landing page and the tab bar have Transfers
  {
    const p = await L.open(b, '#/', { extra, who: 'ann', wait: 1200 });
    const names = await p.$$eval('.docket .dk-name', l => l.map(e => e.textContent));
    ok(names.join(',') === 'Recipes,Prep list,Orders,Wastage,Transfers,Guides', 'landing: six dockets, Transfers before Guides (' + names.join(', ') + ')');
    ok(!!(await p.$('.tabbar a[href="#/transfers"]')), 'landing: the tab bar has Transfers');
    await p.click('.docket[href="#/transfers"]'); await L.settle(p, 900);
    ok(await p.evaluate(() => location.hash) === '#/transfers' && /^Transfers/.test(await p.title()), 'landing: the docket opens the transfer list (' + await p.title() + ')');
    ok(await p.getAttribute('.tabbar a[href="#/transfers"]', 'aria-current') === 'page', 'the Transfers tab is marked as the page');
    await p.context().close();
  }

  await b.close();
  L.report(R);
})();
