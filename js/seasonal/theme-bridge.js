/* Home keeps the full seasonal ambience. Work pages move only inside the top bar.
   This module decorates static app markup and never reads or writes kitchen records. */
(function () {
  'use strict';
  const originalHats = new WeakMap(), originalBrands = new WeakMap(), root = document.getElementById('app'), layer = document.createElement('div');
  layer.id = 'kb-festive-effects'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let state = { theme: null, mode: 'still', density: 'festive' }, frame = 0, publishFrame = 0;
  let surface = 'work', route = location.hash || '#/', aboutOpen = false, panel = null, panelTheme = null;
  let handoffCount = 0, handoffTimer = 0, handoffTarget = null, handoffPending = false;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    const start = root.querySelector('.wtop-start'), title = start?.querySelector('.kb-occasion-title');
    if (title) {
      const original = originalBrands.get(start);
      if (original) title.replaceWith(original); else title.remove();
    }
    root.querySelectorAll('.wtop-icons .kb-occasion-trigger').forEach(button => button.remove());
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
      panel.innerHTML = '<div class="kb-occasion-panel-heading"><h2 id="kb-occasion-title">' + esc(state.theme.label) + '</h2><button class="kb-occasion-close" type="button" aria-label="Close occasion explanation">×</button></div><div data-kb-ticker></div><a class="kb-occasion-home" href="#/">Kitchen Book home</a>';
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
    KB_CELEBRATION_TICKER.mount(panel.querySelector('[data-kb-ticker]'), state.theme, { mode: state.mode, surface: 'work' });
    positionPanel();
    panel.querySelector('.kb-occasion-close').focus({ preventScroll: true });
    publishSoon();
  }
  function workControl() {
    const start = root.querySelector('.wtop-start');
    if (!start) return null;
    root.querySelectorAll('.wtop-icons .kb-occasion-trigger').forEach(button => button.remove());
    let button = start.querySelector('.kb-occasion-title');
    if (!button) {
      button = document.createElement('button'); button.type = 'button';
      button.className = 'kb-occasion-trigger kb-occasion-title';
      button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'kb-occasion-panel');
      button.setAttribute('aria-expanded', String(aboutOpen));
      button.addEventListener('click', () => aboutOpen ? closeAbout(true) : openAbout());
      const brand = start.querySelector('.wtop-brand');
      if (brand) { originalBrands.set(start, brand); brand.replaceWith(button); } else start.append(button);
    }
    if (button.dataset.occasion !== state.theme.id) {
      // Pi Day's official alternate name remains available in the accessible label and explanation.
      const label = state.theme.id === 'fun-pi-day' ? 'Pi Day' : state.theme.label;
      button.innerHTML = '<span class="kb-occasion-title-art kb-occasion-glyph" aria-hidden="true">' + art(state.theme.icon, state.theme) + '</span><span class="kb-occasion-title-copy">' + esc(label) + '</span>';
      button.dataset.occasion = state.theme.id;
      button.setAttribute('aria-label', state.theme.label + ': About this occasion');
      button.title = state.theme.label + ' · About this occasion';
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
    const button = root.querySelector('.wtop-who'), hat = button && button.querySelector('svg');
    if (button && hat) {
      if (!originalHats.has(button)) originalHats.set(button, hat.outerHTML);
      if (button.dataset.kbTheme !== signature) {
        hat.outerHTML = theme ? art(theme.icon, theme, 'kb-festive-hat') : originalHats.get(button);
        button.dataset.kbTheme = signature; root.dataset.kbEffects = '';
      }
    }
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
        note.innerHTML = '<div class="kb-season-heading"><div class="kb-season-note-art" aria-hidden="true">' + art(theme.scene, theme) + '</div><h3>' + esc(theme.label) + '</h3></div><div data-kb-ticker></div>';
        home.before(note);
      }
      KB_CELEBRATION_TICKER.mount(note.querySelector('[data-kb-ticker]'), theme, { mode: state.mode, surface: 'home' });
    } else {
      note?.remove();
      if (!aboutOpen && window.KB_CELEBRATION_TICKER?.status().themeId) KB_CELEBRATION_TICKER.clear();
      workControl();
      if (aboutOpen) {
        if (panelTheme !== theme.id) closeAbout(false);
        else if (panel?.isConnected) {
          KB_CELEBRATION_TICKER.mount(panel.querySelector('[data-kb-ticker]'), theme, { mode: state.mode, surface: 'work' });
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
