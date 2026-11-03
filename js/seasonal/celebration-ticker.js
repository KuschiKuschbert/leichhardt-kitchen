/* Seasonal event context. DOM text, one scheduler, and no runtime translation service. */
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const order = ['en', 'fil', 'ban', 'ne', 'hi', 'de'];
  const fallbackLocales = {
    en: { code: 'en', label: 'English', nativeName: 'English' },
    fil: { code: 'fil', label: 'Filipino', nativeName: 'Filipino' },
    ban: { code: 'ban', label: 'Balinese', nativeName: 'Basa Bali' },
    ne: { code: 'ne', label: 'Nepali', nativeName: 'नेपाली' },
    hi: { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
    de: { code: 'de', label: 'German', nativeName: 'Deutsch' }
  };
  let current = null, dwellTimer = 0, transitionTimer = 0, transitionFrame = 0;
  let deadline = 0, remaining = 0, revision = 0, cycleCount = 0, automaticCycleCount = 0;
  let externalPause = false, lastState = 'off', readingLocale = 'en';
  const settings = { dwellMs: null, transitionMs: 520 };
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  };
  function announce() { document.dispatchEvent(new CustomEvent('kb-celebration-state')); }
  function localesFor(entry) {
    const supplied = window.KB_CELEBRATION_COPY?.locales || [];
    return order.filter(code => typeof entry[code] === 'string' && entry[code].trim()).map(code => ({ ...fallbackLocales[code], ...(supplied.find(item => item.code === code) || {}) }));
  }
  function locale() { return current?.locales[current.index]; }
  function sentence() { return current ? current.entry[locale().code] : ''; }
  function dwellFor(index = current?.index || 0) {
    if (settings.dwellMs != null) return settings.dwellMs;
    const value = current ? current.entry[current.locales[index].code] : '';
    return Math.max(8000, Math.min(16000, 3000 + Array.from(value).length * 48));
  }
  function ambientPaused() { return window.KB_EFFECTS?.status?.().state === 'paused'; }
  function state() {
    if (!current) return 'off';
    if (!current.host?.isConnected) return 'detached';
    if (current.mode !== 'gentle') return 'still';
    if (reduced.matches) return 'reduced-motion';
    if (externalPause || document.hidden || ambientPaused()) return 'hidden';
    if (!current.fontsReady) return 'waiting-fonts';
    return 'running';
  }
  function canAnimate() {
    return current && current.mode === 'gentle' && !reduced.matches && !externalPause && !document.hidden && !ambientPaused();
  }
  function clearDwell(preserve) {
    if (dwellTimer && preserve) remaining = Math.max(0, deadline - performance.now());
    clearTimeout(dwellTimer); dwellTimer = 0; deadline = 0;
  }
  function disposeHost(host) {
    // The badge can share the application's heading, but it still belongs to this ticker.
    if (current?.host === host) current.refs?.language.remove();
    host?.replaceChildren();
  }
  function finishTransition() {
    clearTimeout(transitionTimer); transitionTimer = 0;
    cancelAnimationFrame(transitionFrame); transitionFrame = 0;
    if (!current?.refs) return;
    current.refs.lines.forEach((line, index) => {
      const active = index === current.activeLine;
      line.classList.toggle('is-current', active);
      line.classList.remove('is-leaving');
      line.setAttribute('aria-hidden', String(!active));
    });
    current.transitioning = false;
  }
  function controlState() {
    if (!current?.refs) return;
    const refs = current.refs, reason = state(), chosen = locale();
    text(refs.language, chosen.nativeName);
    refs.language.lang = chosen.code;
    current.host.dataset.tickerState = reason;
    current.host.dataset.tickerLocale = chosen.code;
    current.host.dataset.tickerSurface = current.surface;
    current.host.classList.toggle('is-static', !canAnimate());
  }
  function reconcile() {
    const reason = state(), changed = reason !== lastState;
    if (reason !== 'running') {
      clearDwell(true);
      if (['off', 'detached', 'still', 'reduced-motion', 'hidden'].includes(reason)) finishTransition();
    } else if (!dwellTimer && !current.transitioning) {
      const wait = remaining > 0 ? remaining : dwellFor();
      remaining = wait; deadline = performance.now() + wait;
      dwellTimer = setTimeout(() => {
        dwellTimer = 0; deadline = 0; remaining = 0;
        if (state() !== 'running') { reconcile(); return; }
        advance((current.index + 1) % current.locales.length, true);
      }, wait);
    }
    controlState();
    lastState = reason;
    if (changed) announce();
  }
  function advance(index, automatic) {
    if (!current || !current.host.isConnected) { reconcile(); return false; }
    clearDwell(false); finishTransition();
    const previous = current.activeLine;
    current.index = (index + current.locales.length) % current.locales.length;
    readingLocale = locale().code;
    const incomingIndex = 1 - previous, incoming = current.refs.lines[incomingIndex], outgoing = current.refs.lines[previous];
    text(incoming, sentence()); incoming.lang = locale().code; incoming.dataset.locale = locale().code;
    incoming.setAttribute('aria-hidden', 'false'); outgoing.setAttribute('aria-hidden', 'true');
    current.activeLine = incomingIndex;
    remaining = dwellFor(); cycleCount += 1; if (automatic) automaticCycleCount += 1; revision += 1;
    controlState();
    if (canAnimate() && settings.transitionMs > 0) {
      current.transitioning = true;
      current.host.style.setProperty('--kb-ticker-transition', settings.transitionMs + 'ms');
      const model = current;
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => {
          transitionFrame = 0;
          if (current !== model || !model.host.isConnected) return;
          outgoing.classList.remove('is-current'); outgoing.classList.add('is-leaving');
          incoming.classList.remove('is-leaving'); incoming.classList.add('is-current');
          transitionTimer = setTimeout(() => { finishTransition(); reconcile(); announce(); }, settings.transitionMs + 40);
        });
      });
    } else { finishTransition(); reconcile(); }
    announce(); return true;
  }
  function build(host) {
    finishTransition();
    disposeHost(host);
    host.classList.add('kb-celebration-ticker'); host.dataset.kbTicker = current.id;
    host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'Celebration context in six languages');
    const language = element('span', 'kb-ticker-language');
    if (current.languageHost) current.languageHost.replaceChildren(language);
    else {
      const meta = element('div', 'kb-ticker-meta'); meta.append(language); host.append(meta);
    }
    const stage = element('div', 'kb-ticker-texts'); stage.setAttribute('aria-live', 'off');
    current.locales.forEach(item => {
      const sizer = element('p', 'kb-ticker-sizer', current.entry[item.code]);
      sizer.lang = item.code; sizer.setAttribute('aria-hidden', 'true'); sizer.setAttribute('inert', '');
      stage.append(sizer);
    });
    const lines = [element('p', 'kb-ticker-line is-current'), element('p', 'kb-ticker-line')];
    current.activeLine = 0;
    lines.forEach((line, index) => {
      line.setAttribute('aria-hidden', String(index !== 0));
      if (!index) { line.textContent = sentence(); line.lang = locale().code; line.dataset.locale = locale().code; }
      stage.append(line);
    });
    host.append(stage);
    current.refs = { stage, lines, language };
    const model = current;
    current.fontsReady = !document.fonts;
    if (document.fonts) {
      Promise.allSettled([document.fonts.ready, document.fonts.load('400 16px "Barlow"'), document.fonts.load('400 16px "Kitchenbook Devanagari"')]).then(() => {
        if (current !== model || current.host !== host || !host.isConnected) return;
        model.fontsReady = true; reconcile(); announce();
      });
    }
    controlState();
  }
  function mount(host, theme, options = {}) {
    const entry = theme && window.KB_CELEBRATION_COPY?.events?.[theme.id];
    if (!host || !theme || !entry) { clear(); return; }
    const available = localesFor(entry);
    if (!available.length) { clear(); return; }
    const languageHost = options.languageHost?.isConnected ? options.languageHost : null;
    const newEvent = !current || current.id !== theme.id;
    if (newEvent) {
      clearDwell(false); finishTransition();
      if (current) disposeHost(current.host);
      const index = Math.max(0, available.findIndex(item => item.code === readingLocale));
      current = { id: theme.id, host, languageHost, entry, locales: available, index, activeLine: 0, mode: options.mode === 'gentle' ? 'gentle' : 'still', surface: options.surface === 'work' ? 'work' : 'home', fontsReady: false, transitioning: false, refs: null };
      remaining = dwellFor(); revision += 1;
      build(host);
    } else {
      current.mode = options.mode === 'gentle' ? 'gentle' : 'still';
      current.surface = options.surface === 'work' ? 'work' : 'home';
      if (current.host !== host || current.languageHost !== languageHost || !host.querySelector('.kb-ticker-texts')) {
        disposeHost(current.host);
        current.host = host; current.languageHost = languageHost; build(host);
      }
    }
    reconcile();
  }
  function clear() {
    clearDwell(false); finishTransition();
    if (current) readingLocale = locale().code;
    if (current?.host) disposeHost(current.host);
    current = null; remaining = 0; lastState = 'off'; announce();
  }
  function status() {
    return {
      state: state(), themeId: current?.id || null, locale: locale()?.code || null, index: current?.index ?? null, surface: current?.surface || null,
      cycleCount, automaticCycleCount, revision, dwellMs: current ? dwellFor() : 0,
      remainingMs: dwellTimer ? Math.max(0, deadline - performance.now()) : remaining,
      timerCount: Number(Boolean(dwellTimer)) + Number(Boolean(transitionTimer)), frameCount: Number(Boolean(transitionFrame)),
      activeInstances: current ? 1 : 0, transitioning: Boolean(current?.transitioning), fontsReady: Boolean(current?.fontsReady),
      reservedHeight: current?.refs?.stage.getBoundingClientRect().height || 0,
      availableLocales: current ? current.locales.map(item => item.code) : [],
      pinnedLocale: null,
      configDwellMs: settings.dwellMs, transitionMs: settings.transitionMs
    };
  }
  reduced.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  document.addEventListener('kb-motion-state', reconcile);
  window.KB_CELEBRATION_TICKER = {
    mount, clear, status,
    next() { return current ? advance((current.index + 1) % current.locales.length, false) : false; },
    pause(on) { externalPause = Boolean(on); reconcile(); announce(); },
    replay() {
      if (!current) return;
      advance(0, false);
    },
    configure(options = {}) {
      if (Object.hasOwn(options, 'dwellMs')) settings.dwellMs = options.dwellMs == null ? null : Math.max(250, Math.min(60000, Number(options.dwellMs) || 8000));
      if (Object.hasOwn(options, 'transitionMs')) settings.transitionMs = Math.max(0, Math.min(1500, Number(options.transitionMs) || 0));
      if (current) { clearDwell(false); remaining = dwellFor(); reconcile(); }
      return status();
    }
  };
})();
