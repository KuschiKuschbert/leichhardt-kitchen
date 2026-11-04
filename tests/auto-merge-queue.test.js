/*
  The Auto-merge queue (.github/workflows/auto-merge.yml, step "Move the queue on by one", docs/auto-merge.md).
  No browser and no GitHub. The step's own bash is cut out of the workflow and run with bash -e, as GitHub runs it,
  with gh and sleep swapped for stand-ins that answer from a made-up list of pull requests and write down every call.
  The stand-in gh keeps only the --json fields asked for and runs the step's own --jq through jq, like gh does.

  The first case is 4 Nov 2026: #516 stayed UNKNOWN for over 50 minutes and #517 and #520, green and only behind main,
  waited the whole time. QUEUE_YML=<file> runs the same cases against another copy of the workflow (an older one).
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

// The stand-in for gh. The scenario file holds the list, each pull request's REST answers in turn (the last repeats;
// FAIL makes that call fail) and the exit code of gh pr checks (8 testing, 1 failed, 0 passed). listFail fails that
// many list calls first; put and merge hold each pull request's Update branch and auto-merge answers in turn (ok or FAIL).
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
  process.exit((st.checks || {})[a[2]] || 0);
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
} else { process.stderr.write('stand-in gh has no answer for: ' + a.join(' ') + '\\n'); process.exit(9); }
`, { mode: 0o755 });
// The stand-in for sleep: writes it down and returns at once, so ten minutes of waiting takes no time.
fs.writeFileSync(path.join(bin, 'sleep'), '#!/bin/sh\necho "sleep $*" >> "$CALLS"\n', { mode: 0o755 });

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
  fs.writeFileSync(fix, JSON.stringify(scenario));
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
    listed: log.filter(l => /^gh pr list /.test(l)).length,
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
  list: [pr(516, 'UNKNOWN', 40 * 60), pr(517, 'BLOCKED'), pr(520, 'BEHIND')], rest: { 516: ['unknown'] }, checks: { 517: 8 }
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
  list: [pr(534, 'UNKNOWN', 20), pr(535, 'BEHIND')], rest: { 534: ['blocked'] }, checks: { 534: 8 }
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
  list: [pr(570, 'DIRTY'), pr(571, 'BEHIND'), pr(572, 'BEHIND')], checks: { 571: 1 }
});
ok(/#570 has a conflict/.test(r.out) && /#571 failed Click tests/.test(r.out), 'a conflict and a failure are skipped');
eq(r.updated, [572], 'the first green one behind is brought up to date');
r = pass('testing first', { list: [pr(573, 'BLOCKED'), pr(574, 'BEHIND')], checks: { 573: 8 } });
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

// 6. GitHub errors are retried: three tries, 10 and 20 seconds apart (4 Nov 2026 outage).
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
const sw = { script: switchScript, env: { SAME: 'true', DRAFT: 'false', HOLD: 'false', PR: '610' } };
r = pass('switch: auto-merge fails once, then works', { merge: { 610: ['FAIL', 'ok'] } }, sw);
eq([r.merged, r.slept], [[610, 610], 10], 'switching auto-merge on is tried again after 10 seconds');
r = pass('switch: auto-merge fails three times', { merge: { 610: ['FAIL'] } }, Object.assign({ fails: true }, sw));
eq(r.merged, [610, 610, 610], 'three tries, then the switch job shows red so someone looks');
r = pass('switch: a draft', { merge: { 611: ['FAIL'] } }, { script: switchScript, env: { SAME: 'true', DRAFT: 'true', HOLD: 'false', PR: '611' } });
eq(r.merged, [611], 'switching auto-merge off is tried once and never fails the job');

// 7. The triggers: the end of Click tests moves the queue, and the schedule is off the hour.
const clickName = (fs.readFileSync(path.join(root, '.github', 'workflows', 'pr-tests.yml'), 'utf8').match(/^name: (.+)$/m) || [])[1];
ok(new RegExp('workflow_run:\\s*\\n\\s*workflows: \\[' + clickName + '\\]\\s*\\n\\s*types: \\[completed\\]').test(yml),
  'the queue runs when "' + clickName + '" completes (the name in pr-tests.yml)');
const cron = (yml.match(/cron: '([^']+)'/) || [])[1] || '';
ok(cron && cron.split(' ')[0].split(',').every(m => /^\d+$/.test(m) && +m !== 0), 'the schedule runs off the hour (' + cron + ')');

fs.rmSync(tmp, { recursive: true, force: true });
console.log((n - fails) + ' of ' + n + ' passed');
process.exit(fails ? 1 : 0);
