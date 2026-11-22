// The Prep reference keeps its daily controls, read result and first task together.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const sections = [
  { id: 'larder', name: 'Larder', off: false },
  { id: 'grill', name: 'Grill and afternoon function prep', off: false }
];
const standard = (sectionId, name) => ({ sectionId, name, aliases: [], minimum: 2, unit: 'trays', instruction: 'Check the labelled date.', recipe: '', archived: false, v: 1, at: L.NOW - 60000, by: 'ann' });
const extra = { [key('config', 'main')]: { ...L.seed()[key('config', 'main')], kitSecs: sections, prepStandardsEnabled: true },
  [key('prepStandards', 'onions')]: standard('larder', 'Slice onions'),
  [key('prepStandards', 'carrots')]: standard('larder', 'Carrots'),
  [key('prepStandards', 'grill-lemons')]: standard('grill', 'Lemon wedges') };
const selectors = {
  section: '.ps-reference .ps-section .ux-picker-trigger, .ps-reference .ps-section select',
  search: '.ps-reference .lv-q', read: '.ps-reference .ps-read [data-ps="refresh"]', add: '.ps-reference [data-ps="add"]'
};
const init = { content: 'localStorage.setItem("lk.sec.bo", ' + JSON.stringify(JSON.stringify({ d: L.ymd(new Date(L.NOW)), sec: 'larder', name: 'Larder' })) + ');' };
const reference = '[data-p="ps-view"][data-v="reference"]';
const reads = p => p.evaluate(() => __fake.reads.filter(path => /\/prepStandards$/.test(path)).length);

(async () => {
  const browser = await L.start();
  for (const [width, height, text] of [[390, 844, 'normal'], [1280, 800, 'normal'], [390, 844, 'xlarge']]) {
    const p = await L.open(browser, '#/prep', { who: 'bo', width, height, extra, init, settings: { text } });
    await p.click(reference);
    await L.waitFor(p, () => !!document.querySelector('.ps-reference [data-ps="add"]:enabled'), null, 8000);
    const view = await p.evaluate(selectors => {
      const bounds = selector => {
        const e = [...document.querySelectorAll(selector)].find(e => !e.hidden && e.offsetWidth && e.offsetHeight);
        if (!e) return null;
        const { y, bottom, width, height } = e.getBoundingClientRect();
        return { y, bottom, width, height };
      };
      window.scrollTo(0, 0);
      return { ...Object.fromEntries(Object.entries(selectors).map(([k, s]) => [k, bounds(s)])),
        headings: [...document.querySelectorAll('.ps-reference-page :is(h2,h3)')].filter(h => h.textContent.trim() === 'Before service').length };
    }, selectors);
    console.log(width + ' ' + text + ' ' + JSON.stringify(view));
    ok(view.headings === 1 && (await p.getAttribute(reference, 'aria-pressed')) === 'true', width + ' ' + text + ': the one page title and selected mode identify Before service');
    ok([view.section, view.search, view.read, view.add].every(r => r && r.height >= 43.9 && r.width >= 43.9) && !(await L.overflow(p)), width + ' ' + text + ': all four controls fit and have 44 px targets');
    if (text === 'normal') {
      ok(view.section && view.search && Math.abs(view.section.bottom - view.search.bottom) < 1, width + ': section and search share one aligned row');
      if (width === 1280) ok(view.read && view.search && Math.abs(view.read.bottom - view.search.bottom) < 1, 'desktop: read freshness and Refresh share the toolbar row');
    }

    const before = await reads(p);
    await p.fill(selectors.search, 'onions');
    await p.press(selectors.search, 'Enter');
    ok(await p.locator('[data-ps-standard]').count() === 1 && await reads(p) === before, width + ' ' + text + ': search filters the current section without a read');
    if (width === 390 && text === 'xlarge') {
      await L.pick(p, '#ps-reference-section', 'grill');
      await L.waitFor(p, () => !!document.querySelector('[data-ps-standard="grill-lemons"]'), null, 8000);
      ok(await p.locator('[data-ps-standard]').count() === 1 && await p.inputValue('#ps-reference-section') === 'grill', 'Extra large: selecting the long section changes the list');
      await p.evaluate(() => { __fake.failReads = /\/prepStandards$/; });
      await p.click(selectors.read);
      await L.waitFor(p, () => /last complete copy/.test(document.querySelector('.ps-reference').textContent), null, 8000);
      ok(await p.locator('.ps-reference [role="alert"]').isVisible() && await p.getByRole('button', { name: 'Try again' }).isVisible() && await p.locator(selectors.add).isDisabled(), 'Extra large: failed refresh keeps and labels the stale list, Retry and disabled Add');
    }
    ok(!p.errors.length, width + ' ' + text + ': no browser errors');
    await p.context().close();
  }
  await browser.close();
  L.report(R);
})().catch(error => { console.log(R.join('\n')); console.error(error); process.exit(1); });
