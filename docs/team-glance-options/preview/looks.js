// Review-only: two looks for design A (Team page, words first), drawn over the real book with the real Barlow fonts.
// Stand-in data and made-up cooks. Nothing here is in the book.
const T = process.argv[3], L = require(T + '/lib'), fs = require('fs'), OUT = process.argv[2];
const FONTS = '/tmp/claude-0/-home-user-leichhardt-kitchen/abb9ab05-10b4-502c-8439-edf899bdd677/scratchpad/desk/fonts/';
const fontCss = [['Barlow', 400, 'barlow-400.ttf'], ['Barlow', 600, 'barlow-600.ttf'], ['Barlow', 700, 'barlow-700.ttf'], ['Barlow Condensed', 700, 'barlow-condensed-700.ttf']]
  .map(([f, w, file]) => `@font-face{font-family:'${f}';font-weight:${w};src:url(data:font/ttf;base64,${fs.readFileSync(FONTS + file).toString('base64')}) format('truetype')}`).join('\n');
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, dayN = n => L.ymd(new Date(L.NOW - n * DAY));
const sh = [];
for (let i = 1; i <= 30; i++) sh.push({ day: dayN(i), s: [{ p: 'ann', sec: i % 4 === 1 ? 'Pans' : 'Larder', sh: 'lunch' }, { p: 'sam', sec: 'Grill', sh: 'lunch' }, { p: 'bo', sec: i % 3 ? 'Sauce' : 'Grill', sh: 'dinner' }] });
const extra = { [path('teamsum', 'main')]: { v: 1, at: L.NOW, day: dayN(0), from: dayN(30), to: dayN(1), days: sh, usual: {}, learn: {} } };
extra[path('config', 'main')] = { ...L.seed()[path('config', 'main')], kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'larder', name: 'Larder' }, { id: 'sauce', name: 'Sauce' }, { id: 'pans', name: 'Pans' }] };

const ITEMS = [
  { tag: 'Few cooks, last 30 days', big: 'Sauce', h: 'Only Bo worked Sauce', p: '20 shifts. Ann and Sam had no Sauce shifts.', n: '1 cook', link: 'See the table' },
  { tag: 'Few cooks, last 30 days', big: 'Pans', h: 'Only Ann worked Pans', p: '8 shifts. Bo and Sam had no Pans shifts.', n: '1 cook', link: 'See the table' },
  { tag: 'One section, last 30 days', big: 'Sam', h: 'Sam was on Grill every shift', p: '30 of 30 shifts on Grill.', n: '30 of 30', link: 'See the table' },
  { tag: 'Standing order?, last 14 days', big: 'Milk', h: 'Milk was ordered on 4 days', p: 'On the order list 4 days in the last 14. A standing order with the supplier saves writing it each time.', n: '4 of 14 days', link: 'See the order list' }
];
const STATUS = 'Shift counts to Wed 11 Nov, from the nightly run. A count of shifts is activity, not a sign someone can run a section alone.';

function cards() {   // S1: the Dashboard's own headline form ("What changed"), here as "At a glance"
  return '<section class="dsh-heads pv-s" aria-label="At a glance" style="margin:0 0 1.6rem"><h3 class="a-ch-h dsh-h">At a glance</h3><p class="hint" style="margin:0 0 .6rem">' + STATUS + '</p><div class="dsh-head-list">' +
    ITEMS.map(x => '<article class="dsh-head"><p class="dsh-tag">' + x.tag + '</p><h4>' + x.h + '</h4><p>' + x.p + '</p><button type="button" class="dsh-more">' + x.link + '</button></article>').join('') + '</div></section>';
}
function ledger() {  // S2: a ledger, the name large in the book's condensed type, the sentence beside it, the count at the end
  const row = x => '<li style="display:grid;grid-template-columns:minmax(5.5rem,auto) 1fr auto;gap:.2rem 1.2rem;align-items:baseline;padding:.75rem 0;border-top:1px solid var(--line)">' +
    '<span style="font:700 1.6rem/1 var(--display);letter-spacing:.01em">' + x.big + '</span>' +
    '<span><span class="dsh-tag" style="display:block;margin-bottom:.15rem">' + x.tag + '</span><span style="font-weight:600">' + x.h + '.</span> <span style="color:var(--muted)">' + x.p + '</span></span>' +
    '<span style="font:700 1rem/1 var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap">' + x.n + '</span></li>';
  return '<section class="pv-s" aria-label="At a glance" style="margin:0 0 1.6rem;border-top:2px solid var(--ink);padding-top:.9rem"><h3 class="a-ch-h dsh-h">At a glance</h3><p class="hint" style="margin:0 0 .4rem">' + STATUS + '</p>' +
    '<ul style="list-style:none;margin:0;padding:0;border-bottom:1px solid var(--line)">' + ITEMS.map(row).join('') + '</ul></section>';
}
(async () => {
  const b = await L.start();
  for (const [name, html] of [['S1-cards', cards()], ['S2-ledger', ledger()]]) for (const [w, h] of [[1280, 900], [390, 844]]) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', adminPage: 'team', width: w, height: h, extra, wait: 2200 });
    await p.addStyleTag({ content: fontCss }); await p.evaluate(() => document.fonts.ready);
    await L.waitFor(p, () => !!document.querySelector('.sk-shifts'), null, 8000); await L.settle(p, 800);
    await p.evaluate((html) => {
      const pane = document.querySelector('.a-pane'), first = [...pane.querySelectorAll('h3.a-ch-h')].find(h => h.textContent === 'Who has worked where');
      first.insertAdjacentHTML('beforebegin', html);
      [...pane.querySelectorAll('h3.a-ch-h')].filter(h => !h.closest('.pv-s') && /Sections few people worked lately|Mostly on one section|Standing order candidates/.test(h.textContent)).forEach(h => { let n = h.nextElementSibling; while (n && n.tagName !== 'H3') { const x = n.nextElementSibling; n.remove(); n = x; } h.remove(); });
    }, html);
    await L.settle(p, 400);
    const box = await p.evaluate(() => { const r = document.querySelector('.pv-s').getBoundingClientRect(); return [Math.round(r.top + scrollY), Math.round(r.height)]; });
    await p.evaluate(top => window.scrollTo(0, Math.max(0, top - 140)), box[0]); await L.settle(p, 300);
    await p.screenshot({ path: OUT + '/' + name + '-' + w + '.png' });
    console.log(name, w, 'box top and height', box.join(' '), 'sideways', await L.overflow(p));
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
