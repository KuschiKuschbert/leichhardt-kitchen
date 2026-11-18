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
  steps: []
};
