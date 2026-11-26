/* The Cleaning page as it is today, for the council's evidence packet (26 Nov 2026).
     (cd <a checkout at the packet's commit> && node docs/cleaning-look-options/designs/baseline.cjs)
   Uses the round 2 harness of the results-by-section study (docs/cleaning-tracking-options/designs/frame.cjs): the
   click-test stand-in, the head chef's real lists loaded under made-up sections, the click tests' made-up people.
   Writes pictures and baseline.json into ../baseline. Nothing is saved and no application file changes. */
const path = require('path'), fs = require('fs');
const F = require('../../cleaning-tracking-options/designs/frame.cjs');
const OUT = path.join(__dirname, '..', 'baseline'), out = {};
fs.mkdirSync(OUT, { recursive: true });
const SIZES = { 390: [390, 844], 768: [768, 1024], 1280: [1280, 800], 1920: [1920, 1080] };

// what a person sees on the opening screen: rows fully in view, where the first tick box sits, how long the page is
const look = p => p.evaluate(() => {
  const vh = innerHeight, rows = [...document.querySelectorAll('.cln-page .nb-row')].filter(r => r.getClientRects().length);
  const inView = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; });
  const bars = [...document.querySelectorAll('nav, .tabbar')].map(n => n.getBoundingClientRect()).filter(b => b.height > 0 && b.top > vh / 2 && b.bottom >= vh - 2), barTop = bars.length ? Math.min(...bars.map(b => b.top)) : vh;
  const usable = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= Math.min(vh, barTop); });
  const first = rows[0] && rows[0].getBoundingClientRect(), box = document.querySelector('.cln-page .nb-box'), title = document.querySelector('.cln-page .nb-title');
  const heads = [...document.querySelectorAll('.cln-page .nb-hd, .cln-page .cln-mine-title')].filter(h => { const b = h.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).map(h => h.textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
  const above = [...document.querySelectorAll('.cln-page .nb-ph, .cln-page .cln-readline, .cln-page .cln-temperature, .cln-page .cln-toolbar, .cln-page .cln-coverage, .cln-page .cln-work-notices')].filter(e => e.getClientRects().length).map(e => e.className.split(' ').pop() + ' ' + Math.round(e.getBoundingClientRect().height) + 'px');
  return { rowsTotal: rows.length, rowsInView: usable.length, rowsInViewIgnoringTabBar: inView.length, firstRowTop: first ? Math.round(first.top) : null, firstBoxTop: box ? Math.round(box.getBoundingClientRect().top) : null,
    title: title ? title.textContent.trim() : '', headingsInView: heads, aboveTheRows: above, screensLong: Math.round(document.documentElement.scrollHeight / vh * 10) / 10, sideways: document.documentElement.scrollWidth > innerWidth };
});

// the phone tab bar with another word in place of Cleaning: does it fit on one line, and how wide is each tab
const tabFit = (p, word) => p.evaluate(w => {
  const links = [...document.querySelectorAll('a[href="#/cleaning"]')].filter(a => a.getClientRects().length && a.getBoundingClientRect().top > innerHeight - 140);
  const a = links[0]; if (!a) return null;
  const label = [...a.querySelectorAll('*')].concat([a]).find(e => [...e.childNodes].some(n => n.nodeType === 3 && /Cleaning|Clean down|Reset|Close|Wrap up|Shine|Checklist|Knock off|Close down|Clean up|Closing|Night clean/.test(n.textContent)));
  if (!label) return null;
  const node = [...label.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
  node.textContent = w;
  const lh = parseFloat(getComputedStyle(label).lineHeight) || 16, h = label.getBoundingClientRect().height, b = a.getBoundingClientRect();
  const bar = a.parentElement.closest('nav') || a.parentElement, tight = [...bar.querySelectorAll('a')].filter(t => t.getClientRects().length).map(t => { const lab = [...t.querySelectorAll('span, b, small')].pop() || t; return { t: t.textContent.trim(), spare: Math.round(t.getBoundingClientRect().width - lab.scrollWidth), lines: Math.round(lab.getBoundingClientRect().height / (parseFloat(getComputedStyle(lab).lineHeight) || 16)) }; });
  const worst = tight.sort((x, y) => x.spare - y.spare)[0];
  return { tightestTab: worst && worst.t + ' ' + worst.spare + 'px spare, ' + worst.lines + ' line(s)', anyTabTwoLines: tight.some(x => x.lines > 1), word: w, oneLine: h < lh * 1.6, labelWidth: Math.round(label.scrollWidth), tabWidth: Math.round(b.width), clipped: label.scrollWidth > label.clientWidth + 1 };
}, word);

(async () => {
  await F.start();
  try {
    // a cook (Ann) on Grill, personal phone and the kitchen tablet
    for (const w of [390, 768]) {
      const p = await F.cook(w); await p.setViewportSize({ width: SIZES[w][0], height: SIZES[w][1] }); await F.L.settle(p, 400);
      out['cook-' + w] = await look(p); await p.screenshot({ path: path.join(OUT, 'cook-' + w + '.png') });
      await p.screenshot({ path: path.join(OUT, 'cook-' + w + '-full.png'), fullPage: true });
      if (w === 390) {
        out.tabs = {};
        for (const [vw, text] of [[360, ''], [390, ''], [360, 'xlarge'], [390, 'xlarge']]) {
          await p.evaluate(t => t ? document.documentElement.setAttribute('data-text', t) : document.documentElement.removeAttribute('data-text'), text);
          await p.setViewportSize({ width: vw, height: 844 }); await F.L.settle(p, 300);
          const k = vw + (text ? '-' + text : ''); out.tabs[k] = [];
          for (const word of ['Cleaning', 'Clean down', 'Reset', 'Close', 'Close down', 'Wrap up', 'Shine', 'Checklist', 'Knock off', 'Clean up', 'Closing', 'Night clean']) out.tabs[k].push(await tabFit(p, word));
        }
      }
      await p.context().close();
    }
    // a section screen: 1920 x 1080, touch, shared, Ann signed in on Grill
    // a section screen: 1920 x 1080, touch, shared, set to Grill. Ann signs in; once on Grill, once on Pans
    const station = async (picked) => {
      const p = await F.L.open(F.browser(), '#/cleaning', { who: 'ann', width: 1920, height: 1080, touch: true, base: F.base(), extra: F.cleaning, clock: F.WED, wait: 1000, deviceMode: 'shared', profile: { v: 2, mode: 'shared', ownerId: '', sec: 'grill' },
        init: picked ? new Function("const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: '" + picked + "', name: '" + picked + "', self: true, at: Date.now() }));") : undefined });
      await F.L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); });
      await F.fonts(p); await F.L.settle(p, 400); return p;
    };
    for (const [name, picked] of [['station-1920', 'grill'], ['station-1920-pans-cook', 'pans']]) {
      const p = await station(picked);
      out[name] = await look(p); await p.screenshot({ path: path.join(OUT, name + '.png') });
      if (name === 'station-1920') {
        // a plain tick on a shared screen: the box, then Who did this (Others... when the person is not listed first), then the name
        let taps = 1; await p.click('.cln-row [data-cln="flow-quick"]:not([disabled]), .cln-row [data-cln="tick"]:not([disabled])');
        await F.L.waitFor(p, () => !!document.querySelector('#cln-worker-sheet [data-cln-person], #cln-worker-sheet [data-cln-picker="others"]'));
        await p.screenshot({ path: path.join(OUT, 'station-1920-who.png') });
        if (!(await p.locator('#cln-worker-sheet [data-cln-person="ann"]').isVisible())) { taps++; await p.click('[data-cln-picker="others"]'); }
        await p.click('#cln-worker-sheet [data-cln-person="ann"]'); taps++;
        await F.L.waitFor(p, () => !LK_PREP.unsent()); out.stationPlainTickTaps = taps;
      }
      await p.context().close();
    }
    // the head chef (Sam): Today, Week and Repeat tasks
    for (const w of [390, 1280, 1920]) {
      const p = await F.chef(w); await p.setViewportSize({ width: SIZES[w][0], height: SIZES[w][1] });
      await p.click('[data-cln="today"]'); await F.L.settle(p, 400);
      out['chef-today-' + w] = await look(p); await p.screenshot({ path: path.join(OUT, 'chef-today-' + w + '.png') });
      await p.click('[data-cln="week"]'); await F.L.settle(p, 400);
      out['chef-week-' + w] = await look(p); await p.screenshot({ path: path.join(OUT, 'chef-week-' + w + '.png') });
      await p.click('[data-cln="setup"]'); await F.L.settle(p, 400);
      out['chef-setup-' + w] = await look(p); await p.screenshot({ path: path.join(OUT, 'chef-setup-' + w + '.png') });
      if (w === 390) await p.screenshot({ path: path.join(OUT, 'chef-setup-390-full.png'), fullPage: true });
      await p.context().close();
    }
  } finally { await F.stop(); }
  fs.writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
