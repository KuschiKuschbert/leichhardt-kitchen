#!/usr/bin/env node
// Ground rule: nothing is edited or committed on main. Work happens in a worktree on its own branch.
// Runs as a Claude Code PreToolUse hook (see .claude/settings.json). Exit 2 refuses the tool call
// and the message on stderr is shown to the session.
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';

let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;
let ev = {};
try { ev = JSON.parse(input || '{}'); } catch { process.exit(0); }

const tool = ev.tool_name || '';
const ti = ev.tool_input || {};
const cwd = ev.cwd || process.cwd();

function branchOf(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch { return ''; }
}

function refuse(why) {
  process.stderr.write(
    `Ground rule: ${why}\n` +
    `Nothing is edited or committed on main. Start a worktree on a fresh branch from the latest main first:\n` +
    `  git fetch origin main && git worktree add -b <type>/<short-name> .claude/worktrees/<short-name> origin/main\n` +
    `then work in that folder. Before merging, run scripts/pre-merge.sh.\n`
  );
  process.exit(2);
}

if (tool === 'Bash') {
  const cmd = String(ti.command || '');
  const touchesHistory = /\bgit\s+(-C\s+\S+\s+)?(commit|merge|rebase|cherry-pick|revert|am)\b/.test(cmd);
  const pushesMain = /\bgit\s+(-C\s+\S+\s+)?push\b[^|;&]*\b(main|master)\b/.test(cmd);
  const prMerge = /\bgh\s+pr\s+merge\b/.test(cmd);
  if (pushesMain) refuse('that command pushes to main.');
  if ((touchesHistory || prMerge) && branchOf(cwd) === 'main') refuse('this session is on main.');
  process.exit(0);
}

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const fp = String(ti.file_path || ti.notebook_path || '');
  if (fp && branchOf(dirname(fp)) === 'main') refuse(`${fp} is in the main checkout.`);
  process.exit(0);
}

process.exit(0);
