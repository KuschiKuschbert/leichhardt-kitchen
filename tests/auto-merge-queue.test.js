/*
  The Auto-merge queue (.github/workflows/auto-merge.yml, step "Move the queue on by one", docs/auto-merge.md).
  No browser and no GitHub. The step's own bash is cut out of the workflow and run with bash -e, as GitHub runs it,
  with gh and sleep swapped for stand-ins that answer from a made-up list of pull requests and write down every call.
  The stand-in gh keeps only the --json fields asked for and runs the step's own --jq through jq, like gh does.

  The first case is 4 Nov 2026: #516 stayed UNKNOWN for over 50 minutes and #517 and #520, green and only behind main,
  waited the whole time. Section 6 is the same evening's #520: read as failed while its Click tests shares still ran,
  because the required "Click tests" check only appears when every share is done.
  QUEUE_YML=<file> runs the same cases against another copy of the workflow (an older one).
  Needs bash and jq (GitHub's runners have both).
*/
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
let n = 0, fails = 0;
function ok(cond, msg) { n++; if (cond) console.log('PASS ' + msg); else { fails++; console.log('FAIL ' + msg); } }
function eq(a, b, msg) { const same = JSON.stringify(a) === JSON.stringify(b); ok(same, msg + (same ? '' : ' (got ' + JSON.stringify(a) + ', wanted ' + JSON.stringify(b) + ')')); }

if (spawnSync('jq', ['--version']).status !== 0) {
  if (process.env.CI) { console.log('FAIL jq is not installed on this runner'); process.exit(1); }
  console.log('SKIP jq is not installed here: the queue test needs it (GitHub\'s runners have it)');
  process.exit(0);
}

const root = path.join(__dirname, '..');
const wfPath = process.env.QUEUE_YML || path.join(root, '.github', 'workflows', 'auto-merge.yml');
const yml = fs.readFileSync(wfPath, 'utf8');

// The run: | block of one step, as YAML hands it to bash: the block's own indent taken off every line.
function stepScript(text, name) {
  const lines = text.split('\n');
  const at = lines.findIndex(l => l.trim() === '- name: ' + name);
  if (at < 0) throw new Error('no step named ' + name);
  const stepIndent = lines[at].indexOf('-');
  let r = -1;
  for (let i = at + 1; i < lines.length; i++) {
    if (lines[i].trim() && lines[i].search(/\S/) <= stepIndent) break;
    if (/^\s*run: \|\s*$/.test(lines[i])) { r = i; break; }
  }
  if (r < 0) throw new Error('no run: | block in ' + name);
  const runIndent = lines[r].search(/\S/), body = [];
  for (let i = r + 1; i < lines.length; i++) {
    if (lines[i].trim() && lines[i].search(/\S/) <= runIndent) break;
    body.push(lines[i]);
  }
  const ind = body.find(l => l.trim()).search(/\S/);
  return body.map(l => l.slice(ind)).join('\n').replace(/\s+$/, '') + '\n';
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-queue-'));
const bin = path.join(tmp, 'bin');
fs.mkdirSync(bin);
const script = path.join(tmp, 'queue.sh');
const body = stepScript(yml, 'Move the queue on by one');
fs.writeFileSync(script, body);

// The stand-in for gh. The scenario file holds the list, each pull request's REST answers in turn (the last repeats;
// FAIL makes that call fail) and each pull request's checks on its newest commit (runs: a list of sets, one per
// gh pr checks --json call, the last repeats; none listed means all green). gh pr checks --required answers from the
// checks last shown, the way gh does: no checks at all or no required one is exit 1, the required one running is 8,
// failed is 1, passed is 0. The required check is "Click tests", which GitHub only adds when every share is done.
fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env node
const fs = require('fs'), { spawnSync } = require('child_process');
const F = process.env.FIX, st = JSON.parse(fs.readFileSync(F, 'utf8')), a = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, 'gh ' + a.join(' ') + '\\n');
const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
function out(data) {
  const expr = opt('--jq');
  if (!expr) { process.stdout.write(JSON.stringify(data) + '\\n'); return; }
  const r = spawnSync('jq', ['-r', expr], { input: JSON.stringify(data), encoding: 'utf8' });
  if (r.status) { process.stderr.write('jq: ' + r.stderr); process.exit(5); }
  process.stdout.write(r.stdout);
}
if (a[0] === 'pr' && a[1] === 'list') {
  const keep = (opt('--json') || '').split(',');
  out(st.list.map(p => Object.fromEntries(keep.map(k => [k, k in p ? p[k] : null]))));
} else if (a[0] === 'pr' && a[1] === 'checks') {
  const num = a[2], sets = (st.runs || {})[num] || [st.green];
  st.cur = st.cur || {};
  if (a.includes('--json')) { st.cur[num] = sets.length > 1 ? sets.shift() : sets[0]; fs.writeFileSync(F, JSON.stringify(st)); }
  const set = st.cur[num] || sets[0];
  if (!set.length) { process.stderr.write("no checks reported on the 'branch' branch\\n"); process.exit(1); }
  if (a.includes('--json')) {
    const keep = opt('--json').split(',');
    out(set.map(c => Object.fromEntries(keep.map(k => [k, k in c ? c[k] : '']))));
    process.exit(st.jsonExit8 && set.some(c => c.bucket === 'pending') ? 8 : 0);
  }
  const req = set.filter(c => c.workflow === 'PR click tests' && c.name === 'Click tests');
  if (!req.length) { process.stderr.write("no required checks reported on the 'branch' branch\\n"); process.exit(1); }
  process.exit(req.some(c => c.bucket === 'pending') ? 8 : req.some(c => c.bucket === 'fail' || c.bucket === 'cancel') ? 1 : 0);
} else if (a[0] === 'api' && a[1] === '-X' && a[2] === 'PUT' && /\\/update-branch$/.test(a[3])) {
  out({ message: 'Updating pull request branch.' });
} else if (a[0] === 'api' && /^repos\\/[^/]+\\/[^/]+\\/pulls\\/\\d+$/.test(a[1])) {
  const num = a[1].split('/').pop(), seq = (st.rest || {})[num] || ['unknown'];
  const v = seq.length > 1 ? seq.shift() : seq[0];
  fs.writeFileSync(F, JSON.stringify(st));
  if (v === 'FAIL') { process.stderr.write('HTTP 502'); process.exit(1); }
  out({ number: +num, mergeable_state: v });
} else { process.stderr.write('stand-in gh has no answer for: ' + a.join(' ') + '\\n'); process.exit(9); }
`, { mode: 0o755 });
// The stand-in for sleep: writes it down and returns at once, so ten minutes of waiting takes no time.
fs.writeFileSync(path.join(bin, 'sleep'), '#!/bin/sh\necho "sleep $*" >> "$CALLS"\n', { mode: 0o755 });

// Checks on a pull request's newest commit, as gh pr checks --json shows them. Click tests runs in five browser
// shares beside the rules; the required "Click tests" check is added only when they are all done. Other workflows'
// checks (GitGuardian, this Auto-merge workflow's own jobs) must not count.
const ck = (name, bucket, workflow) => ({ name, bucket, workflow: workflow == null ? 'PR click tests' : workflow });
const others = [ck('GitGuardian Security Checks', 'pass', ''), ck('queue', 'pending', 'Auto-merge')];
const shares = b => [1, 2, 3, 4, 5].map(k => ck('Browser ' + k + ' of 5', typeof b === 'function' ? b(k) : b));
const C = {
  green: [ck('Scope and parse', 'pass'), ...shares('pass'), ck('Rules and nightly checks', 'pass'), ck('Click tests', 'pass'), ...others],
  running: [ck('Scope and parse', 'pass'), ...shares(k => k === 4 ? 'pending' : 'pass'), ck('Rules and nightly checks', 'pass'), ...others],
  failed: [ck('Scope and parse', 'pass'), ...shares(k => k === 2 ? 'fail' : 'pass'), ck('Rules and nightly checks', 'pass'), ck('Click tests', 'fail'), ...others],
  docs: [ck('Scope and parse', 'pass'), ...shares('skipping'), ck('Rules and nightly checks', 'skipping'), ck('Click tests', 'pass'), ...others],
  none: [ck('GitGuardian Security Checks', 'pass', '')],
  nothing: []
};

const ago = s => new Date(Date.now() - s * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
// A ready pull request: not a draft, auto-merge on, no labels, from this repository. Higher numbers opened later.
const pr = (number, state, changedAgo, more) => Object.assign({
  number, isDraft: false, labels: [], mergeStateStatus: state, autoMergeRequest: { enabledAt: '2026-11-04T07:00:00Z' },
  isCrossRepository: false, createdAt: new Date(Date.UTC(2026, 10, 4, 6, 0, 0) + number * 60000).toISOString().replace(/\.\d+Z$/, 'Z'),
  updatedAt: ago(changedAgo == null ? 3600 : changedAgo)
}, more || {});

function pass(name, scenario) {
  const fix = path.join(tmp, 'fix.json'), calls = path.join(tmp, 'calls.log');
  fs.writeFileSync(fix, JSON.stringify(Object.assign({ green: C.green }, scenario)));
  fs.writeFileSync(calls, '');
  const r = spawnSync('bash', ['-e', script], {
    cwd: tmp, encoding: 'utf8', timeout: 120000,
    env: Object.assign({}, process.env, { PATH: bin + path.delimiter + process.env.PATH, REPO: 'kitchen/book', GH_TOKEN: 'stand-in', FIX: fix, CALLS: calls })
  });
  const log = fs.readFileSync(calls, 'utf8').split('\n').filter(Boolean);
  const res = {
    code: r.status, out: (r.stdout || '') + (r.stderr || ''),
    updated: log.filter(l => / -X PUT /.test(l)).map(l => +l.match(/pulls\/(\d+)\/update-branch/)[1]),
    asked: log.filter(l => /^gh api repos\/[^ ]+\/pulls\/\d+ /.test(l)).map(l => +l.match(/pulls\/(\d+) /)[1]),
    checked: log.filter(l => /^gh pr checks /.test(l)).map(l => +l.split(' ')[3]),
    slept: log.filter(l => /^sleep /.test(l)).reduce((t, l) => t + (+l.split(' ')[1] || 0), 0)
  };
  console.log('-- ' + name + '\n' + res.out.trim().split('\n').map(l => '   | ' + l).join('\n'));
  ok(res.code === 0, name + ': the step ends without an error (exit ' + res.code + ')');
  return res;
}
const count = (list, x) => list.filter(v => v === x).length;

// The step itself
ok(spawnSync('bash', ['-n', script]).status === 0, 'the queue step is valid bash');
ok(body.indexOf('${{') < 0, 'the queue step has no GitHub expressions in it, so this test runs it as GitHub does');

// 1. 4 Nov 2026, about 20:28 Queensland time: #516 UNKNOWN since 20:00, #517 and #520 green and behind.
let r = pass('#516 UNKNOWN for 28 minutes, #517 and #520 green and behind', {
  list: [pr(516, 'UNKNOWN', 28 * 60), pr(517, 'BEHIND'), pr(520, 'BEHIND')], rest: { 516: ['unknown'] }
});
eq(r.updated, [517], '#516 does not hold up the queue: #517 is brought up to date');
eq(count(r.asked, 516), 1, '#516 changed long ago: GitHub is asked about it once');
ok(r.slept <= 15, '#516 changed long ago: a short wait only (' + r.slept + ' s)');
ok(/#516 is still UNKNOWN/.test(r.out) && /skipped this pass/.test(r.out), 'the log says #516 was skipped this pass');
ok(!r.checked.includes(520), '#520 waits for #517: one at a time');

// 2. Later passes read #516 again: nothing about it is kept from the pass before.
r = pass('later pass: #517 merged, #516 now known and behind', {
  list: [pr(516, 'BEHIND', 55 * 60), pr(520, 'BEHIND')]
});
eq(r.updated, [516], 'a later pass takes #516 up once GitHub knows it is behind');
eq(r.asked, [], 'a known state needs no asking');
r = pass('later pass: #516 now clean', { list: [pr(516, 'CLEAN', 55 * 60), pr(520, 'BEHIND')] });
ok(/#516 is merging/.test(r.out), 'a later pass sees #516 merging');
eq(r.updated, [], 'nothing else is brought up to date while #516 merges');
r = pass('later pass: #516 still UNKNOWN, #517 testing', {
  list: [pr(516, 'UNKNOWN', 40 * 60), pr(517, 'BLOCKED'), pr(520, 'BEHIND')], rest: { 516: ['unknown'] }, runs: { 517: [C.running] }
});
ok(/#517 is testing: wait/.test(r.out), 'past an UNKNOWN #516, a testing #517 still means wait');
eq(r.updated, [], '#520 is not brought up to date while #517 tests');

// 3. A fresh push: GitHub usually works it out in seconds, and the queue then acts on what it is.
r = pass('fresh push, worked out after three asks', {
  list: [pr(530, 'UNKNOWN', 30), pr(531, 'BEHIND')], rest: { 530: ['unknown', 'unknown', 'behind'] }
});
eq(r.asked, [530, 530, 530], 'asked three times');
eq(r.slept, 30, 'ten seconds between asks');
ok(/#530: GitHub has worked it out: BEHIND/.test(r.out), 'the log says what GitHub worked out');
eq(r.updated, [530], 'worked out as behind and green: #530 is brought up to date, not #531');
r = pass('fresh push, worked out as clean', { list: [pr(532, 'UNKNOWN', 20), pr(533, 'BEHIND')], rest: { 532: ['unknown', 'clean'] } });
ok(/#532 is merging/.test(r.out), 'worked out as clean: merging');
eq(r.updated, [], 'nothing brought up to date behind a pull request that is merging');
r = pass('fresh push, worked out as blocked while Click tests run', {
  list: [pr(534, 'UNKNOWN', 20), pr(535, 'BEHIND')], rest: { 534: ['blocked'] }, runs: { 534: [C.running] }
});
ok(/#534 is testing: wait/.test(r.out), 'worked out as blocked with Click tests running: wait');
eq(r.updated, [], 'nothing brought up to date while #534 tests');

// 4. Stuck after a fresh push: the queue waits until 10 minutes after the change, then moves on.
r = pass('fresh push that stays UNKNOWN', {
  list: [pr(540, 'UNKNOWN', 125), pr(541, 'BEHIND')], rest: { 540: ['unknown'] }
});
const asks540 = count(r.asked, 540);
ok(asks540 >= 47 && asks540 <= 49, 'asked until 10 minutes after the change (' + asks540 + ' asks, wanted about 48)');
ok(r.slept <= 600 - 125 + 10, 'never waits past 10 minutes after the change (' + r.slept + ' s)');
eq(r.updated, [541], 'then #540 is skipped and #541 is brought up to date');
r = pass('two fresh pushes that stay UNKNOWN', {
  list: [pr(550, 'UNKNOWN', 60), pr(551, 'UNKNOWN', 60), pr(552, 'BEHIND')], rest: { 550: ['unknown'], 551: ['unknown'] }
});
ok(r.slept <= 600 - 60 + 10, 'the pass shares one wait, not ten minutes each (' + r.slept + ' s)');
eq(count(r.asked, 551), 1, 'the second is asked once more after the shared wait');
eq(r.updated, [552], 'both skipped, #552 is brought up to date');
r = pass('a failed ask', { list: [pr(560, 'UNKNOWN', 30), pr(561, 'BEHIND')], rest: { 560: ['FAIL', 'behind'] } });
eq(r.updated, [560], 'a failed ask counts as still unknown; the next ask works and #560 is brought up to date');
r = pass('a failed ask on a pull request that changed long ago', { list: [pr(562, 'UNKNOWN'), pr(563, 'BEHIND')], rest: { 562: ['FAIL'] } });
eq(r.updated, [563], 'a failed ask on an old one: skipped, #563 is brought up to date');

// 5. What did not change.
r = pass('conflict, failed, behind', {
  list: [pr(570, 'DIRTY'), pr(571, 'BEHIND'), pr(572, 'BEHIND')], runs: { 571: [C.failed] }
});
ok(/#570 has a conflict/.test(r.out) && /#571 failed Click tests/.test(r.out), 'a conflict and a failure are skipped');
eq(r.updated, [572], 'the first green one behind is brought up to date');
r = pass('testing first', { list: [pr(573, 'BLOCKED'), pr(574, 'BEHIND')], runs: { 573: [C.running] } });
eq(r.updated, [], 'one testing means wait');
r = pass('not ready', {
  list: [pr(575, 'BEHIND', null, { isDraft: true }), pr(576, 'BEHIND', null, { labels: [{ name: 'hold' }] }),
    pr(577, 'BEHIND', null, { isCrossRepository: true }), pr(578, 'BEHIND', null, { autoMergeRequest: null })]
});
ok(/Nothing to move/.test(r.out), 'drafts, held, forks and ones without auto-merge are not in the queue');
eq([r.updated, r.checked], [[], []], 'none of them is looked at');
r = pass('empty', { list: [] });
ok(/Nothing to move/.test(r.out), 'no ready pull requests: nothing to move');
r = pass('oldest first', { list: [pr(591, 'BEHIND'), pr(592, 'BEHIND', null, { createdAt: '2026-11-03T06:00:00Z' })] });
eq(r.updated, [592], 'the pull request opened first goes first');

// 6. Testing while Click tests runs in shares (4 Nov 2026, #520): the required check is not there until every share is
// done, and that is testing, not failed.
r = pass('#520 behind with Click tests shares running, #523 behind and green', {
  list: [pr(520, 'BEHIND', 300), pr(523, 'BEHIND')], runs: { 520: [C.running] }
});
ok(/#520 is testing: wait/.test(r.out), 'shares still running: #520 is testing');
ok(!/#520 failed/.test(r.out), 'a missing required check while shares run is not read as failed');
eq(r.updated, [], '#523 is not brought up to date while #520 tests');
eq(r.slept, 0, 'checks already there: no waiting');
r = pass('Click tests running, other workflows running too', { list: [pr(601, 'BLOCKED', 300), pr(602, 'BEHIND')], runs: { 601: [C.running] }, jsonExit8: true });
ok(/#601 is testing: wait/.test(r.out), 'still testing when gh pr checks --json also ends with exit 8');
r = pass('green, while this workflow\'s own job runs on it', { list: [pr(603, 'BEHIND', 300)], runs: { 603: [C.green] } });
eq(r.updated, [603], 'another workflow still running (the Auto-merge queue, GitGuardian) is not Click tests: brought up to date');
r = pass('docs only: shares skipped', { list: [pr(604, 'BEHIND', 300)], runs: { 604: [C.docs] } });
eq(r.updated, [604], 'docs only, Click tests passed with the shares skipped: brought up to date');
r = pass('failed share', { list: [pr(605, 'BEHIND', 300), pr(606, 'BEHIND')], runs: { 605: [C.failed] } });
ok(/#605 failed Click tests/.test(r.out), 'a failed share and a failed Click tests: failed');
eq(r.updated, [606], 'skipped, #606 is brought up to date');

// Just pushed, no Click tests checks yet: asked again like UNKNOWN, until 10 minutes after the change.
r = pass('just pushed, Click tests starts after two asks', {
  list: [pr(607, 'BEHIND', 20), pr(608, 'BEHIND')], runs: { 607: [C.nothing, C.none, C.running] }
});
eq(r.slept, 20, 'asked again twice, ten seconds apart');
ok(/#607 is testing: wait/.test(r.out), 'once Click tests shows up running: testing');
eq(r.updated, [], '#608 is not brought up to date meanwhile');
r = pass('changed long ago and no Click tests on its newest commit (#516 at 3ffd040)', {
  list: [pr(516, 'BEHIND', 50 * 60), pr(609, 'BEHIND')], runs: { 516: [C.none] }
});
ok(/#516 has no Click tests on its newest commit/.test(r.out) && /until its session pushes again/.test(r.out), 'the log says Click tests never ran on #516\'s newest commit');
eq(r.slept, 0, 'changed long ago: no waiting');
eq(r.updated, [609], '#516 is skipped and #609 is brought up to date');
r = pass('just pushed and Click tests never starts', {
  list: [pr(610, 'BEHIND', 125), pr(611, 'BEHIND')], runs: { 610: [C.none] }
});
ok(r.slept >= 470 && r.slept <= 600 - 125 + 10, 'waits until 10 minutes after the change, no longer (' + r.slept + ' s)');
eq(r.updated, [611], 'then #610 is skipped and #611 is brought up to date');
r = pass('UNKNOWN wait first, then no Click tests', {
  list: [pr(612, 'UNKNOWN', 60), pr(613, 'BEHIND', 60), pr(614, 'BEHIND')], rest: { 612: ['unknown'] }, runs: { 613: [C.none] }
});
ok(r.slept <= 600 - 60 + 10, 'the pass shares one wait between UNKNOWN and no Click tests (' + r.slept + ' s)');
eq(r.updated, [614], 'both skipped, #614 is brought up to date');

// 7. The triggers: the end of Click tests moves the queue, and the schedule is off the hour.
const clickName = (fs.readFileSync(path.join(root, '.github', 'workflows', 'pr-tests.yml'), 'utf8').match(/^name: (.+)$/m) || [])[1];
ok(new RegExp('workflow_run:\\s*\\n\\s*workflows: \\[' + clickName + '\\]\\s*\\n\\s*types: \\[completed\\]').test(yml),
  'the queue runs when "' + clickName + '" completes (the name in pr-tests.yml)');
const cron = (yml.match(/cron: '([^']+)'/) || [])[1] || '';
ok(cron && cron.split(' ')[0].split(',').every(m => /^\d+$/.test(m) && +m !== 0), 'the schedule runs off the hour (' + cron + ')');

fs.rmSync(tmp, { recursive: true, force: true });
console.log((n - fails) + ' of ' + n + ' passed');
process.exit(fails ? 1 : 0);
