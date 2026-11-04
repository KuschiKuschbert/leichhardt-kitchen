/*
  Runs every click test: starts a small local server for the repo, runs the *.test.js files, then stops.
    npm test                       all files, against this folder's copy of the book
    npm test -- recipes lists      only the files whose names contain those words
    BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test
                                   the same tests against the live site (Firebase is still the stand-in)
    JOBS=1 npm test                one file at a time (the default runs up to 6 at once: two more than processors)
  The files share one Chrome, started here, but each page has its own fresh profile and its own stand-in for Firebase,
  so files can run side by side. Most of a file's
  time is spent waiting for the page, so running a few at once cuts the whole run to about a third. A file's output
  is held back and printed in one piece when it ends, so the log reads the same as one at a time. The slowest files
  are listed at the end.
  On GitHub (3 Nov 2026, CLAUDE.md, Keeping usage down):
    SHARD=2/4 npm test            the second of four equal shares of the work, so four runners share it (4 Nov 2026: by
                                  the seconds in tests/timings.json, longest files first, each to the lightest share)
    UPDATE_TIMINGS=1              after the run, write this run's seconds for the files it ran into tests/timings.json
    QUIET=1                       a file that passes prints one line; a file that fails prints in full
    FILE_TIMEOUT=480              a file still running after 480 s is stopped and counted as failed (retried with RETRY)
    RETRY=1                       a file that fails runs once more on its own; passing then is reported as a warning
                                  (named in the run summary and an annotation), never hidden
  With GITHUB_STEP_SUMMARY set, the failures and retries are written to the run's summary and as annotations, so
  the reason a run failed can be read in a few lines instead of the whole log.
*/
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const pick = process.argv.slice(2);
const files = fs.readdirSync(__dirname).filter(f => /\.test\.js$/.test(f) && (!pick.length || pick.some(w => f.indexOf(w) >= 0))).sort();
if (pick.length && !files.length) {
  console.error('No test files matched these filters: ' + pick.map(w => JSON.stringify(w)).join(', ') + '.');
  console.error('Use npm test to run all files, or choose a filename substring.');
  process.exit(1);
}
// How long each file usually takes (tests/timings.json, seconds on GitHub). A file not listed counts as the median, so a
// new test file still lands in exactly one share. Without the file every file counts the same.
const timingsPath = path.join(__dirname, 'timings.json');
let known = {};
try { known = JSON.parse(fs.readFileSync(timingsPath, 'utf8')).seconds || {}; } catch (e) {}
const listed = Object.values(known).filter(v => typeof v === 'number' && v > 0).sort((a, b) => a - b);
const median = listed.length ? listed[Math.floor(listed.length / 2)] : 1;
const cost = f => (typeof known[f] === 'number' && known[f] > 0) ? known[f] : median;
// Longest first: on one runner the slow files start at once instead of finishing last; across runners each file goes to
// the share with the least work so far. The order is fixed (seconds, then name), so every runner works out the same split
// and every file runs in exactly one share.
files.sort((a, b) => cost(b) - cost(a) || (a < b ? -1 : 1));
// SHARD=k/n: the k-th of n shares of about equal seconds.
const shard = /^(\d+)\/(\d+)$/.exec(process.env.SHARD || '');
if (shard) {
  const k = +shard[1], n = +shard[2];
  if (!(n >= 1 && k >= 1 && k <= n)) { console.error('SHARD must be k/n with 1 <= k <= n, not ' + process.env.SHARD); process.exit(1); }
  const load = new Array(n).fill(0), mine = [];
  files.forEach(f => { let b = 0; for (let i = 1; i < n; i++) if (load[i] < load[b]) b = i; load[b] += cost(f); if (b === k - 1) mine.push(f); });
  files.length = 0; files.push(...mine);
  console.log('Share ' + k + ' of ' + n + ': ' + files.length + ' files, about ' + Math.round(load[k - 1] / 60) + ' minutes of work.');
}
const quiet = process.env.QUIET === '1', retry = process.env.RETRY === '1';
// FILE_TIMEOUT=480: a file still running after that many seconds is stopped and counted as failed (then retried with
// RETRY=1), so one hung file cannot hold a whole runner until the job's own limit with no summary (4 Nov 2026).
const fileTimeout = Math.max(0, +process.env.FILE_TIMEOUT || 0) * 1000;
const jobs = Math.max(1, +process.env.JOBS || Math.min(6, os.cpus().length + 2));
function runFile(f) {
  return new Promise(res => {
    const t0 = Date.now(), out = [];
    const c = spawn(process.execPath, [path.join(__dirname, f)], { env: process.env });
    c.stdout.on('data', d => out.push(d)); c.stderr.on('data', d => out.push(d));
    let timedOut = false;
    const timer = fileTimeout ? setTimeout(() => { timedOut = true; c.kill('SIGKILL'); }, fileTimeout) : null;
    c.on('exit', code => {
      if (timer) clearTimeout(timer);
      if (timedOut) out.push(Buffer.from('\nFAIL stopped after ' + fileTimeout / 1000 + ' s (FILE_TIMEOUT): the file did not finish\n'));
      const s = (Date.now() - t0) / 1000, text = Buffer.concat(out).toString(), ok = code === 0 && !timedOut;
      if (quiet && ok) process.stdout.write('ok ' + f + ' (' + s.toFixed(0) + ' s)\n');
      else process.stdout.write('\n=== ' + f + ' (' + s.toFixed(0) + ' s)\n' + text);
      res({ f, ok, s, fails: text.split('\n').filter(l => /^FAIL /.test(l)).slice(0, 5) });
    });
  });
}
(async () => {
  // the server runs in this process, so the test files are started as child processes without blocking it
  const server = process.env.BASE ? null : await new Promise(res => { const s = require('./serve'); s.listen(8777, '127.0.0.1', () => res(s)); });
  // one Chrome for the whole run: the files connect to it (lib.js start) instead of each starting their own
  const L = require('./lib'), chrome = await L.chromium.launchServer(L.chromeOpts());
  process.env.LK_WS = chrome.wsEndpoint();
  const t0 = Date.now(), done = [], queue = files.slice();
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) done.push(await runFile(queue.shift())); }));
  // RETRY=1: each failed file once more, alone, so a busy runner's timing does not cost a whole new run
  const flaky = [];
  if (retry) for (const r of done.filter(r => !r.ok)) {
    process.stdout.write('\nRetrying ' + r.f + ' on its own.\n');
    const again = await runFile(r.f);
    if (again.ok) { r.ok = true; flaky.push(r); }
  }
  await chrome.close();
  if (server) server.close();
  const failed = done.filter(r => !r.ok).map(r => r.f).sort();
  // the short report a session reads first: annotations and the run summary, never the whole log
  const one = t => String(t).replace(/[\r\n%]/g, ' ').slice(0, 300);
  if (process.env.GITHUB_ACTIONS) {
    for (const r of done.filter(r => !r.ok)) console.log('::error title=' + one(r.f) + '::' + one(r.fails.join(' | ') || 'exited with an error, see the log'));
    for (const r of flaky) console.log('::warning title=' + one(r.f) + ' passed on retry::' + one(r.fails.join(' | ') || 'failed once, then passed on its own'));
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = ['### Click tests' + (shard ? ' ' + process.env.SHARD : ''), '',
      failed.length ? '**Failed:** ' + failed.length + ' of ' + files.length + ' files' : 'All ' + files.length + ' files passed.'];
    for (const r of done.filter(r => !r.ok)) md.push('', '- `' + r.f + '`', ...r.fails.map(l => '  - ' + one(l)));
    if (flaky.length) md.push('', '**Passed on retry** (timing on a busy runner, or a real intermittent fault: fix it in its own pull request if it repeats):', ...flaky.map(r => '- `' + r.f + '`: ' + one(r.fails[0] || '')));
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n\n');
  }
  console.log('\nSlowest: ' + done.slice().sort((a, b) => b.s - a.s).slice(0, 5).map(r => r.f + ' ' + r.s.toFixed(0) + ' s').join(', '));
  console.log('Whole run: ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min, ' + jobs + ' at a time.');
  if (process.env.UPDATE_TIMINGS === '1') {
    const seconds = Object.assign({}, known);
    done.forEach(r => { seconds[r.f] = Math.max(1, Math.round(r.s)); });
    let note = '';
    try { note = JSON.parse(fs.readFileSync(timingsPath, 'utf8'))._note || ''; } catch (e) {}
    const sorted = {}; Object.keys(seconds).sort().forEach(f => { sorted[f] = seconds[f]; });
    fs.writeFileSync(timingsPath, JSON.stringify({ _note: note, seconds: sorted }, null, 1) + '\n');
    console.log('Wrote the seconds of ' + done.length + ' files to tests/timings.json.');
  }
  if (flaky.length) console.log('\nPassed on retry: ' + flaky.map(r => r.f).join(', '));
  console.log('\n' + (failed.length ? 'FAILED: ' + failed.join(', ') : 'All ' + files.length + ' test files passed.'));
  process.exit(failed.length ? 1 : 0);
})();
