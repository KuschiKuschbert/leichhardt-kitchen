// The floating band (4 Nov 2026, docs/loading-feedback-options, design B, LF-03). No signal and Not sent yet slide down
// over the page just under the top bar, instead of a box in the page that pushed the lines down 77 px. Once everything
// is sent the band says All sent with the kitchen time for 3 seconds, then slides away. The update offer uses the same
// band: it moves nothing on the page either (it pushed the page 48 px), and it waits while the signal band is up.
const L = require('./lib');
const { R, ok } = L.results();

// the first row of the list, if it is not the line about to be ticked (a ticked line goes to Done today after 3.5
// seconds). Only rows above any that can wrap keep their place: while the band is up every row keeps room for its
// Not sent mark (as before, 20 Oct 2026), and a row whose words then wrap grows and moves the rows under it once.
const above = (p, t) => p.evaluate(t => { const all = [...document.querySelectorAll('.nb-rows .nb-row')].map(x => x.id); return all.slice(0, 1).filter(id => id !== 'nbr-' + t); }, t || '');
// where the page sits on the screen: the prep root, the list's title, those rows, and the scroll
const lines = (p, ids) => p.evaluate(ids => {
  const top = e => e ? Math.round(e.getBoundingClientRect().top) : null;
  return { root: top(document.getElementById('prep-root')), rows: [top(document.querySelector('.nb-title'))].concat(ids.map(id => top(document.getElementById(id)))), y: Math.round(scrollY) };
}, ids);
// how far they moved between two looks (0: nothing moved; 999: something went missing)
const moved = (a, b) => !a || !b || a.rows.length !== b.rows.length || a.rows.some((t, i) => t == null || b.rows[i] == null) ? 999 : Math.max(Math.abs(a.root - b.root), Math.abs(a.y - b.y), ...a.rows.map((t, i) => Math.abs(t - b.rows[i])));
// a band: whether it is on the screen, its words, how it is placed, and where the top bar ends
const band = (p, sel) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const cs = getComputedStyle(e), r = e.getBoundingClientRect(), top = document.querySelector('#app .wtop'), tb = top ? top.getBoundingClientRect() : null;
  // visible: drawn somewhere on the screen; seen: and below the top bar, where the band belongs
  const visible = !e.closest('[hidden]') && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && r.height > 0 && r.bottom > 1 && r.top < innerHeight;
  const seen = visible && (!tb || r.bottom > tb.bottom + 1);
  // where a band belongs: under the top bar, or under the Functions strip (--fn-stick) once the top bar has scrolled off
  const stick = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fn-stick')) || 0, want = tb ? Math.round(Math.max(stick, tb.bottom)) : null;
  return { seen, visible, text: e.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(), pos: cs.position, top: Math.round(r.top), h: Math.round(r.height), barBottom: tb ? Math.round(tb.bottom) : null, want, role: e.getAttribute('role') };
}, sel);
// the band's words against its own colour (WCAG contrast), for the plain words and the bold first ones
const contrast = (p, sel) => p.evaluate(s => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = c => { const v = rgb(c).slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const e = document.querySelector(s); if (!e) return 0;
  const bg = getComputedStyle(e).backgroundColor, a = rgb(bg)[3];
  if (a !== undefined && a < 1) return 0;   // see-through: the words would depend on what is behind
  const parts = [e].concat([...e.querySelectorAll('strong, span')]);
  return Math.min(...parts.map(x => ratio(getComputedStyle(x).color, bg)));
}, sel);
// the update offer, as when the service worker has saved a new version (more than 8 seconds after opening)
async function offer(p) {
  await p.clock.fastForward(10000);
  await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
  await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 3000).catch(() => {});
  await L.settle(p, 500);
}
const hold = p => p.evaluate(() => { window.__fake.mode = 'hold'; });
const release = p => p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
// the Not sent mark on a row: 'shown' or 'none'
const unsentOn = (p, id) => p.evaluate(i => { const m = document.querySelector('#nbr-' + i + ' .nb-unsent'); return m && m.getBoundingClientRect().width > 0 ? 'shown' : 'none'; }, id);

(async () => {
  const b = await L.start();
  let p = null;
  async function step(n, fn) {
    try { await fn(); } catch (e) { ok(false, 'step ' + n + ' stopped: ' + String(e && e.message || e).split('\n')[0]); }
    if (p) await p.context().close().catch(() => {});
    p = null;
  }

  // 1. a phone: the update offer, a tick with no signal, the signal back, All sent, and the update offer again
  await step('390', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    const ids = await above(p, 'i1'), l0 = await lines(p, ids);
    await offer(p);
    let u = await band(p, '.upd-bar');
    ok(u && u.seen && u.pos === 'fixed', '390: the update offer shows as a band fixed over the page (' + JSON.stringify(u) + ')');
    ok(u && u.barBottom != null && u.want != null && Math.abs(u.top - u.want) <= 1, '390: the update band sits just under the top bar, not over it (' + JSON.stringify(u) + ')');
    ok(moved(l0, await lines(p, ids)) === 0, '390: the update band moves no line (' + moved(l0, await lines(p, ids)) + ' px)');
    ok(/New version available\./.test(u && u.text || '') && /Update now/.test(u && u.text || ''), '390: the update band keeps its words and Update now');

    await hold(p);
    await p.evaluate(() => document.querySelector('#nbr-i1 .nb-box').click());
    await L.settle(p, 300);
    const l1 = await lines(p, ids);
    await p.context().setOffline(true);
    await L.settle(p, 600);
    let s = await band(p, '.p-sync');
    ok(s && s.seen && s.role === 'status' && s.text === 'No signal. Keep the book open: your changes send when the signal is back.', '390, no signal: the band says to keep the book open (' + JSON.stringify(s) + ')');
    ok(s && s.pos === 'fixed' && s.want != null && Math.abs(s.top - s.want) <= 1, '390, no signal: the band is fixed just under the top bar (' + JSON.stringify(s) + ')');
    ok(moved(l1, await lines(p, ids)) === 0, '390, no signal: a prep line\'s top does not move (' + moved(l1, await lines(p, ids)) + ' px)');
    u = await band(p, '.upd-bar');
    ok(u && !u.visible, '390, no signal: the update band waits while the signal band shows (' + JSON.stringify(u) + ')');
    ok(await unsentOn(p, 'i1') === 'shown', '390, no signal: the ticked line still says Not sent');
    ok(await contrast(p, '.p-sync') >= 4.5, '390: the signal band\'s words are 4.5:1 or better on a solid band (' + (await contrast(p, '.p-sync')).toFixed(2) + ')');
    ok(!(await L.overflow(p)), '390, no signal: no sideways scroll');

    // the signal back, the tick still waiting: Not sent yet, then All sent once the server has it
    await p.context().setOffline(false);
    await L.settle(p, 500);
    s = await band(p, '.p-sync');
    ok(s && s.seen && /^Not sent yet\. .*Keep the book open\.$/.test(s.text), '390, signal back, the tick still waiting: Not sent yet (' + JSON.stringify(s) + ')');
    await release(p);
    await L.waitFor(p, () => /All sent/.test((document.querySelector('.p-sync') || {}).textContent || ''), null, 3000).catch(() => {});
    s = await band(p, '.p-sync');
    const hm = await p.evaluate(() => [LK_TIME.clock(LK_TIME.now()), LK_TIME.clock(LK_TIME.now() - 60000)]);
    const said = /^All sent (\d\d:\d\d)\. Everyone can see your changes\.$/.exec(s && s.text || '');
    ok(s && s.seen && said && hm.indexOf(said[1]) >= 0, '390: all sent, the band says All sent with the kitchen time (' + JSON.stringify(s) + ', ' + hm[0] + ')');
    ok(moved(l1, await lines(p, ids)) === 0, '390, All sent: no line moves');
    ok(!!(await band(p, '.upd-bar')) && !(await band(p, '.upd-bar')).visible, '390, All sent: the update band still waits');
    ok(await unsentOn(p, 'i1') === 'none', '390, All sent: Not sent has gone from the line');
    await L.settle(p, 1800);
    s = await band(p, '.p-sync');
    ok(s && s.seen && /^All sent/.test(s.text), '390: All sent stays up for its 3 seconds');
    await L.settle(p, 2200);
    s = await band(p, '.p-sync');
    ok(!s || !s.visible, '390: after 3 seconds All sent slides away (' + JSON.stringify(s) + ')');
    u = await band(p, '.upd-bar');
    ok(u && u.seen && u.want != null && Math.abs(u.top - u.want) <= 1, '390: the update band comes back after (' + JSON.stringify(u) + ')');
    ok(moved(l1, await lines(p, ids)) === 0, '390: the bands came and went and no line moved');
    // put away (4 Nov 2026): a tap on its words puts the update band away until the next page opens
    await p.click('.upd-bar span'); await L.settle(p, 400);
    u = await band(p, '.upd-bar');
    ok(u && !u.visible, '390: a tap on the words puts the update band away (' + JSON.stringify(u) + ')');
    ok(moved(l1, await lines(p, ids)) === 0, '390: putting it away moves no line');
    await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 800);
    u = await band(p, '.upd-bar');
    ok(u && u.visible, '390: the next page brings the update band back (' + JSON.stringify(u) + ')');
    // a swipe up puts it away too; the button still updates
    const ub = await p.evaluate(() => { const r = document.querySelector('.upd-bar span').getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; });
    await p.mouse.move(ub.x, ub.y); await p.mouse.down(); await p.mouse.move(ub.x, ub.y - 20); await p.mouse.move(ub.x, ub.y - 45); await p.mouse.up();
    await L.settle(p, 400);
    u = await band(p, '.upd-bar');
    ok(u && !u.visible, '390: a swipe up puts it away too (' + JSON.stringify(u) + ')');
    ok(p.errors.length === 0, '390: no page errors ' + p.errors.join(' | '));
  });

  // 2. a good signal that is slow: Not sent yet after 3 seconds, over the page, then All sent
  await step('slow', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    const ids = await above(p, 'i2'), l0 = await lines(p, ids);
    await hold(p);
    await p.evaluate(() => document.querySelector('#nbr-i2 .nb-box').click());
    await L.settle(p, 500);
    ok(!((await band(p, '.p-sync')) || {}).visible, 'slow: no band in the first 3 seconds');
    await L.settle(p, 3200);
    const s = await band(p, '.p-sync');
    ok(s && s.seen && /^Not sent yet\./.test(s.text), 'slow: after 3 seconds the band says Not sent yet (' + JSON.stringify(s) + ')');
    ok(moved(l0, await lines(p, ids)) === 0, 'slow: Not sent yet moves no line (' + moved(l0, await lines(p, ids)) + ' px)');
    await release(p);
    await L.settle(p, 500);
    ok(/^All sent \d\d:\d\d\./.test(((await band(p, '.p-sync')) || {}).text || ''), 'slow: once sent, All sent');
    ok(p.errors.length === 0, 'slow: no page errors ' + p.errors.join(' | '));
  });

  // 3. a tablet and a laptop: the same band, scrolled too (it follows the top bar off the screen and stays at the top)
  for (const [w, h] of [[768, 1024], [1280, 800]]) {
    await step(String(w), async () => {
      p = await L.open(b, '#/prep', { width: w, height: h, wait: 1500 });
      const ids = await above(p), l0 = await lines(p, ids);
      await p.context().setOffline(true);
      await L.settle(p, 600);
      const s = await band(p, '.p-sync');
      ok(s && s.seen && s.pos === 'fixed' && s.want != null && Math.abs(s.top - s.want) <= 1, w + ', no signal: the band just under the top bar (' + JSON.stringify(s) + ')');
      ok(moved(l0, await lines(p, ids)) === 0, w + ', no signal: no line moves (' + moved(l0, await lines(p, ids)) + ' px)');
      ok(!(await L.overflow(p)), w + ', no signal: no sideways scroll');
      ok(await contrast(p, '.p-sync') >= 4.5, w + ': the band\'s words are 4.5:1 or better');
      await p.evaluate(() => window.scrollTo(0, 400));
      await L.settle(p, 300);
      const s2 = await band(p, '.p-sync');
      ok(s2 && s2.seen && Math.abs(s2.top - s2.want) <= 1, w + ', scrolled: the band stays under the top bar, or at the top of the screen once it has gone (' + JSON.stringify(s2) + ')');
      await p.context().setOffline(false);
      await L.settle(p, 600);
      const s3 = await band(p, '.p-sync');
      ok(!s3 || !s3.visible, w + ', signal back with nothing waiting: the band goes, no All sent (' + JSON.stringify(s3) + ')');
      ok(p.errors.length === 0, w + ': no page errors ' + p.errors.join(' | '));
    });
  }

  // 4. Reduce motion: no slide. Print: no band.
  await step('motion and print', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await offer(p);
    await p.context().setOffline(true);
    await L.settle(p, 300);
    const still = await p.evaluate(() => ['.p-sync', '.upd-bar'].map(s => { const e = document.querySelector(s); if (!e) return 'none'; const cs = getComputedStyle(e); return cs.transitionDuration.split(',').every(d => parseFloat(d) === 0) && cs.animationName === 'none' ? 'still' : 'moves'; }));
    ok(still[0] === 'still' && still[1] === 'still', 'Reduce motion: neither band slides (' + still.join(', ') + ')');
    await p.emulateMedia({ media: 'print' });
    const printed = await p.evaluate(() => ['.p-sync', '.upd-bar'].map(s => { const e = document.querySelector(s); return !e || getComputedStyle(e).display === 'none'; }));
    ok(printed[0] && printed[1], 'print: neither band prints (' + printed.join(', ') + ')');
    await p.emulateMedia({ media: 'screen' });
    await p.context().setOffline(false);
    ok(p.errors.length === 0, 'motion and print: no page errors ' + p.errors.join(' | '));
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
