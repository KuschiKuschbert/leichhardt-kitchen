#!/bin/sh
# Runs when a Claude Code session starts (SessionStart hook in .claude/settings.json).
# The main checkout on main with no changes to tracked files: fast-forward it to GitHub, so it
# never drifts behind the cloud sessions. Untracked files (other tools' folders like .agents/ or
# .codex/) do not count: a fast-forward never touches them, and counting them kept the Mac's
# main folder 55 merges behind on 19 Nov 2026. Anywhere else (a worktree, a branch, changed
# tracked files): only fetch, so new worktrees start from the latest origin/main.
# Never merges, never resets.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
if [ "$branch" = "main" ] && [ -z "$(git status --porcelain --untracked-files=no)" ]; then
  git pull --ff-only --quiet origin main
else
  git fetch --quiet origin main
fi
