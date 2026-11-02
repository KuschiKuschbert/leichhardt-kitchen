// Synthetic fetch responses only. No credential, Google API, database or production request is used.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
(async () => {
  const { inspectActivation, renderExpected, TEMPLATE_COMMIT } = await import('../scripts/inspect-rules-activation.mjs');
  const origin = 'https://firebaserules.googleapis.com/v1/', release = 'projects/leichhardt-kitchen/releases/cloud.firestore', ruleset = 'projects/leichhardt-kitchen/rulesets/synthetic-id';
  const token = 'SYNTHETIC_PRIVATE_TOKEN', expected = 'SYNTHETIC_PRIVATE_RULE_SOURCE', permission = 'firebaserules.releases.get';
  let checks = 0;
  function response(url, value, extra = {}) { const r = new Response(JSON.stringify(value), { status: 200 }); Object.defineProperty(r, 'url', { value: url }); Object.assign(r, extra); return r; }
  async function run(change = {}) {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, opts });
      assert.equal(opts.redirect, 'error'); assert(opts.signal instanceof AbortSignal);
      assert.equal(opts.headers.Authorization, 'Bearer ' + token);
      if (change.fetch) return change.fetch(url, opts, calls);
      if (url.includes(':testIamPermissions')) {
        assert.equal(opts.method, 'POST'); assert.deepEqual(Object.keys(JSON.parse(opts.body)), ['permissions']);
        return response(url, Object.hasOwn(change, 'iam') ? change.iam : { permissions: [permission] });
      }
      assert.equal(opts.method, 'GET'); assert.equal(opts.body, undefined);
      if (url === origin + release) return response(url, Object.hasOwn(change, 'release') ? change.release : { name: release, rulesetName: change.pointerMoves && calls.length > 2 ? ruleset + '-changed' : ruleset });
      assert.equal(url, origin + ruleset);
      return response(url, Object.hasOwn(change, 'ruleset') ? change.ruleset : { name: ruleset, source: { files: [{ name: 'firestore.rules', content: expected }] } });
    };
    const out = await inspectActivation({ token, expected, fetchImpl, timeoutMs: 10 });
    const printed = JSON.stringify(out);
    for (const secret of [token, expected, release, ruleset, 'SYNTHETIC_RAW_ERROR']) assert(!printed.includes(secret));
    assert.equal(out.templateCommit, TEMPLATE_COMMIT);
    assert(Object.entries(out).every(([key, value]) => key === 'templateCommit' || typeof value === 'boolean' || Number.isInteger(value)));
    checks++; return { out, calls };
  }
  let r = await run(); assert(r.out.activeSourceConfirmed); assert(r.out.releasesGet); assert(!r.out.releasesUpdate); assert.equal(r.calls.length, 4);
  r = await run({ ruleset: { name: ruleset, source: { files: [{ name: 'firestore.rules', content: expected + ' changed' }] } } }); assert(!r.out.activeSourceMatches);
  r = await run({ pointerMoves: true }); assert(r.out.activeSourceMatches && !r.out.releasePointerStable && !r.out.activeSourceConfirmed);
  for (const name of ['https://evil.test/rules', 'projects/other/rulesets/id', 'projects/leichhardt-kitchen/rulesets/../id', ruleset + '?x=1', ruleset + '%2Felsewhere']) {
    r = await run({ release: { name: release, rulesetName: name } }); assert.equal(r.calls.length, 2); assert(!r.out.responseValid);
  }
  for (const value of [[], 'bad', null, 42, {}, { name: release + '-other', rulesetName: ruleset }]) {
    r = await run({ release: value }); assert.equal(r.calls.length, 2); assert(!r.out.responseValid);
  }
  for (const value of [[], null, { name: ruleset + '-other', source: { files: [] } }, { name: ruleset, source: [] },
    { name: ruleset, source: { files: [] } }, { name: ruleset, source: { files: [{ name: 'firestore.rules', content: 42 }] } }]) {
    r = await run({ ruleset: value }); assert.equal(r.calls.length, 3); assert(!r.out.responseValid);
  }
  r = await run({ ruleset: { name: ruleset, source: { files: [{ name: 'other.rules', content: expected }] } } }); assert(r.out.responseValid && !r.out.activeSourceMatches);
  r = await run({ ruleset: { name: ruleset, source: { files: [{ name: 'firestore.rules', content: expected }, { name: 'other.rules', content: expected }] } } }); assert(!r.out.activeSourceMatches);
  for (const value of [[], 'bad', null, 42, { error: 'SYNTHETIC_RAW_ERROR' }, { permissions: [123] }, { permissions: ['unknown'] }]) {
    r = await run({ iam: value }); assert(!r.out.iamResponseValid);
  }
  r = await run({ iam: {} }); assert(r.out.iamResponseValid && !r.out.releasesGet);
  for (const status of [302, 401, 403, 404, 500]) {
    r = await run({ fetch: async url => { const v = new Response('SYNTHETIC_RAW_ERROR', { status }); Object.defineProperty(v, 'url', { value: url }); return v; } });
    assert.equal(r.out.releaseStatus, status); assert(!r.out.activeSourceConfirmed);
  }
  r = await run({ fetch: async url => response('https://evil.test/redirected', { source: expected }) }); assert(!r.out.responseValid);
  r = await run({ fetch: async url => { const v = response(url, { name: release, rulesetName: ruleset }); Object.defineProperty(v, 'redirected', { value: true }); return v; } }); assert(!r.out.responseValid);
  r = await run({ fetch: async () => { throw Error(token + expected + 'SYNTHETIC_RAW_ERROR'); } }); assert.equal(r.out.releaseStatus, 0);
  r = await run({ fetch: (url, opts) => new Promise((resolve, reject) => { const keep = setTimeout(() => reject(Error('Timeout failed')), 250); opts.signal.addEventListener('abort', () => { clearTimeout(keep); reject(opts.signal.reason); }, { once: true }); }) }); assert(!r.out.responseValid);
  for (const body of ['invalid JSON', 'x'.repeat(1048577), new Uint8Array([0xff])]) {
    r = await run({ fetch: async url => { const v = new Response(body); Object.defineProperty(v, 'url', { value: url }); return v; } }); assert(!r.out.responseValid && !r.out.iamResponseValid);
  }
  r = await run({ fetch: async (url, opts) => {
    const body = new ReadableStream({ start(controller) {
      const keep = setTimeout(() => controller.error(Error('Body timeout failed')), 250);
      opts.signal.addEventListener('abort', () => { clearTimeout(keep); controller.error(opts.signal.reason); }, { once: true });
    } });
    const v = new Response(body); Object.defineProperty(v, 'url', { value: url }); return v;
  } }); assert(!r.out.responseValid && !r.out.iamResponseValid);
  const template = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8');
  assert(renderExpected(template, '000000', 'synthetic@test.local').includes('kitchens/000000'));
  assert.throws(() => renderExpected(template + 'changed', '000000', 'synthetic@test.local'));
  for (const args of [['--publish'], ['--unexpected']]) {
    const p = spawnSync(process.execPath, [path.join(__dirname, '../scripts/inspect-rules-activation.mjs'), ...args], { env: { ...process.env, FIREBASE_SA: 'SYNTHETIC_RAW_ERROR' }, encoding: 'utf8' });
    assert.equal(p.status, 1); assert(p.stdout, p.stderr); const out = JSON.parse(p.stdout); assert(!out.inputValid); assert(!p.stderr.includes('SYNTHETIC_RAW_ERROR'));
  }
  console.log('PASS read-only rules activation inspection: ' + checks + ' synthetic response groups, timeout/redirect/URL/schema guards, exact template binding and safe outputs.');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
