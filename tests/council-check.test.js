// scripts/council-check.mjs (5 Nov 2026): a ready pull request that changes the app says what the service council
// decided. Pure node, no browser and no GitHub.
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const C = await import('../scripts/council-check.mjs');
  const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
  const tpl = fs.readFileSync(path.join(__dirname, '..', '.github', 'pull_request_template.md'), 'utf8');
  const app = ['js/prep.js', 'css/app.css'];

  // which files need a verdict
  ok(C.appFiles(['docs/x-options/brief.md', 'README.md', 'tests/prep.test.js', '.github/workflows/pr-tests.yml', '.claude/skills/a/SKILL.md']).length === 0, 'notes, tests and repo tooling alone need no verdict');
  ok(C.appFiles(['js/prep.js', 'index.html', 'sw.js', 'firestore.rules', 'scripts/nightly-learn.mjs', 'css/app.css']).length === 6, 'the book, its rules and its server jobs need one');
  ok(C.check('', ['docs/a.md', 'CLAUDE.md']).ok, 'a docs-only pull request passes with no Council section');

  // which verdict lines count
  const say = v => '## Why\nx\n\n## Council\n' + v + '\n\n## Files\n';
  for (const v of ['Build', 'Build smaller', "Don't build", 'Your call', 'Not needed']) {
    const r = C.check(say('Verdict: ' + v + ' (4 of 5)'), app);
    ok(r.ok && r.verdict === v, '"Verdict: ' + v + '" passes and is read as ' + v);
  }
  ok(C.check(say('**Verdict:** Build'), app).ok, 'a bold Verdict label passes');
  ok(C.check(say('- Verdict: Not needed (bug fix)'), app).ok, 'a Verdict line in a list passes');
  ok(C.check(say('Verdict: Don’t build'), app).verdict === "Don't build", 'a curly apostrophe is read the same');
  ok(!C.check('', app).ok, 'no description fails');
  ok(!C.check(say('The council liked it.'), app).ok, 'a Council section without a Verdict line fails');
  ok(!C.check(say('Verdict: maybe'), app).ok, 'a verdict that is not one of the five fails');
  ok(!C.check(tpl, app).ok, 'the pull request template as it stands, with its placeholder, fails');
  ok(/^## Council$/m.test(tpl) && /Verdict:/.test(tpl), 'the template has a Council section that asks for a Verdict line');
  const bad = C.check('', ['js/prep.js', 'js/app.js', 'js/a.js', 'js/b.js', 'js/c.js', 'js/d.js']);
  ok(/js\/prep\.js/.test(bad.why) && /\.\.\./.test(bad.why) && /service-council/.test(bad.why), 'a failure names the files, cut at five, and points to the skill');

  // the script as the workflow runs it
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-council-')), list = path.join(dir, 'files.txt'), sum = path.join(dir, 'summary.md');
  fs.writeFileSync(list, 'js/prep.js\ntests/prep.test.js\n');
  const run = body => spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'council-check.mjs'), list], { encoding: 'utf8', env: Object.assign({}, process.env, { BODY: body, GITHUB_STEP_SUMMARY: sum }) });
  let r = run(say('Verdict: Build smaller (3 of 5)'));
  ok(r.status === 0 && /Verdict: Build smaller/.test(r.stdout), 'with a verdict the step passes and says it');
  r = run('## Why\nfixed it');
  ok(r.status === 1 && /^::error title=No council verdict::/m.test(r.stdout), 'without one the step fails with an annotation');
  ok(/### Council check/.test(fs.readFileSync(sum, 'utf8')), 'the run summary says what the check found');
  fs.rmSync(dir, { recursive: true, force: true });

  ok(!/\u2014/.test(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'council-check.mjs'), 'utf8')), 'no em dashes in the script');

  R.forEach(x => console.log(x));
  const n = R.filter(x => x.startsWith('FAIL')).length;
  console.log(n + ' failed of ' + R.length);
  process.exit(n ? 1 : 0);
})().catch(e => { console.error(e); R.forEach(x => console.log(x)); process.exit(1); });
