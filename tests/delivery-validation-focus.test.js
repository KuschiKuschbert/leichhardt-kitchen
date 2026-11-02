// Invalid receiving details should put a keyboard user at the field to correct, without losing any readings.
const L = require('./lib'), { R, ok } = L.results();
const key = ['kitchens', L.PIN, 'deliveries'].join('/') + '/';
const saved = p => p.evaluate(prefix => Object.entries(__fake.dump()).filter(([id]) => id.startsWith(prefix)).map(([, row]) => row), key);
async function submit(p) {
  await p.focus('#dl-form button[type=submit]'); await p.keyboard.press('Enter');
}
async function invalid(p, id) {
  await L.waitFor(p, () => document.querySelector('#dl-save-note')?.getAttribute('role') === 'alert');
  return p.evaluate(id => {
    const e = document.getElementById(id), note = document.getElementById('dl-save-note'), r = e.getBoundingClientRect();
    const bottom = document.querySelector('.tabbar'), bar = bottom && getComputedStyle(bottom).display !== 'none' ? bottom.getBoundingClientRect().top : innerHeight;
    return { focused: document.activeElement === e, marked: e.getAttribute('aria-invalid') === 'true',
      described: (e.getAttribute('aria-describedby') || '').split(' ').includes(note.id), message: note.textContent,
      visible: r.top >= 0 && r.bottom <= bar, help: e.getAttribute('aria-describedby') || '' };
  }, id);
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/deliveries', { who: 'ann', width, height: width === 768 ? 1024 : 844, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#dl-form'));
    await submit(p); let state = await invalid(p, 'dl-supplier');
    ok(state.focused && state.marked && state.described && state.visible && /supplier name/.test(state.message), width + ': empty keyboard save focuses the visible supplier and associates its error');
    ok((await saved(p)).length === 0, width + ': invalid supplier never records a delivery');
    await p.fill('#dl-supplier', 'Sample supplier');
    ok(await p.evaluate(() => document.activeElement.id === 'dl-supplier' && !document.querySelector('[aria-invalid=true]') && document.getElementById('dl-save-note').textContent === ''), width + ': correcting the supplier clears its stale error without moving focus');

    await submit(p); state = await invalid(p, 'dl-chilled');
    ok(state.focused && state.marked && state.described && state.visible && /or both/.test(state.message), width + ': missing readings focus the first available temperature');
    ok(state.help.includes('dl-temp-help') && await p.getAttribute('#dl-frozen', 'aria-invalid') === 'true', width + ': either-reading error keeps the temperature instructions and identifies both alternatives');
    await p.fill('#dl-frozen', '-18');
    ok(await p.evaluate(() => !document.querySelector('[aria-invalid=true]') && document.getElementById('dl-save-note').textContent === '' && document.activeElement.id === 'dl-frozen'), width + ': entering either temperature clears the group error and retains focus');
    await p.fill('#dl-chilled', 'bad');
    await submit(p); state = await invalid(p, 'dl-chilled');
    ok(state.focused && state.marked && state.described && /Negative and decimal/.test(state.message), width + ': malformed chiller reading is marked and focused');
    ok(await p.inputValue('#dl-frozen') === '-18' && await p.inputValue('#dl-supplier') === 'Sample supplier' && (await saved(p)).length === 0, width + ': invalid reading preserves the other reading and supplier without writing');
    await p.fill('#dl-chilled', '0'); await p.fill('#dl-frozen', 'bad');
    await submit(p); state = await invalid(p, 'dl-frozen');
    ok(state.focused && state.marked && state.described && state.visible && await p.inputValue('#dl-chilled') === '0', width + ': invalid freezer reading focuses that field and retains zero chiller');
    await p.fill('#dl-note', 'Keep these details');
    ok(await p.getAttribute('#dl-frozen', 'aria-invalid') === 'true', width + ': editing an unrelated field does not hide the invalid reading');
    await p.fill('#dl-frozen', '-18.5'); await submit(p);
    await L.waitFor(p, () => /Delivery saved/.test(document.getElementById('dl-save-note')?.textContent || ''));
    const records = await saved(p);
    ok(records.length === 1 && records[0].chilled === 0 && records[0].frozen === -18.5 && records[0].supplier === 'Sample supplier' && records[0].note === 'Keep these details' && records[0].by === 'ann', width + ': corrected keyboard save records the original receiver and exact entered readings once');
    ok(await p.evaluate(() => document.activeElement.id === 'dl-supplier' && !document.querySelector('[aria-invalid=true]') && document.getElementById('dl-supplier').value === ''), width + ': acknowledged save resets the form and validation state with focus ready for the next delivery');
    ok(!p.errors.length && !await L.overflow(p), width + ': keyboard recovery has no page errors or horizontal overflow');
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
