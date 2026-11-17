// Review-only. Builds docs/april-fools-options/preview/index.html: one self-contained page that plays the three
// April Fools designs on a frozen copy of the real Home (made-up people, from snapshot.mjs), with the book's fonts
// and styles inside it, so it opens on a phone with no server.
//   node docs/april-fools-options/preview/build.mjs <snapshot json> [fonts folder]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const [snapFile, fontDir] = process.argv.slice(2);
const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
const b64 = f => fs.readFileSync(f).toString('base64');

let html = snap.html;
html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '');
html = html.replace(/<link [^>]*rel="(manifest|icon|apple-touch-icon|preconnect)"[^>]*>/gi, '');
html = html.replace(/<link [^>]*href="https:\/\/fonts\.googleapis\.com[^>]*>/gi, '');
html = html.replace(/<link [^>]*rel="stylesheet"[^>]*href="(css\/[^"]+)"[^>]*>/gi, (m, href) => `<style>${fs.readFileSync(path.join(ROOT, href), 'utf8')}</style>`);
const FONTS = [['Barlow', 400, 'barlow-400.woff2'], ['Barlow', 600, 'barlow-600.woff2'], ['Barlow', 700, 'barlow-700.woff2'], ['Barlow Condensed', 700, 'barlow-condensed-700.woff2'], ['Caveat', 700, 'caveat-700.woff2']];
// With a fonts folder the fonts go inside the page (for screenshots with no network); without one the page loads them
// from Google Fonts, as the book does. The committed page loads them.
const faces = fontDir ? `<style>${FONTS.map(([f, w, file]) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64(path.join(fontDir, file))}) format('woff2')}`).join('')}</style>`
  : '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Caveat:wght@700&display=swap">';
html = html.replace('</head>', `${faces}</head>`);
const still = `data:image/png;base64,${b64(path.join(ROOT, 'art/mascot/welcome-still.png'))}`;
html = html.replace(/(<button[^>]*class="mascot"[^>]*>)<canvas[^>]*><\/canvas>/, `$1<img src="${still}" alt="" style="width:100%;height:100%;display:block">`);
// The preview's own helper: put the typed name where the book shows it.
const setName = `<script>window.SETNAME=function(n){n=String(n||'Ann').trim()||'Ann';var q=function(s){return document.querySelector(s)};
if(q('#rtitle'))q('#rtitle').textContent='Good afternoon, '+n;if(q('.wtop-who-n'))q('.wtop-who-n').textContent=n;if(q('.wtop-av'))q('.wtop-av').textContent=n.charAt(0).toUpperCase();
document.querySelectorAll('#hm-team .hm-tp b').forEach(function(b){if(b.dataset.me||b.textContent==='Ann'){b.dataset.me='1';b.textContent=n;}});};</script>`;
html = html.replace('</body>', `<style>${fs.readFileSync(path.join(HERE, 'fools.css'), 'utf8')}</style>${setName}<script>${fs.readFileSync(path.join(HERE, 'fools.js'), 'utf8')}</script></body>`);
if (!/^<!doctype/i.test(html)) html = '<!doctype html>' + html;

const page = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>April Fools options</title>
<style>
:root { --bg: #EDE6D8; --ink: #1C1D1F; --soft: #4A4740; --card: #FBF8F1; --line: #1C1D1F; --accent: #E2602A; --on: #1C1D1F; --on-ink: #fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #161615; --ink: #F1EEE7; --soft: #BDB8AE; --card: #22211F; --line: #4A4843; --on: #F1EEE7; --on-ink: #161615; } }
:root[data-theme="dark"] { --bg: #161615; --ink: #F1EEE7; --soft: #BDB8AE; --card: #22211F; --line: #4A4843; --on: #F1EEE7; --on-ink: #161615; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 16px; max-width: 1180px; margin: 0 auto; }
@media (min-width: 900px) { .wrap { grid-template-columns: 360px minmax(0, 1fr); align-items: start; padding: 24px; } }
h1 { margin: 0 0 4px; font-size: 22px; line-height: 1.2; }
.lede { margin: 0 0 14px; color: var(--soft); font-size: 15px; }
.picks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.picks button { min-height: 48px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--card); color: var(--ink); font-family: inherit; font-weight: 700; font-size: 15px; line-height: 1.15; cursor: pointer; padding: 6px; }
.picks button[aria-pressed="true"] { background: var(--on); color: var(--on-ink); border-color: var(--on); }
.picks button small { display: block; font-weight: 500; font-size: 12px; opacity: .8; }
.opts { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; margin: 12px 0; font-size: 15px; }
.opts input[type=text] { width: 9.5em; min-height: 40px; padding: 6px 10px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); font: inherit; }
.opts label { display: inline-flex; gap: 8px; align-items: center; min-height: 40px; }
.opts input[type=checkbox] { width: 22px; height: 22px; }
.again { min-height: 40px; padding: 0 14px; border: 1.5px solid var(--line); border-radius: 8px; background: transparent; color: var(--ink); font-family: inherit; font-weight: 600; font-size: 15px; cursor: pointer; }
.say { background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 15px; }
.say b { display: block; font-size: 16px; margin-bottom: 4px; }
.say p { margin: 0 0 6px; }
.note { color: var(--soft); font-size: 13px; margin: 10px 0 0; }
.stage { display: grid; justify-items: center; }
.phone { width: 390px; height: 844px; border: 10px solid #111; border-radius: 34px; overflow: hidden; background: #111; transform-origin: top center; box-shadow: 0 12px 40px rgba(0,0,0,.25); }
.phone iframe { display: block; width: 100%; height: 100%; border: 0; background: #C9B48F; }
@media (max-width: 599px) {
  .wrap { padding: 12px 16px 0; gap: 10px; }
  .lede, .note, .say p + p { display: none; }
  .stage { margin: 0 -16px; }
  .phone { width: 100vw; height: calc(100dvh - 12px); border: 0; border-radius: 0; box-shadow: none; }
}
</style>
</head>
<body>
<div class="wrap">
  <section aria-labelledby="h">
    <h1 id="h">April Fools on Home</h1>
    <p class="lede">Three ways to break the book on 1 April. A copy of the real Home with made-up people; nothing real is touched. Tap the screen to skip.</p>
    <div class="picks" role="group" aria-label="Design">
      <button type="button" data-d="A" aria-pressed="false">A<small>Collapse</small></button>
      <button type="button" data-d="B" aria-pressed="false">B<small>Takeover</small></button>
      <button type="button" data-d="C" aria-pressed="false">C<small>Possessed</small></button>
    </div>
    <div class="opts">
      <label>Name <input type="text" id="nm" value="Ann" maxlength="40" autocomplete="off"></label>
      <label><input type="checkbox" id="rm"> Reduced motion</label>
      <button type="button" class="again" id="again">Play again</button>
    </div>
    <div class="say" id="say" aria-live="polite"><b>Pick a design</b><p>Each plays once, then the mascot owns up.</p></div>
    <p class="note">Preview only. Synthetic Home from the click-test stand-in (commit 4eca7f4). Brief: docs/april-fools-options/brief.md.</p>
  </section>
  <div class="stage"><div class="phone" id="phone"><iframe id="f" title="Home on 1 April, preview"></iframe></div></div>
</div>
<script>
(function () {
  var SNAP = ${JSON.stringify(html).replace(/</g, '\\u003c')};
  var SAY = {
    A: ['A · Collapse', 'The welcome turns to "hello ann.", the clock runs backwards, the screen cracks and every card falls off the page. In the dark it types "what did you press? the book is gone." Then it all flies back. About 8 seconds.'],
    B: ['B · Takeover', 'The screen switches off like an old telly. A hacker terminal deletes the recipes section by section and blames a coworker, then "HELLO ANN", a countdown, and FATAL ERROR 0x0401 turns into 1 APRIL. About 9 seconds.'],
    C: ['C · Possessed', 'Home stays, but every word turns on you: Pants, Your breakdown, Disorders, everyone on with you is you. Letters melt, colours swirl, the page tears. Each tap makes it worse: a flash, then upside down, then the joke. About 8 seconds.']
  };
  var f = document.getElementById('f'), nm = document.getElementById('nm'), rm = document.getElementById('rm'), say = document.getElementById('say'), cur = null, ready = false, queued = null;
  function fit() {
    var p = document.getElementById('phone');
    if (innerWidth < 600) { p.style.transform = ''; p.parentNode.style.height = ''; return; }
    var k = Math.min(1, (innerHeight - 48) / 864);
    p.style.transform = 'scale(' + k + ')'; p.parentNode.style.height = (864 * k) + 'px';
  }
  function load(then) { ready = false; queued = then || null; f.srcdoc = SNAP; }
  f.addEventListener('load', function () {
    ready = true;
    try { f.contentWindow.SETNAME(nm.value); } catch (e) {}
    if (queued) { var q = queued; queued = null; setTimeout(q, 700); }
  });
  function play(d) {
    cur = d;
    document.querySelectorAll('.picks button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.d === d)); });
    var s = SAY[d]; say.innerHTML = '';
    var b = document.createElement('b'); b.textContent = s[0]; var p = document.createElement('p'); p.textContent = s[1];
    var p2 = document.createElement('p'); p2.textContent = rm.checked ? 'Reduced motion: no copy, no layer. The mascot only says it.' : (d === 'C' ? 'Tap the screen to make it worse. The third tap ends it.' : 'Tap the screen to skip to the end.');
    say.append(b, p, p2);
    load(function () { f.contentWindow.FOOLS.play(d, { name: nm.value, reduced: rm.checked }); try { f.contentWindow.focus(); } catch (e) {} });
  }
  document.querySelectorAll('.picks button').forEach(function (b) { b.addEventListener('click', function () { play(b.dataset.d); }); });
  document.getElementById('again').addEventListener('click', function () { if (cur) play(cur); });
  nm.addEventListener('change', function () { if (ready) { try { f.contentWindow.SETNAME(nm.value); } catch (e) {} } });
  addEventListener('resize', fit); fit(); load();
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(HERE, 'index.html'), page);
console.log('wrote', path.join(HERE, 'index.html'), Math.round(page.length / 1024) + ' KB');
