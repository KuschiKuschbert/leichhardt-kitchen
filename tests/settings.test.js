// Settings, sorted by who a setting is for (3 Nov 2026, head chef chose A: docs/settings-options/brief.md). Your card
// at the top, then You, This phone, Notifications and About and help. Rows say what they are set to and open in place;
// each role sees only its own rows, from the same checks the pages and the rules use.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const groups = p => p.evaluate(() => [...document.querySelectorAll('.st-grp .st-gh .label')].map(e => e.textContent));
const rows = p => p.evaluate(() => [...document.querySelectorAll('.st-row')].map(e => e.getAttribute('data-row')));
const value = (p, id) => p.evaluate(i => { const v = document.querySelector('[data-row="' + i + '"] .st-v'); return v ? v.textContent : null; }, id);
const caps = p => p.evaluate(() => [...document.querySelectorAll('.st-caps li')].map(e => e.textContent));

(async () => {
  const b = await L.start();

  // Staff: their card, their rows, folded until tapped
  let p = await L.open(b, '#/settings', { who: 'ann', wait: 1500 });
  ok(await L.txt(p, '.st-you .st-name') === 'Ann' && /Staff/.test(await L.txt(p, '.st-you .st-role')), 'staff: the card says who is signed in and their role');
  ok(JSON.stringify(await groups(p)) === JSON.stringify(['You', 'This phone', 'About and help']), 'staff: You, This phone, About and help (' + (await groups(p)) + ')');
  const annRows = await rows(p);
  ok(annRows.indexOf('practice') < 0 && annRows.indexOf('ticks') < 0 && annRows.indexOf('push') < 0, 'staff: no Practice, Ticked steps or cut-off pushes (' + annRows + ')');
  // one ping sound for the whole kitchen, set only in the admin panel: no sound in Settings (head chef, 3 Nov 2026)
  ok(!/sound/i.test(await L.txt(p, '#main')), 'staff: no ping sound in Settings');
  ok(await p.evaluate(() => [...document.querySelectorAll('.st-btn[data-act="strow"]')].every(e => e.getAttribute('aria-expanded') === 'false') && [...document.querySelectorAll('.st-body')].every(e => e.hidden && !e.offsetHeight)), 'staff: every row starts folded');
  await L.setRow(p, 'can');
  const annCan = await caps(p);
  ok(annCan.indexOf('Tick prep') >= 0 && annCan.indexOf('Add prep and order lines') >= 0 && annCan.indexOf('Remove prep lines') < 0 && annCan.indexOf('Manage staff') < 0, 'staff: What you can do follows their ticks (' + annCan + ')');
  ok(/Ask the head chef/.test(await L.txt(p, '#st-b-can')), 'staff: and says who to ask for more');
  ok(await p.$eval('#st-b-can', e => !e.hidden && e.offsetHeight > 0) && await p.$eval('[data-act="strow"][data-val="can"]', e => e.getAttribute('aria-expanded')) === 'true', 'staff: a tapped row opens in place');
  await L.setRow(p, 'text');
  await L.choose(p, '[data-act="settext"][data-val="large"]'); await L.settle(p, 300);
  ok(await p.evaluate(() => document.documentElement.getAttribute('data-text')) === 'large' && await value(p, 'text') === 'Large', 'staff: Text size changes the book and the row says Large');
  ok(await p.$eval('#st-b-can', e => !e.hidden), 'staff: open rows stay open after the page draws again');
  await L.setRow(p, 'version');
  await p.click('[data-act="updcheck"]');
  await L.waitFor(p, () => /newest copy|No signal/.test((document.querySelector('.st-umsg') || {}).textContent || ''), null, 10000);
  ok(await L.txt(p, '.st-umsg') === 'This is the newest copy.' && await value(p, 'version') === 'Up to date', 'Check for an update: this is the newest copy, Up to date (' + await L.txt(p, '.st-umsg') + ')');
  await p.click('.st-you [data-who="out"]');
  await L.waitFor(p, () => /Nobody signed in/.test((document.querySelector('.st-you .st-name') || {}).textContent || ''), null, 8000);
  ok(JSON.stringify(await groups(p)) === JSON.stringify(['This phone', 'About and help']), 'staff: Sign out on the card signs out, and You and Notifications go (' + (await groups(p)) + ')');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Sous chef: their permissions and the cut-off pushes on this phone
  p = await L.open(b, '#/settings', { who: 'sam', wait: 1500 });
  await L.setRow(p, 'can');
  const samCan = await caps(p);
  ok(samCan.indexOf('Remove prep lines') >= 0 && samCan.indexOf('Shift pings') >= 0 && samCan.indexOf('Manage staff') >= 0 && samCan.indexOf('Admin panel on this device') < 0, 'sous chef: What you can do (' + samCan + ')');
  ok((await rows(p)).indexOf('push') >= 0 && await value(p, 'push') === 'Off', 'sous chef: Cut-off pushes on this phone, Off');
  ok(JSON.stringify(await groups(p)) === JSON.stringify(['You', 'This phone', 'Notifications', 'Team', 'About and help']), 'sous chef: a Team group, no The kitchen (' + (await groups(p)) + ')');
  ok(await p.$('#st-find') === null && (await rows(p)).indexOf('kpin') < 0, 'sous chef: no Find a setting, no kitchen PIN row');
  await L.setRow(p, 'setby');
  ok(/Pages staff see/.test(await L.txt(p, '#st-b-setby')) && /Only the head chef changes these/.test(await L.txt(p, '#st-b-setby')) && !/sound/i.test(await L.txt(p, '#main')), 'sous chef: what the head chef set, read only, and no ping sound');
  await p.click('[data-row="staff"] .st-btn'); await L.settle(p, 400);
  await L.waitFor(p, () => location.hash === '#/prep' && !!document.querySelector('[data-p="a-remove-person"]'), null, 8000);
  ok(await p.evaluate(() => location.hash) === '#/prep' && !!(await p.$('[data-p="a-remove-person"]')), 'sous chef: Manage staff opens the staff list');
  ok(p.errors.length === 0, 'sous chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Head chef on their own device: the device setup rows, and Admin panel instead of Manage staff
  p = await L.open(b, '#/settings', { admin: true, who: '', wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('[data-row="practice"]') && !!document.querySelector('[data-row="ticks"]'), null, 10000);
  await L.setRow(p, 'can');
  const headCan = await caps(p);
  ok(headCan.indexOf('Admin panel on this device') >= 0 && headCan.indexOf('Manage staff') < 0, 'head chef: Admin panel on this device, no Manage staff (' + headCan + ')');
  ok(/You set what everyone else can do in People/.test(await L.txt(p, '#st-b-can')), 'head chef: says where everyone\'s permissions are set');
  ok(JSON.stringify(await groups(p)) === JSON.stringify(['You', 'This phone', 'Notifications', 'The kitchen', 'About and help']), 'head chef: The kitchen, no Team (' + (await groups(p)) + ')');
  ok(await value(p, 'k-people') === '4 people, 1 sous chef' && await value(p, 'k-sound') === 'Pass bell' && await value(p, 'k-mail') === 'Off', 'head chef: the kitchen rows say what each is set to');
  await p.fill('#st-find', 'sound'); await L.settle(p, 400);
  const found = await p.evaluate(() => [...document.querySelectorAll('.st-row')].filter(r => !r.hidden).map(r => r.getAttribute('data-row')));
  ok(JSON.stringify(found) === JSON.stringify(['k-sound']), 'Find a setting: "sound" leaves the kitchen\'s ping sound row (' + found + ')');
  ok(await p.evaluate(() => [...document.querySelectorAll('.st-grp')].filter(g => !g.hidden).length) === 1, 'Find a setting: groups with nothing found go');
  await p.fill('#st-find', 'zzzz'); await L.settle(p, 400);
  ok(/No setting matches/.test(await L.txt(p, '.st-none')), 'Find a setting: says when nothing matches');
  await p.fill('#st-find', ''); await p.click('.ux-search-clear').catch(() => {}); await L.settle(p, 400);
  await p.click('[data-row="k-sound"] .st-btn'); await L.settle(p, 800);
  ok(await p.evaluate(() => location.hash) === '#/admin' && await p.evaluate(() => localStorage.getItem('lk.prep.atab')) === 'notes', 'head chef: Ping sound for every phone opens the admin Shift pings page');
  ok(p.errors.length === 0, 'head chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Nobody signed in: This phone and About and help, and Sign in from the card
  p = await L.open(b, '#/settings', { who: '', wait: 1200 });
  ok(JSON.stringify(await groups(p)) === JSON.stringify(['This phone', 'About and help']) && /Nobody signed in/.test(await L.txt(p, '.st-you')), 'nobody signed in: This phone and About and help, and a card that says so');
  await p.click('.st-you [data-who="signin"]'); await L.settle(p, 400);
  ok(await p.evaluate(() => location.hash) === '#/prep', 'nobody signed in: Sign in on the card opens Who are you?');
  ok(p.errors.length === 0, 'nobody signed in: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Sections set up: today's section on the card and its own row, changed from Settings
  const cfg = L.seed()[fsKey(['config', 'main'])];
  const extra = { [fsKey(['config', 'main'])]: Object.assign({}, cfg, { kitSecs: [{ id: 'grill', name: 'Grill', off: false }, { id: 'pass', name: 'Pass', off: false }] }) };
  p = await L.open(b, '#/settings', { who: 'ann', extra, init: { content: 'localStorage.setItem("lk.sec.ann", ' + JSON.stringify(JSON.stringify({ d: today, sec: 'grill', name: 'Grill' })) + ');' }, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-row="section"]'), null, 8000);
  ok(await value(p, 'section') === 'Grill' && /Grill today/.test(await L.txt(p, '.st-you .st-role')), 'sections: My section today, Grill, also on the card');
  await L.setRow(p, 'section');
  await p.click('[data-act="stsec"]');
  await L.waitFor(p, () => !!document.querySelector('.ks-b[data-v="pass"]'));
  await p.click('.ks-b[data-v="pass"]');
  await L.waitFor(p, () => (document.querySelector('[data-row="section"] .st-v') || {}).textContent === 'Pass');
  ok(await value(p, 'section') === 'Pass', 'sections: Change section picks Pass, and the row says so');
  ok(p.errors.length === 0, 'sections: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A name with markup in it shows as words on the card (everything from Firestore goes through esc())
  const trap = '<img src=x onerror="window.__bad=1">&Ann';
  const cfg2 = L.seed()[fsKey(['config', 'main'])];
  const named = { [fsKey(['config', 'main'])]: Object.assign({}, cfg2, { people: cfg2.people.map(x => x.id === 'ann' ? Object.assign({}, x, { name: trap }) : x) }) };
  p = await L.open(b, '#/settings', { who: 'ann', extra: named, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.st-you .st-name'));
  ok(await L.txt(p, '.st-you .st-name') === trap && await p.$('.st-you img') === null && !(await p.evaluate(() => window.__bad)), 'a name with markup shows as words on the card');
  ok(await L.txt(p, '.st-you .st-ring') === '<', 'and its first letter as a letter');
  await p.context().close();

  // A computer: group names in a left column, and the QR code to open the book on a phone
  p = await L.open(b, '#/settings', { who: 'ann', width: 1280, height: 900, wait: 1200 });
  ok(await p.$eval('[aria-labelledby="st-g-phone"]', e => e.querySelector('.st-gh').getBoundingClientRect().right < e.querySelector('.st-rows').getBoundingClientRect().left), 'computer: the group names sit in a left column');
  ok(await p.$eval('[data-row="qr"]', e => e.offsetHeight > 0), 'computer: Open on another phone is there');
  await p.context().close();
  p = await L.open(b, '#/settings', { who: 'ann', wait: 1200 });
  ok(await p.$eval('[data-row="qr"]', e => e.offsetHeight === 0), 'phone: no QR code row (it is for scanning from a bigger screen)');
  await p.context().close();

  // Settings rows alternate (head chef, 5 Nov 2026): every second row on screen in a group has a light tint, counted again
  // when a search hides rows and without the QR row on a phone (it shows from 900 px), so two tinted rows never touch. The
  // words sit in from the tint's edge. Kitchen, Overview in the admin panel uses the same rows and stays plain.
  const stripes = q => q.evaluate(() => [...document.querySelectorAll('.st-grp:not([hidden])')].map(g => [...g.querySelectorAll('.st-row')]
    .filter(r => r.getClientRects().length).map(r => getComputedStyle(r).backgroundColor === 'rgba(0, 0, 0, 0)' ? '0' : '1').join('')));
  const alternate = list => list.length > 0 && list.every(x => /^(01)*0?$/.test(x)) && list.some(x => x.indexOf('1') >= 0);
  for (const [who, width, extra] of [['ann', 390, {}], ['admin', 390, { admin: true }], ['admin', 1280, { admin: true }]]) {
    p = await L.open(b, '#/settings', Object.assign({ who: who === 'admin' ? '' : who, width, height: 900, wait: 1500 }, extra));
    await L.settle(p, 500);
    const s0 = await stripes(p);
    ok(alternate(s0), who + ' ' + width + ': rows alternate plain and tinted in every group (' + s0.join(' ') + ')');
    ok(await p.evaluate(() => { const r = document.querySelector('.st-grp .st-row'), l = r && r.querySelector('.st-l'); return !!l && l.getBoundingClientRect().left - r.getBoundingClientRect().left >= 8; }), who + ' ' + width + ': the words sit in from the tint\'s edge');
    if (who === 'admin') {
      await p.fill('#st-find', 'the'); await L.settle(p, 400);
      const s1 = await stripes(p), hid = await p.evaluate(() => document.querySelectorAll('.st-grp:not([hidden]) .st-row[hidden]').length);
      ok(hid > 0 && alternate(s1), who + ' ' + width + ': after a search hides ' + hid + ' rows, the rows left still alternate (' + s1.join(' ') + ')');
      await p.fill('#st-find', ''); await L.settle(p, 300);
    }
    ok(!(await L.overflow(p)), who + ' ' + width + ': no sideways scroll with the tint');
    ok(p.errors.length === 0, who + ' ' + width + ': stripes, no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'kitchen-home', who: '', width: 1280, height: 900, wait: 1600 });
  await L.settle(p, 500);
  ok(await p.evaluate(() => { const r = [...document.querySelectorAll('.k-home .st-row')]; return r.length > 2 && r.every(x => getComputedStyle(x).backgroundColor === 'rgba(0, 0, 0, 0)'); }), 'admin Kitchen, Overview: its rows stay plain');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
