// Admin repairs are explicit, audited decisions; protecting a word reaches staff through the existing config listener.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW)), yesterday = L.ymd(new Date(L.NOW - 86400000));
const cfgKey = key('config', 'main');
const prepKey = key('days', yesterday, 'items', 'pr-brie');
const orderKey = key('orders', yesterday, 'lines', 'pr-order');
const hostileKey = key('days', yesterday, 'items', 'pr-hostile');
const hostileTyped = '<img src=x onerror="window.__proofInjected=1">', hostileSaved = '<svg onload="window.__proofInjected=2">';
const extra = {
  [prepKey]: { text: 'Cut brine', orig: 'Cut brie', qty: '2 blocks', station: 'Larder', recipe: 'laksa', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 86400000, done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - 85000000, deleted: false, by: 'sam' },
  [orderKey]: { text: 'Brine wedges', orig: 'Brie wedges', qty: '3 trays', recipes: ['burger'], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000, ordered: true, orderedBy: 'Sam', orderedById: 'sam', orderedAt: L.NOW - 85000000, deleted: false, by: 'sam' },
  [hostileKey]: { text: hostileSaved, orig: hostileTyped, qty: '', station: 'Larder', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 86400000, done: false, deleted: false, by: 'sam' }
};
for (let n = 0; n < 20; n++) extra[key('days', yesterday, 'items', 'pr-padding-' + String(n).padStart(2, '0'))] = {
  ...extra[prepKey], text: 'Saved correction ' + n, orig: 'Typed correction ' + n, recipe: '', done: false
};
const dump = p => p.evaluate(() => window.__fake.dump());
const history = async p => Object.entries(await dump(p)).filter(([path]) => /\/proofHistory\/[^/]+$/.test(path));
const privateWrites = p => p.evaluate(() => window.__fake.writes.flat().filter(op => /\/(proofHistory|config)\//.test(op.path) || /\/days\/.*\/items\/|\/orders\/.*\/lines\//.test(op.path)));
const search = async (p, text) => { await p.fill('[data-k="lv-q:pr-corrections"]', text); await L.settle(p, 250); };
const review = async (p, source, id) => {
  const value = source + '/' + yesterday + '/' + id;
  await p.locator('[data-pr="review"]').evaluateAll((nodes, value) => {
    const button = nodes.find(el => el.getAttribute('data-value') === value);
    if (!button) throw Error('Missing correction ' + value);
    button.click();
  }, value);
};
const open = async (b, width = 360) => {
  const p = await L.open(b, '#/admin', { admin: true, who: '', width, height: 900, extra, wait: 1600 });
  p.initialProofWrites = (await privateWrites(p)).length;
  await L.adminTab(p, 'proofreader');
  await L.waitFor(p, () => document.querySelector('.pr-workspace') && document.querySelectorAll('[data-pr="review"]').length > 1, null, 10000);
  return p;
};
const status = (p, expression) => L.waitFor(p, expression => new RegExp(expression, 'i').test((document.querySelector('.pr-status') || {}).textContent || '') && !LK_PROOFREADER.busy(), expression);
const changed = (before, after, fields) => fields.every(field => JSON.stringify(before[field]) === JSON.stringify(after[field]));

(async () => {
  const b = await L.start();
  for (const width of [360, 1280]) {
    const p = await open(b, width);
    const present = await p.locator('.pr-workspace').count() > 0;
    ok(present, width + ': admin can open the Proofreader repair page from Review desk');
    if (!present) { await p.context().close(); continue; }
    ok(await privateWrites(p).then(writes => writes.length === p.initialProofWrites), width + ': opening review creates no repair or dictionary writes');
    const initialRows = await p.locator('.pr-list [data-pr="review"]').count();
    await p.click('[data-p="lv-more"][data-lv="pr-corrections"]');
    ok(initialRows === 15 && await p.locator('.pr-list [data-pr="review"]').count() === 23, width + ': corrections use a searchable list with Show more for later rows');
    await search(p, 'Cut brie');
    ok(await p.locator('.pr-list [data-pr="review"]').count() === 1, width + ': searching original wording finds the corrected prep line');
    await review(p, 'prep', 'pr-brie');
    ok(/Typed originally/.test(await L.txt(p, '.pr-comparison')) && /Cut brie/.test(await L.txt(p, '.pr-comparison')) && /Saved now/.test(await L.txt(p, '.pr-comparison')) && /Cut brine/.test(await L.txt(p, '.pr-comparison')), width + ': review clearly distinguishes typed wording from saved wording');
    const focus = await p.evaluate(() => { const heading = document.querySelector('.pr-detail .ai-task-heading'), r = heading.getBoundingClientRect(); return { focused: document.activeElement === heading, visible: r.top >= 0 && r.top < innerHeight }; });
    ok(focus.focused && focus.visible, width + ': review is visible and focused when opened (' + JSON.stringify(focus) + ')');
    await p.click('[data-pr="restore"]'); await status(p, 'Original wording restored');
    let store = await dump(p), repaired = store[prepKey], events = await history(p), audit = events.find(([, event]) => event.recordId === 'pr-brie');
    ok(repaired.text === 'Cut brie' && repaired.orig === 'Cut brie' && repaired.recipe === '' && changed(extra[prepKey], repaired, ['qty', 'done', 'doneBy', 'doneById', 'doneAt', 'addedBy', 'addedById', 'addedAt', 'station']), width + ': restoring prep keeps its original, quantity, ticks and author and clears the derived recipe');
    ok(events.length === 1 && audit && repaired.proofV === 1 && repaired.proofEvent === audit[0].split('/').pop() && audit[1].action === 'restore' && audit[1].before === 'Cut brine' && audit[1].after === 'Cut brie' && audit[1].original === 'Cut brie' && audit[1].by === '' && store[cfgKey].pastEdit.p === audit[1].at, width + ': prep repair and immutable audit share the version, writer and report invalidation timestamp');
    await search(p, 'Cut brie');
    ok(await p.locator('[data-pr="review"]').count() === 0, width + ': a restored line leaves the correction queue after acknowledgement');

    await search(p, 'Brie wedges'); await review(p, 'orders', 'pr-order'); await p.click('[data-pr="edit"]');
    const edited = 'Brie wedges, cut for service';
    await p.fill('#pr-text', edited); await p.click('.wtop [data-act="back"]');
    ok(await p.locator('.pr-resume [data-pr="resume"]').isVisible() && await p.evaluate(() => LK_PREP.unsaved()), width + ': header Back returns to the list and makes the unfinished correction resumable');
    await L.adminTab(p, 'people');
    ok(await p.locator('.pr-resume [data-pr="resume"]').isVisible(), width + ': the correction remains discoverable on another admin page');
    await p.click('.pr-resume [data-pr="resume"]');
    ok(await p.inputValue('#pr-text') === edited && await p.inputValue('[data-k="lv-q:pr-corrections"]') === 'Brie wedges', width + ': Resume restores the edited wording and list search');
    await p.evaluate(path => { window.__fake.write(path, { ...window.__fake.dump()[path], qty: '8 trays', ordered: false, orderedAt: 0 }); window.__fake.deny = /\/proofHistory\//; }, orderKey);
    await p.click('[data-pr="save"]'); await status(p, 'not saved|Could not save');
    ok(await p.inputValue('#pr-text') === edited && await p.evaluate(() => LK_PREP.unsaved()) && (await dump(p))[orderKey].text === 'Brine wedges' && (await history(p)).length === 1, width + ': a rejected repair keeps the draft and makes no partial line or history change');
    await p.evaluate(path => {
      window.__fake.deny = null;
      const fs = LK_PREP.book().fs(), original = fs.getDocFromServer;
      fs.getDocFromServer = function (ref) {
        const result = original(ref);
        if ((ref.path || []).join('/') !== path) return result;
        fs.getDocFromServer = original;
        return result.then(snapshot => { window.__fake.mode = 'hold'; return snapshot; });
      };
    }, orderKey);
    await p.click('[data-pr="save"]');
    await L.waitFor(p, () => window.__fake.writes.flat().filter(op => /\/proofHistory\//.test(op.path)).length >= 3 && LK_PROOFREADER.busy());
    ok(await p.locator('#pr-text').isDisabled() && await p.locator('.wtop [data-act="back"]').isDisabled() && await p.locator('[data-p="a-group"]').first().isDisabled() && await p.evaluate(() => LK_PREP.unsaved()), width + ': pending repair blocks field edits, Back and admin navigation until acknowledgement');
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); }); await status(p, 'Correction saved');
    store = await dump(p); repaired = store[orderKey]; events = await history(p); audit = events.find(([, event]) => event.recordId === 'pr-order');
    ok(repaired.text === edited && repaired.orig === 'Brie wedges' && repaired.qty === '8 trays' && repaired.ordered === false && repaired.recipes.length === 0 && changed(extra[orderKey], repaired, ['addedBy', 'addedById', 'addedAt']), width + ': order wording saves exactly and preserves a concurrent quantity and tick change');
    ok(events.length === 2 && audit && audit[1].action === 'edit' && audit[1].before === 'Brine wedges' && audit[1].after === edited && audit[1].original === 'Brie wedges' && repaired.proofEvent === audit[0].split('/').pop() && store[cfgKey].pastEdit.o === audit[1].at, width + ': order repair records an atomic before/after event and order-report invalidation');
    const immutable = await p.evaluate(async eventPath => {
      const fs = LK_PREP.book().fs(), db = LK_PREP.book().db();
      try { await fs.updateDoc(fs.doc(db, ...eventPath.split('/')), { after: 'Changed history', by: '' }); return false; } catch (error) { return error.code === 'permission-denied'; }
    }, audit[0]);
    ok(immutable && (await dump(p))[audit[0]].after === edited, width + ': an existing audit event cannot be overwritten');

    await search(p, ''); await review(p, 'prep', 'pr-hostile');
    ok((await L.txt(p, '.pr-comparison')).includes(hostileTyped) && !(await p.locator('.pr-workspace img, .pr-workspace svg').count()) && !(await p.evaluate(() => window.__proofInjected)), width + ': hostile typed and saved wording is displayed as text');
    await p.click('[data-pr="edit"]'); const literal = '<b>Keep brie</b> & "quotes"'; await p.fill('#pr-text', literal);
    await p.click('[data-pr="save"]'); await status(p, 'Correction saved');
    await p.click('[data-pr="tab"][data-value="history"]');
    await L.waitFor(p, () => /Wording edited/.test((document.querySelector('.pr-history') || {}).textContent || ''));
    ok((await dump(p))[hostileKey].text === literal && (await L.txt(p, '.pr-history')).includes(literal) && !(await p.locator('.pr-history b, .pr-history img, .pr-history svg').count()) && !(await p.evaluate(() => window.__proofInjected)), width + ': exact manual wording and history stay escaped instead of creating markup');
    ok(!(await L.overflow(p)), width + ': correction lists, details and history fit without sideways scroll');
    if (width === 1280) {
      await p.click('[data-pr="tab"][data-value="words"]'); await p.fill('#pr-word', 'brie');
      await p.click('[data-pr="keep"]'); await status(p, 'will be left alone');
      const beforeCopy = await dump(p), beforeHistory = await history(p);
      await L.adminTab(p, 'tools');
      const downloaded = p.waitForEvent('download', { timeout: 15000 }); await p.click('[data-p="export"]');
      const chunks = []; for await (const chunk of await (await downloaded).createReadStream()) chunks.push(chunk);
      const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      ok(backup.proofHistory.length === beforeHistory.length && beforeHistory.every(([path, event]) => backup.proofHistory.some(saved => saved.id === path.split('/').pop() && saved.before === event.before && saved.after === event.after && saved.word === event.word && saved.at === event.at)) && backup.config.proofWords.includes('brie'), 'manual Backup preserves exact repair events and the protected-word configuration');
      ok(backup.days[yesterday].some(row => row.id === 'pr-brie' && row.text === 'Cut brie' && row.proofEvent === beforeCopy[prepKey].proofEvent) && backup.orders[yesterday].some(row => row.id === 'pr-order' && row.text === edited && row.proofV === 1), 'manual Backup retains repaired prep and order wording with their audit pointers');
      await p.fill('#a-newpin', '4321'); await p.fill('#a-newpin2', '4321'); await p.click('[data-p="move-pin"]'); await L.settle(p, 100); await p.click('[data-p="move-pin"]');
      await L.waitFor(p, () => !LK_PREP.state.moving, null, 15000);
      const copied = await dump(p), destination = path => path.replace('kitchens/' + L.PIN + '/', 'kitchens/4321/');
      ok(/^Copied/.test(await p.evaluate(() => LK_PREP.state.moveMsg)) && beforeHistory.every(([path, event]) => JSON.stringify(copied[destination(path)]) === JSON.stringify(event)) && JSON.stringify(copied[destination(cfgKey)].proofWords) === JSON.stringify(beforeCopy[cfgKey].proofWords), 'PIN copying preserves immutable history and protected words without refused records');
      ok(JSON.stringify(copied[destination(prepKey)]) === JSON.stringify(beforeCopy[prepKey]) && JSON.stringify(copied[destination(orderKey)]) === JSON.stringify(beforeCopy[orderKey]), 'PIN copying preserves both repaired source records and their original attribution');
    }
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  const admin = await open(b);
  await search(admin, 'Cut brie'); await review(admin, 'prep', 'pr-brie'); await admin.click('[data-pr="edit"]');
  await admin.fill('#pr-text', 'Keep my stale wording');
  await admin.evaluate(path => { window.__fake.write(path, { ...window.__fake.dump()[path], text: 'Changed on another device', proofV: 1, proofEvent: 'remote-line' }); }, prepKey);
  await admin.click('[data-pr="save"]'); await status(admin, 'changed elsewhere');
  ok(await admin.inputValue('#pr-text') === 'Keep my stale wording' && (await dump(admin))[prepKey].text === 'Changed on another device' && (await history(admin)).length === 0, 'a stale source is never overwritten and its proposed correction stays in the editor');
  await admin.click('[data-pr="cancel"]'); await admin.click('[data-pr="tab"][data-value="words"]');
  await admin.fill('#pr-word', 'Carorts'); await admin.click('[data-pr="keep"]'); await status(admin, 'will be left alone');
  let config = (await dump(admin))[cfgKey], wordEvents = await history(admin);
  ok(config.proofWords.join(',') === 'carorts' && config.proofV === 1 && wordEvents.length === 1 && wordEvents[0][1].kind === 'word' && wordEvents[0][1].action === 'keep' && wordEvents[0][1].word === 'carorts' && config.proofEvent === wordEvents[0][0].split('/').pop(), 'Always keep normalises one word and saves a matching versioned audit event');
  await admin.fill('#pr-word', '<img src=x>'); await admin.click('[data-pr="keep"]'); await status(admin, 'Enter one word');
  ok((await history(admin)).length === 1 && (await dump(admin))[cfgKey].proofV === 1, 'invalid shared words cannot write markup or change the shared list');
  await admin.fill('#pr-word', 'parmyy');
  await admin.evaluate(path => {
    const fs = LK_PREP.book().fs(), original = fs.getDocFromServer;
    fs.getDocFromServer = function (ref) {
      const result = original(ref); if ((ref.path || []).join('/') !== path) return result;
      fs.getDocFromServer = original;
      return result.then(snapshot => { const current = window.__fake.dump()[path]; window.__fake.write(path, { ...current, proofWords: current.proofWords.concat(['salmom']), proofV: current.proofV + 1, proofEvent: 'remote-word' }); return snapshot; });
    };
  }, cfgKey);
  await admin.click('[data-pr="keep"]'); await status(admin, 'not saved');
  ok(await admin.inputValue('#pr-word') === 'parmyy' && (await dump(admin))[cfgKey].proofWords.join(',') === 'carorts,salmom' && (await history(admin)).length === 1, 'a concurrent shared-word save preserves the other device change and retains this entry for retry');
  await admin.click('[data-pr="keep"]'); await status(admin, 'will be left alone');
  ok((await dump(admin))[cfgKey].proofWords.join(',') === 'carorts,salmom,parmyy' && (await dump(admin))[cfgKey].proofV === 3, 'retry adds the intended word without losing concurrent protected words');

  const staff = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1400 });
  config = (await dump(admin))[cfgKey];
  const shared = await staff.evaluate(({ path, config }) => {
    const before = window.__fake.reads.length;
    window.__fake.write(path, { ...window.__fake.dump()[path], ...config });
    return before;
  }, { path: cfgKey, config });
  await L.settle(staff, 200);
  ok(await staff.evaluate(() => LK_PREP.proofread('Slice carorts').text) === 'Slice carorts', 'a protected word received from another device is preserved on the staff phone');
  ok(await staff.evaluate(n => window.__fake.reads.length === n, shared), 'shared word protection uses the existing config listener without issuing another read');
  ok(!(await staff.evaluate(() => window.__fake.reads.some(path => /\/proofHistory(?:\/|$)/.test(path)))) && !(await staff.locator('.pr-workspace').count()), 'staff entry reads no private proofreader history or admin page');
  const denied = await staff.evaluate(async () => { const api = LK_PREP.book(), fs = api.fs(); try { await fs.getDocs(fs.collection(api.db(), 'kitchens', '000000', 'proofHistory')); return false; } catch (error) { return error.code === 'permission-denied'; } });
  ok(denied, 'a staff SDK query for private proofreader history is refused');
  await admin.click('[data-pr="release"][data-value="carorts"]'); await status(admin, 'removed from the shared list');
  config = (await dump(admin))[cfgKey];
  await staff.evaluate(({ path, config }) => window.__fake.write(path, { ...window.__fake.dump()[path], ...config }), { path: cfgKey, config });
  await L.settle(staff, 150);
  ok(await staff.evaluate(() => LK_PREP.proofread('Slice carorts').text) === 'Slice carrots' && (await history(admin)).some(([, event]) => event.kind === 'word' && event.action === 'release' && event.word === 'carorts'), 'removing a protected word restores ordinary autocorrect and records the release');
  await admin.evaluate(() => {
    const fs = LK_PREP.book().fs(), original = fs.getDocsFromServer;
    fs.getDocsFromServer = function (ref) {
      const result = original(ref); if (!/\/proofHistory$/.test((ref.path || []).join('/'))) return result;
      fs.getDocsFromServer = original;
      return result.then(snapshot => new Promise(resolve => { window.__releaseOldProofHistory = () => resolve(snapshot); }));
    };
  });
  await admin.click('[data-pr="tab"][data-value="history"]');
  await L.waitFor(admin, () => typeof window.__releaseOldProofHistory === 'function');
  await admin.click('[data-pr="tab"][data-value="words"]'); await admin.fill('#pr-word', 'brie'); await admin.click('[data-pr="keep"]'); await status(admin, 'will be left alone');
  await admin.evaluate(() => window.__releaseOldProofHistory());
  await admin.click('[data-pr="tab"][data-value="history"]');
  await L.waitFor(admin, () => /brie/.test((document.querySelector('.pr-history') || {}).textContent || ''));
  ok((await L.txt(admin, '.pr-history')).includes('brie') && (await history(admin)).length === 4, 'a history response begun before an acknowledged word save cannot hide the new audit event');
  ok(admin.errors.length === 0 && staff.errors.length === 0, 'word, concurrency and staff privacy journeys have no browser errors');
  await staff.context().close(); await admin.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
