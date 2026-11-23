/*
  A venue's own copy of the book (19 Nov 2026, docs/venues.md). The GitHub Pages venue (Leichhardt) is the repository as
  it is. Every other venue is served by its own Firebase project at its own address, from a copy made here:
    node scripts/venue-site.cjs <venue id> <empty folder>
  The copy is the files the phones load, with
    - js/firebase-config.js made from venues/<id>.json (its own project, never Leichhardt's),
    - the security header in index.html naming its own sign-in host,
    - its name in place of Leichhardt's (the top bar, titles, prints, the installed app's name),
    - an empty book in js/data.js (the head chef adds recipes in the book), and
    - its own QR code files from venues/<id>/ (qr.svg, qr.png, qr-sign.pdf), so Settings never opens another venue.
  It refuses, with nothing written, when a file to change is not as expected, when anything in the copy still names
  Leichhardt, or when the copy's settings and security header do not name the venue's own project.
  VENUES_DIR (tests only) reads the venue files from another folder.
*/
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');
const V = require('./venues.cjs');

const ROOT = V.ROOT;
// What the phones never load (scripts/site-changed.sh leaves the same out of a publish), and the QR files, which come
// from the venue's own folder.
const SKIP = /^(docs\/|scripts\/|\.github\/|\.claude\/|tests\/|venues\/)|\.md$|^firestore\.rules$|^\.gitignore$|^(qr\.svg|qr\.png|qr-sign\.pdf)$/;
const TEXT = /\.(js|html|css|webmanifest|json|svg|txt)$/;
const QR = ['qr.svg', 'qr.png', 'qr-sign.pdf'];

function refuse(what) { throw new Error('Venue copy refused: ' + what + ' Nothing was written.'); }
function count(text, s) { let n = 0, i = 0; while ((i = text.indexOf(s, i)) >= 0) { n++; i += s.length; } return n; }
const bare = address => address.replace(/^https:\/\//, '').replace(/\/$/, '');
function kitchenDate(ms) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane' }).format(new Date(ms));
}

function emptyBook(venue, ms) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8'), sandbox, { timeout: 2000 });
  const allergens = (sandbox.window.LK_DATA || {}).allergens;
  if (!Array.isArray(allergens) || allergens.length !== 10) refuse('js/data.js has no list of the ten allergens.');
  return '/*\n  ' + venue.short + ' Kitchen Book: recipe data. A new venue\'s book starts empty (docs/venues.md): the head chef adds\n' +
    '  recipes in the book itself (Manage Recipes), kept in this venue\'s own Firebase project.\n*/\n' +
    'window.LK_DATA = {\n  updated: ' + JSON.stringify(kitchenDate(ms)) + ',\n  allergens: ' + JSON.stringify(allergens) +
    ',\n  fnStock: [],\n  menuOrder: [],\n  recipes: []\n};\n';
}

function build(id, out, opts = {}) {
  const list = V.loadVenues(opts.venuesDir || V.DIR);
  const venue = V.venueById(id, list), home = list.find(v => v.host === 'pages') || V.venueById('leichhardt', V.loadVenues());
  if (venue.host !== 'firebase') refuse(venue.id + ' is published from the repository itself (GitHub Pages).');
  if (fs.existsSync(out) && fs.readdirSync(out).length) refuse('the folder is not empty.');
  const qrDir = path.join(opts.venuesDir || V.DIR, venue.id);
  for (const q of QR) if (!fs.existsSync(path.join(qrDir, q))) refuse('venues/' + venue.id + '/' + q + ' is missing: make the venue\'s QR code first (docs/venues.md).');

  // The phrases that name the home venue, longest first, and what the venue copy says instead.
  const swaps = [
    ['https://' + home.firebase.authDomain, 'https://' + venue.firebase.authDomain],
    [bare(home.address), bare(venue.address)],
    [home.name, venue.name],
    [home.short + ' Kitchen', venue.short + ' Kitchen'],
    // the names of saved files (leichhardt-prep-backup-..., leichhardt-wastage-...)
    [home.id + '-', venue.id + '-']
  ];
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(f => f && !SKIP.test(f));
  const made = new Map();
  for (const f of files) {
    let body = fs.readFileSync(path.join(ROOT, f));
    if (TEXT.test(f)) {
      let s = body.toString('utf8');
      for (const [from, to] of swaps) s = s.split(from).join(to);
      s = s.replace(new RegExp('\\b' + home.short + '\\b', 'g'), venue.short);
      body = s;
    }
    made.set(f, body);
  }

  // Files changed as a whole, each checked against what it must hold first.
  const index = made.get('index.html');
  if (typeof index !== 'string' || count(index, 'https://' + venue.firebase.authDomain) !== 2) refuse('index.html\'s security header is not as expected.');
  made.set('js/firebase-config.js', V.configJs(venue));
  made.set('js/data.js', emptyBook(venue, opts.now || Date.now()));
  const manifest = JSON.parse(made.get('manifest.webmanifest'));
  if (typeof manifest.id !== 'string' || typeof manifest.name !== 'string') refuse('manifest.webmanifest is not as expected.');
  manifest.id = new URL(venue.address).pathname;
  made.set('manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n');
  for (const q of QR) made.set(q, fs.readFileSync(path.join(qrDir, q)));

  // Nothing in the copy may name the home venue or its project, and its settings must be the venue's own.
  for (const [f, body] of made) {
    if (typeof body === 'string' && /leichhardt/i.test(body) && !/leichhardt/i.test(venue.id + venue.name)) refuse(f + ' still names Leichhardt.');
    if (typeof body === 'string' && body.includes(home.firebase.projectId)) refuse(f + ' still names ' + home.id + '\'s project.');
  }
  const hosts = V.cspAuthHosts(made.get('index.html'));
  if (hosts.length !== 1 || hosts[0] !== 'https://' + venue.firebase.authDomain) refuse('the security header does not name ' + venue.id + '\'s sign-in host alone.');
  const sandbox = { window: {} };
  vm.runInNewContext(made.get('js/firebase-config.js'), sandbox, { timeout: 2000 });
  if (sandbox.window.LK_FIREBASE.projectId !== venue.firebase.projectId) refuse('the settings do not name ' + venue.id + '\'s project.');

  for (const [f, body] of made) {
    const to = path.join(out, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, body);
  }
  return { venue: venue.id, project: venue.firebase.projectId, files: made.size };
}

module.exports = { build, emptyBook };

if (require.main === module) {
  const [id, out] = process.argv.slice(2);
  if (!id || !out) { console.error('Use: node scripts/venue-site.cjs <venue id> <empty folder>'); process.exit(2); }
  try { const r = build(id, path.resolve(out), { venuesDir: process.env.VENUES_DIR || undefined }); console.log('Copy of the book for ' + r.venue + ' (' + r.project + '): ' + r.files + ' files.'); }
  catch (e) { console.error(e.message); process.exit(1); }
}
