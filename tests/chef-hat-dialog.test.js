const L = require('./lib');
const { R, ok } = L.results();

async function openHat(p) {
  await p.locator('.wtop-who').press('Enter');
  await L.waitFor(p, () => !!document.querySelector('.wm .ux-modal-close'));
}

async function hatAccessibility(p) {
  const client = await p.context().newCDPSession(p);
  try {
    const { root } = await client.send('DOM.getDocument');
    const tree = {};
    for (const selector of ['.wm-wrap', '.wm', '#main', 'a.skip']) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const { nodes: [node] } = await client.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      tree[selector] = {
        role: node.role?.value, name: node.name?.value, ignored: node.ignored,
        modal: node.properties?.find(property => property.name === 'modal')?.value.value
      };
    }
    return tree;
  } finally { await client.detach(); }
}

(async () => {
  const b = await L.start();
  try {
    for (const [role, opts, destination] of [
      ['owner', { admin: true, width: 1280, height: 900 }, '.wm-set'],
      ['staff', { who: 'ann', width: 390 }, '.wm-set'],
      ['signed out', { who: '', noPin: true, width: 390 }, '.wm-in']
    ]) {
      const p = await L.open(b, '#/', opts);
      try {
        ok(await p.locator('.wtop-who').getAttribute('aria-haspopup') === 'dialog', role + ': hat announces a dialog');
        await openHat(p);
        const ax = await hatAccessibility(p);
        const dialog = ax['.wm-wrap'];
        ok(dialog.role === 'dialog' && dialog.name === 'Chef hat menu' && dialog.modal === true && !dialog.ignored, role + ': named modal in Chromium (' + JSON.stringify(dialog) + ')');
        ok(ax['.wm'].role === 'navigation' && !!ax['.wm'].name && !ax['.wm'].ignored, role + ': the inner menu is a named navigation landmark');
        ok(ax['#main'].ignored && ax['a.skip'].ignored, role + ': the main landmark and skip link are absent from the accessible background');
        ok(await p.evaluate(() => {
          const menu = document.querySelector('.wm');
          return document.activeElement === (menu.querySelector('.wm-tile') || menu.querySelector('.wm-a'));
        }), role + ': focus starts on the first available tile');
        ok(await p.evaluate(() => {
          document.querySelector('a.skip').focus();
          return !!document.activeElement.closest('.wm');
        }), role + ': background cannot take programmatic focus');

        const controls = p.locator('.wm :is(.ux-modal-close, .wm-a):visible');
        await controls.last().focus();
        await p.keyboard.press('Tab');
        ok(await controls.first().evaluate(el => el === document.activeElement), role + ': Tab wraps inside the menu');
        await p.keyboard.press('Shift+Tab');
        ok(await controls.last().evaluate(el => el === document.activeElement), role + ': Shift+Tab wraps inside the menu');
        await p.keyboard.press('Escape');
        await L.waitFor(p, () => !document.querySelector('.wm') && document.activeElement.matches('.wtop-who'));
        ok(await p.locator('.wtop-who').getAttribute('aria-expanded') === 'false', role + ': Escape closes and returns focus to the hat');
        ok(await p.locator('a.skip').evaluate(el => { el.focus(); return el === document.activeElement; }), role + ': the background can take focus again');

        await L.settle(p, 250);
        await openHat(p);
        await p.goBack();
        await L.waitFor(p, () => !document.querySelector('.wm') && document.activeElement.matches('.wtop-who'));
        ok(await p.evaluate(() => location.hash === '#/'), role + ': Back closes the menu and returns focus without leaving Home');

        await openHat(p);
        await p.locator(destination).press('Enter');
        if (opts.noPin) {
          await L.waitFor(p, () => !!document.querySelector('#p-pin'));
          ok(await p.locator('#p-pin').evaluate(el => el === document.activeElement), role + ': Sign in transfers focus to the kitchen PIN');
        } else {
          await L.waitFor(p, () => location.hash === '#/settings' && !!document.querySelector('.st-you'));
        }
        ok(!await p.locator('.wm').count() && !p.errors.length, role + ': destination opens after dismissal without page errors');
      } finally { await p.context().close(); }
    }
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
