/* Review-only injection into the real app for the mascot cycle designs. Never in the shell.
   One shuffled set of all 11 actions per person, kept on this device. A kitchen day is LK_TIME.day()
   (Queensland). Designs: A plays today's action once on the first Home view, then settles on the
   neutral Welcome still; B plays it once and holds the action's own still, tap to replay today's
   action; C never plays by itself, tap the still to play today's action. */
(() => {
  'use strict';
  const assetBase = new URL('../kitchen-mascot/assets/', document.currentScript.src);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ALL = ['idle', 'welcome', 'look-around', 'recipe-reading', 'ready-to-cook', 'smash', 'flip', 'build', 'burger', 'walk', 'smoker'];
  const NAMES = { idle: 'Idle', welcome: 'Welcome', 'look-around': 'Look around', 'recipe-reading': 'Recipe reading', 'ready-to-cook': 'Ready to cook', smash: 'Smash', flip: 'Flip', build: 'Build', burger: 'Serve', walk: 'Walk', smoker: 'At the smoker' };
  const KEY = 'lk.mascot.cycle.';
  let design = null, node = null, player = null, observer = null, resize = null, manifestPromise = null, route = '', omitted = null, syncing = false;
  const requests = [];

  // Seeded shuffle so a test can pin the order. The seed mixes the person and the kitchen day.
  function rng(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(list, seed) { const out = list.slice(), r = rng(seed); for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
  // Saved on this device only, one record per person: the actions still to come this round, the last
  // one shown and the kitchen day it was drawn. Out of date: never; the day stamp only gates a new draw.
  // If the phone refuses storage, the record lives in memory for this page, so returns still open at rest.
  const memo = {};
  function load(who) { try { const r = JSON.parse(localStorage.getItem(KEY + who) || 'null'); if (r && Array.isArray(r.bag) && r.bag.every(x => ALL.includes(x))) return r; } catch (_) {} return memo[who] ? JSON.parse(JSON.stringify(memo[who])) : { bag: [], last: '', day: '', today: '', played: false }; }
  function save(who, r) { memo[who] = JSON.parse(JSON.stringify(r)); try { localStorage.setItem(KEY + who, JSON.stringify(r)); } catch (_) {} }
  // Today's action for this person. A new kitchen day takes the next action from the shuffled set;
  // an empty set reshuffles all 11, and never starts with yesterday's action.
  function draw(who, day, rec = load(who)) {
    if (rec.day === day && rec.today) return rec;
    if (!rec.bag.length) { const bag = shuffle(ALL, who + '|' + day); if (bag[0] === rec.last) bag.push(bag.shift()); rec.bag = bag; }
    rec.today = rec.bag.shift(); rec.last = rec.today; rec.day = day; rec.played = false;
    return rec;
  }
  function simulate(who, days) { let rec = { bag: [], last: '', day: '', today: '', played: false }; const out = []; for (let i = 0; i < days; i++) { rec = draw(who, 'd' + String(i).padStart(4, '0'), rec); out.push(rec.today); } return out; }

  function el(tag, cls) { const x = document.createElement(tag); if (cls) x.className = cls; return x; }
  function url(file) { const u = new URL(file, assetBase); if (!u.href.startsWith(assetBase.href)) throw Error('Invalid local artwork'); requests.push(u.href); return u.href; }
  function manifest() { if (!manifestPromise) manifestPromise = fetch(url('manifest.json')).then(r => { if (!r.ok) throw Error('No manifest'); return r.json(); }).catch(e => { manifestPromise = null; throw e; }); return manifestPromise; }
  function image(file) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url(file); }); }

  // One player: plays one pass of an action, then paints the rest image. Hidden tab or offscreen
  // ends the play at once and paints the rest image; nothing loops.
  function newPlayer(host, id, restFile, onFail) {
    const canvas = el('canvas'); canvas.width = 192; canvas.height = 256; host.append(canvas);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    let disposed = false, timer = null, sheet = null, spec = null, rest = null, frame = 0, playing = false, settled = true, plays = 0, io = null;
    function paint(img, f) { if (disposed) return; ctx.clearRect(0, 0, 192, 256); if (!img) return; if (f == null) ctx.drawImage(img, 0, 0, 192, 256); else ctx.drawImage(img, (f % 4) * 192, Math.floor(f / 4) * 256, 192, 256, 0, 0, 192, 256); canvas.dataset.frame = f == null ? 'rest' : String(f); }
    function stop() { if (timer !== null) clearTimeout(timer); timer = null; }
    function finish() { stop(); playing = false; settled = true; paint(rest); host.dataset.state = 'settled'; }
    function tick() { if (disposed || !playing) return; if (document.hidden) return finish(); timer = setTimeout(() => { if (frame >= 7) return finish(); frame++; paint(sheet, frame); tick(); }, spec.durations[frame]); }
    async function restLoad() { if (rest) return rest; rest = await image(restFile); return rest; }
    async function showRest() { try { await restLoad(); if (!playing) paint(rest); host.dataset.state = 'settled'; } catch (_) { onFail(); } }
    let busy = false;
    async function play() {
      if (disposed || playing || busy) return false;
      busy = true; try { return await playNow(); } finally { busy = false; }
    }
    async function playNow() {
      if (reduced.matches) { await showRest(); return false; }
      try { spec = spec || (await manifest()).clips[id]; sheet = sheet || await image(spec.sheet); await restLoad(); } catch (_) { onFail(); return false; }
      if (disposed) return false;
      if (document.hidden) { paint(rest); host.dataset.state = 'settled'; return false; }
      plays++; frame = 0; playing = true; settled = false; host.dataset.state = 'playing'; paint(sheet, 0); tick(); return true;
    }
    function onVis() { if (document.hidden && playing) finish(); }
    document.addEventListener('visibilitychange', onVis);
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(e => { if (!e[0].isIntersecting && playing) finish(); }); io.observe(host); }
    return { play, showRest, state: () => ({ id, frame, playing, settled, plays, scheduled: timer !== null, atlasLoaded: !!sheet, rest: restFile }), dispose() { disposed = true; stop(); io?.disconnect(); document.removeEventListener('visibilitychange', onVis); } };
  }

  function clear() { player?.dispose(); player = null; resize?.disconnect(); resize = null; node?.parentElement?.classList.remove('mc-anchor'); node?.remove(); node = null; }
  function textRects(e) { const out = [], w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { if (!t.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(t); out.push(...r.getClientRects()); } return out; }

  // Same space and omission rules as the placement study's A: only in spare heading space.
  function mount() {
    const who = window.LK_PREP?.whoName?.() || '', heading = document.querySelector('#rtitle.hm-welcome'), date = document.querySelector('.wall-date'), first = document.querySelector('#hm-day');
    if (!who || !heading || !date || !first) { omitted = 'no-personal-home'; return; }
    const h = heading.getBoundingClientRect(), end = first.getBoundingClientRect().top, bar = document.querySelector('.wtop')?.getBoundingClientRect().bottom || 0;
    const offset = h.top - bar >= 20 ? -12 : 0, top = h.top + offset, texts = [...textRects(heading), ...textRects(date)];
    const width = [64, 48].find(w => end - top >= w * 4 / 3 + 7 && !texts.some(r => r.right > h.right - w - 12 && r.bottom > top && r.top < top + w * 4 / 3));
    if (!width) { omitted = 'no-spare-heading-space'; return; }
    const left = h.right - width;
    if ([...document.querySelectorAll('.kb-hang-item')].some(e => { const r = e.getBoundingClientRect(); return r.width && r.left < h.right && r.right > left && r.top < top + width * 4 / 3 && r.bottom > top; })) { omitted = 'seasonal-anchor-space'; return; }
    omitted = null;
    const today = window.LK_TIME.day();
    let rec = load(who);
    const newDay = rec.day !== today;
    // A and B draw on the first Home view of the day; C draws only when the person taps.
    if (design !== 'C' && newDay) { rec = draw(who, today, rec); save(who, rec); }
    const id = rec.day === today && rec.today ? rec.today : '';
    const tap = design !== 'A';
    node = el(tap ? 'button' : 'span', `mc-mascot mc-${design}${width === 64 ? ' mc-roomy' : ''}`);
    node.style.top = `${offset}px`; node.dataset.mcDesign = design;
    if (tap) { node.type = 'button'; node.setAttribute('aria-label', design === 'B' && id ? `Kitchen mascot. Today: ${NAMES[id]}. Play again` : 'Kitchen mascot. Play today’s action'); }
    else node.setAttribute('aria-hidden', 'true');
    heading.classList.add('mc-anchor'); heading.append(node);
    const fail = () => { omitted = 'artwork-unavailable'; clear(); };
    const restOf = x => design === 'A' ? 'welcome-still.png' : design === 'B' ? `${x}-still.png` : 'idle-still.png';
    player = newPlayer(node, id || 'idle', restOf(id || 'idle'), fail);
    // Today's action plays on the first Home view where it can actually play: a hidden, failed or
    // reduced-motion view leaves it unplayed, so a later view the same day still shows it.
    const firstPlay = design !== 'C' && rec.day === today && !rec.played;
    if (firstPlay) player.play().then(ok => { if (ok) { const r = load(who); r.played = true; save(who, r); } });
    else player.showRest();
    if (tap) node.addEventListener('click', async () => {
      let r = load(who); const d = window.LK_TIME.day();
      if (r.day !== d) { r = draw(who, d, r); save(who, r); }
      if (player.state().id !== r.today) { player.dispose(); node.replaceChildren(); player = newPlayer(node, r.today, restOf(r.today), fail); }
      if (await player.play()) { r = load(who); r.played = true; save(who, r); }
      node.setAttribute('aria-label', `Kitchen mascot. Today: ${NAMES[r.today]}. Play again`);
    });
    resize = new ResizeObserver(() => { if (!node?.isConnected) return; const r = heading.getBoundingClientRect(), lim = r.right - width - 12; if (first.getBoundingClientRect().top < r.top + offset + width * 4 / 3 + 7 || [...textRects(heading), ...textRects(date)].some(x => x.right > lim && x.bottom > r.top + offset && x.top < r.top + offset + width * 4 / 3)) { clear(); omitted = 'no-spare-heading-space'; } });
    resize.observe(heading);
  }
  function sync() {
    if (syncing || !design) return; syncing = true;
    // Missing art or no room stays omitted for this Home view; never retried by the page's own redraws.
    try { const key = location.hash || '#/'; if (route === key && (node?.isConnected || (omitted && omitted !== 'no-personal-home'))) return; clear(); route = key; omitted = null; if (key === '#/' || key === '#') mount(); else omitted = 'home-only'; }
    finally { syncing = false; }
  }
  function install(next) { if (!['A', 'B', 'C'].includes(next)) return false; clear(); design = next; route = ''; if (!observer) { observer = new MutationObserver(sync); observer.observe(document.body, { childList: true, subtree: true }); } sync(); return true; }
  window.addEventListener('hashchange', sync);
  window.LK_MASCOT_CYCLE = { install, simulate, draw, shuffle, ALL, NAMES, remove() { design = null; clear(); observer?.disconnect(); observer = null; }, record: who => load(who), state: () => ({ design, route, mounted: !!node?.isConnected, omitted, player: player?.state() || null, label: node?.getAttribute('aria-label') || '', assets: requests.slice() }) };
})();
