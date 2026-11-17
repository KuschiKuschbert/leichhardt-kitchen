/* Review-only. A speech bubble for Home's mascot, drawn over the real book (stand-in Firebase, made-up people):
     H1  he says the heading's own greeting: "Hi there, Ann!"
     H2  a line of his own for today's action (each person's shuffled action): "Let's smash it."
     H3  the person's own section from Home's own cards: "Pans today. 1 left on the list."
   Placement, the same for all three: on the welcome row, left of him, its tail pointing at him, never over a word
   of the name, the date or a seasonal ornament (measured like js/mascot.js measures his corner). Where it does not
   fit (a phone with a long greeting, him on the Your day card) there is no bubble: the heading already greets.
   Nothing is saved and nothing is read. */
(() => {
  'use strict';
  if (window.LK_HB) return;
  const LINES = {
    idle: 'Hi there.', welcome: 'Welcome in.', 'look-around': 'Who\u2019s on today?', 'recipe-reading': 'Reading up on today\u2019s recipes.',
    'ready-to-cook': 'Ready when you are.', smash: 'Let\u2019s smash it.', flip: 'Ready to flip.', build: 'Let\u2019s build something good.',
    burger: 'Good food today.', walk: 'Off to the kitchen.', smoker: 'The smoker\u2019s going.'
  };
  let mode = '', forced = '';
  function boxes(el) {
    const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) { if (!t.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(t); out.push(...r.getClientRects()); }
    return out;
  }
  function words() {
    const h = document.querySelector('#rtitle.hm-welcome');
    if (!h) return '';
    if (mode === 'H1') return h.textContent.trim().replace(/[.!]?$/, '!');
    if (mode === 'H2') { const id = 'ann', r = window.LK_MASCOT && window.LK_MASCOT.record ? window.LK_MASCOT.record(id) : null; return LINES[forced || (r && r.today)] || LINES.welcome; }
    if (mode === 'H3') {
      const sec = [...document.querySelectorAll('#hm-day .hm-row, #hm-day li, #hm-day div')].map(e => e.textContent).find(t => /Your section/.test(t)) || '';
      const name = (sec.match(/Your section.*?(?:to \d\d:\d\d)\s*([A-Za-z][A-Za-z ]+)$/) || [])[1] || (document.querySelector('#hm-day') ? 'Pans' : '');
      const row = [...document.querySelectorAll('.hm-sec')].find(a => a.getAttribute('data-hm-sec') === name.trim());
      const left = row ? row.querySelector('.hm-sl').textContent : '';
      return name ? `${name.trim()} today. ${/left/.test(left) ? left.replace(' left', '') + ' left on the list.' : 'Every line ticked.'}` : '';
    }
    return '';
  }
  function place() {
    document.querySelectorAll('.hb-bubble').forEach(e => e.remove());
    const host = document.querySelector('#main.wall-main.mascot-host'), btn = host && host.querySelector('.mascot');
    if (!mode || !btn || btn.hidden || btn.getAttribute('data-spot') === 'card') return;
    const t = words(); if (!t) return;
    const hr = host.getBoundingClientRect(), br = btn.getBoundingClientRect();
    const b = document.createElement('div'); b.className = 'hb-bubble'; b.setAttribute('aria-hidden', 'true'); b.textContent = t; host.appendChild(b);
    // the room: from the last word on his rows to him, less a gap each side
    const top = br.top + 4, bottom = top + b.getBoundingClientRect().height;
    const used = [...document.querySelectorAll('#rtitle, .wall-date, .kb-seasonal, .seasonal')].flatMap(boxes).filter(r => r.bottom > top && r.top < bottom).reduce((m, r) => Math.max(m, r.right), hr.left);
    const room = br.left - 14 - (used + 16);
    b.style.maxWidth = Math.min(340, room) + 'px';
    const w = b.getBoundingClientRect().width, h = b.getBoundingClientRect().height;
    if (room < 120 || w > room + 0.5 || h > 64) { b.remove(); return; }
    b.style.left = (br.left - hr.left - 14 - w) + 'px'; b.style.top = (top - hr.top) + 'px';
  }
  addEventListener('resize', place);
  window.LK_HB = { set(m, f) { mode = m || ''; forced = f || ''; place(); }, place };
})();
