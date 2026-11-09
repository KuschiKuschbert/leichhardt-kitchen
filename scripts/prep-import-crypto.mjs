// The public repository holds only an encrypted import. Plaintext exists in the runner's temporary folder.
import { constants, createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, privateDecrypt, publicEncrypt, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CONTEXT = Buffer.from('leichhardt-prep-standards-import-v1');
const LIMIT = 1024 * 1024;
function fail() { throw new Error('The protected prep import could not be verified. Nothing was imported.'); }
function decode(value, max) {
  if (typeof value !== 'string' || !value || value.length > max || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail();
  return Buffer.from(value, 'base64');
}
export function publicImportKey(privateKey) {
  return createPublicKey(createPrivateKey(privateKey)).export({ type: 'spki', format: 'pem' });
}
export function protectImport(plaintext, publicKey) {
  const source = Buffer.from(plaintext);
  if (!source.length || source.length > LIMIT) fail();
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(CONTEXT);
  const data = Buffer.concat([cipher.update(source), cipher.final()]);
  const wrapped = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256', oaepLabel: CONTEXT }, key);
  key.fill(0);
  return JSON.stringify({ v: 1, key: wrapped.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }) + '\n';
}
export function openImport(envelope, privateKey) {
  let key;
  try {
    if (Buffer.byteLength(envelope) > LIMIT * 2) fail();
    const value = JSON.parse(envelope);
    if (!value || value.v !== 1 || Object.keys(value).sort().join(',') !== 'data,iv,key,tag,v') fail();
    const wrapped = decode(value.key, 2048), iv = decode(value.iv, 32), tag = decode(value.tag, 32), data = decode(value.data, LIMIT * 2);
    if (iv.length !== 12 || tag.length !== 16 || data.length > LIMIT) fail();
    key = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256', oaepLabel: CONTEXT }, wrapped);
    if (key.length !== 32) fail();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(CONTEXT); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  } catch { fail(); }
  finally { if (key) key.fill(0); }
}
async function main(args) {
  const mode = args[0];
  if (!((mode === 'public-key' && args.length === 1) || (mode === 'encrypt' && args.length === 4) || (mode === 'decrypt' && args.length === 3))) {
    throw new Error('Usage: prep-import-crypto.mjs public-key | encrypt public.pem input.json output.enc | decrypt input.enc output.json');
  }
  if (mode === 'encrypt') {
    await writeFile(args[3], protectImport(await readFile(args[2]), await readFile(args[1])), { flag: 'wx', mode: 0o600 });
    return;
  }
  let account;
  try { account = JSON.parse(process.env.FIREBASE_SA || '{}'); } catch { fail(); }
  if (account.project_id !== 'leichhardt-kitchen' || typeof account.private_key !== 'string') fail();
  if (mode === 'public-key') { process.stdout.write(publicImportKey(account.private_key)); return; }
  await writeFile(args[2], openImport(await readFile(args[1], 'utf8'), account.private_key), { flag: 'wx', mode: 0o600 });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(() => { console.error('Could not prepare the protected prep import. Check the mode, files and existing service account. Nothing was imported.'); process.exitCode = 1; });
}
