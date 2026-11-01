// A definite atomic refusal may end pending work after authority is removed. An unknown ACK must still wait.
// Every name, PIN, draft and record in these checks is synthetic.
const L = require('./lib');
const { R, ok } = L.results();
const draft = 'Original work kept after access changed';
const nextText = 'Clean new recorder prep';

async function ready(p, admin) {
  await L.waitFor(p, admin => LK_PREP.privateAccess() && !LK_PREP.unsent() && (!admin || LK_PREP.ownerHere()), admin, 8000);
  await p.fill('#p-text', draft);
}

async function begin(p, { admin = false, refusal = false, changeHead = false } = {}) {
  await p.evaluate(async ({ admin, refusal, changeHead }) => {
    const book = LK_PREP.book(), fb = await book.ready(), state = LK_PREP.state;
    const context = book.writeContext();
    window.__revokedDone = false; window.__revokedError = '';
    window.__revokedOriginalIdentity = book.identity();
    if (refusal) {
      const originalReject = Promise.reject;
      // Delay the SDK's actual atomic rejection, without changing a ticket or inventing an acknowledgement.
      Promise.reject = function (error) {
        if (error && error.code === 'permission-denied') {
          Promise.reject = originalReject; __fake.mode = 'ok';
          return new Promise((resolve, reject) => { window.__releaseRevokedRefusal = () => reject(error); });
        }
        return originalReject.call(Promise, error);
      };
    }
    const ref = changeHead ? fb.fs.doc(fb.db, 'kitchens', state.pin, 'config', 'main') : admin
      ? fb.fs.doc(fb.db, 'kitchens', state.pin, 'daily', 'revoked-work-example')
      : fb.fs.doc(fb.db, 'kitchens', state.pin, 'days', LK_TIME.day(), 'items', 'revoked-work-example');
    window.__revokedPath = Array.isArray(ref.path) ? ref.path.join('/') : ref.path;
    window.__revokedInitialAttempts = __fake.writes.flat().filter(op => op.path === window.__revokedPath).length;
    const old = __fake.dump()[window.__revokedPath];
    const data = changeHead ? { ...old, headId: 'sam' } : admin ? { example: 'Original admin operation' }
      : { text: 'Original staff operation', qty: '2 tubs', station: 'Larder', done: false, deleted: false, addedBy: 'Ann', addedById: 'ann', addedAt: LK_TIME.now() };
    const ops = [['set', ref, data]];
    if (changeHead) {
      const roster = Object.fromEntries(['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].filter(key => data[key] !== undefined).map(key => [key, data[key]]));
      ops.push(['set', fb.fs.doc(fb.db, 'kitchens', state.pin, 'login', 'roster'), roster]);
    }
    __fake.mode = refusal ? 'deny' : 'hold';
    book.W(ops, context).then(
      () => { window.__revokedDone = true; },
      error => { window.__revokedError = error.code || 'failed'; });
  }, { admin, refusal, changeHead });
  await L.waitFor(p, refusal => LK_PREP.unsent() && (refusal ? !!window.__releaseRevokedRefusal : !!__fake.dump()[window.__revokedPath]), refusal);
  // Other synthetic-server changes must not release the held operation's response.
  await p.evaluate(() => { __fake.mode = 'ok'; });
}

async function revoke(p, admin) {
  await p.evaluate(admin => {
    const key = 'kitchens/' + LK_PREP.state.pin + '/config/main', old = __fake.dump()[key];
    const next = admin ? { ...old, headId: 'sam' }
      : { ...old, staffIds: old.staffIds.filter(id => id !== 'ann'), people: old.people.map(person => person.id === 'ann' ? { ...person, active: false } : person) };
    // A change from another synthetic device updates the canonical config and its minimal login roster.
    __fake.write(key, next);
  }, admin);
  await L.waitFor(p, admin => !LK_PREP.ownerHere() && (admin || !LK_PREP.privateAccess()), admin);
}

async function snapshot(p) {
  return p.evaluate(() => ({
    who: LK_PREP.state.who, authed: LK_PREP.state.authed, private: LK_PREP.privateAccess(), owner: LK_PREP.ownerHere(),
    lock: LK_PREP.workLock(), blocked: LK_PREP.blockedRecorder(), unsent: LK_PREP.unsent(), dirty: LK_PREP.dirtyForUpdate(),
    text: LK_PREP.state.text, done: window.__revokedDone, error: window.__revokedError,
    saved: __fake.dump()[window.__revokedPath], heading: document.querySelector('#rtitle')?.textContent,
    status: [...document.querySelectorAll('[role="status"],.p-err')].map(el => el.textContent).join(' '),
    attempts: __fake.writes.flat().filter(op => op.path === window.__revokedPath).length - window.__revokedInitialAttempts
  }));
}

async function deniedAdminRead(p) {
  return p.evaluate(async () => {
    const fb = await LK_PREP.book().ready();
    try { await fb.fs.getDocFromServer(fb.fs.doc(fb.db, 'kitchens', LK_PREP.state.pin, 'config', 'admins')); return false; }
    catch (error) { return error.code === 'permission-denied'; }
  });
}

async function handover(p, label, expectedAttempts = 1) {
  const change = p.locator('[data-p="who-change"]');
  await L.waitFor(p, () => !!document.querySelector('[data-p="who-change"]'));
  await change.first().click();
  await L.settle(p, 120);
  ok(await p.evaluate(text => LK_PREP.dirtyForUpdate() && LK_PREP.state.text === text && !!LK_PREP.workLock(), draft), label + ': first discard tap retains the original draft and lock');
  await change.first().click();
  await L.waitFor(p, () => !LK_PREP.workLock() && !LK_PREP.dirtyForUpdate() && !LK_PREP.unsent());
  ok(await p.evaluate(() => !LK_PREP.state.text && !LK_PREP.blockedRecorder()), label + ': explicit second tap discards only the retained work and frees handover');
  await p.locator('.p-name[data-id="sam"]').click();
  await p.locator('#pf1').fill('1111');
  await L.waitFor(p, () => LK_PREP.state.authed && LK_PREP.state.who === 'sam' && LK_PREP.privateAccess(), null, 8000);
  ok(await p.locator('#p-text').inputValue() === '', label + ': the next person sees a clean form');
  ok(await p.evaluate(() => !LK_PREP.ownerHere()), label + ': the next PIN session does not inherit the original Google admin grant');
  ok(await deniedAdminRead(p), label + ': the next person is still refused a private admin read by the server');
  await p.fill('#p-text', nextText); await p.press('#p-text', 'Enter');
  await L.waitFor(p, text => Object.entries(__fake.dump()).some(([key, value]) => /\/items\//.test(key) && value.text === text && value.by === 'sam'), nextText);
  ok(await p.evaluate(attempts => !LK_PREP.unsent() && !__fake.dump()[window.__revokedPath] && __fake.writes.flat().filter(op => op.path === window.__revokedPath).length - window.__revokedInitialAttempts === attempts, expectedAttempts), label + ': new work saves as Sam without replaying the refused payload');
}

(async () => {
  const b = await L.start();
  try {
    for (const admin of [false, true]) {
      const id = admin ? 'head' : 'ann', label = admin ? 'head replaced after atomic refusal' : 'staff removed after atomic refusal';
      const p = await L.open(b, '#/prep', { admin, who: id, deviceMode: 'shared', wait: 1000 });
      try {
        await ready(p, admin); await begin(p, { admin, refusal: true }); await revoke(p, admin);
        await p.evaluate(() => window.__releaseRevokedRefusal());
        await L.waitFor(p, () => !LK_PREP.unsent() && window.__revokedError === 'permission-denied', null, 8000);
        const s = await snapshot(p);
        ok(!s.done && !s.saved && s.attempts === 1, label + ': known rejection ends pending without writing or replaying its payload');
        ok(s.text === draft && s.dirty && s.lock?.identity === await p.evaluate(() => window.__revokedOriginalIdentity) && s.blocked === id, label + ': the original recorder keeps their unsaved draft behind the lock');
        ok(!s.private && !s.owner && !await p.locator('#p-text').count(), label + ': the retained private draft is hidden after access loss');
        ok(/save was refused because (your )?access changed/i.test(s.status) && /kept until you discard/i.test(s.status), label + ': the lock explains why the save ended and that the work is kept');
        const other = p.locator('.p-name[data-id="sam"]');
        if (await other.count() && await other.isVisible()) {
          await other.click(); await L.settle(p, 120);
          ok(await p.evaluate(id => LK_PREP.state.who === id && LK_PREP.blockedRecorder() === id && !LK_PREP.privateAccess(), id), label + ': another person cannot claim the retained draft');
        }
        await handover(p, label);
        ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
      } catch (error) {
        ok(false, label + ': ' + String(error.message || error).split('\n')[0]);
        console.log(label + ' diagnostic:', JSON.stringify(await snapshot(p)));
      } finally { await p.context().close(); }
    }

    const late = await L.open(b, '#/prep', { admin: true, who: 'head', deviceMode: 'shared', wait: 1000 });
    try {
      const label = 'head replaced before the SDK write starts';
      await ready(late, true);
      await late.evaluate(async () => {
        const book = LK_PREP.book();
        window.__revokedContext = book.writeContext();
        window.__revokedOriginalIdentity = book.identity();
        const fb = await book.ready();
        window.__revokedRef = fb.fs.doc(fb.db, 'kitchens', LK_PREP.state.pin, 'daily', 'revoked-work-example');
        window.__revokedPath = Array.isArray(window.__revokedRef.path) ? window.__revokedRef.path.join('/') : window.__revokedRef.path;
        window.__revokedInitialAttempts = __fake.writes.flat().filter(op => op.path === window.__revokedPath).length;
        window.__revokedDone = false; window.__revokedError = '';
      });
      await revoke(late, true);
      await L.waitFor(late, () => LK_PREP.book().writeContext().canonicalSerial > window.__revokedContext.canonicalSerial);
      // Save captured its recorder before an asynchronous read. Authority changed before that read could return.
      await late.evaluate(() => {
        LK_PREP.book().W([['set', window.__revokedRef, { example: 'Original admin operation after an async read' }]], window.__revokedContext).then(
          () => { window.__revokedDone = true; },
          error => { window.__revokedError = error.code || 'failed'; });
      });
      await L.waitFor(late, () => !LK_PREP.unsent() && window.__revokedError === 'permission-denied', null, 8000);
      const s = await snapshot(late);
      ok(!s.done && !s.saved && s.attempts === 0, label + ': lost authority ends the save before any SDK write or replay');
      ok(s.text === draft && s.dirty && s.lock?.identity === await late.evaluate(() => window.__revokedOriginalIdentity) && s.blocked === 'head', label + ': the original recorder retains the draft behind the lock');
      ok(!s.private && !s.owner && !await late.locator('#p-text').count(), label + ': the retained private draft stays hidden');
      ok(/save was refused because (your )?access changed/i.test(s.status) && /kept until you discard/i.test(s.status), label + ': the lock explains the refusal and explicit discard');
      await handover(late, label, 0);
      ok(!late.errors.length, label + ': no browser errors ' + late.errors.join(' | '));
    } catch (error) {
      ok(false, 'head replaced before the SDK write starts: ' + String(error.message || error).split('\n')[0]);
      console.log('never-attempted head save diagnostic:', JSON.stringify(await snapshot(late)));
    } finally { await late.context().close(); }

    const accepted = await L.open(b, '#/prep', { admin: true, who: 'head', deviceMode: 'shared', wait: 1000 });
    try {
      const label = 'known admin ACK after its own head change';
      await ready(accepted, true); await begin(accepted, { admin: true, changeHead: true });
      await L.waitFor(accepted, () => !LK_PREP.ownerHere());
      ok(await accepted.evaluate(() => LK_PREP.unsent() && !window.__revokedDone && !window.__revokedError), label + ': the unknown response stays pending while current admin access is removed');
      await accepted.evaluate(() => __fake.release());
      await L.waitFor(accepted, () => window.__revokedDone && !LK_PREP.unsent(), null, 8000);
      const s = await snapshot(accepted);
      const savedOnce = !s.error && s.saved?.headId === 'sam' && s.saved?.by === 'head' && s.attempts === 1;
      if (!savedOnce) console.log('accepted head change diagnostic:', JSON.stringify(s));
      ok(savedOnce, label + ': accepted change resolves once with its original recorder despite the lost role');
      ok(!s.owner && await deniedAdminRead(accepted), label + ': resolving the known response does not restore admin access');
      ok(s.text === draft && s.dirty, label + ': the separate unsubmitted draft survives the accepted save');
      ok(!accepted.errors.length, label + ': no browser errors ' + accepted.errors.join(' | '));
    } catch (error) {
      ok(false, 'known admin ACK after its own head change: ' + String(error.message || error).split('\n')[0]);
      console.log('known admin ACK diagnostic:', JSON.stringify(await snapshot(accepted)));
    } finally { await accepted.context().close(); }

    const ambiguous = await L.open(b, '#/prep', { who: 'ann', deviceMode: 'shared', wait: 1000 });
    try {
      const label = 'unknown ACK after staff removal';
      await ready(ambiguous, false); await begin(ambiguous); await revoke(ambiguous, false);
      const before = await snapshot(ambiguous);
      ok(before.unsent && !before.done && !before.error && before.blocked === 'ann', label + ': authority loss cannot turn an unknown response into an atomic refusal');
      ok(await ambiguous.evaluate(() => !LK_PREP.signOut(true) && LK_PREP.unsent()), label + ': forced handover cannot abandon an uncertain write');
      const change = ambiguous.locator('[data-p="who-change"]');
      if (await change.count() && await change.first().isVisible()) {
        await change.first().click(); await L.settle(ambiguous, 120); await change.first().click();
      }
      const other = ambiguous.locator('.p-name[data-id="sam"]');
      if (await other.count() && await other.isVisible()) await other.click();
      await L.settle(ambiguous, 200);
      const after = await snapshot(ambiguous);
      ok(after.unsent && after.who === 'ann' && after.blocked === 'ann' && !after.done && !after.error, label + ': change-person taps cannot discard pending work or transfer its recorder');
      ok(after.text === draft && after.dirty && !after.private, label + ': the original draft remains hidden and retained');
      ok(after.attempts === 1 && after.saved?.by === 'ann' && after.saved?.text === 'Original staff operation', label + ': uncertain work is never replayed, even when a local snapshot contains it');
      ok(!ambiguous.errors.length, label + ': no browser errors ' + ambiguous.errors.join(' | '));
    } catch (error) {
      ok(false, 'unknown ACK after staff removal: ' + String(error.message || error).split('\n')[0]);
      console.log('unknown ACK diagnostic:', JSON.stringify(await snapshot(ambiguous)));
    } finally { await ambiguous.context().close(); }
  } finally { await b.close(); }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
