// Version 1 nightly backup envelope. Uses only Node 22 built-ins. Keys are never command-line arguments.
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { closeSync, fstatSync, fsyncSync, linkSync, lstatSync, openSync, readSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const MAGIC = Buffer.from('LKBACKUP');
const LEGACY_MAGIC = Buffer.from('Salted__');
const ITERATIONS = 200000, SALT_BYTES = 16, NONCE_BYTES = 12, TAG_BYTES = 16;
const HEADER = Buffer.alloc(18);
MAGIC.copy(HEADER); HEADER[8] = 1; HEADER[9] = 1; HEADER[10] = 1;
HEADER.writeUInt32BE(ITERATIONS, 11); HEADER[15] = SALT_BYTES; HEADER[16] = NONCE_BYTES; HEADER[17] = TAG_BYTES;
const PREFIX_BYTES = HEADER.length + SALT_BYTES + NONCE_BYTES;
export const MAX_BACKUP_BYTES = 256 * 1024 * 1024;

class BackupError extends Error {}
function password(value, minimum = 1) {
  if (typeof value !== 'string' || [...value].length < minimum) throw new BackupError(minimum === 16 ? 'BACKUP_KEY is missing or shorter than 16 characters.' : 'BACKUP_KEY is missing or empty.');
  return Buffer.from(value, 'utf8');
}
function jsonBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_BACKUP_BYTES) throw new BackupError('Backup exceeds the 256 MiB limit.');
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new BackupError('Backup is not valid UTF-8 JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BackupError('Backup JSON must be an object.');
}
function keyFor(pass, salt, length = 32) { return pbkdf2Sync(pass, salt, ITERATIONS, length, 'sha256'); }

export function encryptBackup(plaintext, passphrase) {
  const pass = password(passphrase, 16); let key;
  try {
    jsonBytes(plaintext);
    const salt = randomBytes(SALT_BYTES), nonce = randomBytes(NONCE_BYTES);
    const prefix = Buffer.concat([HEADER, salt, nonce]);
    key = keyFor(pass, salt);
    const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: TAG_BYTES });
    cipher.setAAD(prefix);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([prefix, encrypted, cipher.getAuthTag()]);
  } finally { pass.fill(0); if (key) key.fill(0); }
}

export function decryptBackup(envelope, passphrase) {
  const pass = password(passphrase); let key, first, plaintext;
  try {
    if (!Buffer.isBuffer(envelope) || envelope.length < PREFIX_BYTES + TAG_BYTES + 2 || envelope.length > MAX_BACKUP_BYTES + PREFIX_BYTES + TAG_BYTES) throw new BackupError('Backup envelope is truncated or too large.');
    // Reject unsupported or altered parameters before allocating a key or running an input-controlled KDF.
    if (!envelope.subarray(0, HEADER.length).equals(HEADER)) throw new BackupError('Backup format is unsupported. Legacy files require explicit trusted legacy mode.');
    const salt = envelope.subarray(HEADER.length, HEADER.length + SALT_BYTES), nonce = envelope.subarray(HEADER.length + SALT_BYTES, PREFIX_BYTES);
    key = keyFor(pass, salt);
    const decipher = createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: TAG_BYTES });
    decipher.setAAD(envelope.subarray(0, PREFIX_BYTES));
    decipher.setAuthTag(envelope.subarray(-TAG_BYTES));
    try {
      first = decipher.update(envelope.subarray(PREFIX_BYTES, -TAG_BYTES));
      plaintext = Buffer.concat([first, decipher.final()]);
    } catch { throw new BackupError('Backup authentication failed. No output was written.'); }
    jsonBytes(plaintext);
    return plaintext;
  } catch (error) { if (plaintext) plaintext.fill(0); throw error; }
  finally { pass.fill(0); if (key) key.fill(0); if (first) first.fill(0); }
}

// This mode only reads trusted old archives. CBC has no authentication, even when padding and JSON are valid.
export function decryptTrustedLegacy(envelope, passphrase) {
  const pass = password(passphrase); let material, first, plaintext;
  try {
    if (!Buffer.isBuffer(envelope) || envelope.length > MAX_BACKUP_BYTES + 40 || !envelope.subarray(0, 8).equals(LEGACY_MAGIC)) throw new BackupError('Not a supported trusted legacy backup.');
    // Salted__ + 8/16-byte salt + whole 16-byte CBC blocks. The two valid lengths cannot overlap.
    const saltBytes = envelope.length >= 32 && (envelope.length - 16) % 16 === 0 ? 8 : envelope.length >= 40 && (envelope.length - 24) % 16 === 0 ? 16 : 0;
    if (!saltBytes) throw new BackupError('Trusted legacy backup is truncated or has an unsupported salt length.');
    material = keyFor(pass, envelope.subarray(8, 8 + saltBytes), 48);
    const decipher = createDecipheriv('aes-256-cbc', material.subarray(0, 32), material.subarray(32));
    try { first = decipher.update(envelope.subarray(8 + saltBytes)); plaintext = Buffer.concat([first, decipher.final()]); }
    catch { throw new BackupError('Could not read the trusted legacy backup. No output was written.'); }
    jsonBytes(plaintext);
    return plaintext;
  } catch (error) { if (plaintext) plaintext.fill(0); throw error; }
  finally { pass.fill(0); if (material) material.fill(0); if (first) first.fill(0); }
}

function destination(path) {
  // Canonicalise the existing parent, never follow a destination symlink, and never replace an existing file.
  const into = join(realpathSync(dirname(resolve(path))), basename(resolve(path)));
  try { lstatSync(into); throw new BackupError('Destination already exists. Nothing was overwritten.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return into;
}
function input(path, extraBytes) {
  const fd = openSync(path, 'r'); let bytes;
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.size > MAX_BACKUP_BYTES + extraBytes) throw new BackupError('Input is not a regular backup file within the 256 MiB limit.');
    bytes = Buffer.allocUnsafe(info.size);
    let offset = 0;
    while (offset < bytes.length) {
      const n = readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (!n) throw new BackupError('Input changed while it was being read.');
      offset += n;
    }
    if (fstatSync(fd).size !== info.size) throw new BackupError('Input changed while it was being read.');
    return bytes;
  } catch (error) { if (bytes) bytes.fill(0); throw error; }
  finally { closeSync(fd); }
}
function publish(into, bytes) {
  const temporary = join(dirname(into), '.lk-backup-' + randomBytes(16).toString('hex') + '.tmp');
  let fd;
  try {
    fd = openSync(temporary, 'wx', 0o600);
    writeFileSync(fd, bytes); fsyncSync(fd); closeSync(fd); fd = undefined;
    // A same-directory hard link publishes the completed file atomically and refuses a destination created meanwhile.
    linkSync(temporary, into);
  } finally {
    try { if (fd !== undefined) closeSync(fd); }
    finally { try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  }
}
export function encryptFile(source, output, passphrase) {
  const into = destination(output); let plaintext;
  try { plaintext = input(source, 0); publish(into, encryptBackup(plaintext, passphrase)); }
  finally { if (plaintext) plaintext.fill(0); }
}
export function decryptFile(source, output, passphrase, { trustedLegacy = false } = {}) {
  const into = destination(output); let plaintext;
  try {
    const bytes = input(source, PREFIX_BYTES + TAG_BYTES);
    plaintext = trustedLegacy ? decryptTrustedLegacy(bytes, passphrase) : decryptBackup(bytes, passphrase);
    publish(into, plaintext);
  } finally { if (plaintext) plaintext.fill(0); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, source, output, ...extra] = process.argv.slice(2);
  try {
    if (!['encrypt', 'decrypt', 'decrypt-legacy'].includes(mode) || !source || !output || extra.length) throw new BackupError('Usage: node scripts/backup-crypto.mjs <encrypt|decrypt|decrypt-legacy> <input> <new-output>. Set BACKUP_KEY in the environment only.');
    const passphrase = process.env.BACKUP_KEY; password(passphrase, mode === 'encrypt' ? 16 : 1).fill(0); delete process.env.BACKUP_KEY;
    if (mode === 'encrypt') encryptFile(source, output, passphrase);
    else decryptFile(source, output, passphrase, { trustedLegacy: mode === 'decrypt-legacy' });
    console.log(mode === 'encrypt' ? 'Encrypted backup written.' : mode === 'decrypt-legacy' ? 'Trusted legacy JSON written. Legacy authenticity cannot be verified.' : 'Authenticated backup JSON written.');
  } catch (error) {
    console.error(error instanceof BackupError ? error.message : 'Backup file operation failed. Check the input, output directory and permissions.');
    process.exitCode = 1;
  }
}
