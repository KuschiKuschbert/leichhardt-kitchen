// The admin Inbox, the Dashboard beside it and Find (redesign step 8, 8 Nov 2026, head chef: "b inbox with a dashboard";
// docs/whole-app-redesign-options/brief.md, Chosen and Build step 8). Today opens on the Inbox: today's numbers from the
// nightly record on top, each a tap into its report, then what needs the head chef. On a laptop the rail is dark, with
// Find, the Inbox with its count and the Dashboard over the four rooms. Find goes to any page, a part of the open page or
// a person, from what is already in memory: no reads. Example data only.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const M = require('../js/functions.js');
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, last = L.ymd(new Date(L.NOW - DAY)), today = L.ymd(new Date(L.NOW));
const days = [];
for (let i = 29; i >= 0; i--) {
  const t = L.NOW - (i + 1) * DAY, n = 20 + (i % 3), w = i < 7 ? 3 : 1;
  days.push({ day: L.ymd(new Date(t)), p: { n, w: n - 2, t: n - 2 - (i % 4), r: 2, sec: { Larder: 8 }, mins: { Larder: [60, 70, 80] }, who: { sam: 5 } },
    w: { n: w, reason: { excess: w }, sec: { Larder: w }, items: [{ t: 'Brisket', u: 'kg', a: 0.5 * w, n: w }] }, x: { out: 1, in: 0 } });
}
const lastDay = days[days.length - 1], pctLast = Math.round(100 * lastDay.p.t / lastDay.p.n);
const w7 = days.slice(-7).reduce((s, r) => s + r.w.n, 0), w14 = days.slice(-14, -7).reduce((s, r) => s + r.w.n, 0);
const fnAt = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const booking = M.derive({ id: 'f1', v: 1, status: 'confirmed', name: 'Smith 50th', date: today, start: fnAt(today, '18:00'), loc: 'Beer garden', guests: 60, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: fnAt(today, '18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 3, u: M.toU([3]) }], was: {}, chg: [], cBy: 'fay', cAt: L.NOW - DAY, confBy: 'fay', confAt: L.NOW - DAY, by: 'fay', upd: L.NOW - 3600000 });
const extra = { ...L.mail(), [path('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: days[0].day, to: last, days, needs: { links: 3, training: 0, inTraining: 0 } },
  [path('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' }, [path('functions', 'f1')]: booking };
const bill = p => p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
const atab = p => p.evaluate(() => LK_PREP.state.atab);
const nums = p => L.waitFor(p, () => document.querySelectorAll('.dsh-inbox .dsh-dtile').length === 3 && /Smith 50th|guests/.test((document.querySelector('.dsh-day') || {}).textContent || ''), null, 10000);
const closeMail = p => p.evaluate(() => { const x = document.querySelector('.mlp-wrap [data-ml="later"]'); if (x) x.click(); });
const findOpen = async (p, how) => {
  if (how === 'key') { await p.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {}); await p.keyboard.press('/'); }
  else await p.click('[data-p="a-find"]:visible');
  await L.waitFor(p, () => document.activeElement && document.activeElement.id === 'fd-q', null, 4000).catch(() => {});
};
const findList = p => p.$$eval('#fd-list .sheet-o', els => els.map(e => e.querySelector('strong').textContent + '|' + e.querySelector('span').textContent));

(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: 900, extra, wait: 1600 });
    await nums(p).catch(() => {});
    ok(await txt(p, '.ad-title') === 'Today' && await atab(p) === 'inbox', width + ': Today opens on the Inbox');
    const tiles = await p.$$eval('.dsh-dtile', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    ok(tiles.length === 3 && new RegExp('^Prep ticked, \\w+day ' + pctLast + ' ?% ' + lastDay.p.t + ' of ' + lastDay.p.n + ' lines').test(tiles[0]), width + ': the first number is yesterday\'s prep ticked, from the nightly record (' + tiles[0] + ')');
    ok(new RegExp('^Waste, last 7 days ' + w7 + ' ?lines ' + (w7 - w14) + ' more than the 7 days before').test(tiles[1]), width + ': waste in lines against the 7 days before (' + tiles[1] + ')');
    ok(/^Functions today 1 60 guests, the first at 18:00/.test(tiles[2]), width + ': today\'s functions from the live list, with guests and the first start (' + tiles[2] + ')');
    const order = await p.evaluate(() => { const d = document.querySelector('.dsh-day'), n = document.querySelector('.dsh-needs'); return !!d && !!n && !!(d.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) && /Inbox/.test(n.querySelector('h3').textContent); });
    ok(order, width + ': today\'s numbers sit above the Inbox');
    ok(await p.locator('.dsh-tools, .dsh-heads, .dsh-week').count() === 0, width + ': the period chips, headlines and the week ahead stay on the Dashboard');
    const dashReads = await p.evaluate(() => window.__fake.bill.filter(x => /\/analysis\/(dashboard|health)$/.test(x.path)).length);
    ok(dashReads === 2, width + ': the Inbox reads the nightly record once, two records (' + dashReads + ')');
    // the layout: Find in the dark rail on a laptop, in the heading on a phone and tablet
    const lay = await p.evaluate(() => {
      const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      const rail = document.querySelector('.a-nav');
      return { railFind: vis(document.querySelector('.a-find-rail')), headFind: vis(document.querySelector('.a-find-head')), quick: vis(document.querySelector('.a-quick-list')),
        dark: getComputedStyle(rail).backgroundColor, count: (document.querySelector('.a-quick[data-v="inbox"] em') || {}).textContent || '', rows: (document.querySelector('.dsh-needs .dsh-panel-head .hint') || {}).textContent || '',
        find44: [...document.querySelectorAll('.a-find')].filter(vis).every(e => e.getBoundingClientRect().height >= 44 - .1) };
    });
    if (width >= 1000) {
      ok(lay.railFind && !lay.headFind && lay.quick && lay.dark === 'rgb(43, 42, 39)', width + ': the laptop rail is dark, with Find, the Inbox and the Dashboard (' + JSON.stringify(lay) + ')');
      ok(lay.count && new RegExp('^' + lay.count + ' to look at').test(lay.rows), width + ': the rail counts the Inbox rows (' + lay.count + ', ' + lay.rows + ')');
    } else ok(!lay.railFind && lay.headFind && !lay.quick, width + ': Find sits in the heading and the rooms stay one row (' + JSON.stringify(lay) + ')');
    ok(lay.find44, width + ': Find is at least 44 px');
    // gap fix (8 Nov 2026, the audit against e-admin-b-1280): on a laptop the picked row opens beside the list with its
    // own action, and Inbox and Dashboard show once (in the rail); a phone keeps the rows and the tabs as they were
    const pane = () => p.evaluate(() => {
      const vis = e => !!e && e.getClientRects().length > 0;
      const pk = [...document.querySelectorAll('.dsh-need-pick')], pane = document.querySelector('.dsh-pick');
      return { picks: pk.filter(vis).length, pressed: pk.filter(e => e.getAttribute('aria-pressed') === 'true').map(e => e.textContent), pane: vis(pane) ? pane.querySelector('.dsh-pick-t').textContent : '',
        act: vis(pane) && pane.querySelector('[data-dsh="open"]') ? pane.querySelector('[data-dsh="open"]').getAttribute('data-t') : '', beside: vis(pane) && pane.getBoundingClientRect().left > document.querySelector('.dsh-need-list').getBoundingClientRect().right - 1,
        tabs: ['inbox', 'dashboard'].filter(t => vis(document.querySelector('.a-tab[data-t="' + t + '"]'))).length };
    });
    let pv = await pane();
    if (width >= 1000) {
      ok(pv.picks >= 2 && pv.pressed.length === 1 && pv.pane === pv.pressed[0] && pv.beside && !!pv.act, width + ': the first Inbox row is open beside the list, with its own action (' + JSON.stringify(pv) + ')');
      ok(pv.tabs === 0, width + ': Inbox and Dashboard show once, in the rail, not again in the Today tabs');
      await closeMail(p);
      const second = await p.$$eval('.dsh-need-pick', els => els[1].textContent);
      const rb = await bill(p);
      await p.locator('.dsh-need-pick').nth(1).click(); await L.settle(p, 300);
      pv = await pane();
      ok(pv.pane === second && pv.pressed.length === 1 && pv.pressed[0] === second && await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('dsh-need-pick')) && await bill(p) === rb, width + ': a tap on another row opens it beside the list, keeps focus on the row and reads nothing (' + pv.pane + ')');
    } else ok(pv.picks === 0 && !pv.pane && pv.tabs === 2, width + ': a phone or tablet keeps the rows and the Inbox and Dashboard tabs as they were (' + JSON.stringify(pv) + ')');
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': no sideways scroll, no page errors ' + p.errors.join(' | '));

    // a number opens its report for the last 7 days
    await closeMail(p);
    await p.click('.dsh-dtile[data-t="waste"]'); await L.settle(p, 300);
    ok(await atab(p) === 'waste' && await p.evaluate(() => LK_PREP.state.statsRange) === 7, width + ': the waste number opens Wastage for the last 7 days');
    await L.adminTab(p, 'inbox'); await L.settle(p, 300);

    // Find: a page by name, with Enter; reads nothing
    await closeMail(p);
    const before = await bill(p);
    await findOpen(p, width >= 1000 ? 'key' : 'tap');
    ok(!!(await p.$('#fd-sheet .sheet-bg')) && await p.evaluate(() => document.activeElement && document.activeElement.id) === 'fd-q', width + ': Find opens as a sheet over the page with the cursor in its box' + (width >= 1000 ? ', from the / key' : ''));
    const all = await findList(p);
    ok(all.length >= 20 && all.indexOf('Order cut-offs|Kitchen') >= 0 && !all.some(x => /\|People$/.test(x)), width + ': before typing it lists every page with its room, and no people yet (' + all.length + ')');
    await p.keyboard.type('cut', { delay: 20 }); await L.settle(p, 150);
    ok((await findList(p))[0] === 'Order cut-offs|Kitchen', width + ': typing narrows it (' + (await findList(p)).join(', ') + ')');
    await p.keyboard.press('Enter'); await L.settle(p, 300);
    ok(!(await p.$('#fd-sheet')) && await atab(p) === 'cutoffs' && await p.evaluate(() => document.activeElement && document.activeElement.id) === 'rtitle', width + ': Enter opens Order cut-offs, on its heading');
    ok(await bill(p) === before, width + ': Find reads nothing');

    // a person, by a word of their name
    await closeMail(p);
    await findOpen(p, 'tap');
    await p.keyboard.type('ann', { delay: 20 }); await L.settle(p, 150);
    const people = (await findList(p)).filter(x => /\|People$/.test(x));
    ok(people.length === 1 && /^Ann/.test(people[0]), width + ': a word finds the person (' + people.join(', ') + ')');
    await p.click('#fd-list .sheet-o:has(span:text-is("People"))'); await L.settle(p, 400);
    ok(await atab(p) === 'people' && await p.evaluate(() => LK_PREP.state.personId) === 'ann', width + ': picking them opens their page');

    // a part of the open page: Backup and PIN has two blocks, Find scrolls to the one picked
    await L.adminTab(p, 'tools'); await L.settle(p, 300); await closeMail(p);
    await findOpen(p, 'tap');
    await p.keyboard.type('kitchen pin', { delay: 20 }); await L.settle(p, 150);
    const part = await findList(p);
    ok(part[0] === 'Kitchen PIN|On this page', width + ': the open page\'s parts come first (' + part.join(', ') + ')');
    await p.click('#fd-list .sheet-o'); await L.settle(p, 900);
    const top = await p.evaluate(() => { const h = [...document.querySelectorAll('.a-pane .set-block > .label')].find(e => e.textContent.trim() === 'Kitchen PIN'); return h ? { top: Math.round(h.getBoundingClientRect().top), room: innerHeight - 60, moved: scrollY > 0 } : null; });
    ok(!!top && top.moved && top.top >= 0 && top.top < top.room, width + ': it scrolls to that part (' + JSON.stringify(top) + ')');

    // Escape and the backdrop close it, and the cursor goes back to Find
    await findOpen(p, 'tap');
    await p.keyboard.press('Escape'); await L.settle(p, 200);
    ok(!(await p.$('#fd-sheet')) && await p.evaluate(() => !!document.activeElement && document.activeElement.matches('[data-p="a-find"]')), width + ': Escape closes Find and gives Find the cursor back');
    await findOpen(p, 'tap');
    await p.mouse.click(5, 5); await L.settle(p, 200);
    ok(!(await p.$('#fd-sheet')), width + ': a tap on the dimmed page closes it');
    ok(p.errors.length === 0, width + ': no page errors after Find ' + p.errors.join(' | '));

    // the laptop rail's Dashboard is one tap from any room
    if (width >= 1000) {
      await p.click('.a-quick[data-v="dashboard"]'); await L.settle(p, 400);
      ok(await atab(p) === 'dashboard' && await p.evaluate(() => document.querySelector('.a-quick[data-v="dashboard"]').getAttribute('aria-current')) === 'true' && await txt(p, '.ad-title') === 'Today', width + ': the rail\'s Dashboard opens the Dashboard in Today');
    }
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
