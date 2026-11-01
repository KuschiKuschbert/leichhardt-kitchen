// A valid cheese name survives the actual prep entry path, while genuine spelling fixes remain reversible.
const L = require('./lib');
const { R, ok } = L.results();
const add = async (p, text) => {
  const before = await p.evaluate(() => Object.keys(window.__fake.dump()));
  await p.fill('#p-text', text);
  await p.press('#p-text', 'Enter');
  await L.waitFor(p, ({ keys, text }) => Object.entries(window.__fake.dump()).some(([path, row]) =>
    /\/days\/[^/]+\/items\/[^/]+$/.test(path) && !keys.includes(path) && (row.orig === text || row.text === text)), { keys: before, text });
  return p.evaluate(({ keys, text }) => Object.entries(window.__fake.dump()).find(([path, row]) =>
    /\/days\/[^/]+\/items\/[^/]+$/.test(path) && !keys.includes(path) && (row.orig === text || row.text === text)), { keys: before, text });
};

(async () => {
  const b = await L.start();
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/prep', { width, wait: 1500 });
    await p.fill('#p-text', 'Cut brie');
    ok(await p.inputValue('#p-text') === 'Cut brie', width + ': the entered cheese name reaches the prep form unchanged');
    const [briePath, brie] = await add(p, 'Cut brie');
    ok(brie.text === 'Cut brie' && !brie.orig, width + ': saving a valid cheese name keeps Cut brie without a correction record (' + JSON.stringify(brie) + ')');

    const [, distinctWords] = await add(p, 'Cut BRIE and make brine');
    ok(distinctWords.text === 'Cut BRIE and make brine' && !distinctWords.orig, width + ': Brie casing and legitimate brine remain distinct valid words');

    const typed = 'Cut brie and slice carorts';
    const [mixedPath, mixed] = await add(p, typed);
    ok(mixed.text === 'Cut brie and slice carrots', width + ': a genuine nearby typo is corrected while brie stays intact (' + mixed.text + ')');
    ok(mixed.orig === typed && await p.locator('[data-p="toast-act"]').isVisible() && /Undo/.test(await L.txt(p, '[data-p="toast-act"]')), width + ': a genuine correction retains the exact original entry and offers Undo');
    await p.click('[data-p="toast-act"]');
    await L.waitFor(p, path => { const row = window.__fake.dump()[path]; return row && row.text === 'Cut brie and slice carorts' && row.orig === ''; }, mixedPath);
    const undone = await p.evaluate(path => window.__fake.dump()[path], mixedPath);
    const earlier = await p.evaluate(path => window.__fake.dump()[path], briePath);
    ok(undone.text === typed && undone.orig === '' && earlier.text === brie.text && (earlier.orig || '') === (brie.orig || ''), width + ': Undo restores the typed entry without changing the earlier line');
    const [, fromNotes] = await add(p, 'Keep rind crumbled');
    ok(fromNotes.text === 'Keep rind crumbled' && !fromNotes.orig, width + ': valid words from existing ingredient notes survive the prep save path (' + fromNotes.text + ')');
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
