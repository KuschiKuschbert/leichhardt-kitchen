// A finished section, on the slip (owner, 10 Nov 2026; docs/kitchen-mascot.md). When this phone's tick finishes a
// section of two or more lines and the server has the tick, that tick's own slip gains one line of words:
// "Sauce is done. Grill has 1 left." Words only. Never before the server answers, never on a refused tick, never
// late, never on another slip, once a kitchen day per section, and the slip never grows. True on every screen or
// not said: a section is done only when every line of it anywhere is ticked, and "has 1 left" is only said of a
// section the All list, its own tab and Home count the same. Synthetic staff only.
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
// another phone's write: the fields change under this page (the rest of the line stays) and its listeners hear
const other = (p, id, data) => p.evaluate(([path, d]) => window.__fake.write(path, Object.assign({}, window.__fake.dump()[path] || {}, d)), [item(id), data]);
const fake = (p, what) => p.evaluate(w => { if (w === 'hold' || w === 'ok') window.__fake.mode = w; else window.__fake[w](); }, what);
const slip = p => p.evaluate(() => {
  const rect = e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  const t = document.querySelector('.p-toasts .p-toast[data-toast="new"]'), say = t && t.querySelector('.p-toast-say'), btn = t && t.querySelector('.p-toast-btn'), live = document.getElementById('lk-live');
  return { up: !!t, msg: t ? t.querySelector('.p-toast-msg').textContent : '', say: say ? say.textContent : '', two: !!(t && t.classList.contains('p-toast-two')), bad: !!(t && t.classList.contains('p-toast-bad')),
    h: t ? Math.round(t.getBoundingClientRect().height * 10) / 10 : 0, box: t ? rect(t) : null, btn: btn ? rect(btn) : null, undo: btn ? btn.textContent : '',
    plainKids: say ? say.children.length : 0, slipKids: t ? [...t.children].map(e => e.tagName + '.' + e.className.split(' ')[0]).join(' ') : '',
    chip: document.querySelector('.p-toasts [data-toast="old"]')?.textContent || '', live: live ? live.textContent : '', kept: localStorage.getItem('lk.said.day'),
    rows: [...document.querySelectorAll('.nb-left .nb-rows .nb-row')].map(rect), heads: [...document.querySelectorAll('.nb-left .nb-hd')].map(h => [...h.children].filter(e => e.tagName === 'SPAN' && !e.classList.contains('nb-hbar')).map(e => e.textContent).join(' ')),
    unsent: !!document.querySelector('.nb-unsent'), card: !!document.querySelector('.nb-fin'), empty: [...document.querySelectorAll('.nb-left .nb-empty')].map(e => e.textContent).join(' | '),
    color: say ? getComputedStyle(say).color : '', paper: t ? getComputedStyle(t).backgroundColor : '', wrap: say ? getComputedStyle(say).whiteSpace : '' };
});
// The sentence is drawn when the tick's own write is answered: wait for the thing itself, then for the slip's
// slide in (0.18 s, real time) to end before anything is measured.
async function said(p, text) {
  await L.waitFor(p, t => { const s = document.querySelector('.p-toasts [data-toast="new"] .p-toast-say'); return !!s && (!t || s.textContent === t); }, text || '', 4000).catch(() => {});
  await L.settle(p, 350); return slip(p);
}
// nothing more is coming: the write is answered and the slip has settled
async function quiet(p, ms) { await L.settle(p, ms || 500); return slip(p); }
const lum = c => { const m = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const b = await L.start(); let p = null;
  // Whether the sentence fits depends on how wide the text is, and the tests' stand-in fonts differ from machine to
  // machine (wider on GitHub's runner). So the rules are checked on a tablet, where one-word names fit in any font,
  // and the phone is checked in the book's own font, Barlow (the last step), or by comparing with and without.
  async function open(o = {}) {
    p = await L.open(b, '#/prep', { who: 'ann', width: 768, height: 1024, wait: 1200, ...o });
    await L.waitFor(p, () => !!document.querySelector('.nb-left .nb-prog'), null, 6000);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }
  // Sauce's first line ticked and its slip gone, so the next tick is the one that finishes Sauce
  async function ready(o) { await open(o); await tick(p, 'i4'); await run(p, 9500); }

  await step('the finishing tick', async () => {
    await open();
    await tick(p, 'i4', 500); const plain = await slip(p);
    ok(plain.up && plain.msg === 'Ticked Make gravy' && !plain.say && !plain.two && plain.undo === 'Undo', 'an ordinary tick keeps today\'s slip: ' + JSON.stringify([plain.msg, plain.say]));
    ok(plain.slipKids === 'SPAN.p-toast-msg BUTTON.p-toast-btn', 'and today\'s markup: ' + plain.slipKids);
    ok(plain.kept === null, 'an ordinary tick keeps nothing on the device: ' + plain.kept);
    await run(p, 9500);
    const bill = await p.evaluate(() => window.__fake.bill.length), writes = await p.evaluate(() => window.__fake.writes.length), rows = (await slip(p)).rows;
    await tick(p, 'i5', 0); const v = await said(p);
    ok(v.msg === 'Ticked Laksa' && v.say === 'Sauce is done. Grill has 1 left.', 'the tick that finishes Sauce says so, and what is next: ' + JSON.stringify([v.msg, v.say]));
    ok(v.h === plain.h && v.h <= 64, 'the slip keeps its height: ' + plain.h + ' then ' + v.h);
    ok(JSON.stringify(v.btn) === JSON.stringify(plain.btn) && v.btn[3] >= 44 && v.undo === 'Undo', 'Undo keeps its place and its 44 px: ' + JSON.stringify([plain.btn, v.btn]));
    ok(JSON.stringify(v.box) === JSON.stringify(plain.box), 'the slip keeps its place: ' + JSON.stringify([plain.box, v.box]));
    ok(JSON.stringify(v.rows) === JSON.stringify(rows), 'no line on the page moves when the words come: ' + JSON.stringify([rows.length, v.rows.length]));
    ok(v.plainKids === 0 && v.slipKids === 'SPAN.p-toast-msg SPAN.p-toast-say BUTTON.p-toast-btn', 'words only: no art, button, link or role with the sentence: ' + v.slipKids);
    ok(v.wrap === 'nowrap', 'the sentence is one line, never wrapped: ' + v.wrap);
    ok(contrast(v.color, v.paper) >= 4.5, 'the words pass 4.5:1 on the slip: ' + contrast(v.color, v.paper).toFixed(2));
    ok(v.kept === null && !/Sauce is done/.test(v.live), 'in its first 2 seconds it is not kept as said and not read out: ' + JSON.stringify([v.kept, v.live]));
    ok(!/Ann|\bBo\b/.test(v.say) && !/\d\d:\d\d|\bmin|fast|quick|early|record/i.test(v.say), 'no person and no clock in the words: ' + v.say);
    ok(!v.card, 'the finished-list card is not up: lines are left');
    const kinds = await p.evaluate(n => window.__fake.bill.slice(n).map(x => x.kind), bill);
    const wrote = await p.evaluate(n => window.__fake.writes.slice(n).flat().map(x => x.path), writes);
    ok(kinds.every(k => k === 'listen+'), 'no read of its own: only the live lists\' own changes are billed: ' + kinds.join(','));
    ok(wrote.every(w => /\/items\/i5$|\/activity\/ann$/.test(w)), 'no write of its own: only the tick and its count: ' + JSON.stringify(wrote));
    // the ticked line leaves after 3.5 s (a redraw); the words stay with the slip, and the slip's 9 seconds are not extended
    await run(p, 4000); let later = await slip(p);
    ok(later.say === 'Sauce is done. Grill has 1 left.' && later.h === plain.h && !later.heads.some(h => /^Sauce/.test(h)), 'the words stay through the redraw when the line leaves: ' + JSON.stringify([later.say, later.heads]));
    ok(later.kept && JSON.parse(later.kept).d === day && JSON.stringify(JSON.parse(later.kept).s) === '["Sauce"]', 'once they have stood 2 seconds the section is kept for the kitchen day: ' + later.kept);
    ok(later.live === 'Sauce is done. Grill has 1 left.', 'and the words are read out, after the slip\'s own: ' + later.live);
    await run(p, 5200); later = await slip(p);
    ok(!later.up, 'the slip leaves after its own 9 seconds: ' + JSON.stringify([later.up, later.msg]));
  });

  await step('not before the server has the tick', async () => {
    await ready(); await fake(p, 'hold');
    await tick(p, 'i5', 0); let v = await quiet(p, 1200);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && v.kept === null, 'a finishing tick waiting to be sent keeps the plain slip, and nothing is kept: ' + JSON.stringify([v.msg, v.say, v.kept]));
    // a slow signal: after 3 seconds the line says Not sent, and still no words
    await run(p, 3300); v = await slip(p);
    ok(v.up && !v.say && v.unsent, 'still waiting after 3 seconds: the line says Not sent, the slip is plain: ' + JSON.stringify([v.say, v.unsent]));
    await fake(p, 'release'); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.' && v.h <= 64 && !v.unsent, 'the words come when the server answers, on the same slip: ' + JSON.stringify([v.say, v.h, v.unsent]));
  });

  await step('the write is answered before the listener hears', async () => {
    // the SDK's own order: the write's promise first, the listen event after. Two quick ticks, both held.
    await open(); await fake(p, 'hold');
    await tick(p, 'i4', 100); await tick(p, 'i5', 100);
    await fake(p, 'answer'); let v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'both answers in, the listener still behind: the words show: ' + JSON.stringify([v.msg, v.say]));
    await fake(p, 'ack'); v = await quiet(p, 300);
    ok(v.say === 'Sauce is done. Grill has 1 left.' && !v.unsent, 'and stay when the listener catches up: ' + JSON.stringify([v.say, v.unsent]));
  });

  await step('the listener hears before the write is answered', async () => {
    await ready(); await fake(p, 'hold');
    await tick(p, 'i5', 0); await fake(p, 'ack'); let v = await quiet(p, 800);
    ok(!v.say && !v.unsent, 'the listener alone is not the answer: no words yet: ' + JSON.stringify([v.say, v.unsent]));
    await fake(p, 'release'); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'the write\'s own answer brings them: ' + v.say);
  });

  await step('never late', async () => {
    await ready(); await fake(p, 'hold');
    await tick(p, 'i5', 100); await run(p, 6300);
    await fake(p, 'release'); let v = await quiet(p, 600);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && v.kept === null, 'an answer with under 3 seconds of the slip left says nothing: ' + JSON.stringify([v.up, v.say, v.kept]));
    await run(p, 3500); v = await slip(p);
    ok(!v.up && !v.say, 'and nothing after the slip has gone: ' + JSON.stringify([v.up, v.say]));
    // the answer comes after the slip has gone: nothing, and not on a later slip either
    await p.click('[data-p="donejump"]').catch(() => {}); await L.settle(p, 200);
    await other(p, 'i5', open0); await L.settle(p, 300); await fake(p, 'hold');
    await tick(p, 'i5', 100); await run(p, 9500); await fake(p, 'release'); v = await quiet(p, 600);
    ok(!v.up && v.kept === null, 'an answer after the slip has gone says nothing: ' + JSON.stringify([v.up, v.kept]));
    await tick(p, 'i1', 0); v = await quiet(p, 600);
    ok(v.msg === 'Ticked Slice onions' && !v.say, 'and the next ordinary tick\'s slip does not carry it: ' + JSON.stringify([v.msg, v.say]));
  });

  await step('a refused tick', async () => {
    await ready(); await p.evaluate(() => { window.__fake.deny = /\/items\/i5$/; });
    await tick(p, 'i5', 0); await L.waitFor(p, () => !!document.querySelector('.p-toasts .p-toast-bad'), null, 8000).catch(() => {}); let v = await quiet(p, 300);
    ok(v.bad && !v.say && !v.two && v.kept === null, 'a refused finishing tick shows the book\'s red slip and no words: ' + JSON.stringify([v.msg, v.say, v.kept]));
    // another phone then ticks the line: this phone did not finish the section
    await p.evaluate(() => { window.__fake.deny = null; }); await other(p, 'i5', ticked('Bo')); v = await quiet(p, 600);
    ok(!v.say && v.kept === null, 'the same line ticked on another phone afterwards says nothing here: ' + JSON.stringify([v.msg, v.say]));
  });

  await step('a second tick in between', async () => {
    await ready(); await fake(p, 'hold');
    await tick(p, 'i5', 100); await tick(p, 'i1', 100);
    await fake(p, 'release'); let v = await quiet(p, 700);
    ok(v.msg === 'Ticked Slice onions' && !v.say && /Undo ticked Laksa/.test(v.chip), 'the newer tick has the slip: the earlier tick\'s words are not put on it: ' + JSON.stringify([v.msg, v.say, v.chip]));
    ok(v.kept === null, 'words that never showed are not kept as said: ' + v.kept);
    // two finishing ticks, both held: only the slip that is up speaks, for its own section
    await run(p, 9500); await tick(p, 'i2'); await run(p, 9500);
    await other(p, 'i5', open0); await L.settle(p, 300); await fake(p, 'hold');
    await tick(p, 'i5', 100); await tick(p, 'i6', 100);
    await fake(p, 'release'); v = await said(p);
    ok(v.msg === 'Ticked Wash bok choy' && v.say === 'Larder is done. Grill has 1 left.', 'two finishing ticks: the slip that is up speaks for its own section: ' + JSON.stringify([v.msg, v.say]));
    await run(p, 2200); v = await slip(p);
    ok(v.kept && JSON.stringify(JSON.parse(v.kept).s) === '["Larder"]', 'only the section that was said is kept: ' + v.kept);
  });

  await step('Undo and once a day', async () => {
    // a slip of the thumb, undone straight away: the words go with the tick and the section is not spent
    await ready(); await tick(p, 'i5', 0); let v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'said: ' + v.say);
    await p.click('.p-toasts [data-p="toast-act"]'); v = await quiet(p, 500);
    ok(/^Unticked Laksa/.test(v.msg) && !v.say && !v.two && v.kept === null, 'Undo takes the words back with the tick, and inside 2 seconds nothing is kept: ' + JSON.stringify([v.msg, v.say, v.kept]));
    await run(p, 4000); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'the real finish, later, still says it: ' + v.say);
    // once the words have stood, Undo and a second tick say nothing more that day
    await run(p, 2500); await p.click('.p-toasts [data-p="toast-act"]'); await L.settle(p, 400);
    await run(p, 4000); await tick(p, 'i5', 0); v = await quiet(p, 700);
    ok(v.msg === 'Ticked Laksa' && !v.say && v.h <= 64, 'ticked again the same day: the plain slip, not said twice: ' + JSON.stringify([v.msg, v.say]));
    ok(JSON.stringify(JSON.parse(v.kept).s) === '["Sauce"]', 'kept once: ' + v.kept);
  });

  await step('the saved day', async () => {
    // yesterday's note is out of date: the section is said again today
    await ready({ init: 'localStorage.setItem("lk.said.day", JSON.stringify({ d: "2001-01-01", s: ["Sauce"] }))' }); await tick(p, 'i5', 0); let v = await said(p);
    await run(p, 2200); const kept = (await slip(p)).kept;
    ok(v.say === 'Sauce is done. Grill has 1 left.' && kept && JSON.parse(kept).d === day, 'a note from another kitchen day is out of date: ' + JSON.stringify([v.say, kept]));
    await p.context().close();
    // today's note holds after a reload
    await ready({ init: 'localStorage.setItem("lk.said.day", JSON.stringify({ d: ' + JSON.stringify(day) + ', s: ["Sauce"] }))' }); await tick(p, 'i5', 0); v = await quiet(p, 700);
    ok(v.msg === 'Ticked Laksa' && !v.say, 'today\'s note holds after a reload: not said again: ' + JSON.stringify([v.msg, v.say]));
    await p.context().close();
    // a note that is not what the book wrote is ignored, never an error
    await ready({ init: 'localStorage.setItem("lk.said.day", "{not json")' }); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'a broken note is ignored: ' + v.say);
    await p.context().close();
    // a phone that refuses storage: said once, from this tab's memory
    await ready({ init: 'const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "lk.said.day") throw new Error("full"); return set.call(this, k, v); };' });
    await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.' && v.kept === null, 'storage refused: still said: ' + JSON.stringify([v.say, v.kept]));
    await run(p, 2500); await p.click('.p-toasts [data-p="toast-act"]'); await L.settle(p, 300); await run(p, 4000); await tick(p, 'i5', 0); v = await quiet(p, 700);
    ok(v.msg === 'Ticked Laksa' && !v.say, 'and once, from this tab\'s memory: ' + JSON.stringify([v.msg, v.say]));
  });

  await step('a section of one line, and the whole list', async () => {
    await open(); await tick(p, 'i3', 0); let v = await quiet(p, 700);
    ok(v.msg === 'Ticked Portion rump' && !v.say && v.kept === null, 'a section of one line is an ordinary tick: ' + JSON.stringify([v.msg, v.say]));
    // every other line ticked on another phone: this phone's tick finishes Sauce and the whole list
    for (const id of ['i1', 'i2', 'i6', 'i4']) await other(p, id, ticked('Bo'));
    await run(p, 9500); await tick(p, 'i5', 0); await L.waitFor(p, () => !!document.querySelector('.nb-fin'), null, 6000).catch(() => {}); v = await quiet(p, 500);
    ok(v.msg === 'Ticked Laksa' && !v.say && v.card && v.kept === null, 'the tick that finishes the whole list: the card under the list speaks, the slip stays plain: ' + JSON.stringify([v.msg, v.say, v.card]));
  });

  await step('another phone', async () => {
    // this phone ticks the first, another phone the last: no slip here, so no words
    await ready(); await other(p, 'i5', ticked('Bo')); let v = await quiet(p, 600);
    ok(!v.up && !v.say && v.kept === null, 'a section finished on another phone says nothing here: ' + JSON.stringify([v.up, v.say]));
    await p.context().close();
    // another phone ticked the first line, this phone's tick finishes the section
    await open(); await other(p, 'i4', ticked('Bo')); await L.settle(p, 300); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'this phone\'s tick finishes a section another phone started: ' + v.say);
  });

  await step('it stays true while it shows', async () => {
    await ready(); await tick(p, 'i5', 0); let v = await said(p);
    // another phone ticks Grill's only line: what is next follows the list
    await other(p, 'i3', ticked('Bo')); v = await said(p, 'Sauce is done. Larder has 3 left.');
    ok(v.say === 'Sauce is done. Larder has 3 left.' && v.h <= 64, 'what is next follows the list: ' + JSON.stringify([v.say, v.h]));
    // another phone writes a new Sauce line: Sauce is not done any more
    await other(p, 'i8', line('Reduce jus', 'Sauce')); v = await quiet(p, 600);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && !v.two && v.h <= 64, 'a line added to the section takes the words away, the slip stays: ' + JSON.stringify([v.msg, v.say, v.h]));
    // the other phone ticks its new line: Sauce is finished again, but not by this slip's tick
    await other(p, 'i8', ticked('Bo', L.NOW)); v = await quiet(p, 600);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say, 'once taken away the words do not come back on that slip: ' + JSON.stringify([v.msg, v.say]));
    ok(v.kept === null, 'words that stood under 2 seconds are not kept as said: ' + v.kept);
    await p.context().close();
    await ready(); await tick(p, 'i5', 0); await said(p);
    await other(p, 'i4', open0); v = await quiet(p, 600);
    ok(v.up && !v.say, 'a line of the section unticked on another phone takes the words away: ' + JSON.stringify([v.msg, v.say]));
    await p.context().close();
    // another section's tab: the words belong to the page the cook is on
    await ready(); await tick(p, 'i5', 0); await said(p);
    await p.click('.nb-tab[data-v="Larder"]'); v = await quiet(p, 400);
    ok(v.up && !v.say, 'on another section\'s tab the slip is plain: ' + JSON.stringify([v.msg, v.say]));
    await p.click('.nb-tab[data-v=""]'); v = await quiet(p, 400);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say, 'and back on All it stays plain: one slip, one view: ' + JSON.stringify([v.msg, v.say]));
    await p.context().close();
    // the slip follows the cook to Orders and back: its Undo stays, the words do not
    await ready(); await tick(p, 'i5', 0); await said(p);
    await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 700); v = await slip(p);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && v.undo === 'Undo', 'on Orders the slip keeps its Undo and has no words about prep: ' + JSON.stringify([v.msg, v.say]));
    await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 700); v = await slip(p);
    ok(!v.say, 'and back on Prep they do not return: ' + JSON.stringify([v.up, v.say]));
  });

  await step('one line or nothing', async () => {
    const long = 'Blanch and refresh the green beans for the banq';   // 47 letters
    // the same long line ticked as an ordinary tick (Sauce has three lines): today's height for it
    const phone = { width: 390, height: 844 };
    await open({ ...phone, extra: { [item('i5')]: line(long, 'Sauce'), [item('i7')]: line('Reduce jus', 'Sauce') } });
    await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 500); const plain = await slip(p);
    ok(plain.msg === 'Ticked ' + long.slice(0, 38).trim() + '\u2026' && !plain.say, 'baseline, a long name on an ordinary tick: ' + JSON.stringify([plain.msg, plain.h]));
    await p.context().close();
    await ready({ ...phone, extra: { [item('i5')]: line(long, 'Sauce') } }); await tick(p, 'i5', 0); let v = await quiet(p, 800);
    ok(v.h === plain.h && JSON.stringify(v.btn) === JSON.stringify(plain.btn), 'a long ticked name: the slip is exactly today\'s height, Undo where it was: ' + JSON.stringify([plain.h, v.h, v.say]));
    ok(v.h === 60 || !v.say, 'and the words only show if the slip stays 60 px: ' + JSON.stringify([v.h, v.say]));
    await p.context().close();
    // long section names: the sentence does not fit on one line, so nothing is said and nothing is kept
    const a = 'Sauces and stocks for the banquet kitchen', z = 'Larder and cold section for functions';
    await ready({ ...phone, extra: { [item('i4')]: line('Make gravy', a, { rolled: 1 }), [item('i5')]: line('Laksa', a), [item('i1')]: line('Slice onions', z), [item('i2')]: line('Pick coriander', z), [item('i6')]: line('Wash bok choy', z), [item('i3')]: undefined } });
    await tick(p, 'i5', 0); v = await quiet(p, 800);
    ok(v.msg === 'Ticked Laksa' && !v.say && !v.two && v.h === 60 && v.kept === null, 'a sentence that does not fit on one line is not said, and not kept: ' + JSON.stringify([v.say, v.h, v.kept]));
    await run(p, 2500); ok((await slip(p)).kept === null && !/is done/.test((await slip(p)).live), 'nor read out: ' + (await slip(p)).live);
    ok(v.slipKids === 'SPAN.p-toast-msg BUTTON.p-toast-btn', 'the slip is today\'s markup again: ' + v.slipKids);
    await p.context().close();
    // Extra large text: the slip is never taller than the plain slip at that size
    for (const w of [phone, { width: 768, height: 1024 }]) {
      await open({ ...w, settings: { text: 'xlarge' } }); await tick(p, 'i4', 500); const big = await slip(p);
      await run(p, 9500); await tick(p, 'i5', 0); v = await quiet(p, 800);
      ok(v.h === big.h, 'Extra large text at ' + w.width + ' px: the slip is exactly the plain slip\'s height (' + big.h + ' px), words ' + (v.say ? 'shown' : 'left out') + ': ' + JSON.stringify([v.h, v.say]));
      await p.context().close();
    }
    p = null;
  });

  await step('a section\'s own tab', async () => {
    // Home sends each cook to their section's tab: the section is every line on that tab
    await open(); await p.click('.nb-tab[data-v="Sauce"]'); await L.settle(p, 300);
    await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); let v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.' && v.h <= 64, 'on Sauce\'s own tab: ' + JSON.stringify([v.say, v.h]));
    await run(p, 4000); v = await slip(p);
    ok(/Nothing left to do in Sauce/.test(v.empty) && v.say === 'Sauce is done. Grill has 1 left.', 'the tab\'s own words follow under the list: ' + v.empty);
    await p.context().close();
    // a Grill line that is also on Sauce's tab is still open: the tab says 2/3, so nothing is said there
    await open({ extra: { [item('i7')]: line('Char lemons', 'Grill', { also: ['Sauce'] }) } }); await p.click('.nb-tab[data-v="Sauce"]'); await L.settle(p, 300);
    await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); v = await quiet(p, 800);
    ok(!v.say && v.heads.some(h => /^Sauce 2\/3/.test(h)), 'a line also on this tab is still open: the tab says 2/3 and the slip is plain: ' + JSON.stringify([v.say, v.heads]));
    await p.context().close();
    // the same list on All: Sauce's own heading is 2/2 there, but a Sauce job is still open under Grill, so nothing is said
    await ready({ extra: { [item('i7')]: line('Char lemons', 'Grill', { also: ['Sauce'] }) } }); await tick(p, 'i5', 0); v = await quiet(p, 800);
    ok(!v.say && v.heads.some(h => /^Sauce 2\/2/.test(h)) && v.kept === null, 'on All the heading says 2/2, but a line also listed under Sauce is open: nothing is said: ' + JSON.stringify([v.say, v.heads]));
    await p.context().close();
    // ticking that line last, on Sauce's tab, finishes every Sauce line anywhere
    await open({ extra: { [item('i7')]: line('Char lemons', 'Grill', { also: ['Sauce'] }), [item('i4')]: Object.assign(line('Make gravy', 'Sauce', { rolled: 1 }), ticked('Bo')), [item('i5')]: Object.assign(line('Laksa', 'Sauce'), ticked('Bo')) } });
    await p.click('.nb-tab[data-v="Sauce"]'); await L.settle(p, 300); await tick(p, 'i7', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'the last line on Sauce\'s tab, one also listed there: ' + v.say);
    await p.context().close();
    // what is next: Grill also holds a Larder line as an also section, so its tab and its heading count differently. It is passed over
    await ready({ extra: { [item('i7')]: line('Zest limes', 'Larder', { also: ['Grill'] }) } }); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Larder has 4 left.', 'a section the All list and its own tab count differently is not named as next: ' + v.say);
    await p.context().close();
    // the tab's last tick is also the list's last: no card on a tab, so the slip says the section and nothing is next
    await open(); for (const id of ['i1', 'i2', 'i6', 'i3', 'i4']) await other(p, id, ticked('Bo'));
    await p.click('.nb-tab[data-v="Sauce"]'); await L.settle(p, 300); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done.' && !v.card, 'the tab\'s last tick is the list\'s last: the section, and nothing next: ' + JSON.stringify([v.say, v.card]));
  });

  await step('where it does not show', async () => {
    // the wall board: every section is on the board at once
    await open(); await p.click('[data-p="wall"][data-v="1"]'); await L.settle(p, 400);
    await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); let v = await quiet(p, 800);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && v.kept === null, 'the wall board keeps the plain slip: ' + JSON.stringify([v.msg, v.say]));
    await p.context().close();
    // a function's platter lines have their own tab and count
    const fn = (text, o) => line(text, '', Object.assign({ fn: 'f1', fnName: 'Lee party' }, o || {}));
    await open({ extra: { [item('f1')]: fn('Platter one'), [item('f2')]: fn('Platter two') } });
    await p.click('.nb-tab-fn'); await L.settle(p, 300); await tick(p, 'f1'); await run(p, 9500); await tick(p, 'f2', 0); v = await quiet(p, 800);
    ok(v.up && /^Ticked Platter two/.test(v.msg) && !v.say && v.kept === null, 'the Functions tab keeps the plain slip: ' + JSON.stringify([v.msg, v.say]));
    await p.context().close();
    // lines with no section have no heading to finish
    await open({ extra: { [item('n1')]: line('Fold napkins', ''), [item('n2')]: line('Polish cutlery', '') } });
    await tick(p, 'n1'); await run(p, 9500); await tick(p, 'n2', 0); v = await quiet(p, 800);
    ok(v.up && v.msg === 'Ticked Polish cutlery' && !v.say, 'lines with no section: the plain slip: ' + JSON.stringify([v.msg, v.say]));
    await p.context().close();
    // lines are left, but none under a section that can be named: nothing, so the words never read as "nothing is left"
    await ready({ extra: { [item('n1')]: line('Fold napkins', ''), [item('i1')]: Object.assign(line('Slice onions', 'Larder'), ticked('Bo')), [item('i2')]: Object.assign(line('Pick coriander', 'Larder'), ticked('Bo')), [item('i6')]: Object.assign(line('Wash bok choy', 'Larder'), ticked('Bo')), [item('i3')]: Object.assign(line('Portion rump', 'Grill', { urgent: true }), ticked('Bo')) } });
    await tick(p, 'i5', 0); v = await quiet(p, 800);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && !v.card, 'a line with no section is still open: no bare "Sauce is done.": ' + JSON.stringify([v.msg, v.say]));
    await p.context().close();
    // names that would read wrongly: the whole list, the Functions tab, a person
    for (const n of ['Prep', 'functions', 'Bo']) {
      await ready({ extra: { [item('i4')]: line('Make gravy', n, { rolled: 1 }), [item('i5')]: line('Laksa', n) } }); await tick(p, 'i5', 0); v = await quiet(p, 800);
      ok(v.up && v.msg === 'Ticked Laksa' && !v.say && v.kept === null, 'a section called ' + n + ' is not said: ' + JSON.stringify([v.msg, v.say]));
      await p.context().close();
    }
    // and such a name is not named as next either: Grill is renamed Prep, so Larder is next
    await ready({ extra: { [item('i3')]: line('Portion rump', 'Prep', { urgent: true }) } }); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Larder has 3 left.', 'a name that reads wrongly is passed over as next: ' + v.say);
  });

  await step('tonight, for tomorrow', async () => {
    // 21:00: a Sauce line written at 20:30 sits under Tonight, for tomorrow. Sauce's heading reads 2 lines on All,
    // its own tab and Home count 3: a Sauce line is still open, so nothing is said
    const late = (text, station) => line(text, station, { addedAt: L.NOW + 6.5 * 3600000 });
    await open(); await p.clock.fastForward('07:00:00'); await L.settle(p, 500); await other(p, 't1', late('Soak beans', 'Sauce')); await L.settle(p, 400);
    let v = await slip(p);
    ok(v.heads.some(h => /^Tonight, for tomorrow/.test(h)), 'the late line sits under Tonight, for tomorrow: ' + JSON.stringify(v.heads));
    await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); v = await quiet(p, 800);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && v.heads.some(h => /^Sauce 2\/2/.test(h)), 'the heading reads 2/2 but a Sauce line for tomorrow is open: nothing is said: ' + JSON.stringify([v.say, v.heads]));
    // done tonight after all: now every Sauce line anywhere is ticked
    await run(p, 9500); await tick(p, 't1', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.', 'the last Sauce line, ticked tonight: ' + v.say);
    await p.context().close();
    // what is next: Grill has a line for tomorrow, so its heading, its tab and Home count differently. It is passed over
    await open(); await p.clock.fastForward('07:00:00'); await L.settle(p, 500); await other(p, 't2', late('Marinate ribs', 'Grill')); await L.settle(p, 400);
    await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Sauce is done. Larder has 3 left.', 'a section with a line for tomorrow is not named as next: ' + v.say);
  });

  await step('the shared tablet', async () => {
    await open({ touch: true, settings: { shared: true }, wait: 1500 });
    const choose = async id => {
      await p.click('button.nb-box[data-id="' + id + '"]'); await L.waitFor(p, () => !!document.querySelector('[data-pt="choose"][data-id="ann"]'), null, 6000);
      await p.click('[data-pt="choose"][data-id="ann"]'); await L.waitFor(p, () => !document.querySelector('[data-pt="choose"]'), null, 8000);
    };
    await choose('i4'); await L.settle(p, 200); await run(p, 9500);
    await choose('i5'); const v = await said(p);
    ok(v.msg === 'Ticked Laksa' && v.say === 'Sauce is done. Grill has 1 left.' && v.h <= 64, 'Who did this? on the shared tablet: the slip comes with the words: ' + JSON.stringify([v.msg, v.say, v.h]));
    ok(!/Ann/.test(v.say), 'the section, never the person: ' + v.say);
    await run(p, 2300); const w = await slip(p);
    ok(w.live === 'Sauce is done. Grill has 1 left.', 'read out once the words have stood: ' + w.live);
  });

  await step('the older Undo, and putting the slip away', async () => {
    await ready(); await tick(p, 'i5', 0); await said(p);
    await tick(p, 'i1', 0); let v = await quiet(p, 600);
    ok(v.msg === 'Ticked Slice onions' && !v.say && /Undo ticked Laksa/.test(v.chip), 'the next tick\'s slip is plain, and the older Undo is the chip above it: ' + JSON.stringify([v.msg, v.say, v.chip]));
    await p.click('.p-toasts [data-p="toast-old"]'); await L.settle(p, 500); v = await slip(p);
    ok(v.heads.some(h => /^Sauce 1\/2/.test(h)), 'the chip still undoes the earlier tick: ' + JSON.stringify(v.heads));
    await p.context().close();
    await ready(); await tick(p, 'i5', 0); await said(p);
    await p.click('.p-toasts [data-toast="new"] .p-toast-say'); v = await quiet(p, 400);
    ok(v.up && v.undo === 'Undo' && v.say === 'Sauce is done. Grill has 1 left.', 'a tap on the sentence does nothing: it cannot throw Undo away: ' + JSON.stringify([v.up, v.undo]));
    await p.click('.p-toasts [data-toast="new"] .p-toast-msg'); v = await quiet(p, 400);
    ok(!v.up, 'a tap on the slip\'s own words still puts it away');
  });

  await step('a section name with markup', async () => {
    const n = '<b>Sc</b>';
    await ready({ extra: { [item('i4')]: line('Make gravy', n, { rolled: 1 }), [item('i5')]: line('Laksa', n) } }); await tick(p, 'i5', 0); const v = await said(p);
    ok(v.say === '<b>Sc</b> is done. Grill has 1 left.' && v.plainKids === 0, 'a typed section name shows as its words, never as markup: ' + JSON.stringify([v.say, v.plainKids]));
    // through a full redraw too (toastHTML())
    await run(p, 4000); const w = await slip(p);
    ok(w.say === '<b>Sc</b> is done. Grill has 1 left.' && w.plainKids === 0, 'and through a redraw: ' + JSON.stringify([w.say, w.plainKids]));
    await p.context().close();
    // the section named as next is typed by a person too
    await ready({ extra: { [item('i3')]: line('Portion rump', '<i>G</i>', { urgent: true }) } }); await tick(p, 'i5', 0); const x = await said(p);
    ok(x.say === 'Sauce is done. <i>G</i> has 1 left.' && x.plainKids === 0, 'the next section\'s name shows as its words too: ' + JSON.stringify([x.say, x.plainKids]));
  });

  await step('names that are more than one', async () => {
    // the kitchen's own sections: Pans, Fryers, Salads and dessert. On a tablet, where the long name has room
    await ready({ width: 768, height: 1024, extra: { [item('i4')]: line('Make gravy', 'Pans', { rolled: 1 }), [item('i5')]: line('Laksa', 'Pans'), [item('i3')]: line('Portion rump', 'Fryers', { urgent: true }) } });
    await tick(p, 'i5', 0); let v = await said(p);
    ok(v.say === 'Pans are done. Fryers have 1 left.', 'a name ending in s reads as more than one: ' + v.say);
    await p.context().close();
    await ready({ width: 768, height: 1024, extra: { [item('i4')]: line('Make gravy', 'Salads and dessert', { rolled: 1 }), [item('i5')]: line('Laksa', 'Salads and dessert'), [item('i3')]: line('Portion rump', 'Pass', { urgent: true }) } });
    await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Salads and dessert are done. Pass has 1 left.', 'a name that joins two things, and one that ends in ss: ' + v.say);
  });

  await step('reduced motion', async () => {
    await open(); await p.emulateMedia({ reducedMotion: 'reduce' });
    await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); const v = await said(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.' && v.h <= 64, 'reduced motion keeps the words: ' + v.say);
  });

  await step('laptop', async () => {
    await open({ width: 1280, height: 900 }); await tick(p, 'i4', 500); const plain = await slip(p);
    await run(p, 9500); await tick(p, 'i5', 0); const v = await said(p), wide = await L.overflow(p);
    ok(v.say === 'Sauce is done. Grill has 1 left.' && v.h === plain.h && JSON.stringify(v.box) === JSON.stringify(plain.box) && JSON.stringify(v.btn) === JSON.stringify(plain.btn), '1280 px: the words show and the slip and Undo keep their size and place: ' + JSON.stringify([v.say, plain.box, v.box]));
    ok(!wide, '1280 px: no sideways scroll');
  });

  // The phone, in the book's own font. If Barlow cannot load here, the step says so and compares with and without.
  await step('a phone, in Barlow', async () => {
    const phone = { width: 390, height: 844 };
    const barlow = async () => {
      await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
      const css = await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&display=swap' }).then(() => true, () => false);
      const got = css && await p.evaluate(() => Promise.race([Promise.all(['600 16px Barlow', '700 16px Barlow'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length > 0)), new Promise(r => setTimeout(() => r(false), 8000))]));
      if (got) { await p.evaluate(() => document.fonts.ready); await L.settle(p, 300); }
      return !!got;
    };
    await open(phone); const real = await barlow();
    await tick(p, 'i4', 500); const plain = await slip(p), rows0 = plain.rows.length;
    await run(p, 9500); const rows = (await slip(p)).rows; await tick(p, 'i5', 0); let v = real ? await said(p) : await quiet(p, 800);
    ok(v.h === plain.h && plain.h === 60 && JSON.stringify(v.box) === JSON.stringify(plain.box) && JSON.stringify(v.btn) === JSON.stringify(plain.btn) && v.btn[3] >= 44, '390 px: with the words or without, the slip is 60 px and Undo keeps its place and 44 px: ' + JSON.stringify([plain.box, v.box, v.btn, v.say]));
    ok(JSON.stringify(v.rows) === JSON.stringify(rows) && rows0 > 0, '390 px: no line on the page moves: ' + JSON.stringify([rows.length, v.rows.length]));
    ok(!(await L.overflow(p)), '390 px: no sideways scroll');
    if (!real) { ok(true, '390 px: Barlow could not load here, so whether the words fit a phone was not measured'); return; }
    ok(v.say === 'Sauce is done. Grill has 1 left.', '390 px, in Barlow: one-word sections fit: ' + v.say);
    await p.context().close();
    // the kitchen's own longer names: Hot larder fits a phone, Salads and dessert does not (it does on a tablet)
    const names = (a, z) => ({ ...phone, extra: { [item('i4')]: line('Make gravy', a, { rolled: 1 }), [item('i5')]: line('Laksa', a), [item('i3')]: line('Portion rump', z, { urgent: true }) } });
    await open(names('Fryers', 'Hot larder')); await barlow(); await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); v = await said(p);
    ok(v.say === 'Fryers are done. Hot larder has 1 left.' && v.h === 60, '390 px, in Barlow: Fryers and Hot larder fit: ' + JSON.stringify([v.say, v.h]));
    await p.context().close();
    await open(names('Grill', 'Salads and dessert')); await barlow(); await tick(p, 'i4'); await run(p, 9500); await tick(p, 'i5', 0); v = await quiet(p, 900);
    ok(v.up && v.msg === 'Ticked Laksa' && !v.say && v.h === 60 && v.kept === null, '390 px, in Barlow: a sentence with Salads and dessert in it is too long for a phone, so it is left out: ' + JSON.stringify([v.say, v.h]));
    // Large and Extra large text: the two lines still fit the 60 px slip
    for (const text of ['large', 'xlarge']) {
      await p.context().close();
      await open({ ...phone, settings: { text } }); await barlow(); await tick(p, 'i4', 500); const big = await slip(p);
      await run(p, 9500); await tick(p, 'i5', 0); v = await said(p);
      ok(v.say === 'Sauce is done. Grill has 1 left.' && v.h === big.h && big.h === 60 && JSON.stringify(v.btn) === JSON.stringify(big.btn), '390 px, in Barlow, ' + text + ' text: the words fit the same 60 px slip: ' + JSON.stringify([v.say, big.h, v.h]));
    }
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
