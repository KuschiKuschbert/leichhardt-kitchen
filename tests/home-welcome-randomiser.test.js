// Varied Home welcomes use authenticated synthetic identities and the existing Queensland calendar.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CFG = key('config', 'main'), ROSTER = key('login', 'roster');
const GENERIC = ['Welcome', 'Hello', 'Hi there', 'G’day'];
const LONG = 'Alexandria Catherine Montgomery-Smythe J';
const title = p => L.txt(p, '#rtitle');
const generic = (words, name = 'Ann') => GENERIC.some(prefix => words === prefix + ', ' + name);
const reads = p => p.evaluate(() => __fake.reads.length);
const zero = () => { Math.random = () => 0; };
async function go(p, hash) {
  await p.evaluate(value => { location.hash = value; }, hash);
  await L.waitFor(p, value => location.hash === value && (value !== '#/' || !!document.querySelector('#rtitle.hm-welcome')), hash);
  await L.settle(p, 350);
}
async function theme(p, selection, motion = 'still') {
  await p.evaluate(value => KB_SEASONAL.configure(value), { selection, motion });
  await L.waitFor(p, id => document.querySelector('#app').dataset.kbTheme === id, selection);
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function rename(p, name) {
  await p.evaluate(([cfg, roster, name]) => {
    const c = JSON.parse(JSON.stringify(__fake.dump()[cfg]));
    c.people.forEach(person => { if (person.id === 'ann') person.name = name; });
    __fake.write(cfg, c);
    __fake.write(roster, Object.fromEntries(['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].filter(k => c[k] !== undefined).map(k => [k, c[k]])));
  }, [CFG, ROSTER, name]);
  await L.waitFor(p, n => LK_PREP.whoName() === n && document.querySelector('#rtitle.hm-welcome')?.textContent.endsWith(', ' + n), name);
}

(async () => {
  const browser = await L.start(); let p;
  async function step(label, task) {
    try { await task(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally {
      if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; }
    }
  }
  async function open(options = {}) {
    p = await L.open(browser, '#/', { who: 'ann', wait: 1600, init: zero, ...options });
    await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.whoName() && !!document.querySelector('#rtitle.hm-welcome') && !!window.KB_SEASONAL);
  }

  for (const example of [
    { prefix: 'Welcome', init: zero },
    { prefix: 'Hello', init: () => { Math.random = () => 0.3; } },
    { prefix: 'Hi there', init: () => { Math.random = () => 0.6; } },
    { prefix: 'G’day', init: () => { Math.random = () => 0.99; } }
  ]) await step('ordinary random choice ' + example.prefix, async () => {
    await open({ init: example.init });
    ok(await title(p) === example.prefix + ', Ann', 'fresh Home can choose ' + example.prefix + ' with the complete name (' + await title(p) + ')');
    if (example.prefix !== 'Welcome') return;
    const before = await title(p), readCount = await reads(p);
    await p.evaluate(() => { window.dispatchEvent(new Event('lk-cfg')); window.dispatchEvent(new Event('lk-art')); });
    await L.settle(p, 500);
    ok(await title(p) === before, 'configuration and full artwork repaint retain the selected phrase');
    ok(await reads(p) === readCount, 'ordinary repaint adds no database reads');
    const mutations = await p.evaluate(async () => {
      let count = 0;
      const observer = new MutationObserver(records => { count += records.length; });
      observer.observe(document.querySelector('#app'), { subtree: true, childList: true, characterData: true });
      for (let i = 0; i < 20; i++) document.dispatchEvent(new Event('kb-seasonal-state'));
      for (let i = 0; i < 8; i++) await new Promise(resolve => requestAnimationFrame(resolve));
      observer.disconnect(); return count;
    });
    ok(await title(p) === before && mutations === 0, 'repeated seasonal notifications leave settled DOM untouched (' + mutations + ' mutations)');
    await rename(p, 'Ana María');
    ok(await title(p) === example.prefix + ', Ana María', 'live rename changes only the full name, not the selected prefix');
    await go(p, '#/recipes'); await go(p, '#/');
    const next = await title(p);
    ok(generic(next, 'Ana María') && next !== example.prefix + ', Ana María', 'returning to Home picks a different phrase even when random values repeat');
    await p.evaluate(() => window.dispatchEvent(new Event('lk-cfg')));
    await L.settle(p, 250);
    ok(await title(p) === next, 'the new visit keeps its phrase through later repaint');
  });

  await step('Queensland calendar and midnight', async () => {
    await open({ clock: Date.parse('2026-11-08T23:59:20+10:00'), tz: 'America/Los_Angeles', seasonal: { selection: 'auto', motion: 'still' } });
    await L.waitFor(p, () => KB_SEASONAL.status().themeId === 'in-diwali' && /Diwali, Ann$/.test(document.querySelector('#rtitle').textContent));
    ok(['Happy Diwali, Ann', 'Diwali wishes, Ann'].includes(await title(p)), '8 November uses the calendar Diwali greeting despite the phone timezone');
    await p.clock.runFor(61000); await L.settle(p, 400);
    await L.waitFor(p, () => LK_TIME.day() === '2026-11-09' && KB_SEASONAL.status().themeId === 'np-tihar' && /Tihar/.test(document.querySelector('#rtitle').textContent));
    ok(['Happy Tihar, Ann', 'Tihar wishes, Ann'].includes(await title(p)), 'Queensland midnight changes Diwali to the continuing Tihar occasion');
    const readCount = await reads(p);
    await theme(p, 'off');
    ok(generic(await title(p)), 'Off immediately restores an ordinary welcome');
    ok(await reads(p) === readCount, 'turning celebration presentation off adds no database reads');
  });

  await step('Christmas, Still and reduced motion', async () => {
    await open({ clock: Date.parse('2026-12-25T14:00:00+10:00'), seasonal: { selection: 'auto', motion: 'gentle' } });
    await L.waitFor(p, () => /Christmas/.test(document.querySelector('#rtitle').textContent));
    const words = await title(p), readCount = await reads(p);
    ok(['Merry Christmas, Ann', 'Christmas wishes, Ann'].includes(words), 'Christmas uses its authored calendar greeting');
    await p.evaluate(() => KB_SEASONAL.configure({ motion: 'still' }));
    await L.settle(p, 250);
    ok(await title(p) === words, 'Still keeps the seasonal wording');
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.evaluate(() => KB_SEASONAL.configure({ motion: 'gentle' }));
    await L.settle(p, 250);
    ok(await title(p) === words, 'reduced motion keeps the seasonal wording');
    ok(await reads(p) === readCount, 'motion changes add no database reads');
  });

  await step('reflective and civic occasions', async () => {
    await open();
    const readCount = await reads(p);
    for (const id of ['bali-nyepi', 'np-buddha-jayanti', 'ph-independence-day']) {
      await theme(p, id);
      ok(generic(await title(p)), id + ': the quiet occasion keeps an ordinary named welcome');
    }
    ok(await reads(p) === readCount, 'occasion presentation adds no database reads');
  });

  await step('clock readiness', async () => {
    await open({ clock: Date.parse('2026-12-25T14:00:00+10:00'), seasonal: { selection: 'auto', motion: 'still' } });
    await p.evaluate(() => { window.__welcomeReady = LK_TIME.ready; LK_TIME.ready = () => false; window.dispatchEvent(new Event('lk-clock')); });
    await L.waitFor(p, () => !KB_SEASONAL.status().themeId);
    await L.settle(p, 250);
    ok(generic(await title(p)), 'an unready corrected clock uses an ordinary welcome');
    await p.evaluate(() => { LK_TIME.ready = window.__welcomeReady; delete window.__welcomeReady; window.dispatchEvent(new Event('lk-clock')); });
    await L.waitFor(p, () => /Christmas/.test(document.querySelector('#rtitle').textContent));
    ok(['Merry Christmas, Ann', 'Christmas wishes, Ann'].includes(await title(p)), 'clock readiness restores the scheduled greeting without another visit');
  });

  await step('Functions-only midnight with celebrations off', async () => {
    const cfg = L.seed()[CFG];
    cfg.people = cfg.people.map(person => person.id === 'ann' ? { ...person, role: 'fnc', add: false, tick: false, fn: true } : person);
    cfg.fnOnlyIds = ['ann']; cfg.fnIds = ['ann']; cfg.addIds = ['sam', 'bo']; cfg.tickIds = ['sam', 'bo'];
    await open({ clock: Date.parse('2026-12-24T23:59:00+10:00'), extra: { [CFG]: cfg }, seasonal: { selection: 'off', motion: 'still' } });
    const before = await title(p);
    ok(!(await p.$('#hm-time')) && (await L.txt(p, '.wall-date')).includes('24 December'), 'Functions-only Home has no live board clock to trigger a repaint');
    // Exercise the controller's existing minute check with the corrected kitchen day moved across midnight.
    await p.evaluate(() => { LK_TIME.day = () => '2026-12-25'; KB_SEASONAL.refresh(); });
    await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await L.settle(p, 250);
    const date = await L.txt(p, '.wall-date');
    ok(date.includes('Friday') && date.includes('25 December'), 'the existing calendar check updates the Functions-only date while celebrations are off (' + date + ')');
    ok(generic(await title(p)) && await title(p) !== before, 'the new kitchen day chooses a fresh ordinary welcome without a board repaint');
  });

  for (const width of [390, 768, 1280]) await step('long seasonal welcome ' + width, async () => {
    const cfg = L.seed()[CFG];
    cfg.people = cfg.people.map(person => person.id === 'ann' ? { ...person, name: LONG } : person);
    await open({ width, settings: { text: 'xlarge' }, extra: { [CFG]: cfg } });
    await theme(p, 'fun-star-wars-day');
    const geometry = await p.evaluate(() => {
      const heading = document.querySelector('#rtitle.hm-welcome'), range = document.createRange();
      range.selectNodeContents(heading);
      const box = heading.getBoundingClientRect();
      return { words: heading.textContent, fits: [...range.getClientRects()].every(r => r.left >= box.left - 1 && r.right <= box.right + 1),
        overflow: document.documentElement.scrollWidth > innerWidth, clipped: getComputedStyle(heading).overflowY !== 'visible' };
    });
    ok(geometry.words === 'May the fourth be with you, ' + LONG, width + ': longest authored prefix keeps the complete long name');
    ok(geometry.fits && !geometry.overflow && !geometry.clipped, width + ': enlarged seasonal greeting wraps within the screen without clipping (' + JSON.stringify(geometry) + ')');
  });

  await browser.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
