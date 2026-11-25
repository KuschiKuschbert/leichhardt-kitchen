/* Section cleaning, round 2 previews. Run from the repo root with the click tests' packages installed:
     node docs/cleaning-sections-options/previews/build.cjs
   It opens the real book on the Firebase stand-in (tests/fake) as a line cook on a synthetic Monday, with both
   built-in cleaning lists loaded and the head chef's confirmed Monday jobs seeded as ordinary cleaning tasks.
   "typed" is the real page untouched. A, B and C rearrange those real rows in the page: they are previews, not
   the implemented app. Nothing is written to the real book. */
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../../..');
const L = require(path.join(ROOT, 'tests/lib'));
const schedule = require(path.join(ROOT, 'js/cleaning-schedule'));
const server = require(path.join(ROOT, 'tests/serve'));
const OUT = __dirname;
const DAY = 86400000, OPEN = 253402178400000;
const MON = Date.parse('2026-11-30T04:00:00Z'); // Monday 30 November, 14:00 Queensland
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const at = d => Date.parse(d + 'T00:00:00+10:00');
const base = { root: '', prev: '', next: '', guide: '', from: at('2026-11-01'), until: OPEN, at: MON - 20 * DAY, by: 'sam' };
const built = schedule.drafts().concat(schedule.packDownDrafts());
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fryers', 'Fryers, salads and dessert'], ['hot', 'Hot larder']];
// Only lines whose day the head chef gave. Overlaps with Pack down are left out. The 4-week start date is an example.
const NEW = [
  ['sc-grill-drawers', 'Clean the drawers', 'grill', [1], 'Every Monday'],
  ['sc-grill-behind', 'Clean behind the grill', 'grill', null, 'Every 4 weeks', { days: 28, anchor: '2026-11-02' }],
  ['sc-pans-kick', 'Wipe down the kick oven door', 'pans', null, ''],
  ['sc-fry-shelves', 'Clean the takeaway container shelves, wipe down', 'fryers', [1], 'Every Monday'],
  ['sc-fry-doors', 'Wipe the doors of all fridges', 'fryers', null, ''],
  ['sc-hot-fridges', 'Clean out the fridges, wipe the bottom', 'hot', [1], 'Every Monday'],
  ['sc-hot-doors', 'Wipe down all fridge doors', 'hot', null, ''],
  ['sc-gen-sauces', 'Decant sauces into smaller containers', '', null, ''],
  // Tuesday jobs, for the Tuesday preview of D. Not due on the Monday.
  ['sc-pans-infill', 'Pull the infill benches forward and clean both sides of the stove', 'pans', [2], 'Every Tuesday'],
  ['sc-fry-salad', 'Clean out the salad fridge, wipe the bottom, clean the shelves', 'fryers', [2], 'Every Tuesday'],
  ['sc-hot-drum', 'Wipe down the oil drum from all sides', 'hot', [2], 'Every Tuesday'],
  ['sc-hot-trolley', 'Clean the rack trolley', 'hot', [2], 'Every Tuesday']
];
const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function rhythm(t) {
  if (t.plan && t.plan.repeat) return 'Every ' + t.plan.repeat.days + ' days';
  if (!t.dows || t.dows.length === 7) return '';
  if (t.dows.length === 1) return 'Every ' + names[t.dows[0]];
  return t.dows.map(d => names[d].slice(0, 3)).join(', ');
}
const extra = {}, words = {}, owner = {};
built.forEach(d => { const id = 'clean-template-' + d.plan.template; extra[key('cleaningTasks', id)] = { ...d, ...base, sectionName: '', root: id }; words[id] = rhythm(d); });
NEW.forEach(([id, text, sec, dows, said, repeat]) => {
  const name = (SECS.find(s => s[0] === sec) || [])[1] || '';
  const t = { ...base, root: id, text, area: name || 'Kitchen', section: sec, sectionName: name, shared: !sec, dows: dows || [0, 1, 2, 3, 4, 5, 6] };
  if (repeat) t.plan = { template: '', method: '', responsibility: '', checks: [], timing: 'daily', verification: false, verifiers: [], review: '', repeat };
  extra[key('cleaningTasks', id)] = t; words[id] = said; owner[id] = name || 'Shared kitchen';
});
SECS.forEach(([id, name]) => { extra[key('sections', id)] = { name, uses: 5, hidden: false }; });
extra[key('config', 'main')] = { ...L.seed()[key('config', 'main')], kitSecs: SECS.map(([id, name]) => ({ id, name })) };

// Runs in the page: rearranges the real rows into one design.
function design(which, words, owner, opts) {
  const body = document.querySelector('.cln-body'), rows = {};
  document.querySelectorAll('.cln-row').forEach(r => { rows[r.dataset.id] = r; });
  const ids = Object.keys(rows), isNew = id => /^sc-/.test(id), pd = id => (id.match(/^clean-template-pd-(hot|grill|pans)-/) || [])[1];
  const pdName = { hot: 'Hot larder', grill: 'Grill', pans: 'Pans' };
  const meta = (id, parts) => { const m = rows[id].querySelector('.nb-meta'); if (!m) return; const state = m.textContent.split(' · ').pop(); const t = parts.filter(Boolean).concat(state).join(' · '); m.textContent = t; m.title = t; if (parts.filter(Boolean).length) m.classList.add('pv-wrap'); };
  const head = (tag, name, n, cls) => { const h = document.createElement(tag); h.className = 'nb-hd' + (cls ? ' ' + cls : ''); h.innerHTML = '<span></span><span class="cln-group-count"></span>'; h.firstChild.textContent = name; h.lastChild.textContent = n == null ? '' : '0/' + n; return h; };
  const list = idsIn => { const ul = document.createElement('ul'); ul.className = 'nb-rows'; idsIn.forEach(id => ul.appendChild(rows[id])); return ul; };
  const group = (name, idsIn, tag) => { const s = document.createElement('section'); s.appendChild(head(tag || 'h3', name, idsIn.length)); s.appendChild(list(idsIn)); return s; };
  const hint = t => { const p = document.createElement('p'); p.className = 'hint'; p.textContent = t; return p; };
  const title = t => { const h = document.createElement('h3'); h.className = 'cln-packdown-title'; h.textContent = t; return h; };
  const secOf = id => isNew(id) ? owner[id] : pd(id) ? pdName[pd(id)] : id === 'clean-template-c03' ? 'Floors after shelving' : 'Shared kitchen';
  const order = ['Fryers, salads and dessert', 'Grill', 'Hot larder', 'Pans'];
  const packNote = 'Finish overhead shelves and frames before the final floor clean. Keep each after-service floor check separate. Floor checks follow this list.';
  const general = ids.filter(id => secOf(id) === 'Shared kitchen'), floor = ids.filter(id => secOf(id) === 'Floors after shelving');
  body.textContent = '';
  if (which === 'A') {
    // Same page, clearer words: a section's own clean has its own heading, and a job that is not nightly says how often.
    ids.forEach(id => { if (words[id]) meta(id, isNew(id) ? [words[id]] : [words[id]].concat(rows[id].querySelector('.nb-meta').textContent.split(' · ').slice(0, -1))); else if (isNew(id)) meta(id, ['Every night']); });
    order.forEach(n => { const mine = ids.filter(id => isNew(id) && owner[id] === n); if (mine.length) body.appendChild(group(n + ': section clean', mine)); });
    body.appendChild(group('Shared kitchen', general));
    const pk = document.createElement('section'); pk.className = 'cln-packdown'; pk.appendChild(title('Pack down')); pk.appendChild(hint(packNote));
    ['hot', 'grill', 'pans'].forEach(k => { const s = group(pdName[k] + ': pack down', ids.filter(id => pd(id) === k), 'h4'); s.className = 'cln-packdown-group'; pk.appendChild(s); });
    body.appendChild(pk); body.appendChild(group('Floors after shelving', floor));
  }
  if (which === 'B') {
    // By how often: what comes round weekly or monthly is first, the nightly lists follow as they are today.
    const rare = ids.filter(id => words[id]);
    rare.forEach(id => meta(id, [secOf(id), words[id]]));
    ids.filter(id => isNew(id) && !words[id]).forEach(id => meta(id, []));
    const top = group('Today only', rare); top.insertBefore(hint('These come round weekly or monthly. Tonight is their day.'), top.lastChild); body.appendChild(top);
    body.appendChild(title('Every night'));
    body.appendChild(group('Shared kitchen', general.filter(id => !words[id])));
    const pk = document.createElement('section'); pk.className = 'cln-packdown'; pk.appendChild(head('h3', 'Pack down')); pk.appendChild(hint(packNote));
    ['hot', 'grill', 'pans'].forEach(k => { const s = group(pdName[k], ids.filter(id => !words[id] && (pd(id) === k || isNew(id) && owner[id] === pdName[k])), 'h4'); s.className = 'cln-packdown-group'; pk.appendChild(s); });
    const fr = ids.filter(id => !words[id] && isNew(id) && owner[id] === 'Fryers, salads and dessert'); if (fr.length) { const s = group('Fryers, salads and dessert', fr, 'h4'); s.className = 'cln-packdown-group'; pk.appendChild(s); }
    body.appendChild(pk); body.appendChild(group('Floors after shelving', floor.filter(id => !words[id])));
  }
  if (which === 'D') {
    /* The mix: the section this cook is on today (or this screen is set to) leads, with its weekly and monthly jobs
       beside its Pack down. Nothing is folded away. A job that is not nightly says how often. A section's new nightly
       jobs follow its numbered Pack down steps. */
    const lead = opts.lead, rare = id => !!words[id];
    ids.forEach(id => { if (rare(id)) meta(id, isNew(id) ? [words[id]] : [words[id]].concat(rows[id].querySelector('.nb-meta').textContent.split(' · ').slice(0, -1))); else if (isNew(id)) meta(id, []); });
    const cleanOf = n => ids.filter(id => isNew(id) && owner[id] === n && rare(id));
    const packOf = n => ids.filter(id => pdName[pd(id)] === n).concat(ids.filter(id => isNew(id) && owner[id] === n && !rare(id)));
    // Trimmed after the follow-up (cook, skeptic): why this section leads sits on the title line, the floor reminder is one line
    // [proposed wording], and Go to Pack down names the signed-in cook's own section.
    const card = document.createElement('section'); card.className = 'pv-mine'; const t = title(lead); t.classList.add('pv-title'); const why = document.createElement('small'); why.textContent = opts.hint; t.appendChild(why); card.appendChild(t);
    const jump = document.querySelector('[data-cln="pack-down-jump"]'); if (jump && opts.jump) jump.textContent = opts.jump;
    if (cleanOf(lead).length) { card.appendChild(head('h4', 'Section clean', cleanOf(lead).length)); card.appendChild(list(cleanOf(lead))); }
    card.appendChild(head('h4', 'Pack down', packOf(lead).length)); card.appendChild(hint('Overhead shelves and frames first. Floors are last.')); card.appendChild(list(packOf(lead)));
    body.appendChild(card);
    body.appendChild(group('Shared kitchen', general));
    body.appendChild(title('Rest of the kitchen'));
    ['Hot larder', 'Grill', 'Pans', 'Fryers, salads and dessert'].filter(n => n !== lead).forEach(n => {
      if (cleanOf(n).length) body.appendChild(group(n + ': section clean', cleanOf(n)));
      if (packOf(n).length) { const g = group(n + ': pack down', packOf(n), 'h4'); g.className = 'cln-packdown-group'; body.appendChild(g); }
    });
    body.appendChild(group('Floors after shelving', floor));
  }
  if (which === 'C') {
    // By person: the cook's own section is open, everything else is one closed row that opens in place.
    const mine = 'Grill';
    ids.forEach(id => { if (words[id]) meta(id, [words[id]].concat(isNew(id) ? [] : rows[id].querySelector('.nb-meta').textContent.split(' · ').slice(0, -1))); else if (isNew(id)) meta(id, ['Every night']); });
    const card = document.createElement('section'); card.className = 'pv-mine';
    const own = ids.filter(id => isNew(id) && owner[id] === mine), pack = ids.filter(id => pd(id) === 'grill');
    card.appendChild(title('Grill')); card.appendChild(hint('Your section today. ' + (own.length + pack.length) + ' jobs: the section clean, then pack down.'));
    card.appendChild(head('h4', 'Section clean', own.length)); card.appendChild(list(own));
    card.appendChild(head('h4', 'Pack down', pack.length)); card.appendChild(list(pack));
    body.appendChild(card);
    const fold = (name, n, small) => { const s = document.createElement('section'); s.className = 'pv-fold'; s.innerHTML = '<button type="button" class="pv-fold-toggle" aria-expanded="false"><span class="pv-fold-main"><strong></strong><small></small></span><span class="pv-fold-count"></span><span class="pv-fold-cue">Show</span></button>'; s.querySelector('strong').textContent = name; s.querySelector('small').textContent = small; s.querySelector('.pv-fold-count').textContent = '0/' + n; return s; };
    body.appendChild(head('h3', 'Rest of the kitchen'));
    order.filter(n => n !== mine).forEach(n => { const a = ids.filter(id => isNew(id) && owner[id] === n).length, b = ids.filter(id => pdName[pd(id)] === n).length; body.appendChild(fold(n, a + b, a + ' section clean' + (b ? ', ' + b + ' pack down' : ''))); });
    body.appendChild(fold('Shared kitchen', general.length, 'Jobs for everyone'));
    body.appendChild(fold('Floors after shelving', floor.length, 'After every pack down'));
  }
}
const CSS = [
  ['barlow', 'Barlow', 400], ['barlow-600', 'Barlow', 600], ['barlow-700', 'Barlow', 700], ['barlow-condensed', 'Barlow Condensed', 700], ['caveat', 'Caveat', 700]
].map(([f, fam, w]) => "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + f + ".woff2') format('woff2')}").join('') +
  // Preview only: the chef page's fold row (.cln-fold in css/app.css), scoped for the staff page.
  '.pv-fold{border-bottom:1px solid var(--rule)}.pv-fold-toggle{display:grid;grid-template-columns:minmax(0,1fr) auto 3.2rem;align-items:center;gap:.5rem .85rem;width:100%;min-height:68px;padding:.65rem 0;border:0;background:transparent;color:var(--ink);text-align:left}' +
  ".pv-fold-main strong{display:block;font:700 1.45rem/1.15 var(--display);overflow-wrap:anywhere}.pv-fold-main small{display:block;margin-top:.2rem;color:var(--muted);font:400 .8125rem/1.35 var(--body)}.pv-fold-count{font:700 1.5rem/1.15 'Caveat',cursive}.pv-fold-cue{font:600 .8125rem/1.3 var(--body);text-align:right}" +
  '.pv-mine .cln-packdown-title{margin-top:.4rem}.pv-title{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem}.pv-title small{font:400 .8125rem/1.3 var(--body);color:var(--muted);text-align:right}.cln-row .nb-meta.pv-wrap{white-space:normal;overflow:visible;text-overflow:clip}';

const TUE = MON + DAY;
const VARIANTS = [
  { key: 'today', file: 'baseline-today', plain: true },
  { key: 'typed', file: 'typed' },
  { key: 'A', file: 'a', which: 'A' }, { key: 'B', file: 'b', which: 'B' }, { key: 'C', file: 'c', which: 'C' },
  // D: the mix. On a cook's own phone, on a shared screen set to Grill with a Pans cook signed in, and on a Tuesday.
  { key: 'D', file: 'd', which: 'D', opts: { lead: 'Grill', hint: 'Your section today', jump: 'Go to Grill pack down' } },
  { key: 'D-screen', file: 'd-screen', which: 'D', who: 'bo', sec: ['pans', 'Pans'], shared: true, opts: { lead: 'Grill', hint: 'This screen. You are on Pans today', jump: 'Go to Pans pack down' } },
  { key: 'D-tue', file: 'd-tue', which: 'D', sec: ['pans', 'Pans'], clock: TUE, opts: { lead: 'Pans', hint: 'Your section today', jump: 'Go to Pans pack down' }, mine: ['sc-pans-infill', 'clean-template-pd-pans-01'] }
].filter(v => !process.env.ONLY || v.key.indexOf(process.env.ONLY) === 0);

(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000);
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  const file = path.join(OUT, 'measurements.json');
  const b = await L.start(), out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).results : {};
  // today: the same cook and day with both lists and none of the new jobs, on the same measure as the designs
  const today = Object.fromEntries(Object.entries(extra).filter(([k]) => !/\/cleaningTasks\/sc-/.test(k)));
  for (const v of VARIANTS) for (const width of [390, 1280]) {
    const who = v.who || 'ann', sec = v.sec || ['grill', 'Grill'];
    const p = await L.open(b, '#/cleaning', { who, width, base: 'http://127.0.0.1:' + port + '/', extra: v.plain ? today : extra, clock: v.clock || MON, wait: 1000, deviceMode: v.shared ? 'shared' : 'personal',
      // The cook's section for the day is already known (their pick or the plan), so the Your section today sheet stays away.
      init: new Function("var a=" + JSON.stringify([who].concat(sec)) + ";var d=new Date(Date.now()+36e5*10).toISOString().slice(0,10);localStorage.setItem('lk.sec.'+a[0],JSON.stringify({d:d,sec:a[1],name:a[2],self:true,at:Date.now()}));") });
    await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent) && document.querySelectorAll('.cln-row').length > 40; });
    await p.addStyleTag({ content: CSS }); await p.evaluate(() => document.fonts.ready); await L.settle(p, 400);
    if (v.which) await p.evaluate(([w, a, o, f, x]) => new Function('return ' + f)()(w, a, o, x), [v.which, words, owner, design.toString(), v.opts || {}]);
    await L.settle(p, 200);
    const m = await p.evaluate(mine => {
      const rows = [...document.querySelectorAll('.cln-row')];
      const bar = [...document.querySelectorAll('body *')].find(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().bottom >= innerHeight - 1 && e.getBoundingClientRect().height < 120 && e.getBoundingClientRect().height > 30);
      const limit = bar ? bar.getBoundingClientRect().top : innerHeight;
      const full = rows.filter(r => { const b = r.getBoundingClientRect(); return b.height > 0 && b.top >= 0 && b.bottom <= limit; });
      const cut = rows.map(r => r.querySelector('.nb-meta')).filter(e => e && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
      const small = [...document.querySelectorAll('.cln-body button')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length;
      const top = id => { const r = document.querySelector('.cln-row[data-id="' + id + '"]'); return r ? Math.round((r.getBoundingClientRect().top + scrollY) / innerHeight * 10) / 10 : null; };
      return { screensToMyExtraJob: top(mine[0]), screensToMyPackDown: top(mine[1]), screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, rows: rows.length, rowsOnFirstScreen: full.length, firstRows: full.map(r => r.querySelector('.nb-t').textContent), pageHeight: document.documentElement.scrollHeight, sideways: document.documentElement.scrollWidth > innerWidth, metaCutOff: cut, targetsUnder44: small,
        oneTap: document.querySelectorAll('[data-cln="tick"]').length, opensChecks: document.querySelectorAll('.nb-box[data-cln="details"]').length, headings: [...document.querySelectorAll('.cln-body .nb-hd, .cln-body .cln-packdown-title, .pv-fold strong')].map(e => e.textContent.replace(/0\/.*$/, '').trim()) };
    }, v.mine || ['sc-grill-drawers', 'clean-template-pd-grill-01']);
    if (p.errors.length) m.errors = p.errors;
    out[v.key + '-' + width] = m;
    await p.screenshot({ path: path.join(OUT, v.file + '-' + width + '.png') });
    if (width === 390) await p.screenshot({ path: path.join(OUT, v.file + '-390-full.png'), fullPage: true });
    if (width === 390 && v.key === 'C') { await p.evaluate(() => document.querySelector('.pv-fold').scrollIntoView({ block: 'center' })); await L.settle(p, 200); await p.screenshot({ path: path.join(OUT, 'c-rest-390.png') }); }
    await p.context().close();
  }
  if (!process.env.ONLY || process.env.ONLY === 'S') {
    // The Settings row, drawn by copying the real "How this device is used" row on a shared screen (head chef signed in).
    const p = await L.open(b, '#/settings', { admin: true, deviceMode: 'shared', width: 390, base: 'http://127.0.0.1:' + port + '/', wait: 1500 });
    await p.addStyleTag({ content: CSS }); await p.evaluate(() => document.fonts.ready); await L.settle(p, 600);
    await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.st-row')], dev = rows.find(r => /How this device is used/.test(r.textContent));
      const row = dev.cloneNode(true); row.dataset.row = 'screen-sec';
      row.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); row.querySelector('.st-l').textContent = "This screen's section";
      row.querySelector('.st-v').innerHTML = '<span>Grill</span>';
      const body = row.querySelector('.st-body'); if (body) { body.hidden = false; body.innerHTML = '<p class="hint">Cleaning opens on Grill on this screen, whoever signs in. Prep and wastage lines still go under each person\'s own section. Only the head chef changes it.</p><div class="chips"><button type="button" class="chip" aria-pressed="false">No section</button><button type="button" class="chip is-on" aria-pressed="true">Grill</button><button type="button" class="chip" aria-pressed="false">Pans</button><button type="button" class="chip" aria-pressed="false">Hot larder</button><button type="button" class="chip" aria-pressed="false">Fryers</button></div>'; }
      dev.after(row); dev.scrollIntoView({ block: 'start' }); scrollBy(0, -90);
    });
    await L.settle(p, 300);
    await p.screenshot({ path: path.join(OUT, 'd-settings-390.png') });
    await p.context().close();
  }
  fs.writeFileSync(file, JSON.stringify({ source: '27ae8275', day: 'Monday 30 November 2026 (synthetic); D-tue is Tuesday 1 December', role: 'line cook', viewport: '390 x 844 and 1280 x 844', fonts: 'Barlow, Barlow Condensed, Caveat', kind: 'Preview over the real page on the Firebase stand-in', results: out }, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
