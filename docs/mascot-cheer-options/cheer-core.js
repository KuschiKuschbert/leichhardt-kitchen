/* Review-only shared pieces for the mascot cheer designs. Never in the shell, never loaded by the live book.
   A pixel sprite that plays one pass and then rests, a head badge, a speech bubble in the book's own paper
   and ink, and a reader that takes real prep progress from the page the app itself drew. Nothing here
   reads or writes kitchen data: every number comes from what is already on screen. */
(() => {
  'use strict';
  const assetBase = new URL('../kitchen-mascot/assets/', document.currentScript.src);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const requests = [];
  let manifestPromise = null;

  function el(tag, cls, text) { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function url(file) { const u = new URL(file, assetBase); if (!u.href.startsWith(assetBase.href)) throw Error('Invalid local artwork'); requests.push(u.href); return u.href; }
  function manifest() { if (!manifestPromise) manifestPromise = fetch(url('manifest.json')).then(r => { if (!r.ok) throw Error('No manifest'); return r.json(); }).catch(e => { manifestPromise = null; throw e; }); return manifestPromise; }
  const images = {};
  function image(file) { if (!images[file]) images[file] = new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => { delete images[file]; no(Error('No art')); }; i.src = url(file); }); return images[file]; }

  /* One sprite. play() runs one pass of a clip and settles on the rest still. A hidden tab, an offscreen
     host or reduced motion never plays: the rest still is painted and play() answers false, so the
     caller's words still show. crop: 'body' is the whole 192 x 256 frame, 'head' the 144 px square
     around the star and face (shown at 48 or 72 px, a whole-number scale, so the pixels stay crisp). */
  function sprite(host, o) {
    o = o || {};
    const head = o.crop === 'head', sx = head ? 24 : 0, sy = head ? 28 : 0, sw = head ? 144 : 192, sh = head ? 144 : 256;
    const canvas = el('canvas', 'ck-canvas'); canvas.width = sw; canvas.height = sh; canvas.setAttribute('aria-hidden', 'true'); host.append(canvas);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    let disposed = false, timer = null, playing = false, plays = 0, frame = -1, restFile = o.rest || 'welcome-still.png', restImg = null, io = null, busy = false, failed = false;
    function paint(img, f) { if (disposed || !img) return; ctx.clearRect(0, 0, sw, sh); if (f == null) ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); else ctx.drawImage(img, (f % 4) * 192 + sx, Math.floor(f / 4) * 256 + sy, sw, sh, 0, 0, sw, sh); canvas.dataset.frame = f == null ? 'rest' : String(f); }
    function stop() { if (timer !== null) clearTimeout(timer); timer = null; }
    function fail() { failed = true; host.dataset.ck = 'no-art'; if (o.onFail) o.onFail(); }
    async function rest(file) { if (file) { restFile = file; restImg = null; } try { restImg = restImg || await image(restFile); if (!playing) paint(restImg); host.dataset.ck = 'rest'; return true; } catch (_) { fail(); return false; } }
    function settle() { stop(); playing = false; paint(restImg); host.dataset.ck = 'rest'; if (o.onSettle) o.onSettle(); }
    async function play(clip, thenRest) {
      if (disposed || playing || busy || failed) return false;
      busy = true;
      try {
        if (thenRest) { restFile = thenRest; restImg = null; }
        if (reduced.matches || document.hidden) { await rest(); return false; }
        let spec, sheet;
        try { spec = (await manifest()).clips[clip]; sheet = await image(spec.sheet); restImg = restImg || await image(restFile); } catch (_) { fail(); return false; }
        if (disposed) return false;
        if (document.hidden) { paint(restImg); return false; }
        plays++; frame = 0; playing = true; host.dataset.ck = 'playing'; paint(sheet, 0);
        const step = () => { timer = setTimeout(() => { if (disposed || !playing) return; if (document.hidden || frame >= 7) return settle(); frame++; paint(sheet, frame); step(); }, spec.durations[frame]); };
        step();
        return true;
      } finally { busy = false; }
    }
    function onVis() { if (document.hidden && playing) settle(); }
    document.addEventListener('visibilitychange', onVis);
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(e => { if (!e[0].isIntersecting && playing) settle(); }); io.observe(host); }
    return { play, rest, canvas, state: () => ({ playing, plays, frame, scheduled: timer !== null, failed, rest: restFile }), dispose() { disposed = true; stop(); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); canvas.remove(); } };
  }

  /* A speech bubble: words in a paper box with an ink edge and a small tail. Words are set with
     textContent, never markup. tail: 'left', 'right', 'down', 'up' or 'none'. tone: 'paper' or 'chalk'. */
  function bubble(text, o) {
    o = o || {};
    const b = el('span', 'ck-bubble ck-tail-' + (o.tail || 'left') + (o.tone ? ' ck-' + o.tone : ''));
    const lines = Array.isArray(text) ? text : [text];
    lines.forEach((t, i) => b.append(el('span', i ? 'ck-line ck-sub' : 'ck-line', t)));
    return b;
  }

  /* What the Prep page shows right now, read from the page the app drew: each section's done and total
     and the list total. null when the Prep list is not on screen. */
  function prepState() {
    const prog = document.querySelector('.nb-prog');
    if (!prog) return null;
    const page = prog.closest('.nb-ph')?.parentElement || document;
    const m = /(\d+)\s+of\s+(\d+)\s+(done|ordered)/.exec(prog.textContent || '');
    const sections = [...page.querySelectorAll('.nb-hd')].map(h => { const s = [...h.children].filter(e => e.tagName === 'SPAN' && !/\bck-/.test(e.className)), c = /(\d+)\s*\/\s*(\d+)/.exec(s[s.length - 1]?.textContent || ''); return c ? { name: (s[0].textContent || '').trim(), done: +c[1], total: +c[2], el: h } : null; }).filter(Boolean);
    const rows = [...page.querySelectorAll('li.nb-row')], id = li => li.id.replace(/^nbr-/, '');
    const mine = rows.filter(li => li.classList.contains('is-on') && /You.re on it/.test(li.querySelector('.nb-on')?.textContent || '')).map(id);
    return { kind: m && m[3] === 'ordered' ? 'orders' : 'prep', done: m ? +m[1] : 0, total: m ? +m[2] : 0, sections, mine, ticked: rows.filter(li => li.classList.contains('is-done')).map(id), el: prog };
  }
  /* The same from Home's Prep by section card. */
  function homeState() {
    const card = document.querySelector('#hm-prep');
    if (!card) return null;
    const m = /(\d+)\s+of\s+(\d+)\s+done/.exec(card.querySelector('.hm-pc')?.textContent || '');
    const sections = [...card.querySelectorAll('.hm-sec')].map(a => { const left = /(\d+)\s+left/.exec(a.querySelector('.hm-sl')?.textContent || ''); return { name: a.dataset.hmSec || a.querySelector('.hm-sn')?.textContent.trim() || '', left: left ? +left[1] : 0, el: a }; });
    return { done: m ? +m[1] : 0, total: m ? +m[2] : 0, sections, el: card };
  }
  /* The slip the app is showing now: its words, whether it is a failure and whether Undo is on it. */
  function slip() {
    const t = document.querySelector('.p-toasts .p-toast[data-toast="new"]');
    if (!t) return null;
    return { el: t, msg: t.querySelector('.p-toast-msg')?.textContent || '', bad: t.classList.contains('p-toast-bad'), undo: !!t.querySelector('.p-toast-btn') };
  }
  /* A milestone is worked out from two readings of the page, before and after a tick the app answered.
     Returns null for an ordinary tick, an untick or a failure. Never fires from words alone. */
  function milestone(before, after, s) {
    if (!before || !after || !s || s.bad || !/^(Ticked|Ordered) /.test(s.msg)) return null;
    if (after.done <= before.done) return null;
    if (after.total > 0 && after.done === after.total) return { kind: 'list', what: after.kind, done: after.done, total: after.total };
    const next = after.sections.find(x => x.done < x.total);
    for (const sec of after.sections) { const was = before.sections.find(x => x.name === sec.name); if (was && sec.total > 0 && sec.done === sec.total && was.done < was.total) return { kind: 'section', name: sec.name, done: sec.done, total: sec.total, left: after.total - after.done, next: next ? { name: next.name, left: next.total - next.done } : null }; }
    return null;
  }
  const who = () => (window.LK_PREP && window.LK_PREP.whoName && window.LK_PREP.whoName()) || '';
  window.LK_CHEER_CORE = { el, sprite, bubble, prepState, homeState, slip, milestone, who, reduced, requests, image };
})();
