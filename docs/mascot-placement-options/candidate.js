/* Review-only injections into the real app, never included by its shell. */
(() => {
  'use strict';
  const assetBase = new URL('../kitchen-mascot/assets/', document.currentScript.src);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const names = { idle: 'Idle', welcome: 'Welcome', 'look-around': 'Look around', 'recipe-reading': 'Recipe reading', 'ready-to-cook': 'Ready', smash: 'Smash', flip: 'Flip', build: 'Build', burger: 'Serve', walk: 'Walk', smoker: 'At the smoker' };
  const all = ['idle', 'welcome', 'look-around', 'recipe-reading', 'ready-to-cook', 'smash', 'flip', 'build', 'burger', 'walk', 'smoker'];
  let option = null, node = null, player = null, observer = null, resize = null, manifestPromise = null;
  let welcomed = false, route = '', omitted = null, syncing = false;
  const requests = [];
  function el(tag, cls, text) { const x = document.createElement(tag); if (cls) x.className = cls; if (text !== undefined) x.textContent = text; return x; }
  function url(file) { const u = new URL(file, assetBase); if (!u.href.startsWith(assetBase.href)) throw Error('Invalid local artwork'); requests.push(u.href); return u.href; }
  function manifest() { if (!manifestPromise) manifestPromise = fetch(url('manifest.json')).then(r => { if (!r.ok) throw Error('No artwork manifest'); return r.json(); }).catch(error => { manifestPromise = null; throw error; }); return manifestPromise; }
  function newPlayer(host, id, config = {}) {
    let disposed = false, timer = null, sheet = null, poster = null, spec = null, image = null, io = null;
    let frame = 0, playing = false, visible = true, ready = false, failed = false, settled = false, loading = false, intent = 0;
    const canvas = el('canvas'); canvas.width = 192; canvas.height = 256;
    const context = canvas.getContext('2d');
    const error = el('p', 'mp-error', 'Artwork unavailable. The page above is still available.'); error.hidden = true;
    const controls = el('div', 'mp-controls');
    const play = el('button', 'btn dark', 'Play'), replay = el('button', 'btn', 'Replay'), status = el('span', 'mp-state', 'Still');
    play.type = replay.type = 'button'; play.setAttribute('aria-label', `Play ${names[id]}`); replay.setAttribute('aria-label', `Replay ${names[id]}`);
    status.setAttribute('role', 'status');
    if (config.decorative) { canvas.setAttribute('aria-hidden', 'true'); host.append(canvas); }
    else { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `Kitchen mascot: ${names[id]}`); controls.append(play, replay, status); host.append(canvas, error, controls); }
    function paintStatus(text) { if (status.textContent !== text) status.textContent = text; }
    function draw() { if (disposed || !ready) return; context.clearRect(0, 0, 192, 256); context.imageSmoothingEnabled = false; if (sheet) context.drawImage(sheet, (frame % 4) * 192, Math.floor(frame / 4) * 256, 192, 256, 0, 0, 192, 256); else if (poster) context.drawImage(poster, 0, 0, 192, 256); canvas.dataset.frame = String(frame); }
    function stop() { if (timer !== null) clearTimeout(timer); timer = null; }
    function stateText() { if (loading) { paintStatus('Loading'); return; } if (failed) return; const text = settled ? 'Settled' : playing ? 'Playing' : 'Paused'; paintStatus(text); const action = playing ? 'Pause' : 'Play'; if (play.textContent !== action) play.textContent = action; play.setAttribute('aria-label', `${action} ${names[id]}`); }
    function schedule() {
      stop(); if (disposed) return; stateText();
      if (!playing || !ready || !sheet || !visible || document.hidden || !host.isConnected) return;
      timer = setTimeout(() => {
        if (frame === 7 && (config.once || spec.loop === false)) { playing = false; settled = true; if (config.decorative) { frame = 0; draw(); } schedule(); return; }
        frame = (frame + 1) % 8; draw(); schedule();
      }, spec.durations[frame]);
    }
    function fail() { if (disposed) return; failed = true; playing = false; stop(); if (config.decorative) { host.hidden = true; omitted = 'artwork-unavailable'; } else { error.hidden = false; if (!poster) canvas.hidden = true; paintStatus('Unavailable'); play.textContent = 'Try again'; } }
    async function loadSheet() {
      if (sheet) return true;
      try { spec = (await manifest()).clips[id]; if (!spec) throw Error('Missing clip'); if (disposed) return false;
        return await new Promise(resolve => { image = new Image(); image.onload = () => { if (disposed) return resolve(false); sheet = image; ready = true; failed = false; canvas.hidden = false; error.hidden = true; resolve(true); }; image.onerror = () => { fail(); resolve(false); }; image.src = url(spec.sheet); });
      } catch (_) { fail(); return false; }
    }
    async function start(reset = false) { if (disposed || loading) return; if (reset || settled) { frame = 0; settled = false; } const request = ++intent; loading = true; play.disabled = replay.disabled = true; paintStatus('Loading'); const loaded = await loadSheet(); loading = false; play.disabled = replay.disabled = false; if (!loaded || disposed) return; if (request !== intent) { draw(); schedule(); return; } playing = true; draw(); schedule(); }
    function pause() { intent++; playing = false; schedule(); }
    play.addEventListener('click', () => playing ? pause() : start()); replay.addEventListener('click', () => start(true));
    function onVisibility() { if (config.decorative && document.hidden) { playing = false; settled = true; frame = 0; draw(); } schedule(); }
    document.addEventListener('visibilitychange', onVisibility);
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (config.decorative && !visible && playing) { playing = false; settled = true; frame = 0; draw(); } schedule(); }); io.observe(host); }
    const still = new Image(); still.onload = () => { if (disposed) return; poster = still; if (!sheet) { ready = true; draw(); } }; still.onerror = () => { if (!sheet) fail(); }; still.src = url(`${id}-still.png`);
    if (config.auto && !reduced.matches) start();
    return { id, pause, start, state: () => ({ id, frame, playing, ready, failed, settled, loading, scheduled: timer !== null, visible, atlasLoaded: !!sheet }), dispose() { disposed = true; stop(); io?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); [still, image].filter(Boolean).forEach(x => { x.onload = x.onerror = null; x.src = ''; }); } };
  }
  function clear() { player?.dispose(); player = null; resize?.disconnect(); resize = null; if (node?.parentElement?.classList.contains('mp-heading-anchor')) node.parentElement.classList.remove('mp-heading-anchor'); node?.remove(); node = null; }
  function textRects(element) { const out = []; const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let text; while ((text = walker.nextNode())) { if (!text.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(text); out.push(...r.getClientRects()); } return out; }
  function greeting() {
    const heading = document.querySelector('#rtitle.hm-welcome'), date = document.querySelector('.wall-date'), first = document.querySelector('#hm-day');
    if (!heading || !date || !first) { omitted = 'no-personal-home'; return; }
    const h = heading.getBoundingClientRect(), end = first.getBoundingClientRect().top;
    const barBottom = document.querySelector('.wtop')?.getBoundingClientRect().bottom || 0;
    const offset = h.top - barBottom >= 20 ? -12 : 0;
    const top = h.top + offset, texts = [...textRects(heading), ...textRects(date)];
    const width = [64, 48].find(w => end - top >= w * 4 / 3 + 7 && !texts.some(r => r.right > h.right - w - 12 && r.bottom > top && r.top < top + w * 4 / 3));
    if (!width) { omitted = 'no-spare-heading-space'; return; }
    const roomy = width === 64, height = width * 4 / 3, left = h.right - width;
    const anchors = [...document.querySelectorAll('.kb-hang-item')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.left < h.right && r.right > left && r.top < top + height && r.bottom > top; });
    if (anchors.length) { omitted = 'seasonal-anchor-space'; return; }
    omitted = null; node = el('span', `mp-greeting${roomy ? ' mp-roomy' : ''}`); node.style.top = `${offset}px`; node.dataset.mpOption = 'A'; node.setAttribute('aria-hidden', 'true'); heading.classList.add('mp-heading-anchor'); heading.append(node);
    const auto = !welcomed; welcomed = true; player = newPlayer(node, 'welcome', { decorative: true, once: true, auto });
    resize = new ResizeObserver(() => { if (!node?.isConnected) return; const rect = heading.getBoundingClientRect(); const limit = rect.right - width - 12; if (first.getBoundingClientRect().top < rect.top + offset + height + 7 || [...textRects(heading), ...textRects(date)].some(r => r.right > limit && r.bottom > rect.top + offset && r.top < rect.top + offset + height)) { clear(); omitted = 'no-spare-heading-space'; } }); resize.observe(heading);
  }
  function disclosure(summaryText, ids, firstId, note) {
    node = el('details', 'mp-detail'); const detail = node; node.dataset.mpOption = option;
    node.append(el('summary', '', summaryText));
    const content = el('div', 'mp-content'); content.append(el('p', 'mp-note', note));
    const title = el('h3', 'mp-selection-title', names[firstId]);
    const stage = el('div', 'mp-player');
    const choices = el('div', 'mp-choices'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'Mascot action');
    let id = firstId, initialised = false;
    function show(next) { id = next; player?.dispose(); stage.replaceChildren(); title.textContent = names[id]; choices.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mpClip === id))); player = newPlayer(stage, id); }
    ids.forEach(key => { const button = el('button', 'chip', names[key]); button.type = 'button'; button.dataset.mpClip = key; button.setAttribute('aria-pressed', String(key === id)); button.addEventListener('click', () => show(key)); choices.append(button); });
    content.append(title, stage, choices); node.append(content);
    node.addEventListener('toggle', () => { if (!detail.isConnected) return; if (detail.open) { if (!initialised) { initialised = true; show(id); } } else player?.pause(); });
    return node;
  }
  function sync() {
    if (syncing || !option) return; syncing = true;
    try {
      const key = location.hash || '#/';
      if (node?.isConnected && route === key) {
        if (option === 'A') {
          const r = node.getBoundingClientRect();
          if ([...document.querySelectorAll('.kb-hang-item')].some(e => { const q = e.getBoundingClientRect(); return q.width && q.height && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; })) { clear(); omitted = 'seasonal-anchor-space'; }
        }
        return;
      }
      clear(); route = key; omitted = null;
      if (option === 'A') { if (key === '#/' || key === '#') greeting(); else omitted = 'home-only'; }
      if (option === 'B') {
        const rid = key.split('/')[2]; const burger = ['smash', 'oz-smash'].includes(rid), smoked = ['brisket', 'pulled-pork', 'smoked-wings', 'bbq-riblets'].includes(rid);
        const main = document.querySelector('#main');
        if ((!burger && !smoked) || !main || !document.querySelector('#r-ing')) { omitted = 'relevant-recipe-only'; return; }
        main.after(disclosure(`Kitchen mascot · ${burger ? 'Burger' : 'House-smoked'}`, burger ? ['ready-to-cook', 'smash', 'flip', 'build', 'burger'] : ['smoker'], burger ? 'burger' : 'smoker', 'Just for fun. The recipe above is the cooking guide.'));
      }
      if (option === 'C') {
        const home = document.querySelector('#main .hm.kb-home');
        if (key !== '#/' || !home) { omitted = 'home-only'; return; }
        home.after(disclosure('Meet our kitchen mascot', all, 'idle', 'A little Leichhardt character, when you have a moment.'));
      }
    } finally { syncing = false; }
  }
  function install(next) { if (!['A', 'B', 'C'].includes(next)) return false; clear(); option = next; route = ''; if (!observer) { observer = new MutationObserver(sync); observer.observe(document.body, { childList: true, subtree: true }); } sync(); return true; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) player?.pause(); });
  reduced.addEventListener('change', () => { if (reduced.matches) player?.pause(); });
  window.addEventListener('hashchange', sync);
  window.LK_MASCOT_PLACEMENT = { install, remove() { option = null; clear(); observer?.disconnect(); observer = null; }, state: () => ({ option, route, mounted: !!node?.isConnected, omitted, welcomed, open: !!node?.open, player: player?.state() || null, assets: requests.slice() }) };
})();
