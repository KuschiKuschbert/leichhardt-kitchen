#!/usr/bin/env bash
# Run this from the worktree before marking a pull request ready (CLAUDE.md, ground rule 2; tests/pre-merge.test.js).
# It shows what else is in flight so only one merge happens at a time and nothing lands on a stale main.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" = "main" ]; then echo "You are on main. Merge from the worktree of the branch you want to merge."; exit 1; fi

echo "== Branch: $branch"
git fetch origin main -q || { echo "Could not fetch origin main. Check the network and try again."; exit 1; }

dirty="$(git status --porcelain | wc -l | tr -d ' ')"
[ "$dirty" != "0" ] && echo "!! $dirty uncommitted change(s) here. Commit or drop them first."

ahead="$(git rev-list --count origin/main..HEAD)"
behind="$(git rev-list --count HEAD..origin/main)"
echo "== $ahead commit(s) ahead of origin/main, $behind behind."
if [ "$behind" != "0" ]; then
  echo "!! main moved since this branch started. The Auto-merge queue brings main in when this pull request's turn comes. Bring it in yourself only to fix a conflict, once."
fi

echo "== Open pull requests:"
if command -v gh >/dev/null; then
  # The REST API, not gh pr list (10 Nov 2026): Claude Code cloud sessions refuse GitHub GraphQL, so gh pr list printed
  # only an error there and no pull requests. The list has no merge state, so each open pull request is asked once.
  # Updated times are Queensland (UTC+10, no daylight saving).
  if prs="$(gh api 'repos/{owner}/{repo}/pulls?state=open&per_page=100' --jq '.[] | [.number, .head.ref,
      (if .draft then "draft" else "ready" end), (.updated_at | fromdate + 36000 | strftime("%d %b %H:%M")), .title] | @tsv')"; then
    [ -z "$prs" ] && echo "  None open."
    while IFS=$'\t' read -r num ref state at title; do
      [ -n "$num" ] || continue
      ms="$(gh api "repos/{owner}/{repo}/pulls/$num" --jq '.mergeable_state | ascii_upcase' 2>/dev/null)" || ms="UNKNOWN"
      echo "  #$num  $ref  $state  ${ms:-UNKNOWN}  updated $at  $title"
    done <<< "$prs"
  else
    echo "!! Could not read the open pull requests from GitHub. Check them on GitHub before marking this one ready."
  fi
  echo "   Ready pull requests merge one at a time once green (the release window is open all day), oldest first (docs/auto-merge.md). Do not merge yourself."
else
  echo "   gh is not installed, check GitHub by hand."
fi

echo "== Worktrees:"
git worktree list --porcelain | awk -F'\t' '
  /^worktree /{w=substr($0,10)}
  /^branch /{b=substr($0,8); sub("refs/heads/","",b); print w "\t" b}
  /^detached/{print w "\t(detached)"}' | while IFS=$'\t' read -r w b; do
  d="$(git -C "$w" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  echo "  [$b]  $d uncommitted  $w"
done
echo "   Another session may still be working in one of these. Do not remove a worktree that is not yours."

# A code change gets one /code-review medium before it is marked ready (25 Nov 2026, docs/auto-merge.md, For sessions).
# "Code" is what the phones load, read from scripts/site-changed.sh so there is one list, limited to scripts and styles
# and pages, plus the rules. Notes, tests, server scripts and workflows alone need none.
echo "== Review:"
changed="$(git diff --name-only origin/main...HEAD)"
sitesh="$(dirname "$0")/site-changed.sh"
if [ -f "$sitesh" ]; then
  code="$({ printf '%s\n' "$changed" | bash "$sitesh" | grep -E '\.(js|css|html)$'; printf '%s\n' "$changed" | grep -Fx 'firestore.rules'; } || true)"
  if [ -n "$code" ]; then
    echo "!! This changes code the book runs or its rules ($(printf '%s\n' "$code" | wc -l | tr -d ' ') file(s))."
    echo "   Run /code-review medium on this branch before marking it ready. Fix what it finds, or answer it in the pull request."
  else
    echo "   No book code or rules changed: no /code-review needed."
  fi
else
  echo "!! scripts/site-changed.sh not found next to this script. If you changed code the book runs or its rules, run /code-review medium before marking ready."
fi

echo "== Checks before merging:"
echo "   node --check on changed JS, then cd tests && npm install && npm test. firestore.rules changed? cd tests/rules && npm test, and publish first."
echo "   README.md in step with the change. Mark it ready and stop: the queue merges it. After the merge: git -C <main checkout> pull --ff-only origin main, remove this worktree and its branch."
