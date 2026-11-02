// A focused command must not claim success when it selected no files. Exercise the CLI without starting another test
// run: both child commands have deliberately unmatched filters, an unavailable Chrome and an occupied server port.
const { spawnSync } = require('child_process');
const path = require('path');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
const runner = path.join(__dirname, 'run.js');
const reserve = `
  const server = require('http').createServer();
  function run() {
    process.argv = [process.execPath, process.env.LK_RUNNER_FILE, ...JSON.parse(process.env.LK_RUNNER_FILTERS)];
    require(process.env.LK_RUNNER_FILE);
  }
  server.once('error', e => { if (e.code === 'EADDRINUSE') run(); else throw e; });
  server.listen(8777, '127.0.0.1', run);
`;
for (const filters of [['__runner_no_match_a__'], ['__runner_no_match_b__', '__runner_no_match_c__']]) {
  const env = Object.assign({}, process.env, { CHROME: path.join(__dirname, 'no-such-chrome'), LK_RUNNER_FILE: runner, LK_RUNNER_FILTERS: JSON.stringify(filters) });
  delete env.BASE; delete env.LK_WS;
  const child = spawnSync(process.execPath, ['-e', reserve], { env, encoding: 'utf8', timeout: 10000 });
  const output = (child.stdout || '') + (child.stderr || '');
  ok(!child.error && child.status === 1, filters.length + ' unmatched filter(s): command exits 1 without hanging');
  ok(/No test files matched/.test(output) && filters.every(f => output.includes(f)), filters.length + ' unmatched filter(s): message names the filters that selected nothing');
  ok(/npm test/.test(output) && /filename substring/.test(output), filters.length + ' unmatched filter(s): message explains how to run all tests or choose another filter');
  ok(!/EADDRINUSE|Executable doesn't exist|browserType|All 0 test files passed/.test(output), filters.length + ' unmatched filter(s): rejection happens before server or Chrome startup and never claims zero-test success');
}
R.forEach(r => console.log(r));
const bad = R.filter(r => r.startsWith('FAIL')).length;
console.log(bad + ' failed of ' + R.length);
process.exit(bad ? 1 : 0);
