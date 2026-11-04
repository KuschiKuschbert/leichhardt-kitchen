// The admin page kit (4 Nov 2026, docs/admin-pages-options/brief.md). Part 1: every admin page's controls are one size.
// Part 2: the page tabs are one underlined row with the open tab in view, and long help folds under How this works.
// Opens all 21 admin pages at 390 and 1280 px and measures what a person taps or types into. Example data only.
const L = require('./lib');
const { R, ok } = L.results();
const TABS = ['dashboard', 'overview', 'references', 'training', 'proofreader', 'analysis', 'insights', 'waste', 'transfers', 'learning', 'team',
  'reference-records', 'training-records', 'guides', 'mail', 'notes', 'minutes', 'suppliers', 'cutoffs', 'people', 'tools'];

// Every visible one-line box in the page: its height and width, and a name to report it by.
const boxes = p => p.evaluate(() => [...document.querySelectorAll('.a-pane input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=color]), .a-pane select')]
  .filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden')
  .map(e => { const r = e.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), select: e.tagName === 'SELECT', search: e.type === 'search' || e.classList.contains('search') && !/^a-newpin/.test(e.getAttribute('data-k') || ''), pin: /^a-newpin/.test(e.getAttribute('data-k') || ''), name: e.getAttribute('data-k') || e.id || e.placeholder || e.tagName }; }));
// a button that wraps onto more lines than its words need is taller than one line
const oneLine = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { h: Math.round(r.height), t: e.textContent.trim().slice(0, 24) }; }), sel);

(async () => {
  const b = await L.start();
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: 900, extra: L.mail(), wait: 1600 });
    await L.settle(p, 800);
    const rem = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    for (const t of TABS) {
      await L.adminTab(p, t);
      await L.settle(p, 500);
      // the existing mail pop-up comes up by itself when mail is open; close it like a person would
      await p.evaluate(() => { const x = document.querySelector('.mlp-wrap [data-ml="later"]'); if (x) x.click(); });
      ok(await p.evaluate(() => LK_PREP.state.atab) === t, width + ' ' + t + ': the page opens');
      const all = await boxes(p);
      const tall = all.filter(x => x.h < 40 || x.h > 3.25 * rem + 1);
      ok(!tall.length, width + ' ' + t + ': every text box and dropdown is one line high, 40 to 52 px (' + JSON.stringify(tall) + ')');
      const wide = all.filter(x => x.search && x.w > 36 * rem + 1);
      ok(!wide.length, width + ' ' + t + ': a search box is at most 36rem wide (' + JSON.stringify(wide) + ')');
      // a dropdown is a select or the book's own picker button that stands in for one (js/controls.js)
      const drops = width > 600 ? all.filter(x => x.select && x.w > 20 * rem + 1).concat(await p.evaluate(m => [...document.querySelectorAll('.a-pane .ux-picker-trigger')].filter(e => e.offsetParent && e.getBoundingClientRect().width > m).map(e => ({ w: Math.round(e.getBoundingClientRect().width), t: e.textContent.trim().slice(0, 24) })), 20 * rem + 1)) : [];
      ok(!drops.length, width + ' ' + t + ': a dropdown is at most 20rem wide on a laptop (' + JSON.stringify(drops) + ')');
      const pins = all.filter(x => x.pin && x.w > 14 * rem + 1);
      ok(!pins.length, width + ' ' + t + ': a 4 digit PIN box is short (' + JSON.stringify(pins) + ')');
      if (await p.locator('.a-export > summary').count()) {
        await p.click('.a-export > summary'); await L.settle(p, 200);
        const ex = await oneLine(p, '.a-export > summary, .a-export [data-p="csv"]');
        ok(ex.length === 2 && ex.every(x => x.h <= 52), width + ' ' + t + ': Export and Download CSV each sit on one line (' + JSON.stringify(ex) + ')');
        await p.click('.a-export > summary'); await L.settle(p, 100);
      }
      const pick = await oneLine(p, '.a-pane .a-table .ux-picker-trigger');
      ok(pick.every(x => x.h <= 52), width + ' ' + t + ': a role in the staff table sits on one line (' + JSON.stringify(pick.filter(x => x.h > 52)) + ')');
      // part 2: the page tabs are one row, and the open one can be seen in it
      const row = await p.evaluate(() => { const n = document.querySelector('.a-tabs'); if (!n) return null; const r = n.getBoundingClientRect(), on = n.querySelector('[aria-pressed="true"]'), o = on && on.getBoundingClientRect();
        return { h: Math.round(r.height), inView: !!o && o.left >= r.left - 1 && o.right <= r.right + 1, pill: on ? getComputedStyle(on).borderTopLeftRadius : '' }; });
      if (row) ok(row.h <= 56 && row.inView && row.pill === '0px', width + ' ' + t + ': the page tabs are one underlined row with the open tab in view (' + JSON.stringify(row) + ')');
      ok(!await L.overflow(p), width + ' ' + t + ': no sideways scroll');
    }
    // part 2: one line of help, the rest under How this works, closed until tapped
    for (const [t, words] of [['mail', 'marks everything on it as seen'], ['cutoffs', 'turns orange in the last hour'], ['tools', 'PIN fingerprints']]) {
      await L.adminTab(p, t); await L.settle(p, 400);
      await p.evaluate(() => { const x = document.querySelector('.mlp-wrap [data-ml="later"]'); if (x) x.click(); });
      const h = await p.evaluate(w => { const d = [...document.querySelectorAll('.a-pane details.a-how')].find(x => x.textContent.includes(w)); if (!d) return null; const lead = d.parentElement.querySelector(':scope > .hint');
        return { open: d.open, lead: lead ? Math.round(lead.getBoundingClientRect().height) : 0, line: lead ? parseFloat(getComputedStyle(lead).lineHeight) || 20 : 20 }; }, words);
      ok(h && !h.open && h.lead > 0 && h.lead <= 3 * h.line + 2, width + ' ' + t + ': one short line of help, the rest under How this works (' + JSON.stringify(h) + ')');
    }
    // the Wastage filters hide a box under More filters: open it and measure that too
    await L.adminTab(p, 'waste'); await L.settle(p, 400);
    await p.evaluate(() => { const d = document.querySelector('.wh-filters'); if (d) d.open = true; }); await L.settle(p, 200);
    const more = (await boxes(p)).filter(x => x.h < 40 || x.h > 3.25 * rem + 1);
    ok(!more.length, width + ' waste: the boxes under More filters are one line high (' + JSON.stringify(more) + ')');
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
