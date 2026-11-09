/*
  scripts/pre-merge.sh lists the open pull requests before a pull request is marked ready (CLAUDE.md, ground rule 2).
  No browser and no GitHub. The script runs in a made-up repository with gh swapped for a stand-in that answers the
  REST API from a made-up list and refuses GraphQL, as Claude Code cloud sessions do (10 Nov 2026: gh pr list printed
  "HTTP 403: GitHub GraphQL is not available" and no pull requests there). The stand-in runs the script's own --jq
  through jq, like gh does. PREMERGE_SH=<file> runs the same cases against another copy of the script (an older one).
  Needs bash, git and jq (GitHub's runners have all three).
*/
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
let n = 0, fails = 0;
function ok(cond, msg) { n++; if (cond) console.log('PASS ' + msg); else { fails++; console.log('FAIL ' + msg); } }

if (spawnSync('jq', ['--version']).status !== 0) {
  if (process.env.CI) { console.log('FAIL jq is not installed on this runner'); process.exit(1); }
  console.log('SKIP jq is not installed here: the pre-merge test needs it (GitHub\'s runners have it)');
  process.exit(0);
}

const script = process.env.PREMERGE_SH || path.join(__dirname, '..', 'scripts', 'pre-merge.sh');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-premerge-'));
const bin = path.join(tmp, 'bin'), origin = path.join(tmp, 'origin.git'), work = path.join(tmp, 'work');
fs.mkdirSync(bin);

// A made-up repository: an origin with main, and a branch that starts from it.
const quiet = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 't@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 't@example.com' };
function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'init.defaultBranch=main', ...args], { cwd, encoding: 'utf8', env: Object.assign({}, process.env, quiet) });
  if (r.status) throw new Error('git ' + args.join(' ') + ': ' + r.stderr);
}
git(tmp, 'init', '-q', '--bare', origin);
git(tmp, 'init', '-q', work);
fs.writeFileSync(path.join(work, 'a.txt'), 'a\n');
git(work, 'add', 'a.txt');
git(work, 'commit', '-q', '-m', 'start');
git(work, 'remote', 'add', 'origin', origin);
git(work, 'push', '-q', 'origin', 'main');
git(work, 'checkout', '-q', '-b', 'fix/thing');

// The stand-in gh. GraphQL (gh pr list, gh pr view, gh repo view) is refused with the cloud's words. The REST list and
// each pull request answer from FIX: {list: [...], state: {number: mergeable_state}, down: true refuses REST too}.
fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env node
const fs = require('fs'), { spawnSync } = require('child_process');
const st = JSON.parse(fs.readFileSync(process.env.FIX, 'utf8')), a = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(a) + '\\n');   // one line per call, whatever the --jq holds
const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
function out(data) {
  const expr = opt('--jq');
  if (!expr) { process.stdout.write(JSON.stringify(data) + '\\n'); return; }
  const r = spawnSync('jq', ['-r', expr], { input: JSON.stringify(data), encoding: 'utf8' });
  if (r.status) { process.stderr.write('jq: ' + r.stderr); process.exit(5); }
  process.stdout.write(r.stdout);
}
if (a[0] !== 'api') {
  process.stderr.write('HTTP 403: GitHub GraphQL is not available from Claude Code sessions; use the REST API\\n');
  process.exit(1);
}
if (st.down) { process.stderr.write('HTTP 502\\n'); process.exit(1); }
let m;
if (/^repos\\/\\{owner\\}\\/\\{repo\\}\\/pulls\\?state=open/.test(a[1])) out(st.list);
else if ((m = a[1].match(/^repos\\/\\{owner\\}\\/\\{repo\\}\\/pulls\\/(\\d+)$/))) {
  if (!(m[1] in (st.state || {}))) { process.stderr.write('HTTP 404\\n'); process.exit(1); }
  out({ number: +m[1], mergeable_state: st.state[m[1]] });
} else { process.stderr.write('stand-in gh has no answer for: ' + a.join(' ') + '\\n'); process.exit(9); }
`);
fs.chmodSync(path.join(bin, 'gh'), 0o755);

function run(scenario) {
  const fix = path.join(tmp, 'fix.json'), calls = path.join(tmp, 'calls.log');
  fs.writeFileSync(fix, JSON.stringify(scenario));
  fs.writeFileSync(calls, '');
  const r = spawnSync('bash', [script], {
    cwd: work, encoding: 'utf8', timeout: 60000,
    env: Object.assign({}, process.env, quiet, { PATH: bin + path.delimiter + process.env.PATH, FIX: fix, CALLS: calls })
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), calls: fs.readFileSync(calls, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) };
}
// A pull request as the REST list gives it (only the fields the script reads, and one it must ignore).
const pr = (number, ref, draft, updated, title) => ({ number, head: { ref, sha: 'abc' }, draft, updated_at: updated, title, body: 'Verdict: Build' });
const two = {
  list: [pr(656, 'feat/varied-welcomes', false, '2026-11-09T17:59:30Z', 'Vary Home welcomes with the calendar celebrations'),
    pr(654, 'feat/kitchen-mascot', true, '2026-11-08T22:05:00Z', "Preview the kitchen's mascot")],
  state: { 656: 'blocked', 654: 'dirty' }
};

ok(spawnSync('bash', ['-n', script]).status === 0, 'the script is valid bash');

// 1. Two open pull requests, read where GraphQL is refused.
let r = run(two);
ok(r.code === 0, 'the script finishes (exit ' + r.code + ')');
ok(/^ {2}#656 {2}feat\/varied-welcomes {2}ready {2}BLOCKED {2}updated 10 Nov 03:59 {2}Vary Home welcomes with the calendar celebrations$/m.test(r.out),
  'a ready pull request shows its branch, merge state, Queensland update time and whole title');
ok(/^ {2}#654 {2}feat\/kitchen-mascot {2}draft {2}DIRTY {2}updated 09 Nov 08:05 {2}Preview the kitchen's mascot$/m.test(r.out),
  'a draft shows as draft, with its conflict and the apostrophe in its title');
ok(!/GraphQL|HTTP 403/.test(r.out), 'no GraphQL refusal is printed');
const other = r.calls.filter(c => c[0] !== 'api').map(c => 'gh ' + c.slice(0, 2).join(' '));
ok(r.calls.length === 3 && !other.length, 'three REST calls, no GraphQL: the list, then each pull request (' + (other.join('; ') || r.calls.length + ' calls') + ')');
ok(/== Worktrees:/.test(r.out) && /\[fix\/thing\]/.test(r.out), 'the worktrees still follow');

// 2. Nothing open.
r = run({ list: [], state: {} });
ok(/== Open pull requests:\n {2}None open\.\n/.test(r.out), 'an empty list says None open');

// 3. A merge state GitHub does not answer: the line still shows, marked UNKNOWN.
r = run({ list: two.list, state: { 656: 'clean' } });
ok(/#656 {2}feat\/varied-welcomes {2}ready {2}CLEAN /.test(r.out) && /#654 {2}feat\/kitchen-mascot {2}draft {2}UNKNOWN /.test(r.out),
  'a pull request whose merge state cannot be read still shows, as UNKNOWN');

// 4. GitHub cannot be read at all: say so, and carry on to the worktrees.
r = run({ down: true, list: [], state: {} });
ok(/!! Could not read the open pull requests from GitHub/.test(r.out) && !/None open/.test(r.out),
  'a failed read says so, never "None open"');
ok(r.code === 0 && /== Worktrees:/.test(r.out), 'and the rest of the check still runs');

// 5. The hints match the Auto-merge queue (docs/auto-merge.md): mark ready and stop, never merge by hand.
r = run(two);
ok(/the queue merges it/.test(r.out) && !/Squash merge/.test(r.out), 'the closing hint says the queue merges, not a hand squash merge');

fs.rmSync(tmp, { recursive: true, force: true });
console.log((n - fails) + ' of ' + n + ' passed');
process.exit(fails ? 1 : 0);
