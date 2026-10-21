// The top bar at tablet width (768 px) with a wide fallback font, as on a machine without the kitchen font (the GitHub
// runner): the pills wrap inside the bar instead of pushing Pings and the chef hat off the right edge.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const hash of ['#/', '#/prep', '#/recipes']) {
    const p = await L.open(b, hash, { width: 768, height: 1024, wait: 1200 });
    await p.addStyleTag({ content: '*, *::before, *::after { font-family: "DejaVu Sans", sans-serif !important; }' });
    await L.settle(p, 400);
    const of = await L.overflow(p);
    ok(!of, '768 wide font ' + hash + (of ? ' sideways scroll: ' + of : ''));
    const right = await p.evaluate(() => { const e = document.querySelector('.wtop-icons'); return e ? Math.round(e.getBoundingClientRect().right) : 0; });
    ok(right > 0 && right <= 768, '768 wide font ' + hash + ': the top bar buttons stay on the page (right edge ' + right + ')');
    ok(p.errors.length === 0, '768 wide font ' + hash + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
