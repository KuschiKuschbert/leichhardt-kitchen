/* Device-only celebrations. Uses the book's Queensland clock and static public artwork, with no Firebase reads. */
(function () {
  'use strict';
  const KEY = 'lk.seasonal.v1', root = document.getElementById('app');
  const catalogue = window.KB_COMPLETE_ART || [], byId = new Map(catalogue.map(item => [item.id, item]));
  // One celebration for everyone, from the kitchen calendar: nobody picks one (head chef, 4 Nov 2026).
  let prefs = read(), mounted = null, design = '', activeId = '', signature = '', settingsFrame = 0;
  function clean(value) {
    value = value && typeof value === 'object' ? value : {};
    // A celebration chosen by hand on an older book is not kept: that device goes back to the calendar.
    return { selection: value.selection === 'off' ? 'off' : 'auto', motion: value.motion === 'still' ? 'still' : 'gentle', density: value.density === 'light' ? 'light' : 'festive' };
  }
  function read() {
    // This device's On or Off and how much moves. Lasts until changed or the browser's site data is cleared.
    // No person or kitchen data.
    try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { return clean({}); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) {} }
  function configure(value) {
    // A design named here shows in this tab only, for the click tests and design checks. It is never saved, nothing in
    // the book offers it, and the next load goes back to the calendar.
    if (value && 'selection' in value) design = byId.has(value.selection) ? value.selection : '';
    prefs = clean({ ...prefs, ...value, selection: design ? prefs.selection : value?.selection ?? prefs.selection });
    save(); refresh(); return status();
  }
  // Calendar lookahead from the kitchen date: plain date arithmetic on YYYY-MM-DD, never the phone's own clock.
  const DAY = 86400000, WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const utc = day => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const addDays = (day, n) => new Date(utc(day) + n * DAY).toISOString().slice(0, 10);
  const short = day => { const t = new Date(utc(day)); return WEEKDAYS[t.getUTCDay()].slice(0, 3) + ' ' + t.getUTCDate() + ' ' + MONTHS[t.getUTCMonth()]; };
  function upcoming(day, limit, span) {
    const C = window.KB_SEASONAL_CALENDAR, out = [], seen = new Set([C?.resolve(day)?.id]);
    if (!C || !day) return out;
    for (let i = 1; i <= span && out.length < limit; i++) {
      const next = addDays(day, i), hit = C.resolve(next);
      if (!hit || seen.has(hit.id) || !byId.has(hit.id)) continue;
      seen.add(hit.id);
      out.push({ id: hit.id, label: byId.get(hit.id).label, day: next, away: i, when: i === 1 ? 'tomorrow' : i < 7 ? WEEKDAYS[new Date(utc(next)).getUTCDay()] : short(next), date: short(next) });
    }
    return out;
  }
  function dayCount(record, day) {
    if (!record || record.start === record.end) return null;
    return { n: Math.round((utc(day) - utc(record.start)) / DAY) + 1, of: Math.round((utc(record.end) - utc(record.start)) / DAY) + 1 };
  }
  function refresh() {
    const ready = Boolean(window.LK_TIME?.ready()), day = window.LK_TIME?.day() || '';
    const automatic = !design && prefs.selection === 'auto' && ready;
    const scheduled = automatic ? window.KB_SEASONAL_CALENDAR?.resolve(day) : null;
    const theme = byId.get(design || scheduled?.id) || null;
    const soon = automatic ? upcoming(day, 2, 7) : [], count = automatic && theme ? dayCount(scheduled, day) : null;
    const next = (theme?.id || 'off') + '|' + prefs.motion + '|' + prefs.density + '|' + soon.map(item => item.id + item.when).join(',') + '|' + (count ? count.n + '/' + count.of : '');
    activeId = theme?.id || '';
    if (next !== signature) { signature = next; window.KB_THEME_BRIDGE.configure({ theme, mode: prefs.motion, density: prefs.density, upcoming: soon, dayCount: count }); }
    paintSettings();
  }
  function status() {
    return { upcoming: window.LK_TIME?.ready() ? upcoming(window.LK_TIME.day(), 5, 180) : [], preferences: { ...prefs }, themeId: activeId || null, day: window.LK_TIME?.day(), celebration: window.KB_THEME_BRIDGE.status(), motion: window.KB_EFFECTS.status(), ticker: window.KB_CELEBRATION_TICKER.status() };
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
    const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'The kitchen calendar picks the celebration, in Queensland time, the same on every device. Home has the ambience. Work pages keep Kitchen Book, with the celebration stamp beside it and a still edge on the top bar. On, Off and movement are saved on this device.';
    const today = document.createElement('p'); today.className = 'hint'; today.dataset.seasonalCurrent = '';
    section.append(title, hint, group('Celebrations', [['auto', 'On'], ['off', 'Off']], 'data-seasonal-selection'), today);
    section.append(group('Movement', [['gentle', 'Animated'], ['still', 'Still']], 'data-seasonal-motion'));
    section.append(group('Ambience', [['light', 'Subtle'], ['festive', 'Full']], 'data-seasonal-density'));
    const replay = button('Replay celebration', 'data-seasonal-replay', ''); replay.className = 'btn'; section.append(replay);
    const comingTitle = document.createElement('span'); comingTitle.className = 'label'; comingTitle.textContent = 'Coming up';
    const coming = document.createElement('ul'); coming.className = 'kb-seasonal-coming'; coming.dataset.seasonalComing = '';
    const comingField = document.createElement('div'); comingField.className = 'kb-seasonal-field'; comingField.append(comingTitle, coming); section.append(comingField);
    const schedule = document.createElement('p'); schedule.className = 'hint'; schedule.textContent = 'Dates that change each year come from confirmed annual records. The six explanation languages cycle automatically.'; section.append(schedule); slot.append(section);
    section.addEventListener('click', event => {
      const target = event.target.closest('button'); if (!target) return;
      if (target.hasAttribute('data-seasonal-selection')) configure({ selection: target.dataset.seasonalSelection });
      else if (target.hasAttribute('data-seasonal-motion')) configure({ motion: target.dataset.seasonalMotion });
      else if (target.hasAttribute('data-seasonal-density')) configure({ density: target.dataset.seasonalDensity });
      else if (target.hasAttribute('data-seasonal-replay')) window.KB_THEME_BRIDGE.replay();
    }); paintSettings();
  }
  function paintSettings() {
    if (!mounted?.isConnected) return;
    mounted.querySelectorAll('[data-seasonal-selection]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.seasonalSelection === prefs.selection)));
    for (const key of ['motion', 'density']) mounted.querySelectorAll('[data-seasonal-' + key + ']').forEach(node => node.setAttribute('aria-pressed', String(node.dataset['seasonal' + key[0].toUpperCase() + key.slice(1)] === prefs[key])));
    const current = mounted.querySelector('[data-seasonal-current]'), label = byId.get(activeId)?.label;
    const text = label ? 'Showing: ' + label : prefs.selection === 'off' ? 'Celebrations are off.' : prefs.selection === 'auto' && !window.LK_TIME?.ready() ? 'Checking the kitchen date...' : 'No scheduled celebration today.';
    if (current.textContent !== text) current.textContent = text;
    mounted.querySelector('[data-seasonal-replay]').disabled = !activeId || prefs.motion === 'still';
    const coming = mounted.querySelector('[data-seasonal-coming]'), day = window.LK_TIME?.ready() ? window.LK_TIME.day() : '';
    const list = day ? upcoming(day, 5, 180) : [], comingKey = day + '|' + list.map(item => item.id).join(',');
    if (coming.dataset.key !== comingKey) {
      coming.dataset.key = comingKey; coming.replaceChildren();
      list.forEach(item => {
        // Bundled public artwork and labels only.
        const row = document.createElement('li'), mark = document.createElement('span'), date = document.createElement('span'), name = document.createElement('span');
        mark.className = 'kb-seasonal-mark'; mark.setAttribute('aria-hidden', 'true'); mark.innerHTML = window.KB_STAMPS?.svg(item.id) || '';
        date.className = 'kb-seasonal-date'; date.textContent = item.date; name.textContent = item.label;
        row.append(mark, date, name); coming.append(row);
      });
      if (!list.length) { const row = document.createElement('li'); row.textContent = day ? 'No celebrations in the next six months.' : 'Checking the kitchen date...'; coming.append(row); }
    }
  }
  new MutationObserver(() => { if (settingsFrame || root.querySelector('#kb-seasonal-settings') === mounted) return; settingsFrame = requestAnimationFrame(mountSettings); }).observe(root, { childList: true, subtree: true });
  window.addEventListener('lk-clock', refresh);
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { prefs = read(); refresh(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  // One local clock check a minute, no network requests. Midnight refreshes the active occasion in an open book.
  setInterval(refresh, 60000);
  window.KB_SEASONAL = { configure, refresh, status }; refresh(); mountSettings();
})();
