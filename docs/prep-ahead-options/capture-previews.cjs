/* Round 2 previews for "prep lines for a later day" (17 Nov 2026). Starts from the static baseline snapshots (real app
   markup and CSS, synthetic data, scripts removed) and changes only what each design changes, then saves screenshots
   at 390 x 844 (and the main planning screen at 768 x 1024 and 1280 x 800), the HTML and measurements. Preview only: no
   app code runs, so taps, slips, timing, reads and failures are not exercised here.
   In the stand-in "today" is Wednesday 18 November; the later day is Saturday 21 November, three days ahead.
   Run from tests/: cp ../docs/prep-ahead-options/capture-previews.cjs zz-pp.test.js && CHROME=... npm test -- zz-pp; rm zz-pp.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const dir = path.join(root, 'docs/prep-ahead-options');
const BASE = process.env.BASE || L.BASE;

// helpers that run in the page (installed once per screen)
function helpers() {
  window.$ = (s, r) => (r || document).querySelector(s);
  window.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  window.css = s => { const st = document.createElement('style'); st.textContent = s; document.head.appendChild(st); };
  const ICON_U = '<svg class="nb-ai" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4h11l-2 4 2 4H6"></path></svg>';
  // a planned line on a later day: no tick box yet (nothing is ticked before its day), Urgent, Remove and the line menu
  window.prow = (id, text, qty, by) => '<li id="nbr-' + id + '" class="nb-row pa-row"><span class="pa-box" aria-hidden="true"></span><span class="nb-main"><span class="nb-t nb-tt">' + text +
    (qty ? ' <span class="nb-q">' + qty + '</span>' : '') + '</span><span class="nb-meta"><span class="nb-wrote">' + by + '</span></span></span><span class="nb-acts">' +
    '<button type="button" class="nb-star" aria-pressed="false" aria-label="Mark urgent: ' + text + '">' + ICON_U + '<span class="nb-aw">Urgent</span></button>' +
    '<button type="button" class="nb-x" aria-label="Remove ' + text + '">Remove</button><button type="button" class="nb-more nb-more-fix" aria-label="More for ' + text + '">⋯</button></span></li>';
  window.hd = (name, n) => '<div class="nb-hd"><span>' + name + '</span><span>' + n + '</span></div>';
  window.saturday = extra => hd('Grill', '1 line') + '<ul class="nb-rows">' + prow('p1', 'Thaw brisket', '2', 'Planned by Sam, today') + '</ul>' +
    hd('Larder', (extra ? 2 : 1) + (extra ? ' lines' : ' line')) + '<ul class="nb-rows">' + prow('p2', 'Pizza dough', '3 batch', 'Planned by Ann, Mon') +
    (extra ? prow('p3', 'Brine pork', '2 kg', 'Planned by Sam, just now') : '') + '</ul>';
  window.slipHTML = (head, words) => '<div class="just-r"><p class="just-t">' + head + '</p><div class="just-l"><span class="just-n">' + words + '</span><button type="button" class="btn just-u">Undo</button></div></div>';
  // the real Add sheet (with its slip) from the baseline snapshot, put over this page
  window.sheetFrom = async () => {
    const t = await (await fetch('docs/prep-ahead-options/baseline/chef-added-slip.html')).text();
    const d = new DOMParser().parseFromString(t, 'text/html');
    [d.querySelector('.sheet-bg'), d.querySelector('.p-sheet')].forEach(e => document.body.appendChild(document.importNode(e, true)));
    document.documentElement.classList.add(...d.documentElement.classList);
    document.body.className = d.body.className;
  };
  window.PA_CSS = `.pa-box{flex:0 0 auto;width:26px;height:26px;margin:9px;border:2px dashed var(--faint);border-radius:4px}
.pa-row .nb-main{cursor:default}
.pa-note{margin:12px 0 0;font-family:var(--body);font-size:.95rem;line-height:1.45;color:var(--ink)}
.pa-for{margin:0 0 10px;font-family:var(--body);font-size:.95rem;line-height:1.4;color:var(--ink)}
.pa-for b{font-weight:700}`;
}

/* What each design changes, per screen. [base snapshot, page function]. */
const D = {
  // the implemented app's screens through the same pipeline (same fonts), so before and after compare fairly
  before: { 'chef-today': ['chef-today', () => {}], 'chef-ahead-3': ['chef-ahead-3', () => {}], 'staff-day-arrives': ['staff-day-arrives', () => {}], 'staff-today': ['staff-today', () => {}] },
  // On its day (every design): the line written ahead reads as planned, and Start here does not call it Waiting longest
  shared: {
    'day-arrives': ['staff-day-arrives', () => {
      const a = $('#nbr-a1'), tt = $('.nb-tt', a); tt.removeAttribute('data-n'); $$('.visually-hidden, .nb-marks', tt).forEach(x => x.remove());
      $('.nb-wrote', a).textContent = 'Planned by Sam, Sun';
      const o = $('#nbr-i1 .nb-tt'); o.setAttribute('data-n', '3'); $('.nb-mk', o).insertAdjacentHTML('beforebegin', '<span class="visually-hidden">. Start here, 3</span> <span class="nb-marks"><span class="nb-why">Waiting longest</span></span>');
    }]
  },
  // A. Open the day: the day row the chefs already have, then Add a line on that day; the sheet and the slip name it
  a: {
    'later-day': ['chef-ahead-3', () => {
      css(PA_CSS);
      $('.nb-left .nb-prog').outerHTML = '<div class="nb-pw"><div class="nb-prog">2 lines planned</div></div><div class="wk-dock"><button type="button" class="btn dark nb-addline"><svg class="wk-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>Add to Saturday</button></div>';
      $('.nb-left .nb-body').innerHTML = saturday(false) + '<p class="pa-note">Planned ahead. These lines are on everyone\'s list on Saturday. Staff do not see them before.</p>';
      $('.nb-left .nb-foot').remove();
      $('.nb-right .nb-date').textContent = 'Saturday is still to come';
      $('.nb-right .nb-body').innerHTML = '<p class="nb-sd">Lines are ticked on the day.</p>';
    }],
    'sheet': ['chef-ahead-3', async () => {
      css(PA_CSS);
      $('.nb-left .nb-prog').outerHTML = '<div class="nb-pw"><div class="nb-prog">3 lines planned</div></div>';
      $('.nb-left .nb-body').innerHTML = saturday(true); $('.nb-left .nb-foot').remove();
      await sheetFrom();
      $('#p-log-h').textContent = 'Add to Saturday 21 Nov';
      $('.p-sheet .nb-add').insertAdjacentHTML('beforebegin', '<p class="pa-for">For <b>Saturday 21 November</b>. Not on today\'s list.</p>');
      $('.p-sheet .just-r').outerHTML = slipHTML('Added for Saturday 21 Nov', '<b>Brine pork</b> to Larder');
      $('#p-text').setAttribute('placeholder', 'Write a line for Saturday...');
    }]
  },
  // B. Plan ahead in the chef panel: a page next to Section standards, two weeks of days with their counts, the day's
  // lines and an inline add form. Prep's later day shows the lines and sends the chef there.
  b: {
    'plan-page': ['chef-prep-room', () => {
      css(PA_CSS + `.pa-week{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 6px}
@media (min-width:720px){.pa-week{grid-template-columns:repeat(7,1fr)}}
.pa-day{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:56px;padding:6px 4px;border:1.5px solid var(--ink);border-radius:var(--r-pick,12px);background:var(--paper);font:inherit;color:var(--ink)}
.pa-day b{font-size:1rem}.pa-day small{font-size:.8rem;color:var(--muted)}
.pa-day[aria-pressed="true"]{background:var(--ink);color:var(--bar-text)}.pa-day[aria-pressed="true"] small{color:var(--bar-text)}
.pa-wk{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px}
.pa-day-h{margin:16px 0 4px;font-size:1.15rem}
.pa-plan .nb-add{margin:8px 0 4px}.pa-plan .nb-rows{margin:0}`);
      const tabs = $('.a-tabs'); $('.a-tab', tabs).setAttribute('aria-pressed', 'false');
      tabs.insertAdjacentHTML('beforeend', '<button type="button" class="a-tab" aria-pressed="true">Plan ahead</button>');
      $('.ad-intro').textContent = 'The prep each section should have ready, and lines planned for a later day.';
      const days = [['Fri', 20, ''], ['Sat', 21, '2 lines'], ['Sun', 22, ''], ['Mon', 23, '1 line'], ['Tue', 24, ''], ['Wed', 25, ''], ['Thu', 26, '']];
      $('.a-pane').innerHTML = '<section class="set-block pa-plan"><h3 class="a-ch-h">Plan ahead</h3><p class="hint">Lines for a later day go on that day\'s prep list. Staff see them on the day. Tomorrow is written tonight on today\'s list.</p>' +
        '<div class="pa-wk"><button type="button" class="chip" aria-label="Earlier days" disabled>‹</button><span class="label">Fri 20 to Thu 26 Nov</span><button type="button" class="chip" aria-label="Later days">›</button></div>' +
        '<div class="pa-week" role="group" aria-label="Pick a day">' + days.map(d => '<button type="button" class="pa-day" aria-pressed="' + (d[1] === 21) + '"><b>' + d[0] + ' ' + d[1] + '</b><small>' + (d[2] || 'Nothing yet') + '</small></button>').join('') + '</div>' +
        '<h4 class="pa-day-h">Saturday 21 November</h4>' +
        '<form class="nb-add"><div class="nb-add-row"><input class="nb-in nb-in-text" placeholder="Write a line for Saturday..." aria-label="Prep item"><input class="nb-in nb-in-sec" placeholder="Section" aria-label="Section"><input class="nb-in nb-in-qty" placeholder="Amount to make" aria-label="Amount to make"><button type="submit" class="nb-addbtn">Add</button></div></form>' +
        saturday(false) + '</section>';
    }],
    'plan-slip': ['chef-prep-room', null],   // filled below: plan-page plus the slip and the new line
    'prep-later-day': ['chef-ahead-3', () => {
      css(PA_CSS);
      $('.nb-left .nb-prog').textContent = '2 lines planned';
      $('.nb-left .nb-body').innerHTML = saturday(false).replace(/<button type="button" class="nb-x"[^>]*>Remove<\/button>/g, '');
      $('.nb-left .nb-foot').innerHTML = '<p class="hint">Planned ahead. Staff see these lines on Saturday. <a href="#/chef">Change them in the chef panel, Prep, Plan ahead ›</a></p>';
      $('.nb-right .nb-date').textContent = 'Saturday is still to come';
      $('.nb-right .nb-body').innerHTML = '<p class="nb-sd">Lines are ticked on the day.</p>';
    }]
  },
  // C. A day strip on Prep: today and the next six days as buttons; a later day opens as one plain column with the add
  // form already open at the top (no sheet), its lines below
  c: {
    'today': ['chef-today', () => {
      css(PA_CSS + C_CSS);
      $('.nb-nav').outerHTML = STRIP('Today');
    }],
    'later-day': ['chef-ahead-3', () => {
      css(PA_CSS + C_CSS);
      $('.nb-nav').outerHTML = STRIP('Sat');
      $('.nb-left .nb-prog').textContent = '2 lines planned';
      $('.nb-left .nb-body').innerHTML = '<p class="pa-for">Planned ahead for <b>Saturday 21 November</b>. Staff see these lines on the day.</p>' + ADD + saturday(false);
      $('.nb-left .nb-foot').remove();
    }],
    'later-slip': ['chef-ahead-3', () => {
      css(PA_CSS + C_CSS);
      $('.nb-nav').outerHTML = STRIP('Sat');
      $('.nb-left .nb-prog').textContent = '3 lines planned';
      $('.nb-left .nb-body').innerHTML = '<p class="pa-for">Planned ahead for <b>Saturday 21 November</b>. Staff see these lines on the day.</p>' + ADD + slipHTML('Added for Saturday 21 Nov', '<b>Brine pork</b> to Larder') + saturday(true);
      $('.nb-left .nb-foot').remove();
    }]
  }
};
const C_CSS = `.pa-strip{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.pa-strip::-webkit-scrollbar{display:none}
.nb-nav.pa-strip{flex-wrap:nowrap}
.pa-strip .chip{flex:0 0 auto;min-width:64px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;white-space:nowrap;font-size:.95rem}.pa-strip .chip small{font-size:.75rem;font-weight:600}
.nb-right,.nb-spine{display:none}.nb .nb-left{flex:1 1 100%;max-width:none}
.pa-c-add{margin:6px 0 14px}`;
const STRIP_SRC = (on) => {
  const days = [['Today', ''], ['Thu', '19'], ['Fri', '20'], ['Sat', '21'], ['Sun', '22'], ['Mon', '23'], ['Tue', '24']];
  return '<div class="nb-nav pa-strip" role="group" aria-label="Pick a day"><button type="button" class="chip" aria-label="Back one day">‹</button>' +
    days.map(d => '<button type="button" class="chip" aria-pressed="' + (d[0] === on) + '">' + d[0] + (d[1] ? '<small>' + d[1] + ' Nov</small>' : '') + '</button>').join('') +
    '<button type="button" class="chip">Other day</button></div>';
};
const ADD_SRC = '<form class="nb-add pa-c-add"><div class="nb-add-row"><input class="nb-in nb-in-text" placeholder="Write a line for Saturday..." aria-label="Prep item"><input class="nb-in nb-in-sec" placeholder="Section" aria-label="Section"><input class="nb-in nb-in-qty" placeholder="Amount to make" aria-label="Amount to make"><button type="submit" class="nb-addbtn">Add</button></div></form>';

async function measure(p) {
  return p.evaluate(() => {
    const tops = [...document.querySelectorAll('.wk-dock, .tabbar')].map(e => e.getBoundingClientRect()).filter(r => r.height && r.top > innerHeight * 0.5 && r.top < innerHeight).map(r => r.top);
    const vh = Math.min(innerHeight, ...tops), vis = s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.height && r.top >= 0 && r.bottom <= vh; }).length;
    const small = [...document.querySelectorAll('button, a, input')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.top < innerHeight && (r.height < 44 || r.width < 44) && !e.closest('.visually-hidden') && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.textContent || e.getAttribute('aria-label') || e.placeholder || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
    return { rowsInView: vis('.nb-row'), rowsTotal: document.querySelectorAll('.nb-row').length, visibleBottom: Math.round(vh), overflow: document.documentElement.scrollWidth - innerWidth, under44: small.slice(0, 12) };
  });
}
(async () => {
  const b = await L.start(), notes = [];
  // B's slip screen: the plan page with the new line and the slip under the form
  const bPage = D.b['plan-page'][1];
  D.b['plan-slip'][1] = new Function('(' + bPage.toString() + ')(); $(".pa-plan .nb-add").insertAdjacentHTML("afterend", slipHTML("Added for Saturday 21 Nov", "<b>Brine pork</b> to Larder")); $$(".pa-plan .nb-hd")[1].insertAdjacentHTML("beforebegin", ""); $$(".pa-plan .nb-rows")[1].insertAdjacentHTML("beforeend", prow("p3", "Brine pork", "2 kg", "Planned by Sam, just now")); $$(".pa-day small")[1].textContent = "3 lines";');
  const wide = { 'a/later-day': 1, 'b/plan-page': 1, 'c/later-day': 1, 'shared/day-arrives': 1, 'before/chef-ahead-3': 1 };
  for (const d of Object.keys(D)) {
    const out = path.join(dir, 'design-' + d);
    fs.mkdirSync(out, { recursive: true });
    for (const screen of Object.keys(D[d])) {
      const [from, fn] = D[d][screen];
      for (const [w, h] of [[390, 844]].concat(wide[d + '/' + screen] ? [[768, 1024], [1280, 800]] : [])) {
        const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        const p = await ctx.newPage();
        await p.goto(BASE + 'docs/prep-ahead-options/baseline/' + from + '.html');
        await p.waitForLoadState('load');
        await p.evaluate(helpers);
        await p.evaluate('window.STRIP = ' + STRIP_SRC.toString() + '; window.ADD = ' + JSON.stringify(ADD_SRC) + '; window.C_CSS = ' + JSON.stringify(C_CSS) + ';');
        await p.evaluate(fn);
        await L.settle(p, 200);
        const suffix = w === 390 ? '' : '-' + w;
        notes.push({ design: d, screen, width: w, ...(await measure(p)) });
        await p.screenshot({ path: path.join(out, screen + suffix + '.png') });
        if (w === 390 && /plan-page|plan-slip|later-day|later-slip/.test(screen)) {
          await p.screenshot({ path: path.join(out, screen + '-full.png'), fullPage: true });
          const h4 = await p.$('.pa-day-h');
          if (h4) { await p.evaluate(() => { const e = document.querySelector('.pa-day-h'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 140); }); await L.settle(p, 100);
            notes.push({ design: d, screen: screen + '-scrolled', width: w, ...(await measure(p)) });
            await p.screenshot({ path: path.join(out, screen + '-scrolled.png') }); await p.evaluate(() => scrollTo(0, 0)); }
        }
        if (w === 390) fs.writeFileSync(path.join(out, screen + '.html'), '<!doctype html>\n' + await p.evaluate(() => document.documentElement.outerHTML));
        await ctx.close();
      }
    }
  }
  fs.writeFileSync(path.join(dir, 'preview-measurements.json'), JSON.stringify({ source: 'Preview: static snapshots of the implemented app (main 70ce8f4) edited per design, synthetic data. Not the implemented change.', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes.map(n => [n.design, n.screen, n.width, n.rowsInView, n.overflow, n.under44.length])));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
