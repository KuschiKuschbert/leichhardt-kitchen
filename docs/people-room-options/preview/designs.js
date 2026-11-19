// Review-only previews for the People room council, round 2. Drawn over the real admin panel on the click tests'
// stand-in, made-up people. Nothing here is in the book. Run: node designs.js <out folder> <tests folder> (BASE set).
const OUT = process.argv[2], T = process.argv[3], L = require(T + '/lib');
const P = (id, name, role, x) => Object.assign({ id, name, role, add: role !== 'view' && role !== 'fnc', tick: role !== 'view' && role !== 'fnc', del: role === 'sous' || role === 'lead', fn: false, active: true }, x || {});
const people = [P('sam','Sam','sous'), P('ann','Ann','staff'), P('bo','Bo','staff'), P('kai','Kai','lead'), P('lena','Lena','staff'), P('marco','Marco','staff'),
  P('priya','Priya','sous'), P('tom','Tom','staff', { del: true }), P('wiremu','Wiremu Te Rangi-Harrison','staff'), P('zoe','Zoe','view'), P('jun','Jun','staff'),
  P('ola','Ola','fnc', { fn: true }), P('dev','Dev','staff', { active: false }), P('ruth','Ruth','staff', { fn: true })];
const extra = { ['kitchens/' + L.PIN + '/config/main']: { people, sousIds: ['sam','priya'], fnIds: ['ola','ruth'], showBadges: true, staffSee: { cleaning: true } } };
const ROLE = { head: 'Head chef', sous: 'Sous chef', lead: 'Lead', staff: 'Staff', fnc: 'Functions coordinator', view: 'View only' };
const all = people.concat([P('head', 'Head chef', 'head', { del: true })]);
// one set of words for the four ticks, built from the ticks themselves, never from the role
const can = p => p.role === 'head' ? 'Everything' : ([p.add && 'Add', p.tick && 'Tick', p.del && 'Remove'].filter(Boolean).join(', ') || 'Reads only') + (p.fn ? ' · Functions' : '');
// the working state: Tom's role changed (not saved), Ann deleted (waits for Save), Dev off the list
const draft = { tom: { st: 'Not saved: Staff to Lead', role: 'lead' }, ann: { st: 'Deleted when you save', del: true } };
const stOf = (p, work) => p.active === false ? 'Off the list' : work && draft[p.id] ? draft[p.id].st : '';
const roleOf = (p, work) => work && draft[p.id] && draft[p.id].role || p.role;
const sel = (r, dis) => '<select class="p-select"' + (dis ? ' disabled' : '') + '>' + Object.keys(ROLE).map(k => '<option' + (k === r ? ' selected' : '') + '>' + ROLE[k] + '</option>').join('') + '</select>';
const tools = n => '<div class="pr-top"><label class="visually-hidden" for="pr-q">Search names</label><input id="pr-q" class="search" placeholder="Search names"><button type="button" class="chip">Everyone ' + n + ' ▾</button><button type="button" class="btn dark">Add a person</button></div>' +
  '<div class="pr-folds"><details class="a-how"><summary>How roles and ticks work</summary></details><details class="a-how"><summary>Add several names</summary></details></div>';
const saveBar = work => work ? '<section class="set-block a-savebar"><div class="btn-row"><button type="button" class="btn dark">Save changes</button><button type="button" class="btn">Undo unsaved changes</button><span class="a-unsaved">2 unsaved changes: Tom, Ann</span></div></section>' : '';

function A(work) {
  const row = p => { const st = stOf(p, work), head = p.role === 'head', r = roleOf(p, work), d = work && draft[p.id] && draft[p.id].del;
    const cb = (on, l) => '<td class="pa-c"><label><span class="pa-cl">' + l + '</span><input type="checkbox"' + (on ? ' checked' : '') + (head && l !== 'Functions' ? ' disabled' : '') + '></label></td>';
    return '<tr class="' + (p.active === false ? 'is-off' : '') + (d ? ' is-del' : '') + '"><td class="pa-n"><input class="search a-name" value="' + p.name + '"' + (d ? ' disabled' : '') + '>' + (st ? '<small class="pr-st' + (d ? ' is-bad' : '') + (p.active === false ? ' is-off' : '') + '">' + st + '</small>' : '') + (head ? '<small class="pr-st">Head chef: ticks fixed</small>' : '') + '</td><td class="pa-r">' + sel(r, head || d) + '</td>' +
      cb(p.add, 'Add') + cb(p.tick, 'Tick') + cb(p.del, 'Remove') + cb(p.fn, 'Functions') +
      '<td class="pa-act"><button type="button" class="p-x">Open page</button><button type="button" class="p-x">Reset PIN</button>' + (d ? '<button type="button" class="p-x">Undo delete</button>' : (p.active === false ? '<button type="button" class="p-x">Put back</button>' : '<button type="button" class="p-x">Stopped working here</button>') + (head ? '' : '<button type="button" class="p-x pr-del">Delete</button>')) + '</td></tr>'; };
  return '<section class="set-block pr-a"><span class="label">People</span>' + tools(15) + '<table class="pa-t"><thead><tr><th>Name</th><th>Role</th><th>Add</th><th>Tick</th><th>Remove</th><th>Functions</th><th><span class="visually-hidden">Actions</span></th></tr></thead><tbody>' + all.map(row).join('') + '</tbody></table></section>' + saveBar(work);
}
function B(work, openId) {
  const row = p => { const st = stOf(p, work), head = p.role === 'head', r = roleOf(p, work), d = work && draft[p.id] && draft[p.id].del, open = p.id === openId;
    const tk = (on, l) => '<label class="pb-tk"><input type="checkbox"' + (on ? ' checked' : '') + (head && l !== 'Create and edit functions' ? ' disabled' : '') + '> ' + l + '</label>';
    const ed = !open ? '' : '<div class="pb-ed"><div class="pb-f"><label class="label" for="pb-r">Role</label>' + sel(r, head).replace('<select', '<select id="pb-r"') + '</div>' +
      '<fieldset class="pb-ticks"><legend class="label">What ' + p.name.split(' ')[0] + ' may do</legend>' + tk(p.add, 'Add lines') + tk(p.tick, 'Tick lines') + tk(p.del || r === 'lead', 'Remove lines') + tk(p.fn, 'Create and edit functions') + '</fieldset>' +
      '<p class="pb-h">Wait for Save</p><div class="pb-leave"><button type="button" class="p-x">Stopped working here</button>' + (head ? '' : '<button type="button" class="p-x pr-del">Delete for good</button>') + '</div>' +
      '<div class="pb-end"><a class="p-link" href="#">Open ' + p.name.split(' ')[0] + '\'s page ›</a></div></div>';
    return '<li class="pb-row' + (open ? ' is-open' : '') + (p.active === false ? ' is-off' : '') + '"><div class="pb-main"><span class="st-av' + (/sous|head/.test(p.role) ? ' is-chef' : '') + '" aria-hidden="true">' + p.name.charAt(0) + '</span><div class="pb-w"><b class="pb-n">' + p.name + '</b><small class="pb-can">' + ROLE[r] + ' · ' + can(p) + '</small>' + (st ? '<small class="pr-st' + (d ? ' is-bad' : '') + (p.active === false ? ' is-off' : '') + '">' + st + (d ? ' · <u>Undo</u>' : '') + '</small>' : '') + '</div>' +
      '<div class="pb-acts">' + (p.active === false ? '<button type="button" class="p-x">Put back</button>' : '<button type="button" class="p-x">Reset PIN</button>') + '<button type="button" class="btn pb-edit" aria-expanded="' + open + '">' + (open ? 'Close ▴' : 'Change ▾') + '</button></div></div>' + ed + '</li>'; };
  return '<section class="set-block pr-b"><span class="label">People</span>' + tools(15) + '<ul class="pb-list">' + all.map(row).join('') + '</ul></section>' + saveBar(work);
}
function C(work) {
  const groups = [['Chefs', p => /head|sous|lead/.test(p.role) && p.active !== false], ['Staff', p => p.role === 'staff' && p.active !== false], ['Functions and view only', p => /fnc|view/.test(p.role) && p.active !== false], ['Off the list', p => p.active === false]];
  const row = p => { const st = stOf(p, work), r = roleOf(p, work), d = work && draft[p.id] && draft[p.id].del;
    return '<a class="c-tool pc-row" href="#"><strong>' + p.name + '</strong><span class="c-tool-go">Open ›</span><small>' + ROLE[r] + ' · ' + can(p) + '</small>' + (st && p.active !== false ? '<small class="pr-st' + (d ? ' is-bad' : '') + '">' + st + '</small>' : '') + '</a>'; };
  return '<section class="set-block pr-c"><span class="label">People</span>' + tools(15) + groups.map(g => { const l = all.filter(g[1]); return l.length ? '<h3 class="a-ch-h pc-h">' + g[0] + ' <span>' + l.length + '</span></h3><div class="pc-grid">' + l.map(row).join('') + '</div>' : ''; }).join('') + '</section>' + saveBar(work);
}
function Cpage(work) {
  const p = all.filter(x => x.id === 'tom')[0], r = work ? 'lead' : p.role;
  const tk = (on, l) => '<label class="pb-tk"><input type="checkbox"' + (on ? ' checked' : '') + '> ' + l + '</label>';
  return '<section class="set-block pr-c pc-page"><p><a class="p-link" href="#">‹ All people</a></p><span class="label">Tom</span><p class="a-pp-role"><b>' + ROLE[r] + '</b>. Can: ' + can(p) + '.</p>' + (work ? '<p class="pr-st">Not saved: Staff to Lead</p>' : '') +
    '<div class="pc-blk"><h3 class="a-ch-h">Role and what Tom may do</h3><div class="pb-f"><label class="label" for="pc-r">Role</label>' + sel(r).replace('<select', '<select id="pc-r"') + '</div><fieldset class="pb-ticks"><legend class="visually-hidden">What Tom may do</legend>' + tk(1, 'Add lines') + tk(1, 'Tick lines') + tk(1, 'Remove lines') + tk(0, 'Create and edit functions') + '</fieldset></div>' +
    '<div class="pc-blk"><h3 class="a-ch-h">PIN</h3><p class="hint">Resets at once. Tom sets a new one next time.</p><button type="button" class="p-x">Reset PIN</button></div>' +
    '<div class="pc-blk"><h3 class="a-ch-h">Leaving</h3><p class="hint">Waits for Save.</p><div class="pb-leave"><button type="button" class="p-x">Stopped working here</button><button type="button" class="p-x pr-del">Delete for good</button></div></div>' +
    '<div class="pc-blk"><h3 class="a-ch-h">Last 14 days</h3><div class="a-tiles"><div class="a-tile"><strong>38</strong><span>lines written</span></div><div class="a-tile"><strong>52</strong><span>lines ticked off</span></div><div class="a-tile"><strong>9 of 14</strong><span>days with lines written</span></div></div></div></section>' + saveBar(work);
}

// The recommended mix: B's rows that open in place, with A's deleted-row cue and the reviewers' repairs, and C's words
function M(work, openId) {
  const canM = p => p.role === 'head' ? 'Everything' : can(p);
  const row = p => { const head = p.role === 'head', r = roleOf(p, work), d = work && draft[p.id] && draft[p.id].del, off = p.active === false, open = p.id === openId;
    const st = d ? '<small class="pr-st is-bad">Deleted when you save</small>' : off ? '<small class="pr-st is-off">Off the list</small>' : work && draft[p.id] ? '<small class="pr-st">' + draft[p.id].st + '</small>' : '';
    const tk = (on, l) => '<label class="pb-tk"><input type="checkbox"' + (on ? ' checked' : '') + (head && l !== 'Functions' ? ' disabled' : '') + '> ' + l + '</label>';
    const first = p.name.split(' ')[0];
    const ed = !open ? '' : '<div class="pm-ed"><div class="pm-two"><div class="pb-f"><label class="label" for="pm-n">Name</label><input id="pm-n" class="search a-name" value="' + p.name + '"></div><div class="pb-f"><label class="label" for="pm-r">Role</label>' + sel(r, head).replace('<select', '<select id="pm-r"') + '</div></div>' +
      '<fieldset class="pb-ticks"><legend class="label">What ' + first + ' may do</legend>' + tk(p.add, 'Add') + tk(p.tick, 'Tick') + tk(p.del || r === 'lead', 'Remove') + tk(p.fn, 'Functions') + '</fieldset>' +
      '<p class="hint pm-note">Reset PIN works at once. Everything else here waits for Save changes.</p>' +
      (head ? '' : '<div class="pm-leave"><p class="pb-h">Leaving · waits for Save changes</p><div class="pb-leave"><button type="button" class="p-x pm-t">' + (off ? 'Put back on the list' : 'Stopped working here') + '</button><button type="button" class="p-x pm-t pr-del">Delete for good</button></div></div>') +
      '<a class="p-link pm-t" href="#">Open ' + first + '\'s page ›</a></div>';
    const acts = d ? '<button type="button" class="btn pm-q">Undo delete</button>' : (off ? '' : '<button type="button" class="p-x pm-t">Reset PIN</button>') + '<button type="button" class="btn pb-edit" aria-expanded="' + open + '">' + (open ? 'Close ▴' : 'Change ▾') + '</button>';
    return '<li class="pb-row pm-row' + (open ? ' is-open' : '') + (off ? ' is-off' : '') + (d ? ' is-del' : '') + '"><div class="pb-main"><span class="st-av' + (/sous|head/.test(p.role) ? ' is-chef' : '') + '" aria-hidden="true">' + p.name.charAt(0) + '</span><div class="pb-w"><b class="pb-n">' + p.name + '</b><small class="pb-can">' + ROLE[r] + ' · ' + canM(p) + '</small>' + st + '</div><div class="pb-acts">' + acts + '</div></div>' + ed + '</li>'; };
  const on = all.filter(p => p.active !== false), offL = all.filter(p => p.active === false);
  const bar = !work ? '' : '<section class="set-block a-savebar pm-bar"><div class="pm-btns"><button type="button" class="btn dark">Save changes</button><button type="button" class="btn">Undo unsaved changes</button></div><p class="pm-sum"><span class="a-unsaved">1 change: Tom</span> <span class="pm-gone">Deleted when you save: Ann</span></p></section>';
  return '<section class="set-block pr-b pr-m"><span class="label">People</span>' + tools(15) + '<ul class="pb-list">' + on.concat(offL).map(row).join('') + '</ul></section>' + bar;
}
const CSS = `
.pr-top{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.4rem 0 .2rem}.pr-top .search{flex:1 1 14rem;min-width:0}.pr-top .btn,.pr-top .chip{min-height:44px}
.pr-folds{display:flex;flex-wrap:wrap;gap:0 1.2rem}.pr-folds .a-how{margin:.2rem 0}
.pr-st{display:block;color:var(--accent-ink);font-size:.84rem;font-weight:700}.pr-st.is-bad{color:var(--bad-ink)}.pr-st.is-off{color:var(--muted)}
.pr-del{color:var(--bad-ink)}
.pa-t{width:100%;border-collapse:collapse;margin-top:.4rem;border-top:2px solid var(--ink)}.pa-t th{font:700 .78rem/1.2 var(--display);text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:.5rem .3rem;background:var(--surface-people);border-bottom:1px solid var(--surface-people-edge)}
.pa-t td{padding:.45rem .3rem;border-bottom:1px solid var(--line);vertical-align:middle}.pa-n{width:15rem}.pa-n .a-name{width:100%;min-width:0}.pa-r{width:13rem}.pa-r .p-select{min-height:44px;min-width:11.5rem}
.pa-c{text-align:center;width:4.2rem}.pa-c label{display:inline-grid;place-items:center;min-width:44px;min-height:44px}.pa-cl{display:none}.pa-c input{width:22px;height:22px}
.pa-act{text-align:right;white-space:nowrap}.pa-act .p-x{margin-left:.5rem}
tr.is-off .a-name{opacity:.6}tr.is-del .a-name{text-decoration:line-through}
@media (max-width:899px){.pa-t thead{display:none}.pa-t,.pa-t tbody,.pa-t tr{display:block}.pa-t tr{display:grid;grid-template-columns:repeat(4,1fr);gap:.2rem .3rem;padding:.6rem 0;border-bottom:1px solid var(--line)}
 .pa-t td{border:0;padding:0}.pa-n{grid-column:1/-1;width:auto}.pa-r{grid-column:1/-1}.pa-c{width:auto}.pa-cl{display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--muted)}.pa-c label{min-height:auto;gap:2px}
 .pa-act{grid-column:1/-1;text-align:left;white-space:normal;display:flex;flex-wrap:wrap;gap:.2rem 1rem}.pa-act .p-x{margin:0}}
.pb-list{list-style:none;margin:.4rem 0 0;padding:0;border-top:2px solid var(--ink)}.pb-row{border-bottom:1px solid var(--line)}.pb-row.is-open{background:var(--surface-people);box-shadow:inset 3px 0 0 var(--surface-people-edge)}
.pb-main{display:flex;gap:.7rem;align-items:center;padding:.55rem .4rem;min-height:56px}.pb-w{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}.pb-n{font-size:1.05rem;overflow-wrap:anywhere}.pb-can{color:var(--muted);font-size:.875rem}
.pb-acts{display:flex;gap:.6rem;align-items:center;flex:none}.pb-edit{min-height:44px}.pb-row.is-off .pb-n{color:var(--muted)}
.pb-ed{display:grid;gap:.7rem;padding:.2rem .6rem .9rem 3.6rem}.pb-f{display:grid;gap:.25rem;max-width:20rem}.pb-ticks{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.2rem 1.2rem}.pb-ticks legend{margin-bottom:.2rem}
.pb-tk{display:inline-flex;align-items:center;gap:.45rem;min-height:44px;font-weight:600}.pb-tk input{width:22px;height:22px}
.pb-h{margin:0;font:700 .78rem/1.2 var(--display);text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.pb-leave{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem}.pb-end{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
@media (max-width:599px){.pb-main{flex-wrap:wrap;align-items:flex-start}.pb-w{flex:1 1 calc(100% - 3rem)}.pb-acts{flex:1 1 100%;justify-content:space-between;padding-left:2.9rem}.pb-ed{padding-left:.6rem}.pb-row.is-open .st-av{background:var(--paper)}}
.pc-h{display:flex;gap:.5rem;align-items:baseline;margin:1rem 0 .2rem}.pc-h span{color:var(--muted);font-size:.9rem}
.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr));column-gap:1.4rem}.pc-row .pr-st{grid-column:1/-1}
.pc-blk{margin-top:1rem;display:grid;gap:.4rem}.pc-blk .hint{margin:0}
.pm-row.is-open{background:var(--paper);box-shadow:inset 4px 0 0 var(--surface-people-edge);border-top:1.5px solid var(--surface-people-edge)}
.pm-row.is-open .st-av{background:var(--surface-people)}.pm-row.is-del .pb-n{text-decoration:line-through;color:var(--muted)}
.pm-ed{display:grid;gap:.6rem;padding:.2rem .7rem 1rem 3.6rem}.pm-two{display:flex;flex-wrap:wrap;gap:.6rem 1rem}.pm-two .pb-f{flex:1 1 14rem}
.pm-t{display:inline-flex;align-items:center;min-height:44px;padding:0 .3rem}.pm-q{min-height:44px}.pm-note{margin:0}
.pm-leave{display:grid;gap:.1rem;padding-top:.5rem;border-top:1px solid var(--line)}
.pm-bar{display:flex!important;flex-wrap:wrap;align-items:center;justify-content:flex-start;text-align:left;gap:.3rem 1rem}.pm-btns{display:flex;gap:.5rem}.pm-btns .btn{min-height:44px}.pm-sum{margin:0;display:flex;flex-wrap:wrap;gap:0 .8rem;font-size:.9rem}.pm-gone{color:var(--bad-ink);font-weight:700}
@media (max-width:599px){.pm-ed{padding-left:.7rem}.pm-bar{padding:.5rem .7rem!important}.pm-btns .btn{padding-left:.75rem;padding-right:.75rem}.pm-row.is-open .st-av{background:var(--surface-people)!important}}
`;
async function shot(b, name, w, html, sel) {
  const p = await L.open(b, '#/admin', { admin: true, width: w, height: w === 390 ? 844 : 900, wait: 1800, extra });
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  await p.evaluate(o => {
    const st = document.createElement('style'); st.textContent = o.css; document.head.appendChild(st);
    const blk = [...document.querySelectorAll('.a-pane .set-block')].filter(s => s.querySelector('.lv-people'))[0];
    document.querySelectorAll('.a-pane .set-block.a-savebar').forEach(s => s.remove());
    const box = document.createElement('div'); box.innerHTML = o.html; blk.replaceWith(...box.childNodes);
    if (o.sel) { const el = document.querySelector(o.sel); if (el) el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); }
  }, { css: CSS, html, sel });
  await L.settle(p, 200);
  const m = await p.evaluate(() => {
    const vh = innerHeight, rows = [...document.querySelectorAll('.pa-t tbody tr, .pb-row, .pc-row')];
    const full = rows.filter(r => { const q = r.getBoundingClientRect(); return q.top >= 0 && q.bottom <= vh - (innerWidth < 720 ? 60 : 0); }).length;
    const first = rows[0] && Math.round(rows[0].getBoundingClientRect().top + scrollY);
    const hs = rows.map(r => Math.round(r.getBoundingClientRect().height)).sort((a, b) => a - b);
    return { pageH: document.documentElement.scrollHeight, firstRowAt: first, rowH: hs[Math.floor(hs.length / 2)], rowsOnScreen: full, sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  await p.screenshot({ path: OUT + '/' + name + '.png' });
  console.log(name, JSON.stringify(m));
  await p.context().close();
}
(async () => {
  const b = await L.start();
  if (process.argv[4] === 'mix') {
    for (const w of [390, 768, 1280]) await shot(b, 'm-' + w, w, M(false));
    for (const w of [390, 1280]) { await shot(b, 'm-' + w + '-open', w, M(true, 'tom'), '.pb-row.is-open'); await shot(b, 'm-' + w + '-working', w, M(true)); }
    await shot(b, 'm-390-deleted', 390, M(true), '.pm-row.is-del');
    await b.close(); return;
  }
  for (const w of [390, 768, 1280]) {
    await shot(b, 'a-' + w, w, A(false)); await shot(b, 'b-' + w, w, B(false)); await shot(b, 'c-' + w, w, C(false));
  }
  for (const w of [390, 1280]) {
    await shot(b, 'a-' + w + '-working', w, A(true), '.pa-t tbody tr:nth-child(8)');
    await shot(b, 'b-' + w + '-open', w, B(true, 'tom'), '.pb-row.is-open');
    await shot(b, 'c-' + w + '-working', w, C(true));
    await shot(b, 'c-' + w + '-page', w, Cpage(true));
  }
  await b.close();
})();
