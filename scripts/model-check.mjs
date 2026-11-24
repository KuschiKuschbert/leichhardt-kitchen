#!/usr/bin/env node
// Runs when a Claude Code session starts (SessionStart hook in .claude/settings.json, 24 Nov 2026).
// Kitchen Book sessions run on Sonnet with Fable as the advisor (docs/keeping-usage-down.md, The right
// model for the job). A session started from the Claude app keeps the model picked there: the repo's
// "model" setting does not overrule it (tested 24 Nov 2026). So when a new session starts on another
// model, this shows the head chef one line and asks Claude to repeat it in its first reply.
// Sonnet and Fable are both chosen on purpose, so they pass quietly. Never blocks a session: on any
// doubt it prints nothing and exits 0.

// The hook's output for one SessionStart input, or null for nothing to say.
export function modelNote(input) {
  const i = input && typeof input === 'object' ? input : {};
  if (i.source && i.source !== 'startup') return null; // only a new session, not a resume, /clear or compaction
  const model = typeof i.model === 'string' ? i.model.trim() : '';
  if (!model || /sonnet|fable/i.test(model)) return null;
  const name = /opus/i.test(model) ? 'Opus' : /haiku/i.test(model) ? 'Haiku' : model.slice(0, 40);
  const line = 'This session is on ' + name + '. The Kitchen Book runs on Sonnet: type /model sonnet, or /model fable for a big job.';
  return {
    systemMessage: line,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: 'Model check (scripts/model-check.mjs): this session started on ' + name +
        ', picked when the session was created. The Kitchen Book runs on Sonnet with Fable as the advisor, and the repo setting cannot overrule the pick. ' +
        'Start your first reply with this one line for the head chef, then carry on with the task: "' + line + '"'
    }
  };
}

const direct = process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href;
if (direct) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => { raw += d; });
  process.stdin.on('end', () => {
    try {
      const out = modelNote(JSON.parse(raw || '{}'));
      if (out) process.stdout.write(JSON.stringify(out));
    } catch (e) { /* a broken input never stops a session */ }
    process.exit(0);
  });
}
