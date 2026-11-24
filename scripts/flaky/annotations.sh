#!/usr/bin/env bash
# Which checks of one click test file failed or needed a second try in recent CI runs (24 Nov 2026,
# docs/flaky-tests.md). Prints one line per annotation: when, check run id, level, title and message.
# Usage, from the repo root: scripts/flaky/annotations.sh <part of the file name> [workflow file, pr-tests.yml] [pages of 100 runs, 3]
# Reads runs and annotations only. In a cloud session the gh CLI works through the proxy with GH_TOKEN unset.
# Then read the failing step of a job: gh api repos/<owner>/<repo>/actions/jobs/<check run id>/logs
set -euo pipefail
NAME=${1:?part of the test file name, e.g. swipe-dismiss}
WF=${2:-pr-tests.yml}
PAGES=${3:-3}
R=${REPO:-KuschiKuschbert/leichhardt-kitchen}
unset GH_TOKEN
for page in $(seq 1 "$PAGES"); do
  gh api "repos/$R/actions/workflows/$WF/runs?per_page=100&page=$page" --jq '.workflow_runs[] | "\(.check_suite_id) \(.created_at)"'
done | while read -r cs when; do
  gh api "repos/$R/check-suites/$cs/check-runs?per_page=100" --jq '.check_runs[] | select(.output.annotations_count > 0) | .id' 2>/dev/null | while read -r id; do
    gh api "repos/$R/check-runs/$id/annotations?per_page=100" --jq '.[] | select((.title + .message + .path) | test("'"$NAME"'")) | "'"$when"' '"$id"' \(.annotation_level) \(.title) :: \(.message)"' 2>/dev/null || true
  done
done
