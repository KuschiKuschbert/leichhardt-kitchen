// Festive hats on Home (head chef, 17 Nov 2026; docs/kitchen-mascot.md, Festive hats on Home;
// docs/mascot-festive-options/brief.md). On Christmas Eve, Christmas Day and Boxing Day the mascot on Home wears a Santa
// hat, and on New Year's Eve and New Year's Day a party cone: from the first frame of his play to his rest pose, by the
// welcome's own rule for the day. Under a finished prep list he keeps his work clothes. Off, an ordinary day and the next
// kitchen day take the hat off where he stands. The hats are drawn in js/mascot.js, so nothing is fetched for them.
// The head points in js/mascot.js are measured from the art (scripts/mascot-head-points.py): new art fails here first.
// Synthetic staff only.
const L = require('./lib');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const at = s => Date.parse(s + '+10:00');
const XMAS = at('2026-12-25T14:00:00'), NYE = at('2026-12-31T14:00:00'), PLAIN = at('2026-12-28T14:00:00'), BOXING_LATE = at('2026-12-26T23:59:30');
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));
const st = p => p.evaluate(() => window.LK_MASCOT ? window.LK_MASCOT.state() : null);
const stillSt = p => p.evaluate(() => window.LK_MASCOT && window.LK_MASCOT.stillState ? window.LK_MASCOT.stillState() : null);
// How many of his 192 x 256 pixels differ from the plain art of the picture he has drawn, and the lowest row that does.
// file: a still, or null for the frame of his play on Home. The art is decoded first. Then, with nothing awaited in
// between, the frame he has drawn (his own state) and his pixels are read in one synchronous block, so they are always
// the same frame: his play runs on real time, and on a slow runner a decode outlasted a frame (17 Nov 2026, #745).
const diff = (p, sel, file) => p.evaluate(async ([sel, file]) => {
  const M = window.LK_MASCOT, clip = file ? '' : M.state().clip, img = new Image();
  img.src = 'art/mascot/' + (file || clip + '-sheet-compact.webp') + '?v=1'; await img.decode();
  // from here to the return nothing awaits, so no timer of his play can draw the next frame in between
  const s = file ? null : M.state(), f = s ? s.frame : null;
  const a = document.querySelector(sel + ' canvas').getContext('2d').getImageData(0, 0, 192, 256).data;
  const t = document.createElement('canvas'); t.width = 192; t.height = 256;
  const x = t.getContext('2d'); x.imageSmoothingEnabled = false;
  if (f == null) x.drawImage(img, 0, 0, 192, 256); else x.drawImage(img, (f % 4) * 192, Math.floor(f / 4) * 256, 192, 256, 0, 0, 192, 256);
  const b = x.getImageData(0, 0, 192, 256).data;
  let n = 0, low = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 40) { n++; low = Math.max(low, Math.floor(i / 4 / 192)); }
  }
  // a play's look says which frame it was and that the play was still on it (the same clip, not back at rest)
  return s ? { n, low, clip, frame: f, playing: s.playing && s.clip === clip } : { n, low };
}, [sel, file]);

// The art and the head points agree: the same sum scripts/mascot-head-points.py writes into js/mascot.js.
function artCheck() {
  const art = path.join(__dirname, '..', 'art', 'mascot'), js = fs.readFileSync(path.join(__dirname, '..', 'js', 'mascot.js'), 'utf8');
  const h = crypto.createHash('sha256');
  fs.readdirSync(art).filter(f => /-sheet-compact\.webp$|-still\.png$/.test(f)).sort()
    .forEach(f => h.update(f + ':' + crypto.createHash('sha256').update(fs.readFileSync(path.join(art, f))).digest('hex') + '\n'));
  const sum = (js.match(/HEAD_SUM = '([0-9a-f]{64})'/) || [])[1];
  ok(sum === h.digest('hex'), 'the head points were measured on this art (after new art: python3 scripts/mascot-head-points.py --write)');
  const block = js.slice(js.indexOf('HEAD points start'), js.indexOf('HEAD points end'));
  const rows = [...block.matchAll(/^ {4}'([a-z-]+)': \[([\d.]+),(.*)\],?$/gm)];
  ok(rows.length === 11 && rows.every(r => (r[3].match(/\[/g) || []).length === 9), 'a head point for all 8 frames and the still of all 11 actions: ' + rows.length);
  ok(/var V = '\?v=1'|V = '\?v=1'/.test(js) && /HEAD_ART = '\?v=1'/.test(js), 'the head points name the art version they were measured on');
}

(async () => {
  artCheck();
  const b = await L.start(); let p = null;
  async function open(o) {
    p = await L.open(b, o.hash || '#/', Object.assign({ who: 'ann', width: 390, height: 844, wait: 1200, server: o.clock,
      seasonal: { selection: 'auto', motion: 'gentle', density: 'light' } }, o));
    p.__art = []; p.on('request', r => { if (/art\/mascot\//.test(r.url())) p.__art.push(r.url()); });
    if (!o.hash) await L.waitFor(p, () => !!(window.LK_MASCOT && window.LK_MASCOT.state() && window.LK_MASCOT.state().rest), null, 6000);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }
  const restNow = async () => { for (let i = 0; i < 20 && (await st(p)).playing; i++) { await p.clock.runFor(500); await L.settle(p, 50); } };

  await step('Christmas Day: a Santa hat from the first frame to his rest', async () => {
    await open({ clock: XMAS });
    let s = await st(p);
    ok(s.hat === 'santa', 'Christmas Day: the Santa hat: ' + JSON.stringify(s));
    if (s.playing) {
      const d = await diff(p, '.mascot', null);
      ok(d.playing && d.n > 150 && d.low < 100, 'his play wears it from the first frame, on his head: ' + JSON.stringify(d));
    } else ok(false, 'the first Home view of the day plays today’s action');
    await restNow();
    const d = await diff(p, '.mascot', 'welcome-still.png');
    ok(d.n > 150 && d.low < 100, 'at rest he wears it, on his head only: ' + JSON.stringify(d));
    ok(!p.__art.some(u => /hat|santa|party/.test(u)), 'nothing fetched for the hat: ' + p.__art.join(','));
    ok(await p.evaluate(() => /Christmas/.test(document.querySelector('#rtitle').textContent)), 'the welcome says Christmas beside him');
  });

  await step('New Year’s Eve: the party cone', async () => {
    await open({ clock: NYE }); await restNow();
    const s = await st(p), d = await diff(p, '.mascot', 'welcome-still.png');
    ok(s.hat === 'party' && d.n > 100 && d.low < 100, 'New Year’s Eve: the party cone: ' + JSON.stringify([s.hat, d]));
  });

  await step('an ordinary day, and celebrations Off', async () => {
    await open({ clock: PLAIN }); await restNow();
    let s = await st(p), d = await diff(p, '.mascot', 'welcome-still.png');
    ok(s.hat === '' && d.n === 0, '28 December: his work clothes, exactly the plain art: ' + JSON.stringify([s.hat, d]));
    await p.context().close();
    await open({ clock: XMAS, seasonal: { selection: 'off' } }); await restNow();
    s = await st(p); d = await diff(p, '.mascot', 'welcome-still.png');
    ok(s.hat === '' && d.n === 0, 'Christmas Day with celebrations Off on this device: no hat: ' + JSON.stringify([s.hat, d]));
    await p.evaluate(() => window.KB_SEASONAL.configure({ selection: 'auto' })); await p.clock.runFor(400); await L.settle(p, 300);
    s = await st(p); d = await diff(p, '.mascot', 'welcome-still.png');
    ok(s.hat === 'santa' && d.n > 150, 'turned On with Home open: he puts it on where he stands: ' + JSON.stringify([s.hat, d]));
    await p.evaluate(() => window.KB_SEASONAL.configure({ selection: 'off' })); await p.clock.runFor(400); await L.settle(p, 300);
    s = await st(p); d = await diff(p, '.mascot', 'welcome-still.png');
    ok(s.hat === '' && d.n === 0, 'and Off takes it off again: ' + JSON.stringify([s.hat, d]));
  });

  await step('Boxing Day into an ordinary day with Home left open', async () => {
    await open({ clock: BOXING_LATE }); await restNow();
    let s = await st(p);
    ok(s.hat === 'santa', 'Boxing Day at 23:59: the Santa hat: ' + s.hat);
    await p.clock.runFor(90000); await L.settle(p, 400);
    s = await st(p); const d = await diff(p, '.mascot', 'welcome-still.png');
    ok(s.hat === '' && d.n === 0 && s.mounted, 'after Queensland midnight the hat is off where he stands, not at the 04:00 reload: ' + JSON.stringify([s.hat, d]));
  });

  await step('reduced motion: a tap shows today’s pose as a still, in the hat', async () => {
    await open({ clock: XMAS }); await restNow();
    await p.emulateMedia({ reducedMotion: 'reduce' });
    const today = (await p.evaluate(() => window.LK_MASCOT.record('ann'))).today;
    await p.click('.mascot'); await p.clock.runFor(100); await L.settle(p, 300);
    const s = await st(p), d = await diff(p, '.mascot', today + '-still.png');
    ok(s.rest === 'still' && !s.playing && s.hat === 'santa' && d.n > 150 && d.low < 100, 'the still of ' + today + ' wears the hat: ' + JSON.stringify([s.rest, s.hat, d]));
  });

  await step('the finished prep list keeps his work clothes', async () => {
    const day = '2026-12-25', done = { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: XMAS - 600000, preparedBy: 'Ann', preparedById: 'ann', preparedAt: XMAS - 600000 };
    const extra = {};
    ['i1', 'i2', 'i3'].forEach((id, k) => { extra[key(['days', day, 'items', id])] = Object.assign({ text: 'Line ' + id, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: XMAS - (60 - k) * 60000, deleted: false }, done); });
    await open({ clock: XMAS, hash: '#/prep', extra });
    await L.waitFor(p, () => { const s = window.LK_MASCOT && window.LK_MASCOT.stillState && window.LK_MASCOT.stillState(); return !!s && s.rest === 'rest'; }, null, 6000);
    const d = await diff(p, '.mascot-still', 'welcome-still.png');
    ok((await stillSt(p)) && d.n === 0, 'Christmas Day, every line ticked: the plain Welcome pose: ' + JSON.stringify(d));
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
