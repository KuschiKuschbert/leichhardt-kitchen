// Synthetic archives only. Checks the actual workflow command as well as the documented file format and CLI.
import assert from 'node:assert/strict';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { closeSync, existsSync, ftruncateSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { decryptBackup, decryptFile, decryptTrustedLegacy, encryptBackup, encryptFile, MAX_BACKUP_BYTES } from './backup-crypto.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)), cli = join(root, 'scripts/backup-crypto.mjs');
const workflow = readFileSync(join(root, '.github/workflows/nightly-backup.yml'), 'utf8');
const folder = mkdtempSync(join(tmpdir(), 'lk-backup-crypto-'));
const secret = 'synthetic-only-backup-key-not-a-real-secret';
const plain = Buffer.from(JSON.stringify({ config: { people: [{ id: 'test-cook', name: 'Keep synthetic contents out of logs' }] },
  deliveries: [{ id: 'receipt-1', chilled: 0, frozen: -18.5, alternate: null, receivedById: 'test-cook' }], history: [{ v: 1 }, { v: 2 }], words: 'Quotes " and Unicode °C' }));
let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS ' + name); }
const run = (args, pass = secret) => {
  const result = spawnSync(process.execPath, [cli, ...args], { env: { ...process.env, BACKUP_KEY: pass }, encoding: 'utf8' });
  assert.equal(result.error, undefined, 'The CLI subprocess must run, rather than passing a denial check on a spawn error.');
  assert.equal(result.signal, null); assert.equal(typeof result.status, 'number');
  return result;
};
function clean() { assert.deepEqual(readdirSync(folder).filter(x => x.startsWith('.lk-backup-')), [], 'No staging plaintext may remain.'); }
function denied(name, bytes, pass = secret, mode = 'decrypt') {
  const source = join(folder, name + '.enc'), target = join(folder, name + '.json');
  writeFileSync(source, bytes);
  const result = run([mode, source, target], pass);
  assert.notEqual(result.status, 0); assert.equal(existsSync(target), false); clean();
  assert(!result.stdout.includes(secret) && !result.stderr.includes(secret));
}
function workflowStep(name) {
  const block = workflow.split(/\n      - name: /).find(x => x.startsWith(name + '\n'));
  assert(block, 'The actual workflow must have ' + name + '.');
  const lines = block.split('\n'), at = lines.findIndex(x => x.startsWith('        run: '));
  assert(at >= 0);
  return { block, command: lines[at].trim() === 'run: |' ? lines.slice(at + 1).filter(x => x.startsWith('          ')).map(x => x.slice(10)).join('\n') : lines[at].slice('        run: '.length) };
}
function legacy(saltBytes, pass = secret) {
  const salt = randomBytes(saltBytes), material = pbkdf2Sync(pass, salt, 200000, 48, 'sha256');
  const cipher = createCipheriv('aes-256-cbc', material.subarray(0, 32), material.subarray(32));
  try { return Buffer.concat([Buffer.from('Salted__'), salt, cipher.update(plain), cipher.final()]); }
  finally { material.fill(0); }
}
function authenticatedNonObject(sample) {
  const header = sample.subarray(0, 18), salt = randomBytes(16), nonce = randomBytes(12), prefix = Buffer.concat([header, salt, nonce]);
  const key = pbkdf2Sync(secret, salt, 200000, 32, 'sha256'), cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
  cipher.setAAD(prefix);
  try { return Buffer.concat([prefix, cipher.update(Buffer.from('[1,2,3]')), cipher.final(), cipher.getAuthTag()]); }
  finally { key.fill(0); }
}

try {
  const envelope = encryptBackup(plain, secret), source = join(folder, 'source.json'), encrypted = join(folder, 'archive.enc');
  check('authenticated envelope round-trips identities, versions, zero, negative and null without changing JSON bytes', () => {
    assert.equal(envelope.subarray(0, 8).toString(), 'LKBACKUP');
    assert.deepEqual(decryptBackup(envelope, secret), plain);
    assert(!envelope.includes(plain) && !envelope.includes(Buffer.from(secret)));
  });
  check('repeated encryption uses a fresh salt and nonce', () => {
    const copies = [envelope, encryptBackup(plain, secret), encryptBackup(plain, secret)];
    assert.equal(new Set(copies.map(x => x.subarray(18, 34).toString('hex'))).size, 3);
    assert.equal(new Set(copies.map(x => x.subarray(34, 46).toString('hex'))).size, 3);
    copies.forEach(x => assert.deepEqual(decryptBackup(x, secret), plain));
  });
  check('wrong key rejects before creating plaintext', () => denied('wrong-key', envelope, 'another-synthetic-backup-key'));
  check('altered version, cipher, KDF and iteration parameters are rejected', () => {
    for (const offset of [8, 9, 10, 14, 15, 16, 17]) { const bad = Buffer.from(envelope); bad[offset] ^= 1; denied('header-' + offset, bad); }
  });
  check('salt, nonce, ciphertext and authentication tag changes are rejected', () => {
    for (const offset of [18, 34, 46, 64, envelope.length - 1]) { const bad = Buffer.from(envelope); bad[offset] ^= 1; denied('tamper-' + offset, bad); }
  });
  check('truncation and appended bytes are rejected without partial output', () => {
    for (const length of [0, 8, 45, 62, envelope.length - 1]) denied('truncated-' + length, envelope.subarray(0, length));
    denied('appended', Buffer.concat([envelope, Buffer.from([0])]));
  });
  check('authenticated bytes still require object-shaped JSON before output', () => denied('authenticated-array', authenticatedNonObject(envelope)));
  check('encryption rejects invalid UTF-8, invalid JSON and non-object JSON', () => {
    for (const value of [Buffer.from([255]), Buffer.from('not JSON'), Buffer.from('[]'), Buffer.from('null')]) assert.throws(() => encryptBackup(value, secret));
  });
  writeFileSync(source, plain, { mode: 0o600 });
  check('file and CLI output are complete, private and contain no key or plaintext logs', () => {
    encryptFile(source, encrypted, secret);
    const output = join(folder, 'opened.json'), result = run(['decrypt', encrypted, output]);
    assert.equal(result.status, 0); assert.deepEqual(readFileSync(output), plain);
    assert.equal(statSync(encrypted).mode & 0o777, 0o600); assert.equal(statSync(output).mode & 0o777, 0o600);
    assert(!(result.stdout + result.stderr).includes(secret));
    assert(!(result.stdout + result.stderr).includes('Keep synthetic contents')); clean();
  });
  check('existing destinations and destination symlinks are never overwritten', () => {
    const held = join(folder, 'held.json'); writeFileSync(held, 'existing text');
    assert.throws(() => decryptFile(encrypted, held, secret)); assert.equal(readFileSync(held, 'utf8'), 'existing text');
    assert.throws(() => encryptFile(source, held, secret));
    const link = join(folder, 'linked.json'); symlinkSync(held, link);
    assert.throws(() => decryptFile(encrypted, link, secret)); assert.equal(readFileSync(held, 'utf8'), 'existing text');
    const missing = join(folder, 'missing.json'), dangling = join(folder, 'dangling.json'); symlinkSync(missing, dangling);
    assert.throws(() => decryptFile(encrypted, dangling, secret)); assert.equal(existsSync(missing), false); clean();
  });
  check('canonical parent paths produce private complete output and no staging files', () => {
    const actual = join(folder, 'actual'); mkdirSync(actual); symlinkSync(actual, join(folder, 'parent-link'));
    decryptFile(encrypted, join(folder, 'parent-link', 'opened.json'), secret);
    assert.deepEqual(readFileSync(join(actual, 'opened.json')), plain);
    assert.equal(statSync(join(actual, 'opened.json')).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(actual), ['opened.json']);
    assert.throws(() => decryptFile(encrypted, join(folder, 'absent', 'opened.json'), secret)); clean();
  });
  check('input size is bounded before reading a sparse oversized archive', () => {
    const huge = join(folder, 'oversized.enc'), fd = openSync(huge, 'wx'); ftruncateSync(fd, MAX_BACKUP_BYTES + 100); closeSync(fd);
    const result = run(['decrypt', huge, join(folder, 'oversized.json')]);
    assert.notEqual(result.status, 0); assert.equal(existsSync(join(folder, 'oversized.json')), false); clean();
  });
  check('missing keys and key-shaped command arguments are rejected without disclosure', () => {
    const target = join(folder, 'no-key.json');
    const missing = run(['decrypt', encrypted, target], ''); assert.notEqual(missing.status, 0); assert.match(missing.stderr, /BACKUP_KEY/);
    const argument = run(['decrypt', encrypted, target, secret]); assert.notEqual(argument.status, 0);
    assert(!(argument.stdout + argument.stderr).includes(secret)); assert.equal(existsSync(target), false); clean();
  });
  for (const bytes of [8, 16]) check('trusted legacy mode reads the documented ' + bytes + '-byte salt while normal mode refuses it', () => {
    const file = legacy(bytes);
    assert.deepEqual(decryptTrustedLegacy(file, secret), plain);
    denied('no-downgrade-' + bytes, file);
    const path = join(folder, 'legacy-' + bytes + '.enc'), output = join(folder, 'legacy-' + bytes + '.json'); writeFileSync(path, file);
    const result = run(['decrypt-legacy', path, output]); assert.equal(result.status, 0); assert.match(result.stdout, /cannot be verified/);
    assert.deepEqual(readFileSync(output), plain); assert.equal(statSync(output).mode & 0o777, 0o600);
  });
  check('legacy support interoperates with the installed OpenSSL producer', () => {
    const output = join(folder, 'openssl.enc');
    const result = spawnSync('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-md', 'sha256', '-salt', '-in', source, '-out', output, '-pass', 'env:BACKUP_KEY'], { env: { ...process.env, BACKUP_KEY: secret }, encoding: 'utf8' });
    assert.equal(result.status, 0); assert.deepEqual(decryptTrustedLegacy(readFileSync(output), secret), plain);
    assert(!(result.stdout + result.stderr).includes(secret));
    const help = spawnSync('openssl', ['enc', '-help'], { encoding: 'utf8' });
    if ((help.stdout + help.stderr).includes('-saltlen')) {
      const longer = join(folder, 'openssl16.enc');
      const second = spawnSync('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-md', 'sha256', '-saltlen', '16', '-salt', '-in', source, '-out', longer, '-pass', 'env:BACKUP_KEY'], { env: { ...process.env, BACKUP_KEY: secret }, encoding: 'utf8' });
      assert.equal(second.status, 0); assert.deepEqual(decryptTrustedLegacy(readFileSync(longer), secret), plain);
    }
  });
  check('trusted historical short keys remain readable while new encryption requires a strong key', () => {
    const pass = 'old-key';
    assert.throws(() => encryptBackup(plain, pass));
    for (const salt of [8, 16]) assert.deepEqual(decryptTrustedLegacy(legacy(salt, pass), pass), plain);
    const output = join(folder, 'openssl-short.enc'), recovered = join(folder, 'openssl-short.json');
    const result = spawnSync('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-md', 'sha256', '-salt', '-in', source, '-out', output, '-pass', 'env:BACKUP_KEY'], { env: { ...process.env, BACKUP_KEY: pass }, encoding: 'utf8' });
    assert.equal(result.status, 0);
    const opened = run(['decrypt-legacy', output, recovered], pass); assert.equal(opened.status, 0); assert.deepEqual(readFileSync(recovered), plain);
  });
  check('new envelopes never downgrade through explicit legacy mode', () => denied('new-as-legacy', envelope, secret, 'decrypt-legacy'));
  check('the actual nightly workflow writes an authenticated encrypted artifact and always removes plaintext', () => {
    const temp = join(folder, 'workflow'); mkdirSync(temp); writeFileSync(join(temp, 'backup.json'), plain, { mode: 0o600 });
    const env = { ...process.env, BACKUP_KEY: secret, RUNNER_TEMP: temp };
    const encryption = spawnSync('bash', ['-euo', 'pipefail', '-c', workflowStep('Encrypt and verify').command], { cwd: root, env, encoding: 'utf8' });
    assert.equal(encryption.status, 0);
    const files = readdirSync(join(temp, 'out')); assert.equal(files.length, 1); assert.match(files[0], /^kitchen-book-\d{4}-\d{2}-\d{2}\.json\.enc$/);
    assert.deepEqual(decryptBackup(readFileSync(join(temp, 'out', files[0])), secret), plain);
    assert.deepEqual(readFileSync(join(temp, 'backup-verified.json')), plain); assert.equal(statSync(join(temp, 'backup-verified.json')).mode & 0o777, 0o600);
    const cleanup = workflowStep('Remove plaintext'); assert.match(cleanup.block, /if: always\(\)/);
    assert.equal(spawnSync('bash', ['-euo', 'pipefail', '-c', cleanup.command], { cwd: root, env }).status, 0);
    assert.equal(existsSync(join(temp, 'backup.json')), false); assert.equal(existsSync(join(temp, 'backup-verified.json')), false);
    assert.match(workflow, /path:.*\/out\/\*\.json\.enc/); assert.match(workflow, /retention-days: 90/);
    assert(!(encryption.stdout + encryption.stderr).includes(secret)); assert(!(encryption.stdout + encryption.stderr).includes('Keep synthetic contents'));
  });
  check('workflow cleanup still removes plaintext after encryption fails', () => {
    const temp = join(folder, 'failed-workflow'); mkdirSync(temp); writeFileSync(join(temp, 'backup.json'), plain);
    const env = { ...process.env, BACKUP_KEY: '', RUNNER_TEMP: temp };
    const encryption = spawnSync('bash', ['-euo', 'pipefail', '-c', workflowStep('Encrypt and verify').command], { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(encryption.status, 0);
    assert.equal(spawnSync('bash', ['-euo', 'pipefail', '-c', workflowStep('Remove plaintext').command], { cwd: root, env }).status, 0);
    assert.equal(existsSync(join(temp, 'backup.json')), false); assert.deepEqual(readdirSync(join(temp, 'out')), []);
  });
  check('the workflow refuses a decrypted byte mismatch before its upload step', () => {
    const temp = join(folder, 'mismatched-workflow'), bin = join(temp, 'bin'); mkdirSync(temp); mkdirSync(bin);
    writeFileSync(join(temp, 'backup.json'), plain, { mode: 0o600 });
    const shellQuote = s => "'" + s.replaceAll("'", "'\\''") + "'";
    writeFileSync(join(bin, 'node'), '#!/usr/bin/env bash\nset -euo pipefail\numask 077\nif [ "$2" = decrypt ]; then printf \'{"mismatched":true}\' > "$4"; exit 0; fi\nexec ' + shellQuote(process.execPath) + ' "$@"\n', { mode: 0o700 });
    const env = { ...process.env, BACKUP_KEY: secret, RUNNER_TEMP: temp, PATH: bin + ':' + process.env.PATH };
    const result = spawnSync('bash', ['-euo', 'pipefail', '-c', workflowStep('Encrypt and verify').command], { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.match(result.stdout, /verification failed/);
    assert(!(result.stdout + result.stderr).includes(secret));
    assert.equal(spawnSync('bash', ['-euo', 'pipefail', '-c', workflowStep('Remove plaintext').command], { cwd: root, env }).status, 0);
    assert.equal(existsSync(join(temp, 'backup.json')), false); assert.equal(existsSync(join(temp, 'backup-verified.json')), false);
  });
  console.log('Backup crypto: ' + checks + ' verification groups passed. Synthetic files only.');
} finally { rmSync(folder, { recursive: true, force: true }); plain.fill(0); }
