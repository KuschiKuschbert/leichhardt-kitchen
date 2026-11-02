// Run the actual workflow loop without relying on the caller's shell options. A bad early file must fail even when
// the last file parses, and the same loop must still accept a complete valid fixture.
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/pr-tests.yml'), 'utf8');
const step = workflow.match(/- name: Check the JavaScript parses\r?\n\s+run: ([^\r\n]+)/);
if (!step) throw new Error('Could not find the workflow JavaScript parsing command');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-syntax-gate-'));
const files = ['js/00-first.js', 'js/10-later.js', 'js/lib/helper.js', 'sw.js'];
const env = Object.assign({}, process.env);
delete env.SHELLOPTS; delete env.BASH_ENV; delete env.ENV;
try {
  fs.mkdirSync(path.join(dir, 'js/lib'), { recursive: true });
  for (const bad of [files[0], files[2], files[3], null]) {
    for (const file of files) fs.writeFileSync(path.join(dir, file), file === bad ? 'const = ;\n' : 'const valid = 1;\n');
    const result = spawnSync('bash', ['--noprofile', '--norc', '+e', '-c', step[1]], { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
    if (bad) ok(!result.error && result.status === 1 && (result.stderr || '').includes(bad) && /SyntaxError/.test(result.stderr || ''), 'workflow rejects invalid ' + bad + ' even when other files parse');
    else ok(!result.error && result.status === 0 && !result.stderr, 'workflow accepts valid root, library and service-worker files');
  }
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
R.forEach(r => console.log(r));
const bad = R.filter(r => r.startsWith('FAIL')).length;
console.log(bad + ' failed of ' + R.length);
process.exit(bad ? 1 : 0);
