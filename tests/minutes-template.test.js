// The team notes template (22 Oct 2026): Start from the team notes fills today's minutes with the kitchen's standing
// routines in eight headed parts, the sous chef's name in place of {sous}, every section under the rules' 1200
// characters, and the published minutes show each heading as its own numbered box.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const store = page => page.evaluate(() => window.__fake.dump());
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'minutes');
  await L.settle(p, 400);
  ok(await p.$('[data-p="mn-tpl"]') !== null, 'template: Start from the team notes is offered');
  await p.click('[data-p="mn-tpl"]');
  await L.settle(p, 200);
  const f = await p.evaluate(() => ({
    date: document.querySelector('[data-k="mn-date"]').value,
    safety: document.querySelector('[data-k="mn-safety"]').value,
    decisions: document.querySelector('[data-k="mn-decisions"]').value,
    menu: document.querySelector('[data-k="mn-menu"]').value,
    dates: document.querySelector('[data-k="mn-dates"]').value,
    other: document.querySelector('[data-k="mn-other"]').value
  }));
  const today = await p.evaluate(() => window.LK_TIME.day(window.LK_TIME.now()));
  ok(/^\d{4}-\d{2}-\d{2}$/.test(f.date) && (!today || f.date === today), 'template: dated today (' + f.date + ')');
  ok(/75°C/.test(f.safety) && /63°C/.test(f.safety), 'template: the core temperatures are in Safety');
  ok(/Sam is our Smoke Master/.test(f.menu) && !/\{sous\}/.test(Object.values(f).join(' ')), 'template: the sous chef\'s name is filled in');
  ok(['safety', 'decisions', 'menu', 'dates', 'other'].every(k => f[k].length <= 1200), 'template: every section is within 1200 characters');
  const heads = Object.values(f).join('\n').split('\n').filter(l => /^# /.test(l));
  ok(heads.length === 8, 'template: eight headings (' + heads.length + ')');
  ok(!/—|\b(am|pm)\b/.test(Object.values(f).join(' ')), 'template: no em dashes or 12-hour times');
  await p.evaluate(() => { const b = document.querySelector('[data-p="mn-attopen"]'); if (b && !document.querySelector('[data-p="mn-all"]')) b.click(); });
  await L.settle(p, 100);
  await p.click('[data-p="mn-all"]', { timeout: 2000 }).catch(() => {});
  await L.settle(p, 100);
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 150);
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 600);
  const s = await store(p);
  const key = Object.keys(s).find(k => /\/minutes\/[^/]+$/.test(k) && s[k].status === 'published');
  ok(!!key && /Cleaning and closing/.test(s[key].other), 'published: the team notes are saved');
  // the staff phone has its own stand-in, so it starts with the published record
  const extra = {}; if (key) extra[key] = s[key];
  const q = await L.open(b, '#/minutes', { who: 'ann', extra, wait: 1800 });
  await L.waitFor(q, () => document.querySelector('.mn-doc'));
  const boxes = await q.evaluate(() => [...document.querySelectorAll('.mn-doc .mn-box .mn-bh')].map(h => h.textContent));
  ok(boxes.some(t => /01Working together/.test(t)) && boxes.some(t => /Section stock, ordering and wastage/.test(t)), 'staff: each heading is its own numbered box (' + boxes.join(' / ') + ')');
  ok(/Food safety, coldroom and storage/.test(await txt(q, '.mn-safety') || ''), 'staff: the food safety heading is in the orange box');
  ok(!/# /.test(await txt(q, '.mn-doc') || ''), 'staff: no # shows on the page');
  ok(p.errors.length === 0 && q.errors.length === 0, 'minutes template: no page errors ' + p.errors.concat(q.errors).join(' | '));
  await p.context().close(); await q.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
