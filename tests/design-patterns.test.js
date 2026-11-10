// Design and behaviour patterns (head chef, 8 Nov 2026: "maintain consistency"). docs/design-patterns.md names the pieces
// a new screen is built from; this file keeps that page true. Every class, colour token and helper below is one the page
// names: if one is renamed or removed, this fails, so the page and the code change together (a test may not read docs/,
// CLAUDE.md, so the names live here as well). It also fails when a file declares one top-level function or var name
// twice: the second silently replaces the first (7 Nov 2026, a var and a function both called tmMine in js/prep.js).
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const list = dir => fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.js')).map(f => dir + '/' + f);
const jsFiles = ['js', 'js/lib', 'js/seasonal'].filter(d => fs.existsSync(path.join(root, d))).flatMap(list);
const css = fs.readdirSync(path.join(root, 'css')).filter(f => f.endsWith('.css')).map(f => read('css/' + f)).join('\n');
const js = jsFiles.map(read).join('\n');

// the names docs/design-patterns.md uses, by section
const CLASSES = [
  'hm-welcome', 'hm-welcome-long', 'hm-welcome-compact', 'mascot', 'mascot-host',
  'su-last-kind', 'su-last-wide', 'su-last-dow',
  'cooling-clock', 'cooling-clock-status', 'cooling-chip', 'cooling-menu', 'cooling-row', 'cooling-start', 'cooling-status', 'cooling-error',
  'ux-swipe', 'ux-swipe-handle', 'ux-swipe-dragging',
  'ux-modal', 'ux-modal-close', 'ux-modal-head', 'ux-modal-title', 'ux-modal-grip', 'ux-modal-shade',
  'nb-prog', 'p-card', 'p-h', 'hint', 'btn-row', 'btn', 'dark', 'p-link', 'p-err', 'chip', 'ux-picker', 'hm-team-staff', 'hm-staff-first', 'hm-rota',
  'nt-wrap', 'nt-bg', 'nt', 'nt-grip', 'nt-in', 'nt-head', 'nt-eb', 'nt-h', 'nt-date', 'nt-body', 'nt-foot', 'nt-got',
  'tm-chip', 'wtop-icons', 'is-due', 'nb-pw', 'nb-tmset', 'nb-tmday', 'tm-fold', 'nb-ai', 'nb-aw', 'nb-onslot', 'nb-hbar', 'wb-list', 'nb-sgr', 'nb-sgadd', 'o-cut-fold', 'o-cut-cue', 'o-cut-action', 'dl-at', 'dl-dot', 'dl-rb', 'hm-board', 'hm-a', 'hm-paper', 'hm-sec', 'w-secs', 'tr-card', 'tr-cv', 'tr-ret', 'fn-c0', 'fn-cnext', 'fn-end', 'fn-quiet', 'fn-svc-board', 'fn-svc-cd', 'fn-svc-diet', 'jumps', 'ch-grid', 'ch-line', 'find-i',
  'set-block', 'label', 'a-ch-h', 'a-tablewrap', 'a-table', 'a-plain', 'sk-c', 'a-legend', 'dsh-inbox', 'dsh-dtile', 'dsh-cmp', 'dsh-charts-btn', 'tm-learn', 'a-find', 'fd-sheet', 'a-quick', 'wm-tile', 'wm-due',
  'ps-viewbar', 'ps-minimum', 'ps-grid', 'ps-section', 'ps-fields', 'ps-form-grid', 'ps-catalogue-row', 'ps-standard',
  'ad-admin', 'ad-layout', 'a-nav', 'ad-main', 'ad-heading', 'a-tabs', 'a-pane',
  'nt-dot', 'nt-meta', 'nt-at', 'g-mode', 'g-bar', 'tm-tl', 'tm-tlbar', 'dr-run', 'dr-oh', 'st-av', 'st-can', 'todo-more',
  'todo-notebook', 'todo-book', 'todo-bookhead', 'todo-spine', 'todo-work', 'todo-formtitle', 'todo-status', 'todo-privacy',
  'tm-notebook', 'tm-nbook', 'tm-nhead', 'tm-nspine', 'tm-work', 'tm-viewbar', 'tm-shift-scroll', 'tm-dayperson', 'tm-away-slot',
  'tm-weeknav', 'tm-daypick',
  'tm-focus-page', 'tm-date-controls', 'tm-week-reveal', 'tm-row-fields', 'tm-row-summary', 'tm-detail-workbench', 'tm-focus-grid', 'tm-focus-save', 'tm-live-strip', 'tm-focus-panel',
  'tm-person-row', 'tm-person-details', 'tm-planstate', 'tm-next-overview',

'tm-worksheet', 'tm-worksheet-head', 'tm-person-head', 'tm-person-section', 'tm-quick-add', 'tm-quick-people', 'tm-quick-services',
  'cln-page', 'cln-book', 'cln-row', 'cln-matrix', 'cln-day-pick', 'cln-form', 'cln-detail', 'cln-task-detail', 'cln-occurrence', 'cln-checks', 'cln-import', 'cln-packdown', 'cln-packdown-title', 'cln-temperature',
  'cln-chef-page', 'cln-fold', 'cln-fold-toggle', 'cln-repeat-browser', 'cln-repeat-layout', 'cln-template-summary', 'cln-editor',
  'dr-notebook', 'dr-book', 'dr-bookhead', 'dr-usual', 'dr-work', 'dr-spine', 'dr-people',
  'fn-ahead', 'fn-ahead-b', 'fn-ahead-l', 'fn-ahead-t', 'fn-ahead-n', 'fn-ahead-p', 'fn-ahead-more', 'fn-ahead-hide', 'is-ahead',
  'fn-hm', 'fn-hm-line', 'fn-hu', 'fn-hu-got', 'fn-hu-undo', 'fn-ahead-ack', 'fn-wk',
  'o-fn-tag', 'o-fn-when', 'o-fn-for', 'o-fn-held'
];
const TOKENS = ['--ink', '--paper', '--bg', '--muted', '--faint', '--line', '--accent', '--accent-ink', '--tag', '--done', '--done-ink',
  '--bar', '--bar-text', '--display', '--body', '--r-act', '--r-pick', '--small-ink', '--hit',
  '--bad-ink', '--bad-tint', '--bad-on-dark', '--done-on-dark',
  '--surface-work', '--surface-work-edge', '--surface-people', '--surface-people-edge', '--surface-paper', '--surface-reference'];
const HELPERS = ['homeHeading', 'homeWelcomeWords', 'homeWelcomePaint', 'whoNamePaint', 'tmIcon', 'retrySoon', 'waiting', 'cacheOnly', 'inkLabel', 'inkWait', 'mnName', 'AdaptivePicker', 'SwipeDismiss', 'ModalFrame', 'enhance',
  'svButton', 'svStart', 'svDone', 'svFail', 'svLine', 'errMsg', 'failed', 'toast', 'slipName', 'arm', 'armed', 'W', 'canW',
  'ovPush', 'ovDone', 'trapTab', 'sheetOpen', 'sheetBusy', 'sheetNext', 'lvHTML', 'homeSlot', 'homePaint', 'homeRotaHTML', 'tmAwayHTML', 'tmNextHTML', 'tmAwayPaint', 'tmAwayHidden', 'dkRunHTML', 'dkTeamHTML', 'dkFormHTML', 'panelShellHTML', 'psPanelHTML', 'psHintHTML', 'psReferenceHTML', 'psRolloutHTML',
  'fnOrdTag', 'orderTag'];
const GLOBALS = ['ICON', 'LK_UX', 'LK_PREP_STANDARDS'];

const missing = [];
CLASSES.forEach(c => { if (!new RegExp('\\.' + c.replace(/[-]/g, '\\-') + '(?![A-Za-z0-9_-])').test(css)) missing.push('.' + c); });
TOKENS.forEach(t => { if (!new RegExp(t.replace(/[-]/g, '\\-') + '\\s*:').test(css)) missing.push(t); });
HELPERS.forEach(h => { if (!new RegExp('function ' + h + '\\s*\\(').test(js)) missing.push(h + '()'); });
GLOBALS.forEach(g => { if (!new RegExp('(var|const|window\\.)\\s*' + g + '\\s*=').test(js)) missing.push(g); });
assert.deepEqual(missing, [], 'docs/design-patterns.md names these, but the code no longer has them: ' + missing.join(', ') + '. Change the page and this list with the code.');

// one name, one meaning: a file's top-level function and var names (the smallest indent a function declaration has in it)
const twice = [];
jsFiles.forEach(f => {
  const lines = read(f).split('\n'), fns = [];
  lines.forEach((l, i) => { const m = /^( *)function ([A-Za-z0-9_$]+)\s*\(/.exec(l); if (m) fns.push({ ind: m[1].length, name: m[2], at: i + 1 }); });
  if (!fns.length) return;
  const top = Math.min(...fns.map(x => x.ind)), names = Object.create(null);
  const add = (n, at) => { (names[n] = names[n] || []).push(at); };
  fns.filter(x => x.ind === top).forEach(x => add(x.name, x.at));
  lines.forEach((l, i) => {
    const m = new RegExp('^ {' + top + '}var (.*)').exec(l); if (!m) return;
    // the names a var line declares: before each top-level = (skipping what is inside brackets and strings)
    let depth = 0, cur = '', q = '';
    const parts = [];
    for (const ch of m[1]) {
      if (q) { if (ch === q) q = ''; cur += ch; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
      if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    parts.forEach(p => { const n = /^\s*([A-Za-z0-9_$]+)\s*(=|;|$)/.exec(p); if (n) add(n[1], 'var ' + (i + 1)); });
  });
  Object.keys(names).forEach(n => { if (names[n].length > 1) twice.push(f + ': ' + n + ' (lines ' + names[n].join(', ') + ')'); });
});
assert.deepEqual(twice, [], 'A top-level name declared twice in one file: the second silently replaces the first. Rename one: ' + twice.join('; '));

console.log('PASS design patterns: ' + CLASSES.length + ' classes, ' + TOKENS.length + ' colours and type, ' + (HELPERS.length + GLOBALS.length) + ' helpers still in the code; no top-level name declared twice in ' + jsFiles.length + ' files');
