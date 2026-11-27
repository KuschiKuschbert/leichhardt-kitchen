/*
  Publishing the site only when the phones need it (13 Nov 2026, docs/site-publishing.md).
  No browser and no GitHub. scripts/site-changed.sh is given lists of changed files. The steps of
  .github/workflows/publish-site.yml, live-tests.yml and publish-rules.yml that decide are cut out and run with bash -e,
  as GitHub runs them, in a made-up git repository, with gh swapped for a stand-in that answers from made-up
  deployments and jobs and runs the step's own --jq through jq, like gh does.
  The first case is 12 Nov 2026: #684 changed README.md only, and every phone was offered a new version.
  Needs bash, git and jq (GitHub's runners have all three).
*/
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
let n = 0, fails = 0;
function ok(cond, msg) { n++; if (cond) console.log('PASS ' + msg); else { fails++; console.log('FAIL ' + msg); } }
function eq(a, b, msg) { const same = JSON.stringify(a) === JSON.stringify(b); ok(same, msg + (same ? '' : ' (got ' + JSON.stringify(a) + ', wanted ' + JSON.stringify(b) + ')')); }

if (spawnSync('jq', ['--version']).status !== 0) {
  if (process.env.CI) { console.log('FAIL jq is not installed on this runner'); process.exit(1); }
  console.log('SKIP jq is not installed here: the publish test needs it (GitHub\'s runners have it)');
  process.exit(0);
}

const root = path.join(__dirname, '..');
const wf = name => fs.readFileSync(path.join(root, '.github', 'workflows', name), 'utf8');
const classifier = path.join(root, 'scripts', 'site-changed.sh');

// The run: | block of the step with this name (or id), as YAML hands it to bash.
function stepScript(text, key) {
  const lines = text.split('\n');
  const at = lines.findIndex(l => l.trim() === '- name: ' + key || l.trim() === '- id: ' + key);
  if (at < 0) throw new Error('no step ' + key);
  const stepIndent = lines[at].indexOf('-');
  let r = -1;
  for (let i = at + 1; i < lines.length; i++) {
    if (lines[i].trim() && lines[i].search(/\S/) <= stepIndent) break;
    if (/^\s*run: \|\s*$/.test(lines[i])) { r = i; break; }
  }
  if (r < 0) throw new Error('no run: | block in ' + key);
  const runIndent = lines[r].search(/\S/), body = [];
  for (let i = r + 1; i < lines.length; i++) {
    if (lines[i].trim() && lines[i].search(/\S/) <= runIndent) break;
    body.push(lines[i]);
  }
  const ind = body.find(l => l.trim()).search(/\S/);
  return body.map(l => l.slice(ind)).join('\n').replace(/\s+$/, '') + '\n';
}

// 1. Which files the site needs
function needs(files) {
  const r = spawnSync('bash', [classifier], { input: files.join('\n') + '\n', encoding: 'utf8' });
  return r.stdout.split('\n').filter(Boolean);
}
eq(needs(['README.md']), [], '#684, README.md alone: nothing to publish');
eq(needs(['docs/head-chef-decisions.md', 'docs/x-options/every-page.html', 'docs/x-options/shots/a.png', 'CLAUDE.md', 'AGENTS.md', 'menu-survey.md']), [], 'notes and design studies: nothing to publish');
eq(needs(['tests/prep.test.js', 'tests/rules/access.test.mjs', 'tests/fake/firebase-firestore.js', 'tests/lib.js', 'tests/run.js', 'tests/package.json', 'tests/package-lock.json']), [], 'tests run by node: nothing to publish');
eq(needs(['scripts/nightly-learning.mjs', 'scripts/site-changed.sh', '.github/workflows/publish-site.yml', '.claude/settings.json', 'firestore.rules', '.gitignore']), [], 'server scripts, workflows, the rules template: nothing to publish');
eq(needs(['js/app.js', 'js/data.js', 'css/app.css', 'index.html', 'sw.js', 'manifest.webmanifest', 'fonts/a.ttf', 'art/mascot/a.png', 'guides/smoke-prep.png', 'icons/a.png', 'qr.svg', '.nojekyll']),
  ['js/app.js', 'js/data.js', 'css/app.css', 'index.html', 'sw.js', 'manifest.webmanifest', 'fonts/a.ttf', 'art/mascot/a.png', 'guides/smoke-prep.png', 'icons/a.png', 'qr.svg', '.nojekyll'], 'every file the book loads is published');
eq(needs(['tests/contact.html', 'tests/contact-page.js']), ['tests/contact.html', 'tests/contact-page.js'], 'the test page the live click tests open from the site, and its script, are published');
// 26 Nov 2026: the helpers, fixtures and runners in tests/ that only node runs asked every phone to update
eq(needs(['tests/plating-check.js', 'tests/compose-read.js', 'tests/compose-sheet.js', 'tests/smart-match.js', 'tests/library-check.js', 'tests/style-check.js', 'tests/shots-diff.js', 'tests/serve.js', 'tests/contact.js', 'tests/avc-fixture.js', 'tests/roster-fixture.js', 'tests/supplier-fixtures.js', 'tests/timings.json', 'tests/newhelper.js']), [], 'helpers, fixtures and runners only node runs: nothing to publish, a new one too');
eq(needs(['tests/plating-check.js', 'tests/contact-page.js']), ['tests/contact-page.js'], 'a helper with the live test page: the page is published');
eq(needs(['newfolder/thing.js']), ['newfolder/thing.js'], 'a file in a folder nobody named counts as needed');
eq(needs(['README.md', 'js/prep.js']), ['js/prep.js'], 'a mixed change publishes');
eq(needs(['venues/leichhardt.json', 'venues/demo/qr.svg']), [], 'the venue files are read by the workflows only: nothing to publish (19 Nov 2026)');

// A made-up repository and a stand-in gh
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-site-'));
const repo = path.join(tmp, 'repo'), bin = path.join(tmp, 'bin'), answers = path.join(tmp, 'answers');
[repo, bin, answers].forEach(d => fs.mkdirSync(d));
fs.writeFileSync(path.join(bin, 'gh'), [
  '#!/usr/bin/env bash',
  '# gh api <path> --jq <expr>: the answer saved for that path, through jq; no answer saved is an error, as when GitHub does not answer',
  'if [ "$1" = workflow ]; then echo "${*:2}" >> "${GH_CALLS:-/dev/null}"; case " $* " in *" ${GH_FAIL:-none} "*) exit 1 ;; esac; exit 0; fi',
  '[ "$1" = api ] || exit 2',
  'key=$(printf "%s" "$2" | tr -c "A-Za-z0-9" "_")',
  'f="' + answers + '/$key.json"',
  '[ -f "$f" ] || { echo "gh: not found" >&2; exit 1; }',
  'if [ "$3" = --jq ]; then jq -r "$4" "$f"; else cat "$f"; fi',
  ''].join('\n'));
fs.chmodSync(path.join(bin, 'gh'), 0o755);
function answer(apiPath, value) { fs.writeFileSync(path.join(answers, apiPath.replace(/[^A-Za-z0-9]/g, '_') + '.json'), JSON.stringify(value)); }
function clearAnswers() { fs.readdirSync(answers).forEach(f => fs.unlinkSync(path.join(answers, f))); }
function git(...args) { const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' }); if (r.status) throw new Error(r.stderr); return r.stdout.trim(); }
function commit(files, msg) {
  for (const f of files) { fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true }); fs.appendFileSync(path.join(repo, f), msg + '\n'); }
  git('add', '-A'); git('commit', '-q', '-m', msg); return git('rev-parse', 'HEAD');
}
git('init', '-q'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
fs.mkdirSync(path.join(repo, 'scripts')); fs.copyFileSync(classifier, path.join(repo, 'scripts', 'site-changed.sh'));

function run(script, env) {
  const out = path.join(tmp, 'output'); fs.writeFileSync(out, '');
  const file = path.join(tmp, 'step.sh'); fs.writeFileSync(file, script);
  const r = spawnSync('bash', ['-e', file], { cwd: repo, encoding: 'utf8',
    env: Object.assign({}, process.env, { PATH: bin + ':' + process.env.PATH, GITHUB_OUTPUT: out, REPO: 'k/book', GH_TOKEN: 'x' }, env) });
  const got = {};
  fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).forEach(l => { const i = l.indexOf('='); got[l.slice(0, i)] = l.slice(i + 1); });
  got.status = r.status; got.log = r.stdout + r.stderr;
  return got;
}

// 2. Publish site, the decision
const decide = stepScript(wf('publish-site.yml'), 'Decide whether the phones need a new copy');
function deployments(list) {
  answer('repos/k/book/pages', { build_type: 'workflow' });
  answer('repos/k/book/deployments?environment=github-pages&per_page=30', list.map((d, i) => ({ id: 100 - i, sha: d.sha })));
  list.forEach((d, i) => answer('repos/k/book/deployments/' + (100 - i) + '/statuses?per_page=1', d.state ? [{ state: d.state }] : []));
}
const c1 = commit(['js/app.js', 'README.md'], 'first');
let r;

clearAnswers(); answer('repos/k/book/pages', { build_type: 'legacy' });
r = run(decide, { EVENT: 'push' });
eq([r.status, r.source, r.deploy], [0, 'legacy', 'false'], 'Pages still publishing from the branch: this publishes nothing and says so');
ok(/Source to GitHub Actions/.test(r.log), 'and the warning says which setting to change');

clearAnswers(); deployments([{ sha: c1, state: 'success' }]);
r = run(decide, { EVENT: 'workflow_dispatch' });
eq([r.status, r.deploy], [0, 'true'], 'Run workflow by hand always publishes');

clearAnswers(); answer('repos/k/book/pages', { build_type: 'workflow' }); answer('repos/k/book/deployments?environment=github-pages&per_page=30', []);
r = run(decide, { EVENT: 'push' });
eq([r.status, r.deploy], [0, 'true'], 'nothing published yet: publishes');

clearAnswers(); answer('repos/k/book/pages', { build_type: 'workflow' });
r = run(decide, { EVENT: 'push' });
eq([r.status, r.deploy], [0, 'true'], 'GitHub not answering about deployments: publishes rather than miss a change');

const c2 = commit(['README.md', 'docs/a.md', 'tests/prep.test.js'], 'notes only');
clearAnswers(); deployments([{ sha: c1, state: 'success' }]);
r = run(decide, { EVENT: 'push' });
eq([r.status, r.deploy], [0, 'false'], '#684 again: README, a note and a test after the live commit, no publish');
ok(/no phone is asked to update/.test(r.log), 'and the log says why');

const c3 = commit(['js/prep.js'], 'app');
clearAnswers(); deployments([{ sha: c2, state: 'failure' }, { sha: c1, state: 'success' }]);
r = run(decide, { EVENT: 'push' });
eq([r.status, r.deploy], [0, 'true'], 'a file the phones load changed since the live commit: publishes');

commit(['docs/b.md'], 'note after a failed publish');
clearAnswers(); deployments([{ sha: c3, state: 'failure' }, { sha: c2, state: 'inactive' }, { sha: c1, state: 'success' }]);
r = run(decide, { EVENT: 'push' });
eq([r.status, r.deploy], [0, 'true'], 'a note after a failed publish of js/prep.js: compares with what is really live, so js/prep.js still goes out');

clearAnswers(); deployments([{ sha: c3, state: 'success' }]);
r = run(decide, { EVENT: 'push' });
eq([r.status, r.deploy], [0, 'false'], 'a note after a good publish: no publish');

clearAnswers(); deployments([{ sha: 'f'.repeat(40), state: 'success' }]);
r = run(decide, { EVENT: 'push' });
eq([r.status, r.deploy], [0, 'true'], 'a live commit this copy does not know: publishes');

// 2b. Publish times (head chef, 24 Nov 2026, docs/loading-wait-options/brief.md): outside the windows a change the phones
// load waits (held) unless its pull request is labelled urgent; a timed run in a window publishes what waited.
const W = { PUBLISH_WINDOWS: '1505-1630 2235-2400' };
const c4 = commit(['js/prep.js'], 'an app change outside the windows');
const pulls = 'repos/k/book/commits/' + c4 + '/pulls';
clearAnswers(); deployments([{ sha: c3, state: 'success' }]); answer(pulls, [{ labels: [{ name: 'feature' }] }]);
r = run(decide, Object.assign({ EVENT: 'push', SHA: c4, NOW_HHMM: '1200' }, W));
eq([r.status, r.deploy, r.held], [0, 'false', 'true'], 'publish times: at 12:00 a change the phones load is held');
ok(/held\. The phones get it at the next window/.test(r.log), 'publish times: the log says it waits for the next window');
for (const [t, want] of [['1504', 'false'], ['1505', 'true'], ['1629', 'true'], ['1630', 'false'], ['2234', 'false'], ['2235', 'true'], ['2359', 'true'], ['0000', 'false'], ['0300', 'false']]) {
  r = run(decide, Object.assign({ EVENT: 'push', SHA: c4, NOW_HHMM: t }, W));
  eq(r.deploy, want, 'publish times: a merge at ' + t.slice(0, 2) + ':' + t.slice(2) + (want === 'true' ? ' publishes' : ' waits'));
}
answer(pulls, [{ labels: [{ name: 'urgent' }] }]);
r = run(decide, Object.assign({ EVENT: 'push', SHA: c4, NOW_HHMM: '1200' }, W));
eq([r.deploy, r.held], ['true', undefined], 'publish times: a merge labelled urgent publishes at once');
ok(/Labelled urgent/.test(r.log), 'publish times: and says why');
clearAnswers(); deployments([{ sha: c3, state: 'success' }]);
r = run(decide, Object.assign({ EVENT: 'push', SHA: c4, NOW_HHMM: '1200' }, W));
eq(r.deploy, 'true', 'publish times: GitHub not saying which labels: publishes rather than hold a fix unseen');
r = run(decide, Object.assign({ EVENT: 'schedule', SHA: c4, NOW_HHMM: '2255' }, W));
eq(r.deploy, 'true', 'publish times: the timed run in the night window publishes what waited');
r = run(decide, Object.assign({ EVENT: 'schedule', SHA: c4, NOW_HHMM: '1150' }, W));
eq([r.deploy, r.held], ['false', 'true'], 'publish times: a timed run GitHub ran late, outside the windows, still holds');
r = run(decide, Object.assign({ EVENT: 'workflow_dispatch', SHA: c4, NOW_HHMM: '1200' }, W));
eq(r.deploy, 'true', 'publish times: Run workflow by hand publishes at any time');
clearAnswers(); deployments([{ sha: c4, state: 'success' }]);
commit(['docs/e.md'], 'a note outside the windows');
r = run(decide, Object.assign({ EVENT: 'push', SHA: c4, NOW_HHMM: '1200' }, W));
eq([r.deploy, r.held], ['false', undefined], 'publish times: nothing the phones load changed: nothing held, so Published runs and rules alone still go out');
{
  const yml = wf('publish-site.yml');
  ok(/^\s+PUBLISH_WINDOWS: '1505-1630 2235-2400'$/m.test(yml), 'publish times: the windows are 15:05 to 16:30 and 22:35 to midnight, Queensland time');
  ok(["'5,25,45 5 * * *'", "'5,25 6 * * *'", "'35,55 12 * * *'", "'15,35,55 13 * * *'"].every(c => yml.includes('cron: ' + c)), 'publish times: timed runs every 20 minutes inside both windows (UTC)');
  ok(yml.includes("needs.check.outputs.held != 'true'"), 'publish times: Published does not run while a change is held, so no rules go out ahead of their code');
}

// 2c. The waiting run (24 Nov 2026): GitHub ran none of the timed runs on the windows' first evening, so the 22:35 window
// passed with four changes held. A held change starts a run that sleeps until a minute after the next window opens,
// then a window run publishes what waited; the timed runs stay as a fallback.
{
  const yml = wf('publish-site.yml');
  clearAnswers(); deployments([{ sha: c3, state: 'success' }]); answer(pulls, [{ labels: [] }]);
  r = run(decide, Object.assign({ EVENT: 'workflow_dispatch', TIMED: 'true', SHA: c4, NOW_HHMM: '2236' }, W));
  eq([r.deploy, r.held], ['true', undefined], 'waiting run: the window run it starts at 22:36 publishes what waited');
  r = run(decide, Object.assign({ EVENT: 'workflow_dispatch', TIMED: 'true', SHA: c4, NOW_HHMM: '2216' }, W));
  eq([r.deploy, r.held], ['false', 'true'], 'waiting run: a window run woken early by the cap (22:16) holds again, so the next wait starts');
  r = run(decide, Object.assign({ EVENT: 'workflow_dispatch', TIMED: 'false', SHA: c4, NOW_HHMM: '1200' }, W));
  eq(r.deploy, 'true', 'waiting run: Run workflow by hand still publishes at any time');
  ok(/needs\.check\.outputs\.held == 'true'/.test((yml.split('\n  hold:')[1] || '').split('\n  deploy:')[0]) && /gh workflow run publish-site\.yml --repo "\$REPO" --ref main -f wait=true/.test(yml),
    'waiting run: a held change starts it');
  const waitJob = yml.split('\n  wait:')[1] || '';
  ok(/if: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.wait \}\}/.test(waitJob) && /-f timed=true/.test(waitJob), 'waiting run: when it wakes it starts a window run');
  ok(+((waitJob.match(/timeout-minutes: (\d+)/) || [])[1]) >= 350 && +((waitJob.match(/timeout-minutes: (\d+)/) || [])[1]) < 360, 'waiting run: its job may last the 5 hours 45 minutes, inside GitHub\'s 6-hour limit');
  ok(yml.includes("group: ${{ github.event_name == 'workflow_dispatch' && inputs.wait && 'publish-wait' || 'pages' }}"), 'waiting run: it sleeps in a group of its own, so it never holds up a publish');
  ok(yml.includes("if: ${{ !(github.event_name == 'workflow_dispatch' && inputs.wait) }}"), 'waiting run: it does not check or publish itself, so it never publishes outside a window');
  let sleepStep = 'exit 1\n'; try { sleepStep = stepScript(yml, 'Sleep until the next publish window'); } catch (e) { ok(false, 'waiting run: its sleep step is there'); }
  const sleepBin = path.join(tmp, 'sleepbin'), slept = path.join(tmp, 'slept');
  fs.mkdirSync(sleepBin, { recursive: true });
  fs.writeFileSync(path.join(sleepBin, 'sleep'), '#!/usr/bin/env bash\necho "$1" > "' + slept + '"\n'); fs.chmodSync(path.join(sleepBin, 'sleep'), 0o755);
  for (const [t, secs] of [['1200', 186 * 60], ['1504', 2 * 60], ['1631', 345 * 60], ['2234', 2 * 60], ['0000', 345 * 60], ['2100', 96 * 60]]) {
    fs.writeFileSync(slept, '');
    r = run(sleepStep, Object.assign({ NOW_HHMM: t, PATH: sleepBin + ':' + bin + ':' + process.env.PATH }, W));
    eq([r.status, fs.readFileSync(slept, 'utf8').trim()], [0, String(secs)], 'waiting run: from ' + t.slice(0, 2) + ':' + t.slice(2) + ' it sleeps ' + secs / 60 + ' minutes');
  }
}

// 3. Deploy waits for the artifact produced by this attempt.
const publish = wf('publish-site.yml');
const waitArtifact = stepScript(publish, "Wait for this attempt's Pages artifact");
ok(publish.includes('PAGES_ARTIFACT_NAME: github-pages-${{ github.run_attempt }}') &&
  publish.includes('name: ${{ env.PAGES_ARTIFACT_NAME }}') &&
  publish.includes('artifact_name: ${{ env.PAGES_ARTIFACT_NAME }}'), 'upload and Deploy use the same attempt-specific artifact name');

const artifactApi = 'repos/k/book/actions/runs/7/artifacts?name=github-pages-2&per_page=100';
const artifactEnv = { GITHUB_REPOSITORY: 'k/book', GITHUB_RUN_ID: '7', PAGES_ARTIFACT_NAME: 'github-pages-2', PAGES_ARTIFACT_ID: '42' };
const artifact = { id: 42, name: 'github-pages-2', expired: false };
const older = { id: 41, name: 'github-pages-1', expired: false };
const artifactPath = path.join(answers, artifactApi.replace(/[^A-Za-z0-9]/g, '_') + '.json');
const delayedPath = path.join(tmp, 'delayed-artifacts.json');
fs.writeFileSync(delayedPath, JSON.stringify({ artifacts: [older, artifact] }));
fs.writeFileSync(path.join(bin, 'sleep'), [
  '#!/usr/bin/env bash',
  'if [ "${ADD_ARTIFACT_AFTER_WAIT:-}" = yes ]; then cp "$DELAYED_ARTIFACTS" "$ARTIFACT_ANSWER"; fi',
  ''
].join('\n'), { mode: 0o755 });

clearAnswers(); answer(artifactApi, { artifacts: [older] });
eq(run(waitArtifact, { ...artifactEnv, ADD_ARTIFACT_AFTER_WAIT: 'yes', DELAYED_ARTIFACTS: delayedPath, ARTIFACT_ANSWER: artifactPath }).status, 0,
  'Deploy waits through the older artifact until this attempt’s upload appears');
answer(artifactApi, { artifacts: [older, { ...artifact, expired: true }, { ...artifact, id: 43 }] });
r = run(waitArtifact, artifactEnv);
eq(r.status, 1, 'Deploy rejects an expired artifact and a matching name with the wrong ID');
ok(/did not become visible/.test(r.log), 'an artifact that stays unavailable gives a precise failure');
answer(artifactApi, { artifacts: [artifact, { ...artifact, id: 43 }] });
eq(run(waitArtifact, artifactEnv).status, 1, 'two live artifacts under the same name cannot reach Deploy');
eq(run(waitArtifact, { ...artifactEnv, PAGES_ARTIFACT_ID: '' }).status, 1, 'a missing upload ID fails before deploying');

// 4. Live click tests follow a real publish only
const look = stepScript(wf('live-tests.yml'), 'Look at the publish run');
function jobs(list) { answer('repos/k/book/actions/runs/7/jobs', { jobs: list.map(j => ({ name: j[0], conclusion: j[1] })) }); }
clearAnswers();
eq(run(look, { EVENT: 'workflow_dispatch' }).run, 'true', 'live tests: run by hand');
eq(run(look, { EVENT: 'workflow_run', FROM: 'pages-build-deployment', RUN_ID: '7' }).run, 'true', 'live tests: after GitHub\'s own publish from the branch');
jobs([['Check', 'success'], ['Deploy', 'success'], ['Published', 'success']]);
eq(run(look, { EVENT: 'workflow_run', FROM: 'Publish site', RUN_ID: '7' }).run, 'true', 'live tests: after Publish site published');
jobs([['Check', 'success'], ['Deploy', 'skipped'], ['Published', 'success']]);
eq(run(look, { EVENT: 'workflow_run', FROM: 'Publish site', RUN_ID: '7' }).run, 'false', 'live tests: not when nothing was published');
clearAnswers();
eq(run(look, { EVENT: 'workflow_run', FROM: 'Publish site', RUN_ID: '7' }).run, 'true', 'live tests: GitHub not answering runs them anyway');
// A run that skips never cancels one that tests (24 Nov 2026): the cancelling sits on the test jobs, which a skipping
// run never starts. At workflow level, #850's and #849's runs (nothing published) cancelled #851's live tests.
const liveWf = wf('live-tests.yml');
const jobBlock = name => { const m = new RegExp('^  ' + name + ':\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))', 'm').exec(liveWf); return m ? m[1] : ''; };
ok(!/^concurrency:/m.test(liveWf), 'live tests: no cancelling for the whole workflow, where a run that skips would cancel one that tests');
ok(!/^    concurrency:/m.test(jobBlock('gate')), 'live tests: the publish look itself cancels nothing');
ok(/^    concurrency:\n      group: live-tests-\$\{\{ matrix\.shard \}\}\n      cancel-in-progress: true$/m.test(jobBlock('test')), 'live tests: a newer run that tests replaces the older one share by share');
ok(/^    concurrency:\n      group: live-tests-venues\n      cancel-in-progress: true$/m.test(jobBlock('venues')), 'live tests: and the venue copies check the same way');

// 5. Publish rules waits for Published, which also runs when nothing needed publishing
const access = stepScript(wf('publish-rules.yml'), 'access');
commit(['firestore.rules'], 'rules only');
clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'skipped'], ['Published', 'success']]);
eq(run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7' }).publish, 'true', 'rules: a change to firestore.rules alone is published though the site was not');
jobs([['Check', 'success'], ['Deploy', 'skipped'], ['Published', 'skipped']]);
eq(run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7' }).publish, 'false', 'rules: not from Publish site while Pages still publishes from the branch (GitHub\'s publish brings it)');
jobs([['Check', 'success'], ['Deploy', 'failure'], ['Published', 'skipped']]);
eq(run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7' }).publish, 'false', 'rules: not when publishing the site failed, so stricter rules never go ahead of the code');
eq(run(access, { EVENT_NAME: 'workflow_run', FROM: 'pages-build-deployment', RUN_ID: '7' }).publish, 'true', 'rules: after GitHub\'s own publish, as before');
commit(['docs/c.md'], 'note');
jobs([['Check', 'success'], ['Deploy', 'skipped'], ['Published', 'success']]);
eq(run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7' }).publish, 'false', 'rules: a note alone publishes no rules');

// Publish times (24 Nov 2026): rules that waited with their held code go out when the site does, not only the last commit's
const before0 = commit(['js/app.js'], 'live before the held change');
commit(['firestore.rules', 'js/prep.js'], 'rules and code, held');
const after0 = commit(['docs/f.md'], 'a note after');
function pagesLive(list) {
  answer('repos/k/book/deployments?environment=github-pages&per_page=30', list.map((d, i) => ({ id: 300 - i, sha: d.sha })));
  list.forEach((d, i) => answer('repos/k/book/deployments/' + (300 - i) + '/statuses?per_page=30', d.states.map(state => ({ state }))));
}
clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'success'], ['Published', 'success']]);
pagesLive([{ sha: after0, states: ['success'] }, { sha: before0, states: ['inactive', 'success', 'in_progress'] }]);
r = run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7', TRIGGER: 'schedule' });
eq(r.publish, 'true', 'rules: held with their code, they publish when the timed run publishes the site (the last commit was a note)');
const after1 = commit(['js/app.js'], 'code only');
clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'success'], ['Published', 'success']]);
pagesLive([{ sha: after1, states: ['success'] }, { sha: after0, states: ['inactive', 'success'] }]);
r = run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7', TRIGGER: 'push' });
eq(r.publish, 'false', 'rules: a site publish with no rules change since the version before publishes no rules');
clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'success'], ['Published', 'success']]);
r = run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7', TRIGGER: 'push' });
eq(r.publish, 'true', 'rules: the version live before not known: publishes the rules rather than miss a change');
commit(['firestore.rules'], 'rules only, published at once');
clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'skipped'], ['Published', 'success']]);
r = run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7', TRIGGER: 'schedule' });
eq(r.publish, 'false', 'rules: a timed run that published nothing brings no rules (the last commit\'s went out with its own push)');
r = run(access, { EVENT_NAME: 'workflow_run', FROM: 'Publish site', RUN_ID: '7', TRIGGER: 'push' });
eq(r.publish, 'true', 'rules: a push of the rules alone still publishes them at once');

// 6. After a window publish (27 Nov 2026): GitHub starts no workflow when a run its bot started ends, and the window run
// is one (the waiting run starts it). No Live click tests ran after the 26 Nov 22:36 and 27 Nov 15:06 window publishes,
// and rules held with their code would have stayed held. That run now starts both itself, and Publish rules decides from it.
{
  const yml = wf('publish-site.yml');
  const follow = (yml.split('\n  follow:\n')[1] || '').split(/\n  [\w-]+:\n/)[0];
  ok(/if: \$\{\{ always\(\) && needs\.deploy\.result == 'success' && needs\.published\.result == 'success' && github\.event_name == 'workflow_dispatch' && github\.triggering_actor == 'github-actions\[bot\]' \}\}/.test(follow),
    'window publish: only a run the bot started, once it published and Published ran, starts the followers (a person\'s run is followed by GitHub, so nothing runs twice)');
  ok(/needs: \[check, deploy, published\]/.test(follow) && /permissions:\n      actions: write/.test(follow), 'window publish: it waits for Published and may start workflows');
  let step = 'exit 1\n'; try { step = stepScript(yml, 'Start Live click tests and Publish rules'); } catch (e) { ok(false, 'window publish: its step is there'); }
  const calls = path.join(tmp, 'gh-calls'), SITE = { SITE_RUN: '45943786682', SITE_SHA: 'a'.repeat(40) };
  const started = () => fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').split('\n').filter(Boolean) : [];
  fs.writeFileSync(calls, ''); r = run(step, Object.assign({ GH_CALLS: calls }, SITE));
  const got = started();
  eq([r.status, got.length], [0, 2], 'window publish: it starts two workflows');
  ok(/^run live-tests\.yml --repo k\/book --ref main$/.test(got[0] || ''), 'window publish: Live click tests on main (' + got[0] + ')');
  ok((got[1] || '') === 'run publish-rules.yml -f mode=publish -f venue=all -f site_run=45943786682 -f site_sha=' + 'a'.repeat(40) + ' --repo k/book --ref main',
    'window publish: Publish rules on main, told this run and the commit it published (' + got[1] + ')');
  fs.writeFileSync(calls, ''); r = run(step, Object.assign({ GH_CALLS: calls, GH_FAIL: 'live-tests.yml' }, SITE));
  eq([r.status, started().filter(c => /publish-rules\.yml/.test(c)).length], [1, 1], 'window publish: Live click tests not starting still starts Publish rules, and the run fails');
  ok(/Could not start Live click tests after this window publish/.test(r.log), 'window publish: and says which one to run by hand');
  fs.writeFileSync(calls, ''); r = run(step, Object.assign({ GH_CALLS: calls, GH_FAIL: 'publish-rules.yml' }, SITE));
  eq([r.status, started().filter(c => /live-tests\.yml/.test(c)).length], [1, 1], 'window publish: Publish rules not starting still starts Live click tests, and the run fails');
  ok(/Could not start Publish rules after this window publish/.test(r.log), 'window publish: and says Publish rules is the one to run by hand');
}
{
  // Publish rules started by the window run decides as after it: rules that waited with their code go out once, after it
  const rulesWf = wf('publish-rules.yml');
  ok((rulesWf.match(/ref: \$\{\{ github\.event\.workflow_run\.head_sha \|\| inputs\.site_sha \|\| github\.sha \}\}/g) || []).length === 2,
    'window publish: Publish rules checks out the commit the window run published, not a newer main');
  // the step reads them from env only: inputs.site_run once (its env line), inputs.site_sha three times (its env line, the two checkouts)
  eq([(rulesWf.match(/inputs\.site_run/g) || []).length, (rulesWf.match(/inputs\.site_sha/g) || []).length,
    /^          SITE_RUN: \$\{\{ inputs\.site_run \}\}\n          SITE_SHA: \$\{\{ inputs\.site_sha \}\}$/m.test(rulesWf)], [1, 3, true], 'window publish: the inputs reach the step through env only');
  const access6 = stepScript(rulesWf, 'access');
  const held = commit(['firestore.rules', 'js/prep.js'], 'rules and code, held for the window');
  const note = commit(['docs/g.md'], 'a note after');
  git('update-ref', 'refs/remotes/origin/main', note);
  const W6 = { EVENT_NAME: 'workflow_dispatch', SITE_RUN: '7', SITE_SHA: note };
  clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'success'], ['Published', 'success'], ['Start the live tests and rules', 'in_progress']]);
  pagesLive([{ sha: note, states: ['success'] }, { sha: before0, states: ['inactive', 'success'] }]);
  r = run(access6, W6);
  eq([r.status, r.publish], [0, 'true'], 'window publish: rules held with their code are published after the window run published the site');
  const code = commit(['js/app.js'], 'code only, held for the window');
  git('update-ref', 'refs/remotes/origin/main', code);
  clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'success'], ['Published', 'success']]);
  pagesLive([{ sha: code, states: ['success'] }, { sha: note, states: ['inactive', 'success'] }]);
  r = run(access6, Object.assign({}, W6, { SITE_SHA: code }));
  eq([r.status, r.publish], [0, 'false'], 'window publish: no rules change since the version before: no rules');
  clearAnswers(); jobs([['Check', 'success'], ['Deploy', 'skipped'], ['Published', 'success']]);
  commit(['firestore.rules'], 'rules alone, already out with their own push');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  r = run(access6, Object.assign({}, W6, { SITE_SHA: git('rev-parse', 'HEAD') }));
  eq([r.status, r.publish], [0, 'false'], 'window publish: a window run that published nothing brings no rules (the last commit\'s went out with its push)');
  jobs([['Check', 'success'], ['Deploy', 'success'], ['Published', 'skipped']]);
  r = run(access6, Object.assign({}, W6, { SITE_SHA: git('rev-parse', 'HEAD') }));
  eq([r.status, r.publish], [0, 'false'], 'window publish: not while Published did not run (a venue copy failed), so no rules go ahead of their code');
  for (const [bad, why] of [[{ SITE_RUN: '7; true' }, 'a run that is not a number'], [{ SITE_SHA: 'main' }, 'a commit that is not a whole commit id'],
    [{ SITE_SHA: held }, 'a commit that is not this checkout']]) {
    r = run(access6, Object.assign({}, W6, { SITE_SHA: git('rev-parse', 'HEAD') }, bad));
    eq([r.status, r.publish], [1, undefined], 'window publish: ' + why + ' publishes nothing');
  }
  const side = git('commit-tree', 'HEAD^{tree}', '-p', 'HEAD', '-m', 'not on main');
  git('checkout', '-q', side);
  r = run(access6, Object.assign({}, W6, { SITE_SHA: side }));
  eq([r.status, r.publish], [1, undefined], 'window publish: a commit not on main publishes nothing');
  git('checkout', '-q', '-');
  clearAnswers();
  r = run(access6, { EVENT_NAME: 'workflow_dispatch' });
  eq([r.status, r.publish], [0, 'true'], 'Run workflow by hand still publishes the rules');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log((n - fails) + ' of ' + n + ' passed');
process.exit(fails ? 1 : 0);
