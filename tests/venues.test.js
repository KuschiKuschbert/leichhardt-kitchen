/*
  Each venue its own project, address, name and empty book (19 Nov 2026, docs/venues.md).
  - venues/*.json is checked word by word, and Leichhardt's own files (js/firebase-config.js, the security header in
    index.html) are its venue file's, so a mismatched project and config stop the Click tests.
  - The guard each workflow job runs first refuses another venue's service account or project.
  - Every workflow job that holds a venue's secrets runs in that venue's GitHub environment and guards first.
  - A made-up second venue's copy of the book (scripts/venue-site.cjs) names only its own project, sign-in host and
    name, with an empty book and its own QR files, and opens in Chrome at 390, 768 and 1280 px with no JS errors and no
    sideways scroll, saying its own name in the top bar. Made-up venue, project and keys only.
*/
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const L = require('./lib');
const { R, ok } = L.results();
const V = require('../scripts/venues.cjs'), site = require('../scripts/venue-site.cjs'), live = require('../scripts/venue-live-check.cjs');
const root = path.join(__dirname, '..');
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };

const home = JSON.parse(fs.readFileSync(path.join(root, 'venues', 'leichhardt.json'), 'utf8'));
const demo = {
  id: 'demo', name: 'Seaside Hotel', short: 'Seaside', address: 'https://demo-venue-kb.web.app/', host: 'firebase', book: 'empty', secrets: 'environment',
  firebase: { apiKey: 'AIza' + 'D'.repeat(35), authDomain: 'demo-venue-kb.firebaseapp.com', projectId: 'demo-venue-kb', storageBucket: 'demo-venue-kb.firebasestorage.app',
    messagingSenderId: '123456789012', appId: '1:123456789012:web:abcdef0123456789', appCheckEnterpriseKey: '6L' + 'd'.repeat(38) }
};
const copy = x => JSON.parse(JSON.stringify(x));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'venues-'));
// a made-up registry: Leichhardt (its secrets moved into its environment) and the made-up venue with its QR files
function registry(extra) {
  const dir = fs.mkdtempSync(path.join(tmp, 'reg-'));
  fs.writeFileSync(path.join(dir, 'leichhardt.json'), JSON.stringify(Object.assign(copy(home), { secrets: 'environment' })));
  fs.writeFileSync(path.join(dir, 'demo.json'), JSON.stringify(Object.assign(copy(demo), extra || {})));
  fs.mkdirSync(path.join(dir, 'demo'));
  fs.writeFileSync(path.join(dir, 'demo', 'qr.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  fs.writeFileSync(path.join(dir, 'demo', 'qr.png'), fs.readFileSync(path.join(root, 'icons', 'icon-192.png')));
  fs.writeFileSync(path.join(dir, 'demo', 'qr-sign.pdf'), '%PDF-1.4 made up');
  return dir;
}

(async () => {
  // 1. The venue files and Leichhardt's own files
  const list = V.loadVenues();
  ok(list.length >= 1 && list.some(v => v.id === 'leichhardt' && v.host === 'pages' && v.book === 'full'), 'venues/leichhardt.json: Leichhardt on GitHub Pages with the full book');
  ok(!throws(() => V.checkPagesFiles(list), /./), 'js/firebase-config.js and the security header are word for word Leichhardt\'s venue file');
  ok(fs.readFileSync(path.join(root, 'js', 'firebase-config.js'), 'utf8') === V.configJs(home), 'the settings the phones load are made from venues/leichhardt.json');
  const other = Object.assign(copy(home), { firebase: Object.assign(copy(home.firebase), { projectId: 'another-project', authDomain: 'another-project.firebaseapp.com', storageBucket: 'another-project.firebasestorage.app' }) });
  const fake = fs.mkdtempSync(path.join(tmp, 'pages-'));
  fs.mkdirSync(path.join(fake, 'js'));
  fs.writeFileSync(path.join(fake, 'js', 'firebase-config.js'), V.configJs(other));
  fs.copyFileSync(path.join(root, 'index.html'), path.join(fake, 'index.html'));
  ok(throws(() => V.checkPagesFiles(list, fake), /firebase-config\.js/), 'a config naming another project is refused');
  fs.writeFileSync(path.join(fake, 'js', 'firebase-config.js'), V.configJs(home));
  fs.writeFileSync(path.join(fake, 'index.html'), fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('https://' + home.firebase.authDomain + ';', 'https://' + home.firebase.authDomain + ' https://another-project.firebaseapp.com;'));
  ok(throws(() => V.checkPagesFiles(list, fake), /security header/), 'a security header naming a second sign-in host is refused');

  const bad = (change, re, msg) => ok(throws(() => V.validVenue(Object.assign(copy(demo), change)), re), 'a venue file is refused: ' + msg);
  bad({ firebase: Object.assign(copy(demo.firebase), { authDomain: 'other-project.firebaseapp.com' }) }, /authDomain/, 'its sign-in host is another project\'s');
  bad({ firebase: Object.assign(copy(demo.firebase), { appId: '1:999999999:web:abcdef0123' }) }, /appId/, 'its web app is another project\'s');
  bad({ firebase: Object.assign(copy(demo.firebase), { projectId: 'Bad_Project' }) }, /projectId/, 'its project id is not one');
  bad({ address: 'https://kuschikuschbert.github.io/leichhardt-kitchen/' }, /own address/, 'a new venue on another venue\'s address');
  bad({ book: 'full' }, /empty book/, 'a new venue with the full book');
  bad({ name: "O'Reilly Hotel" }, /name/, 'a name that would break a quoted string');
  bad({ extra: true }, /exactly these fields/, 'an unknown field');
  const two = [Object.assign(copy(home)), copy(demo)];
  ok(throws(() => V.checkRegistry(two), /repository secrets/), 'two venues while one still uses repository secrets is refused (a missing secret would be the other venue\'s)');
  ok(throws(() => V.checkRegistry([Object.assign(copy(home), { secrets: 'environment' }), copy(demo), Object.assign(copy(demo), { id: 'demo2', address: 'https://demo-venue-kb.firebaseapp.com/' })]), /share one project/), 'two venues on one project are refused');
  ok(!throws(() => V.checkRegistry([Object.assign(copy(home), { secrets: 'environment' }), copy(demo)]), /./), 'two venues, each with its own environment, are fine');

  // 2. The guard each job runs first
  const sa = p => JSON.stringify({ type: 'service_account', project_id: p, private_key: '-----BEGIN PRIVATE KEY-----made-up' });
  ok(V.guard(home, sa('leichhardt-kitchen'), '') === 'leichhardt-kitchen', 'guard: Leichhardt with its repository secrets, as today');
  ok(throws(() => V.guard(home, sa('demo-venue-kb'), ''), /not leichhardt's service account/), 'guard: another venue\'s service account is refused');
  ok(throws(() => V.guard(home, sa('leichhardt-kitchen'), 'demo-venue-kb'), /VENUE_PROJECT is not/), 'guard: an environment naming another project is refused');
  ok(throws(() => V.guard(demo, sa('demo-venue-kb'), ''), /VENUE_PROJECT is not set/), 'guard: a venue whose environment is not set up is refused (no fall back to repository secrets)');
  ok(V.guard(demo, sa('demo-venue-kb'), 'demo-venue-kb') === 'demo-venue-kb', 'guard: a venue\'s own environment and service account pass');
  let said = '';
  try { V.guard(home, sa('demo-venue-kb'), ''); } catch (e) { said = e.message; }
  ok(said && !/PRIVATE KEY|made-up|demo-venue-kb/.test(said), 'guard: the refusal names no secret and no other project');
  ok(V.scriptProject({}) === 'leichhardt-kitchen' && V.scriptProject({ VENUE: 'leichhardt' }) === 'leichhardt-kitchen' && throws(() => V.scriptProject({ VENUE: 'nowhere' }), /no venue/), 'server scripts: Leichhardt without VENUE, and an unknown venue refused');

  // 3. Every job that holds a venue's secrets runs in that venue's environment and guards first
  const wfDir = path.join(root, '.github', 'workflows');
  for (const f of fs.readdirSync(wfDir).filter(f => f.endsWith('.yml'))) {
    const text = fs.readFileSync(path.join(wfDir, f), 'utf8'), lines = text.split('\n');
    const start = lines.indexOf('jobs:');
    if (start < 0) continue;
    const jobs = [];
    for (let i = start + 1; i < lines.length; i++) if (/^  [a-z][a-z0-9_-]*:\s*$/.test(lines[i])) jobs.push(i);
    jobs.forEach((at, k) => {
      const body = lines.slice(at, k + 1 < jobs.length ? jobs[k + 1] : lines.length).join('\n'), name = f + ' ' + lines[at].trim();
      if (!/secrets\.(FIREBASE_SA|KITCHEN_PIN|OWNER_EMAIL|BACKUP_KEY)/.test(body)) return;
      ok(/\n    environment:\n      name: [^\n]+\n      deployment: false/.test(body), name + ' runs in its venue\'s environment, with no deployment record');
      const guard = body.search(/venues\.cjs guard/), firstUse = body.search(/node (?!scripts\/venues\.cjs)[^\n]*\.(m?js|cjs)|bash scripts\/venue-deploy/);
      const readsKitchen = /secrets\.(FIREBASE_SA|KITCHEN_PIN)/.test(body) && f !== 'prep-minimums.yml';
      if (readsKitchen) ok(guard > 0 && (firstUse < 0 || guard < firstUse), name + ' guards its venue\'s project before any script runs');
    });
  }
  ok(!/secrets\.KITCHEN_PIN/.test(fs.readFileSync(path.join(wfDir, 'nightly-backup.yml'), 'utf8').split('Last night\'s backup')[1].split('Read the book')[0]), 'backup: last night\'s file is found without the kitchen PIN');
  ok(/kitchen-book-\$VENUE-backup-\[0-9\]\+/.test(fs.readFileSync(path.join(wfDir, 'nightly-backup.yml'), 'utf8')), 'backup: only this venue\'s own artifact is looked for');

  // 4. A made-up second venue's copy of the book
  const reg = registry();
  const out = path.join(tmp, 'site');
  const r = site.build('demo', out, { venuesDir: reg, now: Date.parse('2026-11-19T02:00:00Z') });
  ok(r.project === 'demo-venue-kb' && r.files > 50, 'the copy is made (' + r.files + ' files)');
  const read = f => fs.readFileSync(path.join(out, f), 'utf8');
  ok(read('js/firebase-config.js') === V.configJs(demo), 'the copy\'s settings are the venue\'s own');
  const hosts = V.cspAuthHosts(read('index.html'));
  ok(hosts.length === 1 && hosts[0] === 'https://demo-venue-kb.firebaseapp.com', 'the copy\'s security header names its own sign-in host only (' + hosts.join(', ') + ')');
  global.window = {}; eval(read('js/data.js'));
  const book = global.window.LK_DATA;
  ok(book.recipes.length === 0 && book.menuOrder.length === 0 && book.fnStock.length === 0 && book.allergens.length === 10 && book.updated === '19 November 2026', 'the copy\'s book is empty, with the ten allergens');
  const man = JSON.parse(read('manifest.webmanifest'));
  ok(man.name === 'Seaside Kitchen Book' && man.id === '/' && /Seaside Hotel/.test(man.description), 'the installed app has the venue\'s name and its own id');
  const leftovers = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|html|css|webmanifest|json|svg)$/.test(e.name) && /leichhardt/i.test(fs.readFileSync(p, 'utf8'))) leftovers.push(path.relative(out, p)); } })(out);
  ok(leftovers.length === 0, 'nothing in the copy names Leichhardt (' + leftovers.slice(0, 5).join(', ') + ')');
  ok(fs.readFileSync(path.join(out, 'qr.svg'), 'utf8') === fs.readFileSync(path.join(reg, 'demo', 'qr.svg'), 'utf8'), 'the copy\'s QR code is the venue\'s own');
  ok(!fs.existsSync(path.join(out, 'docs')) && !fs.existsSync(path.join(out, 'scripts')) && !fs.existsSync(path.join(out, 'firestore.rules')) && !fs.existsSync(path.join(out, 'venues')), 'notes, scripts, the rules template and the venue files stay out of the copy');
  ok(/Seaside Hotel Kitchen/.test(read('js/app.js')) && /seaside-prep-backup-/.test(read('js/prep.js')) === false && /demo-prep-backup-/.test(read('js/prep.js')), 'the top bar and saved file names say the venue (Seaside Hotel Kitchen, demo-prep-backup-)');
  const reg2 = registry(); fs.rmSync(path.join(reg2, 'demo', 'qr.png'));
  ok(throws(() => site.build('demo', path.join(tmp, 'site2'), { venuesDir: reg2 }), /qr\.png is missing/), 'no copy without the venue\'s own QR files');
  ok(throws(() => site.build('demo', out, { venuesDir: reg }), /not empty/), 'a copy is never made over another');
  ok(throws(() => site.build('leichhardt', path.join(tmp, 'site3'), { venuesDir: reg }), /GitHub Pages/), 'Leichhardt is published from the repository itself, never copied');

  // 5. The copy in Chrome, served from its own address (its own origin), signed out
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
  const server = http.createServer((q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(out, p);
    if (!f.startsWith(out + path.sep) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Last-Modified': 'Sun, 18 Oct 2026 00:00:00 GMT' });
    s.end(fs.readFileSync(f));
  });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const fails = await live.check('demo', base, V.loadVenues(reg));
  ok(fails.length === 0, 'the live check passes on the served copy (' + fails.join('; ') + ')');
  const b = await L.start();
  try {
    for (const width of [390, 768, 1280]) {
      const p = await L.open(b, '#/', { base, width, noPin: true, who: '', wait: 1500 });
      const seen = await p.evaluate(() => ({ project: (window.LK_FIREBASE || {}).projectId, eyebrow: (document.querySelector('.rb-eb') || {}).textContent || '', title: document.title, recipes: (window.LK_DATA || {}).recipes.length, body: document.body.innerText }));
      ok(seen.project === 'demo-venue-kb', width + ' px: the copy talks to its own project only');
      ok(seen.eyebrow === 'Seaside Hotel Kitchen' && /Seaside/.test(seen.title) && !/Leichhardt/i.test(seen.body), width + ' px: the top bar says Seaside Hotel Kitchen, nothing says Leichhardt (' + seen.eyebrow + ' | ' + seen.title + ')');
      ok(seen.recipes === 0, width + ' px: no recipes in the book');
      ok(!(await L.overflow(p)), width + ' px: no sideways scroll ' + (await L.overflow(p) || ''));
      await p.evaluate(() => { location.hash = '#/recipes'; }); await L.settle(p, 800);
      ok(!(await L.overflow(p)), width + ' px: the empty Recipes page has no sideways scroll');
      const errs = p.errors.filter(e => !/net::ERR|Failed to load resource/i.test(e));
      ok(errs.length === 0, width + ' px: no JS errors (' + errs.slice(0, 3).join(' | ') + ')');
      await p.context().close();
    }
  } finally { await b.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
  L.report(R);
})().catch(e => { console.log('FAIL ' + (e.stack || e)); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); });
