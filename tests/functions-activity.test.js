// Functions-only PIN login must not submit the kitchen activity write that the real rules refuse. Its permitted
// function and delivery work remains available, while an ordinary staff PIN still records that person's visit.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const config = {
  people: [
    { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
    { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
    { id: 'fay', name: 'Fay', role: 'fnc', active: true, fn: true }
  ], staffIds: ['sam', 'ann', 'fay'], sousIds: ['sam'], fnIds: ['fay'], fnOnlyIds: ['fay']
};
const extra = {
  [key('config', 'main')]: config,
  [key('pinset', 'fay')]: { at: 1 },
  [key('staffpins', 'fay')]: { hash: L.sha('lk:fay:5151') },
  [key('activity', 'ann')]: { name: 'Ann', visits: 3, lastSeen: L.NOW - 60000 }
};
const activity = p => p.evaluate(prefix => ({
  attempts: __fake.writes.flat().filter(o => o.path.startsWith(prefix)),
  refused: __fake.refused.filter(o => o.path.startsWith(prefix)),
  saved: __fake.dump()[prefix + 'fay']
}), key('activity') + '/');
async function enter(p, who, pin) {
  await L.waitFor(p, who => { const s = LK_PREP.state; return s.who === who && !s.authed && s.configState === 'ok' && s.pinStep === 'enter' && !!document.querySelector('#pf1'); }, who);
  await p.fill('#pf1', pin);
  await L.waitFor(p, who => { const s = LK_PREP.state; return s.who === who && s.authed && s.sessFor === who && s.configState === 'ok'; }, who);
}
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/functions', { extra, who: 'fay', noTok: true, wait: 1200 });
  // Match the real activity rule for this account without weakening any permitted function or delivery operation.
  await p.evaluate(() => { __fake.deny = /\/activity\/fay$/; });
  await enter(p, 'fay', '5151');
  await L.waitFor(p, () => LK_PREP.functionOnly() && !!document.querySelector('#fe-root'));
  await L.settle(p, 300);
  let a = await activity(p);
  ok(a.attempts.length === 0 && a.refused.length === 0 && !a.saved, 'a real functions-only PIN login sends no kitchen activity attempt or refusal');
  ok(await p.evaluate(() => LK_PREP.fnOK() && LK_PREP.state.authed), 'functions-only login keeps its own live session and booking permission');

  await p.goto(L.BASE + '#/functions/new'); await p.waitForSelector('[data-ff="name"]');
  await p.fill('[data-ff="name"]', 'Synthetic activity check');
  await p.click('[data-fe="save"]');
  await L.waitFor(p, prefix => Object.entries(__fake.dump()).some(([k, d]) => k.startsWith(prefix) && d.name === 'Synthetic activity check' && d.status === 'draft' && d.by === 'fay'), key('functions') + '/');
  ok(await p.evaluate(prefix => Object.entries(__fake.dump()).filter(([k, d]) => k.startsWith(prefix) && d.name === 'Synthetic activity check' && d.by === 'fay').length === 1, key('functions') + '/'), 'the same functions-only session saves one attributed booking draft');

  await p.goto(L.BASE + '#/deliveries'); await p.waitForSelector('#dl-supplier');
  await p.fill('#dl-supplier', 'Synthetic delivery'); await p.fill('#dl-chilled', '0'); await p.fill('#dl-frozen', '-18');
  await p.click('#dl-form button[type="submit"]');
  await L.waitFor(p, prefix => Object.entries(__fake.dump()).some(([k, d]) => k.startsWith(prefix) && d.supplier === 'Synthetic delivery' && d.by === 'fay'), key('deliveries') + '/');
  ok(await p.evaluate(prefix => Object.entries(__fake.dump()).filter(([k, d]) => k.startsWith(prefix) && d.supplier === 'Synthetic delivery' && d.receivedById === 'fay' && d.chilled === 0 && d.frozen === -18).length === 1, key('deliveries') + '/'), 'the same session records one attributed zero/negative delivery receipt');
  a = await activity(p);
  ok(a.attempts.length === 0 && a.refused.length === 0 && !a.saved, 'permitted function and delivery work adds no kitchen activity write');
  await p.goto(L.BASE + '#/orders');
  await L.waitFor(p, () => /Functions account/.test(document.body.innerText));
  ok(!await p.$('.nb-row'), 'the housekeeping fix grants no order-list access');
  await p.reload(); await L.settle(p, 1200);
  a = await activity(p);
  ok(await p.evaluate(() => LK_PREP.state.authed && LK_PREP.functionOnly()) && a.attempts.length === 0 && !a.saved, 'restoring the functions-only session still skips activity');
  ok(p.errors.length === 0, 'functions-only journeys have no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/prep', { extra, who: 'ann', noTok: true, wait: 1200 });
  await enter(p, 'ann', '2222');
  await L.waitFor(p, k => (__fake.dump()[k] || {}).visits === 4, key('activity', 'ann'));
  ok(await p.evaluate(k => { const d = __fake.dump()[k]; return d.visits === 4 && d.name === 'Ann' && d.by === 'ann'; }, key('activity', 'ann')), 'an ordinary staff PIN still records exactly one attributed visit');
  ok(p.errors.length === 0, 'ordinary staff login has no page errors ' + p.errors.join(' | '));
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
