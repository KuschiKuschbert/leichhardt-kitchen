/* Device-only celebrations. Uses the book's Queensland clock and static public artwork, with no Firebase reads. */
(function () {
  'use strict';
  const KEY = 'lk.seasonal.v1', root = document.getElementById('app');
  const catalogue = window.KB_COMPLETE_ART || [], byId = new Map(catalogue.map(item => [item.id, item]));
  const main = window.KB_MAIN_FESTIVALS || {};
  const mainIds = new Set([...(main.defaultIds || []), ...(main.sharedFamilies || []).flatMap(family => family.variantIds || []), ...(main.calendarCompanions || [])]);
  let prefs = read(), mounted = null, settingsManual = false, activeId = '', signature = '', settingsFrame = 0;
  function clean(value) {
    value = value && typeof value === 'object' ? value : {};
    return {
      selection: ['auto', 'off'].includes(value.selection) || byId.has(value.selection) ? value.selection : 'auto',
      motion: value.motion === 'still' ? 'still' : 'gentle',
      density: value.density === 'light' ? 'light' : 'festive'
    };
  }
  function read() {
    // Lasts until changed or the browser's site data is cleared. No person or kitchen data.
    try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { return clean({}); }
  }
  function configure(value) {
    if (['auto', 'off'].includes(value?.selection)) settingsManual = false;
    prefs = clean({ ...prefs, ...value });
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) {}
    refresh(); return status();
  }
  function refresh() {
    const day = window.LK_TIME?.day() || '';
    const scheduled = prefs.selection === 'auto' && window.LK_TIME?.ready() ? window.KB_SEASONAL_CALENDAR?.resolve(day) : null;
    const theme = byId.get(prefs.selection === 'auto' ? scheduled?.id : prefs.selection) || null;
    const next = (theme?.id || 'off') + '|' + prefs.motion + '|' + prefs.density;
    activeId = theme?.id || '';
    if (next !== signature) { signature = next; window.KB_THEME_BRIDGE.configure({ theme, mode: prefs.motion, density: prefs.density }); }
    paintSettings();
  }
  function status() {
    return { preferences: { ...prefs }, themeId: activeId || null, day: window.LK_TIME?.day(), celebration: window.KB_THEME_BRIDGE.status(), motion: window.KB_EFFECTS.status(), ticker: window.KB_CELEBRATION_TICKER.status() };
  }
  function button(label, attribute, value) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'chip'; node.textContent = label; node.setAttribute(attribute, value); return node;
  }
  function group(label, options, attribute) {
    const field = document.createElement('div'); field.className = 'kb-seasonal-field';
    const title = document.createElement('span'); title.className = 'label'; title.textContent = label;
    const row = document.createElement('div'); row.className = 'chips'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
    options.forEach(([value, text]) => row.append(button(text, attribute, value))); field.append(title, row); return field;
  }
  function mountSettings() {
    settingsFrame = 0;
    const slot = root.querySelector('#kb-seasonal-settings');
    if (!slot) { mounted = null; return; }
    if (mounted === slot) return;
    mounted = slot;
    const section = document.createElement('section'); section.className = 'set-block kb-seasonal-settings'; section.setAttribute('aria-label', 'Seasonal celebrations');
    const title = document.createElement('h3'); title.textContent = 'Seasonal celebrations';
    const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Automatic follows the main festival calendar in Queensland time. Home has the full ambience. Work pages keep movement in the top bar. Saved on this device.';
    const today = document.createElement('p'); today.className = 'hint'; today.dataset.seasonalCurrent = '';
    section.append(title, hint, group('Celebrations', [['auto', 'Automatic'], ['manual', 'Choose a celebration'], ['off', 'Off']], 'data-seasonal-selection'), today);
    const chooser = document.createElement('div'); chooser.className = 'kb-seasonal-chooser'; chooser.hidden = true;
    const label = document.createElement('label'); label.textContent = 'Find a celebration'; label.htmlFor = 'kb-seasonal-search';
    const input = document.createElement('input'); input.id = 'kb-seasonal-search'; input.type = 'search'; input.dataset.seasonalSearch = ''; input.placeholder = 'Name, country or festival'; input.autocomplete = 'off';
    const scope = document.createElement('select'); scope.dataset.seasonalScope = ''; scope.setAttribute('aria-label', 'Celebration collection');
    [['main', 'Main festivals'], ['all', 'All 204 designs']].forEach(([value, name]) => { const option = document.createElement('option'); option.value = value; option.textContent = name; scope.append(option); });
    const list = document.createElement('div'); list.className = 'kb-seasonal-results'; list.dataset.seasonalResults = '';
    const count = document.createElement('p'); count.className = 'hint'; count.dataset.seasonalCount = ''; count.setAttribute('aria-live', 'polite');
    chooser.append(label, input, scope, list, count); section.append(chooser);
    section.append(group('Movement', [['gentle', 'Animated'], ['still', 'Still']], 'data-seasonal-motion'));
    section.append(group('Ambience', [['light', 'Subtle'], ['festive', 'Full']], 'data-seasonal-density'));
    const replay = button('Replay celebration', 'data-seasonal-replay', ''); replay.className = 'btn'; section.append(replay);
    const schedule = document.createElement('p'); schedule.className = 'hint'; schedule.textContent = 'Changing local dates use confirmed annual records. Dates awaiting announcement stay available in Choose a celebration. The six explanation languages cycle automatically.'; section.append(schedule); slot.append(section);
    input.addEventListener('input', paintResults); scope.addEventListener('change', paintResults);
    section.addEventListener('click', event => {
      const target = event.target.closest('button'); if (!target) return;
      if (target.hasAttribute('data-seasonal-selection')) {
        const selection = target.dataset.seasonalSelection; settingsManual = selection === 'manual';
        if (settingsManual) { paintSettings(); input.focus(); } else configure({ selection });
      } else if (target.hasAttribute('data-seasonal-theme')) configure({ selection: target.dataset.seasonalTheme });
      else if (target.hasAttribute('data-seasonal-motion')) configure({ motion: target.dataset.seasonalMotion });
      else if (target.hasAttribute('data-seasonal-density')) configure({ density: target.dataset.seasonalDensity });
      else if (target.hasAttribute('data-seasonal-replay')) window.KB_THEME_BRIDGE.replay();
    }); paintSettings(); paintResults();
  }
  function paintSettings() {
    if (!mounted?.isConnected) return;
    mounted.querySelectorAll('[data-seasonal-selection]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.seasonalSelection === (byId.has(prefs.selection) || settingsManual ? 'manual' : prefs.selection))));
    for (const key of ['motion', 'density']) mounted.querySelectorAll('[data-seasonal-' + key + ']').forEach(node => node.setAttribute('aria-pressed', String(node.dataset['seasonal' + key[0].toUpperCase() + key.slice(1)] === prefs[key])));
    const current = mounted.querySelector('[data-seasonal-current]'), label = byId.get(activeId)?.label;
    const text = label ? 'Showing: ' + label : prefs.selection === 'off' ? 'Celebrations are off.' : prefs.selection === 'auto' && !window.LK_TIME?.ready() ? 'Checking the kitchen date...' : 'No scheduled celebration today.';
    if (current.textContent !== text) current.textContent = text;
    mounted.querySelector('.kb-seasonal-chooser').hidden = !settingsManual && !byId.has(prefs.selection);
    mounted.querySelector('[data-seasonal-replay]').disabled = !activeId || prefs.motion === 'still';
    mounted.querySelectorAll('[data-seasonal-theme]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.seasonalTheme === prefs.selection)));
  }
  function paintResults() {
    if (!mounted?.isConnected) return;
    const query = mounted.querySelector('[data-seasonal-search]').value.trim().toLocaleLowerCase();
    const all = mounted.querySelector('[data-seasonal-scope]').value === 'all';
    const matches = catalogue.filter(item => (all || mainIds.has(item.id)) && [item.label, item.region, item.country, item.id, ...(item.aliases || [])].join(' ').toLocaleLowerCase().includes(query));
    const list = mounted.querySelector('[data-seasonal-results]'); list.replaceChildren();
    matches.slice(0, 8).forEach(item => {
      const node = button(item.label, 'data-seasonal-theme', item.id); node.setAttribute('aria-pressed', String(prefs.selection === item.id));
      // Bundled public artwork only: the stamp where there is one, otherwise the drawing.
      const mark = document.createElement('span'); mark.className = 'kb-seasonal-mark'; mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = window.KB_STAMPS?.svg(item.id) || (window.KB_THEME_BRAND ? KB_THEME_BRAND.style(item.icon, { themeId: item.id }) : '');
      node.prepend(mark); list.append(node);
    });
    mounted.querySelector('[data-seasonal-count]').textContent = !matches.length ? 'No celebrations match.' : matches.length > 8 ? 'Showing 8 of ' + matches.length + '. Type a name to narrow the list.' : matches.length + (matches.length === 1 ? ' celebration' : ' celebrations');
  }
  new MutationObserver(() => { if (settingsFrame || root.querySelector('#kb-seasonal-settings') === mounted) return; settingsFrame = requestAnimationFrame(mountSettings); }).observe(root, { childList: true, subtree: true });
  window.addEventListener('lk-clock', refresh);
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { prefs = read(); refresh(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  // One local clock check a minute, no network requests. Midnight refreshes the active occasion in an open book.
  setInterval(refresh, 60000);
  window.KB_SEASONAL = { configure, refresh, status }; refresh(); mountSettings();
})();
