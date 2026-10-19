// The chef mark in the top bar: shown while a person is signed in on this phone, with the name in its title (and next
// to it on a wide screen), gone after "Not you?", back after the next sign-in, on every page (19 Oct 2026).
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
  ok((await mark(p)) === 'off::', 'recipes, nobody signed in: no chef mark (' + await mark(p) + ')');
  await p.context().close();
  const brandLines = p => p.evaluate(() => { const el = document.querySelector('.wtop-brand b'); return el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize); });
  for (const w of [768, 1280, 1440]) {
    p = await L.open(b, '#/', { who: 'sam', width: w, height: 900, wait: 1800 });
    ok((await mark(p)) === (w >= 1400 ? 'on:Signed in as Sam:Sam' : 'on:Signed in as Sam:'), 'landing at ' + w + ': the mark ' + (w >= 1400 ? 'shows the first name' : 'is the hat in a ring') + ' (' + await mark(p) + ')');
    ok(!(await L.overflow(p)), 'landing at ' + w + ': no sideways scroll with the mark (' + await L.overflow(p) + ')');
    if (w >= 1280) ok((await brandLines(p)) < 1.6, 'landing at ' + w + ': "Kitchen Book" stays on one line with the mark (' + (await brandLines(p)).toFixed(1) + ' lines)');
    const ring = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.wtop-who')); return cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + Math.round(parseFloat(cs.height)); });
    ok(ring === '2px solid 44', 'landing at ' + w + ': the mark has the same ring as Admin and Settings (' + ring + ')');
    await p.context().close();
  }
  // sign out and in again on the prep list: the mark follows without a reload
  p = await L.open(b, '#/prep', { who: 'sam', wait: 1200 });
  ok((await mark(p)) === 'on:Signed in as Sam:', 'prep list: mark on for Sam (' + await mark(p) + ')');
  await p.click('[data-p="who-change"]');
  await p.waitForTimeout(300);
  ok((await mark(p)) === 'off::', 'prep list: "Not you?" takes the mark off (' + await mark(p) + ')');
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
