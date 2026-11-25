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

# The risky changes get one /code-review medium before the pull request is marked ready (25 Nov 2026, docs/auto-merge.md,
# Claude Ship). Not every code change: on 200 pull requests merged 11 to 25 Nov 2026, 151 changed code the phones load, about
# 11 reviews a day on the plan's usage. These are the rules, the saved shell and startup files, and a big edit to the two
# main files: 37 of the 200, about 2.6 a day. 100 lines is added plus deleted lines in one file.
echo "== Review:"
why="$(git diff --numstat origin/main...HEAD | awk -F'\t' '
  $3 == "firestore.rules" { r["the rules"] = 1 }
  $3 ~ /^(sw\.js|index\.html|js\/upkeep\.js|js\/boot\.js)$/ { r["the saved shell (" $3 ")"] = 1 }
  $3 ~ /^js\/(prep|app)\.js$/ && $1 + $2 >= 100 { r[$3 " by " ($1 + $2) " lines"] = 1 }
  END { for (k in r) print k }' | LC_ALL=C sort | paste -sd, - | sed 's/,/, /g')"
if [ -n "$why" ]; then
  echo "!! This changes $why."
  echo "   Run /code-review medium on this branch before marking it ready. Fix what it finds, or answer it in the pull request."
else
  echo "   No change to the rules, the saved shell or startup files, and no edit of 100 lines or more to js/prep.js or js/app.js: no /code-review needed."
fi

echo "== Checks before merging:"
echo "   node --check on changed JS, then cd tests && npm install && npm test. firestore.rules changed? cd tests/rules && npm test, and publish first."
echo "   README.md in step with the change. Mark it ready and stop: the queue merges it. After the merge: git -C <main checkout> pull --ff-only origin main, remove this worktree and its branch."
