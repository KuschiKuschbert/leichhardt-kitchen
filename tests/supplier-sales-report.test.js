// Synthetic sales reports only. Excel content is read by the browser without an external library.
const assert = require('node:assert/strict');
const path = require('node:path');
const { crc32, deflateRawSync } = require('node:zlib');
const L = require('./lib');
const Parser = require('../js/supplier-sales-report.js');

const { R, ok } = L.results();
const CSV_HEADER = 'Product Name,Quantity\r\n';
const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
const relationshipNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const workbookNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationships = body => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + body + '</Relationships>';
const link = (id, type, target, extra = '') => '<Relationship Id="' + id + '" Type="' + relationshipNS + '/' + type + '" Target="' + target + '"' + extra + '/>';
const sheet = body => xmlHeader + '<worksheet xmlns="' + workbookNS + '"><sheetData>' + body + '</sheetData></worksheet>';
const row = (number, ...cells) => '<row r="' + number + '">' + cells.join('') + '</row>';
const inline = (cell, text) => '<c r="' + cell + '" t="inlineStr"><is><t>' + text + '</t></is></c>';
const value = (cell, text, type = 'n') => '<c r="' + cell + '" t="' + type + '"><v>' + text + '</v></c>';
const csv = input => Parser.parse(new File([input], 'sales.CSV'));

async function test(name, run) {
  try { await run(); ok(true, name); }
  catch (error) { ok(false, name + ': ' + error.message); }
}

// A small standards-shaped ZIP with both stored and deflated parts. Fixtures can falsify one field for rejection checks.
function zip(parts) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, text, options = {}] of parts) {
    const filename = Buffer.from(name);
    const raw = Buffer.from(text);
    const method = options.store ? 0 : 8;
    const packed = options.store ? raw : deflateRawSync(raw);
    const checksum = options.badChecksum ? 0 : crc32(raw);
    const size = options.size ?? raw.length;
    const entry = Buffer.alloc(30);
    entry.writeUInt32LE(0x04034b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(method, 8);
    entry.writeUInt32LE(checksum, 14);
    entry.writeUInt32LE(packed.length, 18);
    entry.writeUInt32LE(size, 22);
    entry.writeUInt16LE(filename.length, 26);
    local.push(entry, filename, packed);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(method, 10);
    directory.writeUInt32LE(checksum, 16);
    directory.writeUInt32LE(packed.length, 20);
    directory.writeUInt32LE(size, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, filename);
    offset += entry.length + filename.length + packed.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(central.reduce((sum, buffer) => sum + buffer.length, 0), 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

const header = row(5, value('D5', '0', 's'), inline('F5', 'Quantity'));
const special = row(2, inline('A2', 'Venue'), inline('B2', 'Fixture Kitchen')) +
  row(3, inline('A3', 'Dates: 2026-11-16 to 2026-11-22')) +
  header +
  row(6, value('D6', '1', 's'), value('F6', '3')) +
  row(8, inline('D8', ' test &amp; greens '), value('F8', '2.5E+0'), inline('H8', 'Fixture commercial cell')) +
  row(9, inline('D9', 'Refunded dish'), value('F9', '-2')) +
  row(10, inline('D10', 'Total'), value('F10', '8')) +
  row(11, '<c r="H11" t="str"><f>unused()</f></c>') +
  row(12, inline('D12', 'Applied filters:&#10;Category is Food'));

function xlsx(body = special, options = {}) {
  const otherBody = options.otherBody ?? row(1, inline('A1', 'Product Name'), inline('B1', 'Quantity')) +
    row(2, inline('A2', 'Product on wrong sheet'), value('B2', '100'));
  return zip([
    ['_rels/.rels', relationships(link('wb', 'officeDocument', 'books/report.xml')), { store: true }],
    ['books/report.xml', xmlHeader + '<workbook xmlns="' + workbookNS + '" xmlns:r="' + relationshipNS + '">' +
      '<sheets><sheet name="Summary" sheetId="1" r:id="sheet1"/><sheet name="' + (options.name || 'Sales Import') +
      '" sheetId="2" r:id="sheet2"/></sheets></workbook>'],
    ['books/_rels/report.xml.rels', relationships(
      link('sheet1', 'worksheet', 'summary.xml') +
      link('sheet2', 'worksheet', options.target || '../data/Sales%20Sheet.xml', options.extraLink || '') +
      link('strings', 'sharedStrings', '../data/strings.xml'))],
    ['books/summary.xml', sheet(otherBody)],
    ['data/Sales Sheet.xml', options.xml ?? sheet(body), options],
    ['data/strings.xml', '<sst xmlns="' + workbookNS + '"><si><t>Product Name</t></si>' +
      '<si><r><t>Test &amp; </t></r><r><t>Greens</t></r></si></sst>']
  ]);
}

(async () => {
  await test('CSV reads BOM, CRLF, named columns, quoted commas, quotes, multiline text and duplicate names', async () => {
    const report = await csv('\uFEFFVenue,Fixture Kitchen\r\nStart Date,16/11/2026\r\nEnd Date,22/11/2026\r\n' +
      'Sale value,Product Name,Quantity\r\nfixture money,"Soup, ""Special""",3\r\n' +
      'ignored,"  sOuP,   ""Special""  ",2\r\nignored,"Rice\r\n bowl","1,202.5"');
    assert.deepEqual(report, {
      rows: [{ name: 'Soup, "Special"', qty: 5 }, { name: 'Rice bowl', qty: 1202.5 }],
      venue: 'Fixture Kitchen', start: '2026-11-16', end: '2026-11-22', adjustments: []
    });
  });
  await test('CSV keeps negatives as explicit adjustments and skips totals and filter text', async () => {
    const report = await csv(CSV_HEADER + 'Test dish,-2\r\nTest dish,5\r\nTest zero,0\r\nGrand total,3\r\n' +
      '"Applied filters:\r\nVenue is Fixture Kitchen\r\nFY Week In Month is 2"\r\n');
    assert.deepEqual(report, {
      rows: [{ name: 'Test dish', qty: 5 }, { name: 'Test zero', qty: 0 }],
      venue: 'Fixture Kitchen', start: '', end: '', adjustments: [{ name: 'Test dish', qty: -2, row: 2 }]
    });
  });
  await test('CSV rejects conflicting venues and leaves invalid dates for confirmation', async () => {
    await assert.rejects(csv('Venue: Fixture One\nLocation: Fixture Two\n' + CSV_HEADER + 'Dish,1'), { code: 'venue' });
    const report = await csv('Dates: 30/02/2026 to 31/02/2026\n' + CSV_HEADER + 'Dish,1');
    assert.deepEqual([report.venue, report.start, report.end], ['', '', '']);
    const reversed = await csv('Dates: 2026-11-22 to 2026-11-16\n' + CSV_HEADER + 'Dish,1');
    assert.deepEqual([reversed.start, reversed.end], ['', '']);
  });
  await test('CSV rejects missing or invalid quantities, missing names, malformed quotes and duplicate headers', async () => {
    for (const [input, code] of [
      ['Gross,Net\n1,2', 'columns'], ['Product Name,Quantity,Quantity\nDish,1,2', 'columns'],
      [CSV_HEADER + 'Dish,', 'quantity'], [CSV_HEADER + 'Dish,good', 'quantity'],
      [CSV_HEADER + 'Dish,2kg', 'quantity'], [CSV_HEADER + 'Dish,9007199254740992', 'quantity'],
      [CSV_HEADER + ',4', 'name'], [CSV_HEADER + '"Dish"suffix,1', 'csv'],
      [CSV_HEADER + '"Dish,1', 'csv'], [CSV_HEADER + 'a'.repeat(181) + ',1', 'name']
    ]) {
      await assert.rejects(csv(input), error => error.code === code && !error.message.includes('2kg'));
    }
  });
  await test('CSV bounds total product rows before combining duplicates and bounds negative adjustments', async () => {
    const atLimit = await csv(CSV_HEADER + 'Dish,1\n'.repeat(1000));
    assert.deepEqual(atLimit.rows, [{ name: 'Dish', qty: 1000 }]);
    await assert.rejects(csv(CSV_HEADER + 'Dish,1\n'.repeat(1001)), { code: 'rows' });
    await assert.rejects(csv(CSV_HEADER + 'Dish,-1\n'.repeat(51)), { code: 'adjustments' });
    await assert.rejects(Parser.parse({ name: 'sales.csv', size: 6 * 1024 * 1024, arrayBuffer: () => assert.fail('Oversized file was read') }), { code: 'file' });
  });

  const browser = await L.start();
  try {
    const page = await (await browser.newContext()).newPage();
    await page.addScriptTag({ path: path.join(__dirname, '..', 'js', 'supplier-sales-report.js') });
    function excel(bytes) {
      return page.evaluate(async data => {
        const parser = window.LK_SUP_SALES_REPORT;
        try {
          return { api: parser.api, report: await parser.parse(new File([new Uint8Array(data)], 'sales.xlsx')) };
        } catch (error) {
          return { code: error.code, message: error.message };
        }
      }, Array.from(bytes));
    }
    await test('XLSX follows package and workbook relationships and prefers Sales Import', async () => {
      const result = await excel(xlsx());
      assert.deepEqual(result, {
        api: 1,
        report: {
          rows: [{ name: 'Test & Greens', qty: 5.5 }], venue: 'Fixture Kitchen', start: '2026-11-16', end: '2026-11-22',
          adjustments: [{ name: 'Refunded dish', qty: -2, row: 9 }]
        }
      });
    });
    await test('XLSX finds the only compatible worksheet and refuses ambiguous sales worksheets', async () => {
      const result = await excel(xlsx(special, { name: 'Weekly Sales', otherBody: row(1, inline('A1', 'Other data')) }));
      assert.equal(result.report.rows[0].qty, 5.5);
      assert.equal((await excel(xlsx(special, { name: 'Weekly Sales' }))).code, 'columns');
      assert.equal((await excel(xlsx(row(1, inline('A1', 'No header'))))).code, 'columns');
    });
    await test('XLSX refuses invalid selected quantities and cached formulas in sales columns', async () => {
      const withQty = quantity => header + row(6, inline('D6', 'Fixture dish'), quantity);
      assert.equal((await excel(xlsx(withQty(value('F6', '#VALUE!', 'e'))))).code, 'quantity');
      assert.equal((await excel(xlsx(withQty('<c r="F6"><f>1+2</f><v>3</v></c>')))).code, 'quantity');
    });
    await test('XLSX refuses corrupt, oversized, external and unparseable workbook parts', async () => {
      for (const workbook of [
        xlsx(special, { badChecksum: true }), xlsx(special, { size: 5 }),
        xlsx(special, { size: 7 * 1024 * 1024 }), xlsx(special, { extraLink: ' TargetMode="External"' }),
        xlsx(special, { xml: sheet(special).replace(xmlHeader, xmlHeader + '<!DOCTYPE worksheet>') }),
        xlsx(special, { xml: '<worksheet><sheetData></worksheet>' }), Buffer.from('not an XLSX')
      ]) assert.equal((await excel(workbook)).code, 'xlsx');
    });
  } finally {
    await browser.close();
  }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
