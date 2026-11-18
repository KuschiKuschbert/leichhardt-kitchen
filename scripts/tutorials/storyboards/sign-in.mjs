// The Signing in tutorial (docs/tutorial-videos.md). A brand-new browser on the demo kitchen's Tuesday (fixtures.mjs):
// nobody signed in and no device choice made yet (profile: null), the kitchen PIN already on it. Set up as the kitchen's
// shared screen, Ann picks her name and types her PIN (2222, shown only as dots), starts an order, and the screen locks
// after 10 minutes on its own with her work kept behind her PIN. Same shape as storyboards/prep.mjs.
export default {
  id: 'sign-in',
  title: 'Signing in',
  sub: 'Your device, your name, your PIN',
  next: 'Home',
  done: "That's signing in",
  hash: '#/',
  who: '',
  open: { profile: null },
  intro: ['Signing in.', "Here's how to set up a device, sign in with your PIN and unlock it each day."],
  outro: ["That's signing in. Next up, Home."],
  steps: [
    {
      title: 'This device',
      say: ['The first time you open the book, it asks how this device is used.', 'My own device is just for you. Your PIN unlocks it each day after 04:00.', 'A shared kitchen screen is for the whole team. It locks after 10 minutes.'],
      do: [
        { s: 0, d: 0.4, underline: '#lk-device-title' },
        { s: 1, d: 0.3, circle: '[data-device="personal"]', opts: { pad: 4 } },
        { s: 2, d: 0.3, circle: '[data-device="shared"]', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Just recipes',
      say: ['Only after a recipe? Tap View recipes for now.', 'Recipes never need a sign in.'],
      do: [
        { s: 0, d: 0.6, circle: '[data-device-cancel]' }
      ]
    },
    {
      title: 'Kitchen sign in',
      say: ['This is the kitchen screen, so tap Shared kitchen screen.', 'Then tap Kitchen sign in.'],
      do: [
        { s: 0, d: 1.4, tap: '[data-device="shared"]' },
        { s: 1, d: 0.4, tap: '.wall-sign .btn' }
      ]
    },
    {
      title: 'Your name',
      say: ['Pick your name.', 'The first time, you choose your own four digit PIN to go with it.'],
      do: [
        { s: 0, d: 0.2, circle: '.p-names', opts: { pad: 6 } },
        { s: 1, d: 0.3, underline: '.p-card .hint' }
      ]
    },
    {
      title: 'Your PIN',
      say: ['Tap your name, then type your PIN.', 'It shows as dots, so nobody else sees it.', 'Your first sign in of the day opens Home.'],
      do: [
        { s: 0, d: 0.2, tap: '.p-name[data-id="ann"]' },
        { s: 0, d: 1.4, type: ['#pf1', '222'] },
        { s: 1, d: 0.2, circle: '.pin-cells', opts: { pad: 6 } },
        { s: 2, d: 0.2, circle: '.p-card button[type="submit"]' },
        { s: 2, d: 1.7, clear: true },
        { s: 2, d: 1.9, type: ['#pf1', '2'] }
      ]
    },
    {
      title: 'Walk away',
      say: ['Say you start an order, then get called away.', 'After 10 minutes on its own, a shared screen locks itself.'],
      do: [
        { s: 0, d: 0.2, tap: { phone: '.tabbar a[href="#/orders"]', desktop: '.pnav a[href="#/orders"]' } },
        { s: 0, d: 1.3, tap: '[data-p="o-write"]' },
        { s: 0, d: 2.1, type: ['#o-text', 'Lemons'] },
        // ten minutes and a bit on the page's own clock: the shared screen's idle lock
        { s: 1, d: 0.8, run: async page => { await page.clock.runFor(11 * 60000); } }
      ]
    },
    {
      title: 'Kept for you',
      say: ['Your name stays on the lock, and your work is kept behind your PIN.', 'Someone else? They tap Not me and sign in as themselves.'],
      do: [
        { s: 0, d: 0.2, underline: '.p-card .p-h' },
        { s: 0, d: 2.2, circle: '.p-card .p-err', opts: { pad: 5 } },
        { s: 1, d: 0.4, circle: '.p-card [data-p="who-change"]' }
      ]
    },
    {
      title: 'Back to work',
      say: ["Type your PIN and you're straight back, with Lemons still there.", 'Every device asks for your PIN again after 04:00, ready for the new day.'],
      do: [
        { s: 0, d: 0.3, type: ['#pf1', '2222'] },
        { s: 0, d: 2.6, circle: '#o-text', opts: { pad: 5 } }
      ]
    }
  ]
};
