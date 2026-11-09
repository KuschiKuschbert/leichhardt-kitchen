// Colour reinforces the words and state. Measure rendered pairs, including inherited opacity, rather than token names.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW)), key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const at = hm => M.kat(today, M.hmMin(hm));
const booking = M.derive({ v: 1, status: 'confirmed', name: 'Example lunch', date: today, start: at('13:45'), loc: 'Function room', guests: 40,
  mode: 'all', notes: 'One nut allergy. Confirm dietary requests.', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: at('14:10'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 3, u: M.toU([3]) }],
  was: {}, chg: [], cBy: 'sam', cAt: 1, confBy: 'sam', confAt: 1, by: 'sam', upd: L.NOW - 3600000 });
const claimed = { [key('days', today, 'items', 'colour-claim')]: { text: 'Pick parsley', qty: '2 tubs', station: 'Larder', recipe: '',
  addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false, onBy: 'Bo', onById: 'bo', onAt: L.NOW - 600000 } };

async function paint(p, selector) {
  return p.locator(selector).first().evaluate(e => {
    const rgba = s => { const c = (s.match(/[\d.]+/g) || []).map(Number); return c.length === 3 ? c.concat(1) : c; };
    const over = (a, b) => { const alpha = a[3] + b[3] * (1 - a[3]); return alpha ? [0, 1, 2].map(i => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha).concat(alpha) : [0, 0, 0, 0]; };
    const style = getComputedStyle(e);
    let foreground = rgba(style.color), background = [0, 0, 0, 0], opacity = 1;
    // Composite the text and its empty background through each opacity group. Merely reading color misses dimmed rows.
    for (let node = e; node; node = node.parentElement) {
      const st = getComputedStyle(node), bg = rgba(st.backgroundColor), alpha = +st.opacity;
      foreground = over(foreground, bg); background = over(background, bg);
      foreground[3] *= alpha; background[3] *= alpha; opacity *= alpha;
    }
    foreground = over(foreground, [255, 255, 255, 1]); background = over(background, [255, 255, 255, 1]);
    const lum = c => c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0);
    const a = lum(foreground), b = lum(background);
    return { color: style.color, fill: style.backgroundColor, border: style.borderLeftColor, opacity,
      ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), text: e.textContent.trim() };
  });
}
const readable = (pair, label) => ok(pair.ratio >= 4.5, label + ' text passes 4.5:1 (' + pair.ratio.toFixed(3) + ')');

(async () => {
  const browser = await L.start();
  for (const width of [390, 768, 1280]) {
    let p = await L.open(browser, '#/prep', { who: 'ann', width, extra: claimed, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#nbr-colour-claim .nb-on'));
    const row = '#nbr-colour-claim', owner = await paint(p, row + ' .nb-on'), meta = await paint(p, row + ' .nb-meta');
    ok(owner.opacity === 1 && meta.opacity === 1, width + ': another cook\'s claimed prep remains fully readable without row opacity');
    readable(owner, width + ': claimed prep owner'); readable(meta, width + ': claimed prep metadata');
    ok(await p.locator(row + ' .nb-onbtn').getAttribute('aria-pressed') === 'true' &&
      await p.locator(row + ' .nb-onbtn').getAttribute('aria-label') === 'Take over Pick parsley from Bo' &&
      /Bo on it/.test(owner.text) && /Bo\s*✓/.test(await p.locator(row + ' .nb-onbtn').textContent()), width + ': claimed prep names Bo, retains its tick and describes taking over');

    // Existing classes in their real surface contexts, without triggering unrelated saves or reading private records.
    await p.evaluate(() => {
      const host = document.createElement('section'); host.id = 'colour-samples'; host.className = 'p-card';
      host.innerHTML = '<p class="p-err">Could not save prep. Try again.</p><p class="dl-error">Could not save delivery. Try again.</p>' +
        '<div class="su-error" role="alert">Could not record order. Try again.</div><p class="fe-err">Could not save function. Try again.</p>' +
        '<p class="su-status" role="status">Recording order. Waiting for confirmation.</p><div class="warn"><span class="label">Check allergens</span></div>' +
        '<span class="fnn-on">On the list</span><span class="dr-eb">Your PIN is set</span><span class="fn-sent-ok">✓ Sent</span><span class="fn-tag fn-t-ok">Confirmed</span>' +
        '<div class="dw-top"><p class="p-err">Could not save drawing. Try again.</p></div>' +
        '<div class="fn-next"><span class="fn-late">6 min late</span><span class="fn-sent-ok">✓ Sent</span></div>';
      document.body.appendChild(host);
    });
    const sample = s => '#colour-samples ' + s;
    const red = await paint(p, sample('.dl-error')), attention = await paint(p, sample('.warn'));
    for (const sel of ['.p-err', '.dl-error', '.su-error', '.fe-err']) {
      const pair = await paint(p, sample(sel));
      ok(pair.color === red.color, width + ': ' + sel + ' uses the shared failure colour'); readable(pair, width + ': ' + sel);
    }
    const supplierError = await paint(p, sample('.su-error')), pending = await paint(p, sample('.su-status'));
    ok(supplierError.border === red.color && supplierError.fill !== pending.fill, width + ': failed supplier work has a red edge and a different surface from pending work');
    ok(red.color !== attention.fill && pending.color !== red.color && /Waiting for confirmation/.test(pending.text), width + ': orange attention and unconfirmed work remain distinct from failure');
    const green = await paint(p, sample('.fnn-on'));
    for (const sel of ['.dr-eb', '> .fn-sent-ok', '.fn-t-ok']) {
      const pair = await paint(p, sample(sel));
      ok(pair.color === green.color && pair.color !== red.color, width + ': ' + sel + ' shares the completion colour'); readable(pair, width + ': ' + sel);
    }
    const darkError = await paint(p, sample('.dw-top .p-err')), darkLate = await paint(p, sample('.fn-next .fn-late')), darkDone = await paint(p, sample('.fn-next .fn-sent-ok'));
    ok(darkError.color === darkLate.color && darkError.color !== red.color, width + ': dark drawing and function failures share a light failure colour');
    ok(darkDone.color !== green.color && darkDone.color !== darkLate.color, width + ': dark completion retains its separate light green');
    readable(darkError, width + ': dark drawing failure'); readable(darkLate, width + ': dark late warning'); readable(darkDone, width + ': dark confirmed state');
    ok(!p.errors.length && !await L.overflow(p), width + ': prep and colour samples have no page errors or sideways scroll');
    await p.context().close();

    p = await L.open(browser, '#/fn/now', { who: 'sam', width, clock: at('14:16'), extra: { [key('functions', 'colour-lunch')]: booking }, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('.fn-svc-row.is-late .fn-svc-cd'));
    const late = await paint(p, '.fn-svc-row.is-late .fn-svc-cd');
    readable(late, width + ': actual late function countdown');
    ok(late.text === '6 min late' && /Late/.test(await p.locator('.fn-svc-row.is-late .fn-svc-top').textContent()) &&
      /One nut allergy/.test(await p.locator('.fn-svc-row.is-late .fn-svc-diet').textContent()), width + ': actual late service state retains its words and dietary note');
    ok(!p.errors.length && !await L.overflow(p), width + ': late service board has no page errors or sideways scroll');
    await p.context().close();

    p = await L.open(browser, '#/admin', { admin: true, adminPage: '', who: '', width, extra: L.mail(), wait: 1600 });
    await L.waitFor(p, () => !!document.querySelector('.a-quick[data-v="inbox"] em'));
    if (width >= 1100) {
      const badge = await paint(p, '.a-quick[data-v="inbox"] em'); readable(badge, width + ': actual Inbox rail count');
      ok(await p.locator('.a-quick[data-v="inbox"]').isVisible() && /Inbox/.test(await p.locator('.a-quick[data-v="inbox"]').textContent()) && /^\d+$/.test(badge.text), width + ': visible rail badge keeps its Inbox label and count');
    }
    ok(!p.errors.length && !await L.overflow(p), width + ': admin count retains a fitting page without errors');
    await p.context().close();
  }
  await browser.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
