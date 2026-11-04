// Weekly list of click test files that only passed on a second try, stopped after the 10 minute limit, or failed on
// the live site (4 Nov 2026, CLAUDE.md, What GitHub enforces). tests/run.js retries a failed file once and reports a
// pass as a warning annotation ("<file> passed on retry"); this reads those annotations from the past week's Click
// tests and Live click tests runs and keeps one issue up to date, so a file that keeps needing the retry is fixed in
// its own pull request before it slows everyone down.
//
// Runs in .github/workflows/flaky-report.yml (weekly and by hand) with the built-in GITHUB_TOKEN: Actions and checks
// read, issues write. Reads only run, check-run and annotation data; writes one issue. No secrets, no Firestore.
//   node scripts/flaky-report.mjs            needs GITHUB_TOKEN and GITHUB_REPOSITORY (owner/name)
//   DRY=1 node scripts/flaky-report.mjs      prints the report instead of writing the issue

const API = 'https://api.github.com';
const DAYS = 7;
const WORKFLOWS = [['pr-tests.yml', 'Click tests'], ['live-tests.yml', 'Live click tests']];
const ISSUE_LABEL = 'flaky-report';
const ISSUE_TITLE = 'Click tests that needed a second try (weekly)';
// every passing job has a few fixed annotations (the runner's own notices); more than this means one worth reading
const BASELINE = 2;

// Turns the annotations of the week's browser jobs into counts per file. Exported for tests/flaky-report.test.js.
export function tally(entries) {
  const files = {};
  const row = f => files[f] || (files[f] = { file: f, retried: 0, timedOut: 0, liveFailed: 0, prFailed: 0, last: '' });
  for (const { workflow, annotation: a, when } of entries) {
    const title = String(a.title || ''), msg = String(a.message || '');
    const m = /^([\w.-]+\.test\.js)( passed on retry)?$/.exec(title);
    if (!m) continue;
    const r = row(m[1]);
    if (m[2] && a.annotation_level === 'warning') r.retried++;
    else if (a.annotation_level === 'failure') { if (workflow === 'live-tests.yml') r.liveFailed++; else r.prFailed++; }
    else continue;
    if (/FILE_TIMEOUT/.test(msg)) r.timedOut++;
    if (when > r.last) r.last = when;
  }
  return Object.values(files).sort((x, y) => (y.retried + y.liveFailed + y.timedOut) - (x.retried + x.liveFailed + x.timedOut) || (x.file < y.file ? -1 : 1));
}

// The issue body: plain words, newest numbers first, files that need fixing marked.
export function report(rows, meta) {
  const qld = d => new Date(new Date(d).getTime() + 10 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const lines = ['Updated ' + qld(meta.now) + ' (Queensland time) from ' + meta.runs + ' Click tests and Live click tests runs in the last ' + DAYS + ' days.', ''];
  const watch = rows.filter(r => r.retried || r.timedOut || r.liveFailed);
  if (!watch.length) {
    lines.push('No file needed a second try, hit the 10 minute limit or failed on the live site. Nothing to fix.');
  } else {
    lines.push('A file that needed a second try twice or more, hit the 10 minute limit, or failed on the live site is a bug: fix it in its own pull request (read the failing step in the run\'s annotations first).', '');
    lines.push('| File | Passed on retry | Stopped at 10 min | Failed on live | Last seen | Fix it? |', '| --- | --- | --- | --- | --- | --- |');
    for (const r of watch) {
      const fix = r.retried >= 2 || r.timedOut || r.liveFailed ? 'Yes' : 'Watch';
      lines.push('| `' + r.file + '` | ' + r.retried + ' | ' + r.timedOut + ' | ' + r.liveFailed + ' | ' + (r.last ? qld(r.last) : '') + ' | ' + fix + ' |');
    }
  }
  const prOnly = rows.filter(r => r.prFailed && !r.retried && !r.timedOut && !r.liveFailed);
  if (prOnly.length) lines.push('', 'Failed in pull request runs only (usually the pull request\'s own change, already fixed there): ' + prOnly.map(r => '`' + r.file + '` (' + r.prFailed + ')').join(', ') + '.');
  lines.push('', '_Written by `scripts/flaky-report.mjs` (`.github/workflows/flaky-report.yml`). Edits here are replaced next week._');
  return lines.join('\n');
}

async function gh(path, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) } });
  if (!res.ok) throw new Error((opts.method || 'GET') + ' ' + path + ': ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return res.status === 204 ? null : res.json();
}

export async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!process.env.GITHUB_TOKEN || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are needed');
  const now = new Date().toISOString(), since = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
  const entries = []; let runs = 0;
  for (const [file] of WORKFLOWS) {
    for (let page = 1; page <= 5; page++) {
      const data = await gh('/repos/' + repo + '/actions/workflows/' + file + '/runs?per_page=100&page=' + page + '&created=%3E%3D' + since);
      const list = (data.workflow_runs || []).filter(r => r.status === 'completed' && (r.conclusion === 'success' || r.conclusion === 'failure'));
      for (const run of list) {
        runs++;
        // one read for every check run in the run, with how many annotations each has; annotations only where it pays
        const suite = await gh('/repos/' + repo + '/check-suites/' + run.check_suite_id + '/check-runs?per_page=100');
        for (const c of suite.check_runs || []) {
          if (!/^(Browser|Live) \d+ of \d+$/.test(c.name) || !(c.output && c.output.annotations_count > BASELINE)) continue;
          const anns = await gh('/repos/' + repo + '/check-runs/' + c.id + '/annotations?per_page=100');
          for (const a of anns) entries.push({ workflow: file, annotation: a, when: c.completed_at || run.updated_at });
        }
      }
      if ((data.workflow_runs || []).length < 100) break;
    }
  }
  const body = report(tally(entries), { now, runs });
  if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### ' + ISSUE_TITLE + '\n\n' + body + '\n');
  if (process.env.DRY === '1') { console.log(body); return; }
  // one issue, found by its label, kept up to date (created the first time)
  const open = await gh('/repos/' + repo + '/issues?state=open&labels=' + ISSUE_LABEL + '&per_page=5');
  if (open.length) await gh('/repos/' + repo + '/issues/' + open[0].number, { method: 'PATCH', body: JSON.stringify({ title: ISSUE_TITLE, body }) });
  else await gh('/repos/' + repo + '/issues', { method: 'POST', body: JSON.stringify({ title: ISSUE_TITLE, body, labels: [ISSUE_LABEL] }) });
  console.log(body);
}

if (import.meta.url === 'file://' + process.argv[1]) main().catch(e => { console.error(e.message || e); process.exit(1); });
