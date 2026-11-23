/*
  Proves the lock on the live book: with the public web settings from js/firebase-config.js and the kitchen PIN from
  the KITCHEN_PIN secret, it asks the live database over plain HTTPS for the things the rules must refuse (see
  probe-checks.mjs) and fails if any one is allowed, or if the one allowed read fails (no connection, or the PIN in
  the secret is not the PIN in the published rules). Run by the Publish rules workflow after every publish and by the
  Lock probe workflow on its own, or by hand:  cd tests/rules && KITCHEN_PIN=... node probe.mjs
  Once App Check is enforced, the APPCHECK_DEBUG_TOKEN secret (App Check, Apps, the web app, Manage debug tokens)
  is swapped for an App Check token first and sent with every request; without enforcement it is not needed.
  The PIN and the tokens are never printed. Nothing is written: every write it tries is one the rules refuse.
  Against the emulator (seeded by the rules tests): FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 KITCHEN_PIN=000000 node probe.mjs
*/
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { runProbe, restClient } from './probe-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pin = process.env.KITCHEN_PIN || '';
if (!/^\d{4,8}$/.test(pin)) { console.log('KITCHEN_PIN is missing or not 4 to 8 digits.'); process.exit(1); }
// VENUE (19 Nov 2026, docs/venues.md): the venue whose book this probes, from venues/<id>.json: its own project, web
// settings and address. Without it, js/firebase-config.js and Leichhardt's address, as before.
let cfg = {}, SITE = 'https://kuschikuschbert.github.io/leichhardt-kitchen/';
if (process.env.VENUE) {
  const { createRequire } = await import('module');
  const venues = createRequire(import.meta.url)('../../scripts/venues.cjs');
  let v;
  try { v = venues.venueById(process.env.VENUE); } catch (e) { console.log(e.message); process.exit(1); }
  cfg = Object.assign({}, v.firebase); SITE = v.address;
} else {
  const src = readFileSync(path.join(here, '..', '..', 'js', 'firebase-config.js'), 'utf8');
  for (const m of src.matchAll(/(\w+):\s*'([^']*)'/g)) cfg[m[1]] = m[2];
}
if (!cfg.projectId || !cfg.apiKey) { console.log('Could not read the venue\'s web settings.'); process.exit(1); }

const emu = process.env.FIRESTORE_EMULATOR_HOST, project = emu ? (process.env.GCLOUD_PROJECT || 'demo-test') : cfg.projectId;
const base = (emu ? 'http://' + emu : 'https://firestore.googleapis.com') + '/v1/projects/' + project + '/databases/(default)/documents';
const headers = {};
// the Browser key only works from the book's own address (Google Cloud, Credentials, Websites, 22 Oct 2026), so the
// probe sends that address (SITE, above) like the book does in a browser; without it every call is refused before the
// rules run
if (!emu) {
  headers['x-goog-api-key'] = cfg.apiKey;
  headers['Referer'] = SITE;
  const debug = process.env.APPCHECK_DEBUG_TOKEN || '';
  if (debug) {
    // the debug token becomes a short lived App Check token, the same exchange the SDK makes
    const r = await fetch('https://firebaseappcheck.googleapis.com/v1/projects/' + cfg.projectId + '/apps/' + cfg.appId + ':exchangeDebugToken?key=' + cfg.apiKey,
      { method: 'POST', headers: { 'content-type': 'application/json', 'Referer': SITE }, body: JSON.stringify({ debug_token: debug }) });
    if (!r.ok) {
      // Google's reason says which: the key refused (its website list) or the token itself
      const why = ((await r.json().catch(() => ({}))).error || {}).message || '';
      console.log('App Check did not accept the APPCHECK_DEBUG_TOKEN secret (' + r.status + (why ? ': ' + why : '') + '). ' + (/referer/i.test(why) ? 'The Browser key refused the call: check its website list in Google Cloud, Credentials.' : 'Make a new debug token in the Firebase console and save it in the secret again.'));
      process.exit(1);
    }
    headers['X-Firebase-AppCheck'] = (await r.json()).token;
    console.log('App Check token in hand.');
  }
}
const fails = await runProbe(restClient(base, headers), pin, console.log);
console.log(fails ? fails + ' check(s) failed: the published rules do not hold the lock. Publish the rules again and read firestore.rules.' : 'The lock holds on the ' + (emu ? 'emulator' : 'live book') + '.');
process.exit(fails ? 1 : 0);
