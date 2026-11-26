#!/usr/bin/env bash
# Which changed files the live site needs (13 Nov 2026, docs/site-publishing.md).
# Reads changed paths on stdin, one per line, and prints the ones the phones or the live click tests load.
# Prints nothing when every change is something only people and GitHub read: notes, tests run by node,
# server scripts, workflows, the rules template. .github/workflows/publish-site.yml publishes the site only
# when this prints something, because every publish makes every phone offer "New version available".
# A file not named below counts as needed, so a new folder the book loads is never missed.
# Everything under tests/ runs in node (the click tests, their runner, helpers and fixtures, the rules tests,
# the Firebase stand-in), except tests/contact.html and tests/contact-page.js: the drawing library sheet the live
# click tests open from the site (tests/library.test.js), so those two still count. A new page the live click
# tests open from the site is named next to them (26 Nov 2026: a change to a node-only helper such as
# tests/plating-check.js asked every phone to update).
# venues/ (19 Nov 2026, docs/venues.md) is read by the workflows only: Leichhardt's settings the phones load are
# js/firebase-config.js, which scripts/venues.cjs check keeps word for word in step with venues/leichhardt.json.
grep -vE '^(docs/|scripts/|\.github/|\.claude/|venues/)|\.md$|^firestore\.rules$|^\.gitignore$' | awk '!/^tests\// || /^tests\/contact(\.html|-page\.js)$/' || true
