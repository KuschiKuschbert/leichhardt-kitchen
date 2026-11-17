// Review-only. Builds docs/april-fools-options/preview/index.html: one self-contained page that plays the twelve
// one-minute April Fools designs (two versions each) on a frozen copy of the real Home (made-up people, from snapshot.mjs), with the book's fonts
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

const SAY = {
  A: ['Collapse', 'Small things go wrong first: a typo, a tilted card, the wrong time. Then his welcome turns to "hello ann.", the clock runs backwards, every card swings off its pin and falls, and the tabs drop off. The screen goes dark and types to them; ERROR 0x0401 turns into 1 APRIL and everything flies back.', 'The screen cracks like glass. "what did you press? the book is gone."', 'The pins pop off the cards instead of the crack. "the book fell over. all of it."'],
  B: ['Takeover', 'Typos and flickers, then the page tears and switches off like an old telly. A terminal works through the book line by line, says HELLO ANN, fills a progress bar to 99% and drops it to 1% ("oops."). FATAL ERROR 0x0401 turns into 1 APRIL and the telly comes back on.', 'Green hacker terminal: a login "from the walk-in fridge", the recipes deleted section by section, the prep list "translated to pig latin", "blaming the fryer", "renaming ann to banana", "your book belongs to the fridge now".', 'Amber "MASCOT-OS": the mascot has taken over. "hiding the good knife", "teaching the mascot to cook: FAILED", "salt replaced with sugar", "installing more mascots". Not a fake book update, so real updates stay trusted.'],
  C: ['Possessed', 'The page stays, but one by one every word turns on them. Then a colour split, the mascot breaks loose and grows, letters melt, strips tear, a colour wheel swirls, one slow inversion, and the page turns upside down. A tapped piece runs away.', 'Puns: "Your sentence: Pants", "Your breakdown: Never", "Prep by sedation", tabs Regrets, Perp, Disorders, Wasted, Trespass, Screaming.', 'Every word becomes their name: every section, everyone on with them, every tab, the date and the clock.'],
  D: ['Ransom note', 'Letters quietly go missing from words. Then a paper note slides in and letters fly out of the page one by one into it, cut-out style, in five different papers. It is signed THE KITCHEN GANG, which turns into 1 APRIL, and the letters go home.', '"WE HAVE YOUR SAUCES, ANN. LEAVE 1 KG OF BUTTER AT THE PASS. OR NO GRAVY."', '"WE TOOK YOUR VOWELS, ANN. SAY CHEESE TO GET THEM BACK."'],
  E: ['Hungry mascot', 'He looks away twice, says he is hungry, climbs out of his bubble and eats Home one card at a time, growing with every bite. Then he comes for the screen: "you\'re next." Burp. Then he gives it all back.', 'Bites: "nom.", "crunchy.", "needs salt.", "the clock was chewy." Ends "it was a snack."', 'Bites: "the prep list: chewy.", "your break: too short.", "the team: spicy." Ends "only joking."'],
  F: ['Code rain', 'A letter drips out of a word now and then. Then whole words drain down the screen as falling characters, the page goes dark, and the rain fills the screen until their name lights up in it.', 'Cyan rain; the name, then "WAKE UP, ANN" turns into 1 APRIL.', 'Amber rain: "WHERE IS THE BOOK, ANN?", then "IT IS IN THE RAIN" turns into 1 APRIL.'],
  G: ['Black hole', 'A dot appears on Your day and grows into a black hole with a burning ring. It pulls in the tabs, the top bar, every card, the welcome and last of all the mascot, while their name orbits it. Then it swallows the screen, and spits everything back.', '"everything is in here now." NO SIGNAL turns into 1 APRIL.', '"the prep list is past the event horizon." NO WAY BACK turns into 1 APRIL.'],
  H: ['Gravity', 'Everything drifts up a few pixels. Then the cards, the welcome and the tabs fall up and pile under the top bar. A note at the bottom talks to them, the page turns upside down, and everything floats.', '"turn your phone over, ann." then "better?" UP IS DOWN.', '"gravity has been switched off." "please hold on to the bench." ZERO G.'],
  I: ['Endless Home', 'His welcome turns into "hello ann." Then the page zooms into a smaller Home, with a smaller Home inside that, faster and faster, forever. Taps make it faster. Then dark, and LEVEL 401 turns into 1 APRIL.', 'Zooms into the KB logo: "you went too deep, ann."', 'Zooms into the mascot: "you are inside the mascot now, ann."'],
  J: ['Dust', 'A corner of the top bar crumbles. Then the top bar, the welcome, every card and the tabs blow away like dust, letters first, to a black screen and a blinking cursor. WINDY DAY turns into 1 APRIL and the dust blows back.', '"ann? are you still there? the wind took the book."', '"ann, the book blew away. it is somewhere near the bins."'],
  K: ['Talks back', 'Nothing falls. The mascot keeps talking, more and more unhinged, and the cards turn their backs on them one by one. Every tap gets a reply ("Rude.", "Wet hands!"). The gentlest of the twelve.', '"I know what you did to the jus." "It\'s just you and me now. Forever."', '"Can I tell you a secret?" "The fridge told me everything." "The tabs have gone on strike."'],
  L: ['Melt', 'One card starts to sag. Then the whole page melts like wax in strips, the heat rises from the bottom, and it all drips into a puddle. Taps make a strip melt faster.', '"too hot, ann." 401 DEGREES turns into 1 APRIL.', '"who left the book on the stove?" MEDIUM WELL turns into 1 APRIL.']
};
const TEAM = ['Ann', 'Sam', 'Bo', 'Fay', 'Finn', 'Jo', 'Kit', 'Lee', 'Max', 'Ned', 'Ola', 'Pia', 'Ravi', 'Sol', 'Tui', 'Uma'];

const page = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>April Fools options</title>
<style>
:root { --bg: #EDE6D8; --ink: #1C1D1F; --soft: #4A4740; --card: #FBF8F1; --line: #1C1D1F; --accent: #C2451A; --on: #1C1D1F; --on-ink: #fff; --ok: #2F6B3A; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #161615; --ink: #F1EEE7; --soft: #BDB8AE; --card: #22211F; --line: #4A4843; --accent: #FF9C6E; --on: #F1EEE7; --on-ink: #161615; --ok: #8FD49B; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #161615; --ink: #F1EEE7; --soft: #BDB8AE; --card: #22211F; --line: #4A4843; --accent: #FF9C6E; --on: #F1EEE7; --on-ink: #161615; --ok: #8FD49B; color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 16px; max-width: 1240px; margin: 0 auto; }
@media (min-width: 960px) { .wrap { grid-template-columns: minmax(0, 1fr) 410px; align-items: start; padding: 24px; } .stage { position: sticky; top: 16px; } }
h1 { margin: 0 0 4px; font-size: 22px; line-height: 1.2; }
h2 { margin: 18px 0 6px; font-size: 17px; }
.lede { margin: 0 0 12px; color: var(--soft); font-size: 15px; }
.picks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
@media (min-width: 600px) { .picks { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
button { font-family: inherit; color: var(--ink); }
.picks button, .seg button { min-height: 44px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--card); font-size: 14px; font-weight: 700; line-height: 1.1; cursor: pointer; padding: 4px; }
.picks button small { display: block; font-weight: 500; font-size: 12px; margin-top: 2px; }
.picks button[aria-pressed="true"], .seg button[aria-pressed="true"] { background: var(--on); color: var(--on-ink); border-color: var(--on); }
.row { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; margin: 10px 0; font-size: 15px; }
.seg { display: inline-flex; gap: 4px; }
.seg button { padding: 0 12px; font-weight: 600; }
.row input[type=text] { width: 9.5em; min-height: 44px; padding: 6px 10px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); font: inherit; }
.row label { display: inline-flex; gap: 8px; align-items: center; min-height: 44px; }
.row input[type=checkbox] { width: 22px; height: 22px; }
.again { min-height: 44px; padding: 0 14px; border: 1.5px solid var(--line); border-radius: 8px; background: transparent; font-weight: 600; font-size: 15px; cursor: pointer; }
.say { background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 15px; }
.say b { display: block; font-size: 16px; margin-bottom: 4px; }
.say p { margin: 0 0 6px; }
.say .v { color: var(--soft); }
table { width: 100%; border-collapse: collapse; font-size: 14px; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; overflow: hidden; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid color-mix(in srgb, var(--line) 25%, transparent); }
th { font-size: 13px; color: var(--soft); font-weight: 600; }
td button { min-height: 36px; border: 0; background: transparent; font-weight: 700; font-size: 14px; text-decoration: underline; cursor: pointer; padding: 0; }
.checks { margin: 8px 0 0; padding: 0; list-style: none; font-size: 14px; }
.checks li::before { content: '✓ '; color: var(--ok); font-weight: 700; }
.checks li.bad::before { content: '✗ '; color: var(--accent); }
.note { color: var(--soft); font-size: 13px; margin: 10px 0 0; }
.stage { display: grid; justify-items: center; }
.phone { width: 410px; height: 864px; border: 10px solid #111; border-radius: 34px; overflow: hidden; background: #111; transform-origin: top center; box-shadow: 0 12px 40px rgba(0,0,0,.25); }
.phone iframe { display: block; width: 390px; height: 844px; border: 0; background: #C9B48F; }
@media (max-width: 599px) {
  .wrap { padding: 12px 16px 0; gap: 10px; }
  .stage { margin: 0 -16px; }
  .phone { width: 100vw; height: 100dvh; border: 0; border-radius: 0; box-shadow: none; }
  .phone iframe { width: 100%; height: 100%; }
}
</style>
</head>
<body>
<div class="wrap">
  <section aria-labelledby="h">
    <h1 id="h">April Fools on Home</h1>
    <p class="lede">Twelve jokes, each in two versions: 24 in all, so nobody on the team gets the same one, this year or the next. Each plays on a copy of the real Home with made-up people and uses that person's own day from it: their section, shift, break, who they are on with and the prep count. Nothing real is touched. Each runs for 35 seconds. Taps make it worse. Press and hold anywhere to stop it.</p>
    <div class="picks" role="group" aria-label="Design">
      ${Object.entries(SAY).map(([k, v]) => `<button type="button" data-d="${k}" aria-pressed="false">${k}<small>${v[0]}</small></button>`).join('')}
    </div>
    <div class="row">
      <span class="seg" role="group" aria-label="Version"><button type="button" data-v="1" aria-pressed="true">Version 1</button><button type="button" data-v="2" aria-pressed="false">Version 2</button></span>
      <span class="seg" role="group" aria-label="Length"><button type="button" data-k="35" aria-pressed="true">35 s, as chosen</button><button type="button" data-k="15" aria-pressed="false">Quick look, 15 s</button></span>
    </div>
    <div class="row">
      <label>Name <input type="text" id="nm" value="Ann" maxlength="40" autocomplete="off"></label>
      <label><input type="checkbox" id="rm"> Reduced motion</label>
      <button type="button" class="again" id="again">Play again</button>
    </div>
    <div class="say" id="say" aria-live="polite"><b>Pick a design</b><p>It plays for 35 seconds, then the mascot owns up.</p></div>
    <h2>Who gets which</h2>
    <div class="row"><label>Year <select id="yr">${[2027, 2028, 2029, 2030, 2031].map(y => `<option>${y}</option>`).join('')}</select></label></div>
    <table id="deal"><thead><tr><th scope="col">Person</th><th scope="col" id="th-now">This year</th><th scope="col" id="th-last">Last year</th></tr></thead><tbody></tbody></table>
    <ul class="checks" id="checks"></ul>
    <p class="note">Worked out on every phone from the staff list, with no reads and nothing saved: each person keeps a place from their staff id, and moves five jokes along each year. 24 jokes cover a team of up to 24. Made-up names. Tap a name to play their joke. Preview only: Home from the click-test stand-in (commit 4eca7f4). Brief: docs/april-fools-options/brief.md.</p>
  </section>
  <div class="stage"><div class="phone" id="phone"><iframe id="f" title="Home on 1 April, preview"></iframe></div></div>
</div>
<script>
(function () {
  var SNAP = ${JSON.stringify(html).replace(/</g, '\\u003c')};
  var SAY = ${JSON.stringify(SAY).replace(/</g, '\\u003c')};
  var TEAM = ${JSON.stringify(TEAM)};
  var f = document.getElementById('f'), nm = document.getElementById('nm'), rm = document.getElementById('rm'), say = document.getElementById('say'), yr = document.getElementById('yr');
  var cur = null, ver = 1, len = 35, queued = null;
  function pressed(sel, attr, val) { document.querySelectorAll(sel).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(val))); }); }
  function fit() {
    var p = document.getElementById('phone');
    if (innerWidth < 600) { p.style.transform = ''; p.parentNode.style.height = ''; return; }
    var k = Math.min(1, (innerHeight - 32) / 864);
    p.style.transform = 'scale(' + k + ')'; p.parentNode.style.height = (864 * k) + 'px';
  }
  function load(then) { queued = then || null; f.srcdoc = SNAP; }
  f.addEventListener('load', function () {
    try { f.contentWindow.SETNAME(nm.value); } catch (e) {}
    drawDeal();
    if (queued) { var q = queued; queued = null; setTimeout(q, 500); }
  });
  function describe() {
    say.innerHTML = '';
    if (!cur) return;
    var s = SAY[cur], b = document.createElement('b'), p = document.createElement('p'), v = document.createElement('p'), h = document.createElement('p');
    b.textContent = cur + ' · ' + s[0] + ', version ' + ver + ', ' + len + ' seconds';
    p.textContent = s[1];
    v.className = 'v'; v.textContent = 'Version ' + ver + ': ' + s[1 + ver];
    h.className = 'v'; h.textContent = rm.checked ? 'Reduced motion: no copy and no movement. The mascot only says "April Fools".' : 'Taps break the piece under the finger a little more. Press and hold anywhere for about a second to stop it. "Press and hold to stop" shows after three taps or a quarter of the way in.';
    say.append(b, p, v, h);
  }
  function play(d) {
    if (d) cur = d;
    if (!cur) return;
    pressed('.picks button', 'data-d', cur);
    describe();
    if (innerWidth < 960) document.getElementById('phone').scrollIntoView({ behavior: 'smooth', block: 'start' });
    var c = cur;
    load(function () { f.contentWindow.FOOLS.play(c, { name: nm.value, version: ver, length: len, reduced: rm.checked, force: !rm.checked }); try { f.contentWindow.focus(); } catch (e) {} });
  }
  function drawDeal() {
    var F = f.contentWindow && f.contentWindow.FOOLS;
    if (!F) return;
    var y = +yr.value, ids = TEAM.map(function (n) { return n.toLowerCase(); });
    var now = F.deal(ids, y), last = F.deal(ids, y - 1), body = document.querySelector('#deal tbody'), seen = {}, same = 0;
    document.getElementById('th-now').textContent = y; document.getElementById('th-last').textContent = y - 1;
    body.innerHTML = '';
    TEAM.forEach(function (n) {
      var id = n.toLowerCase(), a = now[id], b = last[id], tr = document.createElement('tr');
      var td0 = document.createElement('td'), bt = document.createElement('button'); bt.type = 'button'; bt.textContent = n;
      bt.addEventListener('click', function () { nm.value = n; ver = a.version; pressed('.seg button[data-v]', 'data-v', ver); play(a.design); });
      td0.appendChild(bt);
      var t1 = document.createElement('td'); t1.textContent = a.design + ' ' + SAY[a.design][0] + ', v' + a.version;
      var t2 = document.createElement('td'); t2.textContent = b.design + ' ' + SAY[b.design][0] + ', v' + b.version;
      tr.append(td0, t1, t2); body.appendChild(tr);
      seen[a.slot] = (seen[a.slot] || 0) + 1;
      if (a.design === b.design) same++;
    });
    var dup = Object.keys(seen).filter(function (k) { return seen[k] > 1; }).length, ck = document.getElementById('checks');
    ck.innerHTML = '';
    [[dup === 0, TEAM.length + ' people, ' + Object.keys(seen).length + ' different jokes in ' + y + '.'], [same === 0, same ? same + ' people get the same design as last year.' : 'Nobody gets the same design as in ' + (y - 1) + '.']].forEach(function (c) { var li = document.createElement('li'); li.textContent = c[1]; if (!c[0]) li.className = 'bad'; ck.appendChild(li); });
  }
  document.querySelectorAll('.picks button').forEach(function (b) { b.addEventListener('click', function () { play(b.dataset.d); }); });
  document.querySelectorAll('.seg button[data-v]').forEach(function (b) { b.addEventListener('click', function () { ver = +b.dataset.v; pressed('.seg button[data-v]', 'data-v', ver); if (cur) play(); }); });
  document.querySelectorAll('.seg button[data-k]').forEach(function (b) { b.addEventListener('click', function () { len = +b.dataset.k; pressed('.seg button[data-k]', 'data-k', len); if (cur) play(); }); });
  document.getElementById('again').addEventListener('click', function () { play(); });
  rm.addEventListener('change', describe);
  yr.addEventListener('change', drawDeal);
  nm.addEventListener('change', function () { try { f.contentWindow.SETNAME(nm.value); } catch (e) {} });
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) { rm.checked = true; var tip = document.createElement('p'); tip.className = 'note'; tip.textContent = 'Your device asks for less motion, so Reduced motion is ticked. Untick it to watch the jokes move.'; rm.closest('.row').after(tip); } } catch (e) {}
  addEventListener('resize', fit); fit(); load();
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(HERE, 'index.html'), page);
// ARTIFACT=<file>: the same page as a claude.ai page body (its skeleton adds doctype, head and body), for the
// head chef to open on a phone. Kept out of the repo.
if (process.env.ARTIFACT) {
  const head = page.slice(page.indexOf('<title>'), page.indexOf('</head>')), body = page.slice(page.indexOf('<body>') + 6, page.lastIndexOf('</body>'));
  fs.writeFileSync(process.env.ARTIFACT, head.replace(/<meta [^>]*>\n?/g, '') + body);
}
console.log('wrote', path.join(HERE, 'index.html'), Math.round(page.length / 1024) + ' KB');
