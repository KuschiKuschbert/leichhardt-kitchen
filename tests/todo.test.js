// The chef to-do list (#/todo, 23 Oct 2026): one list shared by the head chef and the sous chefs, from Chef to-do in the
// chef hat menu. Staff never get the menu row, the page or a read of the list (the rules lock it, the stand-in too).
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const todoReads = p => p.evaluate(() => (window.__fake.reads || []).filter(k => /\/todos(\/|$)/.test(k)).length);
const rows = (p, lv) => p.$$eval('[data-lv="' + (lv || 'todo') + '"] .todo-row .todo-text', l => l.map(e => e.textContent));
const T = (id, x) => ({ [fsKey(['todos', id])]: Object.assign({ text: 'Job ' + id, st: 'open', due: '', for: '', from: 'sam', at: L.NOW - 3600000, doneAt: 0, doneBy: '', upd: L.NOW - 3600000, by: 'sam' }, x) });
(async () => {
  const b = await L.start();
  const seed = Object.assign({}, T('t1', { text: 'Book the hood clean', due: '2020-01-01' }), T('t2', { text: 'Order new tongs', for: 'sam' }),
    T('t3', { text: 'Old job, removed', st: 'gone' }), T('t4', { text: 'Fixed the dishwasher', st: 'done', doneAt: L.NOW - 7200000, doneBy: 'sam' }));

  // a sous chef: Chef to-do in the chef hat menu, the page lists the open jobs, overdue first
  let p = await L.open(b, '#/', { who: 'sam', extra: seed, wait: 1500 });
  ok((await L.chefItems(p)).indexOf('todo') >= 0, 'sous chef: the chef hat menu offers Chef to-do');
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm a[href="#/todo"]');
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 2, null, 6000).catch(() => {});
  ok(/Chef to-do/.test(await txt(p, '#rtitle') || ''), 'page: called Chef to-do');
  ok(/Staff cannot see it/.test(await txt(p, '.todo-page') || ''), 'page: says staff cannot see it');
  let l = await rows(p);
  ok(l.length === 2 && l[0] === 'Book the hood clean' && l[1] === 'Order new tongs', 'page: the 2 open jobs, the overdue one first (' + l.join(' / ') + ')');
  ok(/Was due/.test(await txt(p, '.todo-row.is-late .todo-due') || ''), 'page: an overdue job says when it was due');
  ok(/For Sam/.test(await p.$$eval('.todo-row', r => r[1].textContent)), 'page: a job for Sam says so');
  ok(/Added by Sam/.test(await txt(p, '.todo-row .todo-by') || ''), 'page: who added it');
  ok(!/Old job, removed/.test(await txt(p, '.todo-page') || ''), 'page: a removed job is not shown');

  // add one: words, a day it is due by and who it is for
  await p.fill('[data-k="todo-text"]', 'Call the fridge tech about the cool room door');
  await p.fill('[data-k="todo-due"]', '2026-10-30'); await L.settle(p, 200);
  await tap(p, '[data-p="todo-for"][data-v="sam"]'); await L.settle(p, 150);
  ok(await p.$eval('[data-k="todo-text"]', e => e.value) === 'Call the fridge tech about the cool room door', 'add: the words stay while picking the day and the chef');
  await tap(p, '[data-p="todo-save"]'); await L.settle(p, 600);
  let s = await store(p);
  const nk = Object.keys(s).filter(k => /\/todos\/[^/]+$/.test(k) && s[k].text === 'Call the fridge tech about the cool room door')[0], n = nk && s[nk], nid = nk && nk.split('/').pop();
  ok(!!n && n.st === 'open' && n.due === '2026-10-30' && n.for === 'sam' && n.from === 'sam' && n.by === 'sam' && n.doneAt === 0 && n.doneBy === '' && n.at >= L.NOW, 'add: saved with its words, day, chef, writer and time');
  ok((await rows(p)).indexOf('Call the fridge tech about the cool room door') >= 0, 'add: shows on the list');
  ok(await p.$eval('[data-k="todo-text"]', e => e.value) === '', 'add: the box is empty again');
  await tap(p, '[data-p="todo-save"]'); await L.settle(p, 200);
  ok(/Write the job first/.test(await txt(p, '.todo-add') || ''), 'add: an empty box asks for the job first');

  // what is typed survives a redraw during service (another phone adds a prep line)
  await p.fill('[data-k="todo-text"]', 'Half typed');
  await p.evaluate(k => window.__fake.write(k, { text: 'Slice onions', station: 'Larder', qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: Date.now(), done: false, deleted: false }), fsKey(['days', L.ymd(new Date(L.NOW)), 'items', 'zz9']));
  await L.settle(p, 400);
  ok(await p.$eval('[data-k="todo-text"]', e => e.value) === 'Half typed', 'redraw: the half-typed job stays');
  await p.fill('[data-k="todo-text"]', ''); await L.settle(p, 100);

  // tick, untick: the tick names who did it
  await tap(p, '[data-p="todo-tick"][data-id="t2"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[fsKey(['todos', 't2'])].st === 'done' && s[fsKey(['todos', 't2'])].doneBy === 'sam' && s[fsKey(['todos', 't2'])].doneAt >= L.NOW, 'tick: saved as done by Sam');
  ok((await rows(p)).indexOf('Order new tongs') < 0, 'tick: it leaves the open list');
  await p.click('.todo-donebox summary');
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="tododone"] .todo-row').length >= 2, null, 6000).catch(() => {});
  l = await rows(p, 'tododone');
  ok(l.indexOf('Order new tongs') >= 0 && l.indexOf('Fixed the dishwasher') >= 0, 'done: the last 30 days show under Done (' + l.join(' / ') + ')');
  ok(/Done by Sam/.test(await p.$$eval('[data-lv="tododone"] .todo-row', r => r.map(x => x.textContent).join(' '))), 'done: says who ticked it');
  await tap(p, '[data-lv="tododone"] [data-p="todo-tick"][data-id="t2"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[fsKey(['todos', 't2'])].st === 'open' && s[fsKey(['todos', 't2'])].doneAt === 0 && s[fsKey(['todos', 't2'])].doneBy === '', 'untick: back to open, no one named');
  ok((await rows(p)).indexOf('Order new tongs') >= 0, 'untick: back on the open list');

  // change the words
  await tap(p, '[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 200);
  ok(await p.$eval('[data-k="todo-text"]', e => e.value) === 'Order new tongs' && /Save changes/.test(await txt(p, '[data-p="todo-save"]') || ''), 'change: the job fills the box');
  ok(await p.evaluate(() => window.LK_PREP.unsaved()) === false, 'change: opening a job with Change is not "not saved yet" until something changes');
  await p.fill('[data-k="todo-text"]', 'Order 6 new tongs');
  await tap(p, '[data-p="todo-save"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[fsKey(['todos', 't2'])].text === 'Order 6 new tongs' && s[fsKey(['todos', 't2'])].from === 'sam' && s[fsKey(['todos', 't2'])].at === L.NOW - 3600000, 'change: the words saved, the writer and time kept');

  // remove, then Undo
  await tap(p, '[data-p="todo-del"][data-id="t1"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[fsKey(['todos', 't1'])].st === 'gone', 'remove: kept as removed, not deleted');
  ok((await rows(p)).indexOf('Book the hood clean') < 0, 'remove: off the list');
  const tt = await txt(p, '.p-toast') || await p.evaluate(() => document.body.textContent);
  ok(/Removed from the to-do list/.test(tt) && !/hood/.test(await txt(p, '.p-toast') || ''), 'remove: the toast offers Undo and names no chef words');
  await p.evaluate(() => { const u = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Undo')[0]; if (u) u.click(); });
  await L.settle(p, 600);
  s = await store(p);
  ok(s[fsKey(['todos', 't1'])].st === 'open' && (await rows(p)).indexOf('Book the hood clean') >= 0, 'undo: back on the list');
  ok(p.errors.length === 0, 'sous chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // staff: no menu row, the page says it is for the chefs, and the phone never reads the list
  p = await L.open(b, '#/', { who: 'ann', extra: seed, wait: 1500 });
  ok((await L.chefItems(p)).indexOf('todo') < 0, 'staff: no Chef to-do in the menu');
  await p.evaluate(() => { location.hash = '#/todo'; }); await L.settle(p, 1200);
  ok(/for the head chef and the sous chefs/.test(await txt(p, '.todo-page') || '') && !(await p.$('.todo-row')), 'staff: #/todo says it is for the chefs, no jobs');
  ok(await todoReads(p) === 0, 'staff: the phone never reads the list');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef's Google device, nobody signed in: in the menu, reads and writes as the head chef
  p = await L.open(b, '#/', { admin: true, who: '', extra: seed, wait: 1800 });
  await L.waitFor(p, () => !!(window.LK_PREP && window.LK_PREP.todoOK && window.LK_PREP.todoOK()), null, 6000).catch(() => {});
  ok((await L.chefItems(p)).indexOf('todo') >= 0, 'Google device, nobody signed in: Chef to-do in the menu');
  await p.evaluate(() => { location.hash = '#/todo'; });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 2, null, 6000).catch(() => {});
  ok((await rows(p)).length === 2, 'Google device: the open jobs show');
  await p.fill('[data-k="todo-text"]', 'Sign the new roster');
  await tap(p, '[data-p="todo-save"]'); await L.settle(p, 600);
  s = await store(p);
  const gk = Object.keys(s).filter(k => /\/todos\/[^/]+$/.test(k) && s[k].text === 'Sign the new roster')[0];
  ok(!!gk && s[gk].from === '' && !s[gk].by, 'Google device: saved as the head chef (no PIN writer)');
  ok(/Added by Head chef/.test(await p.$$eval('.todo-row', r => r.map(x => x.textContent).join(' '))), 'Google device: shown as added by the head chef');
  ok(p.errors.length === 0, 'Google device: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // staff signed in on the head chef's Google tablet: no row, no page, no read (the rules would let the device read)
  p = await L.open(b, '#/', { admin: true, who: 'bo', extra: seed, wait: 1800 });
  ok((await L.chefItems(p)).indexOf('todo') < 0, 'staff on the Google tablet: no Chef to-do in the menu');
  await p.evaluate(() => { location.hash = '#/todo'; }); await L.settle(p, 1200);
  ok(!(await p.$('.todo-row')) && await todoReads(p) === 0, 'staff on the Google tablet: no jobs and no read');
  await p.context().close();

  // a long word and every extra on a job: still no sideways scroll on a phone
  p = await L.open(b, '#/todo', { who: 'sam', extra: Object.assign({}, seed, T('t9', { text: 'Restock-the-' + 'x'.repeat(70), due: '2026-10-24', for: 'sam' })), wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 3, null, 6000).catch(() => {});
  ok((await rows(p)).some(t => /^Restock-the-x+$/.test(t)), 'phone: the long job is on the list');
  ok(!(await L.overflow(p)), 'phone: no sideways scroll with a long job (' + (await L.overflow(p)) + ')');
  // Due first: overdue, then the next day due, then jobs with no day (oldest first); not the order they were written
  const d3 = L.ymd(new Date(L.NOW + 3 * 86400000));
  await p.context().close();
  p = await L.open(b, '#/todo', { who: 'sam', extra: Object.assign({}, T('a1', { text: 'No day', at: L.NOW - 9e6 }), T('a2', { text: 'Overdue', due: '2020-01-01', at: L.NOW - 5e6 }), T('a3', { text: 'Later', due: d3, at: L.NOW - 1e6 })), wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 3, null, 6000).catch(() => {});
  ok((await rows(p)).join(',') === 'Overdue,Later,No day', 'sort: due first, then no day (' + (await rows(p)).join(',') + ')');
  ok(p.errors.length === 0, 'phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // another phone ticks a job while this one has the list open: once Done is read, the job is in Done only, and its
  // box there unticks it (it does not tick it again)
  p = await L.open(b, '#/todo', { who: 'sam', extra: seed, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 2, null, 6000).catch(() => {});
  await p.evaluate(k => { const d = JSON.parse(localStorage.getItem('fake.fs'))[k]; window.__fake.write(k, Object.assign(d, { st: 'done', doneAt: Date.now(), doneBy: 'ann' })); }, fsKey(['todos', 't2']));
  await L.settle(p, 300);
  await tap(p, '.todo-donebox summary');
  await L.waitFor(p, () => !!document.querySelector('[data-lv="tododone"] [data-id="t2"]'), null, 6000).catch(() => {});
  ok(!(await p.$('[data-lv="todo"] [data-id="t2"]')) && !!(await p.$('[data-lv="tododone"] [data-id="t2"]')), 'two phones: a job ticked elsewhere shows under Done only');
  await tap(p, '[data-lv="tododone"] [data-p="todo-tick"][data-id="t2"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[fsKey(['todos', 't2'])].st === 'open' && s[fsKey(['todos', 't2'])].doneBy === '', 'two phones: its box under Done unticks it');
  await p.context().close();

  // a tick before Done was ever opened does not make a one-job Done list; a Done read that fails says so
  p = await L.open(b, '#/todo', { who: 'sam', extra: seed, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 2, null, 6000).catch(() => {});
  await tap(p, '[data-p="todo-tick"][data-id="t2"]'); await L.settle(p, 500);
  ok(/^Done in the last 30 days$/.test(await txt(p, '.todo-donebox summary') || ''), 'done: no count before Done is read (' + await txt(p, '.todo-donebox summary') + ')');
  await p.evaluate(() => { window.__fake.failReads = /todos$/; });
  await tap(p, '.todo-donebox summary');
  await L.waitFor(p, () => /Could not load/.test((document.querySelector('.todo-donebox') || {}).textContent || ''), null, 5000).catch(() => {});
  ok(/Could not load/.test(await txt(p, '.todo-donebox') || '') && !(await p.$('[data-lv="tododone"]')), 'done: a failed read says Could not load, not a list of one');
  await p.context().close();

  // Change a job, then tick that same job before saving (Done never opened): Save still keeps the new words
  p = await L.open(b, '#/todo', { who: 'sam', extra: seed, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 2, null, 6000).catch(() => {});
  await tap(p, '[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 200);
  await p.fill('[data-k="todo-text"]', 'Order new tongs, call Dave');
  await tap(p, '[data-p="todo-tick"][data-id="t2"]'); await L.settle(p, 400);
  await tap(p, '[data-p="todo-save"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[fsKey(['todos', 't2'])].text === 'Order new tongs, call Dave' && s[fsKey(['todos', 't2'])].st === 'done', 'change then tick: the new words are saved on the ticked job');
  await p.context().close();

  // a date typed on a keyboard, digit by digit: the box keeps it and keeps the focus
  p = await L.open(b, '#/todo', { who: 'sam', extra: seed, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-k="todo-due"]'), null, 6000).catch(() => {});
  await p.focus('[data-k="todo-due"]');
  // the date box takes the parts in the browser's own order (month first in the test browser, day first in Australia)
  await p.keyboard.type(/^en-US/.test(await p.evaluate(() => navigator.language)) ? '10302026' : '30102026'); await L.settle(p, 300);
  { const dv = await p.$eval('[data-k="todo-due"]', e => e.value), fk = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-k')), lang = await p.evaluate(() => navigator.language); ok(dv === '2026-10-30' && fk === 'todo-due', 'date: typed on a keyboard, it stays and keeps the focus (' + dv + ', ' + fk + ', ' + lang + ')'); }
  ok(await p.$eval('[data-p="todo-nodue"]', e => !e.hidden), 'date: No date shows once a day is set');
  await p.context().close();

  // 8 jobs: the chips show; For me filters; once the list is short again every job shows
  const many = Object.assign({}, seed);
  for (let i = 0; i < 6; i++) Object.assign(many, T('m' + i, { text: 'Many ' + i, for: i < 2 ? 'sam' : '' }));
  p = await L.open(b, '#/todo', { who: 'sam', extra: many, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 8, null, 6000).catch(() => {});
  ok(!!(await p.$('[data-p="lv-f"][data-lv="todo"][data-v="me"]')), 'filters: For me shows with 8 jobs');
  await tap(p, '[data-p="lv-f"][data-lv="todo"][data-v="me"]'); await L.settle(p, 300);
  ok((await rows(p)).length === 3, 'filters: For me shows the 3 jobs for Sam (' + (await rows(p)).length + ')');
  await tap(p, '[data-p="todo-tick"][data-id="m0"]'); await L.settle(p, 500);
  ok((await rows(p)).length === 7, 'filters: with 7 jobs left (no chips), every job shows again (' + (await rows(p)).length + ')');
  // with Done open, the keyboard stays on the open list after a tick (it does not follow the job into Done)
  await tap(p, '.todo-donebox summary');
  await L.waitFor(p, () => !!document.querySelector('[data-lv="tododone"] .todo-row'), null, 6000).catch(() => {});
  const first = await p.$eval('[data-lv="todo"] [data-p="todo-tick"]', e => e.getAttribute('data-id'));
  await p.focus('[data-lv="todo"] [data-p="todo-tick"]');
  await p.keyboard.press('Enter'); await L.settle(p, 500);
  const fx = await p.evaluate(() => { const a = document.activeElement; return a ? (a.closest('[data-lv]') || { getAttribute: () => '' }).getAttribute('data-lv') + ':' + a.getAttribute('data-id') : ''; });
  ok((await rows(p)).length === 6 && fx.indexOf('todo:') === 0 && fx !== 'todo:' + first, 'keyboard: after a tick the focus is on the next tick of the open list (' + fx + ')');
  await p.context().close();

  // a failed read says so, never "nothing on the list"
  p = await L.open(b, '#/todo', { who: 'sam', extra: seed, failReads: '/todos$', wait: 1500 });
  await L.waitFor(p, () => /Could not load/.test(document.body.textContent), null, 5000).catch(() => {});
  ok(/Could not load the to-do list/.test(await txt(p, '.todo-page') || '') && !/Nothing on the list/.test(await txt(p, '.todo-page') || ''), 'failed read: Could not load, not an empty list');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
