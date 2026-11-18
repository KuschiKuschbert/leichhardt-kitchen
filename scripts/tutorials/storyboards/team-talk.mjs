// Pings, minutes and mail, one tutorial for three pages (docs/tutorial-videos.md). Filmed as Sam, the sous chef, on the
// demo kitchen's Tuesday (fixtures.mjs): he reads today's shift pings like everyone, signs yesterday's minutes, writes a
// ping as a chef, and sends Kitchen mail to the head chef. Made-up pings, minutes and mail only.
//   Pings pop up at their own time for 30 minutes: these two were set for 13:50, so they pop up when the demo day opens
//   at 14:00. That popup shows pings only; the bell's sheet also shows the minutes waiting to be signed, after Got it. Sam sent his apology to the meeting, so the sign box reads "I have read and understood these minutes."
//   Kitchen mail already sent from this phone is kept on the phone (lk.mail.sent), its Seen and Done read from mailstat.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), yesterday = L.ymd(new Date(L.NOW - 86400000));
const ping = (text, tag) => ({ text, tag, start: today, until: today, dows: [], tm: 830, removed: false, at: L.NOW - 3 * 3600000, upd: L.NOW - 3 * 3600000, author: 'sam', by: 'sam' });

const extra = {
  [key('notes', 'n1')]: ping('Special tonight: pork belly with apple slaw', 'special'),
  [key('notes', 'n2')]: ping('Function in the garden at 18:00 for 40 people', 'function'),
  [key('minutes', 'm3')]: {
    no: 3, v: 1, status: 'published', date: yesterday, start: '14:00', loc: 'Kitchen', chair: 'ann', taker: 'bo',
    att: [{ id: 'ann', st: 'present' }, { id: 'bo', st: 'present' }, { id: 'sam', st: 'apology' }], guests: '',
    decisions: 'New winter menu starts Friday\nDeep clean of the cool room on Sunday', menu: 'Pork belly special this week',
    safety: 'Label every tub with the date and your initials', dates: '', other: '',
    acts: [{ what: 'Print the new menu cards', who: 'sam', by: '' }, { what: 'Clean the fryer', who: 'ann', by: '' }, { what: 'Read the new allergen folder', who: 'all', by: '' }],
    next: '', pubAt: L.NOW - 20 * 3600000, removed: false, at: 1, upd: 1, by: 'ann'
  },
  [key('mailstat', 'mx1')]: { seen: true, done: false, by: 'sam' },
  [key('mailstat', 'mx2')]: { seen: true, done: true, by: 'sam' }
};

// two mails Sam sent earlier from this phone: one Chef has seen, one done
const init = () => {
  const n = Date.now();
  localStorage.setItem('lk.mail.sent', JSON.stringify([
    { id: 'mx1', w: 'sam', cat: 'stock', pri: 'week', text: 'We are low on piping bags', at: n - 26 * 3600000, p: 0, s: false, d: false },
    { id: 'mx2', w: 'sam', cat: 'equipment', pri: 'today', text: 'Combi door seal is loose', at: n - 50 * 3600000, p: 0, s: false, d: false }
  ]));
};

export default {
  id: 'team-talk',
  title: 'Pings, minutes and mail',
  sub: 'Read it, sign it, tell the chef',
  done: "That's pings, minutes and mail",
  next: 'Drinks run',
  hash: '#/prep',
  who: 'sam',
  extra,
  open: { init },
  // the pings pop up as the page opens; wait for them, so the film starts on the popup
  async setup(page, cut, L) { await L.waitFor(page, () => !!document.querySelector('.nt .nt-got'), null, 8000); await L.settle(page, 400); },
  intro: ['Pings, minutes and mail.', "Here's how the kitchen keeps everyone in the loop."],
  outro: ["That's pings, minutes and mail. Next up, the drinks run."],
  steps: [
    {
      title: 'Shift pings',
      say: ['A shift ping is a short message from the chefs. It pops up on screen.', 'Each one says what it is about and who sent it.', 'Close it, and the bell up top opens it again any time.'],
      do: [
        { s: 0, d: 2.0, circle: '.nt-list', opts: { pad: 4 } },
        { s: 1, d: 1.0, circle: '.nt-meta >> nth=0', opts: { pad: 5 } },
        { s: 2, d: 0.4, tap: '.nt-later' },
        { s: 2, d: 2.0, tap: '.nbell' }
      ]
    },
    {
      title: 'Got it',
      say: ['Read them, then tap Got it.', 'Anything else waiting for you comes next, like minutes to sign.'],
      do: [
        { s: 0, d: 1.0, tap: '.nt-got' },
        { s: 1, d: 0.8, circle: '.nt .nt-mn', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Meeting minutes',
      say: ['Tap the minutes to read them.', 'The actions that are yours are marked Yours.'],
      do: [
        { s: 0, d: 0.6, tap: '.nt .nt-a' },
        { s: 1, d: 0.5, circle: '.mn-tbl tr.is-mine >> nth=0', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Sign them',
      say: ['Read to the end. The sign box says: I have read and understood these minutes.', 'Tap Sign as Sam. Your name, the version and the time are kept.'],
      do: [
        { s: 0, d: 2.2, underline: 'text=I have read and understood these minutes.' },
        { s: 1, d: 0.3, tap: '.mn-signbtn' },
        { s: 1, d: 1.6, circle: '.mn-sign.is-done', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Write a ping',
      say: ['Chefs write the pings. Open the chef hat, then Shift pings.', 'Tap Write a ping, and type it in.'],
      do: [
        { s: 0, d: 1.6, tap: '.wtop-who' },
        { s: 0, d: 3.2, tap: '.wm [data-who="open"][data-v="pings"]' },
        { s: 1, d: 0.3, tap: '[data-p="n-new"]' },
        { s: 1, d: 1.5, type: ['#n-text', 'Function prep starts at 16:00'] }
      ]
    },
    {
      title: 'Who gets it',
      say: ['Send it to everyone, or pick one person.', 'It shows today, or pick a day ahead.', 'Then tap Save ping.'],
      do: [
        { s: 0, d: 1.0, tap: '#n-to-picker' },
        { s: 0, d: 2.2, tap: '.ux-picker [data-index="2"]' },
        { s: 1, d: 0.3, circle: 'button.ux-picker-trigger[aria-label="Show on: Today"]' },
        { s: 2, d: 0.2, tap: '[data-p="n-save"]' },
        { s: 2, d: 1.4, circle: 'text=For Ann', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Kitchen mail',
      say: ['Kitchen mail goes to the head chef.', 'Pick what it is about, and how soon it matters.', 'Write a short message, then tap Send to Chef.'],
      do: [
        { s: 0, go: '#/mail' },
        { s: 0, d: 0.6, underline: '.ml-page #rtitle' },
        { s: 1, d: 0.3, tap: '.ml-cats .ux-picker-trigger' },
        { s: 1, d: 1.4, tap: '.ux-picker [data-index="1"]' },
        { s: 1, d: 2.6, tap: '[data-p="ml-pri"][data-v="today"]' },
        { s: 2, d: 0.3, type: ['[data-k="ml-text"]', 'Grill 2 will not light'] },
        { s: 2, d: 3.2, tap: '[data-p="ml-send"]' }
      ]
    },
    {
      title: 'Sent, Seen, Done',
      say: ['Your mail is listed underneath.', 'Sent means it went. Seen means Chef has read it. Done means it is sorted.'],
      do: [
        // Your mail goes to the top, clear of the Sent slip; the list is drawn again as the new mail's status comes in,
        // so the marks wait for it
        { s: 0, d: 0.2, scroll: '.ml-sent' },
        { s: 0, d: 0.8, circle: '.ml-sent .ml-h3' },
        { s: 1, d: 0.2, circle: '.ml-sent .ml-st >> nth=0' },
        { s: 1, d: 1.5, circle: '.ml-sent .ml-st >> nth=1' },
        { s: 1, d: 3.3, circle: '.ml-sent .ml-st >> nth=2' }
      ]
    }
  ]
};
