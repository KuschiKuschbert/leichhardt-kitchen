// The admin Reports room (docs/tutorial-videos.md): Insights, Records, Wastage, Transfers, Team, Item evidence and
// Learning, read in the admin demo kitchen (admin-today.mjs, adminDemo) as the synthetic Head chef.
import { adminDemo, hide, showTab } from './admin-today.mjs';
import { L } from '../kit.mjs';

// Sunday 14 June: two deliveries, a missed cleaning job and a cooling batch in the demo's nightly count
const sunday = L.ymd(new Date(L.NOW - 2 * 86400000));
const tab = t => [{ s: 0, d: 0.1, run: showTab(t) }, { s: 0, d: 0.4, tap: '.a-tab[data-t="' + t + '"]' }];

export default {
  id: 'admin-reports',
  title: 'Admin: Reports',
  sub: 'Read what the kitchen recorded',
  next: 'Admin: Team and Kitchen',
  done: "That's the admin Reports room",
  hash: '#/admin',
  open: { admin: true, adminPage: 'insights', wait: 2600 },
  extra: adminDemo(),
  setup: async page => { await hide(page); await L.waitFor(page, () => !!document.querySelector('.a-pane .a-tiles'), null, 10000); },
  intro: ['The admin panel, Reports.', "Here's how to read what the kitchen recorded, and follow it back to its source."],
  outro: ["That's the admin Reports room. Next up, Admin: Team and Kitchen."],
  steps: [
    {
      title: 'Insights',
      say: ['Reports opens on Insights: the prep list, read over 30 days.', 'Narrow it down by the days, a section, a person or a weekday.', 'What stands out says what changed, in plain words.', 'The tiles add it up, against the 30 days before.'],
      do: [
        { s: 0, d: 0.5, circle: '.a-tab[data-t="insights"]', opts: { pad: 6 } },
        { s: 1, d: 0.3, circle: '.a-pane .ux-picker-trigger >> nth=0', opts: { pad: 4 } },
        { s: 1, d: 1.4, circle: '.a-pane .ux-picker-trigger >> nth=1', opts: { pad: 4 } },
        { s: 1, d: 2.3, circle: '.a-pane .ux-picker-trigger >> nth=2', opts: { pad: 4 } },
        { s: 1, d: 3.2, circle: '.a-pane .ux-picker-trigger >> nth=3', opts: { pad: 4 } },
        { s: 2, d: 0.3, circle: 'h3.a-ch-h:has-text("What stands out") + *' },
        { s: 3, d: 0.3, circle: '.a-pane .a-tiles .a-tile >> nth=0' },
        { s: 3, d: 1.8, circle: '.a-pane .a-tiles .a-tile >> nth=2' }
      ]
    },
    {
      title: 'Records',
      say: ['Records keeps the nightly food safety count for every finished day.', 'Each day says its deliveries, its cleaning and its cooling.', 'Tap a day to read it: every delivery and cooling stage, with the time and who.', 'Print it, or export it as a CSV file.'],
      do: [
        ...tab('records'),
        { s: 1, d: 0.3, circle: '.rec-dayrow[data-d="' + sunday + '"]' },
        { s: 2, d: 0.4, tap: '.rec-dayrow[data-d="' + sunday + '"]' },
        { s: 2, d: 2.0, circle: '.rec-dayv .rec-tl li >> nth=0' },
        { s: 2, d: 3.4, circle: '.rec-dayv .rec-tl li >> nth=2' },
        { s: 3, d: 0.2, circle: '[data-p="rec-print"]', opts: { pad: 6 } },
        { s: 3, d: 1.4, circle: '[data-p="rec-csv"]', opts: { pad: 6 } },
        { s: 3, d: 2.4, only: 'phone', clear: true },
        { s: 3, d: 2.6, only: 'phone', tap: '[data-p="rec-back"]' }
      ]
    },
    {
      title: 'Wastage',
      say: ['Wastage shows what was thrown out, and why.', 'Pick the period, and the tiles add it up.', 'History lists every entry. Summary adds it up by day and by reason.', 'Export CSV saves it for a spreadsheet.'],
      do: [
        ...tab('waste'),
        { s: 1, d: 0.2, circle: '.a-pane .ux-picker-trigger >> nth=0', opts: { pad: 4 } },
        { s: 1, d: 1.3, circle: '.a-pane .a-tiles' },
        { s: 2, d: 0.2, circle: '[data-p="wh-view"][data-v="history"]', opts: { pad: 6 } },
        { s: 2, d: 2.0, tap: '[data-p="wh-view"][data-v="summary"]' },
        { s: 3, d: 0.3, circle: '[data-p="csv"][data-v="waste"]', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Transfers',
      say: ['Transfers shows what other venues took from us, and what we took from them.', 'Each venue has its own totals.', 'Every transfer is listed below it, with the day and who wrote it.'],
      do: [
        ...tab('transfers'),
        { s: 0, d: 3.2, circle: '.a-pane .a-tiles' },
        { s: 1, d: 0.3, circle: '[data-lv="xfer-venues"] tbody tr >> nth=0' },
        { s: 2, d: 0.4, underline: 'h3.a-ch-h:has-text("Every transfer")' }
      ]
    },
    {
      title: 'Team',
      say: ['Team starts with At a glance: what stands out about who worked where.', 'Here, only Bo worked Sauce in the last 30 days.', 'Tap See the table for who has worked where.', 'Each number is the shifts worked in that section.'],
      do: [
        ...tab('team'),
        { s: 0, d: 2.6, underline: '.tm-glance-h' },
        { s: 1, d: 0.3, circle: '.tm-glance .dsh-head >> nth=0' },
        { s: 2, d: 0.5, tap: '.tm-glance .dsh-more >> nth=0' },
        { s: 3, d: 0.3, circle: 'table.sk-t >> nth=0' }
      ]
    },
    {
      title: 'Item evidence',
      say: ['Item evidence lists every recorded item, and where it came from.', 'Tap one to read its evidence: how often it was written, on which days, and its recipe.', 'The back arrow takes you to the list.'],
      do: [
        ...tab('analysis'),
        { s: 0, d: 2.6, circle: '[data-ai="item"] >> nth=0' },
        { s: 1, d: 0.4, tap: '[data-ai="item"][data-value="ref:recipe:burger"]' },
        { s: 1, d: 2.0, circle: '.ai-detail .ai-metrics >> nth=0' },
        { s: 1, d: 3.6, circle: '.ai-detail a:has-text("Recipe")', opts: { pad: 6 } },
        { s: 2, d: 0.4, tap: '.wtop [data-act="back"]' }
      ]
    },
    {
      title: 'Learning',
      say: ['Learning shows what the prep list has learned from the team.', 'Every line written is counted. An item becomes a regular after four uses.', 'The most written items come first.'],
      do: [
        ...tab('learning'),
        { s: 1, d: 0.3, circle: '.a-pane .a-tiles' },
        { s: 2, d: 0.3, circle: 'h3.a-ch-h:has-text("Most written items") + *' }
      ]
    }
  ]
};
