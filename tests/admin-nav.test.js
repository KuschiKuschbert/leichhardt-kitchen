// The admin nav (21 Oct 2026): groups, pages and "On this page" stay at the top of the screen, scrolling down tucks the
// nav up to its last row and scrolling up brings it back, a jump lands the heading just under the nav, and a new page
// opens just under the panel's title.
const L = require('./lib');
const { R, ok } = L.results();
const nav = p => p.evaluate(() => {
  const n = document.querySelector('.a-nav'), r = n.getBoundingClientRect();
  return { min: n.classList.contains('is-min'), bottom: Math.round(r.bottom), chips: [...n.querySelectorAll('.a-onpage .chip')].map(c => c.textContent), on: (n.querySelector('.a-onpage [aria-current="true"]') || {}).textContent || '', hidden: n.querySelector('.a-onpage').hidden };
});
// a jump: the chip on a laptop; on a phone the On this page button and its sheet (22 Oct 2026, Option B)
async function jump(p, w, id) {
  if (w > 719) return p.click('.a-onpage [data-v="' + id + '"]');
  await p.click('.a-onpage .a-jumpbtn'); await L.settle(p, 200);
  return p.click('#aj-sheet [data-aj="go"][data-v="' + id + '"]');
}
const groupsShown = p => p.evaluate(() => { const r = document.querySelector('.a-groups').getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight; });
(async () => {
  const b = await L.start();
  let p, v;

  for (const w of [390, 1280]) {
    p = await L.open(b, '#/admin', { admin: true, width: w, height: w === 390 ? 844 : 900, wait: 1800 });
    // Insights redraws when its reads come in, and a redraw mid-scroll resets where the nav thinks the scroll began:
    // let it finish first (settle stops as soon as the page is still)
    await L.adminTab(p, 'insights'); await L.settle(p, 1500);
    v = await nav(p);
    ok(v.chips.length === 7 && /Overview/.test(v.chips[0]) && /Recipe book/.test(v.chips[5]) && /Smart features/.test(v.chips[6]), w + ' admin nav: Insights has its seven sections on this page (' + v.chips.join(', ') + ')');
    ok(!v.min && await groupsShown(p), w + ' admin nav: at the top the groups show');

    // scrolling down tucks the nav up to its last row, the groups go off screen, the section on screen is marked
    await p.mouse.wheel(0, 1600); await L.settle(p, 700);
    v = await nav(p);
    ok(v.min && v.bottom > 30 && v.bottom < 80 && !(await groupsShown(p)), w + ' admin nav: scrolling down leaves only the On this page row (' + v.bottom + ' px)');
    ok(!!v.on && !/Overview/.test(v.on), w + ' admin nav: the section on screen is marked (' + v.on + ')');

    // scrolling up brings the groups and pages back without going to the top
    await p.mouse.wheel(0, -150); await L.settle(p, 700);
    v = await nav(p);
    ok(!v.min && await groupsShown(p) && await p.evaluate(() => scrollY > 500), w + ' admin nav: scrolling up brings the groups back');

    // a jump lands the heading just under the nav, both ways
    if (w === 390) {
      ok(/On this page: \S/.test(await L.txt(p, '.a-jumpbtn') || '') && !(await p.evaluate(() => [...document.querySelectorAll('.a-onpage .chip')].some(c => c.getClientRects().length))), 'phone admin nav: On this page is one button naming the part on screen (' + await L.txt(p, '.a-jumpbtn') + ')');
      await p.click('.a-onpage .a-jumpbtn'); await L.settle(p, 200);
      ok(await p.evaluate(() => { const s = document.getElementById('aj-sheet'); return !!s && s.parentNode === document.body && s.querySelectorAll('[data-aj="go"]').length === 7; }), 'phone admin nav: it opens a sheet with the seven parts');
      await p.keyboard.press('Escape'); await L.settle(p, 150);
      ok(!(await p.$('#aj-sheet')), 'phone admin nav: Escape closes the sheet');
    }
    await jump(p, w, 'ins-problems'); await L.settle(p, 1500);
    v = await nav(p);
    let top = await p.evaluate(() => Math.round(document.getElementById('ins-problems').getBoundingClientRect().top));
    const end = await p.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
    ok(top >= v.bottom && (top < v.bottom + 40 || end) && /Problem lines/.test(v.on), w + ' admin nav: Problem lines lands under the nav, or the page ends, and is marked (heading ' + top + ', nav ' + v.bottom + ', on ' + v.on + ')');
    await jump(p, w, 'ins-days'); await L.settle(p, 1500);
    v = await nav(p);
    top = await p.evaluate(() => Math.round(document.getElementById('ins-days').getBoundingClientRect().top));
    ok(top >= v.bottom && top < v.bottom + 40 && !v.min, w + ' admin nav: back up to Days, under the whole nav (heading ' + top + ', nav ' + v.bottom + ')');

    // another page from further down opens just under the title, with its own parts
    await p.click('[data-p="a-tab"][data-t="waste"]'); await L.settle(p, 600);
    v = await nav(p);
    const y = await p.evaluate(() => scrollY), mark = await p.evaluate(() => Math.round(document.querySelector('.a-navtop').getBoundingClientRect().top + scrollY));
    ok(Math.abs(y - mark) <= 2 && v.chips.some(c => /By reason/.test(c)), w + ' admin nav: Wastage opens under the title with its parts (scroll ' + y + ', title ' + mark + ', ' + v.chips.length + ' parts)');

    // a group with one page puts its parts straight under the groups
    await p.click('[data-p="a-group"][data-g="people"]'); await L.settle(p, 600);
    v = await nav(p);
    ok(v.chips.join('|') === 'People|Kitchen sections|Badges|New pages' && !(await p.$('.a-tabs')), w + ' admin nav: People has its four parts and no page row (' + v.chips.join(', ') + ')');
    await p.click('[data-p="a-group"][data-g="settings"]'); await L.settle(p, 600);
    v = await nav(p);
    ok(v.chips.join('|') === 'Backup|Kitchen PIN', w + ' admin nav: Settings jumps to Backup and Kitchen PIN (' + v.chips.join(', ') + ')');
    await p.click('[data-p="a-group"][data-g="today"]'); await L.settle(p, 600);
    v = await nav(p);
    ok(v.hidden && !v.chips.length, w + ' admin nav: a short page has no On this page row');

    ok(!(await L.overflow(p)), w + ' admin nav: no sideways scroll');
    ok(p.errors.length === 0, w + ' admin nav: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // keyboard: tabbing into a tucked-away nav brings it back
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'insights'); await L.settle(p, 300);
  await p.mouse.wheel(0, 1600); await L.settle(p, 700);
  await p.focus('[data-p="a-group"][data-g="people"]'); await L.settle(p, 400);
  v = await nav(p);
  ok(!v.min, 'phone admin nav: focus on a group brings the nav back');
  await p.context().close();

  // a redraw between a scroll and the nav's next look (a read coming in) does not swallow the scroll: it still tucks
  p = await L.open(b, '#/admin', { admin: true, width: 390, height: 844, wait: 1800 });
  await L.adminTab(p, 'insights'); await L.settle(p, 1500);
  await p.evaluate(() => new Promise(res => {
    addEventListener('scroll', function f() { removeEventListener('scroll', f); LK_PREP.mount('admin', LK_PREP.state.root); res(); });
    scrollBy(0, 1600);
  }));
  await L.settle(p, 700);
  v = await nav(p);
  ok(v.min && v.bottom < 80, 'phone admin nav: a redraw while scrolling down still tucks the nav (' + v.bottom + ' px)');
  ok(p.errors.length === 0, 'phone admin nav, redraw: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
