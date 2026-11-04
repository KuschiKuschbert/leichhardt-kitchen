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
    SHARD=2/4 npm test            only every fourth file, starting with the second, so four runners share the work
    QUIET=1                       a file that passes prints one line; a file that fails prints in full
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
// SHARD=k/n: the k-th of n equal shares, by place in the sorted list, so every file runs in exactly one share.
const shard = /^(\d+)\/(\d+)$/.exec(process.env.SHARD || '');
if (shard) {
  const k = +shard[1], n = +shard[2];
  if (!(n >= 1 && k >= 1 && k <= n)) { console.error('SHARD must be k/n with 1 <= k <= n, not ' + process.env.SHARD); process.exit(1); }
  for (let i = files.length - 1; i >= 0; i--) if (i % n !== k - 1) files.splice(i, 1);
}
const quiet = process.env.QUIET === '1', retry = process.env.RETRY === '1';
const jobs = Math.max(1, +process.env.JOBS || Math.min(6, os.cpus().length + 2));
function runFile(f) {
  return new Promise(res => {
    const t0 = Date.now(), out = [];
    const c = spawn(process.execPath, [path.join(__dirname, f)], { env: process.env });
    c.stdout.on('data', d => out.push(d)); c.stderr.on('data', d => out.push(d));
    c.on('exit', code => {
      const s = (Date.now() - t0) / 1000, text = Buffer.concat(out).toString(), ok = code === 0;
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
  if (flaky.length) console.log('\nPassed on retry: ' + flaky.map(r => r.f).join(', '));
  console.log('\n' + (failed.length ? 'FAILED: ' + failed.join(', ') : 'All ' + files.length + ' test files passed.'));
  process.exit(failed.length ? 1 : 0);
})();
