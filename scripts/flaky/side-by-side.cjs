// Run click test files side by side under load, to reproduce a flaky test and prove its fix (24 Nov 2026,
// docs/flaky-tests.md). Each round starts every file N times at once, against one Chrome and one server of THIS
// checkout on its own port, and counts the runs that failed and which checks failed. Put an old copy of a test (say
// tests/zz-old.test.js, made from main) next to the new one: both then see the same load in every round.
// Usage, from the repo root:
//   PORT=8961 node scripts/flaky/side-by-side.cjs <file,file,...> [copies at once, 3] [rounds, 4]
//   KEEP=out.txt keeps the FAIL and DIAG lines of every failed run.
// Use the runner's fallback font with FONTCONFIG_FILE=scripts/flaky/fonts-ci.conf, and CHROME as for npm test.
// Never commit a zz- copy: it would run in Click tests.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const T = path.join(__dirname, '..', '..', 'tests');
const files = (process.argv[2] || '').split(',').filter(Boolean), copies = +process.argv[3] || 3, rounds = +process.argv[4] || 4;
if (!files.length) { console.error('Usage: PORT=n node scripts/flaky/side-by-side.cjs <file,file,...> [copies] [rounds]'); process.exit(2); }
const PORT = +process.env.PORT || 8961;
process.env.BASE = 'http://127.0.0.1:' + PORT + '/';
const L = require(path.join(T, 'lib'));
(async () => {
  const server = await new Promise(res => { const s = require(path.join(T, 'serve')); s.on('error', e => { console.error('server: ' + e.message + ' (pick another PORT)'); process.exit(2); }); s.listen(PORT, '127.0.0.1', () => res(s)); });
  const chrome = await L.chromium.launchServer(L.chromeOpts());
  const env = Object.assign({}, process.env, { LK_WS: chrome.wsEndpoint() });
  const stat = {}; files.forEach(f => { stat[f] = { runs: 0, failed: 0, fails: {} }; });
  for (let r = 0; r < rounds; r++) {
    const jobs = [];
    for (let c = 0; c < copies; c++) for (const f of files) jobs.push(f);
    await Promise.all(jobs.map(f => new Promise(res => {
      const c = spawn(process.execPath, [path.join(T, f)], { env }), out = [];
      c.stdout.on('data', d => out.push(d)); c.stderr.on('data', d => out.push(d));
      c.on('exit', code => {
        const s = stat[f], text = Buffer.concat(out).toString(), fl = text.split('\n').filter(l => /^FAIL /.test(l));
        s.runs++;
        if (code !== 0) { s.failed++; if (!fl.length) fl.push('(exit ' + code + ') ' + text.split('\n').slice(-4).join(' / ')); }
        fl.forEach(l => { s.fails[l] = (s.fails[l] || 0) + 1; });
        if (code !== 0 && process.env.KEEP) fs.appendFileSync(process.env.KEEP, '=== ' + f + ' exit ' + code + '\n' + text.split('\n').filter(l => /^(DIAG|FAIL)/.test(l)).join('\n') + '\n');
        res();
      });
    })));
    console.log('round ' + (r + 1) + ': ' + files.map(f => f + ' ' + stat[f].failed + '/' + stat[f].runs).join(', '));
  }
  console.log(JSON.stringify(stat, null, 1));
  await chrome.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
