// The Settings tutorial (docs/tutorial-videos.md). Filmed as Ann, a cook, on her own phone, on the demo kitchen's
// Tuesday (fixtures.mjs), with a saved Today's team that puts her on Larder (so My section today shows). A phone's
// screen lock is stood in for, so Keep the screen on shows as it does on a phone; a computer does not offer it.
// Only Ann's own rows are filmed: no admin identity, no Backup and PIN. Same shape as storyboards/prep.mjs.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW));
const seedCfg = L.seed()[key('config', 'main')];
const wakeLock = () => {
  const lock = { request: () => new Promise(yes => { const s = new EventTarget(); s.type = 'screen'; s.released = false; s.release = () => { s.released = true; s.dispatchEvent(new Event('release')); return Promise.resolve(); }; yes(s); }) };
  Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => lock });
};
const row = id => '[data-act="strow"][data-val="' + id + '"]';

export default {
  id: 'settings',
  title: 'Settings',
  sub: 'Your book, your way',
  next: 'The chef panel',
  done: "That's Settings",
  hash: '#/',
  who: 'ann',
  open: { init: wakeLock },
  extra: {
    [key('config', 'main')]: Object.assign({}, seedCfg, {
      kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }],
      kitShifts: [{ id: 'day', name: 'Day', from: 600, to: 1080 }]
    }),
    [key('team', day)]: { day, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam',
      on: [{ id: 'ann', sh: 'day', sec: 'larder' }, { id: 'sam', sh: 'day', sec: 'grill' }, { id: 'bo', sh: 'day', sec: 'sauce' }], br: [] }
  },
  intro: ['The Settings page.', 'Your own settings, and how this phone or tablet works.'],
  outro: ["That's Settings. Next up, the chef panel."],
  steps: [
    {
      title: 'Open Settings',
      say: ['Settings is at the bottom of the chef hat menu.'],
      do: [
        { s: 0, d: 0.2, tap: '.wtop-who' },
        { s: 0, d: 1.6, tap: '.wm a[href="#/settings"]' }
      ]
    },
    {
      title: 'Your card',
      say: ['Your card at the top says who is signed in, and how this device is used.', 'Sign out is here too.'],
      do: [
        { s: 0, d: 0.3, circle: '.st-you', opts: { pad: 3 } },
        { s: 1, d: 0.2, circle: '.st-you [data-who="out"]' }
      ]
    },
    {
      title: 'My section',
      say: ['My section today is where your prep lines and wastage go.', 'Change it here. It clears at midnight.'],
      do: [
        { s: 0, d: 0.4, tap: row('section') },
        { s: 1, d: 0.2, circle: '[data-act="stsec"]' }
      ]
    },
    {
      title: 'What you can do',
      say: ['What you can do lists what the head chef has set for you.', 'Usual drink opens the drinks run, to set your coffee.'],
      do: [
        { s: 0, d: 0.3, tap: row('can') },
        { s: 0, d: 1.6, circle: '#st-b-can .st-caps', opts: { pad: 4 } },
        { s: 1, d: 0.2, circle: '[data-row="drink"]', opts: { pad: 2 } }
      ]
    },
    {
      title: 'Text size',
      say: ['Text size makes the whole book bigger on this phone.', 'Normal puts it back.'],
      do: [
        { s: 0, d: 0.3, tap: row('text') },
        { s: 0, d: 1.3, tap: '#st-b-text .ux-picker-trigger' },
        { s: 0, d: 2.2, tap: '.ux-picker [data-index="1"]' },
        { s: 1, d: 0.1, tap: '#st-b-text .ux-picker-trigger' },
        { s: 1, d: 0.9, tap: '.ux-picker [data-index="0"]' }
      ]
    },
    {
      title: 'Recipes',
      say: ['Recipes open with chooses the Pass or Tiles on this phone.'],
      do: [
        { s: 0, d: 0.3, tap: row('opens') },
        { s: 0, d: 1.4, circle: '#st-b-opens .ux-picker-trigger', opts: { pad: 4 } }
      ]
    },
    {
      // a computer does not offer it
      title: 'Keep screen on',
      skip: { desktop: true },
      say: ['Keep the screen on stops the phone sleeping while a recipe is open.'],
      do: [
        { s: 0, d: 0.1, tap: row('keepon') },
        { s: 0, d: 1.2, circle: '#st-b-keepon .chips', opts: { pad: 4 } }
      ]
    },
    {
      title: 'This device',
      say: ['How this device is used says My own device, or Shared kitchen screen.', 'Change it, or forget this device, here.'],
      do: [
        { s: 0, d: 0.3, tap: row('device') },
        { s: 1, d: 0.1, circle: '#st-b-device .btn-row', opts: { pad: 3 } }
      ]
    },
    {
      title: 'Update now',
      say: ['The book updates by itself when nothing is waiting to send.', 'When an update is ready, tap Update now to get it straight away.'],
      do: [
        { s: 0, d: 0.3, tap: row('version') },
        { s: 0, d: 1.4, underline: '#st-b-version .st-vnote' },
        // a new copy of the book becomes known, the way the update check hears of one
        { s: 1, d: 0.1, run: async page => { await page.clock.fastForward(10000); await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' }))); } },
        { s: 1, d: 1.0, circle: '[data-act="updcheck"]' }
      ]
    }
  ]
};
