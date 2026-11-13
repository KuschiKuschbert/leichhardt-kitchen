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
eq(needs(['tests/contact.html', 'tests/compose-read.js']), ['tests/contact.html', 'tests/compose-read.js'], 'the test page the live click tests open from the site is published');
eq(needs(['newfolder/thing.js']), ['newfolder/thing.js'], 'a file in a folder nobody named counts as needed');
eq(needs(['README.md', 'js/prep.js']), ['js/prep.js'], 'a mixed change publishes');

// A made-up repository and a stand-in gh
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-site-'));
const repo = path.join(tmp, 'repo'), bin = path.join(tmp, 'bin'), answers = path.join(tmp, 'answers');
[repo, bin, answers].forEach(d => fs.mkdirSync(d));
fs.writeFileSync(path.join(bin, 'gh'), [
  '#!/usr/bin/env bash',
  '# gh api <path> --jq <expr>: the answer saved for that path, through jq; no answer saved is an error, as when GitHub does not answer',
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

// 3. Live click tests follow a real publish only
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

// 4. Publish rules waits for Published, which also runs when nothing needed publishing
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

fs.rmSync(tmp, { recursive: true, force: true });
console.log((n - fails) + ' of ' + n + ' passed');
process.exit(fails ? 1 : 0);
