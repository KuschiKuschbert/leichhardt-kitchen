/* Made-up day for the section previews (docs/team-sections-options/brief.md). Never connects to the kitchen.
   The same day as baseline.cjs: the roster import has put everyone on every service their shift touches, no sections. */
window.TS_DATA = (function () {
  var services = [
    { id: 'lunch', name: 'Lunch', short: 'Lunch', from: 600, to: 900 },
    { id: 'adl', name: 'All day dining', short: 'All day', from: 900, to: 1020 },
    { id: 'dinner', name: 'Dinner', short: 'Dinner', from: 1020, to: 1320 }
  ];
  var sections = ['Grill', 'Pans', 'Larder', 'Fryer', 'Dessert', 'Pass'].map(function (n) { return { id: n.toLowerCase(), name: n }; });
  var people = [
    { id: 'ari', name: 'Ari', roster: [600, 1290], on: ['lunch', 'adl', 'dinner'] },
    { id: 'bea', name: 'Bea', roster: [600, 1290], on: ['lunch', 'adl', 'dinner'] },
    { id: 'cal', name: 'Cal', roster: [600, 900], on: ['lunch'] },
    { id: 'dev', name: 'Dev', roster: [900, 1320], on: ['adl', 'dinner'] },
    { id: 'eli', name: 'Eli', roster: [600, 1290], on: ['lunch', 'adl', 'dinner'] },
    { id: 'fen', name: 'Fen', roster: [960, 1320], on: ['adl', 'dinner'] },
    { id: 'gia', name: 'Gia', roster: [600, 1020], on: ['lunch', 'adl'] },
    { id: 'hal', name: 'Hal', roster: [1020, 1320], on: ['dinner'] }
  ];
  // What the chef wants (the measured task): most keep one section all day, Eli moves to Pass for dinner, Gia to Pans
  var want = { ari: { lunch: 'grill', adl: 'grill', dinner: 'grill' }, bea: { lunch: 'pans', adl: 'pans', dinner: 'pans' }, cal: { lunch: 'larder' }, dev: { adl: 'fryer', dinner: 'fryer' },
    eli: { lunch: 'larder', adl: 'larder', dinner: 'pass' }, fen: { adl: 'dessert', dinner: 'dessert' }, gia: { lunch: 'fryer', adl: 'pans' }, hal: { dinner: 'larder' } };
  // Long-text stress: a long name and two long section names
  var longPeople = [{ id: 'mjk', name: 'Mary Jo Kahale-Whitford', roster: [600, 1290], on: ['lunch', 'adl', 'dinner'] }];
  var longSections = [{ id: 'cold', name: 'Cold larder and garde manger' }, { id: 'pastry', name: 'Pastry and desserts' }];
  function hhmm(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  return { services: services, sections: sections, people: people, want: want, longPeople: longPeople, longSections: longSections, hhmm: hhmm, date: 'Tuesday 17 November', saved: 'Saved 13:00 · Gus' };
})();
