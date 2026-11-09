/* The kitchen's optional cleaning schedule. Loaded only with Cleaning, never at startup.
   Import is an explicit chef action. Local roles, Pass checkers and unclear methods are reviewed in setup.
   This file defines templates, not completion records. No private staff identity belongs here. */
(function (root) {
  'use strict';
  var EVERY = [0, 1, 2, 3, 4, 5, 6];
  function task(id, text, area, method, responsibility, days, timing, checks, review) {
    return { text: text, area: area, section: '', shared: true, dows: days || EVERY.slice(), guide: '',
      plan: { template: id, method: method, responsibility: responsibility, checks: checks || [], timing: timing || 'daily',
        verification: id === 'c11', verifiers: [], review: review || '' } };
  }
  var templates = [
    task('c01', 'Ovens inside and out (pizza, combi)', 'Ovens', 'Soapy top and front; run cleaning cycle.', 'Supper chef', null, 'daily', ['Oven exterior cleaned', 'Cleaning cycle completed']),
    task('c02', 'Canopies, filters and panelling', 'Canopies', 'Remove; through machine.', 'Grill chef', [0], 'daily', ['Canopy and panelling cleaned', 'Filters cleaned'], 'Confirm which removable parts can go through the machine.'),
    task('c03', 'Floor swept, deck scrubbed and dried, including underneath equipment', 'Floors', 'Floor chemical; rinse. After each service.', 'Kitchen hand', null, 'service', ['Floor swept', 'Floor deck scrubbed and rinsed', 'Under equipment cleaned', 'Floor dried']),
    task('c04', 'Walk-in and service fridges inside and out, including doors, shelves, floor, ceiling and seals; no food on floor', 'Fridges', 'Downsize; organise; hot soapy; dry.', 'Day shift Chefs', null, 'daily', ['Doors and seals cleaned', 'Shelves cleaned', 'Floor and ceiling cleaned', 'Stock organised; no food on floor']),
    task('c05', 'Dry stores: organise, sweep, mop and clean shelving', 'Dry stores', 'Move everything and clean under, not around.', 'Morning KP', [0, 3], 'daily', ['Stock moved and organised', 'Shelving cleaned', 'Floor swept and mopped']),
    task('c06', 'Microwave inside and outside', 'Microwave', 'Turn off and unplug; remove plate and clean all surfaces.', 'Hot Larder chef', null, 'daily', ['Switched off and unplugged', 'Plate and all surfaces cleaned']),
    task('c07', 'Fryers inside and outside; replace oil', 'Fryers', 'Strain into pot; soapy; dry fully.', 'Supper chef', null, 'daily', ['Fryer inside and outside cleaned', 'Oil replaced', 'Fryer fully dry'], 'Use the approved fryer procedure for safe oil handling and equipment isolation.'),
    task('c08', 'Sinks', 'Sinks', 'Empty filter; hot soapy everywhere; rinse; dry.', 'Hot Larder chef', null, 'daily', ['Filter emptied', 'Sink washed, rinsed and dried']),
    task('c09', 'Walls', 'Walls', 'Hot soapy; rinse; dry with paper towel.', 'Grill chef'),
    task('c10', 'Freezers: stock rotation, cleaning and defrosting', 'Freezers', 'Check dates; rewrap if needed; remove ice build-up.', 'Pass Chef', [0, 4], 'daily', ['Dates checked; stock rotated', 'Food rewrapped where needed', 'Ice build-up removed']),
    task('c11', 'Cover and label all food', 'Food labels', 'When coolest wrap, label even when cooling. Start of day, end of night and after prep.', 'Everyone; checked by Pass', null, 'food', ['All food covered', 'All food labelled'], 'Confirm the wrapping and cooling wording against the approved food-safety procedure. Assign authorised Pass checkers before verification.'),
    task('c12', 'Organise tubs, utensils, pots and pans', 'Pots and utensils', 'Replace containers with clean and match.', 'Night KP'),
    task('c13', 'Clean and empty bins', 'Bins', 'Inside and out; hot soapy; dry; reline.', 'Night KP', null, 'daily', ['Bins emptied and cleaned inside and out', 'Bins dried and relined']),
    task('c14', 'Clean rubbish bin area and back-of-house area', 'Bin area', 'Take bins out to street; do not overfill; clean walls and floors.', 'CELLAR staff', null, 'daily', ['Bins taken out without overfilling', 'Bin-area walls and floors cleaned']),
    task('c15', 'Clean and organise chemical room; chemicals labelled; sanitiser available in spray bottle', 'Chemical room', 'Check ordering; organise; locate and keep sanitiser fresh daily.', 'Senior chefs x 3', [1, 3, 5], 'daily', ['Chemicals labelled and room organised', 'Sanitiser available in spray bottle', 'Ordering checked'], 'The repeat days are Monday, Wednesday and Friday, but the method says sanitiser fresh daily. Confirm the separate daily sanitiser requirement. Set the local ordering contact. Three chefs does not mean three signatures.'),
    task('c16', 'Mixers (after use)', 'Mixers', 'Take bowl to pot wash; clean everywhere and under.', 'Production chef', null, 'use', ['Bowl washed', 'Mixer and underneath cleaned']),
    task('c17', 'Hot plate, grill and stove (end of day)', 'Cooking line', 'Grill brush; striptank; soapy; dry.', 'Grill chef', null, 'close', ['Hot plate and stove cleaned', 'Grill cleaned'], 'Use the approved equipment and chemical procedures; confirm the striptank instruction.'),
    task('c18', 'Bench tops: soap and sanitise, after prep and each service', 'Bench tops', 'Remove everything; fresh soapy; dry; sanitise.', 'CDPS', null, 'prep-service', ['Bench cleared', 'Washed and dried', 'Sanitised']),
    task('c19', 'Tea towels put in appropriate areas', 'Tea towels', 'Fold and above grill and pans.', 'Morning KP', null, 'daily', [], 'Confirm the designated towel storage positions.'),
    task('c20', 'Under counters', 'Under counters', 'Remove everything; fresh soapy; dry; sanitise.', 'Pass Chef', null, 'daily', ['Items removed', 'Under-counter surfaces cleaned and sanitised']),
    task('c21', 'Change squeeze-bottle lids and ensure covered', 'Squeeze bottles', 'New lids; clean rim; label.', 'Pass Chef', null, 'daily', ['Clean lids fitted and bottles covered', 'Rims cleaned and labels checked']),
    task('c22', 'Clean and empty bain-marie', 'Bain-marie', 'Drain; hot soapy; sanitise.', 'Grill chef', null, 'daily', ['Bain-marie drained', 'Washed and sanitised']),
    task('c23', 'Clean service counter / pass', 'Pass', 'Bin all dockets; replace printer paper; clean bell and area.', 'Pass Chef', null, 'daily', ['Dockets removed and printer paper stocked', 'Bell and pass cleaned']),
    task('c24', 'Stock hand towels and soap', 'Handwashing', 'Check are working and refill.', 'Morning KP/Night KP', null, 'daily', ['Dispensers working', 'Hand towels and soap refilled']),
    task('c25', 'Dishwasher and filters', 'Dishwasher', 'Drain; descale; run cycle.', 'Night KP', null, 'daily', ['Dishwasher drained', 'Filters cleaned', 'Descale and cycle completed']),
    task('c26', 'Dishes, utensils and equipment stored in appropriate areas', 'Equipment storage', 'Everything in its place.', 'Night KP')
  ];
  // Pack down follows the confirmed section order. It is imported separately, never silently added to live jobs.
  // The drip-tray anchor was confirmed by the head chef on 9 November 2026, not derived from an import date.
  var packDown = [
    task('pd-hot-01', 'Decant ingredients and clean hot larder', 'Hot larder', 'Decant all ingredients into fresh containers. Wipe sauce bottles and the fridge. Scrub the shelves above hot larder and the bench tops.', 'Hot larder', null, 'close', ['Ingredients decanted into fresh containers', 'Sauce bottles and fridge wiped', 'Overhead shelves scrubbed', 'Bench tops scrubbed']),
    task('pd-hot-02', 'Retub parmie ingredients and shut down tabletop fridge', 'Hot larder', 'Retub all parmie ingredients into new containers. Turn off the tabletop fridge. Wipe down and sanitise it, then wipe under the bench-top fridge.', 'Hot larder', null, 'close', ['Parmie ingredients retubbed', 'Tabletop fridge turned off', 'Tabletop fridge wiped and sanitised', 'Under the bench-top fridge wiped'], 'Follow the approved cold-storage pack-down procedure when turning off the tabletop fridge.'),
    task('pd-hot-03', 'Clean impingers and shelf extensions', 'Hot larder', 'Wipe the tops of the impingers. Remove the impinger shelf extensions and wipe them down.', 'Hot larder', null, 'close', ['Impinger tops wiped', 'Shelf extensions removed and cleaned']),
    task('pd-hot-04', 'Turn off and clean fryers', 'Hot larder', 'Turn off the fryers. Scrape the fryer crumbs into the fryer. Wipe the sides, top, front and inside.', 'Hot larder', null, 'close', ['Fryers turned off', 'Crumbs cleared using the approved fryer procedure', 'Sides, top, front and inside cleaned'], 'Confirm the crumb-handling instruction against the approved fryer procedure. Follow its oil, cooling and isolation steps.'),
    task('pd-hot-05', 'Wipe hot larder back wall and cryovac machine', 'Hot larder', 'Wipe the back wall of the hot larder section and wipe down the cryovac machine.', 'Hot larder', null, 'close', ['Back wall wiped', 'Cryovac machine wiped']),

    task('pd-grill-01', 'Scrub grill and remove build-up', 'Grill', 'Use the grill brush and spatula to get into the grill and remove the build-up.', 'Grill', null, 'close', ['Grill scrubbed with brush and spatula', 'Build-up removed']),
    task('pd-grill-02', 'Sunday grill and OZ tank deep clean', 'Grill', 'Every Sunday, empty the OZ tank and clean what is in it first. Put the whole grill into the OZ tank. Spray the back of the grill with grill cleaner, leave for 3 minutes, then scrub with steel wool and a spatula.', 'Grill', [0], 'close', ['OZ tank emptied and its contents cleaned', 'Grill cleaned using the approved OZ tank procedure', 'Back of grill cleaned and scrubbed'], 'Confirm which grill components can go into the OZ tank and follow the manufacturer procedure. The stated 3 minutes must be compatible with the approved cleaner instructions.'),
    task('pd-grill-03', 'Change grill drip trays', 'Grill', 'Change the grill drip trays every two days. Do not use aluminium foil, as it may block the gas valves.', 'Grill', null, 'close', ['Grill drip trays changed', 'No aluminium foil used']),
    task('pd-grill-04', 'Wipe under grill', 'Grill', 'Wipe down under the grill at the end of every night.', 'Grill', null, 'close'),
    task('pd-grill-05', 'Clean hot-line shelf and frame before floors', 'Grill', 'Remove the shelf above the grill along the hot line and clean it in the oven. Spray the frame with grill cleaner and scrub every night, before the floor is done.', 'Grill', null, 'close', ['Hot-line shelf removed and cleaned', 'Shelf frame sprayed and scrubbed', 'Overhead cleaning finished before the floor clean'], 'Use the approved procedure for removing the shelf, oven cleaning and chemical use.'),
    task('pd-grill-06', 'Wrap and label nine-drawer grill fridge', 'Grill', 'Wrap all ingredients in the nine-drawer grill fridge and label with service stickers.', 'Grill', null, 'close', ['All grill-fridge ingredients wrapped', 'Service stickers applied']),
    task('pd-grill-07', 'Wipe and sanitise grill screen', 'Grill', 'Wipe down and sanitise the screen.', 'Grill', null, 'close'),
    task('pd-grill-08', 'Pack down sauce bain-marie for next morning', 'Grill', 'Decant the sauces in the sauce bain-marie. Top up every night. Wrap or fit metal lids so it is ready for the next morning.', 'Grill', null, 'close', ['Sauces decanted', 'Sauces topped up', 'Sauces wrapped or covered with metal lids'], 'Follow the approved food-cooling and overnight-storage procedure.'),
    task('pd-grill-09', 'Turn off grill and pans heat lamps', 'Grill', 'Turn off the heat lamps and double-check that the pans heat lamps are off.', 'Grill', null, 'close', ['Heat lamps turned off', 'Pans heat lamps double-checked']),
    task('pd-grill-10', 'Clean, dry and oil flat top; empty drip tray', 'Grill', 'Water down the flat top and scrub. Use grill cleaner and scrub, then vinegar and scrub. Dry down, spray oil and empty the drip tray.', 'Grill', null, 'close', ['Flat top cleaned using the approved procedure', 'Flat top dried', 'Oil applied', 'Flat-top drip tray emptied'], 'Do not combine grill cleaner and vinegar. Follow the approved cleaner, rinsing and separation instructions before moving between products.'),

    task('pd-pans-01', 'Pack down mash, rissoles and cob-mix bain-marie', 'Pans', 'Break down the mash, rissoles and cob-mix bain-marie. Decant into new containers, top up, wrap and label so it is ready for the next morning.', 'Pans', null, 'close', ['Food decanted into new containers', 'Containers topped up', 'Food wrapped', 'Labels applied'], 'Follow the approved food-cooling and overnight-storage procedure.'),
    task('pd-pans-02', 'Empty poaching pots', 'Pans', 'Empty the poaching pots.', 'Pans', null, 'close'),
    task('pd-pans-03', 'Clean holding shelves above stove tops', 'Pans', 'Remove the holding shelves above the stove tops and clean them in the oven. Spray the rack with grill cleaner and scrub.', 'Pans', null, 'close', ['Holding shelves removed and cleaned', 'Rack sprayed and scrubbed'], 'Use the approved shelf-removal, oven-cleaning and chemical procedures. Finish overhead cleaning before the floor clean.'),
    task('pd-pans-04', 'Remove stove tops and leave to cool', 'Pans', 'Remove the stove tops and let them cool before cleaning.', 'Pans', null, 'close', ['Stove tops removed and left to cool safely'], 'Follow the approved shutdown, isolation and handling procedure before removing stove components.'),
    task('pd-pans-05', 'Scrub stove area and empty drip tray', 'Pans', 'While the stove tops cool, scrub the stove area with a metal scrubber. Empty the drip tray every night. Do not use aluminium foil.', 'Pans', null, 'close', ['Stove area scrubbed', 'Drip tray emptied', 'No aluminium foil used']),
    task('pd-pans-06', 'Scrub and hose cooled stove tops', 'Pans', 'Scrub down and hose the cooled stove tops every night. Allow about 10 minutes for this cleaning task.', 'Pans', null, 'close', ['Stove tops cooled before cleaning', 'Stove tops scrubbed and cleaned'], 'Use only the approved component-cleaning procedure. Protect gas and electrical equipment from water; 10 minutes is a task estimate, not a cooling rule.'),
    task('pd-pans-07', 'Wrap and label nine-drawer pans fridge', 'Pans', 'Wrap all ingredients in the nine-drawer pans fridge and label with service stickers.', 'Pans', null, 'close', ['All pans-fridge ingredients wrapped', 'Service stickers applied']),
    task('pd-pans-08', 'Turn off kick oven', 'Pans', 'Turn off the kick oven.', 'Pans', null, 'close'),
    task('pd-pans-09', 'Turn off pans heat lamps and clean next to oven', 'Pans', 'Turn off the heat lamps and clean down next to the oven.', 'Pans', null, 'close', ['Heat lamps turned off', 'Area next to oven cleaned']),
    task('pd-pans-10', 'Clean back of stove tops', 'Pans', 'Spray the back of the stove tops with grill cleaner and scrub.', 'Pans', null, 'close', [], 'Follow the approved equipment and chemical procedure.')
  ];
  packDown.filter(function (entry) { return entry.plan.template === 'pd-grill-03'; })[0].plan.repeat = { days: 2, anchor: '2026-11-09' };
  // Return fresh drafts: chef edits must never mutate the built-in schedule or another import attempt.
  function drafts() { return JSON.parse(JSON.stringify(templates)); }
  function packDownDrafts() { return JSON.parse(JSON.stringify(packDown)); }
  var api = { api: 1, templates: templates, drafts: drafts, packDown: packDown, packDownDrafts: packDownDrafts };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LK_CLEANING_SCHEDULE = api;
})(typeof window === 'undefined' ? this : window);
