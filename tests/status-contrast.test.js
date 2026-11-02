// Measure the actual text pairings, including warning links and focus rings, rather than checking a token's spelling.
const L = require('./lib'), { R, ok } = L.results();
async function pair(p, selector, outline) {
  return p.locator(selector).first().evaluate((e, outline) => {
    const rgba = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = s => rgba(s).slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0);
    const st = getComputedStyle(e); let bg = outline ? e.parentElement : e, layers = [], composed = [255, 255, 255];
    while (bg) { layers.unshift(rgba(getComputedStyle(bg).backgroundColor)); bg = bg.parentElement; }
    layers.forEach(c => { const alpha = c.length > 3 ? c[3] : 1; composed = composed.map((n, i) => c[i] * alpha + n * (1 - alpha)); });
    const foreground = outline ? st.outlineColor : st.color, background = 'rgb(' + composed.join(', ') + ')';
    const a = lum(foreground), b = lum(background);
    return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), foreground, background, outline: st.outlineStyle, width: parseFloat(st.outlineWidth) };
  }, outline);
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    let p = await L.open(b, '#/r/corn', { width, wait: 1400 });
    const safety = await pair(p, '.box.safety > div');
    ok(safety.ratio >= 4.5, width + ': normal safety text passes 4.5:1 (' + safety.ratio.toFixed(3) + ')');
    ok(!p.errors.length && !await L.overflow(p), width + ': safety card has no page errors or overflow');
    await p.context().close();

    p = await L.open(b, '#/recipes', { width, settings: { view: 'tiles' }, wait: 1400 });
    const finished = await pair(p, '.done-tag');
    ok(finished.ratio >= 4.5, width + ': small Finished text passes 4.5:1 (' + finished.ratio.toFixed(3) + ')');
    // These existing status classes share successful/complete meaning without changing green selection controls.
    await p.evaluate(() => {
      const host = document.createElement('section'); host.id = 'contrast-status-samples'; host.style.background = 'var(--paper)';
      host.innerHTML = '<span class="ml-st st-done">Done</span><span class="dr-eb">Your PIN is set</span><span class="dr-tick">✓</span><span class="fnn-on">On the list</span><ul class="cut-tl"><li class="is-done"><span class="cut-st">Done</span></li></ul><span class="mn-yours">Yours</span><span class="adm-n">2</span><span class="nb-tab-n">6</span>';
      document.body.appendChild(host);
    });
    for (const selector of ['.ml-st.st-done', '.dr-eb', '.dr-tick', '.fnn-on', '.cut-st', '.mn-yours', '.adm-n', '.nb-tab-n']) {
      const status = await pair(p, '#contrast-status-samples ' + selector);
      ok(status.ratio >= 4.5, width + ': ' + selector + ' retains readable status text (' + status.ratio.toFixed(3) + ')');
    }
    ok(!p.errors.length, width + ': Finished and status samples have no browser errors');
    await p.context().close();

    p = await L.open(b, '#/manage/new/beer-batter', { width, admin: true, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#mg-name'));
    await p.click('[data-mg="save"]'); await L.waitFor(p, () => !!document.querySelector('.mg-errs a'));
    const warning = await pair(p, '.warn .label'), link = await pair(p, '.mg-errs a');
    ok(warning.ratio >= 4.5 && link.ratio >= 4.5, width + ': recipe validation heading and correction links pass text contrast (' + warning.ratio.toFixed(3) + ', ' + link.ratio.toFixed(3) + ')');
    await p.focus('.mg-errs a'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
    const focus = await pair(p, '.mg-errs a', true);
    ok(focus.ratio >= 3 && focus.outline !== 'none' && focus.width >= 2, width + ': keyboard correction link has a contrasting visible focus ring (' + focus.ratio.toFixed(3) + ')');
    ok(!p.errors.length && !await L.overflow(p), width + ': validation warning retains layout without browser errors');
    await p.context().close();

    p = await L.open(b, '#/prep', { width, who: 'ann', failReads: 'directnotes', wait: 1500 });
    if (!await p.$('.nt')) await p.click('.nbell');
    await L.waitFor(p, () => !!document.querySelector('.nt .warn [data-note="refresh"]'));
    const refresh = await pair(p, '.nt .warn [data-note="refresh"]');
    ok(refresh.ratio >= 4.5, width + ': failed-ping Refresh keeps readable secondary-button words (' + refresh.ratio.toFixed(3) + ')');
    await p.focus('.nt .warn [data-note="refresh"]'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
    const refreshFocus = await pair(p, '.nt .warn [data-note="refresh"]', true);
    ok(refreshFocus.ratio >= 3 && refreshFocus.outline !== 'none' && refreshFocus.width >= 2, width + ': failed-ping Refresh retains a visible keyboard ring (' + refreshFocus.ratio.toFixed(3) + ')');
    ok(!p.errors.length && !await L.overflow(p), width + ': failed-ping recovery warning fits without browser errors');
    await p.keyboard.press('Escape');
    await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
    await L.waitFor(p, () => !!document.querySelector('.upd-bar button'));
    const update = await pair(p, '.upd-bar button');
    ok(update.ratio >= 4.5, width + ': Update now uses readable action text (' + update.ratio.toFixed(3) + ')');
    await p.focus('.upd-bar button'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
    const updateFocus = await pair(p, '.upd-bar button', true);
    ok(updateFocus.ratio >= 3 && updateFocus.outline !== 'none' && updateFocus.width >= 2, width + ': Update now focus contrasts with its translucent strip (' + updateFocus.ratio.toFixed(3) + ')');
    ok(!p.errors.length && !await L.overflow(p), width + ': update strip keeps its layout without browser errors');
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
