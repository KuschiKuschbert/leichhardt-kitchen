// The admin Team and Kitchen rooms, and Prep's Section standards (docs/tutorial-videos.md): the last video of the
// series. Filmed as the synthetic Head chef in the admin demo kitchen (admin-today.mjs, adminDemo). Reset PIN is shown,
// never used, and Backup and PIN is never opened. The roster file is made up (tests/roster-fixture.js, our own names).
import { createRequire } from 'module';
import { adminDemo, hide, showTab } from './admin-today.mjs';
import { L } from '../kit.mjs';

const require = createRequire(import.meta.url);
const roster = require('../../../tests/roster-fixture.js');
// next week's roster, Monday to Sunday, for the book's own people (no wages or award roles show on the page)
const monday = L.ymd(new Date(L.NOW + 6 * 86400000));
export const rosterFile = () => ({
  name: 'WeeklyDepartmentRosterReport.csv', mimeType: 'text/csv',
  buffer: Buffer.from(roster.build({ monday, people: [
    ['Sam Lee', 'Sous Chef', { 0: '10:00-21:00', 1: '10:00-21:00', 3: '10:00-21:00', 4: '10:00-21:00', 5: '10:00-21:00' }],
    ['Ann Moss', 'Chef de Partie', { 0: '10:00-15:00', 1: '16:00-22:00', 2: '10:00-22:00', 4: '16:00-22:00', 5: '10:00-22:00' }],
    ['Bo Tran', 'Demi Chef', { 1: '10:00-15:00', 2: '16:00-22:00', 3: '10:00-22:00', 5: '16:00-22:00', 6: '10:00-21:00' }]
  ] }))
});

// one person's row on People (found by their own Reset PIN button), and a Kitchen page tab tapped in sentence s
const row = id => 'tr:has([data-p="a-reset-pin"][data-id="' + id + '"])';
const tab = (t, s) => [{ s: s || 0, d: 0.1, clear: true, run: showTab(t) }, { s: s || 0, d: 0.4, tap: '.a-tab[data-t="' + t + '"]' }];

export default {
  id: 'admin-kitchen',
  title: 'Admin: Team and Kitchen',
  sub: 'The people, the day and how the kitchen is set up',
  done: "That's the whole Kitchen Book",
  hash: '#/admin',
  open: { admin: true, adminPage: 'people', wait: 2200 },
  extra: adminDemo(),
  setup: hide,
  intro: ['The admin panel, Team and Kitchen.', "Here's how to set up the people, the day's team and the kitchen."],
  outro: ["That's the whole Kitchen Book. Thanks for watching."],
  steps: [
    {
      title: 'People',
      say: ['Team opens on People: everyone in the book.', 'Pick a role for each person. Then tick what they can do: write, tick and remove lines.', 'Create or edit functions sets who books functions. Fay has it.', 'Reset PIN lets a person choose a new PIN. Do it with them there.'],
      do: [
        { s: 0, d: 0.5, circle: '.a-tab[data-t="people"]', opts: { pad: 6 } },
        { s: 1, d: 0.3, circle: row('ann') + ' .ux-picker-trigger', opts: { pad: 4 } },
        { s: 1, d: 2.6, circle: row('ann') + ' [data-perm="add"]', opts: { pad: 8 } },
        { s: 1, d: 3.4, circle: row('ann') + ' [data-perm="tick"]', opts: { pad: 8 } },
        { s: 1, d: 4.2, circle: row('ann') + ' [data-perm="del"]', opts: { pad: 8 } },
        { s: 2, d: 0.4, circle: row('fay') + ' [data-perm="fn"]', opts: { pad: 8 } },
        // shown, never tapped: a reset is done with the person there
        { s: 3, d: 0.3, circle: '[data-p="a-reset-pin"][data-id="ann"]', opts: { pad: 6 } }
      ]
    },
    {
      title: "Today's team",
      say: ["Today's team sets who is on each shift, their section and their break.", 'Each row is one person, with their hours, sections and break.', 'Choose roster file fills next week from the Humanforce roster.', 'The days come in as drafts. Check each one, then save it.'],
      do: [
        { s: 0, d: 0.5, tap: '.a-tab[data-t="plan"]' },
        { s: 1, d: 0.3, circle: '.tm-tlrow[data-id="ann"]' },
        { s: 2, d: 0.1, clear: true },
        { s: 2, d: 0.1, run: page => { page.once('filechooser', fc => fc.setFiles(rosterFile()).catch(() => {})); } },
        { s: 2, d: 1.4, tap: '[data-p="tm-roster-choose"]' },
        { s: 3, d: 0.3, circle: '.tm-roster [role="status"]' }
      ]
    },
    {
      title: 'Kitchen overview',
      say: ['The Kitchen room opens on Overview.', 'Each row says what it is set to. Tap it to change it.', 'Kitchen sections opens in place. Shifts sets each service and its times.', 'Pages staff see and the weekly top tickers are here too.'],
      do: [
        { s: 0, d: 0.4, tap: '.a-group[data-g="kitchen"]' },
        { s: 1, d: 0.3, underline: '.k-home-lead' },
        { s: 2, d: 0.3, tap: '[data-p="k-row"][data-r="secs"]' },
        { s: 2, d: 1.3, circle: '[data-k="a-ks0"]', opts: { pad: 6 } },
        { s: 2, d: 3.0, circle: '[data-p="k-row"][data-r="shifts"]' },
        { s: 3, d: 0.2, circle: '[data-p="k-row"][data-r="see"]' },
        { s: 3, d: 1.8, circle: '[data-p="k-row"][data-r="badges"]' }
      ]
    },
    {
      title: 'Cut-offs and suppliers',
      say: ['Order cut-offs: tick the days each supplier delivers, and the time the order has to be in.', 'The book reminds the team before each cut-off.', 'Suppliers and pars opens the catalogue and the supplier order.'],
      do: [
        ...tab('cutoffs'),
        { s: 0, d: 2.6, circle: 'fieldset.cut-dd >> nth=0' },
        { s: 0, d: 4.4, circle: '[data-k="cut-t0"]', opts: { pad: 6 } },
        { s: 1, d: 0.3, circle: '.a-pane .ux-picker-trigger:has-text("hours before") >> nth=0', opts: { pad: 6 } },
        ...tab('suppliers', 2),
        { s: 2, d: 2.4, circle: '.a-pane :is(a, button):has-text("Manage catalogue")', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Pings and minutes',
      say: ['Shift pings pop up on every phone at the time you set.', "Tap Write a ping to add one. Today's pings are listed under it.", 'Minutes: write them after the meeting.', 'The team reads them and signs with their own PIN. The register shows who has signed.'],
      do: [
        ...tab('notes'),
        { s: 1, d: 0.2, circle: '[data-p="n-new"]', opts: { pad: 6 } },
        { s: 1, d: 2.2, circle: '.nt-row >> nth=0' },
        ...tab('minutes', 2),
        { s: 2, d: 1.6, circle: '[data-p="mn-new"]', opts: { pad: 6 } },
        { s: 3, d: 2.8, circle: '.mn-tiles' }
      ]
    },
    {
      title: 'Guides and links',
      say: ["Guides are the team's how-to sheets. Tap Add a guide to add one.", 'Confirmed links lists every name linked to a recipe or a supplier item.'],
      do: [
        ...tab('guides'),
        { s: 0, d: 2.6, circle: '[data-p="g-new"]', opts: { pad: 6 } },
        ...tab('reference-records', 1),
        { s: 1, d: 2.4, circle: '.ai-reference-confirmed .ai-list > li >> nth=0' }
      ]
    },
    {
      title: 'Section standards',
      say: ['The Prep room holds Section standards: what each section should have ready before service.', "Pick a section, and set each item's minimum.", 'Smart prep par levels turns it on for the whole team.'],
      do: [
        { s: 0, d: 0.4, tap: '.a-group[data-g="prep"]' },
        { s: 1, d: 0.2, circle: '.a-pane .ux-picker-trigger >> nth=0', opts: { pad: 6 } },
        { s: 1, d: 1.8, circle: '[data-ps="edit"][data-id="rump"]', opts: { pad: 6 } },
        { s: 2, d: 0.3, circle: '[data-p="ps-rollout"]', opts: { pad: 10 } }
      ]
    }
  ]
};
