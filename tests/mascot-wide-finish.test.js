// The finished words on a wide screen (owner, 11 Nov 2026; docs/kitchen-mascot.md; docs/mascot-desktop-options/brief.md).
// The kitchen works on a wide screen in every section. From 900 px wide a finished section says so on its own tab,
// where the page said "Nothing left to do in Sauce.": the slip's own sentence, large, with the mascot under his
// words, half size and a still. The finished list's card says it the same way, and only there is he his drawn
// size. Words first: one size of words for both finished states on a screen, then the largest mascot that fits.
// It is the page's state: nothing while a line is left, waiting to be sent or refused, silent wherever the slip's
// sentence is silent, and gone with no signal. Under 900 px the book is as it was. No reads, no control, no line or
// button moved. Synthetic staff only.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
const item = id => key(['days', day, 'items', id]);
// the seed's list: Larder i1 i2 i6, Grill i3 (urgent, so first on the page), Sauce i4 i5
const line = (text, station, o) => Object.assign({ text, station, qty: '', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 3600000, done: false, deleted: false }, o || {});
const ticked = (who, at) => ({ done: true, doneBy: who, doneById: who.toLowerCase(), doneAt: at || L.NOW - 600000, preparedBy: who, preparedById: who.toLowerCase(), preparedAt: at || L.NOW - 600000 });
const open0 = { done: false, doneBy: '', doneById: '', doneAt: 0, preparedBy: '', preparedById: '', preparedAt: 0 };
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));
async function run(p, ms) { await p.clock.runFor(ms); await L.settle(p, 150); }
async function tick(p, id, wait) { await p.click('button.nb-box[data-id="' + id + '"]'); await L.settle(p, wait == null ? 200 : wait); }
const tab = async (p, name) => { await p.click('.nb-tab[data-v="' + name + '"]'); await L.settle(p, 300); };
// another screen's write: the fields change under this page (the rest of the line stays) and its listeners hear
const other = (p, id, data) => p.evaluate(([path, d]) => window.__fake.write(path, Object.assign({}, window.__fake.dump()[path] || {}, d)), [item(id), data]);
const put = (p, id, data) => p.evaluate(([path, d]) => window.__fake.write(path, d), [item(id), data]);
const GREEN = 'rgb(35, 115, 71)', INK = 'rgb(28, 29, 31)';
const lum = c => { const m = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// The art and the file are fetched in real time while the tests' clock only moves timers, so a check on the
// mascot waits for the thing itself: the Welcome pose painted.
const rested = p => L.waitFor(p, () => { const s = window.LK_MASCOT && window.LK_MASCOT.stillState && window.LK_MASCOT.stillState(); return !!s && s.rest === 'rest'; }, null, 6000).catch(() => {});
const view = p => p.evaluate(() => {
  const size = e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const shown = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
  const body = document.querySelector('.nb-left .nb-body'), sec = document.querySelector('.nb-left .nb-fin-sec'), card = document.querySelector('.nb-left .nb-fin:not(.nb-fin-sec)'), el = sec || card;
  const plain = body ? [...body.children].find(e => e.classList.contains('nb-empty') && /^Nothing left to do in /.test(e.textContent)) : null;
  const say = el && el.querySelector('.nb-fin-say'), art = el && el.querySelector('.nb-fin-art'), note = el && el.querySelector('.nb-empty'), t = document.querySelector('.p-toasts .p-toast[data-toast="new"]');
  return {
    sec: !!sec, card: !!card, scene: !!(el && el.classList.contains('nb-scene')), cls: el ? [...el.classList].filter(c => /^nb-(w\d|f\d|noart)/.test(c)).join(' ') : '',
    lines: say ? (say.children.length ? [...say.children].map(e => e.textContent) : [say.textContent]) : [], kids: say ? say.querySelectorAll('*').length : 0,
    font: say ? Math.round(parseFloat(getComputedStyle(say).fontSize)) : 0, inks: say ? (say.children.length ? [...say.children] : [say]).map(e => getComputedStyle(e).color) : [], tint: say ? getComputedStyle(say).backgroundColor : '',
    tail: say ? getComputedStyle(say, '::before').display : '', art: shown(art) ? size(art) : null, hidden: art ? art.getAttribute('aria-hidden') : '',
    sprite: !!(art && art.querySelector('.mascot-still:not([hidden])')), still: window.LK_MASCOT && window.LK_MASCOT.stillState ? window.LK_MASCOT.stillState() : null,
    note: note ? note.textContent : '', noteFont: note ? parseFloat(getComputedStyle(note).fontSize) : 0, plain: plain ? plain.textContent : '', plainShown: shown(plain), plainFont: plain ? parseFloat(getComputedStyle(plain).fontSize) : 0,
    control: !!(el && el.querySelector('button, a, input, [role], [tabindex]')), cursor: el ? getComputedStyle(art || el).cursor : '',
    bodyScroll: body ? body.scrollHeight - body.clientHeight : 0, bottom: el ? Math.round(el.getBoundingClientRect().bottom) : 0, win: innerHeight, wide: document.documentElement.scrollWidth - innerWidth,
    rows: document.querySelectorAll('.nb-left .nb-rows .nb-row').length, slip: t ? [t.querySelector('.p-toast-msg').textContent, t.querySelector('.p-toast-say') ? t.querySelector('.p-toast-say').textContent : ''] : null,
    bad: !!(t && t.classList.contains('p-toast-bad')), live: (document.getElementById('lk-live') || {}).textContent || '', hash: location.hash
  };
});
// every rectangle a cook works with on the prep page, by a stable name
const rects = p => p.evaluate(() => {
  const out = {}, put = (k, e) => { if (e && !e.closest('.nb-fin')) { const x = e.getBoundingClientRect(); out[k] = [Math.round(x.x), Math.round(x.y), Math.round(x.width), Math.round(x.height)]; } };
  document.querySelectorAll('.nb-tab').forEach(e => put('tab:' + e.getAttribute('data-v'), e));
  document.querySelectorAll('.wtop, .nb-left .nb-ph, .nb-right .nb-ph, .nb-prog, .nb-addline, .nb-book, .nb-left .nb-foot, .p-badges').forEach((e, i) => put('part:' + e.className.split(' ')[0] + i, e));
  document.querySelectorAll('.nb-right .nb-body > *, .nb-right button, .nb-right a').forEach((e, i) => put('handy:' + i, e));
  return out;
});
const same = (a, b) => Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).concat(Object.keys(b).filter(k => !(k in a)));

(async () => {
  const b = await L.start(); let p = null;
  async function open(o = {}) {
    p = await L.open(b, '#/prep', { who: 'ann', width: 1920, height: 1080, wait: 1200, ...o });
    p.__art = []; p.on('request', r => { if (/art\/mascot\/|js\/mascot\.js/.test(r.url())) p.__art.push(r.url().replace(/^.*\/(art|js)\//, '$1/')); });
    await L.waitFor(p, () => !!document.querySelector('.nb-left .nb-prog'), null, 6000);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }
  // On the Sauce tab with Sauce's first line ticked and its slip gone: the next tick is the one that finishes Sauce
  async function ready(o) { await open(o); await tab(p, 'Sauce'); await tick(p, 'i4'); await run(p, 9500); }
  // The tick that finishes Sauce, its slip gone and the ticked line left
  async function finished(o) { await ready(o); await tick(p, 'i5', 500); await run(p, 9500); await rested(p); return view(p); }
  const scene = () => L.waitFor(p, () => !!document.querySelector('.nb-left .nb-fin-sec'), null, 4000).catch(() => {});

  await step('a finished section on its own tab', async () => {
    await ready();
    let v = await view(p);
    ok(!v.sec && !v.card && !v.plain && v.rows === 1, 'a line is left on the tab: no scene, and no plain words yet: ' + JSON.stringify([v.sec, v.rows]));
    const before = p.__art.length;
    await tick(p, 'i5', 600); v = await view(p);
    ok(v.slip && v.slip[1] === 'Sauce is done. Grill has 1 left.', 'the slip keeps its own sentence at this width: ' + JSON.stringify(v.slip));
    ok(!v.sec && v.rows === 1, 'while the ticked line still lingers the page says nothing new: ' + JSON.stringify([v.sec, v.rows]));
    await run(p, 4000); await rested(p); v = await view(p);
    ok(v.sec && v.scene && v.rows === 0, 'the line has left: the finished words stand in the page');
    ok(JSON.stringify(v.lines) === JSON.stringify(['Sauce is done.', 'Grill has 1 left.']), 'the slip\'s own sentence, word for word, on two lines: ' + JSON.stringify(v.lines));
    ok(v.slip && v.slip[1] === v.lines.join(' '), 'the slip and the page say the same thing while both are up: ' + JSON.stringify(v.slip));
    ok(v.font === 40, 'the words are 40 px: ' + v.font);
    ok(v.art && v.art[0] === 96 && v.art[1] === 128, 'he stands under them at 96 x 128 px, half his drawn size: ' + JSON.stringify(v.art));
    ok(v.sprite && v.hidden === 'true', 'the mascot is there, and hidden from a screen reader');
    ok(v.plain && !v.plainShown, 'the plain sentence gives way: ' + JSON.stringify([v.plain.slice(0, 30), v.plainShown]));
    ok(v.note === 'See Done today under Handy.' && v.noteFont === v.plainFont, 'the page\'s pointer stays, at the book\'s own size: ' + JSON.stringify([v.note, v.noteFont, v.plainFont]));
    ok(v.inks[0] === GREEN && v.inks[1] === INK, 'what is done is in the done green, what is left in the page\'s ink: ' + JSON.stringify(v.inks));
    ok(contrast(v.inks[0], v.tint) >= 4.5 && contrast(v.inks[1], v.tint) >= 4.5, 'both read on the tint: ' + contrast(v.inks[0], v.tint).toFixed(1) + ' and ' + contrast(v.inks[1], v.tint).toFixed(1) + ' to 1');
    ok(!v.control && v.cursor !== 'pointer', 'not a control: no button, link or pointer in it');
    ok(v.bodyScroll <= 0 && v.wide <= 0, 'no scroll is added, down or sideways: ' + JSON.stringify([v.bodyScroll, v.wide]));
    ok(v.bottom <= v.win - 80, 'it ends above the slip\'s place: ' + JSON.stringify([v.bottom, v.win]));
    await run(p, 6000); v = await view(p);
    ok(v.sec && !v.slip, 'the slip has gone and the page still says it');
    ok(v.still && v.still.plays === 0, 'a still: nothing played on a section\'s tab: ' + JSON.stringify(v.still));
    const asked = p.__art.slice(before);
    ok(asked.length > 0 && asked.every(u => /mascot\.js|welcome-still/.test(u)), 'his file and his still, and no action sheet: ' + JSON.stringify(asked));
    // nothing a cook works with has moved: the same page with the scene taken away
    const withScene = await rects(p);
    await p.evaluate(() => { const s = document.querySelector('.nb-left .nb-fin-sec'), pl = document.querySelector('.nb-left .nb-empty[data-fin-sec]'); s.style.display = 'none'; pl.style.display = ''; });
    const without = await rects(p), moved = same(without, withScene);
    ok(Object.keys(withScene).length > 8 && !moved.length, 'no tab, header, count, button or Handy line moves for it (' + Object.keys(withScene).length + ' rectangles): ' + moved.join(', '));
    // a tap on him or on the words does nothing
    await p.evaluate(() => window.LK_PREP.toast('Redraw')); await L.settle(p, 300);
    const hash = (await view(p)).hash;
    await p.click('.nb-left .nb-fin-sec .nb-fin-art'); await p.click('.nb-left .nb-fin-sec .nb-fin-say'); await L.settle(p, 300); v = await view(p);
    ok(v.sec && v.hash === hash, 'a tap on him or on the words does nothing: ' + v.hash);
    ok(!(await p.evaluate(() => !!document.querySelector('.sheet, .sheet-bg'))), 'and opens nothing');
  });

  await step('it follows the list', async () => {
    let v = await finished();
    ok(v.sec && v.lines[1] === 'Grill has 1 left.', 'finished: ' + JSON.stringify(v.lines));
    await other(p, 'i3', ticked('Sam')); await L.settle(p, 500); v = await view(p);
    ok(v.sec && JSON.stringify(v.lines) === JSON.stringify(['Sauce is done.', 'Larder has 3 left.']), 'another screen finishes Grill: what is next follows the list: ' + JSON.stringify(v.lines));
    await other(p, 'i1', ticked('Sam')); await L.settle(p, 500); v = await view(p);
    ok(v.sec && v.lines[1] === 'Larder has 2 left.', 'and the count follows it: ' + JSON.stringify(v.lines));
    await put(p, 'i9', line('Blanch beans', 'Sauce')); await L.settle(p, 600); v = await view(p);
    ok(!v.sec && !v.plain && v.rows === 1, 'another screen writes a Sauce line: the scene is gone and the line is there: ' + JSON.stringify([v.sec, v.rows]));
    await tick(p, 'i9', 500); v = await view(p);
    ok(v.slip && v.slip[0] === 'Ticked Blanch beans' && !v.slip[1], 'that line is ticked: the slip stays plain, the section was said today: ' + JSON.stringify(v.slip));
    await run(p, 4000); v = await view(p);
    ok(v.sec && v.lines[0] === 'Sauce is done.', 'and the page says it again, because it is the state: ' + JSON.stringify(v.lines));
    await p.click('.p-toasts .p-toast[data-toast="new"] .p-toast-btn'); await L.settle(p, 500); v = await view(p);
    ok(!v.sec && v.rows === 1, 'Undo takes it back: ' + JSON.stringify([v.sec, v.rows]));
    await run(p, 9500); await tick(p, 'i9', 300); await run(p, 9500); v = await view(p);
    ok(v.sec, 'ticked again: back');
    await other(p, 'i4', open0); await L.settle(p, 500); v = await view(p);
    ok(!v.sec && v.rows === 1, 'another screen unticks a Sauce line: gone: ' + JSON.stringify([v.sec, v.rows]));
  });

  await step('only what the server has', async () => {
    await ready();
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await tick(p, 'i5', 300); await run(p, 4000); let v = await view(p);
    ok(!v.sec && v.plain && v.plainShown && v.rows === 0, 'the last tick is not sent yet: the plain words, no scene: ' + JSON.stringify([v.sec, v.plainShown]));
    await run(p, 9000); v = await view(p);
    ok(!v.sec && v.plainShown, 'and still the plain words while it waits');
    // The real server's answer changes no line, only its Not sent flag, and the page is patched, not drawn
    // (patchOrDraw): the finished words must come with that answer, not at some later draw. __fake.ack() is that
    // answer on its own.
    await p.evaluate(() => { window.__fake.ack(); }); await scene(); await L.settle(p, 300); v = await view(p);
    ok(v.sec && v.lines[0] === 'Sauce is done.', 'they come with the server\'s answer, with no other tap or tick: ' + JSON.stringify(v.lines));
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  });

  await step('a refused tick', async () => {
    await ready();
    await p.evaluate(() => { window.__fake.deny = /\/items\/i5$/; });
    await tick(p, 'i5', 700); await run(p, 4500); const v = await view(p);
    ok(!v.sec && v.rows === 1, 'refused: the line is open again and nothing is said in the page: ' + JSON.stringify([v.sec, v.rows, v.bad]));
    await p.evaluate(() => { window.__fake.deny = null; });
  });

  await step('where the slip is silent, so is the page', async () => {
    // a section of one line is an ordinary tick
    await open(); await tab(p, 'Grill'); await tick(p, 'i3', 400); await run(p, 9500); let v = await view(p);
    ok(!v.sec && v.plainShown && /^Nothing left to do in Grill\./.test(v.plain), 'a section of one line: the plain words: ' + JSON.stringify([v.sec, v.plain.slice(0, 28)]));
    await p.context().close(); p = null;
    // lines are left, but no section can be named for them: "Sauce is done." alone would read as nothing left
    await ready({ extra: { [item('i1')]: line('Slice onions', ''), [item('i2')]: line('Pick coriander', ''), [item('i6')]: line('Wash bok choy', ''), [item('i3')]: line('Portion rump', 'Grill', ticked('Sam')) } });
    await tick(p, 'i5', 500); v = await view(p);
    ok(v.slip && !v.slip[1], 'lines left with no section to name: the slip is plain: ' + JSON.stringify(v.slip));
    await run(p, 9500); v = await view(p);
    ok(!v.sec && v.plainShown, 'and the page keeps its plain words: ' + JSON.stringify([v.sec, v.plainShown]));
    await p.context().close(); p = null;
    // a name the book does not say
    await open({ extra: { [item('i4')]: line('Make gravy', 'Prep', ticked('Sam')), [item('i5')]: line('Laksa', 'Prep') } });
    await tab(p, 'Prep'); await tick(p, 'i5', 400); await run(p, 9500); v = await view(p);
    ok(!v.sec && v.plainShown, 'a section named Prep: the plain words: ' + JSON.stringify([v.sec, v.plainShown]));
  });

  await step('the whole list finished from a section\'s tab', async () => {
    await ready({ extra: { [item('i1')]: line('Slice onions', 'Larder', ticked('Sam')), [item('i2')]: line('Pick coriander', 'Larder', ticked('Sam')), [item('i6')]: line('Wash bok choy', 'Larder', ticked('Sam')), [item('i3')]: line('Portion rump', 'Grill', ticked('Sam')) } });
    await tick(p, 'i5', 500); await run(p, 4000); await rested(p); let v = await view(p);
    ok(v.sec && JSON.stringify(v.lines) === JSON.stringify(['Sauce is done.']), 'nothing is left anywhere: "Sauce is done." stands alone: ' + JSON.stringify(v.lines));
    await run(p, 5000); v = await view(p);
    ok(v.still && v.still.plays === 0, 'he is a still on the tab, even for the tick that finished the list: ' + JSON.stringify(v.still));
    await tab(p, ''); await L.waitFor(p, () => { const s = window.LK_MASCOT.stillState(); return !!s && s.plays === 1; }, null, 6000).catch(() => {}); v = await view(p);
    ok(v.card && v.scene && v.lines[0] === 'Every line ticked. 6 of 6.', 'on the All list the finished list\'s card says it: ' + JSON.stringify(v.lines));
    ok(v.still && v.still.plays === 1, 'and the one Serve play is his there: ' + JSON.stringify(v.still));
    ok(v.font === 40 && v.art && v.art[0] === 192 && v.art[1] === 256, 'the same size of words, and he is his drawn size, 192 x 256 px: ' + JSON.stringify([v.font, v.art]));
    ok(v.inks.length === 1 && v.inks[0] === GREEN, 'all of it is done, so all of it is green: ' + JSON.stringify(v.inks));
    ok(v.note === 'See Done today under Handy.' && v.bodyScroll <= 0 && v.wide <= 0 && v.bottom <= v.win - 80, 'the pointer under him, no scroll, above the slip\'s place: ' + JSON.stringify([v.bodyScroll, v.bottom]));
  });

  await step('no signal', async () => {
    let v = await finished();
    ok(v.sec, 'finished, with the signal there');
    await p.context().setOffline(true); await L.settle(p, 600); v = await view(p);
    ok(!v.sec && v.plainShown, 'the signal drops: the finished words give way to the plain ones: ' + JSON.stringify([v.sec, v.plainShown]));
    await p.evaluate(() => window.LK_PREP.toast('Redraw')); await L.settle(p, 300); v = await view(p);
    ok(!v.sec && v.plainShown, 'and a redraw does not bring them back');
    await p.context().setOffline(false); await scene(); await L.settle(p, 300); v = await view(p);
    ok(v.sec && v.lines[0] === 'Sauce is done.', 'the signal is back: so are they: ' + JSON.stringify(v.lines));
  });

  await step('his file or his art does not load', async () => {
    await open(); await p.context().route(/js\/mascot\.js/, r => r.abort());
    await tab(p, 'Sauce'); await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 500); await run(p, 9500);
    for (let i = 0; i < 3; i++) { await p.evaluate(i => window.LK_PREP.toast('Redraw ' + i), i); await L.settle(p, 200); }
    let v = await view(p);
    ok(v.sec && v.font === 40 && v.lines.join(' ') === 'Sauce is done. Grill has 1 left.', 'his file cannot load: the words stand all the same: ' + JSON.stringify([v.sec, v.font, v.lines]));
    ok(!v.art && v.tail === 'none', 'alone, with no empty room where he would be and no tail: ' + JSON.stringify([v.art, v.tail, v.cls]));
    ok(p.__art.filter(u => /mascot\.js/.test(u)).length === 2, 'one try at his file (a fetch and a script tag), not one on every redraw: ' + p.__art.length);
    await p.context().close(); p = null;
    await open(); await p.context().route(/art\/mascot\//, r => r.abort());
    await tab(p, 'Sauce'); await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 500); await run(p, 9500);
    await L.waitFor(p, () => !!document.querySelector('.nb-fin-sec .mascot-still[hidden]'), null, 6000).catch(() => {}); v = await view(p);
    ok(v.sec && v.font === 40 && !v.art && v.tail === 'none', 'his art cannot load: the words alone, no empty room, no tail: ' + JSON.stringify([v.font, v.art, v.tail]));
  });

  await step('reduced motion', async () => {
    await open(); await p.emulateMedia({ reducedMotion: 'reduce' });
    await tab(p, 'Sauce'); await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 500); await run(p, 9500); await rested(p); const v = await view(p);
    ok(v.sec && v.font === 40 && v.sprite && v.still && v.still.plays === 0, 'reduced motion: the words and a still: ' + JSON.stringify([v.font, v.sprite, v.still && v.still.plays]));
  });

  await step('words first, at every size', async () => {
    // [width, height, the words, the mascot on a section's tab, the mascot under the finished list]. Where the size
    // turns on how wide the stand-in fonts are, only what holds in any font is checked; 1920 x 1080 has room to spare.
    const sizes = [[1920, 1080, 40, [96, 128], [192, 256]], [1280, 900, 40, [96, 128], null], [1280, 720, 40, null, null], [1366, 768, 40, null, null], [1024, 768, 28, null, null], [900, 1000, 28, [96, 128], null]];
    for (const [w, h, font, onTab, onList] of sizes) {
      const at = w + ' x ' + h;
      await ready({ width: w, height: h }); await tick(p, 'i5', 500); await run(p, 9500); await rested(p); const s = await view(p);
      ok(s.sec && s.font === font, at + ': a finished section in ' + font + ' px words: ' + JSON.stringify([s.sec, s.font]));
      ok(!s.art || (s.art[0] === 96 && s.art[1] === 128), at + ': he is 96 x 128 px there or not there, never bigger: ' + JSON.stringify(s.art));
      if (onTab) ok(s.art && s.art[0] === onTab[0], at + ': and there is room for him: ' + JSON.stringify(s.art));
      ok(s.bodyScroll <= 0 && s.wide <= 0 && s.bottom <= s.win - 80, at + ': no scroll, and it ends above the slip\'s place: ' + JSON.stringify([s.bodyScroll, s.wide, s.bottom, s.win]));
      await tab(p, ''); for (const id of ['i3', 'i1', 'i2']) { await tick(p, id); } await run(p, 9500); await tick(p, 'i6', 500); await run(p, 9500); await rested(p); const l = await view(p);
      ok(l.card && l.scene && l.font === s.font, at + ': the finished list in the same size of words: ' + JSON.stringify([l.scene, l.font, s.font]));
      ok(!l.art || [192, 96, 64].indexOf(l.art[0]) >= 0, at + ': he is 192, 96 or 64 px wide there, or not there: ' + JSON.stringify(l.art));
      if (onList) ok(l.art && l.art[0] === onList[0] && l.art[1] === onList[1], at + ': his drawn size: ' + JSON.stringify(l.art));
      ok(l.bodyScroll <= 0 && l.wide <= 0, at + ': no scroll on the finished list: ' + JSON.stringify([l.bodyScroll, l.wide]));
      ok(!realErrors(p).length, at + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null;
    }
  });

  await step('no room: the book as it was', async () => {
    await ready({ width: 1280, height: 520 }); await tick(p, 'i5', 500); await run(p, 9500); let v = await view(p);
    ok(!v.sec && v.plainShown, 'a window too short for the large words: the tab keeps its plain words: ' + JSON.stringify([v.sec, v.plainShown]));
    await tab(p, ''); for (const id of ['i3', 'i1', 'i2']) { await tick(p, id); } await run(p, 9500); await tick(p, 'i6', 500); await run(p, 9500); v = await view(p);
    ok(v.card && !v.scene && v.font === 16 && v.art && v.art[0] === 64, 'and the finished list keeps the small card: ' + JSON.stringify([v.scene, v.font, v.art]));
  });

  await step('Extra large text', async () => {
    await ready({ settings: { text: 'xlarge' } }); await tick(p, 'i5', 500); await run(p, 9500); await rested(p); const v = await view(p);
    ok(v.sec && v.font === 50 && v.art && v.art[0] === 96, 'the words follow the text size, 50 px, and he stays 96 px: ' + JSON.stringify([v.font, v.art]));
    ok(v.bodyScroll <= 0 && v.wide <= 0, 'no scroll: ' + JSON.stringify([v.bodyScroll, v.wide]));
  });

  await step('long section names', async () => {
    const long = 'Salads and dessert', next = 'Hot larder and pass';
    await open({ extra: { [item('i4')]: line('Make gravy', long), [item('i5')]: line('Laksa', long), [item('i3')]: line('Portion rump', next, { urgent: true }), [item('i7')]: line('Pick herbs', next) } });
    await tab(p, long); await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 500); await run(p, 9500); await rested(p); const v = await view(p);
    ok(v.sec && JSON.stringify(v.lines) === JSON.stringify([long + ' are done.', next + ' have 2 left.']), 'long names, and more than one: ' + JSON.stringify(v.lines));
    ok(v.bodyScroll <= 0 && v.wide <= 0 && v.bottom <= v.win - 80, 'the words wrap inside the page: no scroll, above the slip\'s place: ' + JSON.stringify([v.bodyScroll, v.wide, v.bottom]));
  });

  await step('a section\'s name is words, not markup', async () => {
    const name = '<b>Hot</b> & "cold"';
    await open({ extra: { [item('i4')]: line('Make gravy', name), [item('i5')]: line('Laksa', name) } });
    await tab(p, name.replace(/"/g, '\\"')); await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 500); await run(p, 9500); const v = await view(p);
    // a name that joins two things reads as more than one
    ok(v.sec && v.lines[0] === name + ' are done.' && v.kids === v.lines.length, 'shown as typed, with no markup added: ' + JSON.stringify([v.lines[0], v.kids]));
  });

  await step('a window made narrow and wide again', async () => {
    let v = await finished({ width: 1280, height: 900 });
    ok(v.sec, 'finished at 1280 px');
    await p.setViewportSize({ width: 800, height: 900 }); await L.settle(p, 500); v = await view(p);
    ok(!v.sec && v.plainShown, 'made narrower than 900 px: the plain words: ' + JSON.stringify([v.sec, v.plainShown]));
    await p.setViewportSize({ width: 1280, height: 900 }); await L.settle(p, 500); v = await view(p);
    ok(v.sec && v.sprite, 'wide again: the finished words, and he is back in his place: ' + JSON.stringify([v.sec, v.sprite]));
  });

  await step('an older saved stylesheet', async () => {
    // a saved copy can hold this script with the stylesheet before it: the scene must not show unstyled
    await ready(); await p.addStyleTag({ content: '.nb-fin.nb-scene { display: flex !important; }' });
    await tick(p, 'i5', 500); await run(p, 9500); const v = await view(p);
    ok(!v.sec && v.plainShown, 'the styles do not know the scene: the tab keeps its plain words: ' + JSON.stringify([v.sec, v.plainShown]));
  });

  await step('a tablet and a phone are as they were', async () => {
    for (const [w, h] of [[768, 1024], [390, 844]]) {
      await ready({ width: w, height: h }); const before = p.__art.length;
      await tick(p, 'i5', 500); await run(p, 9500); let v = await view(p);
      ok(!v.sec && v.plainShown && /^Nothing left to do in Sauce\. Ticked lines are under Done today in Handy\.$/.test(v.plain), w + ' px: a finished section keeps its plain words: ' + JSON.stringify([v.sec, v.plain]));
      ok(p.__art.length === before, w + ' px: and nothing of the mascot is asked for there: ' + JSON.stringify(p.__art.slice(before)));
      await tab(p, ''); for (const id of ['i3', 'i1', 'i2']) { await tick(p, id); } await run(p, 9500); await tick(p, 'i6', 500); await run(p, 9500); await rested(p); v = await view(p);
      ok(v.card && !v.scene && v.font === 16 && v.art && v.art[0] === 48 && v.art[1] === 64, w + ' px: the finished list keeps the small card, 48 x 64 px, 16 px words: ' + JSON.stringify([v.scene, v.font, v.art]));
      ok(!realErrors(p).length, w + ' px: no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null;
    }
  });

  await step('a shared kitchen screen', async () => {
    await open({ settings: { shared: true } }); await tab(p, 'Sauce');
    const who = async id => { await p.click('button.nb-box[data-id="' + id + '"]'); await L.waitFor(p, () => !!document.querySelector('[data-pt="choose"][data-id="ann"]'), null, 6000); };
    const name = async () => { await p.click('[data-pt="choose"][data-id="ann"]'); await L.waitFor(p, () => !document.querySelector('[data-pt="choose"]'), null, 8000); await L.settle(p, 500); };
    await who('i4'); await name(); await run(p, 9500);
    await who('i5'); let v = await view(p);
    ok(!v.sec, 'Who did this? is up for the last tick: nothing is said yet');
    await name(); await run(p, 4500); v = await view(p);
    ok(v.sec && v.lines[0] === 'Sauce is done.', 'the name is chosen and the server has it: the finished words: ' + JSON.stringify(v.lines));
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
