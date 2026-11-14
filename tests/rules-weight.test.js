/*
  The rules stay light enough for Google's compile check (14 Nov 2026, docs/rules-publication.md).
  No browser and no emulator. Runs scripts/rules-weight.cjs on firestore.rules, then on small made-up rules files
  to prove each check catches what it is for. The first case is 13 and 14 Nov 2026: 203 top-level helpers made the
  compile check take about 5 seconds and Google answered 503.
*/
const fs = require('fs'), path = require('path');
const { weigh, LIMITS } = require('../scripts/rules-weight.cjs');
let n = 0, fails = 0;
function ok(cond, msg) { n++; if (cond) console.log('PASS ' + msg); else { fails++; console.log('FAIL ' + msg); } }

const real = weigh(fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'));
console.log(`Rules weight: ${real.bytes} bytes, ${real.top} top-level helpers, ${real.blocks} top-level match blocks.`);
real.warn.forEach(m => console.log('WARN ' + m));
ok(real.fail.length === 0, 'firestore.rules passes the weight check' + (real.fail.length ? ': ' + real.fail.slice(0, 5).join(' | ') : ''));
ok(real.blocks > 50 && real.top > 20, 'the checker reads firestore.rules (it finds its match blocks and helpers)');

function file(body) {
  return "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n" + body + '  }\n}\n';
}
const shared = '    function signedIn() { return request.auth != null; }\n';

let w = weigh(file(shared +
  '    function noteOk(d) { return d.text is string && d.text.matches(\'[a-z]{1,9}\'); }\n' +
  '    match /notes/{id} {\n      allow read: if signedIn();\n      allow create: if signedIn() && noteOk(request.resource.data);\n    }\n' +
  '    match /mail/{id} {\n      allow read: if signedIn();\n    }\n'));
ok(w.fail.length === 1 && /noteOk \(line 5\) is used only by match \/notes\/\{id\}/.test(w.fail[0]), 'a top-level helper used by one block fails, naming the helper and the block');
ok(!w.fail.some(m => /signedIn/.test(m)), 'a helper two blocks use may stay at the top');

w = weigh(file(shared +
  '    match /notes/{id} {\n      function noteOk(d) { return d.text is string && d.text.matches(\'[{]{1,9}\'); }\n' +
  '      allow read: if signedIn();\n      allow create: if signedIn() && noteOk(request.resource.data);\n    }\n' +
  '    match /mail/{id} {\n      allow read: if signedIn();\n    }\n'));
ok(w.fail.length === 0, 'a helper defined inside its block passes, braces inside a string included');

w = weigh(file(shared +
  '    function textOk(s) { return s is string; }\n' +
  '    match /notes/{id} {\n      function noteOk(d) { return textOk(d.text); }\n      allow create: if signedIn() && noteOk(request.resource.data);\n    }\n' +
  '    match /mail/{id} {\n      allow read: if signedIn();\n    }\n'));
ok(w.fail.length === 1 && /textOk .* used only by match \/notes/.test(w.fail[0]), 'a top-level helper reached through a block\'s own helper counts for that block');

w = weigh(file(shared + '    function oldCheck(v) { return v is int; }\n' +
  '    match /notes/{id} {\n      allow read: if signedIn();\n    }\n    match /mail/{id} {\n      allow read: if signedIn();\n    }\n'));
ok(w.fail.length === 1 && /oldCheck is a top-level helper no rule uses/.test(w.fail[0]), 'a top-level helper no rule uses fails');

const many = Array.from({ length: LIMITS.failTop + 1 }, (_, k) => `    function h${k}() { return request.auth != null; }\n`).join('');
const uses = Array.from({ length: LIMITS.failTop + 1 }, (_, k) => `h${k}()`).join(' && ');
w = weigh(file(many + `    match /a/{id} {\n      allow read: if ${uses};\n    }\n    match /b/{id} {\n      allow read: if ${uses};\n    }\n`));
ok(w.fail.length === 1 && /over 110: every rule is checked against each one/.test(w.fail[0]), 'more than ' + LIMITS.failTop + ' top-level helpers fails');

const pad = '    // ' + 'x'.repeat(96) + '\n';
w = weigh(file(shared + pad.repeat(Math.ceil(LIMITS.failBytes / pad.length)) + '    match /a/{id} {\n      allow read: if signedIn();\n    }\n    match /b/{id} {\n      allow read: if signedIn();\n    }\n'));
ok(w.fail.length === 1 && /at or over 200000/.test(w.fail[0]), 'a rules file of ' + LIMITS.failBytes + ' bytes or more fails');
w = weigh(file(shared + pad.repeat(Math.ceil(LIMITS.warnBytes / pad.length)) + '    match /a/{id} {\n      allow read: if signedIn();\n    }\n    match /b/{id} {\n      allow read: if signedIn();\n    }\n'));
ok(w.fail.length === 0 && w.warn.length === 1, 'a rules file over ' + LIMITS.warnBytes + ' bytes warns and still passes');

console.log((n - fails) + ' of ' + n + ' passed');
process.exit(fails ? 1 : 0);
