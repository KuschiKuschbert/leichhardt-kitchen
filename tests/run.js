/*
  Runs every click test: starts a small local server for the repo, runs the *.test.js files, then stops.
    npm test                       all files, against this folder's copy of the book
    npm test -- recipes lists      only the files whose names contain those words
    BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test
                                   the same tests against the live site (Firebase is still the stand-in)
    JOBS=1 npm test                one file at a time (the default runs up to 4 at once, one per processor)
  Each file has its own browser and its own stand-in for Firebase, so files can run side by side. Most of a file's
  time is spent waiting for the page, so running a few at once cuts the whole run to about a third. A file's output
  is held back and printed in one piece when it ends, so the log reads the same as one at a time. The slowest files
  are listed at the end.
*/
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const pick = process.argv.slice(2);
const files = fs.readdirSync(__dirname).filter(f => /\.test\.js$/.test(f) && (!pick.length || pick.some(w => f.indexOf(w) >= 0))).sort();
const jobs = Math.max(1, +process.env.JOBS || Math.min(4, os.cpus().length));
function runFile(f) {
  return new Promise(res => {
    const t0 = Date.now(), out = [];
    const c = spawn(process.execPath, [path.join(__dirname, f)], { env: process.env });
    c.stdout.on('data', d => out.push(d)); c.stderr.on('data', d => out.push(d));
    c.on('exit', code => {
      const s = (Date.now() - t0) / 1000;
      process.stdout.write('\n=== ' + f + ' (' + s.toFixed(0) + ' s)\n' + Buffer.concat(out).toString());
      res({ f, ok: code === 0, s });
    });
  });
}
(async () => {
  // the server runs in this process, so the test files are started as child processes without blocking it
  const server = process.env.BASE ? null : await new Promise(res => { const s = require('./serve'); s.listen(8777, '127.0.0.1', () => res(s)); });
  const t0 = Date.now(), done = [], queue = files.slice();
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) done.push(await runFile(queue.shift())); }));
  if (server) server.close();
  const failed = done.filter(r => !r.ok).map(r => r.f).sort();
  console.log('\nSlowest: ' + done.slice().sort((a, b) => b.s - a.s).slice(0, 5).map(r => r.f + ' ' + r.s.toFixed(0) + ' s').join(', '));
  console.log('Whole run: ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min, ' + jobs + ' at a time.');
  console.log('\n' + (failed.length ? 'FAILED: ' + failed.join(', ') : 'All ' + files.length + ' test files passed.'));
  process.exit(failed.length ? 1 : 0);
})();
