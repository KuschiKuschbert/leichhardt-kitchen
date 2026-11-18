// The Transfers tutorial (docs/tutorial-videos.md). Filmed as Ann, a cook, on her own phone, on the demo kitchen's
// Tuesday (fixtures.mjs): a cook logs a transfer and marks it returned, and has Undo return for two minutes after (a
// chef has it longer). The venues and the people who came for stock are made up.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW));
const sheet = '.tr-sheet';
const row = text => '.tr-outstanding .tr-row:has-text("' + text + '")';

// Brings a control in the sheet into view (the sheet scrolls on its own, which the film does not do for a sheet),
// the marks cleared first so none is left where the control was.
const into = sel => async page => {
  await page.evaluate(() => window.__chalk.clear(150));
  await page.locator(sel).first().evaluate(el => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  await new Promise(r => setTimeout(r, 650));
};

const extra = {};
// Two loans from earlier days, still out: 3 and 9 days (red from 7)
for (const [d, id, text, amount, unit, venue, person] of [[9, 'x9', 'Cream', 4, 'L', 'Seaview Bistro', 'Max'], [3, 'x3', 'Butter', 2, 'kg', 'Harbour Bar', 'Jo']]) {
  const date = L.ymd(new Date(L.NOW - d * 86400000));
  const record = { dir: 'out', venue, person, text, amount, unit, note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - d * 86400000 - 3 * 3600000, deleted: false, by: 'bo' };
  extra[key('transfers', date, 'lines', id)] = record;
  extra[key('transferOpen', date + '_' + id)] = { date, lineId: id, record, open: true };
}
// Today: a loan out this morning, and lemons we borrowed and gave back
extra[key('transfers', day, 'lines', 't1')] = { dir: 'out', venue: 'Harbour Bar', person: 'Jo', text: 'Brioche buns', amount: 2, unit: 'packs', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 3 * 3600000, deleted: false, by: 'bo' };
extra[key('transfers', day, 'lines', 't2')] = { dir: 'in', venue: 'Seaview Bistro', person: 'Max', text: 'Lemons', amount: 12, unit: 'pieces', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 4 * 3600000, deleted: false, returned: true, returnedBy: 'Ann', returnedById: 'ann', returnedAt: L.NOW - 3600000, by: 'ann' };
// the last two weeks, as the server writes it: the venues and who came from each
extra[key('summary', 'transfers')] = { day, from: day, to: day, at: L.NOW - 3600000,
  venues: [{ v: 'Harbour Bar', n: 4, out: 3, in: 1, people: ['Jo'] }, { v: 'Seaview Bistro', n: 2, out: 1, in: 1, people: ['Max'] }], items: [] };

export default {
  id: 'transfers',
  title: 'Transfers',
  sub: 'Stock shared with the other venues',
  next: 'Delivery received',
  hash: '#/transfers',
  who: 'ann',
  extra,
  intro: ['Transfers.', "Here's how to log stock shared with the other venues, and mark it back when it's returned."],
  outro: ["That's Transfers. Next up, Delivery received."],
  steps: [
    {
      title: 'Still out',
      say: ['This is the transfer list, for stock shared with the other venues.', 'Still out comes first. Each card says which venue has it, who came for it, and since when.', 'Out for a week or more, and the card turns red.'],
      do: [
        { s: 0, d: 0.3, underline: '.nb-title' },
        { s: 1, d: 0.5, circle: '.tr-card >> nth=1' },
        { s: 2, d: 0.4, circle: '.tr-card.is-old .tr-age', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Log a transfer',
      say: ['Lent something, or borrowed it? Tap Log a transfer.', 'Pick which way it went.', 'Then write the venue, and who came for it.'],
      do: [
        { s: 0, d: 1.2, tap: '[data-p="tr-log"]' },
        { s: 1, d: 0.3, circle: sheet + ' .tr-dirs .seg', opts: { pad: 6 } },
        { s: 2, d: 0.2, clear: true },
        { s: 2, d: 0.3, type: ['#tr-venue', 'Harbour Bar'] },
        { s: 2, d: 1.8, tap: '#tr-person' },
        { s: 2, d: 2.1, type: ['#tr-person', 'Jo'] }
      ]
    },
    {
      title: 'What and how much',
      say: ['Write what they took, and how much.', 'Then tap its unit. The amount, never a price.'],
      do: [
        { s: 0, run: into('#tr-text') },
        { s: 0, d: 0.3, type: ['#tr-text', 'Eggs'] },
        { s: 0, d: 1.4, tap: '#tr-amt' },
        { s: 0, d: 1.7, type: ['#tr-amt', '30'] },
        { s: 1, run: into(sheet + ' .tr-units') },
        { s: 1, d: 0.4, tap: sheet + ' [data-p="tr-unit"][data-v="pieces"]' }
      ]
    },
    {
      title: 'Log it',
      say: ['Taking a few things? Tap Add another item for each one.', 'Then tap Log it. It goes under Still out.'],
      do: [
        { s: 0, run: into(sheet + ' .tr-addrow') },
        { s: 0, d: 0.6, circle: sheet + ' [data-p="tr-bk-add"]', opts: { pad: 6 } },
        { s: 1, d: 0.2, clear: true },
        { s: 1, d: 0.5, tap: sheet + ' .tr-add .nb-addbtn' },
        { s: 1, d: 1.6, tap: sheet + ' .ux-modal-close' },
        { s: 1, d: 2.3, circle: row('Eggs') }
      ]
    },
    {
      title: 'Mark returned',
      say: ['When all of it comes back, tap Mark returned.', 'It moves to Done today, with your name and the time.'],
      do: [
        { s: 0, d: 0.3, circle: row('Brioche') + ' [data-p="tr-return"]', opts: { pad: 6 } },
        { s: 0, d: 2.0, tap: row('Brioche') + ' [data-p="tr-return"]' },
        { s: 1, d: 0.6, circle: '.tr-done .tr-row:has-text("Brioche")' }
      ]
    },
    {
      title: 'Undo return',
      say: ['Marked the wrong one? For two minutes, Undo return sits right beside it.', "Tap it, and it's back under Still out.", 'After two minutes, only a chef can undo it.'],
      do: [
        { s: 0, d: 1.6, circle: '[data-p="tr-unreturn"][data-id="t1"]', opts: { pad: 6 } },
        { s: 1, d: 0.3, tap: '[data-p="tr-unreturn"][data-id="t1"]' },
        { s: 1, d: 1.4, circle: row('Brioche') }
      ]
    }
  ]
};
