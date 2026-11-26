// The kitchen's real screens (head chef, 26 Nov 2026, docs/device-coverage.md): the five section screens and the front
// of house screen are 1920 x 1080 at 100 %, touch and a mouse; the head chef's computer is 1920 x 1080 with a mouse.
// Part 1: every page, admin tab and Manage page that tests/pages.test.js opens, at 1920 x 1080 with touch (the
// section screens with touch as the main input) and with a mouse (a section screen whose main input is the mouse,
// and the head chef's computer). Part 2: the pages tests/pages.test.js does not open (Today's team, the chef panel,
// Cleaning, the three Functions pages, Deliveries and Suppliers), at all five sizes. Each: no sideways scroll, no
// page errors, and the page shows itself (its own address and its own words). With SHOTS=1 it also saves a screenshot of each page to tests/shots/.
const L = require('./lib');
const F = require('./supplier-fixtures');
const fs = require('fs'), path = require('path');
const SHOTS = process.env.SHOTS ? path.join(__dirname, 'shots') : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const WIDE = [[1920, 1080, true, '1920 touch'], [1920, 1080, false, '1920 mouse']];
const ALL = [[390, 844, true, '390'], [768, 1024, true, '768'], [1280, 900, false, '1280']].concat(WIDE);
const shot = (p, name, full) => SHOTS ? p.screenshot({ path: path.join(SHOTS, name.replace(/[ #/:]+/g, '-').replace(/^-+|-+$/g, '') + '.png'), fullPage: !!full }) : null;
// the page stayed on its own address and says its own words (not the top bar alone, not a "not for you" page)
const drew = (p, hash, words) => p.evaluate(([h, src]) => location.hash === h && new RegExp(src).test(document.body.innerText || ''), [hash, words.source]);

(async () => {
  const b = await L.start(), R = [], out = {};
  ALL.forEach(s => { out[s[3]] = []; });
  const pages = ['#/', '#/recipes', '#/r/barra', '#/r/laksa', '#/r/rice', '#/settings', '#/prep', '#/orders', '#/waste', '#/transfers', '#/minutes', '#/mail', '#/drinks', '#/todo', '#/guides', '#/guides/combi', '#/guides/fryer'];
  // the pages tests/pages.test.js leaves out, each opened as someone who may use it
  const more = [
    ['#/team', {}, /Today's team/], ['#/chef', {}, /Sous chef panel/], ['#/cleaning', {}, /Repeat tasks/], ['#/fn', {}, /Confirmed functions/],
    ['#/fn/now', {}, /Every round still to go out/], ['#/functions', { admin: true }, /New function/], ['#/deliveries', {}, /Delivery received/],
    ['#/suppliers', { who: 'bo', extra: F.fixture() }, /Order list/]
  ];
  // Part 1: what tests/pages.test.js covers, at the section screens' size
  const part1 = WIDE.map(async ([w, h, touch, label]) => {
    const R = out[label];
    for (const hash of pages) {
      const p = await L.open(b, hash, { width: w, height: h, touch, wait: 1400, extra: L.guides() });
      const of = await L.overflow(p);
      L.check(!of && !p.errors.length, label + ' ' + hash + (of ? ' sideways scroll: ' + of : '') + (p.errors.length ? ' errors: ' + p.errors.join(' | ') : ''), R);
      await shot(p, label + ' ' + (hash.replace(/[#/]/g, '') || 'landing'));
      await p.context().close();
    }
    const p = await L.open(b, '#/admin', { width: w, height: h, touch, admin: true, wait: 1600, extra: Object.assign(L.guides(), L.mail(), { ['kitchens/' + L.PIN + '/config/admins']: { x: 1, mailOpened: L.NOW } }) });
    for (const t of ['insights', 'team', 'waste', 'transfers', 'learning', 'notes', 'minutes', 'guides', 'mail', 'people', 'tools', 'kitchen-home']) {
      await L.adminTab(p, t); await L.settle(p, 300);
      const ofa = await L.overflow(p);
      L.check(!ofa, label + ' admin ' + t + ' no sideways scroll' + (ofa ? ': ' + ofa : ''), R);
      await shot(p, label + ' admin ' + t);
    }
    L.check(!p.errors.length, label + ' admin no page errors ' + p.errors.join(' | '), R);
    await p.context().close();
    const K = 'kitchens/' + L.PIN + '/config/main', P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
    const head = { [K]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } };
    for (const hash of ['#/manage', '#/manage/r/burger', '#/manage/new', '#/manage/draw/new/burger/plate', '#/manage/draw/new/rice/pan']) {
      const pm = await L.open(b, hash, { width: w, height: h, touch, who: 'ann', wait: 1400, extra: head });
      await L.waitFor(pm, () => !!document.querySelector('#mg-q, #mg-name, .dw-svg'), null, 15000).catch(() => {});
      const of = await L.overflow(pm);
      L.check(!of && !pm.errors.length && !!(await pm.$('#mg-q, #mg-name, .dw-svg')), label + ' ' + hash + (of ? ' sideways scroll: ' + of : '') + (pm.errors.length ? ' errors: ' + pm.errors.join(' | ') : ''), R);
      await shot(pm, label + ' ' + hash, true);
      await pm.context().close();
    }
  });
  // Part 2: the pages left out of tests/pages.test.js, at every size
  const part2 = ALL.map(async ([w, h, touch, label]) => {
    const R = out[label];
    for (const [hash, o, words] of more) {
      const p = await L.open(b, hash, Object.assign({ width: w, height: h, touch, wait: 1800 }, o));
      const of = await L.overflow(p), said = await drew(p, hash, words);
      L.check(!of && !p.errors.length && said, label + ' ' + hash + (of ? ' sideways scroll: ' + of : '') + (p.errors.length ? ' errors: ' + p.errors.join(' | ') : '') + (said ? '' : ' did not show its page (' + words + ')'), R);
      await shot(p, label + ' ' + hash);
      await p.context().close();
    }
  });
  await Promise.all(part1.concat(part2));
  ALL.forEach(s => R.push(...out[s[3]]));
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
