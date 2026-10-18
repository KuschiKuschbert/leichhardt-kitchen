/*
  Runs every click test: starts a small local server for the repo, runs each *.test.js file in turn, then stops.
    npm test                       all files, against this folder's copy of the book
    npm test -- recipes lists      only the files whose names contain those words
    BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test
                                   the same tests against the live site (Firebase is still the stand-in)
*/
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const pick = process.argv.slice(2);
const files = fs.readdirSync(__dirname).filter(f => /\.test\.js$/.test(f) && (!pick.length || pick.some(w => f.indexOf(w) >= 0))).sort();
function runFile(f) {
  return new Promise(res => {
    console.log('\n=== ' + f);
    spawn(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit', env: process.env }).on('exit', code => res(code === 0));
  });
}
(async () => {
  // the server runs in this process, so the test files are started one at a time without blocking it
  const server = process.env.BASE ? null : await new Promise(res => { const s = require('./serve'); s.listen(8777, '127.0.0.1', () => res(s)); });
  const failed = [];
  for (const f of files) if (!(await runFile(f))) failed.push(f);
  if (server) server.close();
  console.log('\n' + (failed.length ? 'FAILED: ' + failed.join(', ') : 'All ' + files.length + ' test files passed.'));
  process.exit(failed.length ? 1 : 0);
})();
