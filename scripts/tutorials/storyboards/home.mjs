// The Home tutorial (docs/tutorial-videos.md). Filmed as Ann, a cook, on her own phone, on the demo kitchen's Tuesday
// (fixtures.mjs), with a saved Today's team (Ann on Larder, Sam, Bo and the made-up Jo), the made-up Smith 60th tomorrow
// and Jones wedding on Sunday, and one shift ping from Sam. The mascot plays on the first Home view of the day.
// Same shape as storyboards/prep.mjs.
import { createRequire } from 'module';
import { L } from '../kit.mjs';

const M = createRequire(import.meta.url)('../../../js/functions.js');
const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW));
const at = (d, hm) => M.kat(d, M.hmMin(hm));
// a sheet closed with Escape gives the keyboard ring back to its button: taken off, as a tap would leave it
const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur());

// the click tests' people plus Jo, the four sections and two shifts of the made-up kitchen
const seedCfg = L.seed()[key('config', 'main')];
const cfg = Object.assign({}, seedCfg, {
  people: seedCfg.people.concat([{ id: 'jo', name: 'Jo', role: 'staff', active: true, add: true, tick: true }]),
  kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }, { id: 'fryer', name: 'Fryer' }],
  kitShifts: [{ id: 'day', name: 'Day', from: 600, to: 1080 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }]
});
// worked out again from the people by tests/lib.js seed(), so Jo is on the staff list too
['staffIds', 'addIds', 'tickIds', 'delIds'].forEach(k => delete cfg[k]);

const booking = (name, plus, loc, guests, qty) => {
  const d = M.addDays(day, plus);
  return M.derive({ v: 1, status: 'confirmed', name, date: d, start: at(d, plus === 1 ? '18:00' : '17:30'), loc, guests, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: at(d, '18:30'), note: '' }], od: M.addDays(day, -2), lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty, u: M.toU([qty]) }],
    was: {}, chg: [], cBy: 'sam', cAt: 1, confBy: 'sam', confAt: 1, by: 'sam', upd: L.NOW - 86400000 });
};

export default {
  id: 'home',
  title: 'Home',
  sub: 'Your day at a glance',
  next: 'Recipes',
  done: "That's Home",
  hash: '#/',
  who: 'ann',
  extra: {
    [key('config', 'main')]: cfg,
    [key('team', day)]: { day, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam',
      on: [{ id: 'ann', sh: 'day', sec: 'larder' }, { id: 'sam', sh: 'day', sec: 'grill' }, { id: 'bo', sh: 'day', sec: 'sauce' }, { id: 'jo', sh: 'dinner', sec: 'fryer' }],
      br: [{ id: 'ann', sh: 'day', at: 930, len: 30 }, { id: 'sam', sh: 'day', at: 900, len: 30 }, { id: 'bo', sh: 'day', at: 960, len: 30 }] },
    // tomorrow's function gets the Function tomorrow card; Sunday's is in Coming up
    [key('functions', 'smith')]: booking('Smith 60th', 1, 'Function room', 60, 5),
    [key('functions', 'jones')]: booking('Jones wedding', 5, 'Beer garden', 90, 9),
    [key('notes', 'n1')]: { text: 'New menu tasting at 15:00 at the pass', tag: 'none', start: day, until: day, dows: [], tm: 835, removed: false, at: 1, upd: 1, author: 'sam', by: 'sam' }
  },
  // the ping pops up when the book opens: closed before filming, so the bell shows it later
  async setup(page, cut, L) {
    await L.waitFor(page, () => !!document.querySelector('.nt-wrap .nt-got'), null, 4000).catch(() => {});
    if (await page.$('.nt-wrap .nt-got')) { await page.click('.nt-wrap .nt-got'); await L.settle(page, 600); }
  },
  intro: ['Home.', 'Your section, your break and your team, the moment you open the book.'],
  outro: ["That's Home. Next up, Recipes."],
  steps: [
    {
      title: 'Hello',
      say: ['Home greets you by name.', 'The mascot plays when you first open the book each day. Tap him to see it again.'],
      do: [
        { s: 0, d: 0.3, underline: '#rtitle' },
        { s: 1, d: 3.2, tap: 'button.mascot' }
      ]
    },
    {
      title: 'Your day',
      say: ['Your day comes first: your section and your shift hours.', "Then your break, and when you're back."],
      do: [
        { s: 0, d: 0.3, circle: '[data-hm-priority="section"]', opts: { pad: 3 } },
        { s: 1, d: 0.2, circle: '[data-hm-priority="break"]', opts: { pad: 3 } }
      ]
    },
    {
      title: 'On with you',
      say: ['Next, who is on with you today, by section.', "Tap View today's full team to see the whole day."],
      do: [
        { s: 0, d: 0.2, circle: '#hm-with-body', opts: { pad: 2 } },
        { s: 1, d: 0.8, tap: '#hm-full-team > summary' }
      ]
    },
    {
      title: 'Prep and more',
      say: ['Prep by section shows how much is left in each section.', 'Coming up lists the functions later in the week.'],
      do: [
        { s: 0, d: 0.2, circle: '#hm-prep', opts: { pad: 2 } },
        { s: 1, d: 0.2, circle: '.hm-up', opts: { pad: 2 } }
      ]
    },
    {
      title: 'Functions',
      say: ["Tomorrow's function gets its own card, with the food times and the platters.", 'Tap Got it once you have read it, and the next one comes up.'],
      do: [
        { s: 0, d: 0.3, underline: '.fn-hu .fn-hu-name' },
        { s: 0, d: 1.8, circle: '.fn-hu .fn-hu-facts', opts: { pad: 4 } },
        { s: 1, clear: true },
        { s: 1, d: 0.6, tap: '.fn-hu-got' }
      ]
    },
    {
      title: 'Top bar',
      say: ['Up top, the people button shows your day in one tap.', "The bell holds today's shift pings from the chefs.", 'The clock beside them is the cooling timer.'],
      do: [
        { s: 0, top: true },
        { s: 0, d: 0.9, tap: '.tm-slot [data-tm="day"]' },
        { s: 1, key: 'Escape', run: blur },
        { s: 1, d: 0.4, tap: '.nbell' },
        { s: 2, key: 'Escape', run: blur },
        { s: 2, d: 0.4, circle: '.cooling-slot', opts: { pad: 3 } }
      ]
    },
    {
      title: 'Chef hat',
      say: ['The chef hat is your menu: your section, functions, the drinks run, Settings and more.', 'Not you on this phone? Sign out is at the top.'],
      do: [
        { s: 0, d: 0.2, tap: '.wtop-who' },
        { s: 0, d: 1.6, circle: '.wm .wm-grid >> nth=0', opts: { pad: 3 } },
        { s: 1, d: 0.3, circle: '.wm .wm-out', opts: { pad: 3 } },
        { s: 1, d: 2.5, clear: true },
        { s: 1, d: 2.7, key: 'Escape', run: blur }
      ]
    },
    {
      title: 'Every list',
      say: ['The tabs open each list in one tap.', 'Tap the logo to come back to Home from anywhere.'],
      do: [
        { s: 0, d: 0.2, circle: { phone: '.tabbar', desktop: '.pnav' }, opts: { pad: 2 } },
        { s: 1, d: 0.2, circle: '.wtop-brand' }
      ]
    }
  ]
};
