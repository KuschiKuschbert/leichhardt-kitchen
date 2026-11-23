#!/usr/bin/env bash
# Publishes a venue's own copy of the book on its own address (19 Nov 2026, docs/venues.md): Firebase Hosting in the
# venue's own project, signed in as that venue's service account. Run by Publish site and Set up a venue, after
# scripts/venues.cjs guard. Needs VENUE, PROJECT (from venues/<id>.json) and FIREBASE_SA; the CLI is the copy the rules
# tests install (tests/rules). The copy is made fresh in the runner's temporary folder; nothing secret is printed.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -n "${VENUE:-}" ] && [ -n "${PROJECT:-}" ] || { echo "VENUE and PROJECT are needed. Nothing published."; exit 1; }
[ -n "${FIREBASE_SA:-}" ] || { echo "The FIREBASE_SA secret is missing. Nothing published."; exit 1; }
want=$(node -e "console.log(require('./scripts/venues.cjs').venueById(process.env.VENUE).firebase.projectId)")
[ "$want" = "$PROJECT" ] || { echo "PROJECT is not $VENUE's project. Nothing published."; exit 1; }
T="${RUNNER_TEMP:-$(mktemp -d)}/venue-site"
rm -rf "$T" && mkdir -p "$T"
trap 'rm -f "$T/sa.json"' EXIT
node scripts/venue-site.cjs "$VENUE" "$T/public"
# GitHub Pages keeps each file 10 minutes; the venue's copy is kept the same way, so updates reach the phones alike.
printf '{ "hosting": { "public": "public", "headers": [ { "source": "**", "headers": [ { "key": "Cache-Control", "value": "max-age=600" } ] } ] } }\n' > "$T/firebase.json"
printf '%s' "$FIREBASE_SA" > "$T/sa.json"
export GOOGLE_APPLICATION_CREDENTIALS="$T/sa.json"
FB="$(pwd)/tests/rules/node_modules/.bin/firebase"
(cd "$T" && "$FB" deploy --only hosting --project "$PROJECT" --non-interactive)
echo "Published $VENUE's copy of the book."
