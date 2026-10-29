// Nothing typed in the admin panel goes without asking (28 Oct 2026, keep-typed-work). Sign out of Google and a reload
// ask first over every admin draft (minutes, a ping for everyone or one person, a guide, the order cut-offs, Add several
// names), and a sign-out leaves none of it for the next person. Write new minutes, Start from the team notes, Continue
// draft, Change as a new version, Edit, Use again and Change ask a second tap before another form takes the place of
// one with changes, and the one already open carries on in one tap. The cut-offs' Undo, a minutes action and a guide
// page ask again. A lone Not you? on the head chef's Google device asks first, and takes the drafts left on the device
// like Sign out (29 Oct 2026). A Save with nothing changed is off and saves nothing, and a refused tap leaves it off.
// A new kitchen section with its name typed asks before it goes. The admin Daily reviews form and the wastage page keep their own review.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const next = (new Date(L.NOW).getDay() + 1) % 7;
const png = { name: 'slicer.png', mimeType: 'image/png', buffer: Buffer.from(L.PNG.split(',')[1], 'base64') };
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const extra = Object.assign({}, L.guides(), {
  [fsKey(['notes', 'n1'])]: { text: 'Delivery: Bidfood 09:00', tag: 'delivery', start: today, until: today, dows: [], tm: 1200, removed: false, at: L.NOW - 7200000, upd: L.NOW - 7200000, by: 'sam' },
  // 08:30, so its 30 minutes on screen were over by 14:00
  [fsKey(['notes', 'n2'])]: { text: 'Fish delivery at the back door', tag: 'delivery', start: today, until: today, dows: [], tm: 510, removed: false, at: L.NOW - 21600000, upd: L.NOW - 21600000, by: 'sam' },
  [fsKey(['minutes', 'd1'])]: { no: 2, v: 1, status: 'draft', date: today, decisions: 'Old draft', att: [], acts: [], removed: false, at: L.NOW - 3600000, upd: L.NOW - 3600000 },
  [fsKey(['minutes', 'p1'])]: { no: 1, v: 1, status: 'published', date: L.ymd(new Date(L.NOW - 86400000)), decisions: 'New fryer oil every Monday', att: people.map(p => ({ id: p.id, st: 'present' })), acts: [], removed: false, at: L.NOW - 90000000, upd: L.NOW - 90000000, pubAt: L.NOW - 90000000 },
  [fsKey(['config', 'main'])]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, cutoffs: [{ id: 'pfd', name: 'PFD', dd: [next], at: 15 * 60, pre: 1, lead: 240 }, { id: 'veg', name: 'Veg', dd: [next], at: 17 * 60, pre: 1, lead: 240 }] }
});
const S = (p, f, a) => p.evaluate(f, a);
// a reload or closing the tab: true when the page asks first
const asks = p => p.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
const st = p => p.evaluate(() => { const s = window.LK_PREP.state; return { user: !!s.user, mf: s.mf ? s.mf.decisions : null, nf: s.nf && s.nOpen ? s.nf.text : null, to: s.nf && s.nOpen ? s.nf.to : null, gf: s.gf ? s.gf.title : null, cutDraft: !!s.cutDraft, cut: !!s.cutDraft && JSON.stringify(s.cutDraft) !== s.cutSnap, bulk: s.bulk || '', unsaved: window.LK_PREP.unsaved() }; });
const owner = (b, hash, w) => L.open(b, hash || '#/admin', { admin: true, who: '', extra, wait: 1800, width: w || 390, height: w > 400 ? 900 : 844 });
const shown = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.getClientRects().length); }, sel);
const fits = async (p, label) => { const o = await L.overflow(p); ok(!o, label + ': no sideways scroll' + (o ? ' (' + o + ')' : '')); };
// a button left on by an older page: the save itself must refuse too
const force = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.disabled = false; e.click(); return true; }, sel);
const writesTo = (p, re) => p.evaluate(r => window.__fake.writes.filter(ops => ops.some(o => new RegExp(r).test(o.path))).length, re);
async function safe(label, fn) { try { await fn(); } catch (e) { ok(false, label + ' threw ' + String(e).split('\n')[0]); } }

const DRAFTS = [
  ['minutes', 'minutes', async p => { await p.click('[data-p="mn-new"]'); await L.settle(p, 200); await p.fill('[data-k="mn-decisions"]', 'Fryer roster'); }, s => s.mf === 'Fryer roster'],
  ['a ping for everyone', 'notes', async p => { await p.click('[data-p="n-new"]'); await L.settle(p, 200); await p.fill('[data-k="n-text"]', 'Fryer 2 is out'); }, s => s.nf === 'Fryer 2 is out'],
  ['a ping for Ann, only the person picked', 'notes', async p => { await p.click('[data-p="n-new"]'); await L.settle(p, 200); await p.selectOption('[data-k="n-to"]', 'ann'); }, s => s.to === 'ann'],
  ['a guide', 'guides', async p => { await p.click('[data-p="g-new"]'); await L.settle(p, 200); await p.fill('[data-k="g-title"]', 'Slicer clean'); }, s => s.gf === 'Slicer clean'],
  ['the order cut-offs', 'cutoffs', async p => { await p.click('[data-p="cut-day"][data-i="0"][data-v="' + ((next + 2) % 7) + '"]'); }, s => s.cut],
  ['Add several names', 'people', async p => { await p.fill('[data-k="a-bulk"]', 'Zed\nYan'); }, s => s.bulk === 'Zed\nYan']
];
const READY = { minutes: '[data-p="mn-new"]', notes: '[data-p="n-new"]', guides: '[data-p="g-new"]', cutoffs: '[data-p="cut-day"]', people: '[data-k="a-bulk"]' };

(async () => {
  const b = await L.start();
  let p;

  // Sign out of Google and a reload over each admin draft; the second tap signs out and leaves nothing behind
  for (const w of [390, 768, 1280]) {
    for (const [label, tab, make, kept] of DRAFTS) {
      if (w !== 390 && tab !== 'minutes' && tab !== 'guides') continue;
      const lb = w + ' ' + label;
      await safe(lb, async () => {
        p = await owner(b, '#/admin', w);
        await L.adminTab(p, tab);
        await L.waitFor(p, s => !!document.querySelector(s), READY[tab], 8000);
        await make(p); await L.settle(p, 200);
        ok(await asks(p), lb + ': a reload or closing the tab asks first');
        await p.click('.p-bar [data-p="signout"]'); await L.settle(p, 300);
        const s1 = await st(p);
        ok(s1.user && kept(s1), lb + ': one tap on Sign out of Google keeps the Google account and the draft ' + JSON.stringify(s1));
        ok(/Not saved yet\. Tap Sign out of Google again to sign out\./.test(await txt(p, '.p-toast') || ''), lb + ': the toast says Not saved yet (' + await txt(p, '.p-toast') + ')');
        ok(await txt(p, '.p-bar [data-p="signout"]') === 'Not saved. Tap again', lb + ': the button itself says Not saved. Tap again (' + await txt(p, '.p-bar [data-p="signout"]') + ')');
        if (w !== 390) await fits(p, lb + ' asking');
        await L.tap(p, '.p-bar [data-p="signout"]'); await L.settle(p, 600);
        const s2 = await st(p);
        ok(!s2.user && !s2.unsaved && s2.mf === null && s2.nf === null && s2.gf === null && !s2.cutDraft && s2.bulk === '' && !(await asks(p)), lb + ': the second tap signs out and leaves nothing for the next person ' + JSON.stringify(s2));
        ok(p.errors.length === 0, lb + ': no page errors ' + p.errors.join(' | '));
        await p.context().close();
      });
    }
  }

  // a form open with changes: Write new minutes, Edit, Use again and Change ask before another takes its place
  for (const w of [390, 768, 1280]) {
    await safe(w + ' minutes', async () => {
      p = await owner(b, '#/admin', w);
      await L.adminTab(p, 'minutes'); await L.waitFor(p, () => !!document.querySelector('[data-p="mn-new"]'), null, 8000);
      await p.click('[data-p="mn-new"]'); await L.settle(p, 200);
      await p.fill('[data-k="mn-decisions"]', 'Fryer roster');
      for (const a of ['mn-tpl', 'mn-new']) {
        await p.click('[data-p="' + a + '"]'); await L.settle(p, 200);
        ok((await st(p)).mf === 'Fryer roster' && await txt(p, '[data-p="' + a + '"]') === 'Not saved. Tap again', w + ' minutes: one tap on ' + a + ' keeps what was typed and asks again (' + await txt(p, '[data-p="' + a + '"]') + ')');
      }
      await fits(p, w + ' minutes asking');
      await p.click('[data-p="mn-new"]'); await L.settle(p, 200);
      ok((await st(p)).mf === '' && !(await S(p, () => window.LK_PREP.unsaved())), w + ' minutes: the second tap opens new minutes');
      await p.fill('[data-k="mn-decisions"]', 'Second try');
      await p.click('[data-p="mn-draft-open"][data-id="d1"]'); await L.settle(p, 200);
      ok((await st(p)).mf === 'Second try' && await txt(p, '[data-p="mn-draft-open"][data-id="d1"]') === 'Not saved. Tap again', w + ' minutes: Continue draft asks again');
      await p.click('[data-p="mn-draft-open"][data-id="d1"]'); await L.settle(p, 200);
      ok((await st(p)).mf === 'Old draft', w + ' minutes: the second tap opens the draft');
      await p.fill('[data-k="mn-decisions"]', 'Old draft, and more');
      await p.click('[data-p="mn-draft-open"][data-id="d1"]'); await L.settle(p, 200);
      ok((await st(p)).mf === 'Old draft, and more' && /^Continue draft/.test(await txt(p, '[data-p="mn-draft-open"][data-id="d1"]')), w + ' minutes: Continue draft on the draft already open carries on with its changes in one tap');
      await p.click('[data-p="mn-edit"][data-id="p1"]'); await L.settle(p, 200);
      ok((await st(p)).mf === 'Old draft, and more' && await txt(p, '[data-p="mn-edit"][data-id="p1"]') === 'Not saved. Tap again', w + ' minutes: Change as a new version asks again');
      await fits(p, w + ' register asking');
      await p.click('[data-p="mn-edit"][data-id="p1"]'); await L.settle(p, 200);
      ok((await st(p)).mf === 'New fryer oil every Monday', w + ' minutes: the second tap opens the new version');
      ok(p.errors.length === 0, w + ' minutes: no page errors ' + p.errors.join(' | '));
      await p.context().close();
    });
    await safe(w + ' pings', async () => {
      p = await owner(b, '#/admin', w);
      await L.adminTab(p, 'notes'); await L.waitFor(p, () => !!document.querySelector('[data-p="n-new"]'), null, 8000);
      await p.click('[data-p="n-new"]'); await L.settle(p, 200);
      await p.fill('[data-k="n-text"]', 'Fryer 2 is out');
      await p.click('[data-p="n-edit"][data-id="n1"]'); await L.settle(p, 200);
      ok((await st(p)).nf === 'Fryer 2 is out' && await txt(p, '[data-p="n-edit"][data-id="n1"]') === 'Not saved. Tap again', w + ' pings: Edit keeps the ping being written and asks again');
      await fits(p, w + ' pings asking');
      await p.click('[data-p="n-edit"][data-id="n1"]'); await L.settle(p, 200);
      ok((await st(p)).nf === 'Delivery: Bidfood 09:00', w + ' pings: the second tap opens the listed ping');
      await p.fill('[data-k="n-text"]', 'Delivery: Bidfood 10:00');
      await p.click('[data-p="n-edit"][data-id="n1"]'); await L.settle(p, 200);
      ok((await st(p)).nf === 'Delivery: Bidfood 10:00' && await txt(p, '[data-p="n-edit"][data-id="n1"]') === 'Edit', w + ' pings: Edit on the ping already open carries on with its changes in one tap');
      await p.click('[data-p="n-reuse"][data-id="n2"]'); await L.settle(p, 200);
      ok((await st(p)).nf === 'Delivery: Bidfood 10:00' && await txt(p, '[data-p="n-reuse"][data-id="n2"]') === 'Not saved. Tap again', w + ' pings: Use again asks again');
      await p.click('[data-p="n-reuse"][data-id="n2"]'); await L.settle(p, 200);
      const s = await S(p, () => ({ text: window.LK_PREP.state.nf.text, id: window.LK_PREP.state.nf.id, unsaved: window.LK_PREP.unsaved() }));
      ok(s.text === 'Fish delivery at the back door' && !s.id && !s.unsaved, w + ' pings: the second tap copies the ping, and an untouched copy is nothing typed yet ' + JSON.stringify(s));
      ok(p.errors.length === 0, w + ' pings: no page errors ' + p.errors.join(' | '));
      await p.context().close();
    });
    await safe(w + ' guides', async () => {
      p = await owner(b, '#/admin', w);
      await L.adminTab(p, 'guides'); await L.waitFor(p, () => !!document.querySelector('[data-p="g-new"]'), null, 8000);
      await p.click('[data-p="g-new"]'); await L.settle(p, 200);
      await p.fill('[data-k="g-title"]', 'Slicer clean');
      await p.click('[data-p="g-edit"][data-id="fryer"]'); await L.settle(p, 200);
      ok((await st(p)).gf === 'Slicer clean' && await txt(p, '[data-p="g-edit"][data-id="fryer"]') === 'Not saved. Tap again', w + ' guides: Change keeps the guide being written and asks again');
      await fits(p, w + ' guides asking');
      await p.click('[data-p="g-edit"][data-id="fryer"]'); await L.settle(p, 200);
      ok((await st(p)).gf === 'Fryer oil change', w + ' guides: the second tap opens the listed guide');
      await p.fill('[data-k="g-title"]', 'Fryer oil change, daily');
      // the guide's own page: Change this guide on the guide open with changes carries on with them
      await S(p, () => { location.hash = '#/guides/fryer'; }); await L.waitFor(p, () => !!document.querySelector('[data-p="g-change"]'), null, 5000);
      await p.click('[data-p="g-change"]'); await L.settle(p, 400);
      ok(await S(p, () => location.hash) === '#/admin' && (await st(p)).gf === 'Fryer oil change, daily', w + ' guide page: Change this guide opens the changes not saved yet, in one tap');
      await S(p, () => { location.hash = '#/guides/combi'; }); await L.waitFor(p, () => !!document.querySelector('[data-p="g-change"]'), null, 5000);
      await p.click('[data-p="g-change"]'); await L.settle(p, 300);
      ok(await S(p, () => location.hash) === '#/guides/combi' && (await st(p)).gf === 'Fryer oil change, daily' && await txt(p, '[data-p="g-change"]') === 'Not saved. Tap again', w + ' guide page: Change this guide on another guide asks again (' + await txt(p, '[data-p="g-change"]') + ')');
      await fits(p, w + ' guide page asking');
      await L.tap(p, '[data-p="g-change"]'); await L.settle(p, 400);
      ok(await S(p, () => location.hash) === '#/admin' && /^iCombi/.test((await st(p)).gf || ''), w + ' guide page: the second tap opens that guide');
      ok(p.errors.length === 0, w + ' guides: no page errors ' + p.errors.join(' | '));
      await p.context().close();
    });
    // the cut-offs' Undo throws every change away, so it asks again; left alone it goes back
    await safe(w + ' cut-offs', async () => {
      p = await owner(b, '#/admin', w);
      await L.adminTab(p, 'cutoffs'); await L.waitFor(p, () => !!document.querySelector('[data-p="cut-day"]'), null, 8000);
      await p.click('[data-p="cut-day"][data-i="0"][data-v="' + ((next + 2) % 7) + '"]'); await L.settle(p, 150);
      await p.click('[data-p="cut-day"][data-i="1"][data-v="' + ((next + 3) % 7) + '"]'); await L.settle(p, 150);
      await p.click('[data-p="cut-undo"]'); await L.settle(p, 200);
      ok((await st(p)).cut && await txt(p, '[data-p="cut-undo"]') === 'Tap again to undo', w + ' cut-offs: one tap on Undo keeps both changes and asks again (' + await txt(p, '[data-p="cut-undo"]') + ')');
      await fits(p, w + ' cut-offs asking');
      await p.clock.runFor(4100); await L.settle(p, 200);
      ok((await st(p)).cut && await txt(p, '[data-p="cut-undo"]') === 'Undo unsaved changes', w + ' cut-offs: left alone, Undo goes back and the changes stay');
      await L.tap(p, '[data-p="cut-undo"]'); await L.settle(p, 150);
      await L.tap(p, '[data-p="cut-undo"]'); await L.settle(p, 200);
      ok(!(await st(p)).cut, w + ' cut-offs: the second tap undoes them');
      await p.context().close();
    });
    // the head chef's Google device with nobody on a PIN: a lone Not you? asks first over a typed line
    for (const route of w === 390 ? ['#/prep', '#/orders'] : ['#/prep']) await safe(w + ' Not you? ' + route, async () => {
      p = await owner(b, route, w);
      const k = route === '#/prep' ? 'p-text' : 'o-text';
      // what the head chef's Google account left on the device: a function started (a customer's contact), a recipe and a drawing changed
      await S(p, () => { localStorage.setItem('lk.fe.draft.new', JSON.stringify({ id: 'x', isNew: true, d: { name: 'Smith 50th', cname: 'Jo Smith', phone: '0400 000 000' } })); localStorage.setItem('lk.mg.draft.burger', '{"at":1,"e":{"id":"burger"}}'); localStorage.setItem('lk.dw.draft.burger-plate', '{"at":1,"els":[]}'); });
      await p.fill('[data-k="' + k + '"]', 'Peel garlic'); await L.settle(p, 150);
      await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
      const s = await S(p, k => ({ user: !!window.LK_PREP.state.user, text: (document.querySelector('[data-k="' + k + '"]') || {}).value, admin: localStorage.getItem('lk.admin') }), k);
      ok(s.user && s.text === 'Peel garlic' && s.admin === '1' && await txt(p, '.nb-top [data-p="who-change"]') === 'Not saved. Tap again', w + ' ' + route + ': one tap on Not you? keeps the Google account and the line, and asks again ' + JSON.stringify(s));
      await fits(p, w + ' ' + route + ' Not you? asking');
      await L.tap(p, '.nb-top [data-p="who-change"]'); await L.settle(p, 600);
      ok(await S(p, () => !window.LK_PREP.state.user) && !!(await p.$('.p-name')), w + ' ' + route + ': the second tap signs Google out to Who are you?');
      const left = await S(p, () => ['lk.fe.draft.new', 'lk.mg.draft.burger', 'lk.dw.draft.burger-plate'].filter(k => localStorage.getItem(k)));
      ok(!left.length, w + ' ' + route + ': and takes the function, recipe and drawing drafts with it, like Sign out (left ' + JSON.stringify(left) + ')');
      if (route === '#/prep') {
        // the PIN screen's Not me: nobody is signed in yet, so one tap
        await p.click('.p-name[data-id="ann"]'); await L.settle(p, 400);
        await p.click('[data-p="who-change"]'); await L.settle(p, 300);
        ok(await S(p, () => window.LK_PREP.state.who === '') && !!(await p.$('.p-name')), w + ' PIN screen: Not me goes in one tap');
      }
      ok(p.errors.length === 0, w + ' ' + route + ': no page errors ' + p.errors.join(' | '));
      await p.context().close();
    });
  }

  // a minutes action with words and a guide page ask a second tap to remove; a blank action goes in one
  await safe('rows', async () => {
    p = await owner(b);
    await L.adminTab(p, 'minutes'); await L.waitFor(p, () => !!document.querySelector('[data-p="mn-new"]'), null, 8000);
    await p.click('[data-p="mn-new"]'); await L.settle(p, 200);
    await p.click('[data-p="mn-aadd"]'); await L.settle(p, 150);
    await p.fill('[data-k="mn-aw"][data-i="0"]', 'Order new tongs');
    await p.click('[data-p="mn-arem"][data-i="0"]'); await L.settle(p, 200);
    ok(await S(p, () => window.LK_PREP.state.mf.acts.length) === 1 && await txt(p, '[data-p="mn-arem"][data-i="0"]') === 'Tap again to remove', 'minutes action with words: one tap on Remove keeps it and asks again');
    await L.tap(p, '[data-p="mn-arem"][data-i="0"]'); await L.settle(p, 200);
    ok(await S(p, () => window.LK_PREP.state.mf.acts.length) === 0, 'minutes action: the second tap removes it');
    await p.click('[data-p="mn-aadd"]'); await L.settle(p, 150);
    await p.click('[data-p="mn-arem"][data-i="0"]'); await L.settle(p, 200);
    ok(await S(p, () => window.LK_PREP.state.mf.acts.length) === 0, 'minutes action left blank: Remove takes it in one tap');
    await L.adminTab(p, 'guides'); await L.waitFor(p, () => !!document.querySelector('[data-p="g-new"]'), null, 8000);
    await p.click('[data-p="g-new"]'); await L.settle(p, 200);
    await p.setInputFiles('#g-file', png);
    await L.waitFor(p, () => { const f = window.LK_PREP.state.gf; return f && !f.busy && f.pages && f.pages.length; }, null, 30000);
    await p.click('[data-p="g-prm"][data-i="0"]'); await L.settle(p, 200);
    ok(await S(p, () => window.LK_PREP.state.gf.pages.length) === 1 && await txt(p, '[data-p="g-prm"][data-i="0"]') === 'Tap again to remove', 'guide page: one tap on Remove keeps the page and asks again');
    await fits(p, 'guide page Remove asking');
    await L.tap(p, '[data-p="g-prm"][data-i="0"]'); await L.settle(p, 200);
    ok(await S(p, () => window.LK_PREP.state.gf.pages.length) === 0, 'guide page: the second tap removes it');
    // a new kitchen section with its name typed asks a second tap; a blank one goes in one
    await L.adminTab(p, 'people'); await L.waitFor(p, () => !!document.querySelector('[data-p="ks-add"]'), null, 8000);
    const secs = () => S(p, () => (window.LK_PREP.state.draft.kitSecs || []).length);
    await p.click('[data-p="ks-add"]'); await L.settle(p, 150);
    await p.fill('[data-k="a-ks0"]', 'Pastry'); await L.settle(p, 100);
    await p.click('[data-p="ks-rm"][data-i="0"]'); await L.settle(p, 200);
    ok(await secs() === 1 && await txt(p, '[data-p="ks-rm"][data-i="0"]') === 'Tap again to remove', 'new section with a name: one tap on Remove keeps it and asks again');
    await L.tap(p, '[data-p="ks-rm"][data-i="0"]'); await L.settle(p, 200);
    ok(await secs() === 0, 'new section: the second tap removes it');
    await p.click('[data-p="ks-add"]'); await L.settle(p, 150);
    await p.click('[data-p="ks-rm"][data-i="0"]'); await L.settle(p, 200);
    ok(await secs() === 0, 'new section left blank: Remove takes it in one tap');
    ok(p.errors.length === 0, 'rows: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // nothing to save: Save is off, and a button left on saves nothing either (one page per form)
  await safe('saves minutes draft', async () => {
    p = await owner(b);
    await L.adminTab(p, 'minutes'); await L.waitFor(p, () => !!document.querySelector('[data-p="mn-new"]'), null, 8000);
    await p.click('[data-p="mn-draft-open"][data-id="d1"]'); await L.settle(p, 200);
    ok(await S(p, () => document.querySelector('[data-p="mn-draft"]').disabled), 'minutes draft unchanged: Save draft is off');
    await force(p, '[data-p="mn-draft"]'); await L.settle(p, 400);
    ok(await writesTo(p, '/minutes/d1$') === 0, 'minutes draft unchanged: Save draft saves nothing');
    ok(await S(p, () => document.querySelector('[data-p="mn-draft"]').disabled), 'minutes draft unchanged: the refused tap leaves Save draft off');
    if (await p.$('[data-k="mn-decisions"]')) await p.fill('[data-k="mn-decisions"]', 'Old draft, changed');
    ok(await S(p, () => { const e = document.querySelector('[data-p="mn-draft"]'); return !!e && !e.disabled; }), 'minutes draft: typing turns Save draft on');
    await p.fill('[data-k="mn-decisions"]', 'Old draft');
    ok(await S(p, () => document.querySelector('[data-p="mn-draft"]').disabled), 'minutes draft: back as it was, Save draft is off again');
    ok(p.errors.length === 0, 'saves minutes draft: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });
  await safe('saves new version', async () => {
    p = await owner(b);
    await L.adminTab(p, 'minutes'); await L.waitFor(p, () => !!document.querySelector('[data-p="mn-edit"][data-id="p1"]'), null, 8000);
    await p.click('[data-p="mn-edit"][data-id="p1"]'); await L.settle(p, 200);
    ok(await S(p, () => document.querySelector('[data-p="mn-pub"]').disabled), 'published minutes unchanged: Publish as version 2 is off');
    await force(p, '[data-p="mn-pub"]'); await L.settle(p, 150); await force(p, '[data-p="mn-pub"]'); await L.settle(p, 400);
    ok(await writesTo(p, '/minutes/p1') === 0, 'published minutes unchanged: no new version, so nobody signs again for nothing');
    ok(await S(p, () => document.querySelector('[data-p="mn-pub"]').disabled), 'published minutes unchanged: the refused tap leaves Publish off');
    if (await p.$('[data-k="mn-decisions"]')) await p.fill('[data-k="mn-decisions"]', 'New fryer oil every Monday and Thursday');
    ok(await S(p, () => { const e = document.querySelector('[data-p="mn-pub"]'); return !!e && !e.disabled; }), 'published minutes: typing turns Publish on');
    await p.fill('[data-k="mn-decisions"]', 'New fryer oil every Monday');
    ok(await S(p, () => document.querySelector('[data-p="mn-pub"]').disabled), 'published minutes: back as it was, Publish is off again');
    await p.context().close();
  });
  await safe('saves ping', async () => {
    p = await owner(b);
    await L.adminTab(p, 'notes'); await L.waitFor(p, () => !!document.querySelector('[data-p="n-edit"][data-id="n2"]'), null, 8000);
    await p.click('[data-p="n-edit"][data-id="n2"]'); await L.settle(p, 200);
    ok(await S(p, () => document.querySelector('[data-p="n-save"]').disabled), 'ping unchanged: Save changes is off');
    await force(p, '[data-p="n-save"]'); await L.settle(p, 400);
    ok(await writesTo(p, '/notes/n2$') === 0 && await S(p, k => window.__fake.dump()[k].upd, fsKey(['notes', 'n2'])) === L.NOW - 21600000, 'ping unchanged: Save changes saves nothing, so it does not pop up again on every phone');
    ok(await S(p, () => document.querySelector('[data-p="n-save"]').disabled), 'ping unchanged: the refused tap leaves Save changes off');
    if (await p.$('[data-k="n-text"]')) await p.fill('[data-k="n-text"]', 'Fish delivery at the front');
    ok(await S(p, () => { const e = document.querySelector('[data-p="n-save"]'); return !!e && !e.disabled; }), 'ping: typing turns Save changes on');
    await p.fill('[data-k="n-text"]', 'Fish delivery at the back door');
    ok(await S(p, () => document.querySelector('[data-p="n-save"]').disabled), 'ping: back as it was, Save changes is off again');
    await p.context().close();
  });
  await safe('saves guide', async () => {
    p = await owner(b);
    await L.adminTab(p, 'guides'); await L.waitFor(p, () => !!document.querySelector('[data-p="g-edit"][data-id="fryer"]'), null, 8000);
    await p.click('[data-p="g-edit"][data-id="fryer"]'); await L.settle(p, 200);
    ok(await S(p, () => document.querySelector('[data-p="g-save"]').disabled), 'guide unchanged: Save changes is off');
    await force(p, '[data-p="g-save"]'); await L.settle(p, 400);
    ok(await writesTo(p, '/guides/fryer$') === 0, 'guide unchanged: Save changes saves nothing');
    ok(await S(p, () => document.querySelector('[data-p="g-save"]').disabled), 'guide unchanged: the refused tap leaves Save changes off');
    if (await p.$('[data-k="g-title"]')) await p.fill('[data-k="g-title"]', 'Fryer oil change, daily');
    ok(await S(p, () => { const e = document.querySelector('[data-p="g-save"]'); return !!e && !e.disabled; }), 'guide: typing turns Save changes on');
    await p.fill('[data-k="g-title"]', 'Fryer oil change');
    ok(await S(p, () => document.querySelector('[data-p="g-save"]').disabled), 'guide: back as it was, Save changes is off again');
    await p.context().close();
  });
  await safe('saves people', async () => {
    p = await owner(b);
    await L.adminTab(p, 'people'); await L.waitFor(p, () => !!document.querySelector('[data-p="a-save"]'), null, 8000);
    await L.settle(p, 300);
    const cfgWrites = await writesTo(p, '/config/main$');
    await force(p, '[data-p="a-save"]'); await L.settle(p, 400);
    ok(await writesTo(p, '/config/main$') === cfgWrites && !/Saved/.test(await txt(p, '.a-savebar .saved') || ''), 'People unchanged: Save changes saves nothing');
    ok(await S(p, () => document.querySelector('[data-p="a-save"]').disabled), 'People unchanged: the refused tap leaves Save changes off');
    ok(p.errors.length === 0, 'saves people: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // the wastage page's review and the admin Daily reviews form are two drafts: the form's day arrows keep the page's
  await safe('review', async () => {
    p = await owner(b, '#/waste');
    await L.waitFor(p, () => !!document.querySelector('.w-review #w-ra'), null, 8000);
    await p.fill('.w-review #w-ra', 'Too much rice cooked');
    await S(p, () => { location.hash = '#/admin'; }); await L.settle(p, 500);
    await L.adminTab(p, 'waste');
    await L.waitFor(p, () => !!document.querySelector('[data-p="wh-view"][data-v="reviews"]'), null, 8000);
    await p.click('[data-p="wh-view"][data-v="reviews"]');
    await L.waitFor(p, () => !!document.querySelector('.a-rvform #w-ra'), null, 8000);
    ok(await p.inputValue('.a-rvform #w-ra') === '', 'Daily reviews: today\'s form shows the saved review, not the words typed on the wastage page');
    await p.click('[data-p="rv-day"][data-d="-1"]'); await L.settle(p, 200);
    ok(await S(p, () => window.LK_PREP.state.wpA) === 'Too much rice cooked', 'Daily reviews: a day arrow keeps the review typed on the wastage page');
    await p.fill('.a-rvform #w-ra', 'Mash made too early');
    await p.click('[data-p="wh-review-cancel"]'); await L.settle(p, 200);
    ok(await p.inputValue('.a-rvform #w-ra') === 'Mash made too early' && await txt(p, '[data-p="wh-review-cancel"]') === 'Tap again to discard', 'Daily reviews: one tap on Cancel edits keeps the words and asks again');
    await fits(p, 'Daily reviews asking');
    await p.click('[data-p="wh-review-cancel"]'); await L.settle(p, 200);
    ok(await p.inputValue('.a-rvform #w-ra') === '', 'Daily reviews: the second tap cancels the edits');
    await S(p, () => { location.hash = '#/waste'; }); await L.waitFor(p, () => !!document.querySelector('.w-review #w-ra'), null, 8000);
    ok(await p.inputValue('.w-review #w-ra') === 'Too much rice cooked', 'wastage page: the review typed there is still in its box');
    ok(p.errors.length === 0, 'review: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
