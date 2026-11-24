// The loading card's words and long wait (head chef, 24 Nov 2026, docs/loading-wait-options/brief.md). The roster and
// the kitchen settings are held back so the card stays up: it names the step, its rows breathe together from 1.5 s,
// carrying the breath on through a redraw, and past 8 s it says it is still waiting, with the rows at rest. Reduce
// motion keeps the words and stops the breathing. The test clock moves the time; synthetic data only.
const fs = require('fs');
const L = require('./lib');
const { R, ok } = L.results();

(async () => {
  const b = await L.start();
  try {
    const sdk = fs.readFileSync(__dirname + '/fake/firebase-firestore.js', 'utf8');
    const sub = '  const s = { ref, next, error: err, last: null, cold: cold(ref) };', del = 'function deliver(s) {';
    if (!sdk.includes(sub) || !sdk.includes(del)) throw new Error('The fixture must be able to hold the roster and the settings');
    // window.__hold names the documents to hold (a regex source); window.__let(source) lets the matching ones answer
    const held = sdk.replace(sub, sub + '\n  if (window.__hold && new RegExp(window.__hold).test(ref.path.join("/"))) { s.held = true; (window.__held = window.__held || []).push(s); }')
      .replace(del, del + '\n  if (s.held) return;') + '\nwindow.__let = src => (window.__held || []).forEach(s => { if (s.held && new RegExp(src).test(s.ref.path.join("/"))) { s.held = false; if (subs.has(s)) deliver(s); } });\n';
    // the card as it first showed, before the opening helper's own waits
    const init = 'window.__hold = "(login/roster|config/main)$"; new MutationObserver(function () { var c = document.querySelector("[data-wait]"); if (c && !window.__first) window.__first = { words: (c.querySelector(".ink-status") || {}).textContent || "", breathing: !!c.querySelector(".ink-skeleton.is-breathing") }; }).observe(document, { childList: true, subtree: true });';
    const card = p => p.evaluate(() => {
      const c = document.querySelector('[data-wait]'), sk = c && c.querySelector('.ink-skeleton');
      const box = sk && sk.querySelector('.ink-skeleton-box');
      return c ? { words: (c.querySelector('.ink-status') || {}).textContent || '', breathing: !!(sk && sk.classList.contains('is-breathing')),
        phase: sk ? parseFloat(sk.style.getPropertyValue('--ink-phase')) : NaN, anim: box ? getComputedStyle(box).animationName : '',
        icon: (c.querySelector('.ink-status .ink-icon') || { dataset: {} }).dataset.state || '', statuses: c.querySelectorAll('[role="status"]').length, at: Date.now() } : null;
    });

    let p = await L.open(b, '#/prep', { who: 'sam', wait: 100, fakeSDK: { 'firebase-firestore.js': held }, init });
    await L.waitFor(p, () => !!document.querySelector('[data-wait]'), null, 5000).catch(() => {});
    let c = await p.evaluate(() => window.__first);
    ok(!!c && /Connecting to the kitchen book/.test(c.words) && !c.breathing, 'first: the card says it is connecting, the rows still ' + JSON.stringify(c));
    await p.clock.runFor(1600);
    await L.waitFor(p, () => !!document.querySelector('[data-wait] .ink-skeleton.is-breathing'), null, 3000).catch(() => {});
    const c1 = await card(p);
    ok(!!c1 && c1.breathing && c1.anim === 'ink-breathe-box' && c1.phase < -1.3 && c1.phase > -1.8, 'past 1.5 s: the rows breathe together, from where the wait began ' + JSON.stringify(c1));
    await p.clock.runFor(450);
    await p.evaluate(() => window.__let('login/roster$'));   // the roster answers: the sign-in carries on and the card is drawn again
    await L.waitFor(p, () => /Getting today/.test((document.querySelector('[data-wait] .ink-status') || {}).textContent || ''), null, 5000).catch(() => {});
    const c2 = await card(p);
    ok(!!c2 && /Getting today's prep list/.test(c2.words), 'then: it names the page\'s own list while the settings come ' + JSON.stringify(c2 && c2.words));
    // started again, the rows would rest for another 1.5 s and the 8 s line below would come about 2 s late
    ok(!!c2 && c2.breathing && c2.phase <= 0 && c2.phase > -1.8, 'a redraw carries the breath on instead of starting it again (phase ' + (c2 && c2.phase) + ')');
    await p.clock.runFor(6200);
    await L.waitFor(p, () => /Still waiting/.test((document.querySelector('[data-wait] .ink-status') || {}).textContent || ''), null, 3000).catch(() => {});
    const c3 = await card(p);
    ok(!!c3 && /Still waiting for an answer from the kitchen book\./.test(c3.words) && /You can use the recipes while you wait\./.test(c3.words), 'past 8 s: it says it is still waiting, and that the recipes work meanwhile ' + JSON.stringify(c3 && c3.words));
    ok(!!c3 && !c3.breathing && c3.icon === 'still' && c3.statuses === 1, 'past 8 s: the rows and the icon rest, one status line ' + JSON.stringify(c3));
    await p.evaluate(() => window.__let('config/main$'));
    await L.waitFor(p, () => [...document.querySelectorAll('.nb-row')].some(r => /Slice onions/.test(r.textContent)), null, 5000).catch(() => {});
    ok(await p.evaluate(() => !document.querySelector('[data-wait]') && [...document.querySelectorAll('.nb-row')].some(r => /Slice onions/.test(r.textContent))), 'the list replaces the card once the settings are in');
    ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
    await p.context().close();

    // reduce motion: the words still change, nothing breathes
    p = await L.open(b, '#/orders', { who: 'sam', wait: 100, fakeSDK: { 'firebase-firestore.js': held }, init });
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.clock.runFor(1600);
    await p.evaluate(() => window.__let('login/roster$'));
    await L.waitFor(p, () => /Getting today/.test((document.querySelector('[data-wait] .ink-status') || {}).textContent || ''), null, 5000).catch(() => {});
    c = await card(p);
    ok(!!c && /Getting today's order list/.test(c.words) && c.anim === 'none', 'reduce motion: the words name the order list and the rows do not move ' + JSON.stringify(c));
    ok(p.errors.length === 0, 'reduce motion: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  } catch (e) { console.error(e); process.exit(1); }
  await b.close();
  L.report(R);
})();
