// Manual updates distinguish unsaved work from an open picker and never discard pending writes.
const L = require('./lib');
const { R, ok } = L.results();
const marked = p => p.evaluate(() => { window.__updateMark = 1; });
const reloaded = p => p.evaluate(() => window.__updateMark !== 1).catch(() => true);
const waitReload = p => L.waitFor(p, () => window.__updateMark !== 1, null, 10000).catch(() => {}).then(() => reloaded(p));
const confirm = '#lk-update-confirm';
async function offer(p) {
  await p.clock.fastForward(10000);
  await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
  await L.waitFor(p, () => !!document.querySelector('.upd-bar'));
}
async function gate(p, kind) {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  const match = u => u.href === L.BASE + (kind === 'head' ? 'index.html' : 'js/data.js');
  let seen = false;
  const handler = async route => {
    const request = route.request();
    if (kind === 'head' ? request.method() !== 'HEAD' : !request.headers()['x-lk-fresh']) return route.fallback();
    seen = true;
    await ready;
    return route.fallback();
  };
  await p.context().route(match, handler);
  return { release, seen: () => seen, close: () => p.context().unroute(match, handler) };
}

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  await offer(p);
  await p.click('[data-p="recipe-toggle"]');
  ok(await p.locator('dialog.ux-picker[open]').isVisible() && await p.evaluate(() => LK_PREP.unsavedHere() && !LK_PREP.dirtyForUpdate()), 'an empty native recipe picker is open under the existing navigation guard, with no dirty work');
  await marked(p);
  // A native modal makes the surrounding strip inert. Exercise the same Update handler while that UI-only guard is set.
  await p.evaluate(() => LK_UPDATE.now());
  ok(await waitReload(p), 'one Update action handles an empty picker without a discard prompt');
  await p.context().close();

  for (const [width, text] of [[390, 'normal'], [768, 'normal'], [1280, 'normal'], [390, 'xlarge']]) {
    const label = width + ' ' + text;
    p = await L.open(b, '#/prep', { who: 'ann', width, settings: { text }, wait: 1500 });
    let browserQuestions = 0;
    p.on('dialog', dialog => { browserQuestions++; dialog.dismiss().catch(() => {}); });
    await offer(p);
    await p.fill('#p-text', 'Keep this unfinished prep line');
    await marked(p);
    await p.click('.upd-bar button');
    await L.waitFor(p, () => !!document.querySelector('#lk-update-confirm[open]'));
    await L.settle(p, 300);
    const geometry = await p.evaluate(() => {
      const dialog = document.getElementById('lk-update-confirm'), r = dialog.getBoundingClientRect();
      return { native: dialog instanceof HTMLDialogElement && dialog.open, title: dialog.querySelector('h2').textContent,
        fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
        targets: [...dialog.querySelectorAll('[data-update="keep"], [data-update="discard"]')].every(el => {
          const b = el.getBoundingClientRect(); return b.width >= 44 && b.height >= 44 && b.top >= r.top && b.bottom <= r.bottom;
        }), safeFocus: document.activeElement === dialog.querySelector('[data-update="keep"]') };
    });
    ok(geometry.native && geometry.title === 'Unsaved changes' && geometry.fits && geometry.targets && geometry.safeFocus, label + ': a fitting native dialog explains the choice, with 44 px actions and Keep working focused ' + JSON.stringify(geometry));
    if (width === 390 && text === 'normal') {
      await p.keyboard.press('Shift+Tab');
      ok(await p.locator(confirm + ' [data-update="discard"]').evaluate(el => el === document.activeElement), 'phone confirmation keeps reverse keyboard focus inside its actions');
      await p.keyboard.press('Tab');
      ok(await p.locator(confirm + ' [data-update="keep"]').evaluate(el => el === document.activeElement), 'phone confirmation wraps keyboard focus back to Keep working');
    }
    await p.click(confirm + ' [data-update="keep"]');
    ok(!(await reloaded(p)) && await p.inputValue('#p-text') === 'Keep this unfinished prep line', label + ': Keep working preserves the actual draft');
    ok(await p.evaluate(() => document.activeElement === document.querySelector('.upd-bar button')), label + ': dismissing the dialog restores focus to Update now');
    await p.click('.upd-bar button');
    await p.keyboard.press('Escape');
    ok(await p.locator(confirm).count() === 0 && !(await reloaded(p)), label + ': Escape keeps the draft and closes the dialog');
    if (width === 390 && text === 'normal') {
      await p.click('.upd-bar button');
      await p.evaluate(() => history.back());
      await L.waitFor(p, () => !document.querySelector('#lk-update-confirm'));
      ok(await p.inputValue('#p-text') === 'Keep this unfinished prep line' && /#\/prep$/.test(p.url()), 'phone Back dismisses confirmation without leaving Prep');
    }
    await p.click('.upd-bar button');
    await p.click(confirm + ' [data-update="discard"]');
    ok(await waitReload(p) && browserQuestions === 0, label + ': Discard and update reloads without another browser question');
    await p.context().close();
  }

  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  await offer(p);
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.fill('#p-text', 'Pending prep entry');
  await p.press('#p-text', 'Enter');
  await L.waitFor(p, () => LK_PREP.unsent());
  await marked(p);
  await p.click('.upd-bar button');
  await p.click('.upd-bar button');
  ok(!(await reloaded(p)) && await p.locator(confirm).count() === 0 && /updates.once.sent/.test(await L.txt(p, '.upd-bar')), 'pending writes offer no discard path and repeated taps cannot bypass them');
  await p.clock.fastForward('11:00');
  ok(!(await reloaded(p)) && await p.evaluate(() => LK_PREP.unsent()), 'a long pending write still keeps the requested update waiting safely');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  ok(await waitReload(p), 'the requested clean update continues automatically after acknowledgement');
  await L.settle(p, 500);
  ok(await p.evaluate(() => Object.values(window.__fake.dump()).some(x => x && x.text === 'Pending prep entry')), 'the pending entry survives the update in acknowledged storage');
  await p.context().close();

  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  await offer(p);
  const head = await gate(p, 'head');
  await marked(p);
  await p.click('.upd-bar button');
  await p.fill('#p-text', 'Typed while the signal check waits');
  head.release();
  await L.waitFor(p, () => !!document.querySelector('#lk-update-confirm[open]'));
  ok(!(await reloaded(p)) && await p.inputValue('#p-text') === 'Typed while the signal check waits', 'new work during the signal check receives a discard decision');
  await p.click(confirm + ' [data-update="keep"]');
  await head.close();
  await p.context().close();

  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  await offer(p);
  const files = await gate(p, 'files');
  await p.fill('#p-text', 'Original draft');
  await marked(p);
  await p.click('.upd-bar button');
  await p.click(confirm + ' [data-update="discard"]');
  await L.waitFor(p, () => /Updating/.test((document.querySelector('.upd-bar span') || {}).textContent || ''));
  await p.fill('#p-text', 'New words after the discard decision');
  files.release();
  await L.waitFor(p, () => !!document.querySelector('#lk-update-confirm[open]'));
  ok(!(await reloaded(p)) && await p.inputValue('#p-text') === 'New words after the discard decision' && !(await p.evaluate(() => LK_UPDATE.letGo())), 'a discard decision cannot silently cover later typing during file refresh');
  await p.click(confirm + ' [data-update="keep"]');
  await files.close();
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'update confirmation and interrupted refresh have no overflow or browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, width: 1280, wait: 1500 });
  await L.adminTab(p, 'people');
  await p.click('[data-p="a-add-person"]');
  await offer(p);
  const structural = await gate(p, 'files');
  await marked(p);
  await p.click('.upd-bar button');
  await p.click(confirm + ' [data-update="discard"]');
  await L.waitFor(p, () => /Updating/.test((document.querySelector('.upd-bar span') || {}).textContent || ''));
  const people = await p.evaluate(() => LK_PREP.state.draft.people.length);
  await p.click('[data-p="a-add-person"]');
  ok(await p.evaluate(n => LK_PREP.state.draft.people.length === n + 1, people), 'a real structural button adds another person to the draft without typing');
  structural.release();
  await L.waitFor(p, () => !!document.querySelector('#lk-update-confirm[open]'));
  ok(!(await reloaded(p)) && await p.evaluate(n => LK_PREP.state.draft.people.length === n + 1, people), 'new button-driven work after discard receives a fresh decision and remains intact');
  await p.click(confirm + ' [data-update="keep"]');
  await structural.close();
  ok(p.errors.length === 0, 'structural draft interruption has no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
