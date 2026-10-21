// Guides: the staff page (categories, search, a guide's pages read once, a page opened big), the guides box on recipe
// cards and in the recipe search, and the admin Guides tab (photos and a PDF uploaded, changed, replaced, removed).
const L = require('./lib');
const { R, ok } = L.results();
const G = p => ['kitchens', L.PIN, 'guides'].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const S = (page, f) => page.evaluate(f);
const png = { name: 'dishwasher panel.png', mimeType: 'image/png', buffer: Buffer.from(L.PNG.split(',')[1], 'base64') };

/* a small real PDF: one page per text, Helvetica, A4 */
function makePdf(texts) {
  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = '<< /Type /Pages /Kids [' + texts.map((t, i) => (4 + i * 2) + ' 0 R').join(' ') + '] /Count ' + texts.length + ' >>';
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  texts.forEach((t, i) => {
    const st = 'BT /F1 28 Tf 72 720 Td (' + t + ') Tj ET';
    objs[4 + i * 2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + (5 + i * 2) + ' 0 R >>';
    objs[5 + i * 2] = '<< /Length ' + st.length + ' >>\nstream\n' + st + '\nendstream';
  });
  let out = '%PDF-1.4\n';
  const offs = [];
  for (let k = 1; k < objs.length; k++) { offs[k] = out.length; out += k + ' 0 obj\n' + objs[k] + '\nendobj\n'; }
  const x = out.length;
  out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n' + offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n';
  return { name: 'Coolroom checks.pdf', mimeType: 'application/pdf', buffer: Buffer.from(out, 'latin1') };
}
async function choose(p, file) {
  await p.setInputFiles('#g-file', file);
  await L.waitFor(p, () => { const f = window.LK_PREP.state.gf; return f && !f.busy && f.pages && f.pages.length; }, null, 30000);
}
async function saved(p) { await L.waitFor(p, () => !window.LK_PREP.state.gf, null, 15000); await L.settle(p, 150); }

(async () => {
  const b = await L.start();
  const extra = L.guides();
  let p, s;

  // Staff page: only the kitchen PIN is needed (no name or own PIN), removed guides never show
  p = await L.open(b, '#/guides', { who: '', extra, wait: 1500 });
  ok(await p.locator('.g-card').count() === 2, 'guides: two guides listed, the removed one left out, with no name or PIN screen');
  ok(await p.locator('[data-p="g-cat"]').count() === 3, 'guides: category chips All, Equipment and Cleaning');
  await p.click('[data-p="g-cat"][data-v="cleaning"]');
  ok(await p.locator('.g-card').count() === 1 && /Fryer/.test(await p.locator('.g-card').innerText()), 'guides: the Cleaning chip shows only the fryer guide');
  await p.click('[data-p="g-cat"][data-v="all"]');
  await p.fill('#g-q', 'pork belly');
  ok(await p.locator('.g-card').count() === 1 && /PORK BELLY/i.test(await p.locator('.g-snip').innerText()), 'guides: search finds words inside the PDF and shows them');
  ok(await S(p, () => document.activeElement && document.activeElement.id === 'g-q'), 'guides: the search box keeps the cursor while typing');
  await p.fill('#g-q', 'slicer');
  ok(await p.locator('.g-card').count() === 0 && await p.locator('[data-p="g-clear"]').count() === 1, 'guides: a removed guide is not found, and Clear the search is offered');
  await p.click('[data-p="g-clear"]');
  ok(await p.locator('.g-card').count() === 2, 'guides: Clear the search brings both back');

  // One guide: pages read once, then kept; steps; recipe cards it is on; a page opened big
  const before = await S(p, () => window.__fake.readLog.length);
  await p.click('.g-card[href="#/guides/combi"]');
  await L.waitFor(p, () => document.querySelectorAll('.g-pgb img[src^="blob:"]').length === 2, null, 5000).catch(() => {});
  ok(await p.locator('.g-pgb img[src^="blob:"]').count() === 2, 'guide: both pages show');
  const pageReads = await S(p, n => window.__fake.readLog.slice(n).filter(k => /\/pages\//.test(k)).length, before);
  ok(pageReads === 2, 'guide: the two pages are read once (' + pageReads + ')');
  ok(await p.locator('.g-rchip[href="#/r/pork-belly"]').count() === 1 && await p.locator('.g-rchip[href="#/r/rice"]').count() === 1, 'guide: on the recipe cards it names (Pork Belly) and that mention its search word (Rice)');
  await p.click('.g-top a[href="#/guides"]');
  await p.click('.g-card[href="#/guides/combi"]');
  await L.settle(p, 400);
  const again = await S(p, n => window.__fake.readLog.slice(n).filter(k => /\/pages\//.test(k)).length, before);
  ok(again === 2 && await p.locator('.g-pgb img[src^="blob:"]').count() === 2, 'guide: opened again, the pages are not read again');
  await p.click('[data-p="g-zoom"][data-i="0"]');
  ok(await p.locator('.gz-wrap').count() === 1 && /Page 1 of 2/.test(await p.locator('.gz-t').innerText()), 'page big: opens on page 1 of 2');
  await p.click('[data-gz="next"]:visible');
  ok(/Page 2 of 2/.test(await p.locator('.gz-t').innerText()) && await p.locator('[data-gz="next"]:visible').isDisabled(), 'page big: Next goes to page 2, the last');
  await p.click('[data-gz="size"]:visible');
  ok(await p.locator('.gz-body.is-full').count() === 1, 'page big: Full size');
  await p.keyboard.press('Escape');
  ok(await p.locator('.gz-wrap').count() === 0 && !(await S(p, () => document.documentElement.classList.contains('gz-open'))), 'page big: Escape closes it');
  await p.goto(L.BASE + '#/guides/fryer'); await L.settle(p, 600);
  ok(await p.locator('.g-ol li').count() === 3, 'guide: written steps are numbered');
  await p.goto(L.BASE + '#/guides/nope'); await L.settle(p, 600);
  ok(/not found/i.test(await p.locator('#rtitle').innerText()), 'guide: an old link says the guide was not found');
  ok(p.errors.length === 0, 'guides page: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // No kitchen PIN on this phone: the PIN screen opens the guides
  p = await L.open(b, '#/guides', { noPin: true, extra });
  ok(/Open the guides/.test(await p.locator('[data-p="pin-go"]').innerText()), 'guides: with no kitchen PIN the PIN screen says Open the guides');
  await p.context().close();

  // Recipe cards and the recipe search find guides, from the list kept on the phone (no extra reads)
  p = await L.open(b, '#/r/rice', { extra, wait: 2500 });
  // the guide list comes in after the card is drawn (the stand-in loads, then the list), so wait for the link itself
  await L.waitFor(p, () => !!document.querySelector('#r-guides a[href="#/guides/combi"]'), null, 5000).catch(() => {});
  ok(await p.locator('#r-guides a[href="#/guides/combi"]').count() === 1, 'recipe card: Rice (iCombi tip) links to the iCombi guide');
  await p.goto(L.BASE + '#/r/barra'); await L.settle(p, 500);
  ok(await p.locator('#r-guides .box').count() === 0, 'recipe card: a card no guide mentions has no guides box');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 500);
  await p.fill('#find', 'icombi'); await L.settle(p, 300);
  ok(await p.locator('.g-hits a[href="#/guides/combi"]').count() === 1, 'recipe search: "icombi" shows the guide');
  await p.goto(L.BASE + '#/settings'); await L.settle(p, 300);
  await p.goto(L.BASE + '#/r/pork-belly'); await L.settle(p, 500);
  ok(await p.locator('#r-guides a[href="#/guides/combi"]').count() === 1, 'recipe card: Pork Belly (named in the PDF) links to the guide');
  ok(p.errors.length === 0, 'recipe pages: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Admin: add a guide from a photo
  p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, extra, wait: 1800 });
  await L.adminTab(p, 'guides'); await L.settle(p, 300);
  ok(await p.locator('.g-row').count() === 2, 'admin: the Guides tab lists the two guides');
  await p.click('[data-p="g-new"]'); await L.settle(p, 200);
  await p.click('[data-p="g-save"]'); await L.settle(p, 100);
  ok(/title/.test(await p.locator('.g-edit .p-err').innerText()), 'admin: saving with nothing asks for a title');
  await choose(p, png);
  ok(await S(p, () => window.LK_PREP.state.gf.title) === 'dishwasher panel', 'admin: the title starts as the file name');
  await p.fill('#g-title', 'Dishwasher start up');
  await p.click('[data-p="g-save"]'); await L.settle(p, 100);
  ok(/category/.test(await p.locator('.g-edit .p-err').innerText()), 'admin: saving with no category asks for one');
  await p.click('[data-p="g-fcat"][data-v="cleaning"]');
  await p.fill('#g-steps', 'Fill the tank.\nWait for the green light.');
  await p.click('[data-p="g-save"]');
  await saved(p);
  s = await store(p);
  const dk = Object.keys(s).find(k => /\/guides\/[^/]+$/.test(k) && s[k].title === 'Dishwasher start up'), did = dk ? dk.split('/').pop() : '';
  ok(!!dk && s[dk].pages === 1 && s[dk].v === 1 && s[dk].cat === 'cleaning' && /^data:image\/jpeg/.test(s[dk].thumb) && s[dk].dims.length === 1, 'admin photo: the guide is saved with one page and a small picture');
  ok(!!dk && /^data:image\/(webp|jpeg)/.test((s[G([did, 'pages', '0'])] || {}).img || ''), 'admin photo: the page picture is saved on its own');
  ok(/Saved "Dishwasher start up"/.test(await S(p, () => window.LK_PREP.state.gMsg)) && await p.locator('.g-row').count() === 3, 'admin photo: says saved, and the list shows it');

  // Admin: add a guide from a two page PDF (pages drawn and words read by pdf.js)
  await p.click('[data-p="g-new"]'); await L.settle(p, 200);
  await choose(p, makePdf(['Coolroom temperature log', 'Write the time and the reading']));
  const f = await S(p, () => { const x = window.LK_PREP.state.gf; return { n: x.pages.length, text: x.text, title: x.title, w: x.pages[0].w, h: x.pages[0].h }; });
  ok(f.n === 2 && /Coolroom temperature log/.test(f.text) && /reading/.test(f.text), 'admin PDF: two pages drawn and their words read (' + f.n + ', ' + f.text.slice(0, 40) + ')');
  ok(f.h === 2000 && f.w > 1350 && f.w < 1450, 'admin PDF: an A4 page is drawn 2000 px high (' + f.w + ' x ' + f.h + ')');
  await p.click('[data-p="g-pup"][data-i="1"]');
  ok(await S(p, () => window.LK_PREP.state.gf.pages[0].k > window.LK_PREP.state.gf.pages[1].k), 'admin PDF: Earlier moves page 2 to the front');
  await p.click('[data-p="g-pup"][data-i="1"]');
  await p.click('[data-p="g-fcat"][data-v="safety"]');
  await p.click('[data-p="g-save"]');
  await saved(p);
  s = await store(p);
  const ck = Object.keys(s).find(k => /\/guides\/[^/]+$/.test(k) && s[k].title === 'Coolroom checks'), cid = ck ? ck.split('/').pop() : '';
  ok(!!ck && s[ck].pages === 2 && /Coolroom/.test(s[ck].text) && s[ck].file === 'Coolroom checks.pdf' && !!s[G([cid, 'pages', '1'])], 'admin PDF: saved with both pages and its words');

  // Change it: a new file with fewer pages replaces the old one (the spare page is deleted, the version goes up)
  await p.click('[data-p="g-edit"][data-id="' + cid + '"]'); await L.settle(p, 200);
  ok(/Saved now: 2 pages/.test(await p.locator('.g-now').innerText()), 'admin change: says what is saved now');
  await choose(p, png);
  ok(/replace the 2 saved now/.test(await p.locator('.g-now').innerText()), 'admin change: says the new pages replace the old');
  await p.click('[data-p="g-save"]');
  await saved(p);
  s = await store(p);
  ok(s[ck].pages === 1 && s[ck].v === 2 && !s[G([cid, 'pages', '1'])] && s[G([cid, 'pages', '0'])].v === 2, 'admin change: one page, version 2, the spare page deleted');
  // change only the words: the pages and the version stay
  await p.click('[data-p="g-edit"][data-id="' + cid + '"]'); await L.settle(p, 200);
  await p.fill('#g-title', 'Coolroom temperature checks');
  await p.click('[data-p="g-save"]');
  await saved(p);
  s = await store(p);
  ok(s[ck].title === 'Coolroom temperature checks' && s[ck].v === 2 && s[ck].pages === 1, 'admin change: a new title keeps the pages and the version');

  // Remove, with a second tap and Undo
  await p.click('[data-p="g-del"][data-id="' + cid + '"]'); await L.settle(p, 100);
  ok(/Tap again/.test(await p.locator('[data-p="g-del"][data-id="' + cid + '"]').innerText()) && !(await store(p))[ck].removed, 'admin remove: the first tap only asks again');
  await p.click('[data-p="g-del"][data-id="' + cid + '"]'); await L.settle(p, 200);
  ok((await store(p))[ck].removed === true && await p.locator('.g-row').count() === 3, 'admin remove: the second tap removes it from the list');
  await p.click('[data-p="toast-act"]'); await L.settle(p, 300);
  ok((await store(p))[ck].removed === false, 'admin remove: Undo puts it back');

  // Close with unsaved writing asks twice; a refused save keeps everything in the editor
  await p.click('[data-p="g-new"]'); await L.settle(p, 200);
  await p.fill('#g-title', 'Half written');
  await p.click('[data-p="g-cancel"]'); await L.settle(p, 100);
  ok(await S(p, () => !!window.LK_PREP.state.gf) && /Tap again/.test(await p.locator('[data-p="g-cancel"]').innerText()), 'admin: Close with writing in it asks again');
  ok(await S(p, () => window.LK_PREP.unsaved()), 'admin: a guide being written blocks the self-update');
  await p.click('[data-p="g-fcat"][data-v="other"]');
  await p.fill('#g-steps', 'One step.');
  await S(p, () => { window.__fake.mode = 'deny'; });
  await p.click('[data-p="g-save"]'); await L.settle(p, 400);
  ok(/refused/.test(await p.locator('.g-edit .p-err').innerText()) && await p.inputValue('#g-title') === 'Half written', 'admin: a refused save says so and keeps the writing');
  await S(p, () => { window.__fake.mode = 'ok'; });
  // Close is still armed from before (4 seconds), so one tap discards it now; otherwise it takes two
  await p.click('[data-p="g-cancel"]'); await L.settle(p, 100);
  if (await S(p, () => !!window.LK_PREP.state.gf)) { await p.click('[data-p="g-cancel"]'); await L.settle(p, 100); }
  ok(await S(p, () => !window.LK_PREP.state.gf), 'admin: the second tap on Close discards it');
  ok(p.errors.length === 0, 'admin guides: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // The new guide reaches staff: the list is read again when the Guides page opens
  p = await L.open(b, '#/guides', { extra: Object.assign({}, extra, { [G(['new1'])]: { title: 'Slicer cleaning', cat: 'cleaning', sum: '', steps: 'Unplug it.', kw: '', text: '', thumb: '', pages: 0, dims: [], v: 1, file: '', removed: false, at: L.NOW, upd: L.NOW } }), wait: 1500 });
  ok(await p.locator('.g-card').count() === 3 && await p.locator('.g-new').count() === 2, 'guides: a guide added in the last 14 days is marked New');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
