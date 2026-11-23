// The demo kitchen every tutorial is filmed in (docs/tutorial-videos.md): the click tests' made-up people (Sam the sous
// chef, Ann and Bo on the line, plus the synthetic Head chef when a video signs in as the admin) and a believable
// Tuesday afternoon's lists. Only made-up names, no PINs on screen, no prices. Paths are the stand-in's
// ('kitchens/000000/...', the test kitchen PIN that can never be the real one).
import { L } from './kit.mjs';

const day = L.ymd(new Date(L.NOW));
const at = mins => L.NOW - mins * 60000;
const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');

// Prep for tonight's dinner: four sections, one urgent, one on the go, a couple already done.
const PREP = [
  ['g1', 'Portion rump', 'Grill', '20', { urgent: true }],
  ['g2', 'Crumb chicken schnitzels', 'Grill', '30', { onBy: 'Bo', onById: 'bo', onAt: at(20) }],
  ['g3', 'Skewer haloumi and capsicum', 'Grill', '24'],
  ['s1', 'Make gravy', 'Sauce', '5 L', { recipe: 'gravy' }],
  ['s2', 'Chimichurri', 'Sauce', '2 L'],
  ['s3', 'Laksa paste', 'Sauce', '1 batch', { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: at(35) }],
  ['l1', 'Slice onions', 'Larder', '2 tubs'],
  ['l2', 'Pick coriander', 'Larder', ''],
  ['l3', 'Wash cos lettuce', 'Larder', '', { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: at(15) }],
  ['l4', 'Pickled red onion', 'Larder', '1 batch'],
  ['f1', 'Blanch chips', 'Fryer', '4 trays'],
  ['f2', 'Crumb calamari', 'Fryer', '3 kg']
];

// What the book has learned the kitchen writes often: these become the Quick add chips.
const LEARNED = [
  ['dice-onions', 'Dice onions', 'Larder', 9, '1 tub', 3],
  ['garlic-butter', 'Garlic butter', 'Sauce', 7, '1 tub', 2],
  ['portion-salmon', 'Portion salmon', 'Grill', 6, '12', 2],
  ['slice-lemons', 'Slice lemons', 'Larder', 5, '1 tub', 0],
  ['tartare-sauce', 'Tartare sauce', 'Sauce', 5, '2 L', 0]
];

export function kitchen(extra) {
  const x = {};
  // the click tests' own six lines are replaced by the demo day
  ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].forEach(id => { x[key('days', day, 'items', id)] = undefined; });
  PREP.forEach(([id, text, station, qty, more], k) => {
    x[key('days', day, 'items', id)] = Object.assign({ text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: at(240 - k * 9), done: false, deleted: false }, more || {});
  });
  LEARNED.forEach(([id, text, sec, uses, qty, tuesdays]) => {
    x[key('learned', id)] = { text, uses, typed: uses, secs: { [sec.toLowerCase()]: { name: sec, n: uses } }, qtys: { a: { q: qty, n: uses - 1 } }, dow: tuesdays ? { 2: tuesdays } : {} };
  });
  return Object.assign(x, extra || {});
}

export { day };
