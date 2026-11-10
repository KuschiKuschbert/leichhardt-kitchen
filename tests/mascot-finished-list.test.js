// The mascot under a finished prep list (owner, 10 Nov 2026; docs/kitchen-mascot.md). When every line of today's
// own list is ticked and the server has every tick, he stands beside the page's own words: "Every line ticked.
// 6 of 6." It is the list's state: nothing while a line is left, waiting to be sent or refused; Undo takes it
// back; another phone's tick and a reload show it as a still. On the phone whose tick finished the list he plays
// Serve once, after the ticked lines have left, at most once a kitchen day, then rests on the Welcome pose.
// No reads, no control, no moved header. Synthetic staff only.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
const item = id => key(['days', day, 'items', id]);
const ALL = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'];
const without = ids => Object.fromEntries(ids.map(i => [item(i), undefined]));
const doneBy = (x, who) => Object.assign({}, x, { done: true, doneBy: who, doneById: who.toLowerCase(), doneAt: L.NOW - 600000, preparedBy: who, preparedById: who.toLowerCase(), preparedAt: L.NOW - 600000 });
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));
async function run(p, ms) { await p.clock.runFor(ms); await L.settle(p, 150); }
async function tick(p, id, wait) { await p.click('button.nb-box[data-id="' + id + '"]'); await L.settle(p, wait || 200); }
// every line but the last, then long enough for their slips and the 3.5 s linger to pass
async function allBut(p, last) { for (const id of ALL.filter(i => i !== last)) await tick(p, id); await run(p, 9500); }
const view = p => p.evaluate(() => {
  const c = document.querySelector('.nb-fin'), slot = document.querySelector('[data-fin-art]'), r = slot && slot.getBoundingClientRect(), ph = document.querySelector('.nb-left .nb-ph'), h = ph ? ph.getBoundingClientRect() : { x: 0, width: 0, height: 0 };
  return { card: !!c, say: c ? c.querySelector('.nb-fin-say').textContent : '', book: [...document.querySelectorAll('.nb-left .nb-empty')].map(e => e.textContent), control: !!(c && c.querySelector('button, a, input, [role], [tabindex]')),
    slot: r ? [Math.round(r.width), Math.round(r.height)] : null, cardH: c ? Math.round(c.getBoundingClientRect().height) : 0, hidden: slot ? slot.getAttribute('aria-hidden') : '', sprite: !!(slot && slot.querySelector('.mascot-still:not([hidden])')),
    still: window.LK_MASCOT && window.LK_MASCOT.stillState ? window.LK_MASCOT.stillState() : null, rows: document.querySelectorAll('.nb-left .nb-rows .nb-row').length,
    header: [Math.round(h.x), Math.round(h.width), Math.round(h.height)], slip: document.querySelector('.p-toasts .p-toast[data-toast="new"] .p-toast-msg')?.textContent || '', stamp: localStorage.getItem('lk.mascot.fin'), mascotButton: !!document.querySelector('.mascot') };
});

(async () => {
  const b = await L.start(); let p = null;
  async function open(o = {}) {
    p = await L.open(b, '#/prep', { who: 'ann', width: 390, height: 844, wait: 1200, ...o });
    p.__art = []; p.on('request', r => { if (/art\/mascot\/|js\/mascot\.js/.test(r.url())) p.__art.push(r.url().replace(/^.*\/(art|js)\//, '$1/')); });
    await L.waitFor(p, () => !!document.querySelector('.nb-left .nb-prog'), null, 6000);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }

  await step('the finishing tick', async () => {
    await open(); const header = (await view(p)).header;
    await allBut(p, 'i6'); let v = await view(p);
    ok(!v.card && !v.still && !p.__art.length, 'five of six ticked: no card, and the mascot file and art are not fetched: ' + p.__art.join(','));
    const bill = await p.evaluate(() => window.__fake.bill.length);
    await tick(p, 'i6', 600); v = await view(p);
    ok(v.card && v.say === 'Every line ticked. 6 of 6.', 'the last tick shows the card with the count: ' + v.say);
    ok(v.book.length === 1 && v.book[0] === 'See Done today under Handy.', 'the finish is said once, and the page keeps its own pointer to Done today: ' + JSON.stringify(v.book));
    ok(v.slip === 'Ticked Wash bok choy', 'the slip is today\'s: ' + v.slip);
    ok(!v.control && v.hidden === 'true' && !v.mascotButton, 'not a control: no button, link or role in the card, and the art is hidden from screen readers');
    ok(v.slot && v.slot[0] === 48 && v.slot[1] === 64, 'the mascot is 48 x 64 px on a phone: ' + JSON.stringify(v.slot));
    ok(JSON.stringify(v.header) === JSON.stringify(header), 'the notebook header keeps its place and height: ' + JSON.stringify([header, v.header]));
    ok(v.sprite && v.still && v.still.rest === 'rest' && v.still.plays === 0 && v.rows === 1, 'while the ticked line lingers he rests on the Welcome pose: ' + JSON.stringify(v.still));
    await run(p, 3700); v = await view(p);
    ok(v.rows === 0 && v.still.playing && v.still.clip === 'burger' && v.still.plays === 1, 'once the lines have left he plays Serve: ' + JSON.stringify(v.still));
    // a redraw part way through (another phone writes an order line) neither cuts the play nor starts it again
    await p.evaluate(([path, now]) => window.__fake.write(path, { text: 'Lemons', qty: '1 kg', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: now, ordered: false, deleted: false }), [key(['orders', day, 'lines', 'o9']), L.NOW]);
    await L.settle(p, 200); await p.evaluate(() => window.LK_PREP.toast('A redraw')); await L.settle(p, 200); v = await view(p);
    ok(v.still.playing && v.still.plays === 1 && v.sprite, 'a redraw part way through does not cut or restart the play: ' + JSON.stringify(v.still));
    await run(p, 4000); v = await view(p);
    ok(!v.still.playing && !v.still.scheduled && v.still.rest === 'rest' && v.still.plays === 1, 'one pass, then the Welcome pose, no timer left: ' + JSON.stringify(v.still));
    ok(v.stamp === day, 'the day he played is kept on this device: ' + v.stamp);
    const kinds = await p.evaluate(n => window.__fake.bill.slice(n).map(x => x.kind), bill);
    ok(kinds.every(k => k === 'listen+'), 'no read of its own: only the live lists\' own changes are billed: ' + kinds.join(','));
    ok(p.__art.filter(u => /sheet/.test(u)).length === 1 && p.__art.some(u => /welcome-still/.test(u)) && p.__art.every(u => /\?v=/.test(u)), 'one still and one sprite sheet, each with ?v= so the saved copy never keeps them: ' + p.__art.join(','));
  });

  await step('not before the server has the tick', async () => {
    await open(); await allBut(p, 'i6');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await tick(p, 'i6', 500); await run(p, 4500); let v = await view(p);
    ok(!v.card && v.book[0] === 'Everything on this list is ticked off. See Done today under Handy.', 'a finishing tick waiting to be sent keeps the plain words: ' + JSON.stringify(v.book));
    ok(!p.__art.length, 'and nothing is fetched while it waits');
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); }); await run(p, 700); v = await view(p);
    ok(v.card && v.say === 'Every line ticked. 6 of 6.', 'the card shows once the server has answered');
    await run(p, 1200); v = await view(p);
    ok(v.still && v.still.plays === 1, 'and he plays then, on the phone that finished the list: ' + JSON.stringify(v.still));
  });

  await step('the server answers without changing a line', async () => {
    // The real server's answer changes no line, only its Not sent flag, and the page is patched, not drawn
    // (patchOrDraw). The card must not wait for some later draw: __fake.ack() is that answer on its own.
    await open(); await allBut(p, 'i6');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await tick(p, 'i6', 300);
    ok(!(await view(p)).card, 'held: the plain words');
    await p.evaluate(() => { window.__fake.ack(); }); await L.settle(p, 300); const v = await view(p);
    ok(v.card && v.rows === 1, 'the card shows at the server\'s answer, while the ticked line still lingers: ' + JSON.stringify([v.card, v.rows]));
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  });

  await step('a refused tick', async () => {
    await open(); await allBut(p, 'i6');
    // the server refuses this one line's write (the rules say no), as it would a stale or revoked tick
    await p.evaluate(() => { window.__fake.deny = /\/items\/i6$/; });
    await tick(p, 'i6', 500); await run(p, 4500); const v = await view(p);
    ok(!v.card && !p.__art.length, 'a refused finishing tick shows no card');
    ok(await p.evaluate(() => !!document.querySelector('.p-toast-bad') || /5 of 6 done/.test(document.querySelector('.nb-left .nb-prog')?.textContent || '')), 'the book says so in its own words and the line is open again');
    // later the same line is ticked from another phone: the list is finished, but not by this phone
    await p.evaluate(() => { window.__fake.deny = null; });
    await p.evaluate(([path, now]) => { const cur = window.__fake.dump()[path]; window.__fake.write(path, Object.assign({}, cur, { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: now, preparedBy: 'Bo', preparedById: 'bo', preparedAt: now })); }, [item('i6'), L.NOW]);
    await run(p, 8000); const later = await view(p);
    ok(later.card && later.still && later.still.plays === 0, 'a refused tick leaves nothing behind: finished later by another phone, the card is a still: ' + JSON.stringify(later.still));
  });

  await step('Undo and once a day', async () => {
    await open(); await allBut(p, 'i6'); await tick(p, 'i6', 600);
    ok((await view(p)).card, 'finished: the card shows');
    await p.click('.p-toasts .p-toast[data-toast="new"] .p-toast-btn'); await L.settle(p, 500); let v = await view(p);
    ok(!v.card && !v.sprite && v.rows > 0 && !v.stamp, 'Undo takes the card back, and an action that never played is not used up: ' + JSON.stringify([v.card, v.rows, v.stamp]));
    await run(p, 9500); await tick(p, 'i6', 600); await run(p, 3700); v = await view(p);
    ok(v.card && v.still.plays === 1, 'ticked again, he plays: ' + JSON.stringify(v.still));
    await run(p, 4000);
    ok((await view(p)).stamp === day, 'played to the end: the day is kept');
    await p.evaluate(() => document.querySelector('.nb-done .nb-undo[data-id="i6"]').click()); await L.settle(p, 500);
    ok(!(await view(p)).card, 'an Undo from Done today takes the card back too');
    await run(p, 9500); await tick(p, 'i6', 600); await run(p, 8000); v = await view(p);
    ok(v.card && v.still.plays === 1 && !v.still.playing, 'finished a second time the same day: the card, and no second play: ' + JSON.stringify(v.still));
  });

  await step('another phone finishes the list', async () => {
    await open(); await allBut(p, 'i6');
    await p.evaluate(([path, now]) => { const cur = window.__fake.dump()[path]; window.__fake.write(path, Object.assign({}, cur, { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: now, preparedBy: 'Bo', preparedById: 'bo', preparedAt: now })); }, [item('i6'), L.NOW]);
    await run(p, 8000); const v = await view(p);
    ok(v.card && v.say === 'Every line ticked. 6 of 6.', 'the card is the list\'s state, so this phone shows it too');
    ok(v.still && v.still.plays === 0 && !v.stamp, 'as a still: this phone did not finish the list, so nothing plays: ' + JSON.stringify(v.still));
  });

  await step('a finished list opened later', async () => {
    const s = L.seed();
    await open({ extra: Object.fromEntries(ALL.map(i => [item(i), doneBy(s[item(i)], 'Bo')])) }); await run(p, 6000);
    const v = await view(p);
    ok(v.card && v.still && v.still.plays === 0 && v.still.rest === 'rest', 'a reload on a finished list shows the card as a still: ' + JSON.stringify(v.still));
  });

  await step('where it does not show', async () => {
    await open();
    await p.click('button.nb-tab[data-v="Larder"]'); await L.settle(p, 300);
    for (const id of ['i1', 'i2', 'i6']) await tick(p, id);
    await run(p, 9500); let v = await view(p);
    ok(!v.card && /Nothing left to do in Larder/.test(v.book[0] || ''), 'a section\'s own tab keeps its own words while other sections are open: ' + JSON.stringify(v.book));
    await p.click('button.nb-tab[data-v=""]'); await L.settle(p, 300);
    for (const id of ['i3', 'i4', 'i5']) await tick(p, id);
    await run(p, 9500);
    ok((await view(p)).card, 'back on All with every line ticked: the card');
    await p.click('button.nb-tab-wall'); await L.settle(p, 400);
    ok(await p.evaluate(() => !document.querySelector('.nb-fin') && /Everything on today's list is ticked off\./.test(document.querySelector('.wb .nb-empty')?.textContent || '')), 'the wall board keeps its plain words');
    await p.context().close(); p = null;
    await open({ extra: without(['i1', 'i2', 'i4', 'i5', 'i6']) }); await tick(p, 'i3', 500); await run(p, 9500); v = await view(p);
    ok(!v.card && v.book[0] === 'Everything on this list is ticked off. See Done today under Handy.' && !p.__art.length, 'a list of one line is an ordinary tick: the plain words: ' + JSON.stringify(v.book));
  });

  await step('reduced motion', async () => {
    await open(); await p.emulateMedia({ reducedMotion: 'reduce' }); await allBut(p, 'i6'); await tick(p, 'i6', 600); await run(p, 9000);
    const v = await view(p);
    ok(v.card && v.say === 'Every line ticked. 6 of 6.' && v.sprite, 'reduced motion: the words and the still');
    ok(v.still.plays === 0 && !v.still.playing && !p.__art.some(u => /sheet/.test(u)), 'and nothing plays, no sprite sheet is fetched: ' + p.__art.join(','));
  });

  await step('missing art', async () => {
    await open(); await allBut(p, 'i6'); await tick(p, 'i6', 600); await run(p, 4500);
    const withArt = await view(p); await p.context().close(); p = null;
    await open({ block: 'art/mascot/' }); await allBut(p, 'i6'); await tick(p, 'i6', 600); await run(p, 4500);
    const v = await view(p);
    ok(v.card && v.say === 'Every line ticked. 6 of 6.' && !v.sprite, 'no art: the words stay, the mascot is left out');
    ok(JSON.stringify(v.slot) === JSON.stringify(withArt.slot) && v.cardH === withArt.cardH, 'his room is kept, so the page is the same with and without the art: ' + JSON.stringify([withArt.cardH, v.cardH]));
    ok(v.still && v.still.plays === 0, 'and nothing plays: ' + JSON.stringify(v.still));
  });

  await step('the mascot file does not load', async () => {
    await open({ block: 'js/mascot\\.js' }); await allBut(p, 'i6'); await tick(p, 'i6', 600);
    for (let i = 0; i < 4; i++) { await p.evaluate(i => window.LK_PREP.toast('Redraw ' + i), i); await L.settle(p, 200); }
    await run(p, 4500); const v = await view(p);
    ok(v.card && v.say === 'Every line ticked. 6 of 6.' && !v.sprite, 'the words stay when the file cannot load');
    ok(p.__art.filter(u => /mascot\.js/.test(u)).length <= 2, 'one try, not one on every redraw: ' + p.__art.length);
  });

  await step('the shared tablet', async () => {
    await open({ touch: true, settings: { shared: true }, wait: 1500 });
    for (const id of ALL) {
      await p.click('button.nb-box[data-id="' + id + '"]'); await L.waitFor(p, () => !!document.querySelector('[data-pt="choose"][data-id="ann"]'), null, 6000);
      await p.click('[data-pt="choose"][data-id="ann"]'); await L.waitFor(p, () => !document.querySelector('[data-pt="choose"]'), null, 8000); await L.settle(p, 200);
      if (id !== 'i6') await run(p, 9500);
    }
    await L.settle(p, 400); let v = await view(p);
    ok(v.card && v.say === 'Every line ticked. 6 of 6.', 'Who did this? on the shared tablet: the last line recorded shows the card');
    await run(p, 4200); v = await view(p);
    ok(v.still && v.still.plays === 1, 'and he plays once there: ' + JSON.stringify(v.still));
  });

  await step('tablet and laptop', async () => {
    for (const [w, h, want] of [[768, 1024, [48, 64]], [1280, 900, [64, 85]]]) {
      await open({ width: w, height: h }); await allBut(p, 'i6'); await tick(p, 'i6', 600); await run(p, 4500);
      const v = await view(p), wide = await L.overflow(p);
      ok(v.card && v.slot && v.slot[0] === want[0] && v.slot[1] === want[1], w + ' px: the card, with the mascot at ' + want.join(' x ') + ' px: ' + JSON.stringify(v.slot));
      ok(!wide, w + ' px: no sideways scroll');
      ok(!realErrors(p).length, w + ' px: no browser errors'); await p.context().close(); p = null;
    }
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
