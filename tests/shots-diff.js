/*
  Which screenshots changed. A safety net for look-and-feel work:
    1. Before the change:  SHOTS=1 npm test -- pages   then copy tests/shots/ somewhere (the baseline).
    2. After the change:   SHOTS=1 npm test -- pages   then   node shots-diff.js /path/to/baseline
  It lists every page whose picture differs from the baseline (and any picture that is new or missing),
  so only those need a look. It compares the files byte for byte: a changed page is not a broken page,
  it is one to open and check.
*/
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const base = process.argv[2], mine = path.join(__dirname, 'shots');
if (!base || !fs.existsSync(base)) { console.error('Usage: node shots-diff.js /path/to/baseline-shots'); process.exit(2); }
const hash = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
const names = dir => fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
const a = names(base), b = names(mine), changed = [], added = [], missing = [];
for (const f of b) { if (!a.includes(f)) added.push(f); else if (hash(path.join(base, f)) !== hash(path.join(mine, f))) changed.push(f); }
for (const f of a) if (!b.includes(f)) missing.push(f);
const say = (t, l) => { if (l.length) console.log(t + ' (' + l.length + '):\n  ' + l.join('\n  ')); };
say('Changed', changed); say('New', added); say('Missing', missing);
console.log((changed.length || added.length || missing.length) ? '' : 'No screenshot changed.');
console.log(b.length - changed.length - added.length + ' of ' + b.length + ' pictures are the same as the baseline.');
