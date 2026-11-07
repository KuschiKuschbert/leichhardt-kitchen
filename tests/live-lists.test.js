// Live lists and the kitchen sections (Plan B 2.7, 7 Nov 2026, docs/firestore-usage.md). The head chef's owner grant
// on top of their own PIN no longer starts every live list again (accessChanged()): it read today's prep list and the
// sections a second time on every admin unlock. The sections people write are read once a day and kept in lk.secs
// (loadSections()), not through a live list that cost a read on every phone for every line added under a section.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
// a real service day: 40 lines on today's prep list and 12 sections in use
const extra = {};
for (let i = 0; i < 40; i++) extra[fsKey(['days', today, 'items', 'l' + i])] = { text: 'Line ' + i, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000 + i, done: false, deleted: false };
const SECS = ['Larder', 'Grill', 'Pastry', 'Sauce', 'Fryer', 'Pass', 'Garnish', 'Butchery', 'Salads', 'Desserts', 'Smoker', 'Veg'];
SECS.forEach((n, i) => { extra[fsKey(['sections', n.toLowerCase()])] = { name: n, uses: 20 - i, lastUsed: L.NOW - 86400000, lastBy: 'Sam' }; });
const bills = (p, re, kind) => p.evaluate(a => window.__fake.bill.filter(x => new RegExp(a.re).test(x.path) && (!a.kind || x.kind === a.kind)), { re: re.source, kind: kind || '' });
const n = b => b.reduce((t, x) => t + x.n, 0);
const itemsRe = new RegExp('/days/' + today + '/items$'), secRe = /\/sections$/, secDocRe = /\/sections(\/[^/]+)?$/;
const secs = p => p.evaluate(() => window.LK_PREP.state.sections.map(x => x.name + (x.hidden ? '*' : '')).sort().join(','));
const kept = p => p.evaluate(() => { try { const c = JSON.parse(localStorage.getItem('lk.secs') || 'null'); return c ? c.v.map(x => x.name + (x.hidden ? '*' : '')).sort().join(',') : null; } catch (e) { return 'bad'; } });
const write = (p, k, v) => p.evaluate(a => window.__fake.write(a.k, a.v), { k, v });

(async () => {
  const b = await L.start();

  // 1. The head chef opens the admin panel: the PIN session starts the live lists, the owner grant follows
  let p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 2500 });
  ok(await L.waitFor(p, () => window.LK_PREP.state.level === 'owner' && window.LK_PREP.state.itemsState === 'ok' && window.LK_PREP.state.sections.length === 12).then(() => true, () => false), 'admin: unlocked, today\'s list and the sections are in');
  await L.settle(p, 1500);
  // the stand-in's own seed adds a few lines of its own to today's 40
  const lines = await p.evaluate(d => Object.keys(window.__fake.dump()).filter(k => k.indexOf('/days/' + d + '/items/') > 0).length, today);
  let it = await bills(p, itemsRe, 'listen'), sc = await bills(p, secDocRe), cfg = await bills(p, /\/config\/main$/, 'listen');
  ok(it.length === 1 && n(it) === lines, 'admin unlock: today\'s prep list is read once, ' + lines + ' reads (' + it.length + ' starts, ' + n(it) + ' reads)');
  ok(cfg.length === 1, 'admin unlock: the kitchen settings listener starts once (' + cfg.length + ')');
  ok(sc.length === 1 && n(sc) === 12, 'admin unlock: the sections are read once, 12 reads (' + sc.map(x => x.kind + ' ' + x.n).join(', ') + ')');
  // what only the owner grant opens still opens: who writes and ticks (admin Team)
  await L.adminTab(p, 'team');
  ok(await L.waitFor(p, () => window.LK_PREP.state.actState === 'ok').then(() => true, () => false), 'admin unlock: the Team table, which needs the grant, loads');

  // 2. The Learning list: today's sections, read again when it opens, at most every 30 minutes
  await p.evaluate(() => { window.__fake.bill = []; });
  await L.adminTab(p, 'learning'); await L.settle(p, 800);
  ok((await bills(p, secDocRe)).length === 0, 'Learning: opened within 30 minutes of the last read, no read');
  ok(await p.$$eval('[data-p="sec-hide"]', els => els.length) === 12, 'Learning: the 12 sections are listed');
  await write(p, fsKey(['sections', 'wok']), { name: 'Wok', uses: 1, lastUsed: L.NOW, lastBy: 'Ann' });
  await L.settle(p, 500);
  ok((await bills(p, secDocRe)).length === 0 && !/Wok/.test(await secs(p)), 'another phone adds a section: no live list, so no read here');
  // 31 minutes on (the Learning list's own wait, on the phone's clock: Date.now)
  await p.evaluate(() => { window.LK_PREP.state.secAt -= 31 * 60000; });
  await L.adminTab(p, 'team'); await L.adminTab(p, 'learning');
  ok(await L.waitFor(p, () => window.LK_PREP.state.sections.some(x => x.name === 'Wok')).then(() => true, () => false), 'Learning, 31 minutes later: read again on open, Wok is listed');
  sc = await bills(p, secDocRe);
  ok(sc.length === 1 && n(sc) === 13, 'Learning: that is one read of the 13 sections (' + n(sc) + ')');
  ok(/Wok/.test(await kept(p)), 'Learning: the new read is kept for the day too');

  // a hide shows at once, before the server answers, and is kept
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click('[data-p="sec-hide"][data-id="grill"]'); await L.settle(p, 300);
  ok(/Grill\*/.test(await secs(p)) && /Grill <span class="a-badge off">hidden/.test(await p.innerHTML('#prep-root')), 'hide: Grill shows hidden at once, while the write waits');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); }); await L.settle(p, 500);
  ok(await p.evaluate(k => window.__fake.dump()[k].hidden === true, fsKey(['sections', 'grill'])) && /Grill\*/.test(await kept(p)), 'hide: saved, and kept for the day on this phone');
  // a refused one goes back
  await p.evaluate(() => { window.__fake.deny = /\/sections\//; });
  await p.click('[data-p="sec-hide"][data-id="pastry"]'); await L.settle(p, 600);
  ok(!/Pastry\*/.test(await secs(p)) && !/Pastry\*/.test(await kept(p)), 'hide refused: Pastry is back in suggestions, on screen and in the copy');
  await p.evaluate(() => { window.__fake.deny = null; });
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. A staff phone: the sections are read once on the first open of the day and kept
  p = await L.open(b, '#/prep', { who: 'sam', extra, wait: 2000 });
  ok(await L.waitFor(p, () => window.LK_PREP.state.sections.length === 12).then(() => true, () => false), 'staff: the 12 sections are in');
  sc = await bills(p, secDocRe);
  ok(sc.length === 1 && n(sc) === 12, 'staff first open: the sections are read once, 12 reads (' + sc.map(x => x.kind + ' ' + x.n).join(', ') + ')');
  ok((await kept(p) || '').split(',').length === 12, 'staff: kept for the day in lk.secs');
  // another phone adds five lines under Grill: this phone is billed nothing for them
  await p.evaluate(() => { window.__fake.bill = []; });
  for (let i = 0; i < 5; i++) await write(p, fsKey(['sections', 'grill']), { name: 'Grill', uses: 20 + i, lastUsed: L.NOW, lastBy: 'Ann' });
  await L.settle(p, 600);
  ok((await bills(p, secDocRe)).length === 0, 'staff: five lines under a section on another phone cost this phone no reads');
  // a line added here under a new section: in the suggestions at once, and in the copy
  await p.fill('#p-section', 'Wok'); await p.fill('#p-text', 'Season the wok'); await p.press('#p-text', 'Enter'); await L.settle(p, 600);
  ok(await p.evaluate(() => { const x = window.LK_PREP.state.sections.find(s => s.name === 'Wok'); return !!x && x.uses === 1 && x.lastBy === 'Sam'; }), 'own line under Wok: the section is known at once, 1 line, by Sam');
  ok(await p.evaluate(() => [...document.querySelectorAll('#prep-root .sec-chips [data-p="sec-pick"]')].some(c => c.getAttribute('data-v') === 'Wok')), 'own line under Wok: Wok is offered as a section chip');
  ok(/Wok/.test(await kept(p)) && await p.evaluate(k => window.__fake.dump()[k].uses === 1, fsKey(['sections', 'wok'])), 'own line under Wok: saved, and in the copy for the day');
  await p.fill('#p-section', 'Larder'); await p.fill('#p-text', 'Pick parsley'); await p.press('#p-text', 'Enter'); await L.settle(p, 600);
  ok(await p.evaluate(() => window.LK_PREP.state.sections.find(s => s.name === 'Larder').uses) === 21, 'own line under Larder: its count goes up by one on this phone');
  // the reload (the 04:00 refresh, an update): no sections read
  await p.reload(); await L.settle(p, 2500);
  ok(await L.waitFor(p, () => window.LK_PREP.state.itemsState === 'ok').then(() => true, () => false), 'staff reload: back in');
  ok((await bills(p, secDocRe)).length === 0 && (await secs(p)).split(',').length === 13, 'staff reload the same day: the sections come from the copy, no reads (' + await secs(p) + ')');
  // signing out still stops the live lists: a line from another phone after it costs nothing here
  await p.evaluate(() => window.LK_PREP.signOut(true)); await L.settle(p, 800);
  await p.evaluate(() => { window.__fake.bill = []; });
  await write(p, fsKey(['days', today, 'items', 'late']), { text: 'Late line', station: 'Grill', qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW, done: false, deleted: false });
  await L.settle(p, 600);
  ok((await bills(p, itemsRe)).length === 0, 'signed out: the prep list stopped listening');
  ok(await kept(p) === null, 'signed out: the kept sections are gone from the phone');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. A failed read keeps nothing, and goes again once the phone is back online
  p = await L.open(b, '#/prep', { who: 'sam', extra, failReads: '/sections$', wait: 2000 });
  await L.waitFor(p, () => window.LK_PREP.state.itemsState === 'ok');
  ok(await kept(p) === null && (await p.evaluate(() => window.LK_PREP.state.sections.length)) === 0, 'sections unreadable: nothing kept, none taken as the kitchen\'s');
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  ok(await L.waitFor(p, () => window.LK_PREP.state.sections.length === 12).then(() => true, () => false) && (await kept(p) || '').split(',').length === 12, 'signal back: read again and kept');
  ok(p.errors.length === 0, 'failed read: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. The functions list (js/functions.js watch()): asked for again while the Firebase files load, it started a
  // listener each time and could stop only the last, so two or three read every booking and every change to one
  const F = require('../js/functions.js'), fx = Object.assign({}, extra), cfgK = fsKey(['config', 'main']);
  fx[cfgK] = Object.assign({}, L.seed()[cfgK]);
  fx[cfgK].people = fx[cfgK].people.concat([{ id: 'fay', name: 'Fay', role: 'fnc', active: true }]);
  fx[cfgK].staffIds = (fx[cfgK].staffIds || []).concat(['fay']); fx[cfgK].fnIds = ['fay'];
  fx[fsKey(['pinset', 'fay'])] = { at: 1 }; fx[fsKey(['staffpins', 'fay'])] = { hash: L.sha('lk:fay:5151') };
  const booking = (i, extraF) => { const d = L.ymd(new Date(L.NOW + (i * 5 + 1) * 86400000)); return F.derive(Object.assign({ v: 1, status: 'confirmed', name: 'Booking ' + i, date: d, start: F.kat(d, 1080), loc: 'Garden', guests: 30, mode: 'all', lines: [{ rid: 'pizza-platter', name: 'Pizza platter', qty: 2, unit: 'platter', u: [0], spec: '', fp: '' }], rounds: [{ at: F.kat(d, 1110), note: '' }], notes: '', kc: '', kcBy: '', kcAt: 0, was: {}, chg: [], cBy: 'fay', cAt: 1, by: 'fay', upd: 1, od: '', confAt: 1 }, extraF || {})); };
  for (let i = 0; i < 12; i++) fx[fsKey(['functions', 'fn' + i])] = booking(i);
  const fnRe = /\/functions$/;
  for (const [hash, who] of [['#/functions', 'fay'], ['#/fn', 'sam']]) {
    p = await L.open(b, hash, { who, extra: fx, wait: 2500 });
    await L.settle(p, 1500);
    const starts = await bills(p, fnRe, 'listen');
    ok(starts.length === 1 && n(starts) === 12, hash + ' as ' + who + ': the functions list starts once, 12 reads (' + starts.length + ' starts, ' + n(starts) + ' reads)');
    await p.evaluate(() => { window.__fake.bill = []; });
    await write(p, fsKey(['functions', 'fn3']), booking(3, { guests: 40, upd: 2 }));
    await L.settle(p, 600);
    // (Manage functions also reads its whole list again after a change: docs/firestore-usage.md, left to do)
    const heard = await bills(p, fnRe, 'listen+');
    ok(heard.length === 1 && n(heard) === 1, hash + ' as ' + who + ': a booking changed on another phone costs the functions list 1 read (' + heard.map(x => x.kind + ' ' + x.n).join(', ') + ')');
    ok(p.errors.length === 0, hash + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 6. Manage functions (js/fnedit.js changed()): it read every booking again, up to 400, on every functions event
  // while open. Now the live list is laid over it; the whole list is read on open, on Read again, and at a change once
  // the list is 30 minutes old
  p = await L.open(b, '#/functions', { who: 'fay', extra: fx, wait: 2500 });
  await L.settle(p, 1500);
  const listed = () => p.evaluate(() => document.getElementById('main').innerText);
  // the first of them on the page (a tap through the page: the chip row scrolls sideways at 390 px)
  const tapFe = (pg, sel) => pg.evaluate(q => { const el = document.querySelector('#main ' + q); if (!el) throw new Error('no ' + q); el.click(); }, sel);
  const fullReads = () => bills(p, fnRe, 'query');
  ok(/Booking 3/.test(await listed()) && (await fullReads()).length === 1, 'Manage functions: open, the whole list is read once (' + (await fullReads()).length + ')');
  await p.evaluate(() => { window.__fake.bill = []; });
  await write(p, fsKey(['functions', 'fn3']), booking(3, { name: 'Booking 3 moved', upd: 2 }));
  await L.settle(p, 800);
  ok(/Booking 3 moved/.test(await listed()), 'Manage functions: a booking changed on another phone shows');
  await write(p, fsKey(['functions', 'fn12']), booking(12, { name: 'Booking new' }));
  await L.settle(p, 800);
  ok(/Booking new/.test(await listed()), 'Manage functions: a new booking from another phone shows');
  ok((await fullReads()).length === 0, 'Manage functions: a booking changed and one added: the whole list not read again (' + (await fullReads()).map(x => x.n).join(', ') + ')');
  await write(p, fsKey(['functions', 'fn5']), booking(5, { removed: true, upd: 2 }));
  await L.settle(p, 800);
  ok(!/Booking 5\b/.test(await listed()), 'Manage functions: a booking deleted on another phone leaves Coming up');
  ok((await fullReads()).length === 1, 'Manage functions: a deleted one leaves the live list, so the whole list is read once to say so (' + (await fullReads()).length + ')');
  await p.evaluate(() => { window.__fake.bill = []; });
  await tapFe(p, '[data-fe="chip"][data-v="deleted"]'); await L.settle(p, 300);
  ok(/Booking 5\b/.test(await listed()), 'Manage functions: and is under Deleted');
  await tapFe(p, '[data-fe="chip"][data-v="up"]'); await L.settle(p, 300);
  await write(p, cfgK, Object.assign({}, await p.evaluate(k => window.__fake.dump()[k], cfgK), { showBadges: true }));
  await L.settle(p, 800);
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await L.settle(p, 500);
  ok((await fullReads()).length === 0, 'Manage functions: the settings changed and back to the app: the whole list not read again (' + (await fullReads()).map(x => x.n).join(', ') + ')');
  await tapFe(p, '[data-fe="reload"]'); await L.settle(p, 800);
  ok((await fullReads()).length === 1, 'Manage functions: Read again reads the whole list (' + (await fullReads()).length + ')');
  ok(p.errors.length === 0, 'Manage functions: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
