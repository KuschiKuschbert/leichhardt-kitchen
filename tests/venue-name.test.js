// The venue's name under the KB mark on a phone (head chef, 24 Nov 2026; docs/second-venue-options/brief.md, The venue
// name on a phone). Below 720 px the top bar shows only the KB mark, so a cook could not see which kitchen's book this
// is. The name sits under the mark in the bar's orange, the bar keeps its height, and it fits beside Back and every ring
// at 360 px with the largest text. Wider screens keep the full eyebrow line and show no second name.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  const measure = p => p.evaluate(() => {
    const v = document.querySelector('.wtop-brand .rb-venue'), brand = document.querySelector('.wtop-brand'), bar = document.querySelector('.wtop'), mark = document.querySelector('.wtop-brand .rb-mark');
    const icons = [...document.querySelectorAll('.wtop-icons > *')].filter(e => e.getBoundingClientRect().width > 0);
    const r = x => x.getBoundingClientRect();
    const firstIcon = icons.length ? Math.min(...icons.map(e => r(e).left)) : innerWidth;
    return {
      shown: !!v && getComputedStyle(v).display !== 'none' && r(v).width > 0, text: v ? v.textContent : '',
      inBar: !!v && r(v).top >= r(bar).top && r(v).bottom <= r(bar).bottom, belowMark: !!v && !!mark && r(v).top >= r(mark).bottom - 1,
      clear: !!brand && r(brand).right <= firstIcon - 2, whole: !!v && v.scrollWidth <= v.clientWidth + 1,
      tall: !!brand && r(brand).height >= 44, bar: Math.round(r(bar).height), label: brand ? brand.getAttribute('aria-label') : ''
    };
  });
  for (const width of [360, 390]) for (const text of ['normal', 'xlarge']) for (const [hash, who] of [['#/', 'staff'], ['#/prep', 'staff'], ['#/prep', 'admin'], ['#/orders', 'shared']]) {
    const o = { width, settings: { text }, wait: 1500 };
    if (who === 'admin') o.admin = true;
    if (who === 'shared') o.deviceMode = 'shared';
    const p = await L.open(b, hash, o), at = width + ' ' + text + ' ' + hash + ' ' + who;
    const m = await measure(p);
    ok(m.shown && m.text === 'Leichhardt', at + ': the venue name shows on the phone (' + m.text + ')');
    ok(m.inBar && m.belowMark, at + ': it sits under the KB mark, inside the top bar');
    ok(m.clear && m.whole, at + ': it is whole and clear of the rings');
    ok(m.tall && m.label === 'Kitchen Book, Leichhardt, home', at + ': the home link keeps a 44 px target and says the venue');
    ok(!(await L.overflow(p)) && p.errors.length === 0, at + ': no sideways scroll or page errors');
    if (width === 390 && text === 'normal' && hash === '#/prep' && who === 'staff') ok(m.bar === 64, at + ': the top bar stays 64 px tall (' + m.bar + ')');
    await p.context().close();
  }
  for (const width of [768, 1280]) {
    const p = await L.open(b, '#/prep', { width, wait: 1500 });
    const m = await measure(p);
    ok(!m.shown, width + ': wider screens keep the eyebrow line and show no second name');
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.log('FAIL ' + (e.stack || e)); process.exit(1); });
