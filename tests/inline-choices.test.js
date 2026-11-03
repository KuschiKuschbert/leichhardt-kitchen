// Original unit chips stay directly usable. Only known two-way choices use the compact inline adapter.
const L = require('./lib');
const { R, ok } = L.results();
const forms = [
  { name: 'Transfers', route: '#/transfers', action: 'tr-unit', prefix: 'tr', units: ['g', 'kg', 'L', 'pieces', 'packs', 'boxes'] },
  { name: 'Wastage', route: '#/waste', action: 'wunit', prefix: 'w', units: ['g', 'kg', 'L', 'portions', 'pieces'] }
];
const button = (action, value) => '[data-p="' + action + '"][data-v="' + value + '"]';
const snapshot = p => p.evaluate(() => ({ writes: window.__fake.writes.length, history: history.length, state: JSON.stringify(history.state) }));
async function chosen(p, selector, focused) {
  await L.waitFor(p, ({ selector, focused }) => {
    const el = document.querySelector(selector);
    return el && el.getAttribute('aria-checked') === 'true' && (!focused || document.activeElement === el);
  }, { selector, focused });
}
async function geometry(p, selector) {
  return p.locator(selector).evaluateAll(nodes => nodes.map(el => {
    const r = el.getBoundingClientRect(), group = el.parentElement.getBoundingClientRect();
    return { label: el.textContent.trim(), visible: !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden',
      width: r.width, height: r.height, top: Math.round(r.top), fits: r.left >= group.left - 1 && r.right <= group.right + 1 && el.scrollWidth <= el.clientWidth + 1,
      role: el.getAttribute('role'), checked: el.getAttribute('aria-checked') };
  }));
}
async function safe(label, fn) {
  try { await fn(); } catch (e) { ok(false, label + ': ' + String(e)); }
}
(async () => {
  const b = await L.start();
  try {
    for (const form of forms) for (const width of [320, 390]) for (const text of ['normal', 'xlarge']) {
      const label = form.name + ' ' + width + ' ' + text;
      await safe(label, async () => {
        const p = await L.open(b, form.route, { who: 'ann', width, settings: { text }, wait: 1000 });
        try {
          if (form.route === '#/waste') await L.wLog(p); else if (form.route === '#/transfers') await L.xLog(p);
          const selector = '[data-p="' + form.action + '"]';
          await L.waitFor(p, s => {
            const el = document.querySelector(s);
            return el && (el.closest('.ux-unit-choices') || el.closest('.ux-choice-source'));
          }, selector);
          const g = await geometry(p, selector), visible = g.every(x => x.visible);
          ok(g.map(x => x.label).join('|') === form.units.join('|'), label + ': the original units remain in order');
          ok(visible, label + ': every original unit is visible without opening a picker');
          ok(g.every(x => x.width >= 43.5 && x.height >= 43.5 && x.fits) && !(await L.overflow(p)), label + ': unit targets fit at 44px without clipped labels or sideways scrolling');
          if (width === 320 && text === 'xlarge') ok(new Set(g.map(x => x.top)).size > 1, label + ': the unit row wraps at extra large text');
          if (!visible) return; // The old hidden-chip source fails above, without clicking a hidden control.
          await p.fill('#' + form.prefix + '-text', 'Unsent test item');
          await p.fill('#' + form.prefix + '-amt', '2');
          if (form.prefix === 'tr') { await p.fill('#tr-venue', 'Other venue'); await p.fill('#tr-person', 'Taylor'); }
          const before = await snapshot(p);
          let single = true;
          for (const unit of form.units) {
            const target = button(form.action, unit);
            await p.click(target);
            await chosen(p, target, false);
            single = single && await p.locator(selector + '[aria-checked="true"]').count() === 1 && await p.locator('.ux-picker').count() === 0;
          }
          const after = await snapshot(p);
          ok(single && await p.locator(selector).evaluateAll(nodes => nodes.every(el => el.getAttribute('role') === 'radio')), label + ': each direct click selects one accessible unit without a dialog');
          ok(await p.inputValue('#' + form.prefix + '-text') === 'Unsent test item' && await p.inputValue('#' + form.prefix + '-amt') === '2', label + ': unit redraws keep the typed item and amount');
          ok(after.writes === before.writes && after.history === before.history && after.state === before.state, label + ': unit selection writes nothing before Save and adds no history');
          if (form.prefix === 'tr' && width === 320 && text === 'xlarge') {
            const dir = button('tr-dir', 'in');
            const trigger = p.locator('.tr-dirs .ux-picker-trigger');
            ok(!await p.locator(dir).isVisible() && await trigger.isVisible(), label + ': long two-way labels fall back to the existing picker');
            await trigger.click();
            await p.locator('.ux-picker-option[data-index="1"]').click();
            await chosen(p, dir, false);
            await L.waitFor(p, () => !document.querySelector('.ux-picker') && !!document.activeElement.closest('.tr-dirs .ux-picker-trigger'));
            ok(await p.inputValue('#tr-text') === 'Unsent test item' && await p.inputValue('#tr-amt') === '2' && (await snapshot(p)).writes === before.writes,
              label + ': the fallback keeps typed work, restores trigger focus and does not save');
          }
          ok(p.errors.length === 0, label + ': no page errors ' + p.errors.join(' | '));
        } finally { await p.context().close(); }
      });
    }
    await safe('Wide two-way choice', async () => {
      const p = await L.open(b, '#/transfers', { who: 'ann', width: 1280, wait: 1000 });
      try {
        await L.xLog(p);
        const incoming = button('tr-dir', 'in');
        await L.waitFor(p, () => !!document.querySelector('.tr-dirs .ux-inline-pair'));
        const g = await geometry(p, '[data-p="tr-dir"]');
        ok(g.length === 2 && g.every(x => x.visible && x.height >= 43.5 && x.fits) && Math.abs(g[0].width - g[1].width) < 1 && g[0].top === g[1].top,
          'Wide two-way choice: original labels share equal left and right targets');
        await p.fill('#tr-text', 'Keep this transfer'); await p.fill('#tr-amt', '2');
        await p.fill('#tr-venue', 'Other venue'); await p.fill('#tr-person', 'Taylor');
        const before = await snapshot(p);
        await p.click(incoming); await chosen(p, incoming, true);
        ok(await p.inputValue('#tr-text') === 'Keep this transfer' && await p.inputValue('#tr-amt') === '2', 'Wide two-way choice: one actual click redraws the form without losing the draft');
        for (const [key, value] of [['ArrowLeft', 'out'], ['ArrowRight', 'in'], ['Home', 'out'], ['End', 'in'], ['ArrowDown', 'out'], ['ArrowUp', 'in']]) {
          await p.keyboard.press(key); await chosen(p, button('tr-dir', value), true);
          ok(await p.locator('[data-p="tr-dir"][aria-checked="true"]').count() === 1 && await p.locator(button('tr-dir', value)).getAttribute('tabindex') === '0',
            'Wide two-way choice: ' + key + ' selects once and preserves keyboard focus after redraw');
        }
        const after = await snapshot(p);
        ok(after.writes === before.writes && after.history === before.history && after.state === before.state && !await p.locator('.ux-picker').count(),
          'Wide two-way choice: direct and keyboard choices neither save nor add picker history');
        await p.click('.tr-add .nb-addbtn');
        await L.waitFor(p, () => Object.values(window.__fake.dump()).some(x => x.text === 'Keep this transfer' && x.venue === 'Other venue'));
        const saved = await p.evaluate(() => Object.entries(window.__fake.dump()).filter(([key, x]) => /\/transfers\/[^/]+\/lines\//.test(key) && x.text === 'Keep this transfer').map(([, x]) => x));
        ok(saved.length === 1 && saved[0].dir === 'in' && saved[0].amount === 2, 'Wide two-way choice: Log it alone saves the final choice once');
        ok(p.errors.length === 0, 'Wide two-way choice: no page errors ' + p.errors.join(' | '));
      } finally { await p.context().close(); }
    });
    await safe('Adapter boundary', async () => {
      const p = await L.open(b, '#/recipes', { width: 1280, wait: 1000 });
      try {
        // Isolated controls exercise a disabled radio and an unlisted two-item group, without app handlers.
        await p.evaluate(() => {
          const host = document.createElement('div'); host.id = 'inline-fixture'; host.style.width = '600px';
          host.innerHTML = '<div id="disabled-pair" class="seg" role="radiogroup" aria-label="Test direction"><button type="button" class="seg-b" role="radio" data-p="tr-dir" data-v="out" aria-checked="true">Out</button><button type="button" class="seg-b" role="radio" data-p="tr-dir" data-v="in" aria-checked="false" disabled>In</button></div>' +
            '<div id="dynamic-pair" class="chips" aria-label="Two filtered categories"><button type="button" class="chip" data-act="kind" data-val="batch" aria-pressed="true">Batch</button><button type="button" class="chip" data-act="kind" data-val="component" aria-pressed="false">Component</button></div>';
          host.addEventListener('click', e => { e.stopPropagation(); const button = e.target.closest('#disabled-pair button'); if (button && !button.disabled) host.querySelectorAll('#disabled-pair button').forEach(x => x.setAttribute('aria-checked', String(x === button))); });
          document.querySelector('#main').append(host); window.LK_UX.enhance(host);
        });
        await L.waitFor(p, () => !!document.querySelector('#disabled-pair.ux-inline-pair'));
        await p.focus('#disabled-pair [data-v="out"]');
        for (const key of ['ArrowRight', 'End', 'ArrowLeft', 'Home']) await p.keyboard.press(key);
        ok(await p.locator('#disabled-pair [data-v="in"]').isDisabled() && await p.locator('#disabled-pair [data-v="out"]').getAttribute('aria-checked') === 'true' && await p.evaluate(() => document.activeElement.dataset.v === 'out'),
          'Adapter boundary: arrows, Home and End skip a disabled original option');
        ok(!await p.locator('#dynamic-pair .chip').first().isVisible() && await p.locator('#dynamic-pair .ux-picker-trigger').isVisible(),
          'Adapter boundary: a dynamic group with two choices keeps the existing picker');
        await p.evaluate(() => {
          const field = document.createElement('label'); field.id = 'inline-autocomplete';
          field._redraw = function () {
            field.innerHTML = 'Test item<input id="inline-autocomplete-input" list="inline-autocomplete-items"><datalist id="inline-autocomplete-items"><option value="Milk"></datalist>';
            window.LK_UX.enhance(field);
          };
          document.querySelector('#inline-fixture').append(field); field._redraw();
        });
        await p.focus('#inline-autocomplete-input-picker');
        await p.locator('#inline-autocomplete').evaluate(el => el._redraw());
        await L.waitFor(p, () => document.activeElement === document.querySelector('#inline-autocomplete-input-picker'));
        ok(await p.locator('#inline-autocomplete-input').isVisible() && await p.locator('#inline-autocomplete-input-picker').isVisible(),
          'Adapter boundary: autocomplete redraw restores its replacement trigger focus and keeps the original input visible');
        ok(p.errors.length === 0, 'Adapter boundary: no page errors ' + p.errors.join(' | '));
      } finally { await p.context().close(); }
    });
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
