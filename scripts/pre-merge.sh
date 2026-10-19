#!/usr/bin/env bash
# Run this from the worktree before merging a pull request.
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
  echo "!! main moved since this branch started. Bring it up to date (git merge origin/main, or the app's Sync with base), fix conflicts, run the tests again, then merge."
fi

echo "== Open pull requests:"
if command -v gh >/dev/null; then
  gh pr list --state open --json number,title,headRefName,isDraft,mergeStateStatus,updatedAt \
    --template '{{range .}}  #{{.number}}  {{.headRefName}}  {{if .isDraft}}draft{{else}}ready{{end}}  {{.mergeStateStatus}}  {{timeago .updatedAt}}  {{.title}}{{"\n"}}{{end}}'
  echo "   A ready PR on another branch may be about to merge. Ask before merging over it, or wait, and let main settle in between."
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

echo "== Checks before merging:"
echo "   node --check on changed JS, then cd tests && npm install && npm test. firestore.rules changed? cd tests/rules && npm test, and publish first."
echo "   README.md in step with the change. Squash merge. Then: git -C <main checkout> pull --ff-only origin main, remove this worktree and its branch."
