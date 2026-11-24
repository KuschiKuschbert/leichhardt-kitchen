// scripts/model-check.mjs (24 Nov 2026): a new session that starts on Opus or Haiku tells the head chef to
// switch to Sonnet; Sonnet and Fable pass quietly. Pure node, no browser.
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const M = await import('../scripts/model-check.mjs');
  const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
  const script = path.join(__dirname, '..', 'scripts', 'model-check.mjs');

  // which sessions get the line
  const opus = M.modelNote({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-opus-5-5' });
  ok(opus && /on Opus/.test(opus.systemMessage) && /\/model sonnet/.test(opus.systemMessage), 'a new session on Opus is told to type /model sonnet');
  ok(opus && opus.hookSpecificOutput.hookEventName === 'SessionStart' && /first reply/.test(opus.hookSpecificOutput.additionalContext), 'Claude is asked to repeat it in its first reply');
  ok(/on Opus/.test((M.modelNote({ source: 'startup', model: 'opus' }) || {}).systemMessage || ''), 'the short name opus counts too');
  ok(/on Haiku/.test((M.modelNote({ source: 'startup', model: 'claude-haiku-5-5' }) || {}).systemMessage || ''), 'a session on Haiku is told too');
  ok(M.modelNote({ source: 'startup', model: 'claude-sonnet-5-5' }) === null, 'Sonnet passes quietly');
  ok(M.modelNote({ source: 'startup', model: 'sonnet' }) === null, 'the short name sonnet passes quietly');
  ok(M.modelNote({ source: 'startup', model: 'claude-fable-5-2' }) === null, 'Fable, picked on purpose for a big job, passes quietly');
  ok(M.modelNote({ source: 'resume', model: 'claude-opus-5-5' }) === null, 'a resumed session is not told again');
  ok(M.modelNote({ source: 'compact', model: 'claude-opus-5-5' }) === null, 'nor after compaction');
  ok(M.modelNote({ source: 'startup' }) === null && M.modelNote(null) === null && M.modelNote({ model: 42 }) === null, 'no model, or a broken one: nothing');

  // as the hook runs it: stdin JSON in, JSON or nothing out, always exit 0
  const run = s => spawnSync(process.execPath, [script], { input: s, encoding: 'utf8' });
  const a = run(JSON.stringify({ source: 'startup', model: 'claude-opus-5-5' }));
  ok(a.status === 0 && JSON.parse(a.stdout).systemMessage.includes('/model sonnet'), 'run as a hook, Opus prints the JSON and exits 0');
  const b = run(JSON.stringify({ source: 'startup', model: 'claude-sonnet-5-5' }));
  ok(b.status === 0 && b.stdout === '', 'run as a hook, Sonnet prints nothing');
  const c = run('not json');
  ok(c.status === 0 && c.stdout === '', 'broken input prints nothing and never stops the session');

  // wired up, and in the house style
  const hooks = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude', 'settings.json'), 'utf8')).hooks.SessionStart;
  ok(JSON.stringify(hooks).includes('scripts/model-check.mjs'), 'the SessionStart hook runs the check');
  ok(!/\u2014/.test(fs.readFileSync(script, 'utf8')), 'no em dashes in the script');

  R.forEach(x => console.log(x));
  const n = R.filter(x => x.startsWith('FAIL')).length;
  console.log(n + ' failed of ' + R.length);
  process.exit(n ? 1 : 0);
})().catch(e => { console.error(e); R.forEach(x => console.log(x)); process.exit(1); });
