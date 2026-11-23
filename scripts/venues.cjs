/*
  The venues (19 Nov 2026, docs/venues.md). Each venue is one file in venues/<id>.json: its name, its web address, its
  own Firebase project and the project's public web settings. Nothing secret is in a venue file: the kitchen PIN, the
  emails, the service account and the backup key live only in that venue's GitHub environment (named like the venue).

  Used by the workflows and the server scripts, never by the phones:
    node scripts/venues.cjs check            the venue files are sound, and js/firebase-config.js and the security
                                             header in index.html are the GitHub Pages venue's own (Leichhardt)
    node scripts/venues.cjs matrix [--hosted] the venues as one line of JSON for a workflow matrix (--hosted: only the
                                             venues served by their own Firebase project, not GitHub Pages)
    node scripts/venues.cjs guard <id>       before a job touches a venue: FIREBASE_SA (when set) is that venue's own
                                             service account, and VENUE_PROJECT (the environment's variable) names that
                                             venue's project. Stops the job on any mismatch. Prints no secret.
  A venue file is checked word by word: a wrong field stops every job, it never falls back to another venue.
*/
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'venues');
const FIELDS = ['id', 'name', 'short', 'address', 'host', 'book', 'secrets', 'firebase'];
const WEB = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'appCheckEnterpriseKey'];
// A name goes into page text and into quoted strings in the copied code, so it holds only plain letters and spaces.
const NAME = /^[A-Za-z0-9][A-Za-z0-9 .-]{1,38}[A-Za-z0-9.]$/;
const PROJECT = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

function fail(file, what) { throw new Error((file ? file + ': ' : '') + what); }

function validVenue(v, file) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(file, 'not a venue');
  const keys = Object.keys(v);
  if (!FIELDS.every(k => keys.includes(k)) || keys.some(k => !FIELDS.includes(k) && k !== 'supplierSales')) {
    fail(file, 'needs exactly these fields: ' + FIELDS.join(', ') + ', with optional supplierSales');
  }
  if (keys.includes('supplierSales') && typeof v.supplierSales !== 'boolean') fail(file, 'supplierSales is true or false');
  if (typeof v.id !== 'string' || !/^[a-z][a-z0-9-]{1,30}$/.test(v.id)) fail(file, 'id is lower case letters, digits and -');
  if (file && path.basename(file) !== v.id + '.json') fail(file, 'the file is named after its id');
  if (typeof v.name !== 'string' || !NAME.test(v.name) || /Kitchen/.test(v.name)) fail(file, 'name is plain letters and spaces, 3 to 40, like "Leichhardt Hotel"');
  if (typeof v.short !== 'string' || !NAME.test(v.short) || v.short.length > 20 || /Kitchen/.test(v.short)) fail(file, 'short is plain letters, 3 to 20, like "Leichhardt"');
  if (!['pages', 'firebase'].includes(v.host)) fail(file, 'host is "pages" or "firebase"');
  if (!['full', 'empty'].includes(v.book)) fail(file, 'book is "full" or "empty"');
  if (!['repository', 'environment'].includes(v.secrets)) fail(file, 'secrets is "repository" or "environment"');
  const f = v.firebase;
  if (!f || typeof f !== 'object' || Array.isArray(f)) fail(file, 'firebase is the web settings object');
  const fk = Object.keys(f);
  if (fk.length !== WEB.length || !WEB.every(k => fk.includes(k) && typeof f[k] === 'string')) fail(file, 'firebase needs exactly ' + WEB.join(', '));
  const p = f.projectId;
  if (!PROJECT.test(p)) fail(file, 'firebase.projectId is not a Firebase project id');
  if (!/^AIza[0-9A-Za-z_-]{35}$/.test(f.apiKey)) fail(file, 'firebase.apiKey is not a web API key');
  if (f.authDomain !== p + '.firebaseapp.com' && f.authDomain !== p + '.web.app') fail(file, 'firebase.authDomain is not this project\'s');
  if (f.storageBucket !== p + '.firebasestorage.app' && f.storageBucket !== p + '.appspot.com') fail(file, 'firebase.storageBucket is not this project\'s');
  if (!/^\d{6,20}$/.test(f.messagingSenderId)) fail(file, 'firebase.messagingSenderId is digits');
  const app = /^1:(\d{6,20}):web:[0-9a-f]{6,40}$/.exec(f.appId);
  if (!app || app[1] !== f.messagingSenderId) fail(file, 'firebase.appId is not this project\'s web app');
  if (!/^[0-9A-Za-z_-]{20,60}$/.test(f.appCheckEnterpriseKey)) fail(file, 'firebase.appCheckEnterpriseKey is not a site key');
  if (typeof v.address !== 'string' || !/^https:\/\/[a-z0-9.-]+\/([a-z0-9._-]+\/)*$/.test(v.address)) fail(file, 'address is an https address ending in /');
  // A venue served by its own project lives at the project's own free address, on its own origin: nothing a phone keeps
  // (drafts, PIN sessions, the saved book) can cross between two kitchens (docs/second-venue-options/brief.md, cut 2).
  if (v.host === 'firebase' && v.address !== 'https://' + p + '.web.app/' && v.address !== 'https://' + p + '.firebaseapp.com/') fail(file, 'a firebase venue lives at its project\'s own address');
  if (v.host === 'firebase' && v.book !== 'empty') fail(file, 'a new venue starts with an empty book');
  return v;
}

function checkRegistry(list) {
  const seen = { id: new Set(), project: new Set(), address: new Set() };
  for (const v of list) {
    for (const [k, value] of [['id', v.id], ['project', v.firebase.projectId], ['address', v.address]]) {
      if (seen[k].has(value)) fail(v.id + '.json', 'two venues share one ' + k);
      seen[k].add(value);
    }
  }
  if (list.filter(v => v.host === 'pages').length > 1) fail('', 'only one venue can be on GitHub Pages');
  if (list.some(v => v.book === 'full' && v.host !== 'pages')) fail('', 'only the GitHub Pages venue has the full book');
  // Repository secrets reach every environment that lacks its own. With two venues, a secret missing from one venue's
  // environment would quietly be the other venue's. So repository secrets are only for a book with one venue: move them
  // into that venue's environment before a second venue file is added (docs/venues.md, step 1).
  if (list.length > 1 && list.some(v => v.secrets === 'repository')) fail('', 'move the repository secrets into each venue\'s environment before a second venue is added (docs/venues.md)');
  return list;
}

function loadVenues(dir = DIR) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  if (!files.length) fail('', 'no venue files');
  return checkRegistry(files.map(f => {
    const file = path.join(dir, f);
    let v;
    try { v = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(f, 'not JSON'); }
    return validVenue(v, file);
  }));
}

function venueById(id, list = loadVenues()) {
  const v = list.find(x => x.id === id);
  if (!v) fail('', 'no venue named ' + JSON.stringify(String(id).slice(0, 40)));
  return v;
}

// The one line of JSON a workflow matrix reads. The GitHub environment is named like the venue.
function matrix(list, hosted) {
  return list.filter(v => !hosted || v.host === 'firebase')
    .map(v => ({ id: v.id, name: v.name, project: v.firebase.projectId, env: v.id, address: v.address, host: v.host }));
}

// Before a job touches a venue. sa is the FIREBASE_SA text ('' when the job has none), envProject the environment's
// VENUE_PROJECT variable. Returns the project; throws a plain sentence that names no secret.
function guard(v, sa, envProject) {
  const p = v.firebase.projectId;
  if (envProject) { if (envProject !== p) fail('', 'the ' + v.id + ' environment\'s VENUE_PROJECT is not ' + v.id + '\'s project. Nothing was done.'); }
  else if (v.secrets !== 'repository') fail('', 'VENUE_PROJECT is not set in the ' + v.id + ' environment. Set up the environment first (docs/venues.md). Nothing was done.');
  if (sa) {
    let account;
    try { account = JSON.parse(sa); } catch (e) { fail('', 'FIREBASE_SA is not JSON. Nothing was done.'); }
    if (!account || account.project_id !== p) fail('', 'FIREBASE_SA is not ' + v.id + '\'s service account. Nothing was done.');
  }
  return p;
}

// The project a server script may touch: the job's VENUE (Leichhardt's when a script runs without one, as before).
function scriptProject(env = process.env) { return venueById(env.VENUE || 'leichhardt').firebase.projectId; }

// js/firebase-config.js for a venue, word for word the file Leichhardt's phones load today.
function configJs(v) {
  const f = v.firebase;
  return "/* Firebase web app settings for the prep list. These values are meant to be public. They only say which\n" +
    "   project to talk to. Who can read or write is decided by the security rules in the Firebase console. */\n" +
    "window.LK_FIREBASE = {\n" +
    WEB.slice(0, 6).map(k => "  " + k + ": '" + f[k] + "',\n").join('') +
    "  // App Check (Fraud Defense, reCAPTCHA Enterprise): the site key is public too. With it every phone sends a token that\n" +
    "  // says the request came from the real site; once Enforce is on in the Firebase console, nothing else gets through.\n" +
    "  appCheckEnterpriseKey: '" + f.appCheckEnterpriseKey + "'\n" +
    "};\n" + (v.supplierSales === true
      ? "\n// The weekly sales pilot is enabled for this book. Other venues get their own generated settings.\nwindow.LK_SUPPLIER_SALES_ENABLED = true;\n"
      : "");
}

// The security header's Firebase sign-in hosts: every https://<host>.firebaseapp.com or .web.app it names.
function cspAuthHosts(html) {
  const m = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html);
  if (!m) fail('index.html', 'no security header');
  return [...new Set(m[1].match(/https:\/\/[a-z0-9-]+\.(firebaseapp\.com|web\.app)/g) || [])];
}

// The GitHub Pages venue's own files are the repository's: its config and security header must name its project.
function checkPagesFiles(list, root = ROOT) {
  const v = list.find(x => x.host === 'pages');
  if (!v) return;
  if (fs.readFileSync(path.join(root, 'js', 'firebase-config.js'), 'utf8') !== configJs(v)) fail('js/firebase-config.js', 'is not ' + v.id + '\'s settings in venues/' + v.id + '.json');
  const hosts = cspAuthHosts(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  if (hosts.length !== 1 || hosts[0] !== 'https://' + v.firebase.authDomain) fail('index.html', 'the security header does not name ' + v.id + '\'s sign-in host alone');
}

module.exports = { loadVenues, validVenue, checkRegistry, venueById, matrix, guard, scriptProject, configJs, cspAuthHosts, checkPagesFiles, DIR, ROOT };

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'check') { const list = loadVenues(); checkPagesFiles(list); console.log('Venues checked: ' + list.map(v => v.id).join(', ') + '.'); }
    else if (cmd === 'matrix') console.log(JSON.stringify(matrix(loadVenues(), arg === '--hosted')));
    else if (cmd === 'guard') { const v = venueById(arg); guard(v, process.env.FIREBASE_SA || '', process.env.VENUE_PROJECT || ''); console.log('Venue ' + v.id + ': its own project and settings.'); }
    else { console.error('Use: check, matrix [--hosted] or guard <venue id>.'); process.exit(2); }
  } catch (e) { console.error(e.message); process.exit(1); }
}
