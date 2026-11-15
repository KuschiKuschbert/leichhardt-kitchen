/* Made-up day for the minimum previews (docs/team-minimum-options/brief.md). Never connects to the kitchen.
   The same day as baseline.cjs: Lunch 10:00 to 15:00, Dinner 15:00 to 21:00 (the head chef's real day), a sous chef and
   8 staff, most on a double. Four doubles take a 2.5 hour split in the afternoon, then four meal breaks overlap from 18:15. */
window.TM_DATA = (function () {
  var services = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
  var sections = ['Grill', 'Pans', 'Larder', 'Fryer', 'Dessert', 'Pass'].map(function (n) { return { id: n.toLowerCase(), name: n }; });
  var people = [
    { id: 'sam', name: 'Sam K', chef: 'Sous chef' },
    { id: 'ari', name: 'Ari' }, { id: 'bea', name: 'Bea' }, { id: 'cal', name: 'Cal' }, { id: 'dev', name: 'Dev' },
    { id: 'eli', name: 'Eli' }, { id: 'fen', name: 'Fen' }, { id: 'gia', name: 'Gia' }, { id: 'hal', name: 'Hal' }
  ];
  var on = [
    ['sam', 'lunch', ''], ['sam', 'dinner', ''], ['ari', 'lunch', 'grill'], ['ari', 'dinner', 'grill'], ['bea', 'lunch', 'pans'], ['bea', 'dinner', 'pans'],
    ['cal', 'lunch', 'dessert'], ['dev', 'dinner', 'fryer'], ['eli', 'lunch', 'larder'], ['eli', 'dinner', 'pass'],
    ['fen', 'dinner', 'dessert'], ['gia', 'lunch', 'fryer'], ['gia', 'dinner', 'larder'], ['hal', 'dinner', 'larder']
  ].map(function (x) { return { id: x[0], sh: x[1], sec: x[2] }; });
  var br = [
    ['ari', 'dinner', 870, 150], ['bea', 'dinner', 870, 150], ['eli', 'lunch', 780, 30], ['gia', 'dinner', 900, 150],
    ['dev', 'dinner', 1095, 30], ['fen', 'dinner', 1095, 45], ['hal', 'dinner', 1110, 30], ['sam', 'dinner', 1110, 30]
  ].map(function (x) { return { id: x[0], sh: x[1], at: x[2], len: x[3] }; });
  // the head chef's minimums (made up for the preview; the real numbers are the head chef's to set)
  var mins = [{ id: 'm1', name: 'Lunch rush', from: 720, to: 840, n: 3 }, { id: 'm2', name: 'Dinner rush', from: 1050, to: 1230, n: 6 }];
  function hhmm(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  return { services: services, sections: sections, people: people, on: on, br: br, mins: mins, hhmm: hhmm, date: 'Sunday 15 November', clock: 1110 };
})();
