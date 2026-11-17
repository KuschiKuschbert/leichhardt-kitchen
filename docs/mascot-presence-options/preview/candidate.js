/* Review-only. Draws the round 2 designs over the real book (the click tests' stand-in Firebase, made-up lines):
     A  Today finishes today: lines under "Tonight, for tomorrow" leave today's counts (header, Home, the card), but
        only when today's own lines clocked tonight's list. The finished card then shows above tomorrow's lines.
     B  A done line on the All list: from 900 px, finished sections are said in one line at the foot of today's
        lines, with him small beside it, until a section gets a new line.
     C  He keeps the Prep page company: from 900 px, a still in the Handy page's header corner, all shift. No words.
     M  The mix drawn after round 2 (set in the brief).
   Nothing here writes kitchen data. Counts come from the stand-in's lines (window.__fake.dump()); a build would use the
   book's own finOk(), secSaid(), tonightLine() and cutFor(). Nothing changes under 900 px except A's counts. */
(() => {
  'use strict';
  if (window.LK_PV) return;
  let design = '', cfg = {}, busy = false, obs = null;
  const art = n => `art/mascot/${n}-still.png?v=1`;
  const wide = () => innerWidth >= 900;
  const has = k => design.includes(k);
  const day = () => cfg.day;
  // today's own lines from the stand-in, with the preview's own reading of "tonight, for tomorrow"
  function lines() {
    const d = window.__fake ? window.__fake.dump() : {}, pre = cfg.items, out = [];
    Object.keys(d).forEach(k => { if (k.startsWith(pre) && !k.slice(pre.length).includes('/')) out.push(Object.assign({ id: k.split('/').pop() }, d[k])); });
    return out.filter(x => !x.deleted && !x.fn);
  }
  const tonight = x => cfg.ownCut && !x.done && !x.rolled && x.addedAt >= cfg.cutMs;
  function counts() {
    const all = lines(), tmr = all.filter(tonight), today = all.filter(x => !tonight(x));
    return { all, tmr, today, done: today.filter(x => x.done).length };
  }
  const plural = n => / and |,/.test(n) || (/s$/i.test(n) && !/ss$/i.test(n));
  function doneSections(today) {
    const by = {};
    today.forEach(x => { const s = x.station || ''; if (!s) return; (by[s] = by[s] || []).push(x); });
    const order = cfg.order || Object.keys(by);
    return order.filter(s => by[s] && by[s].length >= 2 && by[s].every(x => x.done));
  }
  function joinNames(a) { return a.length < 2 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const onAll = () => !!document.querySelector('.nb-tab[data-v=""][aria-pressed="true"]') || !document.querySelector('.nb-tabs');
  function clear() { document.querySelectorAll('[data-pv]').forEach(e => e.remove()); document.querySelectorAll('[data-pv-text]').forEach(e => { e.textContent = e.getAttribute('data-pv-text'); e.removeAttribute('data-pv-text'); }); }
  function setText(e, t) { if (!e) return; if (!e.hasAttribute('data-pv-text')) e.setAttribute('data-pv-text', e.textContent); e.textContent = t; }
  function apply() {
    if (busy) return; busy = true; if (obs) obs.disconnect();
    try {
      clear();
      if (!design) return;
      const c = counts(), prep = !!document.querySelector('.nb-left .nb-ph'), off = !navigator.onLine;
      // A: one count everywhere, only with an own-clocked cut
      if (has('A') && cfg.ownCut && c.tmr.length) {
        const pg = document.querySelector('.nb-left .nb-prog');
        // the count leaves tomorrow's lines out; "6 for tomorrow" joins the shift line under it, so the header keeps its height
        if (pg) {
          setText(pg, `${c.done} of ${c.today.length} done`);
          const tm = pg.parentNode.classList.contains('nb-pw') ? pg.nextElementSibling : null;
          if (tm) tm.appendChild(el(`<span class="pv-tmr-i" data-pv> · ${c.tmr.length} for tomorrow</span>`));
          else pg.insertAdjacentElement('afterend', el(`<span class="pv-tmr" data-pv>${c.tmr.length} for tomorrow</span>`));
        }
        const hm = document.querySelector('.hm-pc');
        if (hm) setText(hm, `${c.done} of ${c.today.length} done · ${c.tmr.length} for tomorrow`);
        // the card, above tomorrow's lines, once no row of today's is left on the All list
        const th = document.querySelector('.nb-left .nb-hd-tonight');
        const todayRows = [...document.querySelectorAll('.nb-left .nb-body .nb-row')].filter(r => !r.closest('.nb-rows') || !(r.closest('.nb-rows').previousElementSibling || {}).classList?.contains('nb-tonight-sd'));
        if (prep && onAll() && th && c.today.length >= 2 && c.done === c.today.length && !todayRows.length && !off) {
          // one compact row: him beside 28 px words, so tomorrow's lines stay in view under it
          const w = wide();
          const card = el(`<div class="pv-fin ${w ? 'pv-mid' : 'pv-small'}" data-pv><span class="pv-art"><img alt="" src="${art('welcome')}"></span><div class="pv-fw"><p class="pv-say">Every line for today ticked. ${c.done} of ${c.today.length}.</p><p class="pv-ptr">Tomorrow's ${c.tmr.length} lines are below.</p></div></div>`);
          th.parentNode.insertBefore(card, th);
        }
      }
      // B: finished sections said once, at the foot of today's lines, on All, from 900 px
      if (has('B') && prep && onAll() && wide() && !off && !document.querySelector('.nb-left .nb-fin, .pv-fin')) {
        const secs = doneSections(c.today);
        if (secs.length) {
          const name = joinNames(secs), body = document.querySelector('.nb-left .nb-body');
          const shelf = el(`<div class="pv-shelf" data-pv><span class="pv-art"><img alt="" src="${art('welcome')}"></span><p class="pv-say">${name.replace(/[<>&]/g, '')} ${secs.length > 1 || plural(name) ? 'are' : 'is'} done.</p></div>`);
          const th = body && body.querySelector('.nb-hd-tonight');
          if (th) th.parentNode.insertBefore(shelf, th); else if (body) body.appendChild(shelf);
        }
      }
      // C: a still in the Handy page's corner, today, from 900 px, with the signal up
      if (has('C') && prep && wide() && !off && !document.querySelector('.p-dateinput[value]:not([value="' + day() + '"])')) {
        const h = document.querySelector('.nb-right .nb-ph');
        if (h) h.appendChild(el(`<span class="pv-corner" data-pv aria-hidden="true"><img alt="" src="${art('welcome')}"></span>`));
      }
    } catch (e) { console.log('pv', String(e)); }
    finally { busy = false; if (obs) obs.observe(document.body, { childList: true, subtree: true }); }
  }
  let q = false;
  function later() { if (q) return; q = true; Promise.resolve().then(() => { q = false; apply(); }); }
  obs = new MutationObserver(ms => { if (ms.every(m => [...m.addedNodes, ...m.removedNodes].every(n => n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-pv')))) return; later(); });
  obs.observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', later); addEventListener('online', later); addEventListener('offline', later);
  window.LK_PV = { set(d, c) { design = d || ''; cfg = c || cfg; apply(); }, apply, counts };
})();
