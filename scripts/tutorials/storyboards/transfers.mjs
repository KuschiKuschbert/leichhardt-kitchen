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
      say: ['This is the transfer list.'],
      do: []
    }
  ]
};
