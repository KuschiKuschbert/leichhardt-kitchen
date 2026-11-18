// The Wastage tutorial (docs/tutorial-videos.md). Filmed as Sam, the sous chef, on his own phone, on the demo kitchen's
// Tuesday (fixtures.mjs): Undo on a wastage entry is for the head chef and sous chefs (a cook is told to ask the head
// chef), so the video is filmed as a chef and the words say so. Three entries are logged already, and Coleslaw was
// logged once in the last two weeks, so the book fills its reason and unit (Filled for you, from the nightly summary as
// the server writes it: L.wasteSum).
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW));
const at = mins => L.NOW - mins * 60000;
const sheet = '.w-sheet';
const waste = (text, amount, unit, reason, station, by, mins) => ({ text, amount, unit, reason, action: '', station, addedBy: by, addedById: by.toLowerCase(), addedAt: at(mins), deleted: false });

// Brings a control in the sheet into view (the sheet scrolls on its own, which the film does not do for a sheet),
// the marks cleared first so none is left where the control was.
const into = sel => async page => {
  await page.evaluate(() => window.__chalk.clear(150));
  await page.locator(sel).first().evaluate(el => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  await new Promise(r => setTimeout(r, 650));
};

const extra = Object.assign({
  [key('waste', day, 'lines', 'w0')]: waste('Cos lettuce outer leaves', 0.5, 'kg', 'prep', 'Larder', 'Ann', 150),
  [key('waste', day, 'lines', 'w2')]: waste('Hollandaise', 1, 'L', 'fault', 'Sauce', 'Ann', 70)
}, L.wasteSum([
  { t: 'Coleslaw', n: 1, r: { excess: 1 }, unit: 'portions', reason: 'excess', sec: 'Larder', amt: 6, last: { unit: 'portions', reason: 'excess', sec: 'Larder', amt: 6 } }
]));

export default {
  id: 'wastage',
  title: 'Wastage',
  sub: 'What went in the bin, and why',
  next: 'Transfers',
  hash: '#/waste',
  who: 'sam',
  extra,
  intro: ['Wastage.', "Here's how to log what gets thrown out, and why."],
  outro: ["That's Wastage. Next up, Transfers."],
  steps: [
    {
      title: "Today's waste",
      say: ["This is today's wastage log.", 'The total shows what has gone in the bin today.', 'The bar shows why, with one colour for each reason.', 'Each entry says what it was, how much, the section and who logged it.'],
      do: [
        { s: 0, d: 0.3, underline: '.nb-title' },
        { s: 1, d: 0.3, circle: '.w-tot' },
        { s: 2, d: 0.3, circle: '.w-today .w-bar', opts: { pad: 8 } },
        { s: 3, d: 0.4, circle: '.w-row >> nth=0' }
      ]
    },
    {
      title: 'Log waste',
      say: ['Throwing something out? Tap Log waste.', 'Write what it is.'],
      do: [
        { s: 0, d: 0.9, tap: '[data-p="w-log"]' },
        { s: 1, d: 0.2, type: ['#w-text', 'Bread rolls'] }
      ]
    },
    {
      title: 'Amount and unit',
      say: ['Weigh or count it, and write the amount.', 'Then tap its unit.', 'Always the real amount, never a dollar value.'],
      do: [
        { s: 0, d: 0.6, tap: '#w-amt' },
        { s: 0, d: 1.2, type: ['#w-amt', '8'] },
        { s: 1, d: 0.4, tap: sheet + ' [data-p="wunit"][data-v="pieces"]' },
        { s: 2, d: 0.3, circle: sheet + ' .w-rule', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Reason and section',
      say: ['Pick why it was wasted. Each reason says what it means.', 'Then tap the section it came from.'],
      do: [
        { s: 0, d: 0.8, tap: sheet + ' [data-p="wreason"][data-v="expired"]' },
        { s: 0, d: 2.2, circle: sheet + ' .w-rbig', opts: { pad: 6 } },
        { s: 1, run: into(sheet + ' .sec-chips') },
        { s: 1, d: 0.8, tap: sheet + ' [data-p="sec-pick"][data-sk="w-sec"][data-v="Larder"]' }
      ]
    },
    {
      title: 'Log it',
      say: ['Tap Log it. The button says what it saves.', "It's in the log straight away, and the sheet stays open for the next one."],
      do: [
        { s: 0, run: into(sheet + ' .w-add .nb-addbtn') },
        { s: 0, d: 0.6, circle: sheet + ' .w-add .nb-addbtn', opts: { pad: 6 } },
        { s: 0, d: 2.2, tap: sheet + ' .w-add .nb-addbtn' },
        { s: 1, run: into(sheet + ' .just-r') },
        { s: 1, d: 0.6, circle: sheet + ' .just-r', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Filled for you',
      say: ['Logged it before? Write the name.', 'The book fills in the reason and the unit from last time, and says so under the boxes.', 'You still weigh it, and write the amount for today.'],
      do: [
        { s: 0, run: into('#w-text') },
        { s: 0, d: 1.2, type: ['#w-text', 'Coleslaw'] },
        { s: 1, d: 0.1, tap: '#w-amt' },
        { s: 1, d: 1.0, circle: '#w-fill', opts: { pad: 4 } },
        { s: 2, d: 0.8, type: ['#w-amt', '4'] },
        { s: 2, d: 2.0, run: into(sheet + ' .w-add .nb-addbtn') },
        { s: 2, d: 2.7, tap: sheet + ' .w-add .nb-addbtn' }
      ]
    },
    {
      title: 'Undo',
      say: ['Logged the wrong thing? Tap Undo, straight away.', "Only a chef can undo an entry. If you're a cook, ask the head chef."],
      do: [
        { s: 0, run: into(sheet + ' .just-l:last-child') },
        { s: 0, d: 0.6, circle: sheet + ' .just-l:last-child [data-p="just-undo"]', opts: { pad: 6 } },
        { s: 0, d: 2.2, tap: sheet + ' .just-l:last-child [data-p="just-undo"]' },
        { s: 1, d: 0.4, circle: sheet + ' .just-l:last-child', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Make it again',
      say: ['Expired stock or a cooking fault gets Make it again.', "One tap puts it on today's prep list."],
      do: [
        { s: 0, tap: sheet + ' .ux-modal-close' },
        // the slip from the sheet has had its time, and the entry comes up above the bottom bar
        { s: 0, d: 0.4, run: async page => { await page.clock.fastForward(10000); await page.locator('.w-row:has-text("Bread rolls")').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' })); await new Promise(r => setTimeout(r, 650)); } },
        { s: 0, d: 1.4, circle: '.w-row:has-text("Bread rolls") [data-p="w-again"]', opts: { pad: 6 } },
        { s: 1, d: 0.5, tap: '.w-row:has-text("Bread rolls") [data-p="w-again"]' },
        { s: 1, d: 2.0, circle: '.w-row:has-text("Bread rolls") .w-again', opts: { pad: 6 } }
      ]
    }
  ]
};
