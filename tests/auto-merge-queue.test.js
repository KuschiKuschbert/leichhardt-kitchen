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
// The switch step too, for the retry on switching auto-merge on.
const switchScript = path.join(tmp, 'switch.sh');
fs.writeFileSync(switchScript, stepScript(yml, 'Switch auto-merge on or off for this pull request'));
// The release windows (5 Nov 2026): the step that opens and closes them, and the windows themselves.
const windowBody = stepScript(yml, 'Open or close the release window'), windowScript = path.join(tmp, 'window.sh');
fs.writeFileSync(windowScript, windowBody);
const WINDOWS = (yml.match(/^\s*RELEASE_WINDOWS: '([^']+)'/m) || [])[1] || '';
// The waiting run (6 Nov 2026): the step that sleeps until the next window opens.
// An older copy of the workflow (QUEUE_YML) has no such step: it then never sleeps, and those checks fail.
let waitBody = 'true\n'; try { waitBody = stepScript(yml, 'Sleep until the next release window'); } catch (e) {}
const waitScript = path.join(tmp, 'wait.sh');
fs.writeFileSync(waitScript, waitBody);

// The stand-in for gh. The scenario file holds the list, each pull request's REST answers in turn (the last repeats;
// FAIL makes that call fail) and each pull request's checks on its newest commit (runs: a list of sets, one per
// gh pr checks --json call, the last repeats; none listed means all green). gh pr checks --required answers from the
// checks last shown, the way gh does: no checks at all or no required one is exit 1, the required one running is 8,
// failed is 1, passed is 0. The required check is "Click tests", which GitHub only adds when every share is done.
// listFail fails that many list calls first; put and merge hold each pull request's Update branch and auto-merge
// answers in turn (ok or FAIL).
fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env node
const fs = require('fs'), { spawnSync } = require('child_process');
const F = process.env.FIX, st = JSON.parse(fs.readFileSync(F, 'utf8')), a = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, 'gh ' + a.join(' ') + '\\n');
const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
function next(key, num, dflt) {
  const seq = (st[key] || {})[num] || [dflt], v = seq.length > 1 ? seq.shift() : seq[0];
  fs.writeFileSync(F, JSON.stringify(st));
  return v;
}
function fail() { process.stderr.write('HTTP 502'); process.exit(1); }
function out(data) {
  const expr = opt('--jq');
  if (!expr) { process.stdout.write(JSON.stringify(data) + '\\n'); return; }
  const r = spawnSync('jq', ['-r', expr], { input: JSON.stringify(data), encoding: 'utf8' });
  if (r.status) { process.stderr.write('jq: ' + r.stderr); process.exit(5); }
  process.stdout.write(r.stdout);
}
if (a[0] === 'pr' && a[1] === 'list') {
  if (st.listFail) { st.listFail--; fs.writeFileSync(F, JSON.stringify(st)); fail(); }
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
  if (next('put', a[3].split('/')[4], 'ok') === 'FAIL') fail();
  out({ message: 'Updating pull request branch.' });
} else if (a[0] === 'api' && /^repos\\/[^/]+\\/[^/]+\\/pulls\\/\\d+$/.test(a[1])) {
  const num = a[1].split('/').pop(), seq = (st.rest || {})[num] || ['unknown'];
  const v = seq.length > 1 ? seq.shift() : seq[0];
  fs.writeFileSync(F, JSON.stringify(st));
  if (v === 'FAIL') { process.stderr.write('HTTP 502'); process.exit(1); }
  out({ number: +num, mergeable_state: v });
} else if (a[0] === 'pr' && a[1] === 'merge') {
  if (next('merge', a[2], 'ok') === 'FAIL') fail();
} else if (a[0] === 'api' && a[1].indexOf('repos/kitchen/book/actions/workflows/auto-merge.yml/runs?event=workflow_dispatch&') === 0) {
  // this workflow's runs by hand, newest first (6 Nov 2026): Release now and the waiting run, found by name
  if (st.runsFail) fail();
  out({ total_count: (st.wfRuns || []).length, workflow_runs: st.wfRuns || [] });
} else if (a[0] === 'workflow' && a[1] === 'run') {
  if (st.dispatchFail) fail();
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

// opts: script (another step), env (more variables for it), fails (the step is expected to end with an error).
function pass(name, scenario, opts) {
  opts = opts || {};
  const fix = path.join(tmp, 'fix.json'), calls = path.join(tmp, 'calls.log');
  fs.writeFileSync(fix, JSON.stringify(Object.assign({ green: C.green }, scenario)));
  fs.writeFileSync(calls, '');
  const r = spawnSync('bash', ['-e', opts.script || script], {
    cwd: tmp, encoding: 'utf8', timeout: 120000,
    env: Object.assign({}, process.env, { PATH: bin + path.delimiter + process.env.PATH, REPO: 'kitchen/book', GH_TOKEN: 'stand-in', FIX: fix, CALLS: calls }, opts.env || {})
  });
  const log = fs.readFileSync(calls, 'utf8').split('\n').filter(Boolean);
  const res = {
    code: r.status, out: (r.stdout || '') + (r.stderr || ''),
    updated: log.filter(l => / -X PUT /.test(l)).map(l => +l.match(/pulls\/(\d+)\/update-branch/)[1]),
    asked: log.filter(l => /^gh api repos\/[^ ]+\/pulls\/\d+ /.test(l)).map(l => +l.match(/pulls\/(\d+) /)[1]),
    checked: log.filter(l => /^gh pr checks /.test(l)).map(l => +l.split(' ')[3]),
    merged: log.filter(l => /^gh pr merge /.test(l)).map(l => +l.split(' ')[3]),
    on: log.filter(l => /^gh pr merge .* --auto /.test(l + ' ')).map(l => +l.split(' ')[3]),
    off: log.filter(l => /^gh pr merge .* --disable-auto/.test(l)).map(l => +l.split(' ')[3]),
    listed: log.filter(l => /^gh pr list /.test(l)).length,
    dispatched: log.filter(l => /^gh workflow run auto-merge\.yml .*-f wait=true/.test(l)).length,
    slept: log.filter(l => /^sleep /.test(l)).reduce((t, l) => t + (+l.split(' ')[1] || 0), 0)
  };
  console.log('-- ' + name + '\n' + res.out.trim().split('\n').map(l => '   | ' + l).join('\n'));
  if (opts.fails) ok(res.code !== 0, name + ': the step ends with an error, so the run shows red (exit ' + res.code + ')');
  else ok(res.code === 0, name + ': the step ends without an error (exit ' + res.code + ')');
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

// 7. GitHub errors are retried: three tries, 10 and 20 seconds apart (4 Nov 2026 outage).
r = pass('Update branch fails twice, then works', { list: [pr(600, 'BEHIND'), pr(601, 'BEHIND')], put: { 600: ['FAIL', 'FAIL', 'ok'] } });
eq(r.updated, [600, 600, 600], 'Update branch is tried three times');
eq(r.slept, 30, '10 and then 20 seconds between tries');
ok(/#600 brought up to date/.test(r.out), 'the third try brings #600 up to date');
r = pass('Update branch fails three times', { list: [pr(602, 'BEHIND'), pr(603, 'BEHIND')], put: { 602: ['FAIL'] } });
eq(r.updated, [602, 602, 602], 'three tries, then it stops');
ok(/::warning::#602: GitHub refused to bring it up to date three times/.test(r.out), 'a warning says so, and the next pass tries again');
r = pass('the list fails once', { list: [pr(604, 'BEHIND')], listFail: 1 });
eq([r.listed, r.updated], [2, [604]], 'the list is read again and the queue moves');
r = pass('the list fails three times', { list: [pr(605, 'BEHIND')], listFail: 3 }, { fails: true });
eq([r.listed, r.updated], [3, []], 'three tries, nothing brought up to date on an empty read');
// in a release window (15:05), so the switch switches auto-merge on as before
const sw = { script: switchScript, env: { SAME: 'true', DRAFT: 'false', HOLD: 'false', URGENT: 'false', PR: '610', RELEASE_WINDOWS: WINDOWS, NOW_HHMM: '1505' } };
r = pass('switch: auto-merge fails once, then works', { merge: { 610: ['FAIL', 'ok'] } }, sw);
eq([r.merged, r.slept], [[610, 610], 10], 'switching auto-merge on is tried again after 10 seconds');
r = pass('switch: auto-merge fails three times', { merge: { 610: ['FAIL'] } }, Object.assign({ fails: true }, sw));
eq(r.merged, [610, 610, 610], 'three tries, then the switch job shows red so someone looks');
r = pass('switch: a draft', { merge: { 611: ['FAIL'] } }, { script: switchScript, env: { SAME: 'true', DRAFT: 'true', HOLD: 'false', PR: '611' } });
eq(r.merged, [611], 'switching auto-merge off is tried once and never fails the job');

// 9. Release windows (head chef, Plan B, 5 Nov 2026): every merge reloads the screens left open, which read their lists
// again, so ready pull requests merge only between services. Outside a window auto-merge goes off, except "urgent".
ok(WINDOWS === '1500-1630 2230-2400', 'the windows are 15:00 to 16:30 and 22:30 to midnight, Queensland time (' + WINDOWS + ')');
ok(spawnSync('bash', ['-n', windowScript]).status === 0 && windowBody.indexOf('${{') < 0, 'the window step is valid bash with no GitHub expressions');
const lbl = (...names) => names.map(name => ({ name }));
const off = { autoMergeRequest: null };
const win = (hhmm, more) => ({ script: windowScript, env: Object.assign({ RELEASE_WINDOWS: WINDOWS, NOW_HHMM: hhmm, RELEASE_NOW: 'false' }, more || {}) });
const mixed = [pr(700, 'BEHIND'), pr(701, 'CLEAN', null, off), pr(702, 'BEHIND', null, { labels: lbl('urgent') }), pr(703, 'BEHIND', null, Object.assign({ labels: lbl('urgent') }, off)),
  pr(704, 'BEHIND', null, { labels: lbl('hold') }), pr(705, 'BEHIND', null, Object.assign({ isDraft: true }, off))];
r = pass('window closed at 12:30 (lunch service)', { list: mixed }, win('1230'));
eq([r.off, r.on], [[700], [703]], 'auto-merge goes off on the ready one, an urgent one keeps it or gets it, held and draft are left alone');
ok(/#700: waits for the next release window/.test(r.out) && /open false/.test(r.out), 'it says #700 waits for the next window');
r = pass('window open at 15:00', { list: mixed }, win('1500'));
eq([r.off, r.on], [[], [701, 703]], 'every ready one without auto-merge gets it; those that have it are left as they are');
r = pass('window open at 23:59', { list: [pr(706, 'BEHIND', null, off)] }, win('2359'));
eq(r.on, [706], 'the night window runs to midnight');
r = pass('window closed at 16:30', { list: [pr(707, 'BEHIND')] }, win('1630'));
eq(r.off, [707], 'the afternoon window ends at 16:30');
r = pass('Release now by hand at 10:00', { list: [pr(708, 'BEHIND', null, off)] }, win('1000', { RELEASE_NOW: 'true' }));
eq(r.on, [708], 'a run by hand with Release now opens the window for that run');
r = pass('window open, auto-merge refused three times', { list: [pr(709, 'BEHIND', null, off)], merge: { 709: ['FAIL'] } }, win('2300'));
ok(r.on.length === 3 && /::warning::#709/.test(r.out), 'three tries, a warning, and the pass carries on');
const swAt = (hhmm, urgent, num) => ({ script: switchScript, env: { SAME: 'true', DRAFT: 'false', HOLD: 'false', URGENT: urgent ? 'true' : 'false', PR: String(num), RELEASE_WINDOWS: WINDOWS, NOW_HHMM: hhmm } });
r = pass('switch: marked ready at 12:30', {}, swAt('1230', false, 712));
eq([r.on, r.off], [[], [712]], 'outside a window a pull request marked ready waits, auto-merge off');
ok(/merges in the next release window/.test(r.out), 'and the log says when it merges');
r = pass('switch: labelled urgent at 12:30', {}, swAt('1230', true, 713));
eq(r.on, [713], 'an urgent one merges when green at any time');
r = pass('switch: marked ready at 22:45', {}, swAt('2245', false, 714));
eq(r.on, [714], 'in a window it gets auto-merge at once');
const crons = (yml.match(/cron: '([^']+)'/g) || []).map(c => c.slice(7, -1));
ok(crons.indexOf('3 5 * * *') >= 0 && crons.indexOf('33 12 * * *') >= 0, 'the queue also runs as each window opens: 05:03 and 12:33 UTC are 15:03 and 22:33 Queensland time');

// 10. The windows open even when GitHub skips the timed runs, and Release now lasts (6 Nov 2026). On 5 Nov GitHub ran
// 3 of the queue's timed runs in 14 hours, none in a window, so nothing merged that night; and a Release now at 07:53
// was undone a minute later by the run its own update of #565 started, which found the window shut.
const run = (id, title, minsAgo, status) => ({ id, display_title: title, status: status || 'completed', created_at: ago(minsAgo * 60) });
const RN = 'Release now', WT = 'Waiting for the release window';
r = pass('window shut at 08:00, one ready, no run waiting', { list: [pr(720, 'BEHIND')], wfRuns: [] }, win('0800', { RUN_ID: '9' }));
eq([r.off, r.dispatched], [[720], 1], 'auto-merge goes off and a run is started that waits for the window');
ok(/Started a run that waits for the next window/.test(r.out), 'the log says so');
r = pass('window shut, a run already waits', { list: [pr(721, 'BEHIND')], wfRuns: [run(5, WT, 90, 'in_progress')] }, win('0800', { RUN_ID: '9' }));
eq(r.dispatched, 0, 'no second waiting run');
ok(/A run already waits/.test(r.out), 'the log says one already waits');
r = pass('window shut, the waiting run is this one (woke after 5 h 45 min)', { list: [pr(722, 'BEHIND')], wfRuns: [run(9, WT, 345, 'in_progress')] }, win('0945', { RUN_ID: '9' }));
eq(r.dispatched, 1, 'it starts the next wait');
r = pass('window shut, an old waiting run has finished', { list: [pr(723, 'BEHIND')], wfRuns: [run(4, WT, 600)] }, win('0800', { RUN_ID: '9' }));
eq(r.dispatched, 1, 'a finished waiting run does not count');
r = pass('window shut, only urgent and held ones', { list: [pr(724, 'BEHIND', null, { labels: lbl('urgent') }), pr(725, 'BEHIND', null, { labels: lbl('hold') })], wfRuns: [] }, win('0800', { RUN_ID: '9' }));
eq(r.dispatched, 0, 'nothing waits for a window, so no waiting run');
r = pass('window open at 15:01', { list: [pr(726, 'BEHIND', null, off)], wfRuns: [] }, win('1501', { RUN_ID: '9' }));
eq([r.on, r.dispatched], [[726], 0], 'in a window nothing waits');
r = pass('window shut, the runs cannot be read', { list: [pr(727, 'BEHIND')], runsFail: true }, win('0800', { RUN_ID: '9' }));
eq(r.dispatched, 0, 'it does not start a run it cannot see is needed');
ok(/::warning::Could not look for the run that waits/.test(r.out), 'a warning says so, and the next pass looks again');
r = pass('window shut, starting the waiting run fails', { list: [pr(728, 'BEHIND')], wfRuns: [], dispatchFail: true }, win('0800', { RUN_ID: '9' }));
ok(r.dispatched === 3 && /::warning::Could not start the run that waits/.test(r.out), 'three tries, then a warning; the step does not fail');
// Release now lasts 30 minutes
r = pass('08:05, Release now at 07:53', { list: [pr(730, 'BEHIND', null, off), pr(731, 'BEHIND')], wfRuns: [run(8, RN, 12)] }, win('0805', { RUN_ID: '9' }));
eq([r.on, r.off, r.dispatched], [[730], [], 0], 'the next run keeps the window open: auto-merge on, none switched off, no waiting run');
ok(/Released by hand in the last 30 minutes/.test(r.out), 'the log says why the window is open');
r = pass('08:30, Release now at 07:53', { list: [pr(732, 'BEHIND')], wfRuns: [run(8, RN, 37)] }, win('0830', { RUN_ID: '9' }));
eq(r.off, [732], 'after 30 minutes the window is shut again');
r = pass('switch at 07:54, Release now a minute before', { wfRuns: [run(8, RN, 1)] }, swAt('0754', false, 733));
eq([r.on, r.off], [[733], []], 'the switch keeps auto-merge on (it switched #565 off on 6 Nov)');
r = pass('switch at 07:54, the runs cannot be read', { runsFail: true }, swAt('0754', false, 734));
eq([r.on, r.off], [[], [734]], 'unread runs mean no Release now: it waits for the window');
r = pass('switch at 07:54, an older Release now', { wfRuns: [run(7, RN, 45), run(6, WT, 3, 'in_progress')] }, swAt('0754', false, 735));
eq(r.off, [735], 'a Release now 45 minutes ago, or a waiting run, does not open the window');
// the waiting run's sleep: until a minute after the next window opens, at most 5 hours 45 minutes
ok(spawnSync('bash', ['-n', waitScript]).status === 0 && waitBody.indexOf('${{') < 0, 'the wait step is valid bash with no GitHub expressions');
const sleepAt = hhmm => pass('wait from ' + hhmm, {}, { script: waitScript, env: { RELEASE_WINDOWS: WINDOWS, NOW_HHMM: hhmm } }).slept;
eq(sleepAt('1230'), 151 * 60, 'from 12:30 it sleeps until 15:01');
eq(sleepAt('2200'), 31 * 60, 'from 22:00 it sleeps until 22:31');
eq(sleepAt('0800'), 20700, 'from 08:00 (7 hours to go) it sleeps 5 hours 45 minutes, then the queue starts the next wait');
eq(sleepAt('1630'), 20700, 'from 16:30 (the night window is 6 hours away) the same');
eq(sleepAt('1510'), 0, 'in a window it does not sleep');
eq(sleepAt('0001'), 20700, 'just after midnight it waits too');
const job = name => { const m = yml.match(new RegExp('\\n  ' + name + ':\\n([\\s\\S]*?)(?=\\n  [a-z]+:\\n|$)')); return m ? m[1] : ''; };
ok(/if: github\.event_name == 'workflow_dispatch' && inputs\.wait/.test(job('wait')) && /timeout-minutes: 350/.test(job('wait')), 'the wait job runs only for the waiting run, under GitHub\'s 6 hour limit');
ok(/needs: \[switch, backfill, wait\]/.test(job('queue')) && /actions: write/.test(job('queue')), 'the queue runs after the wait, and may start the waiting run');
ok(/inputs\.now/.test(job('backfill')), 'the backfill (auto-merge on for every ready one) runs only on Release now, never on the waiting run');
ok(/run-name: .*'Release now'.*'Waiting for the release window'/.test(yml), 'Release now and the waiting run carry the names the queue looks for');

// 8. The triggers: the end of Click tests moves the queue, and the schedule is off the hour.
const clickName = (fs.readFileSync(path.join(root, '.github', 'workflows', 'pr-tests.yml'), 'utf8').match(/^name: (.+)$/m) || [])[1];
ok(new RegExp('workflow_run:\\s*\\n\\s*workflows: \\[' + clickName + '\\]\\s*\\n\\s*types: \\[completed\\]').test(yml),
  'the queue runs when "' + clickName + '" completes (the name in pr-tests.yml)');
const cron = (yml.match(/cron: '([^']+)'/) || [])[1] || '';
ok(cron && cron.split(' ')[0].split(',').every(m => /^\d+$/.test(m) && +m !== 0), 'the schedule runs off the hour (' + cron + ')');

fs.rmSync(tmp, { recursive: true, force: true });
console.log((n - fails) + ' of ' + n + ' passed');
process.exit(fails ? 1 : 0);
