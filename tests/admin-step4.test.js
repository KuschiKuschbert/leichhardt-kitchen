// The admin panel and the chef panel on the head chef's computer and a laptop (head chef, 27 Nov 2026, step 4 of the
// device coverage plan, docs/device-coverage/step4/findings.md, Chosen). One section per fix; each check fails on the
// code before the fix. Synthetic people and data on the click-test stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const K = (...p) => ['kitchens', L.PIN, ...p].join('/');
const store = p => p.evaluate(() => window.__fake.dump());

(async () => {
  const b = await L.start();

  // Chef to-do: Ctrl+Enter (Cmd+Enter on a Mac) adds the job; Enter alone keeps a new line
  {
    const p = await L.open(b, '#/todo', { who: 'sam', width: 1280, height: 800, touch: false, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('[data-k="todo-text"]'), null, 8000).catch(() => {});
    const jobs = async () => Object.values(await store(p)).filter(x => x && x.st === 'open' && typeof x.text === 'string').map(x => x.text);
    await p.click('[data-k="todo-text"]'); await p.keyboard.type('Ring the knife man'); await p.keyboard.press('Enter'); await L.settle(p, 200);
    const nl = await p.$eval('[data-k="todo-text"]', e => e.value);
    ok(/Ring the knife man\n/.test(nl) && !(await jobs()).includes('Ring the knife man'), 'Chef to-do: Enter alone starts a new line and adds nothing (' + JSON.stringify(nl) + ')');
    await p.$eval('[data-k="todo-text"]', e => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }); await L.settle(p, 150);
    await p.click('[data-k="todo-text"]'); await p.keyboard.type('Ring the knife man'); await p.keyboard.press('Control+Enter');
    await L.waitFor(p, () => Object.values(window.__fake.dump()).some(x => x && x.text === 'Ring the knife man'), null, 5000).catch(() => {});
    ok((await jobs()).includes('Ring the knife man'), 'Chef to-do: Ctrl+Enter adds the job');
    await L.settle(p, 400);
    await p.click('[data-k="todo-text"]'); await p.keyboard.type('Sharpen the slicer'); await p.keyboard.press('Meta+Enter');
    await L.waitFor(p, () => Object.values(window.__fake.dump()).some(x => x && x.text === 'Sharpen the slicer'), null, 5000).catch(() => {});
    ok((await jobs()).includes('Sharpen the slicer'), 'Chef to-do: Cmd+Enter adds the job too');
    ok(!p.errors.length, 'Chef to-do: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
