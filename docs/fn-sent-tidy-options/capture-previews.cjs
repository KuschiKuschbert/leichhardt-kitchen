/* Round 2 previews for "function sent, lines off" (14 Nov 2026). Starts from the static baseline snapshots (real app
   markup and CSS, synthetic data, scripts removed) and changes only what each design changes, then saves a screenshot,
   the HTML and measurements at 390 x 844. Preview only: no app code runs, so taps, slips timing and failures are not
   exercised here. Run from tests/ like capture-baseline.cjs (copy to zz-fsp.test.js, BASE=... npm test -- zz-fsp). */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const dir = path.join(root, 'docs/fn-sent-tidy-options');
const BASE = process.env.BASE || L.BASE;

// helpers that run in the page
const HELP = `
window.$ = (s, r) => (r || document).querySelector(s);
window.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
window.row = k => $$('.nb-row').find(r => (r.getAttribute('data-ln') || '').includes(k));
window.txt = (el, from, to) => { if (el) el.innerHTML = el.innerHTML.replace(from, to); };
window.hdCount = (name, val) => { const h = $$('.nb-hd').find(x => x.textContent.trim().toLowerCase().startsWith(name)); if (h) h.lastElementChild.textContent = val; };
window.slip = (msg, btn) => { const d = document.createElement('div'); d.className = 'p-toasts'; d.innerHTML = '<div class="p-toast" role="presentation"><span class="p-toast-msg">' + msg + '</span>' + (btn ? '<button type="button" class="p-toast-btn">' + btn + '</button>' : '') + '</div>'; document.body.appendChild(d); };
window.css = s => { const st = document.createElement('style'); st.textContent = s; document.head.appendChild(st); };
window.tagFor = () => $$('.nb-row').filter(r => /need/.test(r.getAttribute('data-ln') || '')).forEach(r => { const m = $('.nb-marks', r); if (m) m.insertAdjacentHTML('beforeend', ' <span class="fn-tag nb-forfn">For Smith 60th</span>'); });
window.noNeeds = () => { const s = $('.fnn-sum'); if (s) { const h = s.previousElementSibling; if (h && /functions/i.test(h.textContent)) h.remove(); s.remove(); } };
window.notNeeded = (r, words) => { r.classList.add('is-notneeded'); const b = $('.nb-box', r); if (b) b.outerHTML = '<span class="nb-box nb-nn" aria-hidden="true">–</span>'; const a = $('.nb-acts', r); if (a) a.remove(); $$('.nb-more', r).forEach(x => x.remove()); $$('.p-x', r).forEach(x => x.remove()); $$('.o-fn-tag, .o-fn-when, .nb-roll, .o-used', r).forEach(x => x.remove()); const m = $('.nb-meta', r); if (m) m.innerHTML = '<span class="nb-wrote">' + words + '</span>'; };
`;
const NN_CSS = `.is-notneeded .nb-t{text-decoration:line-through;opacity:.62}.nb-nn{display:inline-flex;align-items:center;justify-content:center;width:26px;color:var(--muted,#6b6b6b);font-weight:700}
.nb-fold{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:44px;margin:10px 0 0;padding:8px 0;border:0;border-top:1px dashed #b9b2a4;background:none;font:inherit;font-weight:700;color:inherit;text-align:left}`;

// what each design changes, per screen
const D = {
  before: {
    'prep-all': `tagFor();`
  },
  a: {
    'function-page': `slip('Smith 60th all sent: 3 prep lines and 1 order line off the lists.', 'Undo');`,
    'prep-all': `row('need0').remove(); row('need1').remove(); hdCount('larder', '0/3'); txt($('.nb-prog'), '0 of 8', '0 of 6'); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove()); noNeeds();`,
    'prep-functions': `row('pizza-platter').remove(); txt($('.nb-prog'), '1 of 2', '1 of 1'); hdCount('function platters', '1/1'); noNeeds(); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove());
      $('.nb-hd').insertAdjacentHTML('afterend', '<p class="nb-empty">Smith 60th all sent 12:48. Lines not ticked are off the list (Removed lines).</p>');`,
    'orders-sous': `row('fn-smith').remove(); txt($('.nb-prog'), '0 of 3', '0 of 2');`
  },
  b: {
    'function-page': `slip('Smith 60th all sent: 3 prep lines and 1 order line marked Not needed.', 'Undo');`,
    'prep-all': `css(NN_CSS); const a = row('need0'), b = row('need1'); hdCount('larder', '0/3'); txt($('.nb-prog'), '0 of 8', '0 of 6'); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove());
      [a, b].forEach(r => notNeeded(r, 'Not needed: Smith 60th sent 12:48'));
      const lists = $$('.nb-left .nb-rows'), last = lists[lists.length - 1];
      last.insertAdjacentHTML('afterend', '<button type="button" class="nb-fold" aria-expanded="true">Went out with Smith 60th (2) <span aria-hidden="true">▴</span></button><ul class="nb-rows nb-nnlist"></ul>');
      const ul = $('.nb-nnlist'); ul.appendChild(a); ul.appendChild(b); noNeeds();`,
    'prep-functions': `css(NN_CSS); notNeeded(row('pizza-platter'), 'Not needed: Smith 60th sent 12:48'); txt($('.nb-prog'), '1 of 2', '1 of 1'); hdCount('function platters', '1/1'); noNeeds(); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove());`,
    'orders-sous': `css(NN_CSS); const r = row('fn-smith'); notNeeded(r, 'Not needed: Smith 60th sent 12:48'); txt($('.nb-prog'), '0 of 3', '0 of 2'); const ul = r.parentNode;
      ul.insertAdjacentHTML('afterend', '<button type="button" class="nb-fold" aria-expanded="true">Went out with Smith 60th (1) <span aria-hidden="true">▴</span></button><ul class="nb-rows nb-nnlist"></ul>'); $('.nb-nnlist').appendChild(r);`
  },
  c: {
    'function-page': `const box = $('.fn-next'); box.insertAdjacentHTML('beforeend', '<div class="fn-next-off"><p class="fn-next-s"><b>Off the lists:</b> Pizza Platter (Functions), Party pies and Sausage rolls (Larder), Function stock (Orders).</p><button type="button" class="linkish fn-next-undo">Undo</button></div>');
      css('.fn-next-off{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.25)}.fn-next-off .linkish{color:inherit;text-decoration:underline;min-height:44px;background:none;border:0;font:inherit;font-weight:700;padding:0}');`,
    'prep-all': `row('need0').remove(); row('need1').remove(); hdCount('larder', '0/3'); txt($('.nb-prog'), '0 of 8', '0 of 6'); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove()); noNeeds();`,
    'prep-functions': `row('pizza-platter').remove(); txt($('.nb-prog'), '1 of 2', '1 of 1'); noNeeds(); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove());
      const hd = $('.nb-hd'); hd.nextElementSibling && hd.nextElementSibling.matches('.nb-rows') && hd.nextElementSibling.remove();
      hd.outerHTML = '<section class="fn-next fn-receipt" aria-label="Smith 60th"><p class="fn-next-h"><span class="fn-next-l">Done</span> <b>Smith 60th all sent</b></p><p class="fn-next-s">Last round 12:48, Ann. Off the lists: Pizza Platter, Party pies, Sausage rolls, Function stock.</p><a class="fn-receipt-a" href="#/fn/smith">Open function</a></section>';
      css('.fn-receipt{margin:12px 0}.fn-receipt-a{display:inline-flex;align-items:center;min-height:44px;color:inherit;font-weight:700;text-decoration:underline}');`,
    'orders-sous': `row('fn-smith').remove(); txt($('.nb-prog'), '0 of 3', '0 of 2');`
  },
  // the council's mix (round 2): A's lists, slip and Removed lines; C's named lines, in the slip and in the All sent box
  // (no second Undo); a leaving line holds its place for a moment on other phones; the tag and the note in the body font
  mix: {
    'before': `tagFor(); css(MIX_CSS);`,
    'function-page': `css(MIX_CSS); $('.fn-next').insertAdjacentHTML('beforeend', '<p class="fn-next-s fn-next-offl"><b>Taken off the lists:</b> Pizza Platter, Party pies, Sausage rolls, Function stock.</p>');
      slip('Smith 60th all sent. Taken off the lists: Pizza Platter, Party pies, Sausage rolls, Function stock.', 'Undo');`,
    'prep-all': `css(MIX_CSS); tagFor(); [row('need0'), row('need1')].forEach(r => { r.classList.add('is-leaving'); r.classList.remove('is-rolled'); $$('.nb-roll, .nb-forfn', r).forEach(x => x.remove()); $$('[data-n]', r).forEach(x => x.removeAttribute('data-n')); $$('.visually-hidden', r).forEach(x => x.remove()); const b = $('.nb-box', r); if (b) b.setAttribute('disabled', ''); const m = $('.nb-meta', r); if (m) m.innerHTML = '<span class="nb-wrote nb-offw">Not needed: Smith 60th all sent</span>'; });
      hdCount('larder', '0/3'); txt($('.nb-prog'), '0 of 8', '0 of 6'); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove()); noNeeds();`,
    'prep-all-after': `row('need0').remove(); row('need1').remove(); hdCount('larder', '0/3'); txt($('.nb-prog'), '0 of 8', '0 of 6'); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove()); noNeeds();`,
    'prep-functions': `css(MIX_CSS); row('pizza-platter').remove(); txt($('.nb-prog'), '1 of 2', '1 of 1'); hdCount('function platters', '1/1'); noNeeds(); $$('.nb-tab-fn .nb-tab-n').forEach(x => x.remove());
      $('.nb-hd').insertAdjacentHTML('afterend', '<p class="nb-fnoff"><b>Smith 60th all sent 12:48.</b> Taken off the list: Pizza Platter (Functions), Party pies and Sausage rolls (Larder).</p>');`,
    'orders-sous': `row('fn-smith').remove(); txt($('.nb-prog'), '0 of 3', '0 of 2');`
  }
};
const MIX_CSS = `.nb-forfn{font-family:var(--body);font-size:.75rem;font-weight:700}.nb-fnoff{margin:10px 0 4px;font-family:var(--body);font-size:1rem;line-height:1.4;color:var(--ink)}
.is-leaving .nb-box,.is-leaving .nb-acts{opacity:.4}.nb-offw{font-family:var(--body);font-weight:700;color:var(--ink)}.is-leaving .nb-meta,.is-leaving .nb-wrote{white-space:normal;overflow:visible;text-overflow:clip}.fn-next-offl{margin-top:8px}`;

async function measure(p) {
  return p.evaluate(() => {
    const vh = innerHeight, vis = s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.height && r.top >= 0 && r.bottom <= vh; }).length;
    const tab = document.querySelector('.nb-tab-fn');
    return { openRowsInView: vis('.nb-row:not(.is-notneeded)'), notNeededRowsInView: vis('.nb-row.is-notneeded'), rowsTotal: document.querySelectorAll('.nb-row').length,
      fnTab: tab ? tab.textContent.trim() : null, overflow: document.documentElement.scrollWidth - innerWidth };
  });
}
(async () => {
  const b = await L.start(), notes = [];
  for (const d of Object.keys(D)) {
    const out = path.join(dir, d === 'before' ? 'design-shared' : 'design-' + d);
    fs.mkdirSync(out, { recursive: true });
    for (const screen of Object.keys(D[d])) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      const from = screen === 'before' || screen === 'prep-all-after' ? 'prep-all' : screen;
      await p.goto(BASE + 'docs/fn-sent-tidy-options/baseline/' + from + '.html');
      await p.waitForLoadState('load');
      await p.evaluate(HELP + 'window.NN_CSS = ' + JSON.stringify(NN_CSS) + '; window.MIX_CSS = ' + JSON.stringify(MIX_CSS) + ';');
      await p.evaluate(D[d][screen]);
      await L.settle(p, 150);
      notes.push({ design: d, screen, ...(await measure(p)) });
      await p.screenshot({ path: path.join(out, screen + '.png') });
      // B's fold sits below the first screen: a second shot scrolled to it
      if (d === 'b' && screen === 'prep-all') {
        await p.evaluate(() => { const f = document.querySelector('.nb-fold'); scrollTo(0, f.getBoundingClientRect().top + scrollY - 420); });
        await L.settle(p, 150); await p.screenshot({ path: path.join(out, screen + '-fold.png') }); await p.evaluate(() => scrollTo(0, 0));
      }
      await p.screenshot({ path: path.join(out, screen + '-full.png'), fullPage: true });
      fs.writeFileSync(path.join(out, screen + '.html'), '<!doctype html>\n' + await p.evaluate(() => document.documentElement.outerHTML));
      await ctx.close();
    }
  }
  // one sheet with every screen side by side, for the head chef
  { const ctx = await b.newContext({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 1 }), p = await ctx.newPage();
    await p.goto(BASE + 'docs/fn-sent-tidy-options/comparison.html'); await p.waitForLoadState('load'); await L.settle(p, 300);
    await p.screenshot({ path: path.join(dir, 'comparison.png'), fullPage: true }); await ctx.close(); }
  fs.writeFileSync(path.join(dir, 'preview-measurements.json'), JSON.stringify({ source: 'Preview: static snapshots of the implemented app (main 6f706fe) edited per design, synthetic data, 390 x 844. Not the implemented change.', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
