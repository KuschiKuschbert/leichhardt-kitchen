// Print cards (head chef 19 Nov 2026, docs/print-cards-options/brief.md): chefs only, from Manage Recipes and from
// Print this card on a recipe. Real Chromium PDFs for each paper: the page size, one sheet per PDF page, the allergen
// band and the stamp on every page, the type floor (side-view labels included), nothing cut off, and no reads or writes.
const fs = require('fs'), path = require('path');
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 8000).catch(() => false);
async function go(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 300); }
const label = p => p.evaluate(() => (document.querySelector('[data-rcp="print"]') || {}).textContent || '');
// the biggest cards, a stacked dish and an extra-wide side view
const BIG = ['chicken-adobo', 'grill-board', 'beast-board', 'feast-of-the-feather', 'chicken-parmy'];
const SIZE = { a4p: [595.28, 841.89], a4l: [841.89, 595.28], a5l: [595.28, 419.53] };
const FLOOR = { a4p: 8.5, a4l: 8.5, a5l: 7.9 };

async function pdfOf(p, paper) {
  const bytes = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'shots', 'recipe-print-' + paper + '.pdf'), bytes);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let sized = true, bands = 0, stamps = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i), s = SIZE[paper];
    if (Math.abs(page.view[2] - s[0]) > 1 || Math.abs(page.view[3] - s[1]) > 1) sized = false;
    const t = (await page.getTextContent()).items.map(x => x.str).join('').replace(/\s+/g, '');
    if (/allergens/i.test(t)) bands++;
    if (/Checkthebookforthelatest/.test(t)) stamps++;
  }
  return { pages: doc.numPages, sized, bands, stamps };
}

(async () => {
  const b = await L.start();
  let p;
  try {
    // staff: no Print this card, no Print cards, and the print file is never downloaded
    p = await L.open(b, '#/r/burger', { who: 'bo', extra: cfg(), wait: 1400 });
    ok(!(await p.$('#r-edit a[href^="#/manage/print"]')), 'staff: no Print this card on the recipe');
    await go(p, '#/manage/print'); await L.settle(p, 500);
    ok(/Only the head chef can change recipes/.test(await txt(p, '#rtitle') || '') && !p.urls.some(u => /recipe-print/.test(u)), 'staff: #/manage/print is closed and js/recipe-print.js is never fetched');
    await p.context().close();

    // the head chef on a phone: Print this card opens Print cards with only that card ticked
    p = await L.open(b, '#/r/chicken-adobo', { who: 'ann', extra: cfg(), wait: 1400 });
    const before = await p.evaluate(() => [window.__fake.bill.length, window.__fake.writes.length]);
    ok(!!(await p.$('#r-edit a[href="#/manage/print/chicken-adobo"]')) && !!(await p.$('#r-edit a[href="#/manage/r/chicken-adobo"]')), 'head chef: Print this card sits beside Change this recipe');
    const h = await p.$eval('#r-edit a[href^="#/manage/print"]', a => a.getBoundingClientRect().height);
    ok(h >= 44, 'Print this card is a 44 px target (' + h + ' px)');
    // The print script arrives slowly here, as it can on the live site (19 Nov 2026: the loading title "Opening
    // Print cards" passed the old check, and the ticks were read before the page was drawn).
    await p.route(/js\/recipe-print\.js/, r => new Promise(go => setTimeout(go, 1500)).then(() => r.fallback()));
    await p.click('#r-edit a[href^="#/manage/print"]');
    ok(await wait(p, () => document.querySelector('#rtitle') && /Print cards/.test(document.querySelector('#rtitle').textContent) && !!document.querySelector('[data-rcp="print"]')), 'Print cards opens');
    ok(await wait(p, () => [...document.querySelectorAll('[data-rcp="tick"][aria-pressed="true"]')].map(e => e.getAttribute('data-v')).join() === 'chicken-adobo'), 'only Chicken Adobo is ticked');
    ok(await wait(p, () => /Print 1 card, \d+ pages?/.test((document.querySelector('[data-rcp="print"]') || {}).textContent || '')), 'the button says the page count from the layout: ' + await label(p));

    // a group adds its cards and says so; Untick all clears; Print this card later never carries old ticks
    await p.click('[data-rcp="group"][data-v="m:Specials"]');
    const sp = await p.evaluate(() => window.LK_DATA.menuOrder[0].ids.filter(id => window.LK_APP.byId(id)).length);
    ok(/Ticked Specials/.test(await txt(p, '.rcp-status')) && (await p.$$('[data-rcp="tick"][aria-pressed="true"]')).length >= sp, 'Specials ticks the specials and says so');
    await go(p, '#/manage/print/laksa');
    ok(await wait(p, () => [...document.querySelectorAll('[data-rcp="tick"][aria-pressed="true"]')].map(e => e.getAttribute('data-v')).join() === 'laksa'), 'Print this card on another recipe starts a fresh list (old ticks do not ride along)');

    // paper: three choices, remembered on this device
    ok(await p.evaluate(() => [...document.querySelectorAll('[data-rcp="paper"]')].map(e => e.textContent).join('|')) === 'A4 upright|A4 sideways|A5 sideways', 'paper: A4 upright, A4 sideways, A5 sideways (A5 upright held back)');
    await p.click('[data-rcp="paper"][data-v="a5l"]');
    ok(await p.evaluate(() => localStorage.getItem('lk.rcp.paper')) === 'a5l', 'the paper is kept on this device');

    // print: the snapshot, what was sent by name, and back again after the dialog
    await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
    await wait(p, () => !document.querySelector('[data-rcp="print"]').disabled);
    await p.click('[data-rcp="print"]');
    ok(await wait(p, () => window.__printed === 1 && document.body.classList.contains('rc-printing')), 'Print opens the print dialog with the print copy');
    ok(/Print dialog open: 1 card, \d+ pages?, A5 sideways\. Set the printer's paper to A5/.test(await txt(p, '.rcp-status')), 'it says what was sent, and to set the paper to A5');
    await p.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    ok(await p.evaluate(() => !document.getElementById('rc-print') && !document.body.classList.contains('rc-printing') && !document.querySelector('[data-rcp="print"]').disabled), 'after the dialog the copy goes and Print is ready again');
    const after = await p.evaluate(() => [window.__fake.bill.length, window.__fake.writes.length]);
    ok(JSON.stringify(before) === JSON.stringify(after), 'printing reads and writes nothing (' + before + ' / ' + after + ')');

    // text from the book goes in as text
    await p.evaluate(() => { window.LK_APP.byId('laksa').name = '<b class="trap">Laksa</b>'; });
    await p.click('[data-rcp="print"]');
    await wait(p, () => window.__printed === 2);
    ok(!(await p.$('#rc-print .trap')) && /<b class="trap">/.test(await p.$eval('#rc-print .rcp-nm', e => e.textContent)), 'a recipe name prints as words, never markup');
    await p.evaluate(() => { window.dispatchEvent(new Event('afterprint')); window.LK_APP.byId('laksa').name = 'Coconut Laksa'; });

    // each paper: real PDFs of the biggest cards
    for (const paper of ['a4p', 'a4l', 'a5l']) {
      await go(p, '#/manage'); await go(p, '#/manage/print/chicken-adobo');
      await wait(p, () => !!document.querySelector('[data-rcp="paper"]'));
      await p.click('[data-rcp="paper"][data-v="' + paper + '"]');
      for (const id of BIG.slice(1)) await p.click('[data-rcp="tick"][data-v="' + id + '"]');
      await wait(p, () => !document.querySelector('[data-rcp="print"]').disabled);
      await p.click('[data-rcp="print"]');
      ok(await wait(p, () => document.body.classList.contains('rc-printing'), null, 20000), paper + ': the print copy is laid out');
      const dom = await p.evaluate(() => {
        const sheets = document.querySelectorAll('#rc-print .rcp-sheet');
        const over = [...document.querySelectorAll('#rc-print .rcp-reg, #rc-print .rcp-run, #rc-print .rcp-alg, #rc-print .rcp-foot')].filter(r => r.scrollHeight > r.clientHeight + 1 || r.scrollWidth > r.clientWidth + 1).length;
        let text = 99, side = 99;
        document.querySelectorAll('#rc-print .rcp-sheet *').forEach(e => {
          if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const svg = e.closest('svg');
          if (svg) { if (!svg.closest('.rcp-side')) return; const pt = parseFloat(e.getAttribute('font-size') || 10) * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width * 0.75; side = Math.min(side, pt); return; }
          let z = 1, x = e; while (x) { z *= parseFloat(getComputedStyle(x).zoom || 1) || 1; x = x.parentElement; }
          text = Math.min(text, parseFloat(getComputedStyle(e).fontSize) * 0.75 * z);
        });
        return { sheets: sheets.length, over, text, side, bands: document.querySelectorAll('#rc-print .rcp-alg').length, pg: [...sheets].every(s => /Page \d+ of \d+/.test(s.querySelector('.rcp-pg').textContent)) };
      });
      ok(dom.over === 0, paper + ': nothing is cut off (' + dom.over + ' boxes over)');
      ok(dom.text >= FLOOR[paper] - 0.05 && dom.side >= FLOOR[paper] - 0.05, paper + ': no text under ' + FLOOR[paper] + ' pt (text ' + dom.text.toFixed(1) + ', side-view labels ' + dom.side.toFixed(1) + ')');
      ok(dom.bands === dom.sheets && dom.pg, paper + ': every page has the allergen band and Page x of y');
      const pdf = await pdfOf(p, paper);
      ok(pdf.sized, paper + ': every PDF page is the chosen paper');
      ok(pdf.pages === dom.sheets, paper + ': one sheet is one PDF page (' + dom.sheets + ' sheets, ' + pdf.pages + ' pages)');
      ok(pdf.bands === pdf.pages && pdf.stamps === pdf.pages, paper + ' (' + pdf.bands + ', ' + pdf.stamps + ' of ' + pdf.pages + '): the allergens and "Check the book for the latest" are on every PDF page');
      await p.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    }

    // the page fits every width with no sideways scroll
    for (const w of [390, 768, 1280]) {
      await p.setViewportSize({ width: w, height: 844 }); await L.settle(p, 200);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), w + ' px: no sideways scroll on Print cards');
    }
    ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
    await p.context().close();
  } catch (e) { console.error(e); ok(false, 'no error: ' + e.message); }
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join("\n")); console.error(e); process.exit(1); });
