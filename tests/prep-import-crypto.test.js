// Synthetic payloads and throwaway keys only. Never contacts a kitchen or needs real credentials.
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
(async () => {
  const { publicImportKey, protectImport, openImport } = await import('../scripts/prep-import-crypto.mjs');
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKey = publicImportKey(privateKey);
  const source = Buffer.from(JSON.stringify([{ section: 'Synthetic section', name: 'Synthetic item', minimum: 2, unit: '½ trays' }]));
  const a = protectImport(source, publicKey), b = protectImport(source, publicKey);
  assert.notEqual(a, b, 'each encryption uses a fresh key and nonce');
  assert(!a.includes('Synthetic') && !a.includes('trays'), 'public ciphertext contains no source fields');
  assert.deepEqual(openImport(a, privateKey), source, 'the existing recipient key recovers the exact Unicode payload');
  for (const field of ['key', 'iv', 'tag', 'data']) {
    const changed = JSON.parse(a), bytes = Buffer.from(changed[field], 'base64');
    bytes[0] ^= 1; changed[field] = bytes.toString('base64');
    assert.throws(() => openImport(JSON.stringify(changed), privateKey), /could not be verified/, field + ' tampering is refused');
  }
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  assert.throws(() => openImport(a, other), /could not be verified/, 'a different service key cannot decrypt');
  for (const bad of ['{', JSON.stringify({ ...JSON.parse(a), v: 2 }), JSON.stringify({ ...JSON.parse(a), extra: true }), JSON.stringify({ ...JSON.parse(a), data: 'bad' }), 'x'.repeat(2 * 1024 * 1024 + 1)]) {
    assert.throws(() => openImport(bad, privateKey), /could not be verified/, 'malformed or oversized envelope is refused');
  }
  console.log('Protected prep import: all checks passed.');
})().catch(error => { console.error(error); process.exit(1); });
