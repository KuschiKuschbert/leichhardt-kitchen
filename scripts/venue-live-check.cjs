/*
  The live check of a venue's own copy of the book (19 Nov 2026, docs/venues.md), after each publish of it:
    node scripts/venue-live-check.cjs <venue id> [address]
  Reads the venue's live address (or the one given, for a local copy) like a phone does, and fails unless
    - its js/firebase-config.js is the venue's own settings (venues/<id>.json), word for word,
    - its security header names the venue's own sign-in host and no other,
    - its book (js/data.js) is the venue's own, no other venue's recipes,
    - the installed app's name is the venue's, and
    - nothing it loads first names Leichhardt.
  The click tests run against Leichhardt's copy; a venue's copy is the same code with these files changed
  (scripts/venue-site.cjs), so this checks exactly those. Reads only, no sign-in, no Firebase.
*/
'use strict';
const vm = require('vm');
const V = require('./venues.cjs');

async function fetchText(base, file) {
  const r = await fetch(new URL(file, base), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(file + ' answered HTTP ' + r.status);
  return r.text();
}

// list: the venues to look in (tests pass made-up ones); the repository's by default.
async function check(id, address, list) {
  const v = V.venueById(id, list || V.loadVenues()), base = address || v.address, fails = [];
  const [index, config, data, manifest, app] = await Promise.all(['index.html', 'js/firebase-config.js', 'js/data.js', 'manifest.webmanifest', 'js/app.js'].map(f => fetchText(base, f)));
  if (config !== V.configJs(v)) fails.push('js/firebase-config.js is not ' + v.id + '\'s own settings');
  const hosts = V.cspAuthHosts(index);
  if (hosts.length !== 1 || hosts[0] !== 'https://' + v.firebase.authDomain) fails.push('the security header names ' + (hosts.join(', ') || 'no sign-in host'));
  const box = { window: {} };
  try { vm.runInNewContext(data, box, { timeout: 2000 }); } catch (e) { fails.push('js/data.js does not run'); }
  const book = box.window.LK_DATA;
  if (!book || !Array.isArray(book.recipes)) fails.push('js/data.js has no book');
  // a new venue's file book stays empty: its recipes live in its own project
  else if (v.book === 'empty' && book.recipes.length) fails.push('js/data.js holds ' + book.recipes.length + ' recipes, not an empty book');
  let m = {};
  try { m = JSON.parse(manifest); } catch (e) { fails.push('manifest.webmanifest is not JSON'); }
  if (m.name !== v.short + ' Kitchen Book') fails.push('the installed app is called ' + JSON.stringify(String(m.name).slice(0, 60)));
  if (v.host === 'firebase') for (const [f, t] of [['index.html', index], ['js/app.js', app], ['manifest.webmanifest', manifest]]) if (/leichhardt/i.test(t)) fails.push(f + ' names Leichhardt');
  return fails;
}

module.exports = { check };

if (require.main === module) {
  const [id, address] = process.argv.slice(2);
  if (!id) { console.error('Use: node scripts/venue-live-check.cjs <venue id> [address]'); process.exit(2); }
  check(id, address).then(fails => {
    if (fails.length) { fails.forEach(f => console.log('FAIL ' + f)); process.exit(1); }
    console.log('PASS ' + id + ': its own settings, security header, book and name at ' + (address || V.venueById(id).address));
  }, e => { console.log('FAIL ' + e.message); process.exit(1); });
}
