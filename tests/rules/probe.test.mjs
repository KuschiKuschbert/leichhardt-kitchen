/*
  Checks the lock probe itself on the emulator, with the rules filled in with made-up values: against the right PIN
  every check passes, and against a wrong PIN the allowed read fails (so the live probe cannot pass by accident when
  the PIN in the GitHub secret is not the PIN in the published rules). Run by npm test in tests/rules.
*/
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { runProbe } from './probe-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PIN = '000000', OWNER = 'headchef@test.local';
const rules = readFileSync(process.env.RULES || path.join(here, '..', '..', 'firestore.rules'), 'utf8').replace(/KITCHEN_PIN/g, PIN).replace(/OWNER_EMAIL/g, OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-test', firestore: { rules } });
await env.clearFirestore();
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'kitchens/' + PIN + '/config/main'), { people: [], sousIds: [], staffIds: [] }); });

const lines = [];
const fails = await runProbe(env.unauthenticatedContext().firestore(), PIN, l => lines.push(l));
lines.forEach(l => console.log(l));
let bad = fails;
const wrong = [];
const wrongFails = await runProbe(env.unauthenticatedContext().firestore(), '999999', l => wrong.push(l));
const firstFailed = wrongFails === 1 && /^FAIL the kitchen PIN opens the book/.test(wrong[0]);
console.log((firstFailed ? 'PASS ' : 'FAIL ') + 'a wrong kitchen PIN fails the allowed read and nothing else' + (firstFailed ? '' : ' (' + wrong.filter(l => /^FAIL/.test(l)).join('; ') + ')'));
if (!firstFailed) bad++;
await env.cleanup();
console.log((bad ? bad + ' failed' : 'All passed') + ' of ' + (lines.length + 1) + ' probe checks.');
process.exit(bad ? 1 : 0);
