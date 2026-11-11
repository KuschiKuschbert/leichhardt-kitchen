/* Review-only (second drawing, after round 1). Draws the wide-screen designs on the real book:
     A  words first: the two finished states say it large, no new art
     B  the finished page is his: the same large words, and he stands under them at full size
     C  he comes to the finish beside the page: in the gutter, only while there is a finish to say
     M  the mix: B in the page, and C's arrival beside the page for a section finished on the All list
     H  Home only, drawn apart: he stands in the empty room under the cards
     P  the blend round 2 asked for: B's scene with A's proportion (half size under full-size words on a finished
        section's tab, full size for the whole finished list)
   It changes no kitchen data. A finished section is worked out from the day's lines the stand-in holds (a build would
   use the book's own secLines() and secNext()); the finished list is the card the book already drew (.nb-fin).
   Nothing shows under 900 px wide. One size for both finished states on a screen, by the room in view: full (from
   1280 px wide), half, or nothing new. The words never wait for his file or his art, and stay away with no signal. */
(() => {
  'use strict';
  if (window.LK_DESK) return;
  let design = '', queued = false, busy = false;
  const mem = { next: {}, sprites: {}, played: {}, perchSay: '', log: [] };
  const M = () => (window.LK_MASCOT && typeof window.LK_MASCOT.sprite === 'function' ? window.LK_MASCOT : null);
  const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const half = () => innerWidth >= 900, full = () => innerWidth >= 1280;
  const sizeSet = k => { const r = document.documentElement; r.classList.toggle('dk-full', k === 'full'); r.classList.toggle('dk-half', k === 'half'); return k; };
  // One size for both finished states on a screen, by the room in view: full (from 1280 px wide), half, or none.
  // The room is the list page's body as far as the window shows it. It must hold the taller of the two scenes (two
  // lines of words, the gap, him at that size, the margins) and one ticked line still lingering above it.
  function level() {
    const body = document.querySelector('.nb-left .nb-body');
    if (!body || !half()) return '';
    const r = body.getBoundingClientRect(), rem = parseFloat(getComputedStyle(document.documentElement).fontSize), room = Math.min(r.bottom, innerHeight) - r.top;
    const want = (font, pad, him) => 2 * 1.2 * font * rem + pad + 16 + him + 1.8 * rem + 3.75 * rem;
    return full() && room >= want(2.5, 32, 256) ? 'full' : room >= want(1.75, 24, 128) ? 'half' : '';
  }
  // P only. Words first: one size of words for both finished states on a screen, from the room in view above the slip.
  // Then the largest mascot that still fits with those words, then none. On a section's tab he is 96 x 128 at most.
  const P_CLS = ['dk-w40', 'dk-w28', 'dk-f192', 'dk-f96', 'dk-f64', 'dk-f0'];
  function fitP() {
    const root = document.documentElement, body = document.querySelector('.nb-left .nb-body'), sc = body && body.querySelector('.dk-stage, .nb-fin');
    const set = (w, f) => { P_CLS.forEach(c => root.classList.remove(c)); if (w) { root.classList.add('dk-w' + w, 'dk-f' + f); } return w; };
    if (!sc || !half()) return set(0);
    const r = body.getBoundingClientRect(), rem = parseFloat(getComputedStyle(root).fontSize), room = Math.min(r.bottom, innerHeight - 80) - r.top;
    const linger = 3.75 * rem;                                             // one ticked line still above the finished-list card
    const say = f => 2 * 1.2 * f * rem + (f > 2 ? 32 : 24) + 1.8 * rem;    // two lines of words in their shape, and the margins
    const note = 10 + 1.5 * rem;                                           // the page's pointer, under the words when he is not there
    const w = full() && room >= say(2.5) + note + linger ? 40 : room >= say(1.75) + note + linger ? 28 : 0;
    if (!w) return set(0);
    // then the largest mascot that still fits with those words, measured, then none
    const list = sc.classList.contains('nb-fin');
    const noArt = list ? (a => !a || !a.firstElementChild || a.firstElementChild.hidden)(sc.querySelector('.nb-fin-art')) : sc.classList.contains('dk-words');   // his art is not there (yet): the words stand alone
    // with him under the list's words, room is kept for the ticked line that still lingers above the card
    const fits = f => sc.getBoundingClientRect().height + 1.8 * rem + (list && f ? linger : 0) <= room && body.scrollHeight - body.clientHeight <= 0;
    for (const ww of w === 40 ? [40, 28] : [28]) {       // a long name that will not fit at the screen's size of words drops a size
      for (const f of noArt ? [0] : list ? [192, 96, 64, 0] : [96, 0]) { set(ww, f); if (fits(f)) return ww; }
    }
    return set(0);
  }
  function fitSize() {
    if (design === 'P') { sizeSet(''); return fitP(); }
    const body = document.querySelector('.nb-left .nb-body'), k = sizeSet(level());
    // a last check: whatever the sum says, the scene never adds a scroll to the list page
    return k && body && body.scrollHeight - body.clientHeight > 0 ? sizeSet('') : k;
  }
  function need(cb) { if (M()) return cb(); if (busy) return; busy = true; window.LK_APP.load('js/mascot.js?v=2').then(() => { busy = false; cb(); }, () => { busy = false; }); }
  // one sprite per place, moved into each redraw so a play is never cut or started again
  function art(key) { let s = mem.sprites[key]; if (!s) { s = M().sprite(); const host = el('span', 'dk-art'); host.setAttribute('aria-hidden', 'true'); host.appendChild(s.el); mem.sprites[key] = s = { sp: s, host }; } return s; }
  function playOnce(key, clip, token) { if (mem.played[key] === token) return; const s = art(key); if (s.sp.play(clip)) { mem.played[key] = token; mem.log.push({ key, clip, token }); } }
  const slipEl = () => document.querySelector('.p-toasts .p-toast[data-toast="new"]');
  const slip = () => { const t = slipEl(), s = t && t.querySelector('.p-toast-say'); return s ? s.textContent : ''; };
  const tabName = () => { const t = document.querySelector('.nb-tab[aria-pressed="true"]'); return t ? t.getAttribute('data-v') || '' : ''; };
  const many = n => /[^s]s$/i.test(n) || /\s(and|&)\s/i.test(n);
  const rowsUp = () => !!document.querySelector('.nb-left .nb-rows .nb-row');
  // no signal, or something not sent yet: the finished words wait, and today's plain words stay
  const quiet = () => navigator.onLine === false || !!document.querySelector('.nb-unsent') || (b => !!b && !b.hidden && /^(No signal|Not sent yet)/.test(b.textContent.trim()))(document.querySelector('.p-sync'));
  function lines() { try { const d = window.__fake.dump(); return Object.keys(d).filter(k => /\/days\/[^/]+\/items\/[^/]+$/.test(k)).map(k => d[k]).filter(x => x && !x.deleted && !x.fn); } catch (e) { return []; } }
  // A finished section, as a state: 2 or more lines, every one ticked. What is next follows the list on every draw.
  function section(tab) {
    const all = lines(), mine = all.filter(x => x.station === tab || (Array.isArray(x.also) && x.also.includes(tab)));
    if (mine.length < 2 || mine.some(x => !x.done)) return null;
    const open = n => all.filter(x => !x.done && x.station === n).length;
    let name = mem.next[tab] && open(mem.next[tab]) ? mem.next[tab] : '';
    if (!name) name = (mem.order || []).concat([...document.querySelectorAll('.nb-tab')].map(t => t.getAttribute('data-v') || '')).find(v => v && v !== '@fn' && v !== tab && open(v)) || '';
    if (!name && all.some(x => !x.done)) return null;   // lines are left but no section can be named: plain words stay, as the slip stays silent
    return [tab + (many(tab) ? ' are' : ' is') + ' done.', name ? name + (many(name) ? ' have ' : ' has ') + open(name) + ' left.' : ''];
  }
  function fill(b, parts) { const t = parts.filter(Boolean).join('\n'); if (b.dataset.say === t) return; b.dataset.say = t; b.textContent = ''; parts.filter(Boolean).forEach(x => b.appendChild(el('span', '', x))); }
  const halves = t => { const m = /^(.*? (?:is|are) done\.)\s*(.*)$/.exec(t || ''); return m ? [m[1], m[2]] : [t || '', '']; };

  function paintStage() {   // A, B, M: a finished section on its own tab
    const body = document.querySelector('.nb-left .nb-body'), empty = body && [...body.children].find(e => e.classList.contains('nb-empty') && /^Nothing left to do in /.test(e.textContent));
    const tab = tabName(), old = document.querySelector('.dk-stage');
    const on = 'ABMP'.includes(design) && design && half() && empty && tab && tab !== '@fn' && !quiet() && !rowsUp() ? section(tab) : null;
    if (!on) { if (old) old.remove(); if (empty) empty.hidden = false; return; }
    empty.hidden = true;
    let st = old; if (!st) { st = el('div', 'dk-stage dk-words'); st.appendChild(el('p', 'dk-bubble')); st.appendChild(el('p', 'nb-empty', 'See Done today under Handy.')); empty.after(st); }
    fill(st.querySelector('.dk-bubble'), on);
    joinArt();
    // no size fits (a short or zoomed screen): today's own words stay
    if (!fitSize()) { st.remove(); empty.hidden = false; }
  }
  // He joins the words when his file and his art are there. Until then, and with no art, the words stand alone.
  function joinArt() {
    const st = document.querySelector('.dk-stage');
    if (!st || design === 'A' || !M()) return;
    const a = art('stage');
    if (a.sp.state().failed) { st.classList.add('dk-words'); return; }
    if (a.host.parentNode !== st) st.insertBefore(a.host, st.lastChild);
    if (st.classList.contains('dk-words')) { st.classList.remove('dk-words'); fitSize(); }
  }
  function paintCard() {    // A, B, M: the finished-list card the book drew, at the size that fits
    if (document.querySelector('.dk-stage')) return;
    if ('ABMP'.includes(design) && design && document.querySelector('.nb-left .nb-fin')) fitSize(); else { sizeSet(''); P_CLS.forEach(c => document.documentElement.classList.remove(c)); }
  }
  function paintPerch() {   // C and M: he comes to the finish beside the page. Absent while there is nothing to say
    let p = document.querySelector('.dk-perch');
    if (design !== 'C' && design !== 'M') { if (p) p.remove(); return; }
    if (!p) { p = el('div', 'dk-perch'); p.setAttribute('aria-hidden', 'true'); p.appendChild(el('p', 'dk-bubble')); document.body.appendChild(p); }
    const b = p.querySelector('.dk-bubble'), say = slip(), tab = tabName(), fin = document.querySelector('.nb-fin .nb-fin-say');
    let parts = [];
    if (design === 'M') parts = say && !tab && !fin ? halves(say) : [];                      // only a section finished on All, while its slip is up
    else {
      const st = !say && tab && tab !== '@fn' && !rowsUp() && !document.querySelector('.nb-unsent') && document.querySelector('.nb-left .nb-body > .nb-empty') ? section(tab) : null;
      parts = say ? halves(say) : st ? st : fin && !rowsUp() ? [fin.textContent] : [];
    }
    parts = parts.filter(Boolean); mem.perchSay = parts.join(' | '); p.hidden = !parts.length;
    if (!parts.length) return;
    fill(b, parts);
    const a = art('perch'); if (a.host.parentNode !== p) p.appendChild(a.host);
    if (design === 'C' && fin && !rowsUp() && slipEl()) playOnce('perch', 'burger', 'fin');   // the one play that is live today, from his own place
  }
  function paintHome() {    // H: on Home he stands under the cards when the empty room there holds him
    const root = document.documentElement, host = document.querySelector('#main.wall-main'), m = host && host.querySelector('.mascot');
    root.classList.remove('dk-home');
    if (design !== 'H' || !m || !half()) return;
    const kids = [...host.children].filter(e => e !== m && !e.classList.contains('wall-foot') && e.getBoundingClientRect().height > 0);
    if (!kids.length) return;
    const hb = host.getBoundingClientRect(), bottom = Math.max(...kids.map(e => e.getBoundingClientRect().bottom)), right = Math.max(...kids.map(e => e.getBoundingClientRect().right));
    const room = innerHeight - bottom - 16 - 24, w = full() && room >= 256 ? 192 : room >= 128 ? 96 : 0;
    if (!w) return;
    root.style.setProperty('--dk-hw', w + 'px'); root.style.setProperty('--dk-hl', Math.round(right - w - hb.left) + 'px'); root.style.setProperty('--dk-ht', Math.round(bottom + 16 - hb.top) + 'px');
    root.classList.add('dk-home');
  }
  function paint() {
    queued = false;
    const root = document.documentElement;
    ['a', 'b', 'c', 'm', 'h', 'p'].forEach(k => root.classList.toggle('dk-' + k, design.toLowerCase() === k));
    const say = slip(), tab = tabName(), m = /done\.\s+(.+?) (?:has|have) \d+ left\.$/.exec(say);
    if (say && tab && tab !== '@fn' && m) mem.next[tab] = m[1];
    // the All list's own order of sections, as the book last drew it: what is next is named in that order
    if (!tab) { const hs = [...document.querySelectorAll('.nb-left .nb-hd')].map(e => (e.childNodes[0] && e.childNodes[0].textContent || e.textContent).replace(/[\d/ ]+$/, '').trim()).filter(Boolean); if (hs.length) mem.order = hs.concat((mem.order || []).filter(x => !hs.includes(x))); }
    if (!design || !half()) { document.querySelectorAll('.dk-stage, .dk-perch').forEach(e => e.remove()); root.classList.remove('dk-home'); sizeSet(''); P_CLS.forEach(c => root.classList.remove(c)); document.querySelectorAll('.nb-left .nb-body > .nb-empty[hidden]').forEach(e => { e.hidden = false; }); return; }
    paintStage(); paintCard();                      // words first: nothing here waits for his file or his art
    need(() => { joinArt(); paintPerch(); paintHome(); });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('.dk-stage, .dk-perch')))) queue(); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  addEventListener('resize', queue); addEventListener('hashchange', queue);
  window.LK_DESK = { set(d) { design = d || ''; mem.played = {}; queue(); return design; }, get: () => design, log: () => mem.log.slice(), paint: queue, state: () => ({ design, p: P_CLS.filter(c => document.documentElement.classList.contains(c)).join(' '), size: document.documentElement.classList.contains('dk-full') ? 'full' : document.documentElement.classList.contains('dk-half') ? 'half' : '', stage: !!document.querySelector('.dk-stage'), perch: !!document.querySelector('.dk-perch'), perchSay: mem.perchSay, sprites: Object.fromEntries(Object.entries(mem.sprites).map(([k, s]) => [k, s.sp.state()])) }) };
})();
