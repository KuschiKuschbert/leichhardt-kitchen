// Download the real reports with synthetic text and legacy numeric records. No spreadsheet formulas are executed.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const key = (...parts) => ['kitchens', L.PIN].concat(parts).join('/');
const text = ['=1+1', '  +SUM(1,2)', '-1+1', '@SUM(1,2)', '\t=1+1', '\r=1+1', '\n=1+1', '\u0000=1+1', '\uFEFF=1+1'];
const ordinary = 'Crème, "large"\rFresh\nNotes';
const extra = L.seed();
extra[key('config', 'main')].people.find(p => p.id === 'ann').name = '@CSV person';
text.concat([ordinary]).forEach((value, i) => {
  extra[key('days', today, 'items', 'csv-' + i)] = { text: value, station: 'Larder', qty: '1 batch', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 60000 - i, done: false, deleted: false };
  extra[key('waste', today, 'lines', 'csv-' + i)] = { text: value, amount: i, unit: 'kg', reason: 'excess', station: 'Larder', action: value, addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 60000 - i, deleted: false };
});
// Legacy data may contain a signed number. Exporting it must not change its type or meaning.
extra[key('transfers', today, 'lines', 'csv-number')] = { text: '=CSV sample', dir: 'out', venue: '@Sample venue', person: 'Sample person', amount: -18.5, unit: 'kg', note: ordinary, addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 60000, deleted: false };
extra[key('transfers', today, 'lines', 'csv-zero')] = { text: 'Zero sample', dir: 'in', venue: 'Sample venue', person: 'Sample person', amount: 0, unit: 'kg', note: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 60000, deleted: false };
extra[key('minutes', 'csv-meeting')] = { no: 1, v: 1, status: 'published', date: today, att: [], acts: [], decisions: 'Synthetic meeting', removed: false, pubAt: L.NOW - 3600000, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };

// Independent CSV reader checks cell boundaries, embedded quotes and CR/LF as well as their decoded values.
function rows(source) {
  const out = [], row = []; let cell = '', quoted = false;
  for (let i = source.charCodeAt(0) === 0xFEFF ? 1 : 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); out.push(row.splice(0)); cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV cell');
  row.push(cell); out.push(row); return out;
}
async function download(p, selector) {
  const button = p.locator(selector);
  if (!(await button.isVisible())) await p.locator('.a-export > summary').click();
  const bill = await p.evaluate(() => __fake.bill.reduce((n, x) => n + x.n, 0));
  const saved = await p.evaluate(() => JSON.stringify(__fake.dump()));
  const pending = p.waitForEvent('download'); await button.click();
  const file = await pending, chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  const source = Buffer.concat(chunks).toString('utf8'), data = rows(source);
  ok(file.suggestedFilename().endsWith('.csv') && source.charCodeAt(0) === 0xFEFF, 'report downloads UTF-8 CSV with its existing filename and BOM');
  ok(data.every(r => r.length === data[0].length), 'CSV preserves every column through quotes, commas and CR/LF');
  ok(await p.evaluate(() => __fake.bill.reduce((n, x) => n + x.n, 0)) === bill, 'export adds no Firestore reads');
  ok(await p.evaluate(() => JSON.stringify(__fake.dump())) === saved, 'export leaves all saved records unchanged');
  return data;
}
function column(data, name) { const i = data[0].indexOf(name); if (i < 0) throw new Error('Missing CSV column ' + name); return data.slice(1).map(r => r[i]); }
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, extra, width: 1280 });
  await L.adminTab(p, 'insights');
  await L.waitFor(p, () => LK_PREP.state.stats && !LK_PREP.state.stats.loading && !LK_PREP.state.stats.miss.length);
  let data = await download(p, '[data-p="csv"][data-v="insights"]');
  let values = column(data, 'Line');
  text.forEach(value => ok(values.includes("'" + value), 'prep text stays literal: ' + JSON.stringify(value)));
  ok(values.includes(ordinary), 'ordinary Unicode, quotes and multiline text round-trip exactly');

  await L.adminTab(p, 'team');
  data = await download(p, '[data-p="csv"][data-v="team"]');
  ok(column(data, 'Person').includes("'@CSV person"), 'team names use the common text boundary');
  ok(column(data, 'Lines written').some(value => /^\d+$/.test(value)), 'numeric report cells remain numbers without text prefixes');

  await L.adminTab(p, 'transfers');
  await L.waitFor(p, () => LK_PREP.state.xStats && !LK_PREP.state.xStats.loading);
  data = await download(p, '[data-p="csv"][data-v="transfers"]');
  ok(column(data, 'Item').includes("'=CSV sample") && column(data, 'Venue').includes("'@Sample venue"), 'transfer items and venues use the same literal-text treatment');
  ok(column(data, 'Amount').includes('-18.5') && column(data, 'Amount').includes('0'), 'signed numeric and zero cells retain their values');
  ok(column(data, 'Note').includes(ordinary), 'transfer notes preserve CR/LF, commas and quotes in one cell');

  await L.adminTab(p, 'minutes');
  await L.waitFor(p, () => !!document.querySelector('[data-p="mn-csv"]:not([disabled])'));
  data = await download(p, '[data-p="mn-csv"]');
  ok(column(data, 'Person').includes("'@CSV person"), 'minutes register names use the common text boundary');

  await L.adminTab(p, 'waste');
  await L.waitFor(p, () => !!document.querySelector('[data-lv="waste-log"]'));
  data = await download(p, '[data-p="csv"][data-v="waste"]');
  values = column(data, 'Item');
  text.forEach(value => ok(values.includes("'" + value), 'wastage text gets exactly one literal prefix: ' + JSON.stringify(value)));
  ok(column(data, 'Action').includes(ordinary) && column(data, 'Amount').includes('0'), 'wastage retains multiline notes and numeric zero');
  ok(p.errors.length === 0, 'CSV journeys have no browser errors ' + p.errors.join(' | '));
  await p.context().close(); await b.close(); L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
