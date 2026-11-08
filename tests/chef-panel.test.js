// The Head/Sous chef workspace uses the admin panel's rooms and layout, with the existing PIN permissions.
// Every fixture person, message and PIN is synthetic. No owner grant is used for either chef PIN role.
const L = require('./lib');
const fs = require('fs'), path = require('path');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const CFG = key('config', 'main');
const day = L.ymd(new Date(L.NOW)), prior = L.ymd(new Date(L.NOW - 86400000));
const cutoff = Date.parse(day + 'T04:00:00+10:00');
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'head', add: true, tick: true, del: true, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
function fixture(patch) {
  return { [CFG]: Object.assign({ people: JSON.parse(JSON.stringify(people)), headId: 'ann', sousIds: ['sam', 'ann'],
    staffIds: ['sam', 'ann', 'bo'], fnIds: [], fnOnlyIds: [], addIds: ['sam', 'ann', 'bo'], tickIds: ['sam', 'ann', 'bo'], delIds: ['sam', 'ann'], showBadges: true }, patch || {}) };
}
const rooms = {
  today: ['dashboard', 'todo', 'notes'], reports: ['prep-history', 'order-history'],
  team: ['plan', 'people', 'minutes'], kitchen: ['kitchen-home', 'recipes', 'suppliers', 'functions', 'deliveries', 'guides'], prep: ['prep-standards']
};
const roomNames = { today: 'Today', reports: 'Reports', team: 'Team', kitchen: 'Kitchen', prep: 'Prep' };
const ownerReads = p => p.evaluate(() => (__fake.reads || []).filter(k => /\/(daily|proofHistory|dashwatch|minuteshist|analysis|analysisDaily|references|training)(\/|$)|\/summary\/usage$/.test(k)));
const refused = p => p.evaluate(() => (__fake.refused || []).map(x => x.kind + ' ' + x.path));
const store = p => p.evaluate(() => __fake.dump());
async function tab(p, t) {
  await p.evaluate(t => {
    const leaf = () => document.querySelector('[data-p="c-tab"][data-t="' + t + '"]');
    if (leaf()) { leaf().click(); return; }
    for (const g of [...document.querySelectorAll('[data-p="c-group"]')].map(x => x.getAttribute('data-g'))) {
      document.querySelector('[data-p="c-group"][data-g="' + g + '"]').click();
      if (LK_PREP.state.ctab === t) return;
      if (leaf()) { leaf().click(); return; }
    }
  }, t);
  await L.waitFor(p, t => LK_PREP.state.ctab === t && !!document.querySelector('[data-p="c-tab"][data-t="' + t + '"][aria-pressed="true"]'), t, 8000);
  await L.settle(p, 200);
}
async function unlock(p, who, pin) {
  const name = p.locator('.p-name[data-id="' + who + '"]');
  if (await name.count() && await name.isVisible()) await name.click();
  await p.fill('#pf1', pin);
  await L.waitFor(p, who => LK_PREP.privateAccess() && LK_PREP.state.who === who, who, 8000);
  await L.settle(p, 300);
}
async function visit(b, label, options, fn) {
  let p;
  try { p = await L.open(b, '#/chef', Object.assign({ extra: fixture(), wait: 1400 }, options || {})); await fn(p); }
  catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
  finally { if (p) await p.context().close(); }
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) for (const who of ['sam', 'ann']) {
    const label = who + ' at ' + width;
    await visit(b, label, { who, width, height: width === 390 ? 844 : 900 }, async p => {
      await L.waitFor(p, () => !!document.querySelector('[data-p="c-group"]'), null, 8000);
      ok(await p.locator('.p-admin.ad-admin .ad-layout .a-nav').count() === 1 && await p.locator('.ad-main .ad-heading').count() === 1 && await p.locator('.ad-main .a-tabs').count() === 1 && await p.locator('.ad-main .a-pane').count() === 1, label + ': same workspace shell as admin');
      ok((await L.txt(p, '.p-admin')).includes(who === 'ann' ? 'Head chef panel' : 'Sous chef panel'), label + ': names the signed-in chef panel');
      ok((await p.locator('[data-p="c-group"]').evaluateAll(es => es.map(e => e.dataset.g))).join() === Object.keys(rooms).join(), label + ': five rooms in admin order');
      ok((await p.locator('.a-tabs [data-p="c-tab"]').evaluateAll(es => es.map(e => e.dataset.t))).join() === rooms.today.join(), label + ': Today starts with Dashboard, Chef to-do and Shift pings; mail is optional');
      ok(await ownerReads(p).then(x => !x.length), label + ': dashboard does not query owner analytics');
      ok(!(await p.$('[data-p="a-tab"], [data-p="a-group"], [data-p="move-pin"], [data-p="export"]')), label + ': no owner controls in chef workspace');
      for (const [g, tabs] of Object.entries(rooms)) {
        await p.click('[data-p="c-group"][data-g="' + g + '"]'); await L.settle(p, 200);
        ok(await L.txt(p, '#rtitle') === roomNames[g] && await p.locator('[data-p="c-group"][data-g="' + g + '"][aria-current="page"]').count() === 1, label + ': ' + roomNames[g] + ' heading and active room');
        ok((await p.locator('.a-tabs [data-p="c-tab"]').evaluateAll(es => es.map(e => e.dataset.t))).join() === tabs.join(), label + ': ' + roomNames[g] + ' has only its chef pages');
      }
      await tab(p, 'dashboard');
      if (width >= 1100) {
        ok(await p.evaluate(() => document.querySelector('.a-nav').getBoundingClientRect().right <= document.querySelector('.ad-main').getBoundingClientRect().left), label + ': desktop rail sits beside the page');
        await p.evaluate(() => scrollTo(0, 700)); await tab(p, 'todo');
        ok(await p.evaluate(() => scrollY < 5), label + ': page changes start at the top');
      }
      ok(!(await L.overflow(p)), label + ': no sideways scroll');
      ok(!p.errors.length && !(await refused(p)).length, label + ': no browser errors or refused reads (' + p.errors.concat(await refused(p)).join(' | ') + ')');
    });
  }

  await visit(b, 'chef actions', {}, async p => {
    await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 400);
    await p.click('.wtop-who'); await L.settle(p, 150); await p.click('.wm a[href="#/chef"]');
    await L.waitFor(p, () => location.hash === '#/chef' && !!document.querySelector('[data-p="c-group"]'));
    ok(true, 'chef menu entry opens the workspace from the prep list');
    await tab(p, 'todo');
    await p.fill('[data-k="todo-text"]', 'Chef panel synthetic job'); await p.click('[data-p="todo-save"]');
    await L.waitFor(p, () => Object.entries(__fake.dump()).some(([k, v]) => /\/todos\/[^/]+$/.test(k) && v.text === 'Chef panel synthetic job' && v.by === 'sam'));
    ok(true, 'Chef to-do saves through the existing PIN-authorised writer');
    await tab(p, 'notes'); await p.click('[data-p="n-new"]'); await p.fill('[data-k="n-text"]', 'Chef panel synthetic shift ping'); await p.click('[data-p="n-save"]');
    await L.waitFor(p, () => Object.entries(__fake.dump()).some(([k, v]) => /\/notes\/[^/]+$/.test(k) && v.text === 'Chef panel synthetic shift ping' && v.by === 'sam'));
    ok(true, 'embedded Shift pings saves with the chef PIN identity');
    await tab(p, 'people');
    ok(!(await p.$('[data-p="a-reset-pin"], [data-a="perm"], [data-a="role"], [data-p="a-person-assess"]')), 'Manage staff does not expose owner PIN, capability or assessment controls');
    await p.fill('[data-k="a-bulk"]', 'Synthetic Cy'); await p.click('[data-p="a-bulk-add"]');
    await p.evaluate(() => { __fake.writes.length = 0; }); await p.click('[data-p="a-save"]');
    await L.waitFor(p, k => (__fake.dump()[k].people || []).some(x => x.name === 'Synthetic Cy'), CFG);
    const s = await store(p), fields = await p.evaluate(k => [].concat(...__fake.writes).filter(x => x.path === k).map(x => Object.keys(x.data).sort().join(',')), CFG);
    ok(s[CFG].headId === 'ann' && s[CFG].sousIds.join() === 'sam,ann' && s[CFG].fnIds.length === 0 && fields.length === 1 && fields[0] === 'by,people,pinOpen,staffIds,updated,updatedBy', 'Manage staff keeps canonical authority lists and the existing limited save payload');
    await tab(p, 'minutes');
    ok(!(await p.$('[data-p="mn-new"], [data-p="mn-edit"], [data-p="mn-remove"], [data-p="mn-save"], [data-p="mn-publish"]')), 'Minutes register does not expose owner editing');
    ok(!(await ownerReads(p)).length && !(await refused(p)).length, 'embedded pages make no owner-only queries or refused requests');
    ok(!p.errors.length, 'embedded actions have no browser errors ' + p.errors.join(' | '));
  });

  const historical = Object.assign(fixture({ people: people.map(x => Object.assign({}, x, x.id === 'bo' ? { name: 'Synthetic Bo Example' } : {})) }), {
    [key('days', prior, 'items', 'chef-past')]: { text: 'Synthetic previous prep', station: 'Larder', qty: '2 tubs', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 86400000, done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - 86300000, deleted: false },
    [key('orders', prior, 'lines', 'chef-order')]: { text: 'Synthetic previous order', qty: '3 packs', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000, ordered: true, orderedBy: 'Sam', orderedById: 'sam', orderedAt: L.NOW - 86300000, deleted: false }
  });
  await visit(b, 'chef history and Find', { extra: historical }, async p => {
    ok(!(await p.evaluate(d => (__fake.reads || []).some(k => k.includes('/' + d + '/')) , prior)), 'Today leaves previous-day lists unread');
    await tab(p, 'prep-history'); await p.fill('[data-k="c-date"]', prior); await p.locator('[data-k="c-date"]').dispatchEvent('change');
    await L.waitFor(p, () => /Synthetic previous prep/.test((document.querySelector('.c-history') || {}).textContent || ''));
    ok(true, 'Prep history opens the selected day with its original line');
    await tab(p, 'order-history');
    await L.waitFor(p, () => /Synthetic previous order/.test((document.querySelector('.c-history') || {}).textContent || ''));
    ok(true, 'Order history reuses the selected day and current history reader');
    const readCount = await p.evaluate(d => (__fake.reads || []).filter(k => k.includes('/' + d + '/')).length, prior);
    await tab(p, 'dashboard'); await tab(p, 'prep-history'); await tab(p, 'order-history');
    ok(await p.evaluate(d => (__fake.reads || []).filter(k => k.includes('/' + d[0] + '/')).length === d[1], [prior, readCount]), 'reopening the same day reuses its already-read histories');
    await p.locator('.a-find:visible').first().click(); await L.waitFor(p, () => !!document.querySelector('#fd-sheet'));
    const findText = await L.txt(p, '#fd-list');
    ok(/Chef to-do|Shift pings/.test(findText) && !/Backup and PIN|Assessments|Confirmed links|Proofreader|Item evidence|Insights|Wastage|Transfers/.test(findText), 'Find offers chef pages without owner workspaces');
    await p.fill('#fd-q', 'Synthetic Bo Example'); await L.settle(p, 150);
    ok(!(await p.$('#fd-sheet [data-fd="go"]')), 'Find does not offer people assessment destinations');
    await p.keyboard.press('Escape'); await L.settle(p, 100);
    ok(!(await ownerReads(p)).length && !(await refused(p)).length, 'day histories and Find stay inside chef read permissions');
    ok(!p.errors.length, 'history and Find have no browser errors ' + p.errors.join(' | '));
  });

  await visit(b, 'dashboard dates', { extra: historical }, async p => {
    await p.click('.tabbar a[href="#/prep"]'); await p.locator('#p-day').waitFor();
    await p.fill('#p-day', prior); await p.locator('#p-day').dispatchEvent('change');
    await L.waitFor(p, d => LK_PREP.state.date === d && LK_PREP.state.itemsState === 'ok' && LK_PREP.state.items.some(x => x.text === 'Synthetic previous prep'), prior);
    await p.click('.tabbar a[href="#/orders"]'); await p.locator('#o-day').waitFor();
    await p.fill('#o-day', prior); await p.locator('#o-day').dispatchEvent('change');
    await L.waitFor(p, d => LK_PREP.state.ordDate === d && LK_PREP.state.ordState === 'ok' && LK_PREP.state.ordLines.some(x => x.text === 'Synthetic previous order'), prior);
    await p.click('.wtop-who'); await L.settle(p, 150); await p.click('.wm a[href="#/chef"]');
    await tab(p, 'dashboard');
    const metric = t => p.locator('.c-tile[data-t="' + t + '"] .dsh-dtile-num');
    ok(await metric('prep-history').innerText() === 'Not read yet' && await metric('order-history').innerText() === 'Not read yet', 'Dashboard does not present the selected past Prep/Orders counts as today');
    for (const [t, previousText, todayText] of [['prep-history', 'Synthetic previous prep', 'Slice onions'], ['order-history', 'Synthetic previous order', 'Milk']]) {
      await tab(p, t); await p.fill('[data-k="c-date"]', prior); await p.locator('[data-k="c-date"]').dispatchEvent('change');
      await L.waitFor(p, text => ((document.querySelector('.c-history') || {}).textContent || '').includes(text), previousText);
      await tab(p, 'dashboard');
      await p.click('.c-tile[data-t="' + t + '"]');
      await L.waitFor(p, d => (document.querySelector('[data-k="c-date"]') || {}).value === d[0] && ((document.querySelector('.c-history') || {}).textContent || '').includes(d[1]), [day, todayText]);
      ok(await p.inputValue('[data-k="c-date"]') === day, t + ': Today metric opens today after yesterday was selected in the report');
    }
    ok(!p.errors.length && !(await refused(p)).length, 'Dashboard date navigation has no errors or refused reads');
  });

  const unavailableDay = L.ymd(new Date(L.NOW - 2 * 86400000)), unavailablePath = key('days', unavailableDay, 'items');
  const unavailableSDK = fs.readFileSync(path.join(__dirname, 'fake', 'firebase-firestore.js'), 'utf8').replace('export function getDocsFromServer(ref) {',
    'export function getDocsFromServer(ref) { if (key(ref.path) === ' + JSON.stringify(unavailablePath) + ') { window.__fake.reads.push(key(ref.path)); window.__fake.chefReportUnavailable = true; return Promise.reject({ code: "unavailable" }); }');
  await visit(b, 'uncached report without signal', { fakeSDK: { 'firebase-firestore.js': unavailableSDK } }, async p => {
    await tab(p, 'prep-history'); await p.fill('[data-k="c-date"]', unavailableDay); await p.locator('[data-k="c-date"]').dispatchEvent('change');
    await L.waitFor(p, () => /Could not load this day/.test((document.querySelector('.c-history [role="status"]') || {}).textContent || ''));
    const text = await L.txt(p, '.c-history');
    ok(await p.evaluate(() => __fake.chefReportUnavailable === true) && /Could not load this day/.test(text) && !/No lines were recorded|0 of 0/.test(text) && !(await p.$('.c-history [data-lv]')), 'an uncached server-only report failure says it could not load, without an empty list or zero counts');
    ok(!p.errors.length && !(await refused(p)).length, 'report-only unavailable response leaves normal chef access intact');
  });

  await visit(b, 'owner minutes preview Back', { admin: true, who: 'ann' }, async p => {
    const back = '.wtop [data-act="back"]';
    await tab(p, 'minutes'); await p.click('[data-p="mn-new"]'); await p.fill('[data-k="mn-decisions"]', 'Synthetic chef panel minutes draft');
    await p.click('[data-p="mn-prev"]');
    await L.waitFor(p, () => !document.querySelector('.mn-form') && (document.querySelector('.wtop [data-act="back"]') || {}).getAttribute('aria-label') === 'Back to writing');
    await p.click(back); await p.locator('.mn-form').waitFor();
    ok(await p.inputValue('[data-k="mn-decisions"]') === 'Synthetic chef panel minutes draft' && await p.evaluate(() => location.hash === '#/chef' && LK_PREP.state.ctab === 'minutes'), 'owner preview Back returns to writing in the chef panel with the draft intact');
    await p.click('[data-p="mn-prev"]'); await tab(p, 'todo');
    ok(await p.locator(back).getAttribute('aria-label') !== 'Back to writing', 'a hidden minutes preview does not claim Back from another chef tab');
    await p.click(back); await L.waitFor(p, () => location.hash !== '#/chef');
    ok(!p.errors.length, 'Back from another chef tab leaves the panel without reopening hidden minutes');
  });

  await visit(b, 'shared chef mail', { extra: Object.assign({}, L.mail(), fixture({ sousMail: true })) }, async p => {
    await tab(p, 'mail');
    await L.waitFor(p, () => document.querySelectorAll('[data-lv="mail"] .ml-row').length === 3, null, 8000);
    let s = await store(p);
    ok(['m1', 'm2', 'm3'].every(id => s[key('mail', id)].seen === false) && !s[key('config', 'admins')].mailOpened, 'shared mail reader does not mark mail seen for the owner');
    ok(!(await p.$('[data-k="ml-sous"]')), 'chef mail has no owner sharing switch');
    await p.click('[data-p="ml-tick"][data-id="m2"]');
    await L.waitFor(p, k => __fake.dump()[k].done === true, key('mail', 'm2'));
    s = await store(p);
    ok(s[key('mail', 'm2')].by === 'sam' && s[key('mailstat', 'm2')].done === true && s[key('mail', 'm2')].seen === false, 'shared mail triage records the PIN chef without owner seen writes');
    ok(!(await refused(p)).length && !p.errors.length, 'shared mail has no refused requests or browser errors ' + p.errors.concat(await refused(p)).join(' | '));
  });

  for (const labelled of [false, true]) await visit(b, labelled ? 'unapproved role label' : 'ordinary staff', { who: 'bo', extra: fixture(labelled ? { people: people.map(x => Object.assign({}, x, x.id === 'bo' ? { role: 'sous' } : {})) } : {}) }, async p => {
    ok(/Only head chefs and sous chefs can open this panel/.test(await L.txt(p, '#prep-root') || '') && !(await p.$('[data-p="c-group"], .todo-row, .p-staff-page, .ml-admin')), (labelled ? 'Unapproved Sous chef label' : 'Ordinary staff') + ': direct route denies private chef content');
    ok(!(await L.chefItems(p)).includes('chef'), 'staff menu does not offer the chef panel');
    ok(!(await ownerReads(p)).length && !(await refused(p)).length && !p.errors.length, 'denied route makes no owner-only/refused reads or browser errors');
  });
  await visit(b, 'missing canonical chef membership', { extra: fixture({ sousIds: undefined }) }, async p => {
    ok(/Only head chefs and sous chefs can open this panel/.test(await L.txt(p, '#prep-root') || '') && !(await p.$('.chef-panel')), 'a Sous chef role label without canonical membership does not open the panel');
    ok(!(await L.chefItems(p)).includes('chef') && !(await ownerReads(p)).length, 'missing canonical membership hides the panel entry and starts no owner report reads');
  });
  await visit(b, 'live role revocation', {}, async p => {
    await tab(p, 'notes'); await p.click('[data-p="n-new"]'); await p.fill('[data-k="n-text"]', 'Synthetic private chef draft');
    await p.evaluate(k => { const c = JSON.parse(JSON.stringify(__fake.dump()[k])); c.sousIds = ['ann']; __fake.write(k, c); }, CFG);
    await L.waitFor(p, () => !document.querySelector('[data-p="c-group"], [data-k="n-text"]'));
    ok(/Only head chefs and sous chefs can open this panel/.test(await L.txt(p, '#prep-root') || ''), 'live canonical role revocation removes the open workspace and private editor');
    ok(!(await L.chefItems(p)).includes('chef') && !p.errors.length, 'revoked chef loses the entry without a browser error');
  });
  await visit(b, 'daily chef lock and handover', { deviceMode: 'shared', clock: cutoff - 60000 }, async p => {
    await tab(p, 'notes'); await p.click('[data-p="n-new"]'); await p.fill('[data-k="n-text"]', 'Synthetic retained chef draft');
    await p.clock.runFor(90000); await L.settle(p, 300);
    ok(await p.evaluate(() => !LK_PREP.privateAccess() && !document.querySelector('[data-p="c-group"], [data-k="n-text"]')), 'daily lock closes the chef workspace and its private draft behind PIN');
    await unlock(p, 'sam', '1111');
    ok(await p.locator('[data-k="n-text"]').inputValue() === 'Synthetic retained chef draft', 'original chef PIN restores their own draft');
    await L.notYou(p); await L.notYou(p);
    await unlock(p, 'bo', '3333');
    ok(!(await p.$('[data-p="c-group"], [data-k="n-text"]')) && !/Synthetic retained chef draft/.test(await p.locator('body').innerText()), 'explicit handover does not show the previous chef draft to ordinary staff');
    ok(!p.errors.length, 'daily lock and handover have no browser errors ' + p.errors.join(' | '));
  });
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
