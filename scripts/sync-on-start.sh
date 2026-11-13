#!/bin/sh
# Runs when a Claude Code session starts (SessionStart hook in .claude/settings.json).
# The main checkout on main with no local changes: fast-forward it to GitHub, so it never
# drifts behind the cloud sessions. Anywhere else (a worktree, a branch, local changes):
# only fetch, so new worktrees start from the latest origin/main. Never merges, never resets.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
if [ "$branch" = "main" ] && [ -z "$(git status --porcelain)" ]; then
  git pull --ff-only --quiet origin main
else
  git fetch --quiet origin main
fi
