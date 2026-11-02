// Synthetic adapters only: never obtain credentials or issue a network request.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs'), os = require('node:os');
const { safeRelease, responseStatus, install, validateInvocation } = require('./publish-rules.cjs');
const PROJECT = 'leichhardt-kitchen', RELEASE = 'cloud.firestore', name = `projects/${PROJECT}/releases/${RELEASE}`;
const intended = `projects/${PROJECT}/rulesets/synthetic-intended`, old = `projects/${PROJECT}/rulesets/synthetic-old`;
function http(status) { return Object.assign(Error('SYNTHETIC_ORIGINAL_PATCH_ERROR'), { status, context: { response: { statusCode: status }, body: 'SYNTHETIC_PRIVATE_RESPONSE_BODY' } }); }
let groups = 0;
async function scenario(change = {}) {
  const calls = [], reports = [];
  const opts = { projectId: PROJECT, rulesetName: intended, releaseName: RELEASE,
    patch: async (...args) => { calls.push(['PATCH', ...args]); if (change.patchError) throw change.patchError; return change.patchName ?? name; },
    create: async (...args) => { calls.push(['CREATE', ...args]); if (change.createError) throw change.createError; return change.createName ?? name; },
    get: async target => { calls.push(['GET', target]); if (change.getError) throw change.getError;
      return change.get ? change.get(calls.filter(x => x[0] === 'GET').length) : { name, rulesetName: intended }; },
    evidence: report => reports.push({ ...report }), ...change.input };
  let result, error;
  try { result = await safeRelease(opts); } catch (e) { error = e; }
  if (!change.input) assert.equal(reports.length, 1);
  assert(calls.filter(x => x[0] === 'PATCH').length <= 1);
  assert(calls.filter(x => x[0] === 'CREATE').length <= 1);
  assert(calls.filter(x => x[0] === 'GET').length <= 2);
  for (const report of reports) {
    assert(Object.values(report).every(v => typeof v === 'boolean' || Number.isInteger(v)));
    for (const hidden of ['SYNTHETIC_ORIGINAL_PATCH_ERROR', name, intended, old]) assert(!JSON.stringify(report).includes(hidden));
  }
  groups++; return { calls, reports, result, error };
}
(async () => {
  validateInvocation([], {});
  for (const args of [['--help'], ['deploy'], ['--project', 'other']]) assert.throws(() => validateInvocation(args, {}));
  for (const env of [{ FIREBASE_RULES_URL: 'https://evil.test' }, { FIREBASE_RULES_URL: 'https://firebaserules.googleapis.com' }, { FIREBASE_RULES_URL: '' }, { FIRESTORE_EMULATOR_HOST: '' }]) assert.throws(() => validateInvocation([], env));
  let r = await scenario(); assert.equal(r.result, name); assert.deepEqual(r.calls.map(x => x[0]), ['PATCH']);
  const notFound = http(404);
  r = await scenario({ patchError: notFound }); assert.equal(r.result, name); assert.deepEqual(r.calls.map(x => x[0]), ['PATCH', 'CREATE']);
  for (const status of [400, 401, 403, 409, 412, 429]) {
    const original = http(status); r = await scenario({ patchError: original }); assert.equal(r.error, original); assert.deepEqual(r.calls.map(x => x[0]), ['PATCH']);
  }
  for (const original of [Error('response lost'), Object.assign(Error('default status'), { status: 500 }), Object.assign(Error('unproven 404'), { status: 404 }), http(408), http(500), http(503)]) {
    r = await scenario({ patchError: original }); assert.equal(r.result, name); assert(r.reports[0].patchFailed && r.reports[0].ambiguousActivationConfirmed);
    assert.deepEqual(r.calls.map(x => x[0]), ['PATCH', 'GET', 'GET']);
  }
  for (const value of [undefined, null, [], 'bad', {}, { name, rulesetName: old }, { name: name + '-other', rulesetName: intended }]) {
    const original = http(503); r = await scenario({ patchError: original, get: () => value }); assert.equal(r.error.cause, original); assert(!r.result); assert.equal(r.calls.length, 2);
  }
  const lost = Error('lost update response');
  r = await scenario({ patchError: lost, get: n => ({ name, rulesetName: n === 1 ? intended : old }) }); assert.equal(r.error.patchError, lost); assert(!r.result);
  r = await scenario({ patchError: lost, getError: http(403) }); assert.equal(r.error.cause, lost); assert.equal(responseStatus(r.error.secondaryError), 403);
  for (const status of [403, 409, 429]) {
    const createError = http(status); r = await scenario({ patchError: notFound, createError }); assert.equal(r.error.cause, notFound); assert.equal(r.error.secondaryError, createError);
    assert.deepEqual(r.calls.map(x => x[0]), ['PATCH', 'CREATE']);
  }
  r = await scenario({ patchError: notFound, createError: Error('lost create response') }); assert.equal(r.result, name); assert.deepEqual(r.calls.map(x => x[0]), ['PATCH', 'CREATE', 'GET', 'GET']);
  r = await scenario({ patchName: 'unexpected acknowledgment' }); assert.equal(r.result, name); assert(r.reports[0].patchFailed && r.reports[0].ambiguousActivationConfirmed);
  for (const input of [{ projectId: 'other' }, { releaseName: RELEASE + '/other' }, { rulesetName: intended + '\n' }, { rulesetName: 'https://evil.test/id' }]) {
    r = await scenario({ input }); assert(r.error); assert.equal(r.calls.length, 0);
  }
  r = await scenario({ input: { releaseName: RELEASE + '/(default)' } }); assert.equal(r.result, name);
  assert.equal(r.calls[0][3], RELEASE); assert(r.reports[0].defaultDatabaseAlias);
  r = await scenario({ patchError: notFound, input: { releaseName: RELEASE + '/(default)' } }); assert.equal(r.result, name);
  assert.equal(r.calls[1][3], RELEASE); assert(r.reports[0].defaultDatabaseAlias);
  for (const releaseName of [RELEASE + '/named', RELEASE + '/(default)/extra', RELEASE + '/(default)\n', 'firebase.storage']) {
    r = await scenario({ input: { releaseName } }); assert(r.error); assert.equal(r.calls.length, 0); assert(!r.reports[0].defaultReleaseAccepted);
  }
  // Prove the integration really replaces the export consumed by the installed pinned RulesDeploy.
  const cliRoot = path.dirname(require.resolve('../tests/rules/node_modules/firebase-tools/package.json'));
  const rules = require(cliRoot + '/lib/gcp/rules.js'), { RulesDeploy } = require(cliRoot + '/lib/rulesDeploy.js');
  const { Client } = require(cliRoot + '/lib/apiv2.js');
  const originalCombined = rules.updateOrCreateRelease, originalPatch = Client.prototype.patch, originalPost = Client.prototype.post, originalGet = Client.prototype.get, originalRequest = Client.prototype.request;
  let combinedCalls = [], patchStatus = 403, createStatus = 200, getStatus = 200, lastPatchError;
  // Replace the transport boundary before exercising dependency code: even an unexpected path cannot authenticate or use the network.
  Client.prototype.request = async () => { throw Error('Unexpected request: synthetic boundary refused it.'); };
  Client.prototype.patch = async (url, body) => { assert.equal(url, '/' + name); assert.equal(body.release.rulesetName, intended); combinedCalls.push('PATCH'); lastPatchError = http(patchStatus); throw lastPatchError; };
  Client.prototype.post = async (url, body) => { assert.equal(url, `/projects/${PROJECT}/releases`); assert.equal(body.rulesetName, intended); combinedCalls.push('CREATE'); if (createStatus !== 200) throw http(createStatus); return { status: 200, body: { name } }; };
  Client.prototype.get = async (url, opts) => { assert.equal(url, '/' + name); assert.equal(opts.redirect, 'error'); assert.deepEqual(opts.retryCodes, []); assert(opts.signal instanceof AbortSignal);
    assert(opts.skipLog.resBody); combinedCalls.push('GET'); if (getStatus !== 200) throw http(getStatus); return { status: 200, body: { name, rulesetName: intended } }; };
  const deploy = new RulesDeploy({ project: PROJECT }, 'firestore'); deploy.rulesetNames['firestore.rules'] = intended;
  // Existing dependency fails the desired policy first: it masks the403 by issuing CREATE.
  await deploy.release('firestore.rules', RELEASE); assert.deepEqual(combinedCalls, ['PATCH', 'CREATE']);
  console.log('BEFORE pinned13.29.1: PATCH403 -> CREATE; violates the required no-create-on403 policy.');
  // The integration is fully transport-stubbed; it does not inherit the surrounding processing emulator environment.
  combinedCalls = []; install(cliRoot, () => {}, {});
  await assert.rejects(deploy.release('firestore.rules', RELEASE), e => responseStatus(e) === 403);
  assert.deepEqual(combinedCalls, ['PATCH']);
  console.log('AFTER adapter: PATCH403 only; exact original refusal propagated.');
  combinedCalls = []; patchStatus = 503;
  await deploy.release('firestore.rules', RELEASE); assert.deepEqual(combinedCalls, ['PATCH', 'GET', 'GET']);
  combinedCalls = []; patchStatus = 404; createStatus = 403;
  function safeCompositeLog(error) {
    const { logger } = require(cliRoot + '/lib/logger.js'), { logError } = require(cliRoot + '/lib/logError.js');
    const originalError = logger.error, originalDebug = logger.debug, logged = [];
    logger.error = logger.debug = (...args) => logged.push(args.join(' '));
    try { logError(error); } finally { logger.error = originalError; logger.debug = originalDebug; }
    const rendered = logged.join('\n');
    assert(!rendered.includes('SYNTHETIC_ORIGINAL_PATCH_ERROR')); assert(!rendered.includes('SYNTHETIC_PRIVATE_RESPONSE_BODY'));
    return rendered;
  }
  await assert.rejects(deploy.release('firestore.rules', RELEASE), error => {
    assert.equal(error.cause, lastPatchError); assert.equal(error.original, lastPatchError); assert.equal(error.patchError, lastPatchError);
    assert.equal(responseStatus(error.secondaryError), 403); assert.deepEqual(error.children.map(c => c.message), ['HTTP 404', 'HTTP 403']);
    assert(!JSON.stringify(error.children).includes('SYNTHETIC_ORIGINAL_PATCH_ERROR'));
    const rendered = safeCompositeLog(error); assert(rendered.includes('HTTP 404') && rendered.includes('HTTP 403')); return true;
  }); assert.deepEqual(combinedCalls, ['PATCH', 'CREATE']);
  combinedCalls = []; patchStatus = 503; getStatus = 403;
  await assert.rejects(deploy.release('firestore.rules', RELEASE), error => {
    assert.equal(error.original, lastPatchError); const rendered = safeCompositeLog(error); assert(rendered.includes('HTTP 503') && rendered.includes('HTTP 403')); return true;
  }); assert.deepEqual(combinedCalls, ['PATCH', 'GET']);
  const pkg = require(cliRoot + '/package.json'), originalVersion = pkg.version;
  pkg.version = '13.29.2'; assert.throws(() => install(cliRoot, () => {}, {}), /Unexpected Firebase CLI version/); pkg.version = originalVersion;
  // Exercise the real workflow consumer, including config normalization, compilation and ruleset selection/upload.
  const prepareFirestore = require(cliRoot + '/lib/deploy/firestore/prepare.js').default;
  const deployFirestore = require(cliRoot + '/lib/deploy/firestore/deploy.js').default;
  const releaseFirestore = require(cliRoot + '/lib/deploy/firestore/release.js').default;
  const { FirebaseError } = require(cliRoot + '/lib/error.js');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-publisher-consumer-'));
  const source = 'rules_version = "2"; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }';
  fs.writeFileSync(path.join(folder, 'firestore.rules'), source);
  let consumers = 0;
  try {
    for (const fixture of [{}, { explicitDefault: true, upload: true }, { ambiguous: true }, { named: true }]) {
      const transport = [], evidence = [];
      Client.prototype.post = async (url, body) => {
        assert.equal(body.source.files[0].content, source);
        if (url === `/projects/${PROJECT}:test`) { transport.push('COMPILE'); return { status: 200, body: { issues: [] } }; }
        assert(fixture.upload); assert.equal(url, `/projects/${PROJECT}/rulesets`); transport.push('UPLOAD'); return { status: 200, body: { name: intended } };
      };
      Client.prototype.get = async (url, opts) => {
        if (url === `/projects/${PROJECT}/releases`) { transport.push('LIST'); return { status: 200, body: { releases: [{ name, rulesetName: old, createTime: '2026-01-01T00:00:00Z' }] } }; }
        if (url === '/' + old) { transport.push('SOURCE'); return { status: 200, body: { source: { files: [{ name: 'firestore.rules', content: fixture.upload ? 'other synthetic rules' : source }] } } }; }
        assert.equal(url, '/' + name); assert.equal(opts.redirect, 'error'); assert(opts.signal instanceof AbortSignal);
        transport.push('VERIFY'); return { status: 200, body: { name, rulesetName: fixture.upload ? intended : old } };
      };
      Client.prototype.patch = async (url, body) => {
        assert.equal(url, '/' + name); assert.equal(body.release.name, name); assert.equal(body.release.rulesetName, fixture.upload ? intended : old);
        transport.push('PATCH'); if (fixture.ambiguous) throw http(503); return { status: 200, body: { name } };
      };
      install(cliRoot, report => evidence.push(report), {});
      const config = { rules: 'firestore.rules' };
      if (fixture.explicitDefault) config.database = '(default)';
      if (fixture.named) config.database = 'synthetic-named';
      const context = { projectId: PROJECT }, options = { project: PROJECT, only: 'firestore:rules', config: { src: { firestore: config }, path: file => path.join(folder, file) } };
      await prepareFirestore(context, options); assert.equal(context.firestore.rules[0].databaseId, fixture.named ? 'synthetic-named' : '(default)');
      await deployFirestore(context, options);
      if (fixture.named) {
        await assert.rejects(releaseFirestore(context, options), error => {
          assert(error instanceof FirebaseError); const logged = safeCompositeLog(error);
          assert(logged.includes('Release target guard') && logged.includes('Refused before PATCH.'));
          assert(!logged.includes('synthetic-named') && !logged.includes(name) && !logged.includes(old)); return true;
        }); assert(!transport.includes('PATCH')); assert(!evidence[0].defaultReleaseAccepted);
      } else {
        await releaseFirestore(context, options); assert.equal(transport.filter(x => x === 'PATCH').length, 1);
        assert(evidence[0].defaultDatabaseAlias && evidence[0].defaultReleaseAccepted);
        assert.equal(transport.filter(x => x === 'UPLOAD').length, fixture.upload ? 1 : 0);
        assert.equal(transport.filter(x => x === 'VERIFY').length, fixture.ambiguous ? 2 : 0);
      }
      assert.equal(evidence.length, 1); assert(Object.values(evidence[0]).every(v => typeof v === 'boolean' || Number.isInteger(v)));
      consumers++;
    }
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
  rules.updateOrCreateRelease = originalCombined; Client.prototype.patch = originalPatch; Client.prototype.post = originalPost; Client.prototype.get = originalGet; Client.prototype.request = originalRequest;
  console.log('PASS rules publisher: ' + groups + ' synthetic policy groups, ' + consumers + ' actual prepare/deploy/release consumers; installed13.29.1 fail-before/pass-after integration, no network.');
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
