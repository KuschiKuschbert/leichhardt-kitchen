// The chef mark in the top bar: on every phone, with the name in its title (and next to it on a wide screen) while a
// person is signed in, back to "Menu and Settings" after "Not you?", on every page (19 Oct 2026). Its menu holds
// Settings for everyone, signed in or not (20 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const anim = p => p.evaluate(() => { const e = document.querySelector('.wtop-who'); return e ? (e.classList.contains('flip') ? 'flip:' : 'still:') + getComputedStyle(e).animationName : 'none'; });
const mark = p => p.evaluate(() => { const e = document.querySelector('.wtop-who'); if (!e) return 'none'; const cs = getComputedStyle(e), n = e.querySelector('.wtop-who-n'); return (cs.display === 'none' ? 'off' : 'on') + ':' + (e.getAttribute('title') || '') + ':' + (n && getComputedStyle(n).display !== 'none' ? n.textContent : ''); });
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/', { who: 'sam', wait: 1800 });   // the prep book restores the sign-in about a second after the page opens
  ok((await mark(p)) === 'on:Signed in as Sam:', 'landing, phone: the chef mark shows with the name in its title, no name next to it (' + await mark(p) + ')');
  ok((await anim(p)) === 'still:none', 'landing, phone: a phone already signed in gets no flip (' + await anim(p) + ')');
  ok(!(await L.overflow(p)), 'landing, phone: no sideways scroll with the mark (' + await L.overflow(p) + ')');
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: '', wait: 1800 });
  ok((await mark(p)) === 'on:Menu and Settings:', 'recipes, nobody signed in: the chef mark still shows (' + await mark(p) + ')');
  ok(await p.$('.wtop a[href="#/settings"]') === null, 'recipes: no separate Settings button in the top bar');
  await L.tap(p, '.wtop-who'); await p.waitForTimeout(200);
  ok(!!(await p.$('.wm a[href="#/settings"]')) && !!(await p.$('.wm a[href="#/prep"]')) && !(await p.$('.wm a[href="#/mail"]')), 'recipes, nobody signed in: the menu has Prep list and Settings, no mail');
  await p.click('.wm a[href="#/settings"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => location.hash) === '#/settings' && !(await p.$('.wm')), 'recipes: Settings opens from the menu and the menu closes');
  ok(await p.evaluate(() => document.querySelector('.wtop-who').getAttribute('aria-current')) === 'page', 'settings: the chef mark is marked as the current page');
  await p.context().close();
  const brandLines = p => p.evaluate(() => { const el = document.querySelector('.wtop-brand b'); return el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize); });
  for (const w of [768, 1280, 1440]) {
    p = await L.open(b, '#/', { who: 'sam', width: w, height: 900, wait: 1800 });
    ok((await mark(p)) === (w >= 1400 ? 'on:Signed in as Sam:Sam' : 'on:Signed in as Sam:'), 'landing at ' + w + ': the mark ' + (w >= 1400 ? 'shows the first name' : 'is the hat in a ring') + ' (' + await mark(p) + ')');
    ok(!(await L.overflow(p)), 'landing at ' + w + ': no sideways scroll with the mark (' + await L.overflow(p) + ')');
    if (w >= 1280) ok((await brandLines(p)) < 1.6, 'landing at ' + w + ': "Kitchen Book" stays on one line with the mark (' + (await brandLines(p)).toFixed(1) + ' lines)');
    const ring = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.wtop-who')); return cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + Math.round(parseFloat(cs.height)); });
    ok(ring === '2px solid 44', 'landing at ' + w + ': the mark has the same ring as Admin (' + ring + ')');
    await L.tap(p, '.wtop-who'); await p.waitForTimeout(200);
    ok(!!(await p.$('.wm a[href="#/mail"]')) && !!(await p.$('.wm a[href="#/settings"]')), 'landing at ' + w + ': signed in, the menu has Kitchen mail and Settings');
    ok(!(await L.overflow(p)), 'landing at ' + w + ': no sideways scroll with the menu open (' + await L.overflow(p) + ')');
    await p.context().close();
  }
  // sign out and in again on the prep list: the mark follows without a reload
  p = await L.open(b, '#/prep', { who: 'sam', wait: 1200 });
  ok((await mark(p)) === 'on:Signed in as Sam:', 'prep list: mark on for Sam (' + await mark(p) + ')');
  await p.click('[data-p="who-change"]');
  await p.waitForTimeout(300);
  ok((await mark(p)) === 'on:Menu and Settings:', 'prep list: "Not you?" takes the name off the mark (' + await mark(p) + ')');
  await p.click('.p-name[data-id="ann"]');
  await p.waitForTimeout(500);
  await p.type('#pf1', '2222');
  await p.waitForTimeout(900);
  ok((await mark(p)) === 'on:Signed in as Ann:', 'prep list: signing in as Ann brings the mark back with her name (' + await mark(p) + ')');
  ok((await anim(p)) === 'flip:who-flip', 'prep list: the sign-in flips the mark in like a coin (' + await anim(p) + ')');
  ok(p.errors.length === 0, 'who mark: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
