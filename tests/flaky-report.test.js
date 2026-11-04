// scripts/flaky-report.mjs (4 Nov 2026): the weekly list of click test files that passed only on a second try, hit the
// 10 minute limit or failed on the live site. Pure node, no browser: GitHub's API is a stand-in here.
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const F = await import('../scripts/flaky-report.mjs');
  const A = (level, title, message) => ({ annotation_level: level, title, message: message || '' });
  const rows = F.tally([
    { workflow: 'pr-tests.yml', when: '2026-11-04T01:00:00Z', annotation: A('warning', 'people-ids.test.js passed on retry', 'failed once, then passed on its own') },
    { workflow: 'live-tests.yml', when: '2026-11-04T03:00:00Z', annotation: A('warning', 'people-ids.test.js passed on retry', 'failed once') },
    { workflow: 'pr-tests.yml', when: '2026-11-04T02:00:00Z', annotation: A('warning', 'offline-writes.test.js passed on retry', 'FAIL stopped after 600 s (FILE_TIMEOUT): the file did not finish') },
    { workflow: 'live-tests.yml', when: '2026-11-04T04:00:00Z', annotation: A('failure', 'pin-sessions.test.js', 'FAIL then the PIN opens a new session') },
    { workflow: 'pr-tests.yml', when: '2026-11-04T05:00:00Z', annotation: A('failure', 'chef-menu.test.js', 'FAIL the menu') },
    { workflow: 'pr-tests.yml', when: '2026-11-04T05:00:00Z', annotation: A('warning', '', 'Node.js 20 is deprecated') },
    { workflow: 'pr-tests.yml', when: '2026-11-04T05:00:00Z', annotation: A('notice', '', 'The ubuntu-latest label will migrate') }
  ]);
  const by = f => rows.find(r => r.file === f) || {};
  ok(by('people-ids.test.js').retried === 2, 'two retries of one file are counted across pull request and live runs');
  ok(by('offline-writes.test.js').retried === 1 && by('offline-writes.test.js').timedOut === 1, 'a file stopped at the 10 minute limit and passed on retry counts as both');
  ok(by('pin-sessions.test.js').liveFailed === 1 && by('chef-menu.test.js').prFailed === 1, 'a failure on the live site and one in a pull request run are kept apart');
  ok(rows.length === 4, 'the runner\'s own notices are not files (' + rows.length + ' rows)');
  ok(rows.slice(0, 3).map(r => r.file).join() === 'offline-writes.test.js,people-ids.test.js,pin-sessions.test.js', 'files needing the most help come first, a tie by name (' + rows.map(r => r.file).join() + ')');
  const body = F.report(rows, { now: '2026-11-04T09:00:00Z', runs: 42 });
  ok(/Updated 2026-11-04 19:00 \(Queensland time\) from 42 /.test(body), 'the report says when, in Queensland time, and from how many runs');
  ok(/\| `people-ids.test.js` \| 2 \| 0 \| 0 \| .* \| Yes \|/.test(body), 'two second tries means fix it');
  ok(/\| `offline-writes.test.js` \| 1 \| 1 \| 0 \| .* \| Yes \|/.test(body) && /\| `pin-sessions.test.js` \| 0 \| 0 \| 1 \| .* \| Yes \|/.test(body), 'a 10 minute stop or a live failure means fix it after one');
  ok(/pull request runs only .*`chef-menu.test.js` \(1\)/.test(body) && !/\| `chef-menu.test.js`/.test(body), 'a pull request run failure alone is listed apart, not in the table');
  ok(!/—/.test(body), 'no em dashes in the report');
  const quiet = F.report([], { now: '2026-11-04T09:00:00Z', runs: 3 });
  ok(/Nothing to fix/.test(quiet) && !/\|/.test(quiet), 'a clean week says there is nothing to fix');
  // the whole run against a stand-in API: annotations are read only for browser jobs with more than the usual two
  const calls = [];
  const runs = { 'pr-tests.yml': [{ status: 'completed', conclusion: 'success', check_suite_id: 1, updated_at: '2026-11-04T01:00:00Z' }, { status: 'completed', conclusion: 'cancelled', check_suite_id: 9 }], 'live-tests.yml': [{ status: 'completed', conclusion: 'failure', check_suite_id: 2, updated_at: '2026-11-04T02:00:00Z' }] };
  const suites = { 1: [{ id: 11, name: 'Browser 1 of 5', output: { annotations_count: 3 }, completed_at: '2026-11-04T01:00:00Z' }, { id: 12, name: 'Browser 2 of 5', output: { annotations_count: 2 } }, { id: 13, name: 'Rules and nightly checks', output: { annotations_count: 5 } }], 2: [{ id: 21, name: 'Live 3 of 5', output: { annotations_count: 4 }, completed_at: '2026-11-04T02:00:00Z' }] };
  const anns = { 11: [A('warning', 'people-ids.test.js passed on retry', 'x'), A('warning', '', 'Node.js 20'), A('notice', '', 'ubuntu')], 21: [A('failure', 'pin-sessions.test.js', 'FAIL x'), A('failure', '', 'Process completed with exit code 1.')] };
  const json = v => ({ ok: true, status: 200, json: async () => v, text: async () => '' });
  globalThis.fetch = async (url, opts) => {
    const u = String(url).replace('https://api.github.com', ''); calls.push((opts && opts.method || 'GET') + ' ' + u);
    let m;
    if ((m = /\/actions\/workflows\/([\w.-]+)\/runs/.exec(u))) return json({ workflow_runs: runs[m[1]] || [] });
    if ((m = /\/check-suites\/(\d+)\/check-runs/.exec(u))) return json({ check_runs: suites[m[1]] || [] });
    if ((m = /\/check-runs\/(\d+)\/annotations/.exec(u))) return json(anns[m[1]] || []);
    return json([]);
  };
  Object.assign(process.env, { GITHUB_TOKEN: 'test', GITHUB_REPOSITORY: 'o/r', DRY: '1' });
  delete process.env.GITHUB_STEP_SUMMARY;
  const out = []; const log = console.log; console.log = s => out.push(String(s));
  try { await F.main(); } finally { console.log = log; }
  const annCalls = calls.filter(c => /annotations/.test(c));
  ok(annCalls.length === 2 && annCalls.some(c => /check-runs\/11\//.test(c)) && annCalls.some(c => /check-runs\/21\//.test(c)), 'annotations are read only for browser and live jobs with more than two (' + annCalls.join(', ') + ')');
  ok(!calls.some(c => /check-suites\/9\//.test(c)), 'a cancelled run is not read');
  ok(!calls.some(c => /^(POST|PATCH)/.test(c)), 'DRY=1 writes no issue');
  ok(/from 2 Click tests and Live click tests runs/.test(out.join('\n')) && /`people-ids.test.js` \| 1 /.test(out.join('\n')) && /`pin-sessions.test.js` \| 0 \| 0 \| 1 /.test(out.join('\n')), 'the stand-in week reports one retry and one live failure from two runs');
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); R.forEach(r => console.log(r)); process.exit(1); });
