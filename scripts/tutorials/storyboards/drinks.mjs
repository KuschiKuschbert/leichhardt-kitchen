// The Drinks run tutorial (docs/tutorial-videos.md). Filmed as Ann, a cook, on her own phone, on the demo kitchen's
// Tuesday (fixtures.mjs). The click tests' Sam, Ann and Bo keep their usual drinks; the made-up Kim, Jo and Raj join
// them, and everyone but Raj has opened the book today. Same shape as storyboards/prep.mjs.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const seedCfg = L.seed()[key('config', 'main')];
const cfg = Object.assign({}, seedCfg, { people: seedCfg.people.concat(['Kim', 'Jo', 'Raj'].map(name => ({ id: name.toLowerCase(), name, role: 'staff', active: true, add: true, tick: true }))) });
// worked out again from the people by tests/lib.js seed(), so the three are on the staff list too
['staffIds', 'addIds', 'tickIds', 'delIds'].forEach(k => delete cfg[k]);
const usual = (id, v) => Object.assign({ kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', other: '', at: L.NOW - 86400000, by: id }, v || {});
const seen = (name, hours) => ({ name, lastSeen: L.NOW - hours * 3600000 });

export default {
  id: 'drinks',
  title: 'Drinks run',
  sub: 'Your usual, and one order for everyone',
  next: "Today's team",
  hash: '#/',
  who: 'ann',
  extra: {
    [key('config', 'main')]: cfg,
    [key('drinks', 'kim')]: usual('kim', { kind: 'latte', size: 'large', milk: 'skim', sugar: '' }),
    [key('drinks', 'jo')]: usual('jo'),
    [key('drinks', 'raj')]: usual('raj', { kind: 'cap', milk: '', sugar: '2' }),
    [key('activity', 'sam')]: seen('Sam', 3),
    [key('activity', 'bo')]: seen('Bo', 0.5),
    [key('activity', 'kim')]: seen('Kim', 2),
    [key('activity', 'jo')]: seen('Jo', 1),
    [key('activity', 'raj')]: seen('Raj', 24)
  },
  intro: ['The drinks run.', 'Set your usual drink once, and the order adds itself up.'],
  outro: ["That's the drinks run. Next up, Today's team."],
  steps: [
    {
      title: 'Open it',
      say: ['The drinks run is in the chef hat menu.'],
      do: [
        { s: 0, d: 0.2, tap: '.wtop-who' },
        { s: 0, d: 1.3, tap: '.wm a[href="#/drinks"]' }
      ]
    },
    {
      title: 'The order',
      say: ["The order adds up everyone's usual drink, the same drinks together.", 'Five people are in today, so there are five drinks.'],
      do: [
        { s: 0, d: 0.3, circle: '.dr-order', opts: { pad: 4 } },
        { s: 1, d: 0.2, circle: '.dr-n', opts: { pad: 5 } }
      ]
    },
    {
      title: 'On today',
      say: ['On today shows who has signed in today, with their drink.', 'Anyone not in yet stays off the order. Tap Show them to see them.'],
      do: [
        { s: 0, d: 0.3, circle: '.dr-team', opts: { pad: 3 } },
        { s: 1, d: 1.8, tap: '[data-p="dk-all"]' }
      ]
    },
    {
      title: 'Coffee first',
      say: ['A usual can have a coffee and a soft drink.', 'The order takes the coffee, and the soft drink shows in brackets, so the runner can swap.'],
      do: [
        { s: 0, d: 0.3, circle: '.dr-team .dr-row >> nth=0', opts: { pad: 3 } }
      ]
    },
    {
      title: 'Your usual',
      say: ['Your usual sits at the top. Tap Change to set it.'],
      do: [
        { s: 0, top: true },
        { s: 0, d: 0.9, circle: '.dr-mine', opts: { pad: 3 } },
        { s: 0, d: 2.2, clear: true },
        { s: 0, d: 2.4, tap: '[data-p="dk-edit"]' }
      ]
    },
    {
      title: 'Pick it',
      say: ['Choose the size, and change the milk or the sugar if you need to.', 'Anything else, like extra hot, goes in the box below.'],
      do: [
        { s: 0, d: 0.4, tap: '[data-p="dk-pick"][data-f="size"][data-v="large"]' },
        { s: 0, d: 1.8, circle: '.dr-fold[data-f="milk"]', opts: { pad: 3 } },
        { s: 0, d: 3.0, circle: '.dr-fold[data-f="sugar"]', opts: { pad: 3 } },
        { s: 1, d: 0.3, clear: true },
        { s: 1, d: 0.5, type: ['#dk-note', 'Extra hot'] }
      ]
    },
    {
      title: 'Save it',
      say: ['Check your usual under the form, then tap Save my usual.', 'The order changes straight away.'],
      do: [
        { s: 0, d: 0.3, circle: '.dr-prev', opts: { pad: 4 } },
        { s: 0, d: 2.4, clear: true },
        { s: 0, d: 2.6, tap: '[data-p="dk-save"]' },
        { s: 1, d: 0.3, circle: '.dr-order', opts: { pad: 4 } }
      ]
    }
  ]
};
