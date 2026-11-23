// The Cleaning tutorial (docs/tutorial-videos.md). Filmed as Sam, the sous chef, on the demo kitchen's Tuesday
// (fixtures.mjs): he ticks jobs like everyone, is the kitchen's Pass checker, and as a chef sets the jobs up in Repeat
// tasks. Five made-up everyday jobs (one already done by Bo, one with the click tests' made-up Fryer oil change guide
// as its How to) and the book's own "Cover and label all food" (js/cleaning-schedule.js), the one job with a Pass
// check: Ann ticked its start of day checks at 10:00 and it waits for Sam. A chef sees the jobs in groups; the
// General cleaning group is opened before filming starts.
import { createRequire } from 'module';
import { L } from '../kit.mjs';

const require = createRequire(import.meta.url);
const schedule = require('../../../js/cleaning-schedule.js');

const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, OPEN = 253402178400000;
const today = L.ymd(new Date(L.NOW));
const from = Date.parse(L.ymd(new Date(L.NOW - 14 * DAY)) + 'T00:00:00+10:00');
const job = (id, x) => Object.assign({ root: id, prev: '', next: '', text: '', area: '', section: '', sectionName: '', shared: true, dows: [0, 1, 2, 3, 4, 5, 6], guide: '', from, until: OPEN, at: L.NOW - 15 * DAY, by: 'sam' }, x);
const food = Object.assign(schedule.drafts().find(t => t.plan.template === 'c11'), { sectionName: '', root: 'food', prev: '', next: '', from, until: OPEN, at: L.NOW - 15 * DAY, by: 'sam' });
food.plan.verifiers = ['sam'];

const cfg = L.seed()[key('config', 'main')];
const extra = Object.assign(L.guides(), {
  [key('config', 'main')]: Object.assign({}, cfg, { kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }] }),
  [key('sections', 'larder')]: { name: 'Larder', uses: 5, hidden: false },
  [key('sections', 'grill')]: { name: 'Grill', uses: 3, hidden: false },
  [key('cleaningTasks', 'pass')]: job('pass', { text: 'Wipe down the pass', area: 'Pass' }),
  [key('cleaningTasks', 'bins')]: job('bins', { text: 'Empty and wipe the bins', area: 'Bins' }),
  [key('cleaningTasks', 'fryer')]: job('fryer', { text: 'Change the fryer oil', area: 'Fryer', section: 'grill', sectionName: 'Grill', shared: false, guide: 'fryer' }),
  [key('cleaningTasks', 'coolroom')]: job('coolroom', { text: 'Wipe the cool room handles', area: 'Cool room', section: 'larder', sectionName: 'Larder', shared: false }),
  [key('cleaningTasks', 'slicer')]: job('slicer', { text: 'Clean the slicer', area: 'Slicer', section: 'larder', sectionName: 'Larder', shared: false }),
  [key('cleaningTasks', 'food')]: food,
  [key('cleaningDone', today + '_bins')]: { day: today, task: 'bins', version: 1, done: true, doneAt: L.NOW - 50 * 60000, doneById: 'bo', doneBy: 'Bo', workerId: 'bo', worker: 'Bo', by: 'bo' },
  [key('cleaningDone', today + '_food__start')]: { day: today, task: 'food', version: 1, done: false, doneAt: L.NOW - 4 * 3600000, doneById: 'ann', doneBy: 'Ann', workerId: 'ann', worker: 'Ann', by: 'ann',
    flow: { slot: 'start', kind: 'start', status: 'awaiting', checked: ['All food covered', 'All food labelled'], note: '', verifiedBy: '', verifiedAt: 0 } }
});
// everyone on this phone has picked today's section already, as in tests/cleaning.test.js
const init = () => {
  const d = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
  ['ann', 'bo', 'sam'].forEach(id => localStorage.setItem('lk.sec.' + id, JSON.stringify({ d, sec: 'larder', name: 'Larder', self: true, at: Date.now() })));
};
const start = '[data-cln-occurrence$="_start"]';

export default {
  id: 'cleaning',
  title: 'Cleaning',
  sub: "Today's jobs, ticked off and checked",
  done: "That's Cleaning",
  next: 'Functions',
  hash: '#/cleaning',
  who: 'sam',
  extra,
  open: { init },
  async setup(page, cut, L) {
    await L.waitFor(page, () => !!document.querySelector('.cln-page') && !document.querySelector('.cln-loading'), null, 8000);
    await page.click('[data-cln="group"][data-group="general"]');
    await L.settle(page, 500);
  },
  intro: ['Cleaning.', "Here's how to tick off today's cleaning jobs, and how the Pass check works."],
  outro: ["That's Cleaning. Next up, Functions."],
  steps: [
    {
      title: "Today's jobs",
      say: ["This is today's cleaning list.", 'The count shows how many jobs are done.', 'Each job says where it is, and whose section it is.'],
      do: [
        { s: 0, d: 0.3, underline: '.cln-book .nb-title' },
        { s: 1, d: 0.3, circle: '.cln-progress' },
        // a big screen's job line runs the whole width, so the whole job is ringed there
        { s: 2, d: 0.3, circle: { phone: '.cln-row[data-id="fryer"] .nb-meta', desktop: '.cln-row[data-id="fryer"]' }, opts: { pad: 5 } }
      ]
    },
    {
      title: 'Tick it off',
      say: ["When a job's done, tap its box.", 'Your name and the time go on it.', 'Tapped the wrong one? Tap Undo on the slip, straight away.'],
      do: [
        { s: 0, d: 1.0, tap: '[data-cln="tick"][data-id="pass"]' },
        { s: 1, d: 0.2, circle: { phone: '.cln-row[data-id="pass"] .nb-meta', desktop: '.cln-row[data-id="pass"]' }, opts: { pad: 5 } },
        { s: 2, d: 1.0, circle: '.p-toast:not(.p-toast-old) .p-toast-btn' }
      ]
    },
    {
      title: 'How to',
      say: ['Some jobs have a How to link.', 'Tap it to open the guide for that job.', 'Tap the back arrow to come back to the list.'],
      do: [
        { s: 0, d: 0.3, circle: '.cln-how' },
        { s: 1, d: 0.4, tap: '.cln-how' },
        { s: 1, d: 1.8, circle: '.g-ol', opts: { pad: 4 } },
        { s: 2, d: 1.0, tap: '.wtop-back' }
      ]
    },
    {
      title: 'Checks',
      say: ['Some jobs have checks to tick, like Cover and label all food.', 'Tap the job to see how to do it, and its checks.'],
      do: [
        { s: 0, d: 1.6, circle: { phone: '.cln-row[data-id="food"] .nb-t', desktop: '.cln-row[data-id="food"]' } },
        { s: 1, d: 0.3, tap: '.cln-task-detail[data-id="food"]' },
        { s: 1, d: 1.8, circle: start + ' .cln-checks', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Pass check',
      say: ['Ann ticked the start of day checks. Now they wait for the Pass check.', 'The Pass checker looks, then taps Verify Pass check.'],
      do: [
        { s: 0, d: 0.4, circle: start + ' .cln-performer' },
        { s: 0, d: 2.4, circle: start + ' h4 span' },
        { s: 1, d: 1.6, tap: '[data-cln="flow-verify"]' },
        // the page goes back to the top after the Pass check, so the rings drawn before it are taken off
        { s: 1, d: 2.2, clear: true },
        { s: 1, d: 2.8, circle: '.p-toast:not(.p-toast-old) .p-toast-msg' }
      ]
    },
    {
      title: 'Set it up',
      say: ['Chefs set the jobs in Repeat tasks.', 'Add a job, and choose its section and the days it repeats.'],
      do: [
        { s: 0, d: 0.6, tap: '[data-cln="setup"]' },
        { s: 1, d: 0.2, circle: '[data-cln="add"]' },
        { s: 1, d: 2.0, circle: '.cln-template-summary >> nth=0', opts: { pad: 4 } }
      ]
    }
  ]
};
