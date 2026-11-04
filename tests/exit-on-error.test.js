// A click test file that throws stops at once (4 Nov 2026). run.js starts one Chrome and each file connects to it
// (lib.js start), so the open connection keeps node alive. A top-level catch that only sets process.exitCode left a
// 5 second waitFor failure running until the 600 s FILE_TIMEOUT. Pure node, no browser: it reads the test files.
const fs = require('fs'), path = require('path');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
// True when the file stops on an error: its last top-level catch calls process.exit, or it has none (an unhandled
// rejection already ends node with code 1).
function stops(src) {
  const all = [...src.matchAll(/^\}\)\(\)\.catch\(/gm)];
  if (!all.length) return true;
  return /\bprocess\.exit\(/.test(src.slice(all[all.length - 1].index));
}
// the check itself, on small made-up files
ok(!stops('(async () => {\n  await go();\n})().catch(e => { console.error(e); process.exitCode = 1; });\n'), 'a catch that only sets process.exitCode is caught');
ok(!stops('(async () => {\n  await go();\n})().catch(e => { console.error(e); });\n'), 'a catch that only logs is caught');
ok(stops('(async () => {\n  await go();\n})().catch(e => { console.error(e); process.exit(1); });\n'), 'the house pattern passes');
ok(stops('(async () => {\n  await go();\n})().catch(e => {\n  console.error(e);\n  process.exit(1);\n});\n'), 'a catch over several lines passes');
ok(stops('(async () => {\n  await go();\n  L.report(R);\n})();\n'), 'a file with no top-level catch passes');
ok(!stops('(async () => {\n  if (bad) process.exit(1);\n})().catch(e => { process.exitCode = 1; });\n'), 'a process.exit before the catch does not count');
// every test file
const files = fs.readdirSync(__dirname).filter(f => /\.test\.js$/.test(f)).sort();
const hang = files.filter(f => !stops(fs.readFileSync(path.join(__dirname, f), 'utf8')));
ok(files.length > 100, 'the test files were found (' + files.length + ')');
ok(!hang.length, 'every test file ends its top-level catch with process.exit, so a failure stops in seconds' + (hang.length ? ': ' + hang.join(', ') : ''));
R.forEach(r => console.log(r));
const bad = R.filter(r => r.startsWith('FAIL')).length;
console.log(bad + ' failed of ' + R.length);
process.exit(bad ? 1 : 0);
