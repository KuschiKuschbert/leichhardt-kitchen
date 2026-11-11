// Pictures of the built At a glance (Implemented app, stand-in data, made-up cooks, real Barlow fonts)
const T = process.argv[3], L = require(T + '/lib'), fs = require('fs'), OUT = process.argv[2];
const FONTS = '/tmp/claude-0/-home-user-leichhardt-kitchen/abb9ab05-10b4-502c-8439-edf899bdd677/scratchpad/desk/fonts/';
const fontCss = [['Barlow', 400, 'barlow-400.ttf'], ['Barlow', 600, 'barlow-600.ttf'], ['Barlow', 700, 'barlow-700.ttf'], ['Barlow Condensed', 700, 'barlow-condensed-700.ttf']]
  .map(([f, w, file]) => `@font-face{font-family:'${f}';font-weight:${w};src:url(data:font/ttf;base64,${fs.readFileSync(FONTS + file).toString('base64')}) format('truetype')}`).join('\n');
const path = (...p) => ['kitchens', L.PIN, ...p].join('/'), DAY = 86400000, dayN = n => L.ymd(new Date(L.NOW - n * DAY));
function ex(lastDay) {
  const days = [];
  for (let i = lastDay; i <= 30; i++) days.push({ day: dayN(i), s: [{ p: 'ann', sec: i % 4 === 1 ? 'Pans' : 'Larder', sh: 'lunch' }, { p: 'sam', sec: 'Grill', sh: 'lunch' }, { p: 'bo', sec: i % 3 ? 'Sauce' : 'Grill', sh: 'dinner' }] });
  const x = { [path('teamsum', 'main')]: { v: 1, day: dayN(lastDay - 1), from: dayN(30), to: dayN(lastDay), days, usual: {} } };
  x[path('config', 'main')] = { ...L.seed()[path('config', 'main')], kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'larder', name: 'Larder' }, { id: 'sauce', name: 'Sauce' }, { id: 'pans', name: 'Pans' }] };
  [1, 2, 3, 5].forEach((n, i) => { x[path('orders', dayN(n), 'lines', 'm' + i)] = { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - n * DAY, ordered: false, deleted: false }; });
  return x;
}
(async () => {
  const b = await L.start();
  for (const [name, w, h, last] of [['built-1280', 1280, 900, 1], ['built-390', 390, 844, 1], ['built-old-1280', 1280, 900, 4]]) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', adminPage: 'team', width: w, height: h, extra: ex(last), wait: 2200 });
    await p.addStyleTag({ content: fontCss }); await p.evaluate(() => document.fonts.ready);
    await L.waitFor(p, () => /Milk/.test((document.querySelector('.tm-glance') || {}).textContent || ''), null, 10000); await L.settle(p, 600);
    await p.screenshot({ path: OUT + '/' + name + '-first-screen.png' });
    const top = await p.$eval('.tm-glance-h', e => e.getBoundingClientRect().top + scrollY);
    await p.evaluate(t => scrollTo(0, t - 120), top); await L.settle(p, 300);
    await p.screenshot({ path: OUT + '/' + name + '.png' });
    console.log(name, 'heading at', Math.round(top));
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
