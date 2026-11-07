// Answer the tap first (4 Nov 2026, docs/loading-feedback-options/brief.md, design A). Opening Recipes draws the top
// bar, the search, the chips and the groups on the first screen in the tap's own frame, and the other shelves or tile
// groups in the idle moments just after. These checks hold on the Pass and on Tiles, on a phone and a computer:
// the frame is there straight after the address changes, before every group is in; every group ends up drawn, the
// same as one full draw; a search typed or a chip tapped before then covers every group; and Back from a plate tapped
// early puts it back where it was.
const L = require('./lib');
const { R, ok } = L.results();

// In the page: change the address to Recipes and look straight after the book drew it. This listener is added after the
// book's own, so it runs right after render() in the same task, before any idle moment. o.type types into the search
// there and o.chip taps a chip there, both before the other groups are in.
function go(o) {
  return new Promise(res => {
    addEventListener('hashchange', function seen() {
      removeEventListener('hashchange', seen);
      const f = document.getElementById('find'), box = f && f.getBoundingClientRect();
      const r = {
        top: !!document.querySelector('.wtop .wtop-back'),
        tab: !!document.querySelector('.tabbar a[aria-current="page"][href="#/recipes"]'),
        find: !!box && box.height > 0 && box.top >= 0 && box.top < innerHeight,
        chips: document.querySelectorAll('[aria-label="Recipe type"] .chip').length,
        drawn: document.querySelectorAll(o.group).length
      };
      if (o.type) { f.value = o.type; f.dispatchEvent(new Event('input', { bubbles: true })); }
      if (o.chip) document.querySelector(o.chip).click();
      res(r);
    });
    location.hash = '#/recipes';
  });
}
// the results box as drawn, and the same box after one full draw of every group (lk-art redraws the results in one go)
const full = p => p.evaluate(() => {
  const box = document.getElementById('shelves') || document.getElementById('results'), now = box.innerHTML;
  dispatchEvent(new Event('lk-art'));
  return { same: now === box.innerHTML, groups: box.querySelectorAll('.shelf, .tile-group').length };
});
const count = (p, g) => p.evaluate(s => document.querySelectorAll(s).length, g);
const landing = async p => { await p.evaluate(() => { location.hash = '#/'; }); await L.waitFor(p, () => !!document.querySelector('.kb-home')); await L.settle(p, 600); };

(async () => {
  const b = await L.start();
  for (const view of ['pass', 'tiles']) for (const [w, h] of [[390, 844], [1280, 900]]) {
    const at = view + ' ' + w + ': ', group = view === 'pass' ? '.shelf' : '.tile-group';
    const p = await L.open(b, '#/', { width: w, height: h, settings: { view }, wait: 800 });

    // 1. the frame and the first screen at once, the rest just after
    const first = await p.evaluate(go, { group });
    ok(first.top && first.tab && first.find && first.chips > 2, at + 'the top bar, the Recipes tab, the search and the chips are there at once ' + JSON.stringify(first));
    await L.settle(p, 3000);
    const all = await count(p, group);
    ok(first.drawn >= 1 && first.drawn < all, at + 'the first groups come at once and the rest after (' + first.drawn + ' of ' + all + ')');
    const fill = await p.evaluate(a => { const g = document.querySelectorAll(a[0])[a[1]]; return { y: window.scrollY, top: g ? Math.round(g.getBoundingClientRect().top) : null, h: innerHeight }; }, [group, first.drawn]);
    ok(fill.y === 0 && fill.top !== null && fill.top >= fill.h, at + 'the groups drawn at once fill the first screen (the next starts at ' + fill.top + ' of ' + fill.h + ')');
    let f = await full(p);
    ok(f.same && f.groups === all, at + 'every group ends up drawn, the same as one full draw (' + all + ')');

    // 2. a search typed before the other groups are in filters every group, the late ones included
    await landing(p);
    const typed = await p.evaluate(go, { group, type: 'onion' });
    ok(typed.drawn < all, at + 'the search was typed before every group was in');
    await L.waitFor(p, g => document.querySelectorAll(g).length > 0 && /of/.test(document.getElementById('count').textContent), group);
    await L.settle(p, 1500);
    f = await full(p);
    const names = await p.evaluate(g => [...document.querySelectorAll(g)].map(s => s.getAttribute('aria-label')), group);
    ok(f.same && names.length > 3 && names.length < all, at + 'the search covers every group, the late ones too (' + names.join(', ') + ')');
    ok(/Bains and prep|Batch recipes/.test(names[names.length - 1]), at + 'a group far down the page is filtered, not left out');
    // Clear search (the shared search bar's own button), so the next checks start from every recipe again
    await p.evaluate(() => document.querySelector('.ux-search-clear').click());
    await L.waitFor(p, () => !/ of /.test(document.getElementById('count').textContent));
    await L.settle(p, 1500);

    // 3. a chip tapped before the other groups are in shows only its own group
    await landing(p);
    const tapped = await p.evaluate(go, { group, chip: '[data-act="kind"][data-val="component"]' });
    ok(tapped.drawn < all, at + 'the chip was tapped before every group was in');
    await L.settle(p, 1500);
    f = await full(p);
    ok(f.same && f.groups === 1 && await p.evaluate(() => document.querySelector('[data-act="kind"][data-val="component"]').getAttribute('aria-pressed') === 'true'), at + 'the chip shows only its own group, and nothing else comes in after (' + f.groups + ')');
    await p.evaluate(() => document.querySelector('[data-act="kind"][data-val="all"]').click()); await L.settle(p, 1500);

    // 4. a plate tapped on the first screen before the rest is in: Back puts it where it was, with every group drawn
    await landing(p);
    await p.evaluate(go, { group });
    const sel = group + ':first-of-type a[href^="#/r/"]';
    // where the plate was at the moment of the tap (the recipe check's status line can still come and go before it)
    await p.evaluate(s => document.addEventListener('click', () => { window.__tapTop = Math.round(document.querySelector(s).getBoundingClientRect().top); }, { capture: true, once: true }), sel);
    await p.click(sel);
    const before = await p.evaluate(() => window.__tapTop);
    await L.waitFor(p, () => /^#\/r\//.test(location.hash) && !!document.getElementById('rtitle'));
    const back = await p.evaluate(g => new Promise(res => {
      addEventListener('hashchange', function seen() { removeEventListener('hashchange', seen); res(document.querySelectorAll(g).length); });
      history.back();
    }), group);
    ok(back === all, at + 'coming back from a recipe draws every group at once (' + back + ' of ' + all + ')');
    await L.settle(p, 600);
    const after = await p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
    ok(Math.abs(after - before) <= 4, at + 'back from a plate tapped early, it is where it was (' + before + ', now ' + after + ')');

    ok(p.errors.length === 0, at + 'no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
