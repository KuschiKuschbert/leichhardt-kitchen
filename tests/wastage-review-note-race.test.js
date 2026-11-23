// A Prep note read started before a dated review save cannot undo its local refresh.
const L = require('./lib');
const { R, ok } = L.results();
const today = '2026-11-23';
const reviewDay = '2026-11-22';
const clock = Date.parse(today + 'T00:05:00+10:00');
const root = 'kitchens/' + L.PIN + '/waste/';
const review = root + reviewDay;
const days = [reviewDay, '2026-11-21', '2026-11-20'];
const corrected = 'Use half a tray at prep';
const extra = {
  [review]: { avoidable: 'Unserved food', change: 'Use a full tray at prep', reviewBy: 'Jo', reviewAt: clock - 400000 },
  [root + days[1]]: { change: 'Put out the small plates', reviewBy: 'Jo' },
};

async function go(page, name) {
  await page.evaluate(name => { location.hash = '#/' + name; }, name);
  await L.waitFor(page, name => LK_PREP.state.name === name, name);
}

async function holdEarlierRead(page) {
  await page.evaluate(review => {
    const sdk = LK_PREP.book().fs(), getDoc = sdk.getDoc;
    sdk.getDoc = function (ref) {
      const request = getDoc.call(sdk, ref);
      const path = Array.isArray(ref.path) ? ref.path.join('/') : ref.path;
      if (path !== review) return request;
      sdk.getDoc = getDoc;
      return request.then(snapshot => new Promise((resolve, reject) => {
        window.__finishEarlierNoteRead = failed => failed ? reject({ code: 'unavailable' }) : resolve(snapshot);
      }));
    };
  }, review);
  await go(page, 'prep');
  await L.waitFor(page, () => typeof window.__finishEarlierNoteRead === 'function');
}

async function noteState(page) {
  return page.evaluate(root => {
    const note = LK_PREP.state.wNote;
    const cache = JSON.parse(localStorage.getItem('lk.w.note') || 'null');
    const flags = [...document.querySelectorAll('.nb-flag')].filter(flag => flag.getClientRects().length).map(flag => ({
      label: flag.querySelector('.nb-sl')?.textContent,
      text: flag.querySelector('p')?.textContent,
      author: flag.querySelector('.nb-sw')?.textContent,
    }));
    const reads = __fake.bill.filter(x => x.kind === 'get' && x.path.startsWith(root) && /^\d{4}-\d{2}-\d{2}$/.test(x.path.slice(root.length)));
    return { note, cache, flags, prepDate: LK_PREP.state.date, days: reads.map(x => x.path.slice(root.length)), retry: !!LK_PREP.state.retryAt.wNote };
  }, root);
}

async function check(browser, failed) {
  const label = failed ? 'late refused note read' : 'late successful note read';
  const page = await L.open(browser, '#/admin', { admin: true, clock, extra, width: 1280 });
  try {
    await L.adminTab(page, 'waste');
    await holdEarlierRead(page);
    await go(page, 'admin');
    await L.adminTab(page, 'waste');
    await page.click('[data-p="wh-view"][data-v="reviews"]');
    await page.click('[data-p="rv-day"][data-d="-1"]');
    await page.fill('#w-rc', corrected);
    await page.click('[data-p="wreview"]');
    await L.waitFor(page, ({ review, corrected }) => __fake.dump()[review].change === corrected && !LK_PREP.unsent(), { review, corrected });
    await go(page, 'prep');
    await L.waitFor(page, corrected => LK_PREP.state.wNote?.change === corrected && !!localStorage.getItem('lk.w.note'), corrected);
    await page.evaluate(failed => window.__finishEarlierNoteRead(failed), failed);
    await L.settle(page, 350);
    const state = await noteState(page), cached = state.cache?.v?.n;
    const displayed = state.flags.some(flag => flag.label === "From yesterday's waste review" && flag.text === corrected && flag.author === 'Head chef');
    ok(state.note?.date === reviewDay && state.note.change === corrected && displayed,
      label + ': Prep displays the acknowledged ' + reviewDay + ' note and author. Found ' + state.note?.date + ' ' + state.note?.change + ' on Prep ' + state.prepDate + ' with ' + JSON.stringify(state.flags));
    ok(state.cache?.tag === L.PIN + '|' + today && cached?.date === reviewDay && cached.change === corrected && !state.retry,
      label + ': the ' + today + ' cache keeps the confirmed note and has no stale retry. Found ' + cached?.date + ' ' + cached?.change + ', retry ' + state.retry);
    ok(state.days.length === 6 && days.every(day => state.days.filter(read => read === day).length === 2),
      label + ': keeps the existing six reads, initial and after acknowledgement (' + state.days.join(', ') + ')');
    ok(!page.errors.length, label + ': no browser errors ' + page.errors.join(' | '));
  } finally {
    await page.context().close();
  }
}

(async () => {
  const browser = await L.start();
  try {
    for (const failed of [false, true]) await check(browser, failed);
  } finally {
    await browser.close();
  }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
