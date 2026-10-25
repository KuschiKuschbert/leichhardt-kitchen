// A reminder confirmation owns only its own completion stamp. Later completions must survive old callbacks.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const completion = F.key(['cutdone', F.today + '_northside']);
const button = '#cut-band [data-cut="done"][data-id^="northside|"]';
const undo = p => p.getByRole('button', { name: 'Undo', exact: true });
const record = p => p.evaluate(k => window.__fake.dump()[k], completion);
const writes = p => p.evaluate(k => window.__fake.writes.flat().filter(o => o.path === k), completion);
async function open(b) {
  const p = await L.open(b, '#/orders', { who: 'sam', extra: F.fixture(), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"][data-id^="northside|"]:not([disabled])'), null, 10000);
  return p;
}
async function replace(p, by) {
  const newer = await p.evaluate(([k, by]) => {
    const d = Object.assign({}, window.__fake.dump()[k], { by, at: window.__fake.dump()[k].at + 120000 });
    window.__fake.write(k, d);
    return d;
  }, [completion, by]);
  await L.waitFor(p, ([k, name]) => {
    const row = document.querySelector('.cut-tl .cut-st'), d = window.__fake.dump()[k];
    return row && row.textContent.includes('Ordered by ' + name) && row.textContent.includes(window.LK_TIME.clock(d.at));
  }, [completion, by === 'sam' ? 'Sam' : 'Bo'], 10000);
  return newer;
}

(async () => {
  const b = await L.start();
  for (const by of ['sam', 'bo']) {
    // Another device can finish a later order before this phone hears that its original write succeeded.
    let p = await open(b);
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click(button);
    await L.waitFor(p, k => !!window.__fake.dump()[k], completion, 10000);
    const newer = await replace(p, by);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await L.waitFor(p, () => !window.LK_PREP.unsaved(), null, 10000);
    await L.settle(p, 300);
    ok(await undo(p).count() === 0, by + ': a delayed original save offers no Undo for a newer completion');
    ok(!/order done\. No quantities recorded\./.test(await p.textContent('body')), by + ': a delayed original save does not claim the newer completion');
    ok(JSON.stringify(await record(p)) === JSON.stringify(newer) && (await writes(p)).length === 1, by + ': the later completion and its attribution are preserved');
    ok(p.errors.length === 0, by + ': delayed completion has no page errors ' + p.errors.join(' | '));
    await p.context().close();

    // A still-visible Undo from a confirmed save also expires when another completion replaces its stamp.
    p = await open(b);
    await p.click(button);
    await undo(p).waitFor({ state: 'visible' });
    const after = await replace(p, by);
    await undo(p).click();
    await L.settle(p, 300);
    ok(JSON.stringify(await record(p)) === JSON.stringify(after), by + ': old Undo does not uncheck a newer completion');
    ok((await writes(p)).length === 1 && !(await p.$(button)), by + ': old Undo writes nothing and keeps the reminder completed');
    ok(p.errors.length === 0, by + ': stale Undo has no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})();
