/*
  How heavy firestore.rules is for Google's compile check (14 Nov 2026, docs/rules-publication.md).
  Google answers the compile check and the ruleset upload with HTTP 503 once compiling takes about 5 seconds. The
  check took 0.4 s on 21 Oct 2026 and 4.3 to 5.4 s on 13 Nov 2026. Bytes and comments barely matter: the time goes to
  type-checking helper functions, and every helper is checked against every other helper it can see. A helper used
  by one collection, defined inside that collection's match block, is seen only there. Moving 127 such helpers into
  their blocks halved the compile time on the emulator (3.5 s to 1.6 s) with every rule and comment unchanged.

  Checks, in order:
  - size: Google refuses a ruleset over 256 KB. Warn from 180 KB, fail from 200 KB.
  - placement: a top-level helper that only one top-level match block reaches (directly or through other helpers)
    belongs inside that block. Fails, naming the helper and the block. A top-level helper no rule uses fails too.
  - top-level helpers: the ones every rule sees. Warn above 90, fail above 110 (75 on 14 Nov 2026).

  node scripts/rules-weight.cjs [file]   prints the weight; exits 1 on a failure. The Click tests run it
  (tests/rules-weight.test.js). Plain node, no packages.
*/
'use strict';
const fs = require('fs'), path = require('path');

const LIMITS = { warnBytes: 180000, failBytes: 200000, warnTop: 90, failTop: 110 };

// Code without comments and string contents, so braces and names inside them do not count. Line breaks are kept.
function bare(line) {
  return line.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/\/\/.*$/, '');
}

function blockEnd(lines, i) {
  let depth = 0;
  for (let j = i; j < lines.length; j++) {
    const s = bare(lines[j]);
    for (const c of s) { if (c === '{') depth++; else if (c === '}') depth--; }
    if (depth === 0) return j;
  }
  throw new Error('Unbalanced braces from line ' + (i + 1));
}

// The documents scope's own items: top-level helpers and top-level match blocks, with their line ranges.
function items(src) {
  const lines = src.split('\n');
  const start = lines.findIndex(l => /^\s*match \/databases\/\{database\}\/documents \{/.test(l));
  if (start < 0) throw new Error('No documents scope found');
  const end = blockEnd(lines, start), indent = (lines[start].match(/^\s*/)[0].length) + 2, out = [];
  for (let i = start + 1; i < end; i++) {
    const l = lines[i];
    if (l.length - l.trimStart().length !== indent) continue;
    const m = l.trim().match(/^(?:function\s+(\w+)|match\s+(\S+))/);
    if (!m) continue;
    const j = blockEnd(lines, i);
    out.push({ kind: m[1] ? 'fn' : 'match', name: m[1] || m[2], from: i, to: j });
    i = j;
  }
  return { lines, items: out };
}

function weigh(src) {
  const { lines, items: all } = items(src);
  const text = it => lines.slice(it.from, it.to + 1).map(bare).join('\n');
  const fns = all.filter(it => it.kind === 'fn'), blocks = all.filter(it => it.kind === 'match');
  const names = new Set(fns.map(f => f.name));
  const called = t => [...t.matchAll(/(?<![\w.])(\w+)\s*\(/g)].map(m => m[1]).filter(n => names.has(n));
  const calls = new Map(fns.map(f => [f.name, new Set(called(text(f).replace(/^[^(]*\(/, '(')).filter(n => n !== f.name))]));
  const reach = new Map(fns.map(f => [f.name, new Set()]));
  blocks.forEach((b, bi) => {
    const seen = new Set(), stack = called(text(b));
    while (stack.length) {
      const n = stack.pop();
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...calls.get(n));
    }
    seen.forEach(n => reach.get(n).add(bi));
  });
  const misplaced = fns.filter(f => reach.get(f.name).size === 1)
    .map(f => ({ name: f.name, line: f.from + 1, block: blocks[[...reach.get(f.name)][0]].name }));
  const unused = fns.filter(f => reach.get(f.name).size === 0).map(f => f.name);
  const bytes = Buffer.byteLength(src, 'utf8');
  const fail = [], warn = [];
  if (bytes >= LIMITS.failBytes) fail.push(`firestore.rules is ${bytes} bytes, at or over ${LIMITS.failBytes}. Google refuses 256 KB.`);
  else if (bytes >= LIMITS.warnBytes) warn.push(`firestore.rules is ${bytes} bytes, over ${LIMITS.warnBytes}.`);
  misplaced.forEach(m => fail.push(`${m.name} (line ${m.line}) is used only by match ${m.block}: define it inside that block.`));
  unused.forEach(n => fail.push(`${n} is a top-level helper no rule uses: remove it.`));
  if (fns.length > LIMITS.failTop) fail.push(`${fns.length} top-level helpers, over ${LIMITS.failTop}: every rule is checked against each one.`);
  else if (fns.length > LIMITS.warnTop) warn.push(`${fns.length} top-level helpers, over ${LIMITS.warnTop}.`);
  return { bytes, top: fns.length, blocks: blocks.length, misplaced, unused, fail, warn };
}

module.exports = { weigh, LIMITS };

if (require.main === module) {
  const file = process.argv[2] || path.join(__dirname, '..', 'firestore.rules');
  const w = weigh(fs.readFileSync(file, 'utf8'));
  console.log(`Rules weight: ${w.bytes} bytes, ${w.top} top-level helpers, ${w.blocks} top-level match blocks.`);
  w.warn.forEach(m => console.log('WARN ' + m));
  w.fail.forEach(m => console.log('FAIL ' + m));
  process.exit(w.fail.length ? 1 : 0);
}
