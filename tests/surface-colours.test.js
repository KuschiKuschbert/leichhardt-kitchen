// Approved book surfaces: check real pages, secondary panels and effective text contrast at each layout size.
// Fixtures stay synthetic. Existing journey tests cover writes, permissions and saved drafts.
const L = require('./lib'), M = require('../js/functions');
const { R, ok } = L.results();
const minimumContrast = { all: null, normal: null, outline: null };
const day = L.ymd(new Date(L.NOW)), key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const tokenNames = ['--surface-work', '--surface-work-edge', '--surface-people', '--surface-people-edge', '--surface-paper', '--surface-reference', '--bar'];
const fixture = {
  [key('config', 'main')]: Object.assign({}, L.seed()[key('config', 'main')], {
    prepStandardsEnabled: true, staffSee: { cleaning: true },
    kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }],
    kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }, { id: 'full', name: 'Full day', from: 600, to: 1320 }]
  }),
  [key('team', day)]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'full', sec: 'larder' }],
    br: [{ id: 'sam', sh: 'lunch', at: 825, len: 45 }, { id: 'bo', sh: 'full', at: 810, len: 120 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' },
  [key('orders', day, 'lines', 'ordered')]: { text: 'Lemons', qty: '1 box', recipes: [], addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000,
    ordered: true, orderedBy: 'Sam', orderedAt: L.NOW - 600000, deleted: false },
  [key('todos', 'surface')]: { text: 'Restock service labels', st: 'open', due: day, for: 'sam', from: 'sam', at: L.NOW - 3600000, doneAt: 0, doneBy: '', upd: L.NOW - 3600000, by: 'sam' },
  [key('cleaningTasks', 'surface')]: { root: 'surface', prev: '', next: '', text: 'Wipe coldroom handles', area: 'Coldroom', section: 'larder', sectionName: 'Larder', shared: false,
    dows: [0, 1, 2, 3, 4, 5, 6], guide: '', from: L.NOW - 14 * 86400000, until: 253402178400000, at: L.NOW - 15 * 86400000, by: 'sam' },
  [key('prepStandards', 'surface')]: { sectionId: 'larder', name: 'Slice onions', aliases: ['onions'], minimum: 4, unit: 'tubs', instruction: '[Synthetic saved instruction]',
    recipe: '', archived: false, v: 1, at: L.NOW - 60000, by: 'sam' },
  [key('functions', 'surface')]: M.derive({ v: 1, status: 'confirmed', name: 'Example service', date: day, start: M.kat(day, 825), loc: 'Function room', guests: 40,
    mode: 'all', notes: 'Confirm dietary requests.', kc: '', kcBy: '', kcAt: 0, rounds: [{ at: M.kat(day, 850), note: '' }],
    lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: '', fp: '', qty: 2, u: M.toU([2]) }],
    was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 })
};

async function facts(p, selectors, scopes, outlineSelectors = []) {
  return p.evaluate(({ selectors, scopes, tokenNames, outlineSelectors }) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    // Canvas normalises rgb(), color(srgb), alpha and the shared color-mix() token into the same rendered space.
    const rgba = colour => { context.clearRect(0, 0, 1, 1); context.fillStyle = colour; context.fillRect(0, 0, 1, 1); const c = [...context.getImageData(0, 0, 1, 1).data]; return c.slice(0, 3).concat(c[3] / 255); };
    const over = (a, b) => { const alpha = a[3] + b[3] * (1 - a[3]); return alpha ? [0, 1, 2].map(i => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha).concat(alpha) : [0, 0, 0, 0]; };
    const luminance = c => c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
    const visible = e => !!e && !!e.getClientRects().length && getComputedStyle(e).visibility === 'visible';
    function pair(e, outline) {
      const style = getComputedStyle(e); let foreground = rgba(outline ? style.outlineColor : style.color), background = [0, 0, 0, 0];
      if (outline) foreground[3] *= +style.opacity;
      // Text and empty background pass through every ancestor opacity group, including dimmed list rows.
      for (let node = outline ? e.parentElement : e; node; node = node.parentElement) {
        const st = getComputedStyle(node), bg = rgba(st.backgroundColor), alpha = +st.opacity;
        foreground = over(foreground, bg); background = over(background, bg);
        foreground[3] *= alpha; background[3] *= alpha;
      }
      foreground = over(foreground, [255, 255, 255, 1]); background = over(background, [255, 255, 255, 1]);
      const a = luminance(foreground), b = luminance(background), size = parseFloat(style.fontSize), bold = parseInt(style.fontWeight, 10) >= 700;
      return { background: background.slice(0, 3).map(Math.round), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), threshold: outline ? 3 : size >= 24 || bold && size >= 18.667 ? 3 : 4.5 };
    }
    const tokens = {}, rootStyle = getComputedStyle(document.documentElement), probe = document.createElement('span');
    document.body.appendChild(probe);
    tokenNames.forEach(name => { const exists = !!rootStyle.getPropertyValue(name).trim(); probe.style.backgroundColor = 'var(' + name + ')'; tokens[name] = exists ? rgba(getComputedStyle(probe).backgroundColor).slice(0, 3) : null; });
    probe.remove();
    const surfaces = Object.fromEntries(selectors.map(selector => { const e = document.querySelector(selector); return [selector, visible(e) ? pair(e).background : null]; }));
    const outlines = Object.fromEntries(outlineSelectors.map(selector => {
      const e = document.querySelector(selector), style = e && getComputedStyle(e);
      return [selector, visible(e) ? { ...pair(e, true), width: parseFloat(style.outlineWidth), style: style.outlineStyle,
        keyboard: document.activeElement === e && e.matches(':focus-visible'), name: e.textContent.trim(), action: e.dataset.cln } : null];
    }));
    const text = [], checked = new Set();
    scopes.forEach(selector => {
      document.querySelectorAll(selector).forEach(root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
        while ((node = walker.nextNode())) {
          const e = node.parentElement;
          if (checked.has(node) || !node.textContent.trim() || !visible(e) || e.closest('svg, script, style, :disabled, [aria-hidden="true"]')) continue;
          const box = e.getBoundingClientRect();
          if (box.width <= 1 || box.height <= 1) continue;
          const range = document.createRange(); range.selectNode(node); const rect = range.getBoundingClientRect();
          if (rect.width <= 1 || rect.height <= 1) continue;
          checked.add(node); const reading = pair(e);
          text.push({ text: node.textContent.trim().slice(0, 65), className: String(e.className), ...reading });
        }
      });
    });
    return { surfaces, tokens, text, outlines };
  }, { selectors, scopes, tokenNames, outlineSelectors });
}
const same = (a, b) => !!a && !!b && a.every((value, index) => Math.abs(value - b[index]) <= 1);
function checkSurface(readings, selector, token, label) {
  ok(same(readings.surfaces[selector], readings.tokens[token]), label + ': ' + selector + ' uses ' + token + ' (' + JSON.stringify(readings.surfaces[selector]) + ')');
}
function checkText(readings, label) {
  readings.text.forEach(item => {
    for (const kind of item.threshold === 4.5 ? ['all', 'normal'] : ['all']) {
      if (!minimumContrast[kind] || item.ratio < minimumContrast[kind].ratio) minimumContrast[kind] = { label, ...item };
    }
  });
  const failed = readings.text.filter(item => item.ratio + .005 < item.threshold);
  ok(readings.text.length > 0 && !failed.length, label + ': visible text meets its effective 4.5:1 or large-text 3:1 contrast (' + readings.text.length + ' text runs)' +
    (failed.length ? ' ' + JSON.stringify(failed.slice(0, 8).map(({ text, className, ratio, threshold }) => ({ text, className, ratio: +ratio.toFixed(3), threshold }))) : ''));
}
async function visit(p, route, selector) {
  await p.evaluate(route => { location.hash = route; }, route);
  await L.waitFor(p, selector => !!document.querySelector(selector), selector, 7000);
  await L.settle(p, 180);
}

(async () => {
  const browser = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(browser, '#/prep', { who: 'sam', width, extra: fixture, settings: { view: 'tiles' }, wait: 1200 });
    // Measure settled surfaces in the app's existing reduced-motion mode; motion has its own journey checks.
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await L.waitFor(p, () => !!document.querySelector('.nb-left .nb-row'));
    let reading = await facts(p, ['.nb-left > .nb-ph', '.nb-left .nb-body', '.nb-right', '.nb-right > .nb-ph'], ['.nb-left .nb-ph', '.nb-left .nb-body', '.nb-right']);
    ok(tokenNames.every(name => reading.tokens[name]), width + ': shared surface roles resolve to actual browser colours, including the mixed steel');
    checkSurface(reading, '.nb-left > .nb-ph', '--surface-work', width + ' Prep cover');
    checkSurface(reading, '.nb-left .nb-body', '--surface-paper', width + ' Prep writing page');
    checkSurface(reading, '.nb-right', '--surface-paper', width + ' Handy reference page');
    checkSurface(reading, '.nb-right > .nb-ph', '--surface-reference', width + ' Handy reference heading');
    checkText(reading, width + ' Prep cover, count, metadata and reference');

    await L.pLog(p); await L.waitFor(p, () => !!document.querySelector('.p-sheet.ux-modal'));
    reading = await facts(p, ['.p-sheet.ux-modal'], ['.p-sheet.ux-modal']);
    checkSurface(reading, '.p-sheet.ux-modal', '--surface-paper', width + ' shared add-form frame');
    checkText(reading, width + ' add-form labels and controls');
    await p.keyboard.press('Escape');
    await p.locator('[data-p="ps-view"][data-v="reference"]').click();
    await L.waitFor(p, () => !!document.querySelector('.ps-reference-page .ps-standard'));
    reading = await facts(p, ['.ps-reference-page > .nb-ph', '.ps-reference-page .nb-body'], ['.ps-reference-page']);
    checkSurface(reading, '.ps-reference-page > .nb-ph', '--surface-reference', width + ' Before service reference heading');
    checkSurface(reading, '.ps-reference-page .nb-body', '--surface-paper', width + ' Before service paper');
    checkText(reading, width + ' Before service reference');

    for (const page of [
      { name: 'Orders', route: '#/orders', root: '.o-page:not(.w-page):not(.tr-page)', head: '.o-page > .nb-ph', body: '.o-main', extra: ['.o-ordered'] },
      { name: 'Wastage', route: '#/waste', root: '.w-page', head: '.w-page > .nb-ph', body: '.w-page .nb-body' },
      { name: 'Transfers', route: '#/transfers', root: '.tr-page', head: '.tr-page > .nb-ph', body: '.tr-page .nb-body' },
      { name: 'Cleaning', route: '#/cleaning', root: '.cln-book', head: '.cln-book > .nb-ph', body: '.cln-body', extra: ['.cln-readline'] },
      { name: 'Chef to-do', route: '#/todo', root: '.todo-book', head: '.todo-bookhead', body: '.todo-work', extra: ['.todo-add'] },
      { name: 'Drinks', route: '#/drinks', root: '.dr-book', head: '.dr-bookhead', body: '.dr-work', extra: ['.dr-usual', '.dr-people'] }
    ]) {
      await visit(p, page.route, page.head);
      if (page.name === 'Cleaning') await L.waitFor(p, () => !!document.querySelector('.cln-row'));
      if (page.name === 'Chef to-do') await L.waitFor(p, () => !!document.querySelector('.todo-row'));
      if (page.name === 'Drinks') await L.waitFor(p, () => !!document.querySelector('.dr-order'));
      if (page.name === 'Orders') await L.waitFor(p, () => !!document.querySelector('.o-ordered'));
      const paper = [page.body].concat(page.extra || []);
      reading = await facts(p, [page.head, ...paper], [page.root]);
      checkSurface(reading, page.head, '--surface-work', width + ' ' + page.name + ' cover');
      paper.forEach(selector => checkSurface(reading, selector, '--surface-paper', width + ' ' + page.name + ' paper'));
      checkText(reading, width + ' ' + page.name + ' cover and content');
      if (page.name === 'Cleaning') {
        await p.locator('[data-cln="setup"]').click(); await L.waitFor(p, () => !!document.querySelector('.cln-plan-body'));
        reading = await facts(p, ['.cln-plan > .nb-ph', '.cln-plan-body'], ['.cln-plan']);
        checkSurface(reading, '.cln-plan > .nb-ph', '--surface-work', width + ' Cleaning setup cover');
        checkSurface(reading, '.cln-plan-body', '--surface-paper', width + ' Cleaning setup paper');
        checkText(reading, width + ' Cleaning setup');
        const close = '.cln-plan [data-cln="hide-setup"]';
        await p.locator(close).focus(); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
        const outline = (await facts(p, [], [], [close])).outlines[close];
        if (outline && (!minimumContrast.outline || outline.ratio < minimumContrast.outline.ratio)) minimumContrast.outline = { label: width + ' Cleaning setup Close', ...outline };
        await p.locator(close).click();
        ok(outline && outline.keyboard && outline.width >= 2 && outline.style !== 'none' && outline.ratio >= 3 && outline.name === 'Close' && outline.action === 'hide-setup' &&
          !await p.locator('.cln-plan').count() && await p.locator('.cln-book').isVisible() && await p.evaluate(() => location.hash === '#/cleaning'),
        width + ': keyboard Close outline contrasts with the steel cover at 3:1, and Close still hides only repeat-task setup (' + (outline ? outline.ratio.toFixed(3) : 'missing') + ')');
      }
      ok(!await L.overflow(p), width + ' ' + page.name + ': surface treatment adds no sideways scroll');
    }

    await visit(p, '#/team', '.tm-nhead'); await L.waitFor(p, () => !!document.querySelector('.tm-away-row'));
    reading = await facts(p, ['.tm-nhead', '.tm-work', '.tm-nright', '.tm-away.hm-board'], ['.tm-nbook']);
    checkSurface(reading, '.tm-nhead', '--surface-people', width + ' Team cover');
    checkSurface(reading, '.tm-work', '--surface-paper', width + ' Team planner');
    // This wrapper is display:contents below desktop; its visible children's text is still measured at every size.
    if (width >= 1100) checkSurface(reading, '.tm-nright', '--surface-paper', width + ' Team supporting page');
    checkSurface(reading, '.tm-away.hm-board', '--bar', width + ' live break board');
    checkText(reading, width + ' Team header, small clock/date, draft controls and saved break board');

    await visit(p, '#/', '#hm-with'); await L.waitFor(p, () => !!document.querySelector('.hm-coworkers li') && !!document.querySelector('.hm-sec'));
    reading = await facts(p, ['#hm-with', '#hm-prep', '#hm-day'], ['#hm-with', '#hm-prep', '#hm-day']);
    checkSurface(reading, '#hm-with', '--surface-people', width + ' Home coworkers');
    checkSurface(reading, '#hm-prep', '--surface-work', width + ' Home Prep');
    checkSurface(reading, '#hm-day', '--bar', width + ' Home live day');
    checkText(reading, width + ' Home people, work and live-day text');

    await visit(p, '#/fn/now', '.fn-svc-board');
    reading = await facts(p, ['.fn-svc-board'], ['.fn-svc-board']);
    checkSurface(reading, '.fn-svc-board', '--bar', width + ' function service board');
    checkText(reading, width + ' live function names, countdown and dietary note');

    await visit(p, '#/r/corn', '.card');
    reading = await facts(p, ['.card'], ['.card-head']);
    checkSurface(reading, '.card', '--surface-paper', width + ' recipe reference card');
    checkText(reading, width + ' recipe heading and descriptive text');
    ok(!p.errors.length && !await L.overflow(p), width + ': real surface routes retain fitting pages without browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await browser.close();
  console.log('Lowest rendered contrast: ' + JSON.stringify(minimumContrast));
  L.report(R);
})().catch(error => { console.error(error); console.log(R.join('\n')); process.exit(1); });
