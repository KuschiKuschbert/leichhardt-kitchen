// The Prep list tutorial (the trial video, docs/tutorial-videos.md). Filmed as Ann, a cook with Add and Tick, on her
// own phone, on the demo kitchen's Tuesday (fixtures.mjs). Each step: a title for the chalkboard, the sentences said
// (Australian English, short, no em dashes), and what happens while each is said (do: s = the sentence it starts
// with, d = seconds into it). A value can differ per cut: { phone, desktop }.
const sheet = '.p-sheet';

export default {
  id: 'prep',
  title: 'Prep list',
  sub: 'Add it, tick it, share it out',
  next: 'Orders',
  hash: '#/prep',
  who: 'ann',
  intro: ['The Prep list.', "Here's how to add your prep, tick it off and share out the jobs."],
  outro: ["That's the Prep list. Next up, Orders."],
  steps: [
    {
      title: "Today's list",
      say: ["This is today's prep list.", 'Every line is something to make before service, grouped by section.', 'The count up top shows how much is done.'],
      do: [
        { s: 0, d: 0.3, underline: '.nb-title' },
        { s: 1, d: 0.4, circle: '.nb-left .nb-hd >> nth=0' },
        { s: 2, d: 0.3, circle: '.nb-prog' }
      ]
    },
    {
      title: 'Start here',
      say: ['Urgent lines carry a black flag. Do those first.', 'The numbers one, two and three show where to start.'],
      do: [
        { s: 0, d: 0.3, circle: '#nbr-g1 [data-p="urgent"]' },
        { s: 1, d: 0.3, circle: { phone: '#nbr-g3 .nb-box', desktop: '#nbr-g3 .nb-tt' }, opts: { pad: 10 } }
      ]
    },
    {
      title: 'Your section',
      say: ['Tap a section to see just your lines.', 'Tap All to see the whole list again.'],
      do: [
        { s: 0, d: 0.6, tap: '.nb-tab[data-v="Larder"]' },
        { s: 1, d: 0.5, tap: '.nb-tab[data-v=""]' }
      ]
    },
    {
      title: 'Add a line',
      say: ['To add something, tap Add a line.', 'Write what to make.', 'Pick the section, and the amount if you know it.', "Then tap Add. It's on the list straight away."],
      do: [
        { s: 0, d: 0.9, tap: '[data-p="write"]' },
        { s: 1, d: 0.2, type: ['#p-text', 'Tomato relish'] },
        { s: 2, d: 0.3, tap: sheet + ' [data-p="sec-pick"][data-v="Sauce"]' },
        { s: 2, d: 1.6, type: ['#p-qty', '2'] },
        { s: 2, d: 2.3, tap: sheet + ' [data-p="punit"][data-v="L"]' },
        { s: 3, d: 0.4, tap: sheet + ' .nb-addbtn' },
        { s: 3, d: 1.4, circle: sheet + ' .just-r' }
      ]
    },
    {
      title: 'Quick add',
      say: ['The things this kitchen makes often wait under Quick add.', 'One tap puts them on, with the usual amount.'],
      do: [
        // on a big screen Quick add sits beside the list, so the add sheet closes first
        { s: 0, only: 'desktop', tap: sheet + ' [data-p="p-log-close"]' },
        { s: 0, d: 0.8, circle: { phone: sheet + ' .nb-qadd', desktop: '.nb-quick' }, opts: { pad: 4 } },
        { s: 1, d: 0.6, tap: { phone: sheet + ' .nb-qadd [data-p="quick"] >> nth=0', desktop: '.nb-quick [data-p="quick"] >> nth=0' } },
        { s: 1, d: 2.4, only: 'phone', tap: sheet + ' [data-p="p-log-close"]' }
      ]
    },
    {
      title: 'Tick it off',
      say: ["When a job's done, tap its box.", 'Ticked the wrong one? Tap Undo on the slip, straight away.', 'Tick it again when it is really done. The book keeps your name and the time.'],
      do: [
        { s: 0, top: true },
        { s: 0, d: 0.9, tap: '#nbr-g1 .nb-box' },
        { s: 1, d: 0.2, circle: '.p-toast:not(.p-toast-old) .p-toast-btn' },
        { s: 1, d: 2.1, tap: '.p-toast:not(.p-toast-old) .p-toast-btn' },
        { s: 2, d: 0.5, tap: '#nbr-g1 .nb-box' },
        { s: 2, d: 2.2, circle: '#nbr-g1 .nb-meta' }
      ]
    },
    {
      title: 'On it',
      say: ['Starting a big job? Tap On it.', 'Your letter shows on the line, so nobody doubles up.'],
      do: [
        { s: 0, d: 0.9, tap: '#nbr-g3 [data-p="onit"]' },
        { s: 1, d: 0.3, circle: '#nbr-g3' }
      ]
    },
    {
      title: 'Change a line',
      say: ['The three dots let you change the amount, or move a line to another section.', 'Wrote the wrong thing? Undo it straight away, or ask a chef to take it off.'],
      do: [
        { s: 0, d: 0.5, tap: '#nbr-g2 .nb-more' },
        { s: 0, d: 2.0, circle: 'text=Change amount', opts: { pad: 6 } },
        { s: 0, d: 3.2, circle: 'text=Move to section', opts: { pad: 6 } },
        { s: 1, d: 1.6, key: 'Escape' }
      ]
    }
  ]
};
