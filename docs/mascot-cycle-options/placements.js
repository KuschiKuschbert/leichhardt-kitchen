/* Review-only placement mock: puts the mascot's resting Welcome still in one of three Home places.
   Never in the shell. Positions are measured from the real Home after it draws; nothing above moves.
   corner: right end of the heading row. name: just after the person's name, feet on the date line.
   end: standing on the last Home card, after all of Home's work. */
(() => {
  'use strict';
  const still = new URL('../kitchen-mascot/assets/welcome-still.png', document.currentScript.src).href;
  let node = null, why = null;
  function textRight(e) { let r = 0; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { if (!t.textContent.trim()) continue; const g = document.createRange(); g.selectNodeContents(t); for (const q of g.getClientRects()) r = Math.max(r, q.right); } return r; }
  function img(w) { const i = document.createElement('img'); i.src = still; i.alt = ''; i.className = 'mc-place'; i.style.width = w + 'px'; i.style.height = (w * 4 / 3) + 'px'; i.setAttribute('aria-hidden', 'true'); return i; }
  function place(kind) {
    node?.remove(); node = null; why = null;
    const heading = document.querySelector('#rtitle.hm-welcome'), date = document.querySelector('.wall-date'), first = document.querySelector('#hm-day');
    if (!heading || !date || !first) { why = 'no personal Home'; return state(); }
    const main = document.querySelector('#app .wall-main') || heading.parentElement;
    const box = main.getBoundingClientRect(), hb = heading.getBoundingClientRect(), db = date.getBoundingClientRect(), fb = first.getBoundingClientRect();
    const bar = (document.querySelector('.wtop')?.getBoundingClientRect().bottom || 0) + 4, bottom = Math.min(db.bottom + 4, fb.top - 4);
    // Whole-pixel sizes only (half, third or quarter of the 192 x 256 art), the largest that fits.
    const w = kind === 'end' ? (innerWidth >= 768 ? 96 : 64) : [96, 64, 48].find(x => bottom - x * 4 / 3 >= bar), h = (w || 0) * 4 / 3;
    if (!w) { why = 'no room under the top bar'; return state(); }
    node = img(w); node.dataset.place = kind;
    if (kind === 'corner' || kind === 'name') {
      let left = kind === 'corner' ? hb.right - w : Math.max(textRight(heading), textRight(date)) + 16;
      if (kind === 'name' && left + w > hb.right) { why = 'no room after the name'; node = null; return state(); }
      Object.assign(node.style, { position: 'absolute', left: (left - box.left) + 'px', top: (bottom - h - box.top) + 'px', zIndex: 1, pointerEvents: 'none', imageRendering: 'pixelated' });
      if (getComputedStyle(main).position === 'static') main.style.position = 'relative';
      main.append(node);
    } else {
      // After all Home work: a small ledge at the end of Home, right aligned.
      const home = document.querySelector('#main .hm.kb-home') || main;
      const ledge = document.createElement('div'); ledge.className = 'mc-ledge';
      Object.assign(ledge.style, { display: 'flex', justifyContent: 'flex-end', margin: '8px 0 0', gridColumn: '1 / -1' });
      Object.assign(node.style, { display: 'block', imageRendering: 'pixelated' });
      ledge.append(node); home.append(ledge); node = ledge;
    }
    return state();
  }
  function state() { const r = node?.getBoundingClientRect(); return { mounted: !!node, why, rect: r ? { x: r.x, y: r.y + scrollY, width: r.width, height: r.height } : null }; }
  window.LK_MASCOT_PLACE = { place, state, remove() { node?.remove(); node = null; } };
})();
