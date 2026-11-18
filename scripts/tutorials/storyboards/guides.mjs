// The Guides tutorial (docs/tutorial-videos.md). Filmed as Ann, a cook, on the demo kitchen's Tuesday (fixtures.mjs).
// The guides are the click tests' made-up Fryer oil change (tests/lib.js guides()) plus the three that come with the
// book; the made-up iCombi guide is left out (its stand-in page picture is a plain orange block). The video opens the
// bundled Smoke menu prep and setup guide: it has steps, two illustrated pages and a printable PDF.
import { L } from '../kit.mjs';

const G = (...p) => ['kitchens', L.PIN, 'guides', ...p].join('/');
const extra = Object.assign(L.guides(), { [G('combi')]: undefined, [G('combi', 'pages', '0')]: undefined, [G('combi', 'pages', '1')]: undefined });
const pick = '.g-cats .ux-picker-trigger';

export default {
  id: 'guides',
  title: 'Guides',
  sub: 'Find it, follow it, print it',
  done: "That's Guides",
  next: 'Pings, minutes and mail',
  hash: '#/guides',
  who: 'ann',
  extra,
  intro: ['Guides.', "Here's how to find a guide, follow it step by step, and print it."],
  outro: ["That's Guides. Next up, pings, minutes and mail."],
  steps: [
    {
      title: 'All the guides',
      say: ['Every guide the head chef has written is here, grouped by kind.', 'Each card says how many pages and steps it has.'],
      do: [
        // on a big screen the heading runs the whole width, so only the phone underlines it
        { s: 0, d: 0.3, only: 'phone', underline: '.g-title' },
        { s: 0, d: 2.4, circle: '.g-gh >> nth=0' },
        { s: 1, d: 0.4, circle: '.g-cm >> nth=0', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Pick a kind',
      say: ['Tap the All button to pick a kind of guide.', 'Pick Cleaning, and only the cleaning guides show.', 'Pick All again to see every guide.'],
      do: [
        { s: 0, d: 0.9, tap: pick },
        { s: 1, d: 0.4, tap: '.ux-picker [data-index="2"]' },
        { s: 1, d: 1.9, circle: '.g-card >> nth=0' },
        { s: 2, d: 0.3, tap: pick },
        { s: 2, d: 1.3, tap: '.ux-picker [data-index="0"]' }
      ]
    },
    {
      title: 'Search',
      say: ['Or search for it. Type a word, like smoke.', 'The guides that match show straight away.'],
      do: [
        { s: 0, d: 1.4, type: ['#g-q', 'smoke'] },
        { s: 1, d: 0.3, circle: '.g-card >> nth=0' }
      ]
    },
    {
      title: 'Open a guide',
      say: ['Tap a guide to open it.', 'It says what it is for, and how many pages and steps it has.'],
      do: [
        { s: 0, d: 0.5, tap: '.g-card[href="#/guides/lk-smoke-service"]' },
        { s: 1, d: 0.3, only: 'phone', underline: '.g-doc .g-title' },
        { s: 1, d: 2.6, only: 'phone', circle: '.g-meta', opts: { pad: 6 } },
        { s: 1, d: 0.4, only: 'desktop', circle: '.g-dh', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Step by step',
      say: ['Tap Step by step to see one step at a time, big.', 'The page from the guide shows with the step.', "Tap Next step when you're ready for the next one."],
      do: [
        { s: 0, d: 0.9, tap: '[data-p="g-mode"][data-v="one"]' },
        { s: 1, d: 0.3, circle: '.g-onepg', opts: { pad: 4 } },
        { s: 2, d: 0.5, tap: '.g-nav .btn.dark' },
        { s: 2, d: 2.4, circle: '.g-one .g-h3' }
      ]
    },
    {
      title: 'Its pages',
      say: ["The guide's own pages are under the steps.", 'Tap a page to open it big. Tap Next to turn the page.'],
      do: [
        // on a big screen a page is taller than the window: it is brought up, and the tap marks it
        { s: 0, d: 0.3, only: 'phone', circle: '.g-pages .g-pg >> nth=0', opts: { pad: 6 } },
        { s: 0, d: 0.3, only: 'desktop', scroll: '.g-pages' },
        { s: 1, d: 0.3, tap: '.g-pages [data-p="g-zoom"][data-i="0"]' },
        { s: 1, d: 2.2, tap: '.gz-wrap [data-gz="next"]' },
        { s: 1, d: 3.6, key: 'Escape' }
      ]
    },
    {
      title: 'Print it',
      say: ['Need it on paper? Download the printable sheets here.', 'Then print them, or keep the PDF on your phone.'],
      do: [
        { s: 0, d: 0.6, circle: '.g-doc a[download]', opts: { pad: 6 } }
      ]
    }
  ]
};
