/* Seasonal decorations run on the real book with the Firebase stand-in. Work pages keep every
   moving decoration inside the header, and changing a theme must never redraw a typed kitchen line. */
const L = require('./lib');
const { R, ok } = L.results();
const CUP_CLOCK = Date.parse('2026-11-03T04:00:00Z');

async function ready(p) {
  await L.waitFor(p, () => Boolean(window.KB_SEASONAL && window.KB_EFFECTS && window.KB_THEME_BRIDGE), null, 8000);
}
async function theme(p, selection, motion = 'gentle') {
  await p.evaluate(value => window.KB_SEASONAL.configure(value), { selection, motion, density: 'festive' });
  await L.waitFor(p, value => document.querySelector('#app')?.dataset.kbTheme === value, selection === 'off' ? 'off' : selection);
  // Both the DOM handoff and the CSS animations start on animation frames.
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function go(p, hash) {
  await p.evaluate(value => { location.hash = value; }, hash);
  await L.waitFor(p, value => location.hash === value && document.querySelector('#app')?.dataset.kbCelebrationSurface === (value === '#/' ? 'home' : 'work'), hash);
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function navFacts(p) {
  // Work pages (3 Nov 2026): Kitchen Book and the chef hat stay, a stamp sits beside the name, a still edge runs along the bar.
  return p.evaluate(() => {
    const header = document.querySelector('.wtop'), edge = header?.querySelector('.kb-nav-edge'), stamp = header?.querySelector('.kb-occasion-stamp');
    const bounds = header?.getBoundingClientRect(), e = edge?.getBoundingClientRect(), st = stamp?.getBoundingClientRect();
    const name = document.querySelector('.wtop-brand b');
    return {
      state: KB_EFFECTS.status(), edges: document.querySelectorAll('.kb-nav-edge').length, stamps: document.querySelectorAll('.kb-occasion-stamp').length,
      brand: document.querySelectorAll('.wtop-brand').length, nameText: name?.textContent || '',
      hat: Boolean(document.querySelector('.wtop-who svg')) && !document.querySelector('.wtop-who .kb-brand-art'),
      inside: Boolean(bounds && e && e.top >= bounds.top - 1 && e.bottom <= bounds.bottom + 1 && e.left >= bounds.left - 1 && e.right <= bounds.right + 1 && getComputedStyle(edge).pointerEvents === 'none'),
      stampTarget: st ? Math.min(st.width, st.height) : 0, stampHasArt: Boolean(stamp?.querySelector('svg')),
      moving: header ? header.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a.effect?.target?.closest?.('.kb-nav-edge')).length : 0,
      oldParts: document.querySelectorAll('.kb-nav-festive-effects,.kb-navbar-particle,.kb-occasion-title').length,
      viewportParticles: document.querySelectorAll('#kb-festive-effects .complete-particle,#kb-festive-effects .kb-ambient-horizon').length,
      infoButtons: document.querySelectorAll('.wtop-icons .kb-occasion-trigger').length,
      edgeMotif: edge?.dataset.edgeMotif || ''
    };
  });
}

async function heavyMotion(p) {
  // A filter or shadow animation repaints the drawing every frame. On Diwali that took 469 ms
  // of every second on a slowed phone, against 13 ms for the same page without it.
  return p.evaluate(() => document.getAnimations().filter(a => {
    const t = a.effect && a.effect.target;
    if (!(t instanceof Element) || !t.closest('.wtop,#kb-festive-effects,.kb-season-note')) return false;
    return a.effect.getKeyframes().some(k => 'filter' in k || 'boxShadow' in k) || getComputedStyle(t).filter !== 'none';
  }).map(a => a.animationName || 'animation'));
}

async function hangClear(p) {
  // Anchored ornaments must not sit on the Home heading or the date (they used to float over both).
  return p.evaluate(() => {
    const items = [...document.querySelectorAll('#app .wall-main > .kb-hang .kb-hang-item')];
    const text = [...document.querySelectorAll('#app .wall-h,#app .wall-date')].map(n => { const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect(); });
    const hit = items.some(i => { const a = i.getBoundingClientRect(); return text.some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top); });
    return { count: items.length, hit };
  });
}

async function movingPieces(p) {
  // One moving piece is a particle, a hanging ornament, a horizon or the board drawing, with whatever moves inside it.
  return p.evaluate(() => {
    const pieces = new Set();
    document.getAnimations().forEach(a => {
      if (a.playState !== 'running' || !(a instanceof CSSAnimation)) return;
      const t = a.effect && a.effect.target;
      const piece = t instanceof Element && t.closest('.complete-particle,.kb-hang-item,.kb-ambient-horizon,.kb-season-note');
      if (piece) pieces.add(piece);
    });
    return pieces.size;
  });
}
async function cpuPerSecond(p, ms = 2000) {
  // Main-thread work per second with the CPU slowed 4 times, the way the audit measured it.
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const read = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'TaskDuration').value;
  const a = await read(); await L.sleep(ms); const z = await read();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.detach();
  return (z - a) * 1000 / (ms / 1000);
}

(async () => {
  const b = await L.start();
  let p;
  try {
    p = await L.open(b, '#/', { clock: CUP_CLOCK, wait: 1600, seasonal: { selection: 'auto', motion: 'gentle', density: 'festive' } });
    await ready(p);
    await L.waitFor(p, () => document.querySelector('#app')?.dataset.kbTheme === 'au-melbourne-cup');
    ok(await p.locator('[data-kb-season="au-melbourne-cup"]').count() === 1, 'Automatic activates Melbourne Cup on the kitchen date');
    // Coming up: the next celebrations in 7 days, from the offline calendar, above the dockets.
    await L.waitFor(p, () => Boolean(document.querySelector('[data-kb-coming]')));
    ok(await p.evaluate(() => {
      const line = document.querySelector('[data-kb-coming]');
      return /Tihar, Saturday/.test(line.textContent) && /Diwali \/ Deepavali, Sunday/.test(line.textContent) && line.querySelectorAll('.kb-stamp').length === 2 && line.nextElementSibling === document.querySelector('.wall-main .dockets');
    }), 'Home says what is coming up: Tihar on Saturday and Diwali on Sunday, with their stamps');
    ok(await p.evaluate(() => KB_EFFECTS.status().scope === 'page' && KB_EFFECTS.status().ambientCount > 0), 'Home has the active festival ambience');
    ok(await p.evaluate(() => KB_EFFECTS.status().ambientPreset === 'horses'), 'Melbourne Cup uses horses rather than generic confetti');
    ok(!(await L.overflow(p)), 'festive Home fits on a phone');
    ok(await p.evaluate(() => Boolean(document.querySelector('.wtop-who svg')) && !document.querySelector('.wtop-who .kb-brand-art')), 'the chef hat stays the chef hat during a celebration');
    ok(await p.evaluate(() => {
      const fx = getComputedStyle(document.querySelector('#kb-festive-effects')), main = getComputedStyle(document.querySelector('#app .wall-main'));
      return fx.zIndex === '0' && main.position === 'relative' && main.zIndex === '1';
    }), 'Home motifs sit behind the board and the dockets');
    for (const width of [390, 1280]) {
      await p.setViewportSize({ width, height: 844 });
      for (const id of ['in-diwali', 'np-tihar', 'ph-lunar-new-year', 'bali-galungan']) {
        await theme(p, id);
        const hang = await hangClear(p);
        ok(hang.count > 0 && !hang.hit, width + ' ' + id + ': its ornaments hang beside the heading, clear of the words');
      }
    }
    await p.setViewportSize({ width: 390, height: 844 });
    // Quiet days: reflective and civic designs show their drawing and stamp, with no motifs.
    await theme(p, 'bali-nyepi'); await p.clock.runFor(5000);
    ok(await p.evaluate(() => KB_EFFECTS.status().quiet && !document.querySelector('#kb-festive-effects .complete-particle,.kb-hang-item')) && await movingPieces(p) === 0, 'Nyepi stays quiet on Home: drawing only, nothing moving');
    ok(await p.locator('[data-kb-coming]').count() === 0, 'a celebration chosen by hand does not show Coming up');
    // Arrive, then settle: Replay plays the full arrival, then Home rests with at most 4 slow pieces.
    await theme(p, 'au-christmas-day');
    await p.evaluate(() => KB_EFFECTS.replay());
    await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    ok(await p.evaluate(() => KB_EFFECTS.status().phase === 'arrival') && await movingPieces(p) > 4, 'Replay plays the full Christmas arrival on Home');
    await p.clock.runFor(5000);
    await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    ok(await p.evaluate(() => KB_EFFECTS.status().phase === 'rest') && await movingPieces(p) <= 4, 'after about 4 seconds Home settles to at most 4 moving pieces');
    await go(p, '#/recipes'); await go(p, '#/');
    ok(await p.evaluate(() => KB_EFFECTS.status().phase === 'rest'), 'coming back to Home the same day opens at rest, with no second arrival');
    for (const id of ['au-christmas-day', 'in-diwali', 'au-melbourne-cup']) {
      await theme(p, id); await p.clock.runFor(5000);
      const ms = await cpuPerSecond(p);
      ok(ms < 60, id + ': Home at rest takes ' + Math.round(ms) + ' ms of main thread a second on a slowed phone (under 60)');
    }

    await theme(p, 'au-christmas-day');
    ok(await p.locator('.kb-season-note').count() === 1 && await p.locator('.wtop-brand').count() === 1, 'Christmas Home keeps Kitchen Book branding and one explanation board');
    ok(await p.evaluate(() => KB_EFFECTS.status().ambientPreset === 'snow' && KB_EFFECTS.status().ambientCount > 0), 'Christmas snow moves across Home');
    await go(p, '#/recipes');
    let facts = await navFacts(p);
    ok(facts.brand === 1 && facts.nameText === 'Kitchen Book' && facts.hat, 'work pages keep Kitchen Book and the chef hat');
    ok(facts.stamps === 1 && facts.stampHasArt && facts.stampTarget >= 44 && facts.infoButtons === 0, 'one 44 px celebration stamp sits beside the name, with no extra button in the top bar');
    ok(facts.edges === 1 && facts.inside && facts.moving === 0 && facts.oldParts === 0 && facts.viewportParticles === 0, 'a still festive edge runs inside the top bar and nothing moves behind the name or buttons');
    ok(await p.locator('.kb-season-note,#kb-occasion-panel').count() === 0, 'work content starts without the explanation in its way');
    ok(await p.evaluate(() => Boolean(document.querySelector('.wtop-who svg')) && !document.querySelector('.wtop-who .kb-brand-art')), 'the chef hat stays the chef hat on work pages');
    ok(await p.evaluate(() => KB_CELEBRATION_TICKER.status().timerCount === 0), 'closed work explanation has no language timer');

    await p.click('.kb-occasion-stamp');
    await L.waitFor(p, () => KB_CELEBRATION_TICKER.status().fontsReady);
    ok(await p.locator('#kb-occasion-panel').count() === 1 && await p.locator('.kb-occasion-stamp').getAttribute('aria-expanded') === 'true', 'the stamp opens the celebration explanation');
    ok(await p.locator('#kb-occasion-panel a[href="#/"]').count() === 1, 'explanation has a clear Kitchen Book home link');
    ok(await p.evaluate(() => JSON.stringify(KB_CELEBRATION_TICKER.status().availableLocales) === JSON.stringify(['en', 'fil', 'ban', 'ne', 'hi', 'de'])), 'explanation includes all six requested languages in order');
    ok(await p.locator('.kb-ticker-picker,.kb-ticker-select,[data-ticker-language],select[name="language"]').count() === 0, 'there is no language picker');
    await p.evaluate(() => KB_EFFECTS.pause(true));
    await L.waitFor(p, () => KB_CELEBRATION_TICKER.status().state === 'hidden' && KB_CELEBRATION_TICKER.status().timerCount === 0);
    ok(await p.evaluate(() => KB_EFFECTS.status().state === 'paused' && KB_CELEBRATION_TICKER.status().state === 'hidden' && KB_CELEBRATION_TICKER.status().timerCount === 0), 'ambient pause also pauses the explanation scheduler');
    await p.evaluate(() => KB_EFFECTS.pause(false));
    const heights = [], languages = [];
    for (let i = 0; i < 6; i++) {
      languages.push(await p.locator('.kb-ticker-line[aria-hidden="false"]').getAttribute('lang'));
      heights.push(await p.locator('.kb-ticker-texts').evaluate(node => node.getBoundingClientRect().height));
      await p.evaluate(() => KB_CELEBRATION_TICKER.next());
      await p.clock.runFor(650);
    }
    ok(new Set(languages).size === 6, 'every requested language has a visible properly labelled sentence');
    ok(Math.max(...heights) - Math.min(...heights) < 1, 'language transitions reserve a stable explanation height');
    ok(await p.locator('.kb-ticker-line[aria-hidden="false"]').count() === 1 && await p.locator('.kb-ticker-sizer[aria-hidden="true"][inert]').count() === 6, 'only one sentence is exposed to assistive technology');

    // Exercise the real dwell timer, rather than only the manual advance hook.
    const automaticBefore = await p.evaluate(() => KB_CELEBRATION_TICKER.status().automaticCycleCount);
    await p.clock.runFor(18000);
    ok(await p.evaluate(before => KB_CELEBRATION_TICKER.status().automaticCycleCount > before, automaticBefore), 'languages advance automatically without a picker');
    ok(await p.locator('.kb-celebration-ticker button,.kb-ticker-controls').count() === 0, 'the automatic explanation has no pause button or empty controls row');
    await p.keyboard.press('Escape');
    ok(await p.locator('#kb-occasion-panel').count() === 0 && await p.locator('.kb-occasion-stamp').evaluate(node => document.activeElement === node), 'Escape closes explanation and restores focus to the stamp');
    ok(await p.evaluate(() => KB_CELEBRATION_TICKER.status().timerCount === 0), 'closing explanation releases its timer');

    await p.click('.kb-occasion-stamp');
    await p.click('#kb-occasion-panel .kb-occasion-home');
    await L.waitFor(p, () => location.hash === '#/' && Boolean(document.querySelector('[data-kb-season="au-christmas-day"]')) && KB_CELEBRATION_TICKER.status().surface === 'home');
    ok(await p.evaluate(() => document.activeElement?.id === 'rtitle' && !document.querySelector('#kb-occasion-panel') && KB_CELEBRATION_TICKER.status().activeInstances === 1), 'the explanation Home link closes its modal and focuses the new Home heading');
    await go(p, '#/recipes');
    ok(await p.evaluate(() => KB_CELEBRATION_TICKER.status().activeInstances === 0 && KB_CELEBRATION_TICKER.status().timerCount === 0), 'returning to work leaves no Home or work explanation scheduler behind');

    // The 36 main families and their three calendar companions: every design in the catalogue, and nothing else (4 Nov 2026).
    const coverage = await p.evaluate(() => KB_EFFECTS.coverage().map(item => item.id));
    ok(await p.evaluate(ids => ids.length === KB_COMPLETE_ART.length && KB_COMPLETE_ART.every(t => ids.includes(t.id)), coverage), 'every calendar design has an ambient preset, and no preset is left for a design that is gone');
    ok(await p.evaluate(() => {
      const locales = ['en', 'fil', 'ban', 'ne', 'hi', 'de'];
      return KB_COMPLETE_ART.length === 39 && Object.keys(KB_CELEBRATION_COPY.events).length === 39 && KB_COMPLETE_ART.every(item => locales.every(code => typeof KB_CELEBRATION_COPY.events[item.id]?.[code] === 'string' && KB_CELEBRATION_COPY.events[item.id][code].trim()));
    }), 'all 39 calendar designs have complete sentences in all six languages, and no copy for designs that are gone');
    // Stamps: every main festival and companion has one, and each is plain static SVG.
    ok(await p.evaluate(ids => ids.length === 39 && ids.every(id => window.KB_STAMPS?.has(id)), coverage), 'every celebration has a stamp and its own motion preset (' + coverage.length + ')');
    ok(await p.evaluate(ids => ids.filter(id => window.KB_STAMPS?.has(id)).every(id => {
      const doc = new DOMParser().parseFromString(KB_STAMPS.svg(id), 'image/svg+xml'), root = doc.documentElement;
      return !doc.querySelector('parsererror') && root.getAttribute('viewBox') === '0 0 32 32' && !doc.querySelector('[id],script,foreignObject,image');
    }), coverage), 'stamps are plain 32 px SVG with no ids, scripts or images');
    ok(await p.evaluate(() => ['in-navaratri', 'au-mothers-day', 'in-holi'].every(id => {
      const item = KB_COMPLETE_ART.find(t => t.id === id);
      return item.icon.includes('data-kb-redrawn') && !/crossed|pichkari/i.test(item.motif);
    })), 'Navaratri, Mother\u2019s Day and Holi use the redrawn marks with no red cross or syringe');
    for (const id of coverage) {
      await theme(p, id);
      facts = await navFacts(p);
      // Reflective and civic days (Nyepi, Buddha Jayanti, Independence Day) have the stamp and no edge.
      const quiet = facts.state.quiet;
      ok((quiet ? facts.edges === 0 : facts.edges === 1 && facts.inside && Boolean(facts.state.edgePreset)) && facts.moving === 0 && facts.stamps === 1 && facts.brand === 1 && facts.viewportParticles === 0, id + ': Kitchen Book, a stamp and ' + (quiet ? 'no edge' : 'a still edge') + ', with no body particles');
    }

    // Glow and steam days, and Star Wars Day's blades, on a work page and on Home.
    const glowDays = ['in-diwali', 'fun-halloween', 'fun-star-wars-day', 'in-pongal', 'ph-eid-al-fitr', 'au-christmas-eve'];
    for (const id of glowDays) {
      await theme(p, id);
      const heavy = await heavyMotion(p);
      ok(heavy.length === 0, id + ': work header moves only transform and opacity ' + heavy.join(' '));
    }
    await go(p, '#/');
    for (const id of glowDays) {
      await theme(p, id);
      const heavy = await heavyMotion(p);
      ok(heavy.length === 0, id + ': Home moves only transform and opacity ' + heavy.join(' '));
    }
    await go(p, '#/recipes');

    await go(p, '#/');
    for (const id of coverage) {
      await theme(p, id); await p.clock.runFor(5000);
      // A busy runner can start the arrival late: give it the rest of its time, then count (4 Nov 2026).
      for (let i = 0; i < 5 && await p.evaluate(() => KB_EFFECTS.status().phase === 'arrival'); i++) await p.clock.runFor(1000);
      const pieces = await movingPieces(p), heavy = await heavyMotion(p), phase = await p.evaluate(() => KB_EFFECTS.status().phase);
      ok(pieces <= 4 && heavy.length === 0, id + ': Home at rest moves ' + pieces + ' pieces, only transform and opacity' + (pieces <= 4 ? '' : ' (phase ' + phase + ')'));
    }
    await go(p, '#/recipes');

    for (const [id, motif] of [['in-diwali', 'flame'], ['np-tihar', 'marigold'], ['bali-kuningan', 'tamiang'], ['ph-lunar-new-year', 'lantern'], ['au-melbourne-cup', 'horses'], ['au-christmas-day', 'snow']]) {
      await theme(p, id);
      facts = await navFacts(p);
      ok(facts.edgeMotif === motif, id + ': the edge repeats the festival\u2019s own motif (' + facts.edgeMotif + ')');
    }

    await theme(p, 'fun-st-patricks-day');
    ok(await p.evaluate(() => {
      const leaves = [...document.querySelectorAll('.kb-occasion-stamp .kb-stamp path')].filter(path => getComputedStyle(path).fill === 'rgb(46, 139, 87)');
      return leaves.length >= 4;
    }), 'St Patrick\u2019s Day keeps its four green leaves in the stamp');

    await go(p, '#/prep');
    await p.fill('#p-text', 'Keep this seasonal draft');
    await p.locator('#p-text').focus();
    await p.locator('#p-text').evaluate(node => node.setSelectionRange(5, 9));
    const originalInput = await p.locator('#p-text').elementHandle();
    await theme(p, 'in-diwali');
    await p.clock.runFor(1000);
    ok(await originalInput.evaluate(node => node.isConnected && document.activeElement === node && node.value === 'Keep this seasonal draft' && node.selectionStart === 5 && node.selectionEnd === 9), 'changing themes retains the exact prep input, draft, focus and selection');
    for (const route of ['#/orders', '#/waste', '#/transfers', '#/guides', '#/r/pork-belly', '#/settings']) {
      await go(p, route);
      // Each page draws a new top bar and the stamp joins it on the bridge's next frame, which a busy runner can delay:
      // go() alone does not wait for it, as the surface was already work (4 Nov 2026).
      await L.waitFor(p, () => document.querySelectorAll('#app .wtop .kb-occasion-stamp').length === 1, null, 3000).catch(() => {});
      facts = await navFacts(p);
      const still = facts.inside && facts.viewportParticles === 0 && facts.edges === 1 && facts.stamps === 1 && facts.brand === 1 && facts.moving === 0;
      // A failure says which part, so a run on another browser can be read without a rerun.
      const why = still ? null : await p.evaluate(() => ({ bridge: KB_THEME_BRIDGE.status(), bars: document.querySelectorAll('.wtop').length, starts: document.querySelectorAll('.wtop-start').length, hash: location.hash }));
      ok(still, route + ': Kitchen Book, the stamp and a still edge' + (still ? '' : ' ' + JSON.stringify({ inside: facts.inside, particles: facts.viewportParticles, edges: facts.edges, stamps: facts.stamps, brand: facts.brand, moving: facts.moving, why })));
    }

    for (const width of [390, 768, 1280]) {
      await p.setViewportSize({ width, height: 844 });
      await theme(p, 'ph-lunar-new-year');
      const bar = await p.evaluate(() => document.querySelector('.wtop').getBoundingClientRect().height);
      await theme(p, 'off');
      const plain = await p.evaluate(() => document.querySelector('.wtop').getBoundingClientRect().height);
      await theme(p, 'ph-lunar-new-year');
      ok(!(await L.overflow(p)), width + ': the stamp fits without sideways scroll');
      facts = await navFacts(p);
      ok(facts.inside && facts.edges === 1 && Math.abs(bar - plain) < 1, width + ': the top bar keeps its height (' + Math.round(bar) + ' px) with a celebration on');
    }

    await go(p, '#/settings');
    await L.waitFor(p, () => Boolean(document.querySelector('#kb-seasonal-settings [data-seasonal-selection="auto"]')));
    await L.setRow(p, 'season');
    await p.click('[data-seasonal-selection="auto"]');
    await L.waitFor(p, () => document.querySelector('#app').dataset.kbTheme === 'au-melbourne-cup');
    ok(await p.locator('[data-seasonal-selection="auto"]').getAttribute('aria-pressed') === 'true', 'Settings switches back to the automatic kitchen calendar');
    // Nobody picks a celebration: the kitchen calendar gives everyone the same one (head chef, 4 Nov 2026).
    ok(await p.evaluate(() => {
      const box = document.querySelector('#kb-seasonal-settings'), chips = [...box.querySelectorAll('[data-seasonal-selection]')].map(node => node.textContent);
      return chips.join('|') === 'On|Off' && document.querySelector('#st-h-season .st-v span')?.textContent === 'On' && !box.querySelector('input,select,[data-seasonal-theme],[data-seasonal-keep]') && !/Choose a celebration|204 designs/.test(box.textContent);
    }), 'Settings has On and Off only, with no way to pick a celebration, and its row says On');
    ok(await p.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-seasonal-coming] li')].map(li => li.textContent);
      return rows.length === 5 && /Sat 7 Nov\s*Tihar/.test(rows[0]) && /Sun 8 Nov\s*Diwali/.test(rows[1]) && document.querySelectorAll('[data-seasonal-coming] .kb-seasonal-mark svg').length === 5;
    }), 'Settings lists the next five celebrations with their dates and stamps');
    await p.click('[data-seasonal-motion="still"]');
    ok(await p.locator('[data-seasonal-replay]').isDisabled(), 'Settings Still disables Replay');
    await p.click('[data-seasonal-motion="gentle"]');
    const replayBefore = await p.evaluate(() => KB_EFFECTS.status().replayRevision);
    await p.click('[data-seasonal-replay]');
    await L.waitFor(p, before => KB_EFFECTS.status().replayRevision > before, replayBefore);
    ok(true, 'Replay in Settings restarts the selected animation');
    await p.click('[data-seasonal-density="light"]');
    ok(await p.evaluate(() => KB_EFFECTS.status().intensity === 'light'), 'Settings applies the quieter ambience preference');
    await p.click('[data-seasonal-selection="off"]');
    await L.waitFor(p, () => document.querySelector('#app').dataset.kbTheme === 'off');
    ok(await p.locator('.wtop-brand').count() === 1, 'Settings Off restores the Kitchen Book heading');
    await theme(p, 'in-diwali');
    ok(await p.evaluate(() => !/in-diwali/.test(localStorage.getItem('lk.seasonal.v1') || '')), 'a design shown for a check is never saved on the device');

    await theme(p, 'au-christmas-day', 'still');
    ok(await p.evaluate(() => KB_EFFECTS.status().state === 'still' && !document.getAnimations().some(a => a.playState === 'running' && a.effect?.target?.closest?.('.kb-nav-edge,.kb-occasion-stamp,.kb-hang,#kb-festive-effects'))), 'Still stops every seasonal header animation');
    await theme(p, 'au-christmas-day');
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    ok(await p.evaluate(() => KB_EFFECTS.status().state === 'reduced-motion' && !document.getAnimations().some(a => a.playState === 'running' && a.effect?.target?.closest?.('.kb-nav-edge,.kb-occasion-stamp,.kb-hang,#kb-festive-effects'))), 'device reduced motion stops seasonal movement');
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    await theme(p, 'off');
    ok(await p.locator('.kb-occasion-stamp,.kb-nav-edge,.kb-season-note,#kb-occasion-panel').count() === 0 && await p.locator('.wtop-brand').count() === 1, 'Off removes festival UI and restores the original Kitchen Book title');
    ok(await p.evaluate(() => KB_CELEBRATION_TICKER.status().activeInstances === 0 && KB_CELEBRATION_TICKER.status().timerCount === 0), 'Off leaves no running explanation or timer');
    await p.reload(); await ready(p);
    ok(await p.evaluate(() => document.querySelector('#app').dataset.kbTheme === 'off'), 'Off is saved on this device across reloads');
    ok(p.errors.length === 0, 'seasonal journeys have no browser errors ' + p.errors.join(' | '));
    await p.context().close(); p = null;

    // A celebration chosen by hand on an older book is not kept: that device goes back to the calendar.
    p = await L.open(b, '#/', { clock: CUP_CLOCK, wait: 1400, seasonal: { selection: 'in-diwali', motion: 'gentle', density: 'festive', keep: true } });
    await ready(p);
    await L.waitFor(p, () => document.querySelector('#app').dataset.kbTheme === 'au-melbourne-cup').catch(() => {});
    ok(await p.evaluate(() => document.querySelector('#app').dataset.kbTheme === 'au-melbourne-cup' && KB_SEASONAL.status().preferences.selection === 'auto'), 'a celebration chosen by hand on an older book goes back to the kitchen calendar');
    await p.context().close(); p = null;

    const tiharDay = Date.parse('2026-11-09T04:00:00Z');
    p = await L.open(b, '#/', { clock: tiharDay, server: tiharDay, seasonal: { selection: 'auto' }, wait: 1400 });
    await ready(p);
    await L.waitFor(p, () => document.querySelector('#app').dataset.kbTheme === 'np-tihar');
    ok(await p.evaluate(() => /Tihar · day 3 of 5/.test(document.querySelector('.kb-season-note h3').textContent)), 'a festival window counts its days: Tihar, day 3 of 5');
    await p.context().close(); p = null;

    const midnight = Date.parse('2026-12-31T13:59:40Z');
    p = await L.open(b, '#/recipes', { clock: midnight, server: midnight, seasonal: { selection: 'auto' }, wait: 1400 });
    await ready(p);
    await L.waitFor(p, () => document.querySelector('#app').dataset.kbTheme === 'au-new-years-eve');
    await p.clock.fastForward(80000);
    await L.waitFor(p, () => document.querySelector('#app').dataset.kbTheme === 'au-new-years-day');
    ok(await p.evaluate(() => LK_TIME.day() === '2027-01-01'), 'Automatic changes New Year’s Eve to New Year’s Day at Queensland midnight in an open book');
    ok((await navFacts(p)).viewportParticles === 0 && p.errors.length === 0, 'midnight theme handoff keeps recipe content quiet and error free');
    await p.context().close(); p = null;
  } catch (error) {
    ok(false, 'seasonal journey completed: ' + (error.stack || error));
  } finally {
    if (p) await p.context().close();
    await b.close();
  }
  L.report(R);
})();
