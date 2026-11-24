// js/avc-reader.js reads an AVC Live recipe card into a recipe draft (19 Nov 2026, docs/second-venue-options/brief.md,
// build step 4, the reader only). Pure node, no browser. Every card here is made up (tests/avc-fixture.js): made-up
// dishes, suppliers, brands, codes and prices in the real cards' layout. The owner's real cards never enter the repo.
const X = require('../js/avc-reader.js');
const { build, pdf, ROWS } = require('./avc-fixture.js');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);

(async () => {
  // ---- a good card ----
  const a = X.read(build());
  const r = a.recipe || { ingredients: [] }, ing = r.ingredients;
  ok(a.ok, 'reads a made-up card in layout A (' + (a.why || '') + ')');
  ok(r.name === 'Test Smoked Burger' && r.avc === 'TEST SMOKED BURGER SEP26 COPY', 'the name drops the season and copy marks; the AVC name keeps them for search (' + r.name + ' | ' + r.avc + ')');
  ok(r.group === 'SPECIAL' && r.kind === null && r.portions === 1 && r.yield === 'Per serve.', 'group as a hint, kind left for the chef, one portion, Per serve.');
  ok(r.flags && r.flags.kind === true && r.flags.allergens === true, 'the card says the kind and the allergens are for the chef');
  ok(ing.length === 5, 'five ingredients, one for each quantity (' + ing.length + ')');
  ok(JSON.stringify(ing.map(i => i.q)) === JSON.stringify(['160 g', '50 ml', '60 ml', '15 g', '0.25']), 'amounts in the book\'s words (' + ing.map(i => i.q).join(', ') + ')');
  ok(ing[0].name === 'Test crispy chips 9mm' && ing[0].avc === '2KX6 TEST CRISPY CHIPS 9MM' && ing[0].flags.length === 0, 'a wrapped product name is one line; the pack size leaves the suggested name and stays in the AVC name');
  ok(ing[1].name === 'House aioli brandco' && ing[1].avc === '1K(4) HOUSE AIOLI BRANDCO' && ing[1].flags.indexOf('code') >= 0, 'a code in a product name ("# 12345") is taken out and the line is flagged');
  ok(ing[2].batch === true && ing[2].flags.indexOf('link') >= 0 && ing[2].name === 'Test gravy batch', 'a "Batch Recipes" row is a house batch to link, never linked by guess');
  ok(ing[3].name === 'Lett test green' && ing[3].flags.indexOf('code') >= 0, '"#8" counts as code-like and is taken out; the pack word at the end goes too');
  ok(ing[4].name === 'Lemons' && ing[4].u === 'pieces' && ing[4].n === 0.25, 'pack words, a bracketed pack size and "- AVC" leave the suggested name');
  ok(ing.every(i => !('tags' in i) && !('none' in i) && !('link' in i)), 'no ingredient comes with allergens or a link: every one is not checked');

  // ---- nothing but names and amounts comes out ----
  const out = JSON.stringify(a);
  ok(!/\$|%|\|/.test(out), 'no money figure, percentage or bar comes out');
  ok(!/999001|ZZ4411|ZZ5522|VV990|123456|9999|bfbr|12345|7000123/.test(out), 'no recipe number, product code, site number or supplier code comes out');
  ok(!/BRANDX|BRANDY|FARMCO|MADE UP FOODS|TOWNSVILLE|VEG SUPPLIER|Batch Recipes|SAUCES|FRUIT/.test(out), 'nothing from the Brand, Supplier or Inventory Group columns comes out');
  ok(!/Menus|listed|Kilojoules|Hotel|example\.invalid|14:33/.test(out), 'nothing from the menus line, the account, the page address or the print time');

  // ---- the other layout, and two pages ----
  const b = X.read(build({ layout: 'B' }));
  ok(b.ok && JSON.stringify(b.recipe.ingredients) === JSON.stringify(ing), 'layout B (larger print, other columns, "Product" over "Code") reads the same (' + (b.why || '') + ')');
  const two = X.read(build({ perPage: 3 }));
  ok(two.ok && JSON.stringify(two.recipe.ingredients) === JSON.stringify(ing), 'a card over two pages with the header repeated reads every row in order (' + (two.why || '') + ')');
  const joined = X.read(build({ total: 'joined', perPage: 3 })), none = X.read(build({ total: 'none' }));
  ok(joined.ok && JSON.stringify(joined.recipe.ingredients) === JSON.stringify(ing), 'a Total line joined into one item still ends the table (' + (joined.why || '') + '; failed on the first version, which looked only for "Total:" alone)');
  ok(none.ok && JSON.stringify(none.recipe.ingredients) === JSON.stringify(ing), 'with no Total line the table ends at the lines that follow it, not in the yield (' + (none.why || '') + ')');
  ok(X.read(build({ dx: 12 })).ok, 'a card printed a little to the right still reads: the columns come from its own header');

  // ---- units and yields ----
  const q = s => X.amount(s);
  ok(q('1100/GRAMS').q === '1.1 kg' && q('1500/MLS').q === '1.5 L' && q('2/PORTION').q === '2 portions' && q('1/PACKET').q === '1 packet' && q('1/EACH').q === '1', 'grams over a kilo as kg, millilitres as L, portions, packets, each as a number');
  ok(q('1/TRAY').q === '[1 tray]' && q('1/TRAY').flag === 'unit', 'a unit the book does not know keeps its amount in brackets and is flagged');
  const batch = X.read(build({ batch: ['1000.00', 'times', '1', 'GRAMS'] }));
  ok(batch.ok && batch.recipe.yield === 'Batch: 1 kg.' && batch.recipe.makes.n === 1000 && batch.recipe.makes.u === 'g', 'This batch makes 1000 grams: Batch: 1 kg.');
  ok(X.read(build({ batch: ['20.00', 'times', '1', 'EACH'] })).recipe.yield === 'Batch: 20 portions.', 'twenty each: Batch: 20 portions.');
  ok(X.read(build({ group: 'PLEASE SELECT' })).recipe.group === null && X.read(build({ group: '' })).recipe.group === null, 'a group of PLEASE SELECT, or none, is no hint at all');
  ok(X.read(build({ name: ['TEST FISH MAIN (160G)(QLD)', 'PP S26'] })).recipe.name === 'Test Fish Main (160g)', 'a venue mark stuck to a word, PP and S26 leave the name');
  ok(X.read(build({ name: ['TEST BBQ G&T WINGS OCT26F'] })).recipe.name === 'Test BBQ G&T Wings', 'BBQ and G&T stay in capitals; OCT26F goes');

  // ---- fails closed: nothing comes out, and the message names no cell ----
  const refused = (o, why, label) => {
    const x = X.read(typeof o === 'function' ? o() : build(o));
    ok(!x.ok && !x.recipe && why.test(x.why || '') && !/CRISPY|AIOLI|GRAVY|LEMONS|LETT|160|GRAMS/.test(x.why || ''), 'refused: ' + label + ' ("' + (x.why || 'read it') + '")');
  };
  refused(() => [], /no pages/, 'no pages');
  refused(() => 'not a card', /no pages/, 'not a list of pages');
  refused(() => Array(7).fill(build()[0]), /more than 6 pages/, 'too many pages');
  refused({ noRecipeId: true }, /not an AVC Live recipe card/, 'a page without the card\'s labels');
  refused({ noTable: true }, /no ingredient table/, 'a card without the table header');
  refused({ name: [''] }, /no recipe name/, 'a card without a name');
  refused({ name: ['COPY SEP26'] }, /no recipe name/, 'a name that is only marks');
  refused({ noYield: true }, /This batch makes/, 'no "This batch makes" line');
  refused({ batch: ['1.00', 'times', '1', 'TRAYS'] }, /not an amount the book knows/, 'a yield in a unit the book does not know');
  refused({ edit: rs => { rs[1].qty = '50 MLS'; return rs; } }, /row 2: the quantity is not written/, 'a quantity written another way');
  refused({ edit: rs => { rs[2].qty = ''; return rs; } }, /a product name has no quantity/, 'a product name without its quantity');
  refused({ edit: rs => { rs[0].prod = []; return rs; } }, /row 1: a quantity has no product name/, 'a quantity without its product name');
  refused({ edit: rs => { rs[0].qty = '0/GRAMS'; return rs; } }, /zero/, 'a quantity of nothing');
  refused({ rows: Array.from({ length: 81 }, (_, i) => Object.assign({}, ROWS[0], { prod: ['ITEM ' + i] })), perPage: 14 }, /more than 80 ingredients/, 'more than 80 ingredients');

  // ---- through pdf.js, the way the phone will read it ----
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: pdf(build({ perPage: 3 })), verbosity: 0 }).promise;
  const viaPdf = await X.fromPdf(doc);
  ok(viaPdf.ok && JSON.stringify(viaPdf.recipe.ingredients.map(i => [i.q, i.name, i.flags])) === JSON.stringify(ing.map(i => [i.q, i.name, i.flags])), 'a made-up two-page PDF read through pdf.js gives the same draft (' + (viaPdf.why || '') + ')');
  ok((await X.fromPdf({ numPages: 0 })).why === 'The file has no pages.', 'fromPdf: a document with no pages');
  ok(/could not be read/.test((await X.fromPdf({ numPages: 1, getPage: () => Promise.reject(new Error('x')) })).why), 'fromPdf: a page that will not open says the file could not be read');
  ok((await X.fromPdf({ numPages: 9 })).why === 'The card has more than 6 pages.', 'fromPdf: too many pages is refused before any page is read');

  // ---- text cleaning ----
  const s = X.scrub('*#1.62K(8) <b>HI</b> MELT $4.20 12% # 99 A_B 123456 SLICES');
  ok(JSON.stringify(s.words) === JSON.stringify(['1.62K(8)', 'b', 'HI', '/b', 'MELT', 'SLICES']), 'scrub: markup brackets, money, percentages and codes are taken out; a pack size keeps its number (' + s.words.join(' ') + ')');
  ok(s.coded === true, 'scrub: says a code or price was taken out');

  R.forEach(x => console.log(x));
  const bad = R.filter(x => x.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
