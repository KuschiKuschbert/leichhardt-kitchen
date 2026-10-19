#!/usr/bin/env bash
# Publishes firestore.rules to the live Firebase project from your own computer.
# It asks for the kitchen PIN and the head chef's Google email, fills them into a copy of the
# template in a temporary folder, deploys that copy with the Firebase CLI, then deletes the copy.
# The real values are never written inside the repository and never shown on screen.
# Needs Node. The first run opens the browser for "firebase login" (the head chef's Google account).
#
#   scripts/publish-rules.sh
#
# Afterwards check the live book: a tick saves, and a write without a PIN is refused.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=leichhardt-kitchen
# the Firebase CLI: the copy the rules tests installed, or a fresh one through npx
if [ -x tests/rules/node_modules/.bin/firebase ]; then FB="$(pwd)/tests/rules/node_modules/.bin/firebase"; else FB="npx -y firebase-tools@13"; fi

read -r -s -p "Kitchen PIN (digits only, not shown): " PIN; echo
[[ "$PIN" =~ ^[0-9]{4,8}$ ]] || { echo "The kitchen PIN is 4 to 8 digits."; exit 1; }
read -r -p "Head chef's Google email: " EMAIL
[[ "$EMAIL" == *@*.* ]] || { echo "That is not an email address."; exit 1; }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
sed "s/KITCHEN_PIN/$PIN/g;s/OWNER_EMAIL/$EMAIL/g" firestore.rules > "$T/firestore.rules"
if grep -q 'KITCHEN_PIN\|OWNER_EMAIL' "$T/firestore.rules"; then echo "A placeholder was left in. Nothing published."; exit 1; fi
printf '{ "firestore": { "rules": "firestore.rules" } }\n' > "$T/firebase.json"

cd "$T"
if ! $FB login:list 2>/dev/null | grep -q '@'; then $FB login; fi
$FB deploy --only firestore:rules --project "$PROJECT"
echo
echo "Published. Changes can take up to a minute. Check the live book: a tick saves, a write without a PIN is refused."
