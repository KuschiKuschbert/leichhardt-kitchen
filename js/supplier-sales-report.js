/* Reads product names and quantities in the browser. The file, its other columns and its workbook formulas are never retained. */
(function () {
  'use strict';

  const MAX_FILE = 5 * 1024 * 1024;
  const MAX_XML = 6 * 1024 * 1024;
  const MAX_ROWS = 5000;
  const MAX_PRODUCTS = 1000;
  const MAX_ADJUSTMENTS = 50;
  const MAX_NAME = 180;
  const MAX_ZIP_ENTRIES = 256;
  const INVALID_CELL = Symbol('invalid sales cell');
  const FORMULA = Symbol('formula in sales sheet');
  const TOTAL = /^(?:grand )?totals?$|^sub ?totals?$/i;
  const FILTERS = /^(?:applied filters|filters applied)(?:\s*:|$)/i;
  const DATE_VALUE = '(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4})';
  const DATE_RANGE = new RegExp('^(' + DATE_VALUE + ')\\s*(?:to|[-\\u2013\\u2014])\\s*(' + DATE_VALUE + ')$', 'i');

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function badWorkbook() { fail('xlsx', 'This Excel workbook could not be read. Try exporting the sales report as CSV.'); }
  function tooManyRows() { fail('rows', 'The report has too many rows. Export up to 1,000 product rows.'); }
  function clean(value) { return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''; }
  function key(value) { return clean(value).toLowerCase(); }
  function hasValue(value) {
    return value !== undefined && value !== FORMULA && (typeof value !== 'string' || value.trim() !== '');
  }

  function utf8(bytes, code) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      if (code === 'xlsx') badWorkbook();
      fail('csv', 'This CSV is not saved as UTF-8. Export the sales report as UTF-8 CSV.');
    }
  }

  function* csvRows(text) {
    let cells = [], field = '', quoted = false, closed = false, line = 1;
    function finishField() {
      if (cells.length >= 256) fail('csv', 'The CSV has too many columns.');
      cells.push(field);
      field = '';
      closed = false;
    }
    function csvError() { fail('csv', 'Check the quotation marks in CSV row ' + line + '.'); }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char !== '"') field += char;
        else if (text[i + 1] === '"') { field += char; i++; }
        else { quoted = false; closed = true; }
      } else if (char === ',') {
        finishField();
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        finishField();
        if (line > MAX_ROWS) tooManyRows();
        yield { line: line++, cells };
        cells = [];
      } else {
        if (closed) csvError();
        if (char === '"') {
          if (field !== '') csvError();
          quoted = true;
        } else field += char;
      }
    }
    if (quoted) csvError();
    if (field || closed || cells.length) {
      finishField();
      if (line > MAX_ROWS) tooManyRows();
      yield { line, cells };
    }
  }

  function dateValue(value) {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (!iso && !local) return '';
    const [year, month, day] = (iso ? iso.slice(1) : local.slice(1).reverse()).map(Number);
    const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return '';
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  function collectMetadata(cells, metadata) {
    function add(label, value) {
      if (/^(?:venue|venue name|location|location name)$/i.test(label)) {
        if (!value || value.length > MAX_NAME || /[<>\x00-\x1f\x7f]|[,;]|\s+or\s+/i.test(value)) metadata.venue.set('', '');
        else metadata.venue.set(key(value), value);
      } else if (/^(?:report )?(?:start|from)(?: date)?$/i.test(label)) {
        metadata.start.add(dateValue(value));
      } else if (/^(?:report )?(?:end|to)(?: date)?$/i.test(label)) {
        metadata.end.add(dateValue(value));
      } else if (/^(?:report )?(?:dates?|date range|period)$/i.test(label)) {
        const span = DATE_RANGE.exec(value);
        metadata.start.add(span ? dateValue(span[1]) : '');
        metadata.end.add(span ? dateValue(span[2]) : '');
      }
    }

    const first = cells.findIndex(hasValue);
    if (first < 0 || typeof cells[first] !== 'string') return;
    const content = cells[first].trim();
    if (FILTERS.test(content)) {
      content.replace(FILTERS, '').split(/\r?\n/).forEach(function (line) {
        const filter = /^(.+?)(?:\s*:\s*|\s+is\s+)(.*)$/i.exec(line.trim());
        if (filter) add(clean(filter[1]), clean(filter[2]));
      });
      return;
    }
    const following = cells.slice(first + 1).filter(hasValue);
    if (following.length > 1) return;
    const pair = /^(.+?)(?:\s*:\s*|\s+is\s+)(.*)$/i.exec(content);
    if (pair) add(clean(pair[1]), clean(pair[2]) || clean(following[0]));
    else if (following.length) add(clean(content), clean(following[0]));
  }

  function quantity(value) {
    if (typeof value === 'string') {
      const text = value.trim();
      if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return NaN;
      value = Number(text.replace(/,/g, ''));
    }
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? value : NaN;
  }

  function readReport(records, missingHeaderOk) {
    let nameCol = -1, qtyCol = -1, productCount = 0;
    const found = new Map();
    const adjustments = [];
    const metadata = { venue: new Map(), start: new Set(), end: new Set() };
    for (const { line, cells } of records) {
      if (nameCol < 0) {
        nameCol = cells.findIndex(value => key(value) === 'product name');
        qtyCol = cells.findIndex(value => key(value) === 'quantity');
        if (nameCol >= 0 && qtyCol >= 0) {
          if (cells.filter(value => key(value) === 'product name' || key(value) === 'quantity').length !== 2) {
            fail('columns', 'Use one Product Name column and one Quantity column.');
          }
          continue;
        }
        nameCol = -1;
        collectMetadata(cells, metadata);
        continue;
      }

      const value = cells[nameCol], qtyValue = cells[qtyCol];
      const name = clean(value);
      if (value !== FORMULA && qtyValue !== FORMULA && !cells.some(hasValue)) continue;
      if (TOTAL.test(name)) continue;
      const filter = cells.find(hasValue);
      if (qtyValue !== FORMULA && !hasValue(qtyValue) && typeof filter === 'string' && FILTERS.test(filter.trim())) {
        collectMetadata(cells, metadata);
        continue;
      }
      if (!name || name.length > MAX_NAME || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) {
        fail('name', 'Check Product Name on row ' + line + '. Use a name up to 180 characters.');
      }
      const qty = quantity(qtyValue);
      if (!Number.isFinite(qty)) fail('quantity', 'Check Quantity on row ' + line + '. It must be a number.');
      if (++productCount > MAX_PRODUCTS) tooManyRows();
      if (qty < 0) {
        if (adjustments.length === MAX_ADJUSTMENTS) fail('adjustments', 'The report has more than 50 negative quantities. Export a sales-only report or correct the adjustments and try again.');
        adjustments.push({ name, qty, row: line });
        continue;
      }
      const id = key(name);
      const previous = found.get(id);
      const sum = (previous ? previous.qty : 0) + qty;
      if (sum > Number.MAX_SAFE_INTEGER) fail('quantity', 'The combined quantity is too large on row ' + line + '.');
      if (previous) previous.qty = sum;
      else found.set(id, { name, qty });
    }
    if (nameCol < 0) {
      if (missingHeaderOk) return null;
      fail('columns', 'The sales report needs Product Name and Quantity columns.');
    }
    if (!productCount) fail('empty', 'The sales report has no product rows.');
    if (metadata.venue.size > 1 || metadata.venue.has('')) fail('venue', 'The report names an unclear or mixed venue. Choose a report for one venue.');
    const one = values => values.size === 1 ? values.values().next().value : '';
    let start = one(metadata.start), end = one(metadata.end);
    if (start && end && start > end) { start = ''; end = ''; }
    return { rows: Array.from(found.values()), venue: one(metadata.venue), start, end, adjustments };
  }

  // ZIP names are used only to select XML parts from the archive. They never become network requests.
  function archive(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = offset => view.getUint16(offset, true);
    const u32 = offset => view.getUint32(offset, true);
    let end = bytes.length - 22;
    const floor = Math.max(0, end - 65535);
    while (end >= floor && (u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length)) end--;
    if (end < floor || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) badWorkbook();
    const count = u16(end + 10);
    let offset = u32(end + 16);
    const centralStart = offset;
    if (!count || count > MAX_ZIP_ENTRIES || offset + u32(end + 12) !== end) badWorkbook();

    const parts = new Map();
    for (let i = 0; i < count; i++) {
      if (offset + 46 > end || u32(offset) !== 0x02014b50 || u16(offset + 34)) badWorkbook();
      const nameEnd = offset + 46 + u16(offset + 28);
      const next = nameEnd + u16(offset + 30) + u16(offset + 32);
      if (next > end) badWorkbook();
      const name = utf8(bytes.subarray(offset + 46, nameEnd), 'xlsx');
      if (!name || parts.has(name)) badWorkbook();
      parts.set(name, {
        flags: u16(offset + 8), method: u16(offset + 10), checksum: u32(offset + 16),
        packed: u32(offset + 20), size: u32(offset + 24), local: u32(offset + 42)
      });
      offset = next;
    }
    if (offset !== end) badWorkbook();

    let expanded = 0;
    async function xml(name) {
      const part = parts.get(name);
      if (!part || part.flags & 1 || part.size > MAX_XML || part.local + 30 > centralStart ||
          u32(part.local) !== 0x04034b50 || u16(part.local + 6) !== part.flags ||
          u16(part.local + 8) !== part.method) badWorkbook();
      expanded += part.size;
      if (expanded > 2 * MAX_XML) badWorkbook();
      const nameEnd = part.local + 30 + u16(part.local + 26);
      const data = nameEnd + u16(part.local + 28);
      if (data + part.packed > centralStart || utf8(bytes.subarray(part.local + 30, nameEnd), 'xlsx') !== name) badWorkbook();
      const packed = bytes.subarray(data, data + part.packed);
      const content = part.method === 0 ? packed : await inflate(packed, part);
      if (content.byteLength !== part.size || crc32(content) !== part.checksum) badWorkbook();
      const text = utf8(content, 'xlsx');
      if (/<!\s*(?:doctype|entity)\b/i.test(text)) badWorkbook();
      const document = new DOMParser().parseFromString(text, 'application/xml');
      if (document.getElementsByTagNameNS('*', 'parsererror').length) badWorkbook();
      return document.documentElement;
    }
    return { has: name => parts.has(name), xml };
  }

  const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
    for (let bit = 0; bit < 8; bit++) index = (index & 1 ? 0xedb88320 : 0) ^ (index >>> 1);
    return index;
  });
  function crc32(bytes) {
    let checksum = 0xffffffff;
    for (const byte of bytes) checksum = CRC_TABLE[(checksum ^ byte) & 255] ^ (checksum >>> 8);
    return (checksum ^ 0xffffffff) >>> 0;
  }

  async function inflate(packed, part) {
    if (part.method !== 8) badWorkbook();
    let stream;
    try {
      stream = new DecompressionStream('deflate-raw');
    } catch (_) {
      fail('browser', 'This browser cannot open Excel reports. Try exporting the sales report as CSV.');
    }
    const reader = new Blob([packed]).stream().pipeThrough(stream).getReader();
    const content = new Uint8Array(part.size);
    let written = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (written + value.byteLength > content.byteLength) {
          await reader.cancel();
          badWorkbook();
        }
        content.set(value, written);
        written += value.byteLength;
      }
    } catch (_) {
      badWorkbook();
    } finally {
      reader.releaseLock();
    }
    if (written !== content.byteLength) badWorkbook();
    return content;
  }

  function children(node, tag) { return node ? Array.from(node.children).filter(child => child.localName === tag) : []; }
  function child(node, tag) { return node && Array.from(node.children).find(element => element.localName === tag); }
  function requireTag(node, tag) {
    if (!node || node.localName !== tag) badWorkbook();
    return node;
  }

  function related(source, relation) {
    if (!relation || /external/i.test(relation.getAttribute('TargetMode') || '')) badWorkbook();
    const target = relation.getAttribute('Target');
    if (!target || /[\\:?#\x00-\x1f\x7f]/.test(target)) badWorkbook();
    const path = target.startsWith('/') ? [] : source.split('/').slice(0, -1);
    for (const segment of target.replace(/^\//, '').split('/')) {
      let name;
      try { name = decodeURIComponent(segment); } catch (_) { badWorkbook(); }
      if (name === '..') {
        if (!path.length) badWorkbook();
        path.pop();
      } else if (name !== '.') {
        if (!name || /[\\/:?#\x00-\x1f\x7f]/.test(name)) badWorkbook();
        path.push(name);
      }
    }
    return path.join('/');
  }

  function relationships(node) { return children(requireTag(node, 'Relationships'), 'Relationship'); }
  function relationType(relation, type) { return (relation.getAttribute('Type') || '').endsWith('/' + type); }
  function relsPath(name) {
    const slash = name.lastIndexOf('/') + 1;
    return name.slice(0, slash) + '_rels/' + name.slice(slash) + '.rels';
  }
  function richText(node) {
    if (!node) return INVALID_CELL;
    return Array.from(node.children).map(function (element) {
      if (element.localName === 't') return element.textContent;
      const text = element.localName === 'r' && child(element, 't');
      return text ? text.textContent : '';
    }).join('');
  }

  function cellValue(cell, shared) {
    const kind = cell.getAttribute('t') || 'n';
    if (child(cell, 'f')) return FORMULA;
    if (kind === 'inlineStr') return richText(child(cell, 'is'));
    const source = child(cell, 'v');
    if (!source) return undefined;
    const value = source.textContent;
    if (kind === 's') return /^\d+$/.test(value) && shared[Number(value)] !== undefined ? shared[Number(value)] : INVALID_CELL;
    if (kind === 'str') return value;
    if (kind === 'd') return dateValue(value) || INVALID_CELL;
    if (kind !== 'n' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return INVALID_CELL;
    return Number(value);
  }

  function* sheetRows(sheet, shared) {
    let previousLine = 0, records = 0;
    const data = child(requireTag(sheet, 'worksheet'), 'sheetData');
    if (!data) badWorkbook();
    for (const row of data.children) {
      if (row.localName !== 'row') continue;
      const line = row.hasAttribute('r') ? Number(row.getAttribute('r')) : previousLine + 1;
      if (!Number.isInteger(line) || line <= previousLine || line > 1048576) badWorkbook();
      if (++records > MAX_ROWS) tooManyRows();
      const cells = [];
      let previousCol = -1;
      for (const cell of row.children) {
        if (cell.localName !== 'c') continue;
        let column = previousCol + 1;
        if (cell.hasAttribute('r')) {
          const ref = /^([A-Z]{1,3})([1-9]\d*)$/.exec(cell.getAttribute('r'));
          if (!ref || Number(ref[2]) !== line) badWorkbook();
          column = 0;
          for (const letter of ref[1]) column = column * 26 + letter.charCodeAt(0) - 64;
          column--;
        }
        if (column <= previousCol || column >= 16384) badWorkbook();
        cells[column] = cellValue(cell, shared);
        previousCol = column;
      }
      previousLine = line;
      yield { line, cells };
    }
  }

  async function readWorkbook(bytes) {
    const zip = archive(bytes);
    let workbookPath = 'xl/workbook.xml';
    if (zip.has('_rels/.rels')) {
      const rootLinks = relationships(await zip.xml('_rels/.rels'));
      const office = rootLinks.filter(item => relationType(item, 'officeDocument'));
      if (office.length !== 1) badWorkbook();
      workbookPath = related('', office[0]);
    }
    const workbook = requireTag(await zip.xml(workbookPath), 'workbook');
    const links = relationships(await zip.xml(relsPath(workbookPath)));
    const sheets = children(child(workbook, 'sheets'), 'sheet');
    if (!sheets.length || sheets.length > 40) badWorkbook();
    const preferred = sheets.filter(sheet => key(sheet.getAttribute('name')) === 'sales import');
    if (preferred.length > 1) badWorkbook();
    const stringLinks = links.filter(item => relationType(item, 'sharedStrings'));
    if (stringLinks.length > 1) badWorkbook();
    let shared = [];
    if (stringLinks.length) {
      const strings = requireTag(await zip.xml(related(workbookPath, stringLinks[0])), 'sst');
      shared = children(strings, 'si').map(richText);
    }

    // Sales Import is authoritative when present. Otherwise, require exactly one worksheet with the report headers.
    let result = null;
    for (const sheet of preferred.length ? preferred : sheets) {
      const id = Array.from(sheet.attributes).find(attribute => attribute.localName === 'id' &&
        attribute.namespaceURI && attribute.namespaceURI.endsWith('/relationships'));
      if (!id) badWorkbook();
      const matches = links.filter(item => item.getAttribute('Id') === id.value);
      if (matches.length !== 1) badWorkbook();
      const link = matches[0];
      if (!relationType(link, 'worksheet')) {
        if (preferred.length) badWorkbook();
        continue;
      }
      const sheetPath = related(workbookPath, link);
      const worksheet = await zip.xml(sheetPath);
      const read = readReport(sheetRows(worksheet, shared), !preferred.length);
      if (!read) continue;
      if (result) fail('columns', 'More than one worksheet has sales columns. Export just the sales sheet or name it Sales Import.');
      result = read;
    }
    if (!result) fail('columns', 'The sales report needs Product Name and Quantity columns.');
    return result;
  }

  async function parse(file) {
    const extension = file && /\.(csv|xlsx)$/i.exec(file.name);
    if (!extension || typeof file.arrayBuffer !== 'function') fail('file', 'Choose a CSV or XLSX sales report.');
    if (file.size === 0) fail('empty', 'The sales report is empty.');
    if (file.size > MAX_FILE) fail('file', 'The report is over 5 MB. Export one week of sales and try again.');
    let bytes;
    try { bytes = new Uint8Array(await file.arrayBuffer()); }
    catch (_) { fail('file', 'The sales report could not be opened. Choose the file again.'); }
    if (bytes.length > MAX_FILE) fail('file', 'The report is over 5 MB. Export one week of sales and try again.');
    if (extension[1].toLowerCase() === 'csv') return readReport(csvRows(utf8(bytes, 'csv')), false);
    return readWorkbook(bytes);
  }

  const report = { api: 1, parse };
  if (typeof module === 'object' && module.exports) module.exports = report;
  else window.LK_SUP_SALES_REPORT = report;
})();
