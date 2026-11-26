/* Fixture for tests/cleaning-plan.test.js (copied from docs/cleaning-tracking-options/previews/jobs.js). The jobs the round 2 previews plan: the book's own built-in lists (js/cleaning-schedule.js), with a kind and a weight
   added for each job that comes round. The kinds and weights are EXAMPLES made up by the lead to show the planner
   working. The head chef has not set them. Two lines of his list that have no day yet are added as new jobs. */
const schedule = require('../js/cleaning-schedule.js');
const EX = {   // template -> [kind, weight 1 light, 2 medium, 3 heavy]   (examples only)
  'sc-grill-01': ['Drawers', 1], 'sc-grill-02': ['Behind equipment', 3],
  'sc-pans-02': ['Behind equipment', 3], 'sc-pans-03': ['Behind equipment', 3],
  'sc-fry-01': ['Fridges', 2], 'sc-fry-02': ['Shelves', 2], 'sc-fry-03': ['Fridges', 2], 'sc-fry-04': ['Shelves', 1], 'sc-fry-05': ['Shelves', 1],
  'sc-hot-01': ['Fridges', 2], 'sc-hot-02': ['Behind equipment', 3], 'sc-hot-03': ['Shelves', 2], 'sc-hot-04': ['Floors', 3],
  'sc-hot-05': ['Equipment', 2], 'sc-hot-06': ['Equipment', 2], 'sc-hot-07': ['Equipment', 3],
  'sc-gen-01': ['Shelves', 2], 'sc-gen-02': ['Behind equipment', 3]
};
const SEC = { grill: 'Grill', pans: 'Pans', fry: 'Fryers, salads and dessert', hot: 'Hot larder' };
function jobs(chosen) {
  const all = schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).map(t => {
    const id = t.plan.template, ex = EX[id] || ['', 0], group = schedule.sectionGroupOf(t);
    const pack = /^pd-(hot|grill|pans)-/.exec(id);
    return { id, text: t.text, sec: group ? SEC[group] : pack ? SEC[pack[1]] : '', kind: ex[0], w: ex[1], per: 1, days: t.plan.repeat && !t.plan.repeat.anchor ? [] : t.dows.slice(),
      every: t.plan.repeat ? t.plan.repeat.days : 0, move: !!chosen(id, t), builtIn: /^(c\d|pd-)/.test(id) };
  });
  // two lines of the head chef's list that are ready but have no day
  all.push({ id: 'new-grill-sticks', text: 'Sort the meat doneness sticks', sec: 'Grill', kind: 'Equipment', w: 1, per: 1, days: [], every: 0, move: true, fresh: true });
  all.push({ id: 'new-pans-fridge', text: 'Wipe out and sanitise the drawer fridge', sec: 'Pans', kind: 'Fridges', w: 2, per: 1, days: [], every: 0, move: true, fresh: true });
  return all;
}
module.exports = { jobs, EX, SEC };
