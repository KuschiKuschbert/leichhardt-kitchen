/*
  Proves the lock on the live book: with the public web settings from js/firebase-config.js and the kitchen PIN from
  the KITCHEN_PIN secret, it asks the live database for the things the rules must refuse (see probe-checks.mjs) and
  fails if any one is allowed, or if the one allowed read fails (no connection, or the PIN in the secret is not the
  PIN in the published rules). Run by the Publish rules workflow after every publish and by the Lock probe workflow
  on its own, or by hand:  cd tests/rules && KITCHEN_PIN=... node probe.mjs
  The PIN is never printed. Nothing is written: every write it tries is one the rules refuse.
*/
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, terminate } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { runProbe } from './probe-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pin = process.env.KITCHEN_PIN || '';
if (!/^\d{4,8}$/.test(pin)) { console.log('KITCHEN_PIN is missing or not 4 to 8 digits.'); process.exit(1); }
const src = readFileSync(path.join(here, '..', '..', 'js', 'firebase-config.js'), 'utf8'), cfg = {};
for (const m of src.matchAll(/(\w+):\s*'([^']*)'/g)) cfg[m[1]] = m[2];
if (!cfg.projectId || !cfg.apiKey) { console.log('Could not read js/firebase-config.js.'); process.exit(1); }

const app = initializeApp(cfg), db = getFirestore(app);
const fails = await runProbe(db, pin, console.log);
try { await terminate(db); await deleteApp(app); } catch (e) {}
console.log(fails ? fails + ' check(s) failed: the published rules do not hold the lock. Publish the rules again and read firestore.rules.' : 'The lock holds on the live book.');
process.exit(fails ? 1 : 0);
