// Recipe ingredient details: same controls and draft in a wide panel or a compact inline row.
const L = require('./lib');
const { R, ok } = L.results();
const arrow = '[data-mg="ing-open"][data-i="0"]';
const close = '[data-mg="ing-close"]';
const note = '#mg-note-0';
const link = '#mg-link-0';
const detail = '#mg-ing-detail-0';
const height = [844, 900, 800];
const checkedWidths = [390, 768, 1280];
const focused = (p, selector) => p.evaluate(s => document.activeElement === document.querySelector(s), selector);
const box = (el) => el.boundingBox();
const inspectorActionsFit = p => p.evaluate(() => {
  const panel = document.querySelector('.mg-ing-panel .mg-ing-open');
  const dock = document.querySelector('.mg-bar').getBoundingClientRect();
  const pageY = scrollY;
  panel.scrollTop = panel.scrollHeight;
  const actions = [...panel.querySelectorAll('[data-mg="ing-down"], [data-mg="ing-del"]')];
  return actions.length === 2 && scrollY === pageY && actions.every(button => {
    const r = button.getBoundingClientRect();
    return r.bottom <= dock.top && button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });
});

(async () => {
  const b = await L.start();
  for (const [i, width] of checkedWidths.entries()) {
    const desktop = width === 1280;
    const p = await L.open(b, '#/manage/r/burger', { who:'sam', width, height:height[i] });
    await L.waitFor(p, () => !!document.querySelector('[data-mg="ing-open"][data-i="0"]'));
    const row = p.locator('.mg-ings .mg-ing').first();
    const base = await box(row);
    const writes = await p.evaluate(() => window.__fake.writes.length);
    if (desktop) { await p.focus(arrow); await p.keyboard.press('Enter'); }
    else await p.click(arrow);
    ok(await p.getAttribute(arrow, 'aria-controls') === 'mg-ing-detail-0' && await p.locator(detail).count() === 1, width + ': the arrow owns one real detail form');
    ok(await p.locator((desktop ? '.mg-ing-panel' : '.mg-ing') + ' ' + detail).count() === 1, width + ': details are in the expected place');
    ok(await p.isVisible(link) && await p.locator(detail + ' [data-mg="tag"]').count() === 10, width + ': same link and allergens are available');
    ok((await box(p.locator(arrow))).height >= 44, width + ': the arrow stays 44 px high');
    if (desktop) {
      ok((await box(row)).height - base.height < 20 && await focused(p, close), 'desktop: opening details keeps the row short and focuses the panel');
      ok((await box(p.locator(close))).height >= 44, 'desktop: Close is at least 44 px high');
      ok(await inspectorActionsFit(p), 'desktop: Move down and Remove clear Save when only the inspector scrolls');
      await p.setViewportSize({ width, height: 650 });
      await L.settle(p, 200);
      ok(await inspectorActionsFit(p), 'shorter desktop: both inspector actions remain tappable above Save');
      await p.setViewportSize({ width, height: height[i] });
      await p.focus('[data-f="ing.0.name"]');
      await p.keyboard.press('Enter');
      ok(await focused(p,note), 'desktop: Enter on the name reaches Note in the panel');
    } else {
      const sameLine = await p.evaluate(() => [...document.querySelectorAll('.mg-ing-field')].every(f => {
        const label = f.querySelector('label').getBoundingClientRect(), control = f.children[1].getBoundingClientRect();
        return label.right <= control.left && label.top < control.bottom && label.bottom > control.top;
      }));
      ok(sameLine, width + ': labels and controls fit together on one line');
    }
    await p.fill(note, 'Wrap and hold before service');
    if (desktop) {
      const tag = detail + ' [data-mg="tag"][data-v="Sesame"]';
      await L.choose(p, tag);
      const tagFocus = await p.locator(tag).evaluate(el => {
        const group = el.closest('.ux-choice-source');
        return document.activeElement === (group ? group.nextElementSibling : el);
      });
      ok(tagFocus && await p.getAttribute(tag, 'aria-pressed') === 'true', 'desktop: the exact allergen control keeps focus through redraw');
      await p.click(close);
    } else await p.click(arrow);
    ok(await focused(p, arrow) && await p.locator(detail).count() === 0, width + ': closing returns to the ingredient arrow');
    await p.click(arrow);
    ok(await p.inputValue(note) === 'Wrap and hold before service' && await p.isEnabled('[data-mg="save"]'), width + ': closing and reopening keeps the unsaved note and Save');
    if (desktop) {
      await p.focus(note);
      await p.evaluate(s => document.querySelector(s).setSelectionRange(5, 11), note);
      await p.setViewportSize({ width: 390, height: 844 });
      await L.waitFor(p, () => !!document.querySelector('.mg-ing #mg-ing-detail-0'));
      const caret = await p.evaluate(s => [document.activeElement === document.querySelector(s), document.activeElement.selectionStart, document.activeElement.selectionEnd], note);
      ok(caret.join() === 'true,5,11' && await p.inputValue(note) === 'Wrap and hold before service', 'desktop to phone: draft, focus and text selection survive');
    }
    ok((await p.evaluate(() => window.__fake.writes.length)) === writes && !(await L.overflow(p)) && p.errors.length === 0, width + ': no edit writes, page errors or sideways scrolling');
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
