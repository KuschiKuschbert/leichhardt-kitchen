// One named Home welcome and a coherent current identity. All names and records are synthetic.
// Historical authors keep their saved names; a live roster rename changes only the current person presentation.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CFG = key('config', 'main'), ROSTER = key('login', 'roster');
const day = L.ymd(new Date(L.NOW)), cutoff = Date.parse(day + 'T04:00:00+10:00');
function named(name, fnOnly) {
  const c = L.seed()[CFG];
  c.people = c.people.map(p => p.id === 'ann' ? { ...p, name, ...(fnOnly ? { role: 'fnc', add: false, tick: false, fn: true } : {}) } : p);
  if (fnOnly) { c.fnOnlyIds = ['ann']; c.fnIds = ['ann']; c.addIds = ['sam', 'bo']; c.tickIds = ['sam', 'bo']; }
  return { [CFG]: c };
}
const title = p => txt(p, '#rtitle');
const reads = p => p.evaluate(() => __fake.reads.length);
async function go(p, route) { await p.evaluate(r => { location.hash = r; }, route); await L.settle(p, 300); }
async function ready(p, name) { await L.waitFor(p, n => window.LK_PREP && LK_PREP.whoName() === n && LK_PREP.privateAccess(), name, 7000); }
async function rename(p, name) {
  await p.evaluate(([cfg, roster, name]) => {
    const c = JSON.parse(JSON.stringify(__fake.dump()[cfg]));
    c.people.forEach(person => { if (person.id === 'ann') person.name = name; });
    __fake.write(cfg, c);
    __fake.write(roster, Object.fromEntries(['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].filter(k => c[k] !== undefined).map(k => [k, c[k]])));
  }, [CFG, ROSTER, name]);
  await ready(p, name); await L.settle(p, 300);
}
async function unlock(p, pin) {
  await p.locator('#pf1').fill(pin);
  await L.waitFor(p, () => LK_PREP.privateAccess(), null, 8000);
  await L.settle(p, 300);
}

(async () => {
  const b = await L.start(); let p;
  async function step(label, task) {
    try { await task(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally {
      if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; }
    }
  }

  for (const width of [390, 768, 1280]) await step('staff welcome ' + width, async () => {
    const name = 'Ana María O’Neill';
    p = await L.open(b, '#/', { who: 'ann', extra: named(name), width, wait: 1500 });
    await ready(p, name);
    ok(await title(p) === 'Welcome, ' + name, width + ': Home welcomes the full stored name (' + await title(p) + ')');
    const date = await txt(p, '.wall-date');
    const weekday = new Date(L.NOW).toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'Australia/Brisbane' });
    ok(date.includes(weekday) && /\d{2}:\d{2}/.test(date), width + ': weekday and kitchen time remain below the welcome (' + date + ')');
    ok(!!(await p.$('#hm-day')) && !!(await p.$('#hm-with')), width + ': existing personal-day and team cards remain');
    ok(!(await L.overflow(p)), width + ': full-name welcome has no sideways scroll');
    await L.tap(p, '.wtop-who');
    ok((await txt(p, '.wm-me-n b')) === name && (await txt(p, '.wm-out b')).includes(name), width + ': menu and Sign out use the complete staff name');
  });

  await step('functions-only welcome', async () => {
    const name = 'Ana María';
    p = await L.open(b, '#/', { who: 'ann', extra: named(name, true), wait: 1500 });
    await ready(p, name);
    ok(await title(p) === 'Welcome, ' + name, 'Functions-only Home receives the same welcome');
    ok(!!(await p.$('#main a[href="#/functions"]')) && !(await p.$('#hm-day')) && !(await p.$('#hm-prep')), 'Functions-only welcome keeps permitted destinations without staff work cards');
  });

  for (const state of [
    { label: 'public visitor', opts: { who: '', noPin: true } },
    { label: 'selected name before PIN', opts: { who: 'ann', noTok: true } },
    { label: 'remembered Google without PIN', opts: { who: '', ownerGoogle: true, adminGrant: false } }
  ]) await step(state.label, async () => {
    p = await L.open(b, '#/', { ...state.opts, wait: 1500 });
    ok(!/^Welcome,/.test(await title(p)), state.label + ': neutral Home does not claim an authenticated person');
    ok(!(await p.$('.wtop-av')) && !/Signed in as/.test(await p.getAttribute('.wtop-who', 'aria-label')), state.label + ': global identity stays neutral');
  });

  await step('live rename and focus', async () => {
    p = await L.open(b, '#/', { who: 'ann', wait: 1800 }); await ready(p, 'Ann');
    await L.tap(p, '.wtop-who');
    await p.locator('.wm a[href="#/settings"]').focus();
    const before = await reads(p);
    await rename(p, 'Ana María');
    ok(await title(p) === 'Welcome, Ana María', 'live rename updates the Home greeting');
    ok((await p.getAttribute('.wtop-who', 'aria-label')).includes('Ana María'), 'live rename updates the hat accessible name');
    ok(await txt(p, '.wm-me-n b') === 'Ana María' && (await txt(p, '.wm-out b') || '').includes('Ana María'), 'already-open menu follows the renamed person');
    ok(await p.evaluate(() => document.activeElement === document.querySelector('.wm a[href="#/settings"]')), 'live rename preserves keyboard focus on the same menu action');
    ok(await reads(p) === before, 'live identity repaint adds no database read (' + before + ' to ' + await reads(p) + ')');
    const oldAuthor = await p.evaluate(k => __fake.dump()[k].addedBy, key('orders', day, 'lines', 'o1'));
    ok(oldAuthor === 'Ann', 'rename leaves the saved historical author unchanged');
    await p.keyboard.press('Escape'); await go(p, '#/settings');
    ok(await txt(p, '.st-name') === 'Ana María', 'Settings agrees with the current full name');
  });

  for (const person of [{ name: '李明', initial: '李' }, { name: 'محمد', initial: 'م' }]) await step('Unicode identity ' + person.name, async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: named(person.name), wait: 1500 }); await ready(p, person.name);
    ok(await title(p) === 'Welcome, ' + person.name, 'Home keeps the full non-Latin name ' + person.name);
    const hat = await txt(p, '.wtop-av');
    await L.tap(p, '.wtop-who'); const menu = await txt(p, '.wm-av');
    await p.keyboard.press('Escape'); await go(p, '#/settings');
    const settings = await txt(p, '.st-ring');
    ok(hat === person.initial && menu === person.initial && settings === person.initial, 'hat, menu and Settings agree on the initial for ' + person.name + ' (' + [hat, menu, settings].join('/') + ')');
  });

  await step('name text remains text', async () => {
    const name = '<img src=x onerror=alert(1)>';
    p = await L.open(b, '#/', { who: 'ann', extra: named(name), wait: 1500 }); await ready(p, name);
    ok(await title(p) === 'Welcome, ' + name, 'HTML-like staff name renders literally in the welcome');
    await L.tap(p, '.wtop-who');
    ok(await txt(p, '.wm-me-n b') === name && !(await p.$('#rtitle img, .wm-me img, .wm-out img')), 'name adds no HTML to the heading or identity menu');
    ok(!(await L.overflow(p)), 'unbroken name text does not overflow the phone');
  });

  // Body overflow can be zero while a long name escapes the menu's own scroll container.
  for (const width of [390, 768]) await step('unbroken full name in menu ' + width, async () => {
    const name = 'W'.repeat(40);
    p = await L.open(b, '#/', { who: 'ann', deviceMode: 'shared', extra: named(name), width, wait: 1500 }); await ready(p, name);
    await L.tap(p, '.wtop-who');
    const geometry = await p.evaluate(() => {
      const measure = sel => { const el = document.querySelector(sel); return { width: el.clientWidth, scroll: el.scrollWidth }; };
      return { menu: measure('.wm'), action: measure('.wm-out') };
    });
    ok(geometry.menu.scroll <= geometry.menu.width + 1, width + ': full-name menu has no internal sideways overflow (' + JSON.stringify(geometry.menu) + ')');
    ok((await txt(p, '.wm-out b')) === 'Not ' + name + '? Sign out' && geometry.action.scroll <= geometry.action.width + 1, width + ': complete Sign out name wraps inside its action (' + JSON.stringify(geometry.action) + ')');
    ok(!(await L.overflow(p)), width + ': unbroken full name also fits the page viewport');
  });

  await step('daily lock and same person', async () => {
    p = await L.open(b, '#/', { who: 'ann', clock: cutoff - 60000, wait: 1500 }); await ready(p, 'Ann');
    await p.clock.runFor(90000); await L.settle(p, 300);
    ok(!/^Welcome,/.test(await title(p)) && !(await p.$('.wtop-av')), '04:00 lock removes the private welcome and current-person mark');
    await go(p, '#/prep'); await unlock(p, '2222'); await go(p, '#/');
    ok(await title(p) === 'Welcome, Ann', 'same-person PIN restores the correct welcome after daily lock');
  });

  await step('shared-screen handover and idle lock', async () => {
    p = await L.open(b, '#/', { who: 'ann', deviceMode: 'shared', wait: 1500 }); await ready(p, 'Ann');
    await L.tap(p, '.wtop-who'); await p.click('.wm-out'); await L.settle(p, 300);
    ok(!/^Welcome,/.test(await title(p)) && !(await p.$('.wtop-av')), 'voluntary handover immediately clears the previous welcome');
    await go(p, '#/prep'); await p.click('.p-name[data-id="bo"]'); await unlock(p, '3333'); await go(p, '#/');
    ok(await title(p) === 'Welcome, Bo' && (await p.getAttribute('.wtop-who', 'aria-label')).includes('Bo'), 'next staff member receives their own welcome and hat identity');
    await L.tap(p, '.wtop-who'); await p.clock.runFor(11 * 60000); await L.settle(p, 300);
    ok(!/^Welcome,/.test(await title(p)) && !(await p.$('.wm')) && !(await p.$('.wtop-av')), 'shared idle lock clears welcome, open menu and person mark');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
