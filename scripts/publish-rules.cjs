// Keep the pinned CLI's compilation/upload pipeline, replace its unconditional release fallback.
const path = require('node:path');
const PROJECT = 'leichhardt-kitchen', RELEASE = 'cloud.firestore', VERSION = '13.29.1';
const RELEASE_NAME = `projects/${PROJECT}/releases/${RELEASE}`;
const DEFAULT_ALIAS = RELEASE + '/(default)';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const intendedName = name => typeof name === 'string' && /^projects\/leichhardt-kitchen\/rulesets\/[A-Za-z0-9_-]{1,160}$/.exec(name)?.[0] === name;
// firebase-tools adds status=500 even to transport errors. Only its actual HTTP response proves a 404.
function responseStatus(error) {
  const n = error?.context?.response?.statusCode;
  return Number.isInteger(n) && n >= 100 && n <= 599 ? n : 0;
}
function failure(message, patchError, secondaryError) {
  const e = new Error(message, { cause: patchError });
  e.patchError = patchError;
  if (secondaryError) e.secondaryError = secondaryError;
  return e;
}
function ambiguous(error) { const status = responseStatus(error); return status === 0 || status === 408 || status >= 500; }
function validPointer(value, intended) { return object(value) && value.name === RELEASE_NAME && value.rulesetName === intended; }
function validateInvocation(args, env) {
  if (args.length || Object.hasOwn(env, 'FIREBASE_RULES_URL') || Object.hasOwn(env, 'FIRESTORE_EMULATOR_HOST')) throw Error('Invalid rules publisher invocation or endpoint override.');
}

async function safeRelease({ projectId, rulesetName, releaseName, patch, create, get, evidence = () => {} }) {
  // The pinned Firestore consumer supplies /(default), even for a plain config with no database field.
  const canonicalRelease = releaseName === RELEASE || releaseName === DEFAULT_ALIAS ? RELEASE : null;
  const report = { projectAccepted: projectId === PROJECT, defaultReleaseAccepted: canonicalRelease !== null,
    rulesetAccepted: intendedName(rulesetName), defaultDatabaseAlias: releaseName === DEFAULT_ALIAS,
    patchStatus: 0, patchFailed: false, createAttempted: false, createStatus: 0,
    pointerChecked: false, pointerMatches: false, pointerStable: false, ambiguousActivationConfirmed: false };
  if (!report.projectAccepted || !report.defaultReleaseAccepted || !report.rulesetAccepted) {
    evidence(report);
    const error = Error('Rules publisher refused the release target before activation.');
    error.releaseTargetRefused = true;
    throw error;
  }
  let patchError;
  try {
    const name = await patch(projectId, rulesetName, canonicalRelease);
    report.patchStatus = 200;
    if (name !== RELEASE_NAME) throw Error('Rules update acknowledgment was invalid.');
    evidence(report); return name;
  } catch (error) {
    patchError = error;
    report.patchFailed = true;
    report.patchStatus = responseStatus(error) || report.patchStatus;
  }
  let activationError = patchError;
  if (responseStatus(patchError) === 404) {
    report.createAttempted = true;
    try {
      const name = await create(projectId, rulesetName, canonicalRelease);
      report.createStatus = 200;
      if (name !== RELEASE_NAME) throw Error('Rules create acknowledgment was invalid.');
      evidence(report); return name;
    } catch (error) {
      activationError = error; report.createStatus = responseStatus(error) || report.createStatus;
      if (!ambiguous(error)) { evidence(report); throw failure('Rules creation failed after the original PATCH returned 404.', patchError, error); }
    }
  } else if (!ambiguous(patchError)) {
    evidence(report); throw patchError;
  }
  // Only on an ambiguous outcome: two bounded, exact release reads; never poll or retry a mutation.
  try {
    report.pointerChecked = true;
    const first = await get(RELEASE_NAME);
    report.pointerMatches = validPointer(first, rulesetName);
    if (report.pointerMatches) report.pointerStable = validPointer(await get(RELEASE_NAME), rulesetName);
    report.ambiguousActivationConfirmed = report.pointerMatches && report.pointerStable;
  } catch (error) {
    evidence(report); throw failure('Rules activation could not be verified after the original PATCH failure.', patchError, error);
  }
  evidence(report);
  if (!report.ambiguousActivationConfirmed) throw failure('Rules activation does not match the intended immutable ruleset.', patchError, activationError);
  return RELEASE_NAME;
}

// A ruleset upload with an uncertain answer (13 Nov 2026: HTTP 503 seven times in a row while each ruleset was stored all
// the same, so the run stopped before the release). Read the stored rulesets back once and accept one only if it was made
// in the last 15 minutes and holds exactly the files sent; otherwise keep the original error. Never retry the upload.
// The evidence is booleans and counts only, and only on this path.
function sameFiles(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.length > 0
    && a.every((f, i) => object(f) && object(b[i]) && f.name === b[i].name && typeof f.content === 'string' && f.content === b[i].content);
}
async function safeUpload({ projectId, files, create, list, read, now = Date.now, evidence = () => {} }) {
  try { return await create(projectId, files); } catch (error) {
    const report = { uploadStatus: responseStatus(error), uploadAmbiguous: ambiguous(error), candidates: 0, storedMatched: false, readFailed: false };
    if (projectId !== PROJECT || !report.uploadAmbiguous) throw error;
    let found = '';
    try {
      const since = now() - 15 * 60000, all = await list(projectId);
      const recent = (Array.isArray(all) ? all : []).filter(x => object(x) && intendedName(x.name) && Date.parse(x.createTime) >= since)
        .sort((a, b) => String(b.createTime).localeCompare(String(a.createTime))).slice(0, 3);
      report.candidates = recent.length;
      for (const x of recent) { if (sameFiles(await read(x.name), files)) { found = x.name; break; } }
    } catch (readError) { report.readFailed = true; }
    report.storedMatched = !!found;
    evidence(report);
    if (!found) throw error;
    return found;
  }
}

function install(cliRoot, evidence, environment = process.env, uploadEvidence = () => {}) {
  validateInvocation([], environment);
  const pkg = require(path.join(cliRoot, 'package.json'));
  if (pkg.version !== VERSION) throw Error('Unexpected Firebase CLI version; review the release adapter before using it.');
  const rules = require(path.join(cliRoot, 'lib/gcp/rules.js'));
  const { Client } = require(path.join(cliRoot, 'lib/apiv2.js'));
  const { FirebaseError } = require(path.join(cliRoot, 'lib/error.js'));
  const client = new Client({ urlPrefix: 'https://firebaserules.googleapis.com', apiVersion: 'v1' });
  const patch = rules.updateRelease, create = rules.createRelease, upload = rules.createRuleset;
  rules.createRuleset = (projectId, files) => safeUpload({ projectId, files, create: upload, list: rules.listAllRulesets, read: rules.getRulesetContent, evidence: uploadEvidence });
  rules.updateOrCreateRelease = async (projectId, rulesetName, releaseName) => { try { return await safeRelease({ projectId, rulesetName, releaseName, patch, create, evidence,
    get: async name => {
      const r = await client.get('/' + name, { redirect: 'error', retryCodes: [], signal: AbortSignal.timeout(15000), skipLog: { resBody: true } });
      if (r.status !== 200) throw Error('Rules activation read did not succeed.');
      return r.body;
    } }); } catch (error) {
      if (error.releaseTargetRefused) {
        const refused = new FirebaseError(error.message, { children: [{ name: 'Release target guard', message: 'Refused before PATCH.' }], exit: 2 });
        refused.cause = error;
        throw refused;
      }
      if (!error.patchError) throw error; // Definite PATCH refusals retain the exact original FirebaseError.
      const summary = (name, cause) => ({ name, message: responseStatus(cause) ? 'HTTP ' + responseStatus(cause) : 'No verified HTTP response.' });
      const children = [summary('Original PATCH', error.patchError)];
      if (error.secondaryError && error.secondaryError !== error.patchError) children.push(summary('Follow-up', error.secondaryError));
      // CLI logError does not traverse Error.cause. Render safe phase/status summaries and retain raw causes in memory.
      const wrapped = new FirebaseError(error.message, { original: error.patchError, children, exit: 2 });
      wrapped.cause = wrapped.patchError = error.patchError; wrapped.secondaryError = error.secondaryError;
      throw wrapped;
    } };
}
module.exports = { safeRelease, safeUpload, install, responseStatus, validateInvocation };
if (require.main === module) {
  validateInvocation(process.argv.slice(2), process.env);
  const cliRoot = path.dirname(require.resolve('../tests/rules/node_modules/firebase-tools/package.json'));
  install(cliRoot, report => console.log('Rules activation evidence: ' + JSON.stringify(report)), process.env,
    report => console.log('Ruleset upload evidence: ' + JSON.stringify(report)));
  process.argv = [process.execPath, path.join(cliRoot, 'lib/bin/firebase.js'), 'deploy', '--only', 'firestore:rules', '--project', PROJECT, '--non-interactive'];
  require(path.join(cliRoot, 'lib/bin/firebase.js'));
}
