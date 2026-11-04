/* Home keeps the full seasonal ambience. Work pages move only inside the top bar.
   This module decorates static app markup and never reads or writes kitchen records. */
(function () {
  'use strict';
  const originalBrands = new WeakMap(), root = document.getElementById('app'), layer = document.createElement('div');
  layer.id = 'kb-festive-effects'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let state = { theme: null, mode: 'still', density: 'festive' }, frame = 0, publishFrame = 0;
  let surface = 'work', route = location.hash || '#/', aboutOpen = false, panel = null, panelTheme = null;
  let handoffCount = 0, handoffTimer = 0, handoffTarget = null, handoffPending = false;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Pi Day is the established short name; its official alternative stays in accessible labels.
  const labelFor = theme => theme.id === 'fun-pi-day' ? 'Pi Day' : theme.label;
  function art(source, theme, className) {
    const markup = window.KB_THEME_BRAND?.style ? KB_THEME_BRAND.style(source, { themeId: theme.id }) : source;
    if (!className) return markup;
    const holder = document.createElement('div'); holder.innerHTML = markup;
    holder.firstElementChild?.classList.add(className);
    return holder.innerHTML;
  }
  function gated() {
    return Boolean(root.querySelector('#p-pin,[data-p-form="pin"],.p-names') || document.querySelector('#lk-device-choice[open],#lk-device-discard[open]'));
  }
  function isHome() { return /^#\/(?:\?.*)?$/.test(location.hash || '#/') && Boolean(root.querySelector('.wall-main .dockets')); }
  function aboutButton() { return root.querySelector('.kb-occasion-trigger'); }
  function restoreBrand() {
    // Kitchen Book stays in the top bar (3 Nov 2026). Older pages replaced it with the celebration title; put it back.
    const start = root.querySelector('.wtop-start'), title = start?.querySelector('.kb-occasion-title');
    if (title) { const original = originalBrands.get(start); if (original) title.replaceWith(original); else title.remove(); }
    root.querySelectorAll('.kb-occasion-stamp,.wtop-icons .kb-occasion-trigger').forEach(button => button.remove());
  }
  function stopHandoff() {
    clearTimeout(handoffTimer); handoffTimer = 0;
    handoffTarget?.classList.remove('is-arriving'); handoffTarget = null;
  }
  function handoff(button) {
    stopHandoff(); handoffPending = false;
    if (!button || state.mode !== 'gentle' || reduced.matches || document.hidden) return;
    handoffCount += 1; handoffTarget = button; button.classList.add('is-arriving');
    handoffTimer = setTimeout(() => { stopHandoff(); publishSoon(); }, 280);
  }
  function publish() {
    document.dispatchEvent(new CustomEvent('kb-seasonal-state', { detail: status() }));
  }
  function publishSoon() {
    if (publishFrame) return;
    publishFrame = requestAnimationFrame(() => { publishFrame = 0; publish(); });
  }
  function closeAbout(restoreFocus = false) {
    const trigger = aboutButton();
    aboutOpen = false;
    // An explanation exists only while requested, so closing it releases its scheduler.
    if (panel && window.KB_CELEBRATION_TICKER?.status().surface === 'work') KB_CELEBRATION_TICKER.clear();
    if (panel?.open) panel.close();
    panel?.remove(); panel = null; panelTheme = null;
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
    publishSoon();
  }
  function positionPanel() {
    if (!panel?.isConnected) return;
    const bounds = aboutButton()?.getBoundingClientRect();
    const top = Math.max(8, Math.min((bounds?.bottom || 64) + 12, Math.max(8, innerHeight - 160)));
    panel.style.setProperty('--kb-about-top', top + 'px');
  }
  function openAbout() {
    if (!state.theme || surface !== 'work' || gated() || document.querySelector('dialog[open],.overlay,.who-menu')) return;
    if (panel?.isConnected && panelTheme !== state.theme.id) closeAbout(false);
    aboutOpen = true;
    if (!panel?.isConnected) {
      panel = document.createElement('dialog'); panel.id = 'kb-occasion-panel';
      panel.className = 'kb-occasion-panel kb-season-with-ticker';
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'kb-occasion-title');
      panel.innerHTML = '<div class="kb-occasion-panel-heading"><div class="kb-occasion-panel-copy"><h2 id="kb-occasion-title" aria-label="' + esc(state.theme.label) + '" title="' + esc(state.theme.label) + '">' + esc(labelFor(state.theme)) + '</h2><span class="kb-season-language-slot" data-kb-language></span></div><a class="kb-occasion-home" href="#/" aria-label="Kitchen Book home" title="Kitchen Book home">Home</a><button class="kb-occasion-close" type="button" aria-label="Close occasion explanation">×</button></div><div data-kb-ticker></div>';
      panel.querySelector('.kb-occasion-close').addEventListener('click', () => closeAbout(true));
      panel.addEventListener('cancel', event => { event.preventDefault(); closeAbout(true); });
      panel.addEventListener('click', event => {
        if (event.target !== panel) return;
        const bounds = panel.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeAbout(true);
      });
      document.body.append(panel); panelTheme = state.theme.id;
      panel.showModal();
    }
    aboutButton()?.setAttribute('aria-expanded', 'true');
    KB_CELEBRATION_TICKER.mount(panel.querySelector('[data-kb-ticker]'), state.theme, { mode: state.mode, surface: 'work', languageHost: panel.querySelector('[data-kb-language]') });
    positionPanel();
    panel.querySelector('.kb-occasion-close').focus({ preventScroll: true });
    publishSoon();
  }
  function workControl() {
    // Work pages keep Kitchen Book and the chef hat. A stamp beside the name opens the explanation.
    const start = root.querySelector('.wtop-start');
    if (!start) return null;
    const title = start.querySelector('.kb-occasion-title');
    if (title) { const original = originalBrands.get(start); if (original) title.replaceWith(original); else title.remove(); }
    let button = start.querySelector('.kb-occasion-stamp');
    if (!button) {
      button = document.createElement('button'); button.type = 'button';
      button.className = 'kb-occasion-trigger kb-occasion-stamp';
      button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'kb-occasion-panel');
      button.setAttribute('aria-expanded', String(aboutOpen));
      button.addEventListener('click', () => aboutOpen ? closeAbout(true) : openAbout());
      const brand = start.querySelector('.wtop-brand');
      if (brand) brand.after(button); else start.append(button);
    }
    if (button.dataset.occasion !== state.theme.id) {
      button.innerHTML = '<span class="kb-occasion-glyph" aria-hidden="true">' + (window.KB_STAMPS?.svg(state.theme.id) || art(state.theme.icon, state.theme)) + '</span>';
      button.dataset.occasion = state.theme.id;
      button.setAttribute('aria-label', state.theme.label + ': what it is');
      button.title = state.theme.label;
      root.dataset.kbEffects = '';
    }
    if (handoffPending) handoff(button);
    return button;
  }
  function update(force) {
    const nextSurface = isHome() ? 'home' : 'work', nextRoute = location.hash || '#/';
    const routeChanged = route !== nextRoute, surfaceChanged = surface !== nextSurface;
    if (routeChanged || surfaceChanged) {
      const hadExplanation = Boolean(aboutOpen && panel?.isConnected);
      if (surface === 'home' && nextSurface === 'work' && state.theme) handoffPending = true;
      closeAbout(false);
      route = nextRoute; surface = nextSurface;
      root.dataset.kbEffects = '';
      // The app may draw the new heading while the old modal still makes it inert.
      // Complete that route's focus handoff only when navigation closed this explanation.
      if (routeChanged && hadExplanation && !gated()) root.querySelector('#rtitle')?.focus({ preventScroll: true });
    }
    const theme = gated() ? null : state.theme, signature = (theme ? theme.id : 'off') + '|' + state.mode + '|' + state.density + '|' + surface;
    root.dataset.kbTheme = theme ? theme.id : 'off'; root.dataset.kbCelebrationSurface = surface;
    // The chef hat opens each person's menu and carries the mail count, so a celebration never replaces it (3 Nov 2026).
    let note = root.querySelector('[data-kb-season]');
    const home = surface === 'home' ? root.querySelector('.wall-main .dockets') : null;
    if (!theme) {
      closeAbout(false); stopHandoff(); handoffPending = false;
      if (window.KB_CELEBRATION_TICKER?.status().themeId) KB_CELEBRATION_TICKER.clear();
      note?.remove(); restoreBrand();
    } else if (home) {
      closeAbout(false); restoreBrand(); handoffPending = false;
      if (!note || note.dataset.kbSeason !== theme.id) {
        note?.remove(); root.dataset.kbEffects = '';
        note = document.createElement('aside'); note.dataset.kbSeason = theme.id; note.dataset.kbSeasonLayout = 'home';
        note.className = 'kb-season-note kb-season-with-ticker'; note.setAttribute('aria-label', theme.label + ' seasonal detail');
        note.innerHTML = '<div class="kb-season-heading"><div class="kb-season-note-art" aria-hidden="true">' + art(theme.icon, theme) + '</div><h3 aria-label="' + esc(theme.label) + '" title="' + esc(theme.label) + '">' + esc(labelFor(theme)) + '</h3><span class="kb-season-language-slot" data-kb-language></span></div><div data-kb-ticker></div>';
        home.before(note);
      }
      KB_CELEBRATION_TICKER.mount(note.querySelector('[data-kb-ticker]'), theme, { mode: state.mode, surface: 'home', languageHost: note.querySelector('[data-kb-language]') });
    } else {
      note?.remove();
      if (!aboutOpen && window.KB_CELEBRATION_TICKER?.status().themeId) KB_CELEBRATION_TICKER.clear();
      workControl();
      if (aboutOpen) {
        if (panelTheme !== theme.id) closeAbout(false);
        else if (panel?.isConnected) {
          KB_CELEBRATION_TICKER.mount(panel.querySelector('[data-kb-ticker]'), theme, { mode: state.mode, surface: 'work', languageHost: panel.querySelector('[data-kb-language]') });
          aboutButton()?.setAttribute('aria-expanded', 'true');
        }
      }
    }
    if (force || root.dataset.kbEffects !== signature) {
      KB_EFFECTS.render(theme || { id: 'off', effect: 'still' }, theme ? state.mode : 'still', state.density, { surface });
      root.dataset.kbEffects = signature;
    }
    publishSoon();
  }
  function schedule() { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; update(false); }); }
  function status() { return { themeId: state.theme?.id || null, gated: gated(), surface, aboutOpen: Boolean(aboutOpen && panel?.isConnected), handoffCount, handoffActive: Boolean(handoffTimer && handoffTarget?.isConnected), route }; }
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  // Device-choice dialogs live beside the app and must also quiet the seasonal layer.
  new MutationObserver(schedule).observe(document.body, { childList: true });
  window.addEventListener('hashchange', () => { root.dataset.kbEffects = ''; schedule(); });
  window.addEventListener('resize', positionPanel);
  reduced.addEventListener('change', () => { if (reduced.matches) stopHandoff(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopHandoff(); });
  function configure(value = {}) {
    const previousId = state.theme?.id;
    // The controller passes a vetted record from the bundled catalogue, never saved SVG or HTML.
    const requested = value.theme && window.KB_COMPLETE_ART?.find(theme => theme.id === value.theme.id);
    state = { theme: requested || null, mode: value.mode === 'gentle' ? 'gentle' : 'still', density: value.density === 'light' ? 'light' : 'festive' };
    if (state.mode !== 'gentle') stopHandoff();
    if (previousId !== state.theme?.id) closeAbout(false);
    update(false);
    return status();
  }
  function replay() {
    KB_EFFECTS.replay(); window.KB_CELEBRATION_TICKER?.replay(); publishSoon();
  }
  document.addEventListener('kb-motion-state', () => { if (KB_EFFECTS.status().state === 'paused') stopHandoff(); publishSoon(); });
  document.addEventListener('kb-celebration-state', publishSoon);
  window.KB_THEME_BRIDGE = { configure, status, openAbout, closeAbout, replay };
  window.addEventListener('lk-access', schedule);
  window.addEventListener('lk-device', schedule);
  schedule();
})();
