// The admin Today room (docs/tutorial-videos.md): the head chef's admin panel on the demo kitchen's Tuesday, signed in
// as the synthetic Head chef (open: { admin: true }). This file also holds the admin demo kitchen (adminDemo) that the
// other two admin videos (admin-reports, admin-kitchen) film in: made-up people (Sam, Ann, Bo, Fay and the Head chef),
// made-up suppliers and venues, no prices and no PINs.
// The Google account line at the top of the panel names the owner's email: hide() keeps it out of every frame.
import { createRequire } from 'module';
import { L } from '../kit.mjs';

const require = createRequire(import.meta.url);
const C = require('../../../js/analysis-core.js');
const M = require('../../../js/functions.js');

const DAY = 86400000;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const dayN = n => L.ymd(new Date(L.NOW - n * DAY));
const today = dayN(0);
const at = (d, hm) => Date.parse(d + 'T' + hm + ':00+10:00');
const dow = d => new Date(d + 'T12:00:00Z').getUTCDay();

const PEOPLE = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
const SECS = [{ id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }, { id: 'larder', name: 'Larder' }, { id: 'fryer', name: 'Fryer' }];
const SHIFTS = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false, occ: false }, { id: 'dinner', name: 'Dinner', from: 1020, to: 1320, off: false, occ: false }];
const CUTOFFS = [
  // none closes on the filming Tuesday, so no cut-off band covers the panel
  { id: 'veg', name: 'Green Grocer', dd: [1, 4, 6], at: 15 * 60, pre: 1 },
  { id: 'meat', name: 'City Meats', dd: [2, 5], at: 14 * 60, pre: 1 },
  { id: 'dairy', name: 'Dairy Farm', dd: [1, 4], at: 12 * 60, pre: 1 }
];

// What the kitchen writes most days: [text, section, qty, recipe]
const LINES = [
  ['Portion rump', 'Grill', '20', 'rump-250'], ['Crumb chicken schnitzels', 'Grill', '30', ''], ['Chicken burger patties', 'Grill', '24', 'burger'],
  ['Make gravy', 'Sauce', '5 L', ''], ['Laksa paste', 'Sauce', '1 batch', 'laksa'], ['Chimichurri', 'Sauce', '2 L', ''],
  ['Slice onions', 'Larder', '2 tubs', ''], ['Slaw', 'Larder', '2 tubs', 'slaw'], ['Pickled red onion', 'Larder', '1 batch', ''], ['Pick coriander', 'Larder', '', ''],
  ['Blanch chips', 'Fryer', '4 trays', ''], ['Crumb calamari', 'Fryer', '3 kg', 'calamari']
];
const WHO = [['ann', 'Ann'], ['bo', 'Bo'], ['sam', 'Sam']];

// The nightly record (analysis/dashboard): 65 finished days of prep, waste, transfers and food safety counts.
function nightly() {
  const days = [];
  for (let i = 65; i >= 1; i--) {
    const d = dayN(i), wd = dow(d), busy = wd === 5 || wd === 6 ? 1.4 : wd === 1 ? 0.8 : 1;
    const n = Math.round(24 * busy) + (i % 3), t = n - 1 - (i % 4), w = i <= 7 ? 2 + (i % 2) : 1;
    days.push({
      day: d,
      p: { n, w: n - 1, t, r: 1, sec: { Grill: Math.round(n * 0.3), Sauce: Math.round(n * 0.2), Larder: Math.round(n * 0.35), Fryer: Math.round(n * 0.15) },
        mins: { Grill: [50, 60, 75], Sauce: [70, 90, 110], Larder: [40, 55, 70], Fryer: [30, 40, 55] }, who: { ann: Math.round(t * 0.4), bo: Math.round(t * 0.35), sam: Math.round(t * 0.25) } },
      w: { n: w, reason: { excess: w - (i % 2), ...(i % 2 ? { expired: 1 } : {}) }, sec: { Fryer: w }, items: [{ t: 'Chips', u: 'kg', a: 1.5 * w, n: w }] },
      x: { out: i % 3 === 0 ? 1 : 0, in: i % 5 === 0 ? 1 : 0 },
      fs: { v: 1,
        del: i % 2 ? [] : [{ at: '07:40', s: 'Green Grocer', c: 3.2, f: null, n: 'All there', by: 'Ann' }, { at: '10:15', s: 'City Meats', c: 2.1, f: -18.5, n: '', by: 'Bo' }],
        c: i === 2 ? { cv: 1, due: 32, done: 30, miss: ['Fryer oil change'], missN: 1, unable: [{ t: 'Hood filters', n: 'No degreaser' }], unableN: 1, wait: [], waitN: 0, ev: 0, evRec: 0 }
          : { cv: 1, due: 30, done: 30, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 0, evRec: 0 },
        cool: i % 4 === 2 ? { k: 'batch', start: '14:05', by: 'Bo', s2: '16:10', s2by: 'Bo', r1: '16:07', r1by: 'Bo', r2: '18:02', r2by: 'Ann' } : { k: 'none' } }
    });
  }
  return days;
}

// Item links and Item evidence: seven days of recorded names, one already linked (Laksa paste to the Laksa recipe).
function analysis(x) {
  const ref = { alias: 'Laksa paste', label: 'Laksa paste', recipeId: 'laksa', supplierId: '', itemId: '', guideId: '', v: 1, at: L.NOW - 5 * DAY, by: 'owner' };
  x[key('references', 'ai-laksa-paste')] = ref;
  const dailies = [];
  for (let i = 7; i >= 1; i--) {
    const d = dayN(i);
    const prep = LINES.map(([text, station, qty, recipe], k) => ({ id: 'p' + k, text, station, recipe, done: k % 5 !== 4, doneById: WHO[k % 3][0] }));
    prep.push({ id: 'h', text: 'Chop herbs', station: 'Larder', done: true, doneById: 'ann' });
    const waste = [{ id: 'w1', text: 'Chips', amount: 1.5, unit: 'kg', reason: 'excess' }].concat(i % 2 ? [{ id: 'w2', text: 'Slaw', amount: 1, unit: 'tub', reason: 'expired' }] : []);
    const daily = C.daily(d, { prep, waste }, [{ ...ref, id: 'ai-laksa-paste' }]);
    x[key('analysisDaily', 'g1_' + d)] = daily;
    dailies.push(daily);
  }
  x[key('analysis', 'current')] = { generation: 'g1', at: L.NOW - 11 * 3600000, from: dayN(7), to: dayN(1), days: 7 };
  const agg = C.aggregate(dailies);
  for (const n of [7, 30, 90]) x[key('analysis', 'range-' + n)] = { ...agg, generation: 'g1', at: L.NOW - 11 * 3600000, from: dayN(7), to: dayN(1), days: 7, dates: dailies.map(d => ({ day: d.day, counts: d.counts })), totalItems: agg.items.length };
}

// Every past day's lines, so Insights, Wastage, Transfers, Team and the Proofreader have something real to read.
function pastLines(x) {
  for (let i = 1; i <= 60; i++) {
    const d = dayN(i);
    LINES.forEach(([text, station, qty, recipe], k) => {
      if ((i + k) % 7 === 0) return;   // not every line every day
      const [id, name] = WHO[(i + k) % 3], done = (i + k) % 9 !== 0;
      x[key('days', d, 'items', 'd' + k)] = { text, station, qty, recipe, addedBy: 'Sam', addedById: 'sam', addedAt: at(d, '08:' + String(10 + k).padStart(2, '0')), done, deleted: false,
        ...(done ? { doneBy: name, doneById: id, doneAt: at(d, String(9 + (k % 4)).padStart(2, '0') + ':' + String(5 + 4 * k).padStart(2, '0')) } : {}) };
    });
    x[key('waste', d, 'lines', 'w1')] = { text: 'Chips', amount: 1.5, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Bo', addedById: 'bo', addedAt: at(d, '21:30'), deleted: false };
    if (i % 2) x[key('waste', d, 'lines', 'w2')] = { text: 'Slaw', amount: 1, unit: 'tub', reason: 'expired', action: '', station: 'Larder', addedBy: 'Ann', addedById: 'ann', addedAt: at(d, '10:05'), deleted: false };
    if (i > 30) continue;   // transfers and orders: the 30 days their reports read
    if (i % 3 === 0) x[key('transfers', d, 'lines', 't1')] = { text: 'Lemons', amount: 12, unit: 'pieces', dir: 'out', venue: 'Venue B', person: 'Jo', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: at(d, '11:00'), deleted: false, back: true };
    if (i % 5 === 0) x[key('transfers', d, 'lines', 't2')] = { text: 'Brioche buns', amount: 2, unit: 'packs', dir: 'in', venue: 'Venue C', person: 'Lee', note: '', addedBy: 'Sam', addedById: 'sam', addedAt: at(d, '16:20'), deleted: false };
    if (i % 2 === 0) x[key('orders', d, 'lines', 'o1')] = { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: at(d, '13:00'), ordered: true, orderedBy: 'Sam', orderedById: 'sam', orderedAt: at(d, '14:00'), deleted: false };
  }
  // the Proofreader: yesterday's lines where autocorrect saved other words than were typed
  const y = dayN(1);
  x[key('days', y, 'items', 'pr1')] = { text: 'Cut brine', orig: 'Cut brie', qty: '2 blocks', station: 'Larder', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: at(y, '09:12'), done: true, doneBy: 'Ann', doneById: 'ann', doneAt: at(y, '11:30'), deleted: false, by: 'ann' };
  x[key('days', y, 'items', 'pr2')] = { text: 'Whip cream cheese', orig: 'Whip cream chese', qty: '1 tub', station: 'Larder', recipe: '', addedBy: 'Bo', addedById: 'bo', addedAt: at(y, '09:40'), done: true, doneBy: 'Bo', doneById: 'bo', doneAt: at(y, '12:10'), deleted: false, by: 'bo' };
  // a loan to another venue, not back yet
  const lent = dayN(5), loan = { dir: 'out', venue: 'Venue B', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: at(lent, '15:00'), deleted: false, by: 'bo' };
  x[key('transfers', lent, 'lines', 'l1')] = loan;
  x[key('transferOpen', lent + '_l1')] = { date: lent, lineId: 'l1', record: loan, open: true };
}

// Today's team, the nightly team count (Reports, Team) and the kitchen's set-up (Kitchen room).
function team(x) {
  x[key('team', today)] = { day: today, on: [{ id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'bo', sh: 'lunch', sec: 'sauce' },
    { id: 'sam', sh: 'dinner', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'larder' }, { id: 'bo', sh: 'dinner', sec: 'fryer' }],
  br: [{ id: 'ann', sh: 'dinner', at: 1110, len: 30 }, { id: 'bo', sh: 'dinner', at: 1140, len: 30 }], v: 1, at: L.NOW - 5 * 3600000, upd: L.NOW - 5 * 3600000, by: 'head' };
  const days = [];
  for (let i = 1; i <= 30; i++) days.push({ day: dayN(i), s: [{ p: 'ann', sec: i % 4 === 1 ? 'Fryer' : 'Larder', sh: 'lunch' }, { p: 'sam', sec: 'Grill', sh: 'lunch' }, { p: 'bo', sec: i % 3 ? 'Sauce' : 'Grill', sh: 'dinner' }] });
  x[key('teamsum', 'main')] = { v: 1, at: L.NOW - 11 * 3600000, day: today, from: dayN(30), to: dayN(1), days, usual: {}, learn: {} };
}

function kitchenSetup(x) {
  const mins = { no: 4, v: 1, status: 'published', date: dayN(5), start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam', att: [{ id: 'ann', st: 'present' }, { id: 'bo', st: 'present' }, { id: 'sam', st: 'present' }],
    guests: '', decisions: 'Fryer oil changed every Monday after lunch.', menu: '', safety: 'Date every tub that goes in the cool room.', dates: '', other: '',
    acts: [{ text: 'Fix the cool room door seal', who: 'sam', by: dayN(2), st: 'open' }], next: '', pubAt: L.NOW - 5 * DAY, removed: false, at: L.NOW - 5 * DAY, upd: L.NOW - 5 * DAY };
  x[key('minutes', 'm4')] = mins;
  x[key('minutes', 'm4', 'signs', '1_sam')] = { v: 1, st: 'read', at: L.NOW - 4 * DAY, name: 'Sam', by: 'sam' };
  x[key('notes', 'n1')] = { text: 'Green Grocer delivery at 09:00. Check the herbs.', tag: 'delivery', start: today, until: today, dows: [], tm: 540, removed: false, at: L.NOW - DAY, upd: L.NOW - DAY, by: 'sam' };
  x[key('notes', 'n2')] = { text: 'Fryer oil change after lunch', tag: 'none', start: today, until: today, dows: [], tm: 900, removed: false, at: L.NOW - DAY, upd: L.NOW - DAY, by: 'head' };
  const std = (sectionId, name, aliases, minimum, unit) => ({ sectionId, name, aliases, minimum, unit, instruction: 'Ready before service.', recipe: '', archived: false, v: 1, at: L.NOW - 3 * DAY, by: 'head' });
  x[key('prepStandards', 'rump')] = std('grill', 'Portion rump', ['rump'], 20, 'portions');
  x[key('prepStandards', 'schnitzel')] = std('grill', 'Crumb chicken schnitzels', ['schnitzels'], 30, 'portions');
  x[key('prepStandards', 'patties')] = std('grill', 'Chicken burger patties', ['patties'], 24, 'patties');
  x[key('prepStandards', 'onions')] = std('larder', 'Slice onions', ['onions', 'sliced onions'], 2, 'tubs');
  x[key('prepStandards', 'slaw')] = std('larder', 'Slaw', ['coleslaw'], 2, 'tubs');
  x[key('prepStandards', 'gravy')] = std('sauce', 'Gravy', ['make gravy'], 5, 'L');
  x[key('prepStandards', 'chips')] = std('fryer', 'Blanch chips', ['chips'], 4, 'trays');
}

export function adminDemo(more) {
  const x = {};
  x[key('config', 'main')] = { people: PEOPLE, sousIds: ['sam'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true, staffSee: { cleaning: true }, kitSecs: SECS, kitShifts: SHIFTS, cutoffs: CUTOFFS, prepStandardsEnabled: true };
  Object.assign(x, L.mail());
  const days = nightly();
  x[key('analysis', 'dashboard')] = { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: days[0].day, to: days[days.length - 1].day, days, needs: { links: 14, training: 0, inTraining: 0 } };
  x[key('analysis', 'health')] = { at: L.NOW - 11 * 3600000, status: 'ok' };
  const fnAt = hm => M.kat(today, M.hmMin(hm));
  x[key('functions', 'f1')] = M.derive({ id: 'f1', v: 1, status: 'confirmed', name: 'Jones 40th', date: today, start: fnAt('18:00'), loc: 'Beer garden', guests: 60, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: fnAt('18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 3, u: M.toU([3]) }], was: {}, chg: [],
    cBy: 'fay', cAt: L.NOW - DAY, confBy: 'fay', confAt: L.NOW - DAY, by: 'fay', upd: L.NOW - 3600000 });
  analysis(x); pastLines(x); team(x); kitchenSetup(x);
  return Object.assign(x, more || {});
}

// Keeps the Google account line (it names the owner's email) out of the film, folds today's function band to one line
// (the round minus, as a chef would) and sends the kitchen mail pop-up away: the Inbox shows the mail itself.
// Run in setup, before the first frame.
export async function hide(page) {
  await page.addStyleTag({ content: '.ad-admin > .p-bar { display: none !important; }' });
  await page.evaluate(() => {
    const later = document.querySelector('.mlp-wrap [data-ml="later"]'); if (later) later.click();
    const fold = document.querySelector('[data-fn="fold"][aria-expanded="true"]'); if (fold) fold.click();
  });
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await L.settle(page, 400);
}

// A page tab that may sit past the edge of the phone's tab row: slid into view first, so the tap lands where it shows.
export const showTab = t => page => page.evaluate(t => {
  const e = document.querySelector('.a-tab[data-t="' + t + '"]');
  if (e && e.offsetParent) e.scrollIntoView({ block: 'nearest', inline: 'center' });
}, t);
const toast = '.p-toast:not(.p-toast-old)';

export default {
  id: 'admin-today',
  title: 'Admin: Today',
  sub: 'What needs you, and how the kitchen is going',
  next: 'Admin: Reports',
  done: "That's the admin Today room",
  hash: '#/admin',
  open: { admin: true, adminPage: 'inbox', wait: 2200 },
  extra: adminDemo(),
  setup: hide,
  intro: ['The admin panel, Today.', "Here's what needs you today, and how to find any page fast."],
  outro: ["That's the admin Today room. Next up, Admin: Reports."],
  steps: [
    {
      title: 'Five rooms',
      say: ['The admin panel has five rooms: Today, Reports, Team, Kitchen and Prep.', 'Each room keeps its pages as tabs, under its name.', 'Today opens on the Inbox.'],
      do: [
        { s: 0, d: 0.6, circle: '.a-groups', opts: { pad: 6 } },
        { s: 1, d: 0.4, underline: '.a-tabs' },
        { s: 2, d: 0.3, circle: { phone: '.a-tab[data-t="inbox"]', desktop: '.a-quick[data-v="inbox"]' }, opts: { pad: 6 } }
      ]
    },
    {
      title: 'The Inbox',
      say: ['The Inbox lists what needs you today.', 'Open kitchen mail comes first, the most urgent at the top.', 'Then minutes still to sign, item links to check and transfers not back.', 'Each line has a button that opens its page.'],
      do: [
        { s: 0, d: 0.3, underline: '.dsh-needs .dsh-panel-head' },
        { s: 1, d: 0.5, circle: '.dsh-ml .ml-row >> nth=0' },
        { s: 2, d: 0.2, circle: '.dsh-need >> nth=1' },
        { s: 2, d: 2.0, circle: '.dsh-need >> nth=3' },
        { s: 2, d: 3.4, circle: '.dsh-need >> nth=4' },
        { s: 3, d: 0.5, circle: '.dsh-needs [data-dsh="open"][data-t="transfers"]', opts: { pad: 6 } }
      ]
    },
    {
      title: "Today's numbers",
      say: ["Under it are today's numbers, from the nightly run.", 'Prep ticked yesterday, waste in the last seven days and functions today.', 'Tap a number to open its report. Waste opens Wastage, in Reports.', 'Tap Today to come back.'],
      do: [
        { s: 0, d: 0.3, underline: '.dsh-day .dsh-panel-head' },
        { s: 1, d: 0.2, circle: '.dsh-dtile >> nth=0' },
        { s: 1, d: 1.6, circle: '.dsh-dtile >> nth=1' },
        { s: 1, d: 3.1, circle: '.dsh-dtile >> nth=2' },
        { s: 2, d: 0.7, clear: true },
        { s: 2, d: 0.9, tap: '.dsh-dtile[data-t="waste"]' },
        { s: 2, d: 2.6, circle: '.a-group[data-g="reports"]', opts: { pad: 6 } },
        { s: 3, d: 0.2, clear: true },
        { s: 3, d: 0.4, tap: '.a-group[data-g="today"]' }
      ]
    },
    {
      title: 'Dashboard',
      say: ['The Dashboard shows how the kitchen is going.', 'Pick 7, 30 or 90 days.', 'What changed says it in plain words, with a link to the report.', 'The week ahead lists functions and order cut-offs.'],
      do: [
        { s: 0, d: 0.4, tap: { phone: '.a-tab[data-t="dashboard"]', desktop: '.a-quick[data-v="dashboard"]' } },
        { s: 1, d: 0.2, circle: '.dsh-tools', opts: { pad: 6 } },
        { s: 1, d: 1.2, tap: '[data-dsh="period"][data-v="7"]' },
        { s: 2, d: 0.3, circle: '.dsh-head >> nth=1' },
        { s: 3, d: 0.3, underline: '.dsh-week .dsh-panel-head' },
        { s: 3, d: 1.4, circle: '.dsh-wk-day >> nth=0' }
      ]
    },
    {
      title: 'Item links',
      say: ['Item links is a review desk for the names the team writes.', 'Tap a name to check its recipe or supplier item.', 'This one already has its recipe. Tap Save and return to confirm the link.'],
      do: [
        { s: 0, d: 0.1, run: showTab('references') },
        { s: 0, d: 0.4, tap: '.a-tab[data-t="references"]' },
        { s: 0, d: 2.2, circle: '[data-ai="review-reference"] >> nth=0' },
        { s: 1, d: 0.4, clear: true },
        { s: 1, d: 0.6, tap: '[data-ai="review-reference"][data-value="ref:recipe:burger"]' },
        { s: 1, d: 2.2, circle: '#ai-recipeId-picker', opts: { pad: 6 } },
        { s: 2, d: 2.4, tap: '[data-ai="save"]' },
        { s: 2, d: 3.6, circle: toast }
      ]
    },
    {
      title: 'Proofreader',
      say: ['The Proofreader shows lines where autocorrect saved other words.', 'Here, brie became brine.', 'Tap Restore original to put back what was typed. Or tap Edit wording.'],
      do: [
        { s: 0, d: 0.1, run: showTab('proofreader') },
        { s: 0, d: 0.4, tap: '.a-tab[data-t="proofreader"]' },
        { s: 0, d: 2.4, tap: '[data-pr="review"] >> nth=0' },
        { s: 1, d: 0.2, circle: '.pr-comparison', opts: { pad: 6 } },
        { s: 2, d: 0.3, circle: '[data-pr="edit"]', opts: { pad: 6 } },
        { s: 2, d: 0.9, tap: '[data-pr="restore"]' },
        { s: 2, d: 2.4, circle: toast }
      ]
    },
    {
      title: 'Kitchen mail',
      say: ['Kitchen mail is what the team wrote to you, the most urgent first.', 'Change how soon it matters with this chip.', "When it's dealt with, tick it off."],
      do: [
        { s: 0, d: 0.1, run: showTab('mail') },
        { s: 0, d: 0.4, tap: '.a-tab[data-t="mail"]' },
        { s: 0, d: 2.2, circle: '.a-pane .ml-row >> nth=0' },
        { s: 1, d: 0.3, circle: '.a-pane .ml-row >> nth=0 >> .ux-picker-trigger', opts: { pad: 6 } },
        { s: 2, d: 0.4, tap: '.a-pane .ml-row >> nth=1 >> [data-p="ml-tick"]' },
        { s: 2, d: 1.6, circle: toast }
      ]
    },
    {
      title: 'Find',
      say: ['To jump to any page, tap Find. On a keyboard, press the slash key.', 'Type a few letters of a page or a name.', 'Tap it, and the page opens.'],
      do: [
        { s: 0, d: 0.5, tap: '[data-p="a-find"]' },
        { s: 1, d: 0.3, type: ['#fd-q', 'rec'] },
        { s: 1, d: 1.6, circle: '#fd-list .sheet-o >> nth=0' },
        { s: 2, d: 0.1, clear: true },
        { s: 2, d: 0.3, tap: '#fd-list .sheet-o >> nth=0' },
        { s: 2, d: 1.4, circle: '.a-tab[data-t="records"]', opts: { pad: 6 } }
      ]
    }
  ]
};
