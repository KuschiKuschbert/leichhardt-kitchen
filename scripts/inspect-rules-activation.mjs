// Diagnostic ref only. Reads release/source and IAM evidence; never creates, updates or deletes anything.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export const TEMPLATE_COMMIT = 'b976e12c892dc0880cce7c23b1441d5e566c1a78';
const TEMPLATE_HASH = '46d537ccf5ffb76d81809ed71321ae8e66ff646c2afdcab305bd60d2cfc57f02';
const PROJECT = 'leichhardt-kitchen';
const ORIGIN = 'https://firebaserules.googleapis.com/v1/';
const RELEASE = `projects/${PROJECT}/releases/cloud.firestore`;
const IAM = `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:testIamPermissions`;
const PERMISSIONS = ['firebaserules.releases.get', 'firebaserules.releases.update', 'firebaserules.releases.create', 'firebaserules.rulesets.get'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function emptyReport() {
  return { templateCommit: TEMPLATE_COMMIT, inputValid: false, releaseStatus: 0, rulesetStatus: 0, releaseRecheckStatus: 0,
    responseValid: false, activeSourceMatches: false, releasePointerStable: false, activeSourceConfirmed: false,
    iamStatus: 0, iamResponseValid: false, releasesGet: false, releasesUpdate: false, releasesCreate: false, rulesetsGet: false };
}
export function renderExpected(template, pin, owner) {
  if (createHash('sha256').update(template).digest('hex') !== TEMPLATE_HASH || !/^\d{4,8}$/.test(pin || '') ||
    typeof owner !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner)) throw Error('Invalid diagnostic input.');
  return template.replaceAll('KITCHEN_PIN', () => pin).replaceAll('OWNER_EMAIL', () => owner);
}
// Bounded JSON only; reject redirects and unexpected response URLs before reading any body.
async function readJson(response, url) {
  if (response.redirected || response.url !== url || response.status !== 200) return null;
  const length = Number(response.headers.get('content-length'));
  if (length > 1048576) return null;
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 1048576) { await response.body.cancel?.().catch(() => {}); return null; }
    chunks.push(chunk);
  }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { return null; }
}
export async function inspectActivation({ token, expected, fetchImpl = fetch, timeoutMs = 15000 }) {
  const report = emptyReport();
  if (typeof token !== 'string' || !token || typeof expected !== 'string' || !expected) return report;
  report.inputValid = true;
  async function request(url, field, permissions = false) {
    const allowed = url === ORIGIN + RELEASE || url === IAM ||
      /^https:\/\/firebaserules\.googleapis\.com\/v1\/projects\/leichhardt-kitchen\/rulesets\/[A-Za-z0-9_-]{1,160}$/.test(url);
    if (!allowed) return null;
    try {
      const response = await fetchImpl(url, { method: permissions ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${token}`, ...(permissions ? { 'Content-Type': 'application/json' } : {}) },
        ...(permissions ? { body: JSON.stringify({ permissions: PERMISSIONS }) } : {}) });
      report[field] = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : 0;
      return await readJson(response, url);
    } catch { return null; }
  }
  const release = await request(ORIGIN + RELEASE, 'releaseStatus');
  const validName = name => typeof name === 'string' && /^projects\/leichhardt-kitchen\/rulesets\/[A-Za-z0-9_-]{1,160}$/.test(name);
  if (object(release) && release.name === RELEASE && validName(release.rulesetName)) {
    const ruleset = await request(ORIGIN + release.rulesetName, 'rulesetStatus');
    if (object(ruleset) && ruleset.name === release.rulesetName && object(ruleset.source) && Array.isArray(ruleset.source.files) && ruleset.source.files.length > 0 &&
      ruleset.source.files.every(f => object(f) && typeof f.name === 'string' && typeof f.content === 'string')) {
      report.responseValid = true;
      report.activeSourceMatches = ruleset.source.files.length === 1 && ruleset.source.files[0].name === 'firestore.rules' && ruleset.source.files[0].content === expected;
      const again = await request(ORIGIN + RELEASE, 'releaseRecheckStatus');
      report.releasePointerStable = object(again) && again.name === RELEASE && again.rulesetName === release.rulesetName;
      report.activeSourceConfirmed = report.activeSourceMatches && report.releasePointerStable;
    }
  }
  const iam = await request(IAM, 'iamStatus', true);
  if (object(iam) && Object.keys(iam).every(k => k === 'permissions') &&
    (iam.permissions === undefined || Array.isArray(iam.permissions) && iam.permissions.every(p => PERMISSIONS.includes(p)))) {
    report.iamResponseValid = true;
    [report.releasesGet, report.releasesUpdate, report.releasesCreate, report.rulesetsGet] = PERMISSIONS.map(p => (iam.permissions || []).includes(p));
  }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let report = emptyReport();
  try {
    if (process.argv.length !== 2 || process.env.FIRESTORE_EMULATOR_HOST) throw Error('Invalid diagnostic invocation.');
    const template = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
    const expected = renderExpected(template, process.env.KITCHEN_PIN, process.env.OWNER_EMAIL);
    const sa = JSON.parse(process.env.FIREBASE_SA || '{}');
    if (!object(sa) || sa.type !== 'service_account' || sa.project_id !== PROJECT || typeof sa.client_email !== 'string' || typeof sa.private_key !== 'string' ||
      sa.token_uri && sa.token_uri !== 'https://oauth2.googleapis.com/token') throw Error('Unexpected credential.');
    const { cert } = await import('firebase-admin/app');
    const access = await cert(sa).getAccessToken();
    report = await inspectActivation({ token: access.access_token, expected });
  } catch { /* Raw errors can contain credentials, private constants or source. Emit only the fixed report. */ }
  console.log(JSON.stringify(report));
  if (!report.activeSourceConfirmed) process.exitCode = 1;
}
