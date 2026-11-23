#!/usr/bin/env bash
# Publishes firestore.rules to the live Firebase project from your own computer.
# It asks for the kitchen PIN, the venue owner's Google email and the platform owner's email and profile id (19 Nov
# 2026, docs/venues.md; at Leichhardt press Enter for both: the owner is the platform owner), fills them into a copy of
# the template in a temporary folder, deploys that copy with the Firebase CLI, then deletes the copy.
# VENUE=<id> publishes to that venue's own project (venues/<id>.json); without it, Leichhardt's.
# The real values are never written inside the repository and never shown on screen.
# Needs Node. The first run opens the browser for "firebase login" (the head chef's Google account).
#
#   scripts/publish-rules.sh            (Leichhardt)
#   VENUE=<id> scripts/publish-rules.sh (another venue)
#
# Afterwards check the live book: a tick saves, and a write without a PIN is refused.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=$(node -e "console.log(require('./scripts/venues.cjs').scriptProject(process.env))") || { echo "No such venue. Nothing published."; exit 1; }
echo "Publishing to $PROJECT."
# the Firebase CLI: the copy the rules tests installed, or a fresh one through npx
if [ -x tests/rules/node_modules/.bin/firebase ]; then FB="$(pwd)/tests/rules/node_modules/.bin/firebase"; else FB="npx -y firebase-tools@13"; fi

read -r -s -p "Kitchen PIN (digits only, not shown): " PIN; echo
[[ "$PIN" =~ ^[0-9]{4,8}$ ]] || { echo "The kitchen PIN is 4 to 8 digits."; exit 1; }
read -r -p "Venue owner's Google email (the head chef's): " EMAIL
[[ "$EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo "That is not an email address."; exit 1; }
read -r -p "Platform owner's Google email (Enter: the same): " PEMAIL
PEMAIL=${PEMAIL:-$EMAIL}
[[ "$PEMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo "That is not an email address."; exit 1; }
read -r -p "Platform owner's profile id at this venue (Enter: none, as at Leichhardt): " PID
[[ "$PID" =~ ^[A-Za-z0-9_-]{0,80}$ ]] || { echo "That is not a profile id."; exit 1; }

# Bootstrap the minimal login roster before stricter reads are published.
[ -n "${FIREBASE_SA:-}" ] || { echo "Use the Publish rules workflow, or set FIREBASE_SA for the access preparation step. Nothing published."; exit 1; }
KITCHEN_PIN="$PIN" PLATFORM_ID="$PID" node scripts/access-bootstrap.mjs

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
sed "s/KITCHEN_PIN/$PIN/g;s/OWNER_EMAIL/$EMAIL/g;s/PLATFORM_EMAIL/$PEMAIL/g;s/PLATFORM_ID/$PID/g" firestore.rules > "$T/firestore.rules"
if grep -q 'KITCHEN_PIN\|OWNER_EMAIL\|PLATFORM_EMAIL\|PLATFORM_ID' "$T/firestore.rules"; then echo "A placeholder was left in. Nothing published."; exit 1; fi
printf '{ "firestore": { "rules": "firestore.rules" } }\n' > "$T/firebase.json"

cd "$T"
if ! $FB login:list 2>/dev/null | grep -q '@'; then $FB login; fi
$FB deploy --only firestore:rules --project "$PROJECT"
echo
echo "Published. Changes can take up to a minute. Check the live book: a tick saves, a write without a PIN is refused."
