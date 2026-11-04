// Council check (head chef, 5 Nov 2026, .claude/skills/service-council/SKILL.md). A ready pull request that changes
// the app says what the service council decided in a "Verdict:" line, or "Verdict: Not needed (bug fix)". Changes to
// docs/, tests/, .github/, .claude/ and Markdown files alone need no verdict. Run by .github/workflows/council-check.yml
// with the pull request's body in BODY and its changed files, one per line, in the file named on the command line.
// Advice only: it is not a required check and never stops a merge.
//   BODY="..." node scripts/council-check.mjs files.txt

const VERDICTS = ['Build smaller', 'Build', "Don't build", 'Your call', 'Not needed'];

// Files that change what the book does or shows: anything but notes, tests and the repo's own tooling.
export function appFiles(files) {
  return files.map(f => String(f).trim()).filter(Boolean)
    .filter(f => !/^(docs|tests|\.github|\.claude)\//.test(f) && !/\.md$/i.test(f));
}

// The verdict named on a "Verdict:" line, or null. The template's placeholder ("Verdict: (Build, ...") never counts.
export function verdict(body) {
  const m = /^[ \t>*_-]*Verdict:?\**[ \t]*(Build smaller|Build|Don['’]t build|Your call|Not needed)\b/im.exec(String(body || ''));
  if (!m) return null;
  return m[1].replace('’', "'");
}

export function check(body, files) {
  const app = appFiles(files);
  if (!app.length) return { ok: true, why: 'No app files changed: no verdict needed.' };
  const v = verdict(body);
  if (v) return { ok: true, verdict: v, why: 'Verdict: ' + v + '.' };
  return {
    ok: false, app,
    why: 'This pull request changes the app (' + app.slice(0, 5).join(', ') + (app.length > 5 ? ', ...' : '') + ') but its description has no "Verdict:" line. ' +
      'Add a Council section with "Verdict: ' + VERDICTS.slice(0, 4).join('", "') + '", or "Verdict: Not needed (bug fix)" with the reason ' +
      '(.claude/skills/service-council/SKILL.md).'
  };
}

export async function main(argv = process.argv) {
  const fs = await import('node:fs');
  const files = fs.readFileSync(argv[2], 'utf8').split('\n');
  const r = check(process.env.BODY, files);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Council check\n\n' + r.why + '\n');
  if (r.ok) { console.log(r.why); return 0; }
  console.log('::error title=No council verdict::' + r.why);
  return 1;
}

if (import.meta.url === 'file://' + process.argv[1]) main().then(c => process.exit(c), e => { console.error(e.message || e); process.exit(1); });
