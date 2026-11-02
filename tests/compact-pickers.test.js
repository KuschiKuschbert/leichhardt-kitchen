// Fixed drinks-size and mail-priority choices select directly only when all three labels fit.
const L = require('./lib');
const { R, ok } = L.results();
const forms = [
  { name: 'Drinks size', route: '#/drinks', selector: '[data-p="dk-pick"][data-f="size"]', values: ['small', 'reg', 'large'], labels: ['Small', 'Regular', 'Large'], inline390: true },
  { name: 'Mail priority', route: '#/mail', selector: '[data-p="ml-pri"]', values: ['today', 'week', 'any'], labels: ['Today', 'This week', 'Whenever'], inline390: false }
];
const contexts = [{ width: 390, text: 'normal', inline: true }, { width: 390, text: 'xlarge', inline: false },
  { width: 768, text: 'normal', inline: true }, { width: 1280, text: 'xlarge', inline: true }];
const snapshot = p => p.evaluate(() => ({ writes: window.__fake.writes.length, history: history.length, state: JSON.stringify(history.state) }));
async function selected(p, selector, focused) {
  await L.waitFor(p, ({ selector, focused }) => {
    const el = document.querySelector(selector);
    return el && el.getAttribute('aria-pressed') === 'true' && (!focused || el === document.activeElement);
  }, { selector, focused });
}
async function safe(label, fn) {
  try { await fn(); } catch (e) { ok(false, label + ': ' + String(e)); }
}
(async () => {
  const b = await L.start();
  try {
    for (const form of forms) for (const context of contexts) {
      const label = form.name + ' ' + context.width + ' ' + context.text;
      // L.open uses fallback fonts. Mail's full labels do not fit its 390px field even at Normal text.
      const inline = context.inline && (context.width !== 390 || form.inline390);
      await safe(label, async () => {
        const p = await L.open(b, form.route, { who: 'ann', width: context.width, settings: { text: context.text }, wait: 1000 });
        try {
          const drinks = form.route === '#/drinks', draft = drinks ? 'Keep this coffee note' : 'Fryer timer needs checking';
          if (drinks) {
            await L.waitFor(p, () => !!document.querySelector('[data-p="dk-edit"]'));
            await p.click('[data-p="dk-edit"]');
          } else await L.choose(p, '[data-p="ml-cat"][data-v="equipment"]');
          await L.waitFor(p, s => { const el = document.querySelector(s); return el && !!el.closest('.ux-choice-source'); }, form.selector);
          await L.settle(p, 200);
          const shape = await p.locator(form.selector).evaluateAll(nodes => nodes.map(el => {
            const r = el.getBoundingClientRect();
            return { label: el.textContent.trim(), visible: !!el.getClientRects().length, width: r.width, height: r.height, top: Math.round(r.top), fits: el.scrollWidth <= el.clientWidth + 1 };
          }));
          const trigger = p.locator(form.selector).first().locator('..').locator('..').locator(':scope > .ux-picker-trigger');
          const visible = shape.every(x => x.visible);
          ok(shape.map(x => x.label).join('|') === form.labels.join('|'), label + ': the original three choices and order remain');
          if (inline) {
            ok(visible && shape.every(x => x.width >= 43.5 && x.height >= 43.5 && x.fits && x.top === shape[0].top) && Math.max(...shape.map(x => x.width)) - Math.min(...shape.map(x => x.width)) < 1 && !await trigger.isVisible(),
              label + ': full labels fit equal 44px inline targets without a picker step');
            if (!visible) return; // The old source fails above without attempting a hidden original click.
          } else {
            ok(!visible && await trigger.isVisible(), label + ': labels that do not fit retain the labelled picker');
            if (visible || !await trigger.isVisible()) return;
          }
          await p.fill(drinks ? '#dk-note' : '[data-k="ml-text"]', draft);
          if (drinks) await p.fill('#dk-other', 'Bring a banana');
          const before = await snapshot(p);
          let value;
          if (inline) {
            value = form.values[2];
            await p.click(form.selector + '[data-v="' + value + '"]');
            await selected(p, form.selector + '[data-v="' + value + '"]', true);
            ok(await p.locator(form.selector + '[aria-pressed="true"]').count() === 1 && !await p.locator('.ux-picker').count(), label + ': one actual click selects one original option and redraws with focus');
            for (const [key, index] of [['Home', 0], ['End', 2], ['ArrowLeft', 1], ['ArrowRight', 2]]) {
              value = form.values[index];
              await p.keyboard.press(key); await selected(p, form.selector + '[data-v="' + value + '"]', true);
              ok(await p.locator(form.selector + '[aria-pressed="true"]').count() === 1, label + ': ' + key + ' keeps selection and focus through the real form redraw');
            }
          } else {
            value = form.values[0];
            await trigger.click(); await p.locator('.ux-picker-option[data-index="0"]').click();
            await selected(p, form.selector + '[data-v="' + value + '"]', false);
            await L.waitFor(p, s => {
              const source = document.querySelector(s).closest('.ux-choice-source');
              return !document.querySelector('.ux-picker') && document.activeElement === source.nextElementSibling;
            }, form.selector);
            ok(await p.locator(form.selector + '[aria-pressed="true"]').count() === 1, label + ': the existing picker selects once and restores its replacement trigger focus');
          }
          const after = await snapshot(p);
          ok(await p.inputValue(drinks ? '#dk-note' : '[data-k="ml-text"]') === draft && (!drinks || await p.inputValue('#dk-other') === 'Bring a banana'), label + ': selection retains all typed draft text');
          ok(after.writes === before.writes && (!inline || after.history === before.history && after.state === before.state) && !(await L.overflow(p)), label + ': choices do not save early, inline choices add no history and the page fits');
          await p.click(drinks ? '[data-p="dk-save"]' : '[data-p="ml-send"]');
          await L.waitFor(p, ({ drinks, value, draft }) => Object.entries(window.__fake.dump()).some(([key, x]) => drinks ? key.endsWith('/drinks/ann') && x.size === value && x.note === draft : /\/mail\/[^/]+$/.test(key) && x.text === draft && x.pri === value), { drinks, value, draft });
          const saved = await p.evaluate(({ drinks, draft, start }) => {
            const all = window.__fake.dump(), rows = Object.entries(all).filter(([key, x]) => drinks ? key.endsWith('/drinks/ann') : /\/mail\/[^/]+$/.test(key) && x.text === draft);
            return { rows: rows.map(([key, x]) => ({ ...x, status: drinks ? null : all[key.replace('/mail/', '/mailstat/')] })), batches: window.__fake.writes.slice(start) };
          }, { drinks, draft, start: before.writes });
          const row = saved.rows[0];
          ok(saved.rows.length === 1 && saved.batches.length === 1 && row.by === 'ann' && (drinks ? row.kind === 'flat' && row.size === value && row.milk === 'oat' && row.note === draft && row.other === 'Bring a banana'
            : row.from === 'ann' && row.cat === 'equipment' && row.pri === value && row.text === draft && row.seen === false && row.done === false && row.status.by === 'ann' && row.status.seen === false && row.status.done === false),
            label + ': the existing Save or Send alone commits the correct original payload once');
          ok(p.errors.length === 0, label + ': no page errors ' + p.errors.join(' | '));
        } finally { await p.context().close(); }
      });
    }
    await safe('Explicit three-choice boundary', async () => {
      const p = await L.open(b, '#/recipes', { width: 1280, wait: 1000 });
      try {
        await p.evaluate(() => {
          const host = document.createElement('div'); host.id = 'compact-boundary';
          host.innerHTML = '<div id="other-drink-field" class="chips" aria-label="Filtered milk"><button type="button" data-p="dk-pick" data-f="milk" data-v="none" aria-pressed="true">None</button><button type="button" data-p="dk-pick" data-f="milk" data-v="oat" aria-pressed="false">Oat</button><button type="button" data-p="dk-pick" data-f="milk" data-v="skim" aria-pressed="false">Skim</button></div>' +
            '<div id="dynamic-three" class="chips" aria-label="Filtered categories"><button type="button" data-act="kind" data-val="batch" aria-pressed="true">Batch</button><button type="button" data-act="kind" data-val="component" aria-pressed="false">Component</button><button type="button" data-act="kind" data-val="dish" aria-pressed="false">Dish</button></div>';
          document.querySelector('#main').append(host); window.LK_UX.enhance(host);
        });
        for (const id of ['other-drink-field', 'dynamic-three']) {
          ok(!await p.locator('#' + id + ' .ux-choice-source button').first().isVisible() && await p.locator('#' + id + ' > .ux-picker-trigger').isVisible(), id + ': an unlisted or dynamic three-choice group keeps its existing picker');
        }
        ok(p.errors.length === 0, 'Explicit three-choice boundary: no page errors ' + p.errors.join(' | '));
      } finally { await p.context().close(); }
    });
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
