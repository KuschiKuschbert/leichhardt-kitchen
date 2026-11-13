#!/usr/bin/env bash
# Which changed files the live site needs (13 Nov 2026, docs/site-publishing.md).
# Reads changed paths on stdin, one per line, and prints the ones the phones or the live click tests load.
# Prints nothing when every change is something only people and GitHub read: notes, tests run by node,
# server scripts, workflows, the rules template. .github/workflows/publish-site.yml publishes the site only
# when this prints something, because every publish makes every phone offer "New version available".
# A file not named below counts as needed, so a new folder the book loads is never missed.
# tests/run.js, tests/lib.js and the *.test.js files run in node; tests/contact.html and the files it loads
# are opened from the live site by the live click tests, so they still count.
grep -vE '^(docs/|scripts/|\.github/|\.claude/|tests/rules/|tests/fake/)|\.md$|^tests/.*\.test\.m?js$|^tests/(lib|run)\.js$|^tests/package(-lock)?\.json$|^firestore\.rules$|^\.gitignore$' || true
