// Compiles a filled-in rules file on the local Firestore emulator and nothing else (19 Nov 2026, docs/venues.md):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 node scripts/rules-compile-check.mjs <rules file>
// Used by Set up a venue before anything is published. Prints only line numbers and the compiler's own words for an
// error, never the file, so a filled-in PIN or email is not shown.
import { readFileSync } from 'node:fs';
const host = process.env.FIRESTORE_EMULATOR_HOST || '';
if (!/^(127\.0\.0\.1|\[::1\]|localhost):\d+$/.test(host)) { console.error('Only the local emulator.'); process.exit(2); }
const content = readFileSync(process.argv[2], 'utf8');
const r = await fetch('http://' + host + '/emulator/v1/projects/demo-venue-check:securityRules', {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } })
});
const body = await r.json().catch(() => ({}));
const issues = (body.issues || []).filter(i => i.severity === 'ERROR');
if (!r.ok || issues.length) {
  for (const i of issues.slice(0, 20)) console.log('Line ' + ((i.sourcePosition || {}).line || '?') + ': ' + String(i.description || '').replace(/\d{4,8}|\S+@\S+/g, '...').slice(0, 160));
  console.log('The filled-in rules did not compile.');
  process.exit(1);
}
console.log('The rules compile.');
