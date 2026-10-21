/*
  Screenshots of the drawing library, for checking the drawings by eye (tests/shots/contact-<category>.png).
    cd tests && node contact.js            every category and the servingware
    cd tests && node contact.js meat veg   only those (ware for the servingware)
  It serves the repository like the click tests (port 8778, or PORT) and opens tests/contact.html.
  CHROME=/path/to/chrome as for the click tests.
*/
const L = require('./lib'), server = require('./serve'), fs = require('fs'), path = require('path');
const out = path.join(__dirname, 'shots'); fs.mkdirSync(out, { recursive: true });
const want = process.argv.slice(2), port = +process.env.PORT || 8778, base = 'http://127.0.0.1:' + port + '/';
(async () => {
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  const b = await L.chromium.launch(L.chromeOpts());
  const cats = want.length ? want : ['meat', 'seafood', 'veg', 'potato', 'grains', 'bread', 'prepared', 'sauce', 'garnish', 'sweet', 'dairy', 'build', 'ware'];
  for (const c of cats) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() !== 'log') errs.push(m.text()); });
    await p.goto(base + 'tests/contact.html?' + (c === 'ware' ? 'ware=1' : 'cat=' + c));
    await L.waitFor(p, () => document.body.getAttribute('data-ready') === '1', null, 15000);
    const f = path.join(out, 'contact-' + c + '.png');
    await p.screenshot({ path: f, fullPage: true });
    console.log(c + ': ' + (await p.textContent('#h')) + ' -> ' + f + (errs.length ? '\n  ' + errs.join('\n  ') : ''));
    await p.close();
  }
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
