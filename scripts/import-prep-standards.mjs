// Reviewed private inputs only. This creates missing standards and never changes saved standards or daily work.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const MAX_INPUT = 200, MAX_EXISTING = 2000;
const FIELDS = ['section', 'name', 'minimum', 'unit', 'aliases', 'instruction', 'recipe'];
const CORE = ['sectionId', 'name', 'minimum', 'unit', 'aliases', 'instruction', 'recipe'];
const map = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const normal = value => value.trim().toLowerCase().replace(/\s+/g, ' ');
const text = (value, size, blank = false) => typeof value === 'string' && value.length <= size && (blank || !!value.trim());
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
function refuse(code) {
  const error = new Error('Prep standards import refused (' + code + '). No standards were changed.');
  error.code = code;
  throw error;
}
function core(value) { return Object.fromEntries(CORE.map(key => [key, value[key]])); }
function validContent(value) {
  return map(value) && text(value.name, 160) &&
    (value.minimum === null || typeof value.minimum === 'number' && Number.isFinite(value.minimum) && value.minimum >= 0 && value.minimum <= 1000000) &&
    text(value.unit, 40) && Array.isArray(value.aliases) && value.aliases.length <= 12 && value.aliases.every(alias => text(alias, 160)) &&
    text(value.instruction, 500, true) && text(value.recipe, 160, true) && (!value.recipe || /^[A-Za-z0-9_-]+$/.test(value.recipe));
}
function checkedInput(input) {
  if (!Array.isArray(input) || !input.length || input.length > MAX_INPUT) refuse('input-size');
  const names = new Set();
  return input.map(value => {
    if (!validContent(value) || !text(value.section, 160) || Object.keys(value).some(key => !FIELDS.includes(key))) refuse('input-schema');
    const copy = { section: value.section.trim(), name: value.name.trim(), minimum: value.minimum, unit: value.unit.trim(),
      aliases: value.aliases.map(alias => alias.trim()), instruction: value.instruction.trim(), recipe: value.recipe };
    const key = JSON.stringify([normal(copy.section), normal(copy.name)]);
    if (names.has(key)) refuse('duplicate-input');
    names.add(key);
    return copy;
  });
}
function tokens(value) { return new Set([value.name, ...value.aliases].map(normal)); }
function intersects(left, right) { return [...left].some(value => right.has(value)); }
function savedValid(value) {
  return validContent(value) && safeId(value.id) && safeId(value.sectionId) && typeof value.archived === 'boolean' && Number.isInteger(value.v) && value.v > 0;
}

export async function importPrepStandards(db, pin, input, options = {}) {
  if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) refuse('kitchen-pin');
  if (!map(options) || Object.keys(options).some(key => key !== 'dryRun') || options.dryRun !== undefined && typeof options.dryRun !== 'boolean') refuse('options');
  // Input is validated before a transaction or credential-backed read can start.
  const rows = checkedInput(input), dryRun = options.dryRun !== false;
  const kitchen = db.collection('kitchens').doc(pin);
  return db.runTransaction(async tx => {
    // One explicit import reads configuration once and at most 2,001 standards in one section query.
    // All reads precede creates in the same transaction. A retry rechecks names and current head authority.
    const configSnap = await tx.get(kitchen.collection('config').doc('main'));
    if (!configSnap.exists) refuse('configuration');
    const config = configSnap.data(), headId = config.headId;
    const heads = Array.isArray(config.people) ? config.people.filter(person => map(person) && person.id === headId && person.active !== false) : [];
    if (!safeId(headId) || heads.length !== 1 || !Array.isArray(config.staffIds) || !config.staffIds.includes(headId) ||
        !Array.isArray(config.fnOnlyIds) || config.fnOnlyIds.includes(headId) || !Array.isArray(config.kitSecs)) refuse('head-configuration');
    const sections = config.kitSecs.filter(section => map(section) && !section.off);
    const prepared = rows.map(row => {
      const choices = sections.filter(section => text(section.name, 160) && normal(section.name) === normal(row.section));
      if (choices.length !== 1 || !safeId(choices[0].id) || sections.filter(section => section.id === choices[0].id).length !== 1) refuse('section-configuration');
      const { section, ...content } = row;
      const sectionId = choices[0].id;
      const id = 'ps-import-' + createHash('sha256').update(JSON.stringify([sectionId, normal(content.name)])).digest('hex').slice(0, 48);
      return { ...content, sectionId, id };
    });
    const sectionIds = [...new Set(prepared.map(row => row.sectionId))];
    if (sectionIds.length > 30) refuse('section-limit');
    for (let i = 0; i < prepared.length; i++) {
      for (let j = 0; j < i; j++) {
        if (prepared[i].sectionId === prepared[j].sectionId && intersects(tokens(prepared[i]), tokens(prepared[j]))) refuse('ambiguous-input');
      }
    }
    const snap = await tx.get(kitchen.collection('prepStandards').where('sectionId', 'in', sectionIds).limit(MAX_EXISTING + 1));
    if (snap.docs.length > MAX_EXISTING) refuse('catalogue-limit');
    const saved = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if (saved.some(row => !savedValid(row) || !sectionIds.includes(row.sectionId))) refuse('saved-schema');
    const missing = [];
    let existing = 0;
    for (const row of prepared) {
      const matches = saved.filter(item => item.sectionId === row.sectionId &&
        (item.id === row.id || intersects(tokens(item), tokens(row))));
      if (!matches.length) { missing.push(row); continue; }
      if (matches.length !== 1 || matches[0].archived || !isDeepStrictEqual(core(matches[0]), core(row))) refuse('saved-conflict');
      existing++;
    }
    for (const sectionId of sectionIds) {
      const active = saved.filter(row => row.sectionId === sectionId && !row.archived).length;
      if (active + missing.filter(row => row.sectionId === sectionId).length > 1000) refuse('active-limit');
    }
    const at = configSnap.readTime && configSnap.readTime.toMillis();
    if (!Number.isSafeInteger(at) || at <= 0) refuse('server-clock');
    if (!dryRun) {
      for (const row of missing) {
        tx.create(kitchen.collection('prepStandards').doc(row.id), { ...core(row), archived: false, v: 1, at, by: headId });
      }
    }
    return { created: dryRun ? 0 : missing.length, existing, planned: missing.length };
  });
}

async function main() {
  const args = process.argv.slice(2), flags = args.filter(value => value.startsWith('-'));
  const files = args.filter(value => !value.startsWith('-'));
  if (args.length > 2 || files.length !== 1 || flags.length > 1 || flags.some(value => !['--dry-run', '--apply'].includes(value))) {
    throw new Error('Usage: node scripts/import-prep-standards.mjs [--dry-run|--apply] private-input.json. Unknown or conflicting arguments are refused before data access.');
  }
  const pin = process.env.KITCHEN_PIN || '';
  if (!/^\d{4,8}$/.test(pin)) refuse('kitchen-pin');
  let input;
  try {
    const file = statSync(files[0]);
    if (!file.isFile() || file.size > 1024 * 1024) refuse('input-file');
    input = JSON.parse(readFileSync(files[0], 'utf8'));
  } catch { refuse('input-file'); }
  checkedInput(input);
  const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  let serviceAccount, projectId;
  if (emulator) {
    projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-test';
    if (projectId !== 'leichhardt-kitchen' && !/^demo-[a-z0-9-]{1,55}$/.test(projectId)) refuse('project');
  } else {
    try { serviceAccount = JSON.parse(process.env.FIREBASE_SA || '{}'); } catch { refuse('credentials'); }
    projectId = serviceAccount.project_id;
    if (projectId !== 'leichhardt-kitchen' || [process.env.GCLOUD_PROJECT, process.env.GOOGLE_CLOUD_PROJECT].some(value => value && value !== projectId)) refuse('project');
  }
  const { initializeApp, cert, deleteApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = initializeApp(emulator ? { projectId } : { projectId, credential: cert(serviceAccount) });
  try {
    const result = await importPrepStandards(getFirestore(app), pin, input, { dryRun: flags[0] !== '--apply' });
    console.log(JSON.stringify(result));
  } finally { await deleteApp(app); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Do not expose SDK errors, paths, record contents, the kitchen PIN or credential details in public logs.
    const safe = error && typeof error.message === 'string' && (/^Prep standards import refused \([a-z-]+\)\. No standards were changed\.$/.test(error.message) || error.message.startsWith('Usage: node scripts/import-prep-standards.mjs '));
    console.error(safe ? error.message : 'Prep standards import failed. Review the private input and server access before retrying.');
    process.exit(1);
  });
}
