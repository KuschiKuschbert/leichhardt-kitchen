/* Review-only injection into the real app for the mascot cheer designs. Never in the shell, never loaded by
   the live book. Needs cheer-core.js first.

   A finish line is worked out from two readings of the page the app drew, before and after a tick the app
   answered on its slip, and it is only said once nothing is waiting to be sent. An ordinary tick, an untick,
   a failure and a line that is Not sent never cheer.

   A  The slip speaks: the docket slip that already answers the tick carries the mascot's head and one more
      sentence. Nothing else on the page changes.
   B  He waits at the edges: never during the work. A note in Home's prep card, a card under a finished
      list, and a host on an empty page.
   C  The star on the bar: the mascot's head rides the progress bars the book already draws, and winks with
      a small flag when a bar is full.
   R  The recommendation after round 2, step 1: B cut down to one compact card under a finished list. The
      mascot stands beside the book's own sentence, the finish is said once, and the page keeps its length.
   S  Step 2, for later: R plus A's sentence on the slip at a finished section, words only, one line, and
      dropped whenever it would make the slip taller than today's.
   M  The mix the council's first round pointed to: A's sentence on the slip with no art when a section
      is finished, and B's edges (the card under a finished list, the note in Home's prep card, the host on
      an empty page). No bars. One voice for each finish line. */
(() => {
  'use strict';
  const C = window.LK_CHEER_CORE, el = C.el;
  let design = null, observer = null, syncing = false, lastRoute = null, last = null, cheer = null, ackTimer = null, live = null, waiting = false;
  const kept = new Map(), said = [], once = new Set(); let opts = {};
  // From the council's first round: a section of one line is finished by an ordinary tick, so it is not a
  // finish line; and a finish line is said once a kitchen day on this device, even if a line is added and
  // ticked again later. (The preview keeps this in the page's memory; an implementation keeps it in lk.*.)
  const onceKey = m => day() + '|' + (m.kind === 'section' ? 'section:' + m.name : m.kind === 'list' ? 'list:' + m.what : '');
  function worth(m) { if (!m) return null; if (m.kind === 'section' && m.total < 2) return null; if (m.kind !== 'mine' && once.has(onceKey(m))) return null; return m; }
  // Nothing waiting to be sent: the book's own answer (every write is pending until the server answers).
  const sent = () => !(window.LK_PREP && window.LK_PREP.unsent && window.LK_PREP.unsent());
  function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  const day = () => (window.LK_TIME && window.LK_TIME.day && window.LK_TIME.day()) || '';

  /* The words. Each names the thing and its count, so it is true or it is not said. No speed, no person,
     no "great job". The variant is picked from the kitchen day and the section, never at random, so a
     test can pin it and the same finish line reads the same on every screen. */
  const LINES = {
    // A finished section says what is next: the first section that still has lines.
    section: [m => `${m.name} is done. ${m.next.name} has ${m.next.left} left.`, m => `${m.name} is done. ${m.left} to go today.`],
    prep: [m => `Prep is done. ${m.done} of ${m.total}.`, m => `Every line ticked. ${m.done} of ${m.total}.`],
    orders: [m => `Every line ordered. ${m.done} of ${m.total}.`],
    mine: [() => 'Started and finished.']
  };
  function words(m) {
    if (design === 'S' && m.kind === 'section') return m.next ? `${m.name} is done. ${m.next.name} has ${m.next.left} left.` : `${m.name} is done.`;
    if ((design === 'R' || design === 'S') && m.kind === 'list') return m.what === 'orders' ? `Every line ordered. ${m.done} of ${m.total}.` : `Every line ticked. ${m.done} of ${m.total}.`;
    const set = m.kind === 'section' ? (m.next ? LINES.section : LINES.section.slice(1)) : m.kind === 'mine' ? LINES.mine : LINES[m.what] || LINES.prep; return set[hash(day() + '|' + (m.name || m.what || m.kind) + '|' + (m.total || 0)) % set.length](m); }

  // A node that outlives the app's redraws: the app replaces its markup on every tick, so the sprite is
  // moved into the new markup instead of being made (and played) again.
  function keep(key, make) { let n = kept.get(key); if (!n) { n = make(); n.dataset.ckKey = key; kept.set(key, n); } n._used = true; return n; }
  function sweep() { for (const [k, n] of kept) { if (n._used) { n._used = false; continue; } if (n._sp) n._sp.dispose(); n.remove(); kept.delete(k); } }
  function art(cls, crop, rest) { const h = el('span', cls); h.setAttribute('aria-hidden', 'true'); h._sp = C.sprite(h, { crop, rest: rest || 'welcome-still.png', onFail: () => h.classList.add('ck-no-art') }); h._sp.rest(); return h; }
  const head = px => art('ck-head ck-head-' + px, 'head');
  const body = (px, rest) => art('ck-body ck-body-' + px, 'body', rest);
  function place(node, parent, before) { if (node.parentElement !== parent || (before && node.nextSibling !== before)) parent.insertBefore(node, before || null); }
  function announce(text) { let n = document.querySelector('#ck-live'); if (!n) { n = el('div', 'visually-hidden'); n.id = 'ck-live'; n.setAttribute('aria-live', 'polite'); document.body.append(n); } n.textContent = text; }
  function shown(c, where, onScreen) { if (c.shown) return false; c.shown = true; if (c.m.kind !== 'mine') once.add(onceKey(c.m)); said.push({ text: onScreen || c.text, kind: c.m.kind, name: c.m.name || '', where, design }); announce(onScreen || c.text); return true; }

  function snap() { const s = C.prepState(); return s ? { kind: s.kind, done: s.done, total: s.total, mine: s.mine, ticked: s.ticked, sections: s.sections.map(x => ({ name: x.name, done: x.done, total: x.total })) } : null; }
  // The owner's own example: a line this person marked On it, now ticked by them. Smaller than a finish line.
  function started(before, after, s) { if (!s || s.bad || !/^Ticked /.test(s.msg)) return null; const id = after.ticked.find(x => !before.ticked.includes(x) && before.mine.includes(x)); return id ? { kind: 'mine', id } : null; }

  /* A: the slip is the speech bubble. Only on the slip that answered the finishing tick, only while it is up. */
  function paintSlip(s, art) {
    if (!live || !s || s.bad || s.msg !== live.msg) return;
    if ((design === 'M' || design === 'S') && live.m.kind !== 'section') return;      // in the mix a finished list speaks under the list, not on the slip
    const t = s.el; t.classList.add('ck-slip'); t.classList.toggle('ck-slip-words', !art);
    const h = art ? keep('slip-head', () => head(48)) : null; if (h) place(h, t, t.firstChild === h ? null : t.firstChild);
    let say = t.querySelector(':scope > .ck-say');
    if (!say) { say = el('span', 'ck-say', live.text); t.append(say); }
    if (design === 'S') {
      // Never taller than today's slip: one line only, and no sentence at all when the ticked name already wraps.
      t.classList.add('ck-slip-one'); say.style.display = 'none'; const h0 = t.offsetHeight; say.style.display = '';
      if (t.offsetHeight > h0 + 0.5 || say.scrollWidth > say.clientWidth + 0.5) { say.remove(); t.classList.remove('ck-slip', 'ck-slip-words', 'ck-slip-one'); if (!live.shown) { cheer = null; live = null; } return; }
    }
    if (shown(live, 'slip') && h && live.m.kind !== 'mine') h._sp.play('burger');
  }

  /* C: the head sits at the fill point of each bar. It moves when the bar fills and winks at the end. */
  function paintBars(flags) {
    const rows = [], p = C.prepState(), hm = C.homeState();
    if (p) p.sections.forEach(x => rows.push({ key: 'prep:' + x.name, row: x.el, name: x.name, cheer: true }));
    if (hm) hm.sections.forEach(x => rows.push({ key: 'home:' + x.name, row: x.el, name: x.name }));
    rows.forEach(r => {
      const bar = r.row.querySelector('.nb-hbar'), fill = bar && bar.querySelector('i'); if (!bar || !fill) return;
      const pct = Math.max(0, Math.min(1, (parseFloat(fill.style.width) || 0) / 100));
      r.row.classList.add('ck-row');
      const h = keep('bar:' + r.key, () => head(24)), moved = h.parentElement !== r.row;
      place(h, r.row);
      const lo = bar.offsetLeft - 12, hi = bar.offsetLeft + bar.offsetWidth - 20, x = Math.round(Math.max(lo, Math.min(hi, bar.offsetLeft + bar.offsetWidth * pct - 12)));
      h.style.top = Math.round(bar.offsetTop + bar.offsetHeight / 2 - 12) + 'px';
      if (moved && h.style.left) void h.offsetWidth;        // the app redrew the row: start the slide from where the head was
      h.style.left = x + 'px';
      h.dataset.pct = String(Math.round(pct * 100));
      if (pct < 1) { h._winked = false; h._for = null; return; }
      if (!h._winked) { if (r.cheer && live) { h._winked = true; h._for = live; h._sp.play('burger'); if (flags) shown(live, 'bar', r.name + ' done'); } else if (!cheer) h._winked = true; }
      if (flags && r.cheer && live && h._for === live) {
        const f = keep('flag:' + r.key, () => { const b = C.bubble(r.name + ' done', { tail: 'right' }); b.classList.add('ck-flag'); return b; });
        place(f, r.row); f.style.right = Math.round(r.row.clientWidth - x + 9) + 'px';
      }
    });
  }
  /* C: when the whole list is done the head stands in the notebook header beside the count, in spare
     space only. The header keeps its height: the head is laid over it, never in its flow. */
  function paintHeader() {
    const st = C.prepState(); if (!st || !st.total || st.done !== st.total) return;
    const ph = st.el.closest('.nb-ph'), title = ph && ph.querySelector('.nb-title'), date = ph && ph.querySelector('.nb-date'); if (!ph || !title) return;
    const R = e => e.getBoundingClientRect(), p = R(ph), b = R(st.el), range = document.createRange();
    range.selectNodeContents(title); let right = range.getBoundingClientRect().right; if (date) { range.selectNodeContents(date); right = Math.max(right, range.getBoundingClientRect().right); }
    if (b.left - right < 60) return;                       // no spare space: the count and the title win
    ph.classList.add('ck-ph');
    const h = keep('header-head', () => head(48)); place(h, ph);
    h.style.left = Math.round((right + b.left) / 2 - 24 - p.left) + 'px';
    h.style.top = Math.round(Math.max(4, Math.min(p.height - 52, b.top + b.height / 2 - 24 - p.top))) + 'px';
    if (!h._winked) { if (live && live.m.kind === 'list') { h._winked = true; h._sp.play('burger'); if (design === 'C') shown(live, 'header'); } else if (!cheer) h._winked = true; }
  }

  /* B: a note in Home's prep card. One true line from what the card already shows. */
  function paintHomeNote() {
    const hm = C.homeState(); if (!hm || hm.el.hidden || !hm.total) return;
    const list = hm.el.querySelector('.hm-secs'); if (!list) return;
    const mine = (document.querySelector('#hm-day [data-hm-priority="section"] .hm-day-value')?.textContent || '').trim().toLowerCase();
    const my = hm.sections.find(x => x.name.toLowerCase() === mine), left = hm.total - hm.done;
    const next = hm.sections.find(x => x.left);
    const text = !left ? [`Prep is done. ${hm.done} of ${hm.total}.`] : my && my.left ? [`You are on ${my.name}. ${my.left} to go.`] : my ? [`${my.name} is done. ${next.name} has ${next.left} left.`] : [`${left} to go today.`];
    const n = keep('home-note', () => { const d = el('div', 'ck-note'); d.append(head(48)); return d; });
    const key = text.join('|'); if (n.dataset.text !== key) { n.dataset.text = key; n.querySelector('.ck-bubble')?.remove(); n.append(C.bubble(text, { tail: 'left' })); }
    place(n, hm.el, list);
  }
  /* B: the page's own quiet places. When the list is done and every tick has reached the server, the
     mascot stands under it with the count, above the book's own sentence. An empty list gets the mascot
     beside the book's own sentence and no new words. Nothing shows while lines are left. */
  function paintEndNote() {
    const st = C.prepState(), bodyEl = st ? st.el.closest('.nb-ph')?.parentElement?.querySelector('.nb-body') : document.querySelector('.nb-body'); if (!bodyEl) return;
    // The book's own sentence for a list the server answered with nothing on it (never the no-signal note).
    const empty = bodyEl.querySelector(':scope > .nb-empty:not([role="status"])');
    if (!st || !st.total) { if (!empty) return; const n = keep('end-empty', () => { const d = el('div', 'ck-note ck-note-empty'); d.append(body(64, 'look-around-still.png')); return d; }); place(n, bodyEl, empty); return; }
    const left = st.total - st.done, isOrders = st.kind === 'orders';
    if (left) return;
    if (!kept.has('end-done') && !sent()) { waiting = true; return; }          // not said until the server has every tick
    const text = isOrders ? `Every line ordered. ${st.done} of ${st.total}.` : `Prep is done. ${st.done} of ${st.total}.`;
    const n = keep('end-done', () => { const d = el('div', 'ck-note ck-note-done'); d.append(body(96, 'burger-still.png'), C.bubble(text, { tail: 'left' })); return d; });
    place(n, bodyEl, empty || null);
    if (!n._played) { if (live && live.m.kind === 'list') { shown(live, 'end-note', text); if (!bodyEl.querySelector('li.nb-row')) { n._played = true; n.firstChild._sp.play('burger', 'burger-still.png'); } } else if (!cheer) n._played = true; }
  }
  /* R and S: one compact card where the book itself says the list is finished, once the server has every
     tick. It is the list's state, so it shows on every device and after a reload, as a still. The clip
     plays once, on the device whose tick finished the list, after the ticked lines have left. The book's
     own sentence moves in beside him and keeps only its second half, so the finish is said once. */
  function paintCard() {
    const st = C.prepState(), bodyEl = st ? st.el.closest('.nb-ph')?.parentElement?.querySelector('.nb-body') : null;
    if (!st || !bodyEl || !st.total || st.done !== st.total) return;
    const card0 = kept.get('card'), empty = bodyEl.querySelector(':scope > .nb-empty:not([role="status"])') || (card0 && card0.isConnected ? card0.querySelector('.nb-empty') : null);
    if (!card0 && !sent()) { waiting = true; return; }
    const text = st.kind === 'orders' ? `Every line ordered. ${st.done} of ${st.total}.` : `Every line ticked. ${st.done} of ${st.total}.`;
    const n = keep('card', () => { const d = el('div', 'ck-card'), col = el('div', 'ck-card-words'); col.append(C.bubble(text, { tail: 'left', tone: 'done' })); d.append(body(64, 'burger-still.png'), col); return d; });
    const col = n.querySelector('.ck-card-words'), bub = col.querySelector('.ck-bubble .ck-line');
    if (bub.textContent !== text) bub.textContent = text;
    if (!empty) { if (n.parentElement !== bodyEl) bodyEl.append(n); }
    else if (empty.parentElement !== col) { col.querySelectorAll('.nb-empty').forEach(x => x.remove()); place(n, bodyEl, empty); col.append(empty); }
    else if (n.parentElement !== bodyEl) bodyEl.append(n);
    const cut = !empty ? '' : empty.textContent.replace(/^Everything on (this|today's) list is ticked off\.\s*/, ''); if (empty && cut !== empty.textContent) { empty.textContent = cut; if (!cut) empty.hidden = true; }
    if (!n._played) { if (live && live.m.kind === 'list') { shown(live, 'card', text); if (!bodyEl.querySelector('li.nb-row')) { n._played = true; n.firstChild._sp.play('burger', 'burger-still.png'); } } else if (!cheer) n._played = true; }
  }

  /* The daily action the owner already chose sits in Home's heading corner. Shown here at rest, for place. */
  function paintCorner() {
    const h = document.querySelector('#rtitle.hm-welcome'); if (!h || !C.who()) return;
    // Measure the name's own words only (never the mascot laid over the heading): a long name wins.
    const r = h.getBoundingClientRect(), range = document.createRange(); let right = 0;
    for (const t of h.childNodes) if (t.nodeType === 3 && t.textContent.trim()) { range.selectNodeContents(t); for (const q of range.getClientRects()) right = Math.max(right, q.right); }
    if (right > r.right - 64 - 12) return;
    h.classList.add('ck-anchor'); place(keep('corner', () => { const b = body(64); b.classList.add('ck-corner'); return b; }), h);
  }

  // A fail-safe for a preview that follows the app's redraws: if the page ever redraws in a loop, the
  // mascot takes itself off the page instead of holding it up.
  let burst = 0, burstAt = 0, storm = false;
  function sync() {
    if (syncing || !design) return;
    const t = performance.now(); if (t - burstAt > 1000) { burstAt = t; burst = 0; }
    if (++burst > 80) { storm = true; const d = design; remove(); console.error('LK_CHEER stopped: redraw loop in design ' + d); return; }
    syncing = true;
    try {
      const route = location.hash || '#/';
      if (route !== lastRoute) { lastRoute = route; last = null; cheer = null; }
      const cur = snap(), s = C.slip();
      if (cur && last && cur.kind === last.kind) {
        if (cur.done > last.done) { const m = worth(C.milestone(last, cur, s)) || (opts.mine && design === 'A' ? started(last, cur, s) : null); cheer = m ? { m, msg: s.msg, text: words(m), shown: false } : null; }
        else if (cur.done < last.done) cheer = null;         // an untick or Undo: the finish line is not true any more
      }
      if (cur) last = cur;
      // Wait for the server's answer. A line that is Not sent is never cheered.
      clearTimeout(ackTimer); waiting = !!(cheer && !cheer.shown && !sent());
      live = cheer && (cheer.shown || sent()) ? cheer : null;
      if (design === 'A' || design === 'M') paintSlip(s, design === 'A');
      if (design === 'B' || design === 'M') { paintHomeNote(); paintEndNote(); }
      if (design === 'C') { paintBars(true); paintHeader(); }
      if (design === 'S') paintSlip(s, false);
      if (design === 'R' || design === 'S') paintCard();
      paintCorner();
      sweep();
      if (waiting) ackTimer = setTimeout(sync, 300);
    } finally { syncing = false; }
  }
  function install(next, o) {
    if (!['A', 'B', 'C', 'M', 'R', 'S'].includes(next)) return false;
    remove(); design = next; opts = o || {}; last = snap(); lastRoute = location.hash || '#/';
    observer = new MutationObserver(sync); observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', sync); sync(); return true;
  }
  function remove() {
    design = null; cheer = null; live = null; last = null; clearTimeout(ackTimer);
    if (observer) observer.disconnect(); observer = null; window.removeEventListener('hashchange', sync);
    for (const [, n] of kept) { if (n._sp) n._sp.dispose(); n.querySelectorAll('.ck-head, .ck-body').forEach(x => x._sp && x._sp.dispose()); n.remove(); } kept.clear();
    document.querySelectorAll('.ck-slip').forEach(x => x.classList.remove('ck-slip')); document.querySelectorAll('.ck-say').forEach(x => x.remove());
  }
  const spriteOf = n => (n._sp || n.querySelector('.ck-head, .ck-body')?._sp)?.state() || null;
  window.LK_CHEER = { install, remove, sync, words, state: () => ({ design, storm, sent: sent(), cheer: cheer ? { text: cheer.text, shown: cheer.shown, kind: cheer.m.kind, name: cheer.m.name || '' } : null, said: said.slice(), kept: [...kept.keys()], sprites: Object.fromEntries([...kept].map(([k, n]) => [k, spriteOf(n)])), requests: C.requests.slice() }) };
})();
