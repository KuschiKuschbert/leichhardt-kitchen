/*
  Leichhardt Kitchen Recipe Book: recipe data
  ===========================================
  This is the only file you need to edit to add or change a recipe.
  The head chef can also change and add recipes in the book itself: those are kept in Firestore and laid over this file
  (js/overlay.js), and the book's copy wins. See "Recipes changed in the book" in README.md.

  Each recipe has:
    id         short unique name, no spaces (used in links), e.g. "laksa"
    no         card number, matching the printed cards, e.g. "06"
    kind       "main", "snack", "side", "dessert", "batch" or "component"
    forLine    where it belongs, e.g. "Plate" or "For the barramundi"
    name       the name staff see
    short      optional: a shorter name for prep lines and tight spaces, e.g. "Laksa" for "Coconut Laksa"
    avc        optional: the recipe's name in AVC Live, so a search for it finds the card
    menu       optional: how the guest menu describes it (shown on the card, and searchable)
    yield      the portion or batch line under the name
    art        which drawing to use in The Pass view (see js/art.js), or leave it out
    ingredients: list of { q: quantity, name, link: id of another recipe (makes it tappable),
                 note, tags: allergens in this ingredient, add "?" for "may contain" }
    pins       (plated dishes, The Pass view) where each part sits on the plate drawing:
               { label, x, y (percent across and down), side ('left' or 'right' for the label,
               optional), link or tags, note }
    sections   optional: list of { title, steps: [ ... ] }. Leave it out and the card says "Not written up yet".
    contains   allergens it definitely has: { allergen, from }
    check      allergens it may have, so check the label: { allergen, from }
               Leave contains and check out and the book works them out from the ingredient tags.
    labelNote  one line about labels to check
    tip        optional box, e.g. iCombi settings: { title, text }
    safety     optional orange warning: { title, text }
    done       optional: true once the card and its drawings are 100% finished (shows a green frame and a Finished chip)
    diagram    optional technique or build drawing id (see js/art.js), e.g. "corn-cut" or "smash-build"

  Write anything not confirmed yet in [square brackets] so it shows as a placeholder.

  Batch recipes that are not in the book yet: give the ingredient a link anyway, e.g. link: 'gravy'.
  It shows as "Card to come", and every dish that uses it is marked "Allergens incomplete" and left
  out of the Free from filter. Add a recipe with id: 'gravy' later and the links and allergens switch on.

  Quantities for cards 13 to 45 come from the AVC Live costings (Spring 26). Costs stay in AVC.
  Cards 46 to 65 are online-menu dishes with no AVC costing yet: their quantities are "[Qty]" (shows "To come").

  menuOrder (just below) is the guest menu: the sections in the order they are printed, and the
  dishes in each section in the order they are printed. All three views follow it. To move a dish,
  or to put a new dish on the menu, add or move its id in the list. A dish that is in no section
  still shows, under "Other dishes", so nothing goes missing. Batch recipes and components are not
  on the guest menu, so they sit after the menu sections.
*/
window.LK_DATA = {
  updated: '27 October 2026',
  allergens: ['Gluten', 'Milk', 'Egg', 'Soy', 'Peanut', 'Tree nut', 'Fish', 'Crustacean', 'Mollusc', 'Sesame'],
  menuOrder: [
    { title: "Snackin' Plates", ids: ['poutine', 'beetroot-bites', 'brisket-cob', 'lamb-nachos', 'buffalo-corn-cob-with-cashew-crumb', 'wings', 'haloumi-tacos', 'pork-belly-bites', 'calamari', 'riblets', 'garlic-bread', 'bacon-cheese-bread', 'chips-snack'] },
    { title: 'Salads', ids: ['caesar', 'green-bowl', 'pumpkin-salad'] },
    { title: 'Big Country Feeds', ids: ['beef-cheek', 'ribs', 'barra', 'carbonara', 'fish-chips', 'lamb-rissoles', 'vegan-rissoles', 'pork-belly', 'pie'] },
    { title: 'Off the Grill', ids: ['rump-250', 'rump-500', 'eye-fillet', 'rib-fillet', 'grill-board', 'taco-board', 'flank'] },
    { title: 'Toppers', ids: ['prawn-topper', 'calamari-topper', 'chicken-topper', 'mushroom-topper'] },
    { title: 'Schnittys & Parmys', ids: ['chicken-schnitzel', 'beef-schnitzel', 'chicken-parmy', 'schnitzel-americana', 'schnitzel-french', 'schnitzel-mexican'] },
    { title: 'Hand Held', ids: ['smash', 'oz-smash', 'steak-sandwich', 'fish-burger', 'chickpea-burger', 'burger'] },
    { title: 'Sides', ids: ['slaw-side', 'mash-side', 'side-salad', 'mac-side', 'greens-side', 'wedges'] },
    { title: 'Dessert', ids: ['donut-fries', 'sticky-toffee', 'snickers', 'skillet'] },
    { title: 'Seniors', ids: ['senior-rissoles', 'senior-fish-chips', 'senior-bolognese', 'senior-calamari', 'senior-schnitzel', 'senior-parmy'] },
    { title: 'Kids', ids: ['kids-spaghetti-bolognese'] },
    { title: 'Functions', ids: ['pizza-platter', 'aussie-platter', 'vege-platter', 'yumcha-platter', 'antipasto-platter', 'seafood-platter'] }
  ],
  recipes: [
    {
      id: 'burger', no: '02', diagram: 'burger-build', kind: 'main', forLine: 'Plate', name: 'Chicken Burger', art: 'burger', avc: 'Ranch Chicken Burger Complete S26',
      yield: 'Per plate. Thigh and ranch bought in.',
      ingredients: [
        { q: '1', name: 'Burger bun', note: 'milk bun', tags: ['Gluten', 'Milk'] },
        { q: '1', name: 'Crumbed chicken thigh', note: 'bought in, 170 g', tags: ['Gluten'] },
        { q: '1 slice', name: 'Sliced cheese', tags: ['Milk'] },
        { q: '100 g', name: 'Ranch', link: 'ranch', note: 'bought in, across both layers', tags: ['Milk', 'Egg'] },
        { q: '1 leaf', name: 'Oak leaf' },
        { q: '2 slices', name: 'Tomato' },
        { q: '150 g', name: 'Chips' }
      ],
      pins: [
        { label: 'Burger', x: 59.4, y: 35.8, tags: ['Gluten', 'Milk', 'Egg', 'Soy?'], note: 'Bottom to top: bun, ranch, 1 oak leaf, 2 slices of tomato, crumbed thigh with sliced cheese, ranch, bun.' },
        { label: 'Chips', x: 28.3, y: 73.6, tags: [], note: 'In the fryer, as current. On the side.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Deep-fry the bought-in crumbed thigh until golden brown.', 'Probe the thigh: core 75 °C before it goes to the pass.', 'Chips in the fryer, as current.'] },
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'Ranch.', '1 oak leaf.', '2 slices of tomato.', 'Chicken thigh, sliced cheese on top.', 'Ranch.', 'Bun top.', 'Chips on the side.'] }
      ],
      contains: [{ allergen: 'Gluten', from: 'bun, crumb on the thigh' }, { allergen: 'Milk', from: 'milk bun, cheese, ranch' }, { allergen: 'Egg', from: 'ranch' }],
      check: [{ allergen: 'Soy', from: 'possibly' }]
    },
    {
      id: 'pie', no: '03', kind: 'main', forLine: 'Plate', name: 'Guinness Beef Pie', art: 'pie',
      yield: 'Per plate. 250 g fill, loose lid.',
      ingredients: [
        { q: '250 g', name: 'Guinness beef pie mix', note: 'from the bag', tags: ['Gluten'] },
        { q: '1', name: 'Pie shell and lid', tags: ['Gluten', 'Milk?'] },
        { q: '200 g', name: 'Mash', link: 'mash', tags: ['Milk'] },
        { q: '80 g', name: 'Green peas' },
        { q: '80 ml', name: 'Gravy', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Garnish' }
      ],
      pins: [
        { label: 'Gravy', x: 59.4, y: 43.4, tags: ['Gluten?'], note: '80 ml, over the top.' },
        { label: 'Pie', x: 69.8, y: 59.4, tags: ['Gluten', 'Milk?'], note: '250 g beef pie mix, lid on loose. Probe the centre: 75 °C.' },
        { label: 'Peas', x: 83.0, y: 69.8, tags: [], note: '80 g, on top and to the side.' },
        { label: 'Mash', x: 22.6, y: 58.5, tags: ['Milk'], note: '200 g. The pie sits half on it.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Fill the pie shell with 250 g beef pie mix. Lid on, loose.', 'Bake.', 'Probe the centre before service: 75 °C.'] },
        { title: 'Plating', steps: ['200 g mash on the plate.', 'Pie sits half on the mash, lid loose on top.', '80 g peas on top and to the side.', '80 ml gravy over the top.', 'Garnish.'] }
      ],
      contains: [{ allergen: 'Gluten', from: 'pastry, Guinness (barley), possibly the gravy' }, { allergen: 'Milk', from: 'mash, likely the pastry' }],
      check: []
    },
    {
      id: 'barra', no: '04', kind: 'main', forLine: 'Plate', name: 'Barramundi', art: 'barra',
      yield: 'Per plate. 180 g rice, 160 ml laksa, charred Asian greens (2 pieces each of pak choy, gai lan, choy sum and broccolini), barra on top.',
      ingredients: [
        { q: '[Portion]', name: 'Barramundi', note: 'as current', tags: ['Fish'] },
        { q: '180 g', name: 'Steamed rice', note: 'portioned in a small round container', link: 'rice' },
        { q: '160 ml', name: 'Coconut laksa', link: 'laksa' },
        { q: '2 pieces', name: 'Pak choy', note: 'steamed and shocked', link: 'asian-greens' },
        { q: '2 pieces', name: 'Gai lan', note: 'steamed and shocked', link: 'asian-greens' },
        { q: '2 pieces', name: 'Choy sum', note: 'steamed and shocked', link: 'asian-greens' },
        { q: '2 pieces', name: 'Broccolini', note: 'steamed and shocked', link: 'asian-greens' },
        { q: '[Qty]', name: 'Sesame oil', tags: ['Sesame'] }
      ],
      pins: [
        { label: 'Barramundi', x: 46.2, y: 46.2, tags: ['Fish'], note: 'Cook as current. Probe: core 63 °C. On top of the greens.' },
        { label: 'Asian greens', x: 59.4, y: 59.4, tags: ['Sesame'], note: '2 pieces each of pak choy, gai lan, choy sum and broccolini. Quick blanch to order, sesame oil, char in a pan. On the rice.' },
        { label: 'Coconut laksa', x: 77.4, y: 35.8, link: 'laksa' },
        { label: 'Steamed rice', x: 42.5, y: 68.9, link: 'rice' }
      ],
      sections: [
        { title: 'Prep: Asian greens', steps: ['Prepped ahead: see the Asian Greens card.'] },
        { title: 'Cooking', steps: ['Cook the barra as current.', 'Probe: core 63 °C before the pass.', 'Greens to order: quick blanch in boiling water.', 'Sesame oil, then char in a pan.', 'Heat the laksa through.'] },
        { title: 'Plating', steps: ['180 g steamed rice, from its small round container.', '160 ml laksa over the rice and a bit around.', 'Charred Asian greens on the rice: 2 pieces each of pak choy, gai lan, choy sum and broccolini.', 'Barra on top of the greens.'] }
      ],
      contains: [{ allergen: 'Fish', from: 'barra' }, { allergen: 'Sesame', from: 'sesame oil' }],
      check: [],
      labelNote: 'Check the laksa paste and stock labels.'
    },
    {
      id: 'rice', done: true, no: '05', kind: 'batch', forLine: 'For the barramundi', name: 'Steamed Rice', short: 'Rice', art: 'rice',
      yield: 'Batch: 5 kg raw rice. 180 g per plate.',
      ingredients: [
        { q: '5 kg', name: 'Rice' },
        { q: '9.5 L', name: 'Water' },
        { q: '2.5 tbsp', name: 'Chicken stock', tags: ['Gluten?', 'Soy?'] },
        { q: '13', name: 'Bay leaves' }
      ],
      sections: [
        { title: 'Method', steps: ['Wash the rice 3 times until the water runs clear.', 'Spread the rice in 1/1 GN pans, 60 mm deep, divided evenly. Add the water, chicken stock and bay leaves, divided evenly across the pans.', 'Steam 25 min.', 'Check the rice. It must not be too soft. If it needs more, steam on in 2 min steps, checking each time.'] },
        { title: 'Portioning', steps: ['Portion 180 g per serve into small round containers.'] }
      ],
      contains: [],
      check: [{ allergen: 'Gluten', from: 'chicken stock' }, { allergen: 'Soy', from: 'chicken stock' }],
      labelNote: 'Stock powders can also carry celery. Check the label.',
      tip: { title: 'On the iCombi', text: 'Steam mode, 100 °C, 25 min. Save it as a programme called RICE using the programming guide.' }
    },
    {
      id: 'laksa', done: true, no: '06', kind: 'batch', forLine: 'For the barramundi', name: 'Coconut Laksa', short: 'Laksa', art: 'laksa',
      yield: 'Batch: about 5 L, roughly 31 serves at 160 ml.',
      ingredients: [
        { q: '520 g', name: 'Laksa paste', tags: ['Crustacean?', 'Peanut?', 'Soy?'] },
        { q: '4200 ml', name: 'Coconut cream' },
        { q: '42 g', name: 'Palm sugar' },
        { q: '105 ml', name: 'Lime juice' },
        { q: '210 ml', name: 'Fish sauce', tags: ['Fish'] }
      ],
      sections: [
        { title: 'Method', steps: ['Fry the laksa paste in a heavy pot over medium heat, 2 to 3 min, until fragrant.', 'Whisk in the coconut cream gradually. Bring to a gentle simmer; a hard boil can split it.', 'Add the palm sugar and simmer 5 min until dissolved.', 'Off the heat, add the fish sauce and lime juice. Taste and adjust.'] }
      ],
      contains: [{ allergen: 'Fish', from: 'fish sauce' }],
      check: [{ allergen: 'Crustacean', from: 'laksa paste' }, { allergen: 'Peanut', from: 'laksa paste' }, { allergen: 'Soy', from: 'laksa paste' }],
      labelNote: 'Laksa pastes often contain shrimp, peanut or soy.'
    },
    {
      id: 'ribs', no: '07', kind: 'main', forLine: 'Plate', name: 'New Pork Ribs', art: 'ribs', avc: 'Baby Back Ribs FULL S26, Baby Back Ribs HALF S26',
      yield: 'Full serve 600 g ribs, half 300 g. Both get 150 g new slaw. Half serve gets 4 corn ribs, full serve 6.',
      ingredients: [
        { q: '600 g or 300 g', name: 'Pork ribs', note: 'full or half serve, Barkers Creek, bought in' },
        { q: '[Qty]', name: 'Bourbon BBQ sauce', note: 'drizzled on top of the ribs', link: 'bourbon-bbq-sauce' },
        { q: '150 g', name: 'New slaw', link: 'slaw' },
        { q: '6 or 4', name: 'Corn ribs', note: 'full serve 6, half serve 4', link: 'corn' }
      ],
      pins: [
        { label: 'Pork ribs', x: 46.2, y: 35.8, tags: [], note: 'Full serve 600 g, half 300 g, cooked as current. Check the glaze and seasoning labels.' },
        { label: 'Bourbon BBQ sauce', x: 55.0, y: 41.0, side: 'right', link: 'bourbon-bbq-sauce', note: 'Drizzled on top of the ribs.' },
        { label: 'Corn ribs', x: 75.5, y: 62.3, link: 'corn' },
        { label: 'New slaw', x: 34.9, y: 73.6, link: 'slaw' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Cook the pork ribs as current.', 'Corn ribs: steam, char and cut.', 'Slaw: dressed base from the prep fridge.'] },
        { title: 'Plating', steps: ['Pork ribs: 600 g full serve or 300 g half serve.', 'Drizzle bourbon BBQ sauce on top of the ribs.', '150 g new slaw, same for both serves.', 'Corn ribs, criss-cross stacked: 6 on a full serve, 4 on a half serve.'] }
      ],
      contains: [], check: [],
      labelNote: 'Check the rib glaze and seasoning labels as current.'
    },
    {
      id: 'corn', done: true, no: '08', kind: 'component', forLine: 'For the new pork ribs', name: 'Corn Ribs', short: 'Corn ribs', art: 'corn',
      yield: 'One cob makes 8 corn ribs. Full pork rib serve 6 corn ribs, half serve 4.',
      ingredients: [
        { q: '1 cob', name: 'Corn', note: 'makes 8 corn ribs' },
        { q: '6 or 4', name: 'Corn ribs per serve', note: 'full serve 6, half serve 4' }
      ],
      sections: [
        { title: 'Method', steps: ['Steam the whole cobs 12 min, then char on the grill until well charred.', 'Cut each cob in half across the middle.', 'Cut each half top to bottom through the middle, then again, to make quarters.', 'Trim the hard centre off each quarter. 4 ribs per half, 8 per cob.'] },
        { title: 'Plating', steps: ['Full serve 6 per plate, half serve 4 per plate, criss-cross stacked.'] }
      ],
      contains: [], check: [],
      labelNote: 'Recheck if butter or a seasoning goes on.',
      safety: { title: 'Wear cut-resistant gloves', text: 'For steps 2 to 4. The cobs are hard and round, and the knife can slip.' },
      diagram: 'corn-cut'
    },
    {
      id: 'slaw', no: '09', kind: 'batch', forLine: 'For the new pork ribs', name: 'New Slaw', short: 'Slaw', art: 'slaw',
      yield: 'Base batch. 150 g dressed slaw per plate.',
      ingredients: [
        { q: '5 kg', name: 'Carrots' },
        { q: '2', name: 'Red cabbages' },
        { q: '1', name: 'White cabbage' },
        { q: '12', name: 'Corn cobs' },
        { q: '1 tin', name: 'Roasted red peppers' },
        { q: '[Qty]', name: 'Aioli', link: 'aioli', note: 'for service', tags: ['Egg'] },
        { q: '[Qty]', name: 'Lemon juice', note: 'for service' }
      ],
      sections: [
        { title: 'Method', steps: ['Steam the corn cobs 12 min, then char them on the grill.', 'Cut the kernels off the cobs.', 'Carrots through the Robot-Coupe julienne blade.', 'Red and white cabbage through the 4 mm slicing blade.', 'Add the roasted red peppers.', 'Combine as the base batch. Store in a big container in the coolroom.', 'For service, take what is needed into the prep fridge and mix with aioli and lemon juice, as before.'] }
      ],
      contains: [{ allergen: 'Egg', from: 'aioli' }], check: [],
      labelNote: 'None in the base. Check the aioli label.'
    },
    {
      id: 'snickers', no: '10', kind: 'dessert', forLine: 'Plate', name: 'Snickers Spring Rolls', art: 'snickers', avc: 'Snickers spring rolls S26',
      yield: 'Per serve.',
      ingredients: [
        { q: '3', name: 'Small Snickers bars', tags: ['Peanut', 'Milk', 'Soy', 'Egg'] },
        { q: '3', name: 'Spring roll wrappers', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Butterscotch sauce', note: 'drizzled on top of the rolls', link: 'butterscotch' },
        { q: '15 g', name: 'Roasted peanuts', note: 'sprinkled over the rolls', tags: ['Peanut'] },
        { q: '1 scoop', name: 'Ice cream', tags: ['Milk'] }
      ],
      pins: [
        { label: 'Snickers rolls', x: 44.3, y: 45.3, tags: ['Peanut', 'Milk', 'Soy', 'Egg', 'Gluten'], note: '3 small Snickers in spring roll wrappers, criss-cross stacked, butterscotch drizzled on top, roasted peanuts over.' },
        { label: 'Ice cream', x: 74.5, y: 71.7, tags: ['Milk'], note: '1 scoop.' }
      ],
      sections: [
        { title: 'Prep', steps: ['Wrap each Snickers, ends tucked in. Seal the top edge with a little water.'] },
        { title: 'Cooking', steps: ['Deep-fry in the low temp fryer until golden.'] },
        { title: 'Plating', steps: ['Criss-cross stack the 3 rolls.', 'Drizzle butterscotch sauce on top of the rolls.',
        'Sprinkle roasted peanuts over the rolls.', 'Add 1 scoop of ice cream.'] }
      ],
      contains: [{ allergen: 'Peanut', from: 'Snickers' }, { allergen: 'Milk', from: 'Snickers, ice cream' }, { allergen: 'Soy', from: 'Snickers' }, { allergen: 'Egg', from: 'Snickers' }, { allergen: 'Gluten', from: 'spring roll wrappers' }],
      check: []
    },
    {
      id: 'butterscotch', done: true, no: '11', kind: 'batch', forLine: 'For the skillet cookie and the Snickers spring rolls', name: 'Butterscotch Sauce', short: 'Butterscotch', art: 'butterscotch',
      yield: 'Batch: roughly 500 g. About 75 ml per skillet cookie.',
      ingredients: [
        { q: '200 g', name: 'Dark brown sugar' },
        { q: '100 g', name: 'Salted butter', note: 'diced', tags: ['Milk'] },
        { q: '250 ml', name: 'Pure cream', note: 'about 35% fat', tags: ['Milk'] },
        { q: '1 tsp', name: 'Vanilla extract' }
      ],
      sections: [
        { title: 'Method', steps: ['Melt the butter in a heavy-based saucepan over medium-low heat.', 'Add the sugar and stir 2 to 3 min until combined and gently bubbling. It may still look grainy.', 'Slowly stir in the cream. Careful, it bubbles and spits.', 'Bring to a gentle simmer, 4 to 5 min, stirring often, until smooth and slightly thickened.', 'Off the heat, stir in the vanilla. No extra salt; the salted butter covers it.', 'Stand 5 to 10 min before serving. It thickens further as it cools.'] }
      ],
      contains: [{ allergen: 'Milk', from: 'butter, cream' }], check: [],
      labelNote: 'Check the vanilla label.'
    },
    {
      id: 'skillet', no: '12', kind: 'dessert', forLine: 'Plate', name: 'Skillet Cookie', art: 'skillet', avc: 'Skillet Cookie Portion S26',
      yield: 'Per plate. 140 g cookie, ice cream, butterscotch sauce.',
      ingredients: [
        { q: '140 g', name: 'Skillet cookie dough', note: 'one ball', link: 'cookie-dough' },
        { q: '80 g', name: 'Vanilla ice cream', tags: ['Milk'] },
        { q: 'About 75 ml', name: 'Butterscotch sauce', link: 'butterscotch' }
      ],
      pins: [
        { label: 'Cookie', x: 34.0, y: 58.5, side: 'left', link: 'cookie-dough', note: '140 g dough, baked in the skillet.' },
        { label: 'Butterscotch sauce', x: 44.3, y: 41.5, side: 'right', link: 'butterscotch' },
        { label: 'Vanilla ice cream', x: 50.9, y: 51.9, side: 'right', tags: ['Milk'], note: '80 g.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Spray the cast iron pan with canola spray and press the cookie into the pan slightly so it spreads evenly while baking.', 'Bake at 190 °C for 9 to 10 minutes.'] },
        { title: 'Plating', steps: ['Set the cast iron pan on a wooden serving board.', 'Quenelle the ice cream on top and drizzle lightly with butterscotch sauce.', 'Dust with icing sugar and serve.'] }
      ],
      contains: [{ allergen: 'Milk', from: 'ice cream' }], check: [],
      labelNote: 'Check the ice cream label.'
    },
    /* ---------- From the AVC Live costings, Spring 26 ---------- */

    /* Steaks */
    {
      id: 'eye-fillet', art: 'eye-fillet', no: '13', kind: 'main', forLine: 'Plate', name: '180 g Eye Fillet', avc: '180g Eye Fillet S26',
      menu: '180 g eye fillet, pasture-fed NSW. Choice of sauce.',
      yield: 'Per plate. Sauce of choice, chips and salad.',
      ingredients: [
        { q: '180 g', name: 'Eye fillet', note: 'pasture-fed, NSW' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '70 ml', name: 'Mushroom sauce', note: 'costed sauce; guests choose gravy, mushroom, pepper, garlic, jus, Diane or béarnaise', link: 'mushroom-sauce' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Eye fillet', x: 43.2, y: 30.0, side: 'left', tags: [], note: '180 g, pasture-fed NSW, sea salt flakes.' },
        { label: 'Sauce of choice', x: 76.4, y: 39.7, side: 'left', tags: [], note: 'Costed as 70 ml mushroom. Card to come.' },
        { label: 'Chips', x: 29.2, y: 64.2, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 69.8, y: 65.1, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },
    {
      id: 'rump-250', art: 'rump-250', no: '14', kind: 'main', forLine: 'Plate', name: '250 g Rump', avc: '250G Rump S26',
      menu: '250 g rump, 120 days grain-fed QLD. Choice of sauce.',
      yield: 'Per plate. Sauce of choice, chips and salad.',
      ingredients: [
        { q: '250 g', name: 'Rump', note: '120 days grain-fed, QLD' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '80 ml', name: 'Mushroom sauce', note: 'costed sauce; guests choose gravy, mushroom, pepper, garlic, jus, Diane or béarnaise', link: 'mushroom-sauce' },
        { q: '1.1 portions', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Rump', x: 43.2, y: 30.0, side: 'left', tags: [], note: '250 g, grain-fed QLD, sea salt flakes.' },
        { label: 'Sauce of choice', x: 76.4, y: 39.7, side: 'left', tags: [], note: 'Costed as 80 ml mushroom. Card to come.' },
        { label: 'Chips', x: 29.2, y: 64.2, side: 'left', tags: [], note: 'Chips and salad, 1.1 portions. Card to come.' },
        { label: 'Salad', x: 69.8, y: 65.1, side: 'left', tags: [], note: 'Chips and salad, 1.1 portions. Card to come.' }
      ]
    },
    {
      id: 'rib-fillet', art: 'rib-fillet', no: '15', kind: 'main', forLine: 'Plate', name: '300 g Rib Fillet', avc: '300G Rib Fillet S26',
      menu: '300 g rib fillet, 120 days grain-fed QLD. Choice of sauce.',
      yield: 'Per plate. Sauce of choice, chips and salad.',
      ingredients: [
        { q: '300 g', name: 'Rib fillet', note: '120 days grain-fed, QLD' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '70 ml', name: 'Mushroom sauce', note: 'costed sauce; guests choose gravy, mushroom, pepper, garlic, jus, Diane or béarnaise', link: 'mushroom-sauce' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Rib fillet', x: 43.2, y: 30.0, side: 'left', tags: [], note: '300 g, grain-fed QLD, sea salt flakes.' },
        { label: 'Sauce of choice', x: 76.4, y: 39.7, side: 'left', tags: [], note: 'Costed as 70 ml mushroom. Card to come.' },
        { label: 'Chips', x: 29.2, y: 64.2, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 69.8, y: 65.1, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },
    {
      id: 'rump-500', art: 'rump-500', no: '16', kind: 'main', forLine: 'Plate', name: '500 g Rump', avc: '500G Rump S26',
      menu: '500 g rump, 120 days grain-fed QLD. Choice of sauce.',
      yield: 'Per plate. Sauce of choice, chips and salad.',
      ingredients: [
        { q: '500 g', name: 'Rump', note: '120 days grain-fed, QLD' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '70 ml', name: 'Mushroom sauce', note: 'costed sauce; guests choose gravy, mushroom, pepper, garlic, jus, Diane or béarnaise', link: 'mushroom-sauce' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Rump', x: 42.2, y: 39.8, side: 'left', tags: [], note: '500 g, grain-fed QLD, sea salt flakes.' },
        { label: 'Sauce of choice', x: 78.3, y: 30.9, side: 'left', tags: [], note: 'Costed as 70 ml mushroom. Card to come.' },
        { label: 'Chips', x: 27.4, y: 67.9, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 72.6, y: 67.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },
    {
      id: 'flank', art: 'flank', no: '17', kind: 'main', forLine: 'Plate', name: '350 g Flank Steak', avc: '350g Flank, cowboy butter, chips and salad',
      menu: '350 g flank steak, cowboy butter, chips and salad.',
      yield: 'Per plate. Cowboy butter, chips and salad.',
      ingredients: [
        { q: '350 g', name: 'Flank steak' },
        { q: '80 g', name: 'Cowboy butter', link: 'cowboy-butter', tags: ['Milk'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Flank steak', x: 42.5, y: 37.7, side: 'left', tags: [], note: '350 g, sliced.' },
        { label: 'Cowboy butter', x: 52.8, y: 30.2, side: 'right', tags: ['Milk'], note: '80 g, on the steak. Card to come.' },
        { label: 'Chips', x: 28.3, y: 65.1, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 69.8, y: 65.1, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },

    /* Schnitzels */
    {
      id: 'schnitzel-french', art: 'schnitzel-french', no: '18', kind: 'main', forLine: 'Plate', name: 'Chicken Schnitzel French', avc: 'Chicken Schnitzel French S26',
      menu: 'French Parmy: brie, avocado, bacon, béarnaise, chips and salad.',
      yield: 'Per plate. Brie, avocado, bacon and béarnaise, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'hand cut, 340 to 380 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '1 portion', name: 'French parmi topper', note: 'brie, avocado, bacon, béarnaise', link: 'french-topper', tags: ['Milk', 'Egg'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Chicken schnitzel', x: 30.2, y: 41.7, side: 'right', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: 'Hand cut, 340 to 380 g.' },
        { label: 'French topper', x: 48.1, y: 32.1, side: 'left', tags: ['Milk', 'Egg'], note: 'Brie, avocado, bacon, béarnaise. Card to come.' },
        { label: 'Chips', x: 28.3, y: 67.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'schnitzel-mexican', art: 'schnitzel-mexican', no: '19', kind: 'main', forLine: 'Plate', name: 'Chicken Schnitzel Mexican', avc: 'Chicken Schnitzle Mexican S26',
      menu: 'Mexican Parmy: sour cream, tomato salsa, avocado, corn chips, mozzarella, chips and salad.',
      yield: 'Per plate. Salsa, avocado, sour cream, corn chips and mozzarella, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'double butterfly panko, 350 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '1 portion', name: 'Mexican topper', note: 'sour cream, tomato salsa, avocado, corn chips, mozzarella', link: 'mexican-topper', tags: ['Milk'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Chicken schnitzel', x: 30.2, y: 41.7, side: 'right', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: 'Double butterfly, 350 g.' },
        { label: 'Mexican topper', x: 47.2, y: 32.0, side: 'left', tags: ['Milk'], note: 'Mozzarella, tomato salsa, avocado, sour cream, corn chips. Card to come.' },
        { label: 'Chips', x: 28.3, y: 67.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'schnitzel-americana', art: 'schnitzel-americana', no: '20', kind: 'main', forLine: 'Plate', name: 'Chicken Schnitzel Americana', avc: 'Chicken Schnitzel Americana S26',
      menu: 'American Parmy: pulled pork, smoked mac and cheese, chips and salad.',
      yield: 'Per plate. Pulled pork and smoked mac and cheese, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'double butterfly panko, 350 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '½ portion', name: 'Americana topper', note: 'pulled pork, smoked mac and cheese', link: 'americana-topper', tags: ['Gluten', 'Milk'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Chicken schnitzel', x: 30.2, y: 41.7, side: 'right', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: 'Double butterfly, 350 g.' },
        { label: 'Americana topper', x: 48.1, y: 32.0, side: 'left', tags: ['Gluten', 'Milk'], note: 'Pulled pork, smoked mac and cheese, half portion. Card to come.' },
        { label: 'Chips', x: 28.3, y: 67.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'beef-schnitzel', art: 'beef-schnitzel', no: '21', kind: 'main', forLine: 'Plate', name: 'Beef Schnitzel', avc: 'Beef Schnitzel S26',
      menu: 'Beef Schnitzel: chips, salad and a choice of sauce.',
      yield: 'Per plate. Sauce of choice, lemon, chips and salad.',
      ingredients: [
        { q: '300 g', name: 'Beef schnitzel', note: '290 to 310 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '20 g', name: 'Lemon' },
        { q: '60 ml', name: 'Gravy', note: 'costed sauce; guests choose gravy, mushroom, pepper, garlic, jus, Diane or béarnaise', link: 'gravy' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Beef schnitzel', x: 44.3, y: 34.0, side: 'left', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: '300 g.' },
        { label: 'Lemon', x: 73.6, y: 29.2, side: 'left', tags: [], note: '20 g wedge.' },
        { label: 'Sauce of choice', x: 69.8, y: 48.1, side: 'left', tags: [], note: 'Costed as 60 ml gravy. Card to come.' },
        { label: 'Chips', x: 28.3, y: 67.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ],
      labelNote: 'Check the schnitzel label.'
    },

    /* Burgers and sandwiches */
    {
      id: 'smash', no: '22', kind: 'main', forLine: 'Plate', name: 'Smash Burger', art: 'smash', diagram: 'smash-build', avc: 'Smash Burger S26',
      menu: 'Smashed Beef Burger: two smashed patties, cheese, pickles, American mustard.',
      yield: 'Per plate. Two smashed patties (180 g), cheese on each, sauce and mustard on both bun halves, chips.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '180 g', name: 'Smash patty', note: '2 patties', link: 'smash-patty' },
        { q: '2 slices', name: 'Burger cheese', note: 'one on each patty', tags: ['Milk'] },
        { q: '20 g', name: 'Bread and butter pickles', note: 'bought in, top half only' },
        { q: '20 ml', name: 'American mustard', note: 'top and bottom' },
        { q: '40 ml', name: 'Tomato sauce', link: 'tomato-sauce', note: 'ketchup, top and bottom' },
        { q: '[Qty]', name: 'Oak leaf lettuce' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' }
      ],
      sections: [
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'Tomato sauce and American mustard on the base.', 'Smashed patty, cheese on top.', 'Smashed patty, cheese on top.', 'Bun top: tomato sauce, American mustard and pickles.', 'Close the burger.', 'Chips on the side.'] }
      ],
      pins: [
        { label: 'Smash burger', x: 60.4, y: 35.8, side: 'right', tags: [], note: 'Milk bun, 2 smashed patties (180 g) with cheese on each, tomato sauce and American mustard on the top and the bottom, pickles on the top half.' },
        { label: 'Chips', x: 29.2, y: 63.2, side: 'right', tags: [], note: '1 portion, 200 g raw.' }
      ],
      labelNote: 'Check the bun label.'
    },
    {
      id: 'oz-smash', diagram: 'oz-smash-build', no: '23', kind: 'main', forLine: 'Plate', name: 'The OZ Smash Burger', art: 'oz-smash', avc: 'The OZ Smash Burger S26',
      menu: 'The Aussie Burger: two smashed patties, lettuce, tomato, onion, pickles, beetroot, bacon, tomato sauce.',
      yield: 'Per plate. 180 g patty, bacon, beetroot, half a chips portion.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '180 g', name: 'Smash patty', link: 'smash-patty' },
        { q: '1 slice', name: 'Burger cheese', tags: ['Milk'] },
        { q: '90 g', name: 'Shortcut bacon' },
        { q: '50 g', name: 'Sliced beetroot' },
        { q: '50 g', name: 'Tomato' },
        { q: '10 g', name: 'Red onion' },
        { q: '10 g', name: 'Bread and butter pickles', note: 'bought in' },
        { q: '40 ml', name: 'Tomato ketchup' },
        { q: '[Qty]', name: 'Oak leaf lettuce' },
        { q: '½ portion', name: 'Chips', note: 'of the 200 g raw portion' }
      ],
      sections: [
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'Tomato sauce.', 'Oak leaf.', 'Tomato.', 'Red onion.', 'Beetroot.', 'Smashed patty, cheese on top.', 'Bacon.', 'Pickles.', 'Bun top.', 'Half portion of chips on the side.'] }
      ],
      pins: [
        { label: 'The OZ Smash Burger', x: 60.4, y: 35.8, side: 'left', tags: [], note: 'Milk bun, 180 g smash patty, cheese, bacon, beetroot, tomato, red onion, pickles, ketchup, oak leaf. Card to come.' },
        { label: 'Chips', x: 29.2, y: 63.2, side: 'right', tags: [], note: 'Half portion.' }
      ],
      labelNote: 'Check the bun and bacon labels.'
    },
    {
      id: 'fish-burger', diagram: 'fish-burger-build', no: '24', kind: 'main', forLine: 'Plate', name: 'Fish Burger', art: 'fish-burger', avc: 'Fish Burger S26',
      menu: 'Fish Burger: XXXX-battered fish, tartare, lettuce, tomato, onion.',
      yield: 'Per plate. 180 g beer-battered blue grenadier, chips.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '180 g', name: 'Blue grenadier fillet', note: 'skinless, MSC', tags: ['Fish'] },
        { q: '50 ml', name: 'Beer batter', note: 'XXXX', link: 'beer-batter', tags: ['Gluten'] },
        { q: '70 ml', name: 'Tartare sauce', link: 'tartare', note: 'bought in', tags: ['Egg', 'Soy?'] },
        { q: '[Qty]', name: 'Green oak lettuce' },
        { q: '50 g', name: 'Tomato' },
        { q: '50 g', name: 'Red onion' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' }
      ],
      sections: [
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'Green oak.', 'Tomato.', 'Red onion.', 'Battered blue grenadier.', 'Tartare.', 'Bun top.', 'Chips on the side.'] }
      ],
      pins: [
        { label: 'Fish burger', x: 60.4, y: 35.8, side: 'right', tags: ['Fish'], note: 'Milk bun, 180 g XXXX-battered blue grenadier, tartare, green oak, tomato, red onion.' },
        { label: 'Chips', x: 29.2, y: 63.2, side: 'right', tags: [], note: '1 portion, 200 g raw.' }
      ],
      labelNote: 'Check the bun and tartare labels.'
    },
    {
      id: 'chickpea-burger', diagram: 'chickpea-burger-build', no: '25', kind: 'main', forLine: 'Plate', name: 'Chickpea Mushroom Burger', art: 'chickpea-burger', avc: 'Chickpea Mushroom Burger S26',
      menu: 'Chickpea and Mushroom Burger: avocado, tomato, oak lettuce.',
      yield: 'Per plate. Three beetroot falafel, vegan aioli, chips.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '3', name: 'Beetroot falafel', note: '40 g each, plant based, bought in', tags: ['Sesame?', 'Soy?'] },
        { q: '40 g', name: 'Vegan aioli', note: 'bought in', tags: ['Soy?'] },
        { q: '60 g', name: 'Chunky avocado' },
        { q: '50 g', name: 'Tomato' },
        { q: '[Qty]', name: 'Green oak lettuce' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' }
      ],
      sections: [
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'Vegan aioli.', 'Green oak.', 'Tomato.', '3 beetroot falafel.', 'Chunky avocado.', 'Bun top.', 'Chips on the side.'] }
      ],
      pins: [
        { label: 'Chickpea mushroom burger', x: 60.4, y: 35.8, side: 'left', tags: ['Sesame?', 'Soy?'], note: 'Milk bun, 3 beetroot falafel, vegan aioli, avocado, tomato, green oak.' },
        { label: 'Chips', x: 29.2, y: 63.2, side: 'right', tags: [], note: '1 portion, 200 g raw.' }
      ],
      labelNote: 'Check the bun, falafel and aioli labels.'
    },
    {
      id: 'steak-sandwich', diagram: 'steak-sandwich-build', art: 'steak-sandwich', no: '26', kind: 'main', forLine: 'Plate', name: 'Steak Sandwich', avc: 'Steak sandwich S26',
      menu: 'Steak Sandwich: rump steak, caramelised onion, smoky BBQ sauce, cheddar, bacon, fried egg, Turkish bread.',
      yield: 'Per plate. 150 g topside, cheese, bacon, egg, tomato relish, aioli, chips, side sauce.',
      ingredients: [
        { q: '1', name: 'Turkish roll', note: 'oval, 130 g', tags: ['Gluten', 'Sesame?', 'Soy?'] },
        { q: '150 g', name: 'Topside steak' },
        { q: '1 slice', name: 'Cheese', tags: ['Milk'] },
        { q: '90 g', name: 'Shortcut bacon' },
        { q: '1', name: 'Egg', tags: ['Egg'] },
        { q: '[Qty]', name: 'Tomato relish', link: 'tomato-relish' },
        { q: '[Qty]', name: 'Aioli', link: 'aioli', note: 'on the top half of the roll', tags: ['Egg'] },
        { q: '1 leaf', name: 'Oak leaf lettuce' },
        { q: '3 slices', name: 'Tomato' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' },
        { q: '[Qty]', name: 'Side sauce of choice', note: 'guest chooses' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Grill the steak to the guest\'s wished doneness.'] },
        { title: 'Plating, bottom to top', steps: ['Turkish roll base.', 'Tomato relish.', 'Oak lettuce.', '3 slices of tomato.', 'Topside steak.', 'Cheese.', 'Bacon.', 'Egg.', 'Aioli on the top half of the Turkish roll, then close.', 'Chips and a side sauce of choice on the side.'] }
      ],
      pins: [
        { label: 'Steak sandwich', x: 53.8, y: 34.9, side: 'right', tags: [], note: 'Turkish roll, topside, cheese, bacon, egg, tomato relish, aioli on the top half, oak lettuce, tomato.' },
        { label: 'Chips', x: 34.0, y: 69.8, side: 'right', tags: [], note: '1 portion, 200 g raw.' },
        { label: 'Side sauce', x: 72.0, y: 70.0, side: 'left', tags: [], note: 'Sauce of choice.' }
      ],
      labelNote: 'Check the roll, aioli, relish, bacon and cheese labels.'
    },

    /* Other mains */
    {
      id: 'lamb-rissoles', art: 'lamb-rissoles', no: '27', kind: 'main', forLine: 'Plate', name: 'Lamb Rissoles', avc: 'Lamb Rissoles FULL S26',
      menu: 'Lamb Rissoles: butter mash, seasonal vegetables, onion rings, gravy.',
      yield: 'Per bowl. 3 rissoles, mash, seasonal vegetables, gravy, 4 onion rings.',
      ingredients: [
        { q: '3', name: 'Lamb rissoles', note: '90 g balls before cooking', link: 'rissole-mix' },
        { q: '150 g', name: 'Potato mash', note: 'Farm Frites, bought in', link: 'mash', tags: ['Milk?'] },
        { q: '1 portion', name: 'Seasonal vegetables', note: 'about 120 g', link: 'side-veg' },
        { q: '4', name: 'Tempura onion rings', note: 'bought in', tags: ['Gluten', 'Egg?', 'Soy?'] },
        { q: '50 ml', name: 'Gravy', link: 'gravy' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Cook the rissoles on steam bake, 50% steam, 140 °C, until the core reaches 75 °C. Use the core temperature setting in the oven (see the Lamb Rissole Mix card).', 'Steam off the mash in a flat tray for 20 min.', 'Heat the seasonal vegetables in the poaching pot, then finish them in a pan with a bit of oil, salt and pepper.'] },
        { title: 'Plating, in a bowl', steps: ['Mash on one half of the bowl.', 'Seasonal vegetables on the other half.', '3 lamb rissoles on the mash.', 'Gravy over the rissoles.', '4 onion rings on top.'] }
      ],
      pins: [
        { label: 'Lamb rissoles', x: 36.8, y: 46.7, side: 'right', link: 'rissole-mix' },
        { label: 'Mash', x: 22.6, y: 63.2, side: 'left', link: 'mash', tags: ['Milk?'], note: 'On one half of the bowl.' },
        { label: 'Gravy', x: 44.3, y: 55.7, side: 'right', link: 'gravy', note: 'Over the rissoles.' },
        { label: 'Seasonal vegetables', x: 69.8, y: 51.4, side: 'right', link: 'side-veg', note: 'About 120 g: 3 pieces each of carrot, cauliflower and broccoli, on the other half of the bowl.' },
        { label: 'Onion rings', x: 30.2, y: 40.6, side: 'left', tags: ['Gluten', 'Egg?', 'Soy?'], note: '4, tempura, on top.' }
      ],
      labelNote: 'Check the mash and onion ring labels.'
    },
    {
      id: 'vegan-rissoles', art: 'vegan-rissoles', no: '28', kind: 'main', forLine: 'Plate', name: 'Vegan Rissoles', avc: 'Vegan Rissoles Full S26',
      menu: 'Vegan Rissoles: mash, seasonal vegetables.',
      yield: 'Per bowl. 3 beetroot bites, mash, seasonal vegetables, gravy.',
      ingredients: [
        { q: '3', name: 'Beetroot bites', note: '40 g each, plant based, bought in', tags: ['Sesame?', 'Soy?'] },
        { q: '150 g', name: 'Dairy free mash', note: 'same amount as the lamb rissoles' },
        { q: '1 portion', name: 'Seasonal vegetables', note: 'about 120 g', link: 'side-veg' },
        { q: '50 ml', name: 'Gravy', note: 'gluten free, dairy free and vegan', link: 'gravy' },
        { q: '1 g', name: 'Table salt' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Deep fry the beetroot bites in the fryer at 175 °C until golden.', 'Steam off the dairy free mash in a flat tray for 20 min.', 'Heat the seasonal vegetables in the poaching pot, then finish them in a pan with a bit of oil, salt and pepper.'] },
        { title: 'Plating, in a bowl', steps: ['Mash on one half of the bowl.', 'Seasonal vegetables on the other half.', '3 beetroot bites on the mash.', 'Gravy over the bites. No onion rings.'] }
      ],
      pins: [
        { label: 'Beetroot bites', x: 36.8, y: 46.7, side: 'right', tags: ['Sesame?', 'Soy?'], note: '3 pieces, 40 g each, deep fried until golden, on the mash.' },
        { label: 'Dairy free mash', x: 22.6, y: 63.2, side: 'left', tags: [], note: '150 g, on one half of the bowl.' },
        { label: 'Gravy', x: 44.3, y: 55.7, side: 'right', link: 'gravy', note: '50 ml, over the bites.' },
        { label: 'Seasonal vegetables', x: 69.8, y: 51.4, side: 'right', link: 'side-veg', note: 'About 120 g, on the other half of the bowl.' }
      ],
      labelNote: 'Check the beetroot bite and dairy free mash labels.'
    },
    {
      id: 'pork-belly', art: 'pork-belly', no: '29', kind: 'main', forLine: 'Plate', name: 'Pork Belly', avc: 'Pork Belly Main S26',
      menu: 'Pork Belly: mashed potato, spinach purée, red wine jus, peas, bacon, shallot.',
      yield: 'Per plate. 240 g belly, mash, spinach purée, peas, bacon, red wine jus.',
      ingredients: [
        { q: '240 g', name: 'Roasted pork belly', note: 'portioned to 240 g', link: 'pork-belly-batch' },
        { q: '25 ml', name: 'Oil', note: 'for frying the belly' },
        { q: '5 g', name: 'Table salt', note: 'on the crackling' },
        { q: '150 g', name: 'Mash', link: 'mash' },
        { q: '50 ml', name: 'Spinach purée', note: 'a wavy squiggle across the whole plate', link: 'spinach-puree' },
        { q: '80 g', name: 'Peas' },
        { q: '80 g', name: 'Diced bacon', note: 'bacon rasher, diced' },
        { q: '50 ml', name: 'Red wine jus', link: 'red-wine-jus' },
        { q: '40 g', name: 'Fried shallots', note: 'fried onions, made in house', link: 'fried-onions' },
        { q: '50 g', name: 'Green garnish', note: 'snow pea tendrils, sliced spring onion, parsley or finely sliced chives' }
      ],
      pins: [
        { label: 'Pork belly', x: 36.8, y: 39.6, side: 'left', tags: [], note: '240 g, roasted. Jus on top.', link: 'pork-belly-batch' },
        { label: 'Mash', x: 44.3, y: 54.0, side: 'left', link: 'mash', note: '150 g, slightly off centre, on top of the spinach squiggle.' },
        { label: 'Spinach purée', x: 13.2, y: 50.0, side: 'left', link: 'spinach-puree', note: '50 ml, a wavy squiggle across the whole plate.' },
        { label: 'Peas', x: 63.2, y: 61.3, side: 'right', tags: [], note: 'About 80 g, with jus. Beside the mash and on top of the belly.' },
        { label: 'Bacon', x: 63.2, y: 45.3, side: 'right', tags: [], note: 'About 80 g, with jus. Beside the mash and on top of the belly.' },
        { label: 'Red wine jus', x: 58.5, y: 52.8, side: 'right', link: 'red-wine-jus', note: 'On the peas and bacon, and on top of the belly.' },
        { label: 'Fried shallots', x: 49.0, y: 43.4, side: 'right', link: 'fried-onions', note: '40 g, fried onions on top.' },
        { label: 'Green garnish', x: 51.9, y: 46.2, side: 'left', tags: [], note: 'Snow pea tendrils, sliced spring onion, parsley or finely sliced chives.' }
      ],
      sections: [
        { title: 'Cooking', steps: [
          'Portion the roasted pork belly to 240 g.',
          'Season the crackling with the 5 g table salt.',
          'Quickly fry the belly in a pan with the oil, on all sides.',
          'Finish it in the kick oven at 250 °C for about 10 min.',
          'Heat the green peas and the diced bacon (about 80 g each) in a pan with a splash of water. Add the red wine jus once hot.'
        ] },
        { title: 'Plating', steps: [
          'Wavy squiggle of spinach purée across the whole plate.',
          'Mash on top of it, slightly off centre.',
          'Bacon and peas with jus next to the mash.',
          'Pork belly on top, with jus over it.',
          'Peas and bacon on top of the belly as well.',
          'Finish with 40 g fried shallots and 50 g green garnish.'
        ] }
      ]
    },
    {
      id: 'carbonara', art: 'carbonara', no: '30', kind: 'main', forLine: 'Plate', name: 'Carbonara', avc: 'Carbonara S26',
      menu: 'Classic Pub Carbonara: fettuccine, bacon, cream, parmesan, half a garlic bread.',
      yield: 'Per plate. 250 g fettuccine, 400 ml creamy garlic sauce, 120 g bacon, half a garlic bread.',
      ingredients: [
        { q: '250 g', name: 'Fettuccine', note: 'cooked, one wrapped portion', link: 'fettuccine', tags: ['Gluten'] },
        { q: '400 ml', name: 'Creamy garlic sauce', note: 'the carbonara sauce', link: 'carbonara-sauce' },
        { q: '120 g', name: 'Bacon' },
        { q: '10 ml', name: 'White cooking wine', note: 'AVC costing [where it goes to confirm]' },
        { q: '[Qty]', name: 'Parmesan', note: 'a little in the pan with the sauce', tags: ['Milk'] },
        { q: '20 g', name: 'Shaved parmesan', note: 'to garnish', tags: ['Milk'] },
        { q: '0.05 bunch', name: 'Chives', note: 'the greens, to garnish' },
        { q: '1/2', name: 'Garlic bread', note: '7 inch, bought in, cut in half', tags: ['Gluten', 'Milk', 'Soy?'] }
      ],
      pins: [
        { label: 'Fettuccine', x: 42.5, y: 52.8, side: 'right', link: 'fettuccine', tags: ['Gluten'], note: '250 g, wet and hot, tossed through 400 ml creamy garlic sauce.' },
        { label: 'Bacon', x: 48.3, y: 57.5, side: 'left', tags: [], note: '120 g, cooked in the pan first.' },
        { label: 'Parmesan', x: 55.9, y: 37.5, side: 'right', tags: ['Milk'], note: '20 g shaved, to garnish.' },
        { label: 'Chives', x: 44.3, y: 41.5, side: 'left', tags: [], note: 'The greens, to garnish.' },
        { label: 'Garlic bread', x: 79.2, y: 71.7, side: 'left', tags: ['Gluten', 'Milk', 'Soy?'], note: 'Half a garlic bread on the side.' }
      ],
      sections: [
        { title: 'Cooking', steps: [
          'Cook the bacon (120 g) in a pan.',
          'Deglaze the pan with the creamy garlic sauce (400 ml).',
          'Add a little parmesan to the pan with the sauce.',
          'Add the wet, hot fettuccine (one 250 g portion) and toss it through the sauce.'
        ] },
        { title: 'Plating', steps: [
          'Fettuccine and sauce in the centre of the plate.',
          'Garnish with shaved parmesan and the greens.',
          'Half a garlic bread on the side.'
        ] }
      ],
      labelNote: 'Check the garlic bread label.'
    },

    /* Share boards */
    {
      id: 'grill-board', art: 'grill-board', no: '31', kind: 'main', forLine: 'Share board', name: "Grill Maiden's Board", avc: "Grill Maiden's Board S26",
      menu: 'Grill Maiden\'s Shareboard: 300 g slow-roast brisket, 250 g rump, Cumberland pork sausage, chicken wings, chips and salad, choice of two sauces.',
      yield: 'Per board. 250 g rump, 500 g smoked brisket or oven brisket, 380 to 420 g szechuan wings, Cumberland sausage, chips, salad, two sauces of choice.',
      ingredients: [
        { q: '250 g', name: 'Rump steak', note: 'grain fed MB1' },
        { q: '500 g', name: 'Smoked brisket', note: 'or oven brisket, 500 g of either. Smoked brisket is finished in the kick oven', link: 'brisket' },
        { q: '500 g', name: 'Oven brisket', note: 'or smoked brisket, 500 g of either', link: 'oven-brisket' },
        { q: '380 to 420 g', name: 'Chicken middle wings', note: 'presteamed, floured, portioned in a sandwich bag' },
        { q: '50 g', name: 'Wing flour', note: 'cornflour and szechuan spice seasoning', link: 'wing-flour' },
        { q: '90 g', name: 'Pork Cumberland sausage', note: 'thick, bought in', tags: ['Gluten?', 'Soy?'] },
        { q: '1 portion', name: 'Diane sauce', note: '50 ml, first sauce of choice', link: 'diane-sauce' },
        { q: '1.5 portions', name: 'Mushroom sauce', note: '75 ml, second sauce of choice, as costed', link: 'mushroom-sauce' },
        { q: '1.1 portions', name: 'Chips', note: '200 g raw portion' },
        { q: '1', name: 'Side salad', note: 'standard size', link: 'side-salad' }
      ],
      pins: [
        { label: 'Rump', x: 23.5, y: 28.3, side: 'left', tags: [], note: '250 g rump steak.' },
        { label: 'Smoked or oven brisket', x: 52.7, y: 23.4, side: 'left', link: 'brisket', note: '500 g of smoked brisket (finished in the kick oven) or oven brisket (card 121).' },
        { label: 'Chicken wings', x: 29.2, y: 61.2, side: 'right', link: 'wing-flour', note: '380 to 420 g, with szechuan seasoning.' },
        { label: 'Cumberland sausage', x: 65.8, y: 48.1, side: 'right', tags: ['Gluten?', 'Soy?'], note: '90 g, bought in, on the grill first.' },
        { label: 'Chips', x: 50.7, y: 75.7, side: 'left', tags: [], note: '1.1 portions, standard.' },
        { label: 'Side salad', x: 17.9, y: 48.1, side: 'right', link: 'side-salad', note: 'Standard size.' },
        { label: 'Sauce of choice', x: 82.1, y: 31.4, side: 'left', link: 'diane-sauce', note: 'Diane sauce, 1 portion of 50 ml.' },
        { label: 'Second sauce', x: 87.0, y: 69.8, side: 'left', link: 'mushroom-sauce', note: 'Mushroom sauce, 1.5 portions of 50 ml (75 ml), as costed.' }
      ],
      sections: [
        { title: 'Prep ahead: wings', steps: [
          'Presteam the wings in the oven to a core of 75 °C.',
          'Cool them.',
          'Mix them with the wing flour.',
          'Portion 380 to 420 g into sandwich bags.'
        ] },
        { title: 'Cooking', steps: [
          'Put the Cumberland sausage on the grill first.',
          'Smoked brisket (500 g): finish it in the kick oven. [Oven setting to confirm]',
          'Oven brisket (500 g): [heating and finishing to confirm]',
          'Cook the rump steak (250 g). [Method and doneness to confirm]',
          'Cook the wings (380 to 420 g). [Fryer setting to confirm]',
          'Cook the chips and plate the standard side salad.'
        ] },
        { title: 'Plating', steps: ['Serve on a rounded rectangular wooden board.'] }
      ],
      labelNote: 'Check the sausage label.'
    },
    {
      id: 'taco-board', art: 'taco-board', no: '32', kind: 'main', forLine: 'Share board', name: 'Guacho Taco Share Board', avc: 'Guacho Taco Share Board S26',
      menu: 'Guacho Taco Shareboard: pulled pork, beef brisket, southern-style chicken tenders, pico de gallo, sour cream, avocado, six tortillas, slaw, corn tostadas.',
      yield: 'Per board. Six tortillas, tenders, smoked brisket or oven brisket, pulled pork, slaw, pico.',
      ingredients: [
        { q: '6', name: 'Flour tortillas', note: '5 inch', tags: ['Gluten', 'Soy?'] },
        { q: '240 g', name: 'Southern-style chicken tenders', note: '60 to 80 g each, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '200 g', name: 'Smoked brisket', note: 'grain fed MB2, or oven brisket, 200 g of either', link: 'brisket' },
        { q: '200 g', name: 'Oven brisket', note: 'or smoked brisket, 200 g of either', link: 'oven-brisket' },
        { q: '200 g', name: 'Pulled pork', link: 'pulled-pork' },
        { q: '200 g', name: 'Slaw', link: 'slaw' },
        { q: '100 g', name: 'Pico de gallo', link: 'pico' },
        { q: '[Qty]', name: 'Charred corn kernels', link: 'charred-corn' },
        { q: '60 g', name: 'Chunky avocado' },
        { q: '60 ml', name: 'Light sour cream', tags: ['Milk'] }
      ],
      pins: [
        { label: 'Flour tortillas', x: 13.0, y: 22.4, side: 'right', tags: ['Gluten', 'Soy?'], note: '6, 5 inch.' },
        { label: 'Chicken tenders', x: 54.0, y: 30.4, side: 'left', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: '240 g, southern style.' },
        { label: 'Smoked or oven brisket', x: 77.4, y: 28.3, side: 'right', link: 'brisket', note: '200 g of smoked brisket (card 79) or oven brisket (card 121).' },
        { label: 'Pulled pork', x: 24.8, y: 65.1, side: 'left', tags: [], note: '200 g. Card to come.' },
        { label: 'Slaw', x: 49.1, y: 66.0, side: 'left', link: 'slaw' },
        { label: 'Pico de gallo', x: 74.5, y: 57.5, side: 'left', tags: [], note: '100 g. Card to come.' },
        { label: 'Avocado', x: 86.8, y: 67.7, side: 'left', tags: [], note: '60 g chunky.' },
        { label: 'Sour cream', x: 70.8, y: 76.4, side: 'left', tags: ['Milk'], note: '60 ml.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Chicken tenders: fry at 175 °C [time to confirm].', 'Flour tortillas: cook on the grill [time and how served to confirm].', 'Pulled pork: cooked in the smoker (card to come) [temperature and time to confirm].', 'Brisket: smoked brisket (card 79) or oven brisket (card 121) [slicing and reheat to confirm].', 'Charred corn kernels: card 93.'] }
      ],
      labelNote: 'Check the tortilla and tender labels.'
    },

    /* Seniors */
    {
      id: 'senior-schnitzel', art: 'senior-schnitzel', no: '33', kind: 'main', forLine: 'Senior', name: 'Senior Chicken Schnitzel', avc: 'Senior Chicken Schnitzle S26',
      menu: 'Seniors Chicken Schnitzel: chips, salad, gravy.',
      yield: 'Senior plate. Half a schnitzel, gravy, chips and salad.',
      ingredients: [
        { q: '½', name: 'Chicken schnitzel', note: 'half a 350 g double butterfly, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '30 g', name: 'Lemon' },
        { q: '50 ml', name: 'Gravy', link: 'gravy' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Chicken schnitzel', x: 44.3, y: 34.0, side: 'left', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: 'Half a 350 g double butterfly.' },
        { label: 'Lemon', x: 72.6, y: 28.3, side: 'left', tags: [], note: '30 g wedge.' },
        { label: 'Gravy', x: 70.8, y: 46.2, side: 'left', tags: [], note: '50 ml. Card to come.' },
        { label: 'Chips', x: 28.3, y: 67.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'senior-parmy', art: 'senior-parmy', no: '34', kind: 'main', forLine: 'Senior', name: 'Senior Parmy', avc: 'senior parmy S26',
      menu: 'Chicken Parmy topping: shaved leg ham, Napoli sauce, mozzarella, chips and salad.',
      yield: 'Senior plate. Half a schnitzel, sauce, ham, mozzarella, chips and salad.',
      ingredients: [
        { q: '½', name: 'Chicken schnitzel', note: 'half a 350 g double butterfly, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '30 g', name: 'Pizza sauce', link: 'pizza-sauce', note: 'Mutti; Napoli on the menu' },
        { q: '20 g', name: 'Virginian ham', note: 'shaved leg ham on the menu' },
        { q: '30 g', name: 'Shredded mozzarella', tags: ['Milk'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Chicken schnitzel', x: 32, y: 37.7, side: 'right', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: 'Half a 350 g double butterfly schnitzel.' },
        { label: 'Parmy topping', x: 46.2, y: 33, side: 'right', tags: ['Milk'], note: 'Napoli (30 g pizza sauce), 20 g shaved leg ham, 30 g mozzarella melted on top.' },
        { label: 'Chips', x: 28.3, y: 67, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ],
      labelNote: 'Check the schnitzel and ham labels.'
    },
    {
      id: 'senior-rissoles', art: 'senior-rissoles', no: '35', kind: 'main', forLine: 'Senior', name: 'Senior Lamb Rissoles', avc: 'Lamb Rissoles Senior S26',
      menu: 'Seniors Lamb Rissoles: mash, vegetables, gravy.',
      yield: 'Senior plate. 2 rissoles, mash, veg, gravy.',
      ingredients: [
        { q: '2', name: 'Lamb rissoles', note: '0.66 of the 240 g, 3-rissole serve', link: 'rissole-mix' },
        { q: '150 g', name: 'Mash', link: 'mash', tags: ['Milk?'] },
        { q: '1 portion', name: 'Seasonal vegetables', note: 'about 120 g', link: 'side-veg' },
        { q: '60 ml', name: 'Gravy', link: 'gravy' }
      ],
      pins: [
        { label: 'Lamb rissoles', x: 38.7, y: 39.6, side: 'left', link: 'rissole-mix' },
        { label: 'Mash', x: 41.3, y: 56.6, side: 'left', link: 'mash', note: '150 g mash.' },
        { label: 'Gravy', x: 51.9, y: 47.2, side: 'right', link: 'gravy', note: '60 ml.' },
        { label: 'Seasonal vegetables', x: 69.8, y: 66.0, side: 'left', link: 'side-veg', note: 'About 120 g: 3 pieces each of carrot, cauliflower and broccoli.' }
      ]
    },
    {
      id: 'senior-bolognese', art: 'senior-bolognese', no: '36', kind: 'main', forLine: 'Senior', name: 'Senior Spaghetti Bolognese', avc: 'Senior Spaghetti Bolognaise S26',
      menu: 'Seniors Spaghetti Bolognaise: parmesan, garlic bread.',
      yield: 'Senior plate. Spaghetti, 200 g bolognese, garlic bread.',
      ingredients: [
        { q: '1.5 portions', name: 'Spaghetti', note: '180 g portion', link: 'spaghetti', tags: ['Gluten'] },
        { q: '200 g', name: 'Kids bolognese', link: 'kids-bolognese' },
        { q: '10 g', name: 'Shaved parmesan', tags: ['Milk'] },
        { q: '½ piece', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk', 'Soy?'] }
      ],
      pins: [
        { label: 'Spaghetti', x: 37.7, y: 58.5, side: 'left', tags: ['Gluten'], note: '1.5 portions. Card to come.' },
        { label: 'Kids bolognese', x: 54.9, y: 50.1, side: 'right', tags: [], note: '200 g.' },
        { label: 'Parmesan', x: 43.2, y: 42.5, side: 'left', tags: ['Milk'], note: '10 g shaved.' },
        { label: 'Garlic bread', x: 78.3, y: 71.7, side: 'left', tags: ['Gluten', 'Milk', 'Soy?'], note: 'Half piece.' }
      ],
      labelNote: 'Check the garlic bread label.'
    },
    {
      id: 'kids-spaghetti-bolognese', art: 'senior-bolognese', no: '113', kind: 'main', forLine: 'Kids', name: 'Kids Spaghetti Bolognese',
      yield: 'Kids plate. Spaghetti, bolognese sauce, parmesan, half a garlic bread.',
      ingredients: [
        { q: '120 g', name: 'Spaghetti', link: 'spaghetti', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Bolognese sauce', link: 'kids-bolognese' },
        { q: '[Qty]', name: 'Parmesan', tags: ['Milk'] },
        { q: '½ piece', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk', 'Soy?'] }
      ],
      pins: [
        { label: 'Spaghetti', x: 37.7, y: 58.5, side: 'left', tags: ['Gluten'], note: '120 g.' },
        { label: 'Bolognese sauce', x: 54.9, y: 50.1, side: 'right', link: 'kids-bolognese', note: '' },
        { label: 'Parmesan', x: 43.2, y: 42.5, side: 'left', tags: ['Milk'], note: '' },
        { label: 'Garlic bread', x: 78.3, y: 71.7, side: 'left', tags: ['Gluten', 'Milk', 'Soy?'], note: 'Half piece.' }
      ],
      labelNote: 'Check the garlic bread label.'
    },

    /* Sides */
    {
      id: 'side-salad', art: 'side-salad', no: '37', kind: 'side', forLine: 'Side', name: 'Side Salad', avc: 'Side Salad - Fitzys S26',
      menu: 'Seasonal Garden Salad.',
      yield: 'Per side.',
      ingredients: [
        { q: '40 g', name: 'Mesclun mix' },
        { q: '100 g', name: 'Continental cucumber' },
        { q: '25 g', name: 'Cherry tomatoes', note: 'a tenth of a 250 g punnet' },
        { q: '20 g', name: 'Red onion' },
        { q: '10 g', name: 'Julienne carrot' },
        { q: '10 ml', name: 'French dressing', note: 'gluten free, Masterfoods', tags: ['Egg?', 'Soy?'] }
      ],
      pins: [
        { label: 'Mesclun', x: 38.7, y: 41.5, side: 'left', tags: [], note: '40 g.' },
        { label: 'Cucumber', x: 59.7, y: 60.6, side: 'right', tags: [], note: '100 g.' },
        { label: 'Cherry tomatoes', x: 59.4, y: 39.5, side: 'right', tags: [], note: '25 g.' },
        { label: 'Red onion', x: 44.3, y: 60.5, side: 'left', tags: [], note: '20 g.' },
        { label: 'French dressing', x: 49.1, y: 49.1, side: 'right', tags: ['Egg?', 'Soy?'], note: '10 ml.' }
      ],
      labelNote: 'Check the French dressing label.'
    },
    {
      id: 'wedges', art: 'wedges', no: '38', kind: 'side', forLine: 'Side', name: 'Wedges', avc: 'Sides - Wedges S26',
      menu: 'Wedges with sweet chilli.',
      yield: 'Per serve. 400 g wedges, sour cream, sweet chilli.',
      ingredients: [
        { q: '400 g', name: 'Seasoned potato wedges', note: 'McCain, bought in', tags: ['Gluten?', 'Soy?'] },
        { q: '80 ml', name: 'Light sour cream', tags: ['Milk'] },
        { q: '80 ml', name: 'Sweet chilli sauce' }
      ],
      pins: [
        { label: 'Wedges', x: 39.6, y: 49.1, side: 'right', tags: ['Gluten?', 'Soy?'], note: '400 g, seasoned.' },
        { label: 'Sour cream', x: 73.6, y: 35.8, side: 'left', tags: ['Milk'], note: '80 ml.' },
        { label: 'Sweet chilli', x: 73.6, y: 63.2, side: 'left', tags: [], note: '80 ml.' }
      ],
      labelNote: 'Check the wedge and sweet chilli labels.'
    },
    {
      id: 'mac-side', art: 'mac-side', no: '39', kind: 'side', forLine: 'Side', name: 'Smoked Mac and Cheese', avc: 'Smoked Mac Side S26',
      menu: 'Smoked Mac and Cheese.',
      yield: 'Per side. 250 g with panko.',
      ingredients: [
        { q: '250 g', name: 'Smoked mac and cheese', link: 'smoked-mac', tags: ['Gluten', 'Milk'] },
        { q: '5 g', name: 'Panko crumbs', tags: ['Gluten'] }
      ],
      pins: [
        { label: 'Smoked mac and cheese', x: 42.5, y: 54.7, side: 'right', tags: ['Gluten', 'Milk'], note: '250 g. Card to come.' },
        { label: 'Panko', x: 54.7, y: 41.5, side: 'right', tags: ['Gluten'], note: '5 g on top.' }
      ]
    },
    {
      id: 'slaw-side', art: 'slaw-side', no: '40', kind: 'side', forLine: 'Side', name: 'Slaw Serve', avc: 'Sides - Slaw Serve S26',
      menu: 'Creamy Slaw.',
      yield: 'Per side. 200 g slaw.',
      ingredients: [
        { q: '200 g', name: 'Slaw', link: 'slaw' },
        { q: '0.05 bunch', name: 'Chives' }
      ],
      pins: [
        { label: 'Slaw', x: 42.5, y: 54.7, side: 'right', link: 'slaw' },
        { label: 'Chives', x: 53.8, y: 43.4, side: 'right', tags: [], note: '0.05 bunch.' }
      ]
    },
    {
      id: 'mash-side', art: 'mash-side', no: '41', kind: 'side', forLine: 'Side', name: 'Mash Serve', avc: 'Sides - Mash Serve S26',
      menu: 'Mash and Gravy.',
      yield: 'Per side. 250 g mash, 60 ml gravy.',
      ingredients: [
        { q: '250 g', name: 'Mash', link: 'mash' },
        { q: '60 ml', name: 'Gravy', link: 'gravy' },
        { q: '0.05 bunch', name: 'Chives' }
      ],
      pins: [
        { label: 'Mash', x: 36.8, y: 58.5, side: 'left', link: 'mash', note: '250 g.' },
        { label: 'Gravy', x: 54.0, y: 53.1, side: 'right', tags: [], note: '60 ml. Card to come.' },
        { label: 'Chives', x: 51.9, y: 41.4, side: 'left', tags: [], note: '0.05 bunch.' }
      ]
    },
    {
      id: 'greens-side', done: true, art: 'greens-side', no: '42', kind: 'side', forLine: 'Side', name: 'Steamed Seasonal Vegetables', avc: 'Sides - Steamed Greens Serve S26',
      menu: 'Steamed Seasonal Vegetables.',
      yield: 'Per side. One portion: 3 pieces each of carrot, cauliflower and broccoli, about 120 g.',
      ingredients: [
        { q: '1 portion', name: 'Seasonal vegetables', note: 'about 120 g', link: 'side-veg' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Heat the steamed vegetables in the poaching pot.', 'Finish in a pan with a bit of oil, salt and pepper.', 'Every portion gets 3 pieces each of carrot, cauliflower and broccoli, about 120 g in total.'] }
      ],
      pins: [
        { label: 'Seasonal vegetables', x: 49.1, y: 49.1, side: 'right', link: 'side-veg', note: '1 portion, about 120 g: 3 pieces each of carrot, cauliflower and broccoli.' }
      ]
    },

    /* Desserts */
    {
      id: 'sticky-toffee', art: 'sticky-toffee', no: '43', kind: 'dessert', forLine: 'Plate', name: 'Sticky Toffee Pudding', avc: 'Sticky Toffee Pudding Complete S26',
      menu: 'Sticky Date Pudding: whipped cream, salted caramel sauce.',
      yield: 'Per plate. 150 g pudding, rum butterscotch, honeycomb, ice cream.',
      ingredients: [
        { q: '150 g', name: 'Sticky date pudding', note: 'Country Chef tray, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '100 ml', name: 'Rum butterscotch', link: 'rum-butterscotch', tags: ['Milk'] },
        { q: '50 g', name: 'Honeycomb', link: 'honeycomb' },
        { q: '80 g', name: 'Vanilla ice cream', tags: ['Milk'] }
      ],
      pins: [
        { label: 'Sticky date pudding', x: 44.3, y: 49.3, side: 'left', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: '150 g.' },
        { label: 'Rum butterscotch', x: 61.1, y: 44.3, side: 'right', tags: ['Milk'], note: '100 ml. Card to come.' },
        { label: 'Honeycomb', x: 29.2, y: 71.9, side: 'left', tags: [], note: '50 g. Card to come.' },
        { label: 'Vanilla ice cream', x: 70.8, y: 63.2, side: 'left', tags: ['Milk'], note: '80 g.' }
      ],
      labelNote: 'Check the pudding and ice cream labels.'
    },
    {
      id: 'donut-fries', art: 'donut-fries', no: '44', kind: 'dessert', forLine: 'Plate', name: 'Donut Fries', avc: 'Donut Fries S26',
      menu: 'Donut Fries: maple syrup, vanilla ice cream.',
      yield: 'Per serve. 110 g donut fries.',
      ingredients: [
        { q: '110 g', name: 'Donut fries', note: 'funnel fries, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '50 ml', name: 'Maple syrup' },
        { q: '20 g', name: 'Whipped cream', note: 'aerosol', tags: ['Milk'] },
        { q: '3 g', name: 'Ground cinnamon' },
        { q: '5 g', name: 'Icing sugar mix' }
      ],
      pins: [
        { label: 'Donut fries', x: 42.5, y: 45.3, side: 'right', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: '110 g, cinnamon and icing sugar.' },
        { label: 'Whipped cream', x: 69.8, y: 67.9, side: 'left', tags: ['Milk'], note: '20 g.' },
        { label: 'Maple syrup', x: 74.5, y: 34.0, side: 'left', tags: [], note: '50 ml.' }
      ],
      labelNote: 'Check the donut fries and maple syrup labels.'
    },

    /* Batch recipes */
    {
      id: 'rissole-mix', done: true, no: '45', kind: 'batch', forLine: 'For the lamb rissoles', name: 'Lamb Rissole Mix', short: 'Rissoles', art: 'rissole-mix', avc: 'Rissoles Batch 5000g A25',
      yield: 'Batch: 5 kg lamb mince. A 240 g serve is 3 rissoles.',
      ingredients: [
        { q: '5 kg', name: 'Lamb mince' },
        { q: '500 g', name: 'Carrots' },
        { q: '500 g', name: 'Brown onions', note: 'large' },
        { q: '100 g', name: 'Crushed garlic' },
        { q: '100 g', name: 'Pork fat' },
        { q: '20 g', name: 'Table salt' },
        { q: '10 g', name: 'Ground white pepper' }
      ],
      sections: [
        { title: 'Method', steps: ['Mix everything together in a big bowl.', 'Portion into balls of 90 g each.', 'Tray up in a GN pan with baking paper on the bottom.', 'Cook on steam bake, 50% steam, 140 °C, until the core reaches 75 °C.'] }
      ]
    },
    /* ---------- On the online menu, no AVC costing in the zip: components from the menu, quantities to come ---------- */

    /* Snacks */
    {
      id: 'poutine', art: 'poutine', no: '46', kind: 'snack', forLine: 'Snack', name: 'Poutine Fries',
      menu: 'Poutine Fries: fries, melted cheddar and mozzarella, gravy.',
      yield: 'Per serve, in a bowl. 200 g of chips, grated mozzarella, 160 ml of gravy, a thin zigzag of American cheese sauce, topped with fried shallots.',
      ingredients: [
        { q: '200 g', name: 'Chips' },
        { q: '[Qty]', name: 'Grated mozzarella', note: 'bought in', link: 'grated-mozzarella', tags: ['Milk'] },
        { q: '160 ml', name: 'Gravy', note: 'smothered over the mozzarella', link: 'gravy' },
        { q: '[Qty]', name: 'American cheese sauce', note: 'bought in, thin zigzag over the gravy', link: 'american-cheese-sauce', tags: ['Milk'] },
        { q: '[Qty]', name: 'Fried shallots', note: 'bought in, on top' }
      ],
      pins: [
        { label: 'Chips', x: 34.0, y: 58.5, side: 'left', tags: [], note: '200 g, in a bowl.' },
        { label: 'American cheese sauce', x: 49.1, y: 38.7, side: 'right', link: 'american-cheese-sauce', note: 'Bought in. Thin zigzag across the whole gravy.' },
        { label: 'Grated mozzarella', x: 27.8, y: 40.0, side: 'left', link: 'grated-mozzarella', note: 'Bought in. Under the gravy.' },
        { label: 'Gravy', x: 41.0, y: 47.2, side: 'left', link: 'gravy', note: '160 ml. Sits on top of the mozzarella.' },
        { label: 'Fried shallots', x: 48.1, y: 44.3, side: 'right', tags: [], note: 'Bought in. On top.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve in a bowl.', 'Chips in the bowl.', 'Grated mozzarella over the chips.', 'Smother with 160 ml of gravy, on top of the mozzarella.', 'American cheese sauce in a thin zigzag across the whole gravy.', 'Fried shallots on top.'] }
      ]
    },
    {
      id: 'lamb-nachos', art: 'lamb-nachos', no: '123', kind: 'snack', forLine: 'Snack', name: 'Smoked Pulled Lamb Nachos', short: 'Lamb nachos',
      menu: 'Smoked Pulled Lamb Nachos: slow-smoked pulled lamb layered over crisp corn chips and baked with bubbling mozzarella, topped with house pico de gallo, velvety smashed avocado puree, cool sour cream, feta cheese and a drizzle of creamy ranch.',
      yield: 'Per serve, in a bowl. Corn chips, smoked pulled lamb and mozzarella baked together, then pico de gallo, avocado puree, sour cream, feta, ranch and pea shoots on top.',
      ingredients: [
        { q: '[Qty]', name: 'Corn chips', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Smoked pulled lamb', note: 'from the smoker' },
        { q: '[Qty]', name: 'Grated mozzarella', note: 'baked on until bubbling', link: 'grated-mozzarella', tags: ['Milk'] },
        { q: '[Qty]', name: 'Pico de gallo', note: 'house made', link: 'pico' },
        { q: '[Qty]', name: 'Smashed avocado puree' },
        { q: '[Qty]', name: 'Sour cream', tags: ['Milk'] },
        { q: '[Qty]', name: 'Feta', note: 'crumbled', tags: ['Milk'] },
        { q: '[Qty]', name: 'Ranch', note: 'drizzled over', link: 'ranch', tags: ['Milk', 'Egg'] },
        { q: '[Qty]', name: 'Pea shoots', note: 'on top' }
      ],
      pins: [
        { label: 'Corn chips', x: 25.5, y: 72.6, side: 'left', tags: ['Gluten?'], note: 'Under everything, out to the edge of the bowl.' },
        { label: 'Smoked pulled lamb', x: 43.4, y: 39.6, side: 'left', tags: [], note: 'From the smoker. Layered over the chips.' },
        { label: 'Mozzarella', x: 54.7, y: 65.1, side: 'right', link: 'grated-mozzarella', note: 'Baked on until bubbling.' },
        { label: 'Pico de gallo', x: 59.4, y: 56.6, side: 'right', link: 'pico', note: 'House made. Card to come.' },
        { label: 'Avocado puree', x: 32.1, y: 59.4, side: 'left', tags: [], note: 'Smashed avocado puree, on one side.' },
        { label: 'Sour cream', x: 69.8, y: 49.1, side: 'right', tags: ['Milk'], note: 'On the other side.' },
        { label: 'Feta', x: 44.3, y: 56.6, side: 'left', tags: ['Milk'], note: 'Crumbled over.' },
        { label: 'Ranch', x: 51.9, y: 45.3, side: 'left', link: 'ranch', note: 'Drizzled over everything.' },
        { label: 'Pea shoots', x: 54.7, y: 32.1, side: 'right', tags: [], note: 'On top.' }
      ],
      sections: [
        { title: 'Build and bake', steps: ['Corn chips in the bowl.', 'Layer the smoked pulled lamb over the chips.', 'Grated mozzarella over the top.', 'Bake until the mozzarella is bubbling. [Oven setting and time to come]'] },
        { title: 'Plating', steps: ['Pico de gallo over the top.', 'Smashed avocado puree on one side.', 'Sour cream on the other side.', 'Crumble the feta over.', 'Drizzle the ranch over everything.', 'Pea shoots on top.'] }
      ],
      labelNote: 'Check the corn chip, lamb rub and avocado puree labels.'
    },
    {
      id: 'buffalo-corn-cob-with-cashew-crumb', art: 'buffalo-corn', no: '122', kind: 'snack', forLine: 'Snack', name: 'Buffalo BBQ Corn on the Cob', short: 'Buffalo corn',
      menu: 'Buffalo BBQ Corn on the Cob: sweet, juicy corn with a tangy buffalo BBQ kick, coated in creamy, spicy mayo and finished with a crunchy toasted cashew crumb.',
      yield: 'Per serve, on the big round grey plate. A whole corn cob brushed with chilli jalapeño butter, through the impinger, coated in buffalo mayo, crumbed with toasted cashews, pea shoots on top.',
      ingredients: [
        { q: '1', name: 'Corn cob', note: 'whole' },
        { q: '[Qty]', name: 'Chilli jalapeño butter', note: 'brushed over the whole cob', tags: ['Milk'] },
        { q: '[Qty]', name: 'Buffalo mayo', note: 'coats the cob', tags: ['Egg'] },
        { q: '[Qty]', name: 'Toasted cashews', note: 'the crumb', tags: ['Tree nut'] },
        { q: '[Qty]', name: 'Pea shoots', note: 'on top' }
      ],
      pins: [
        { label: 'Corn cob', x: 17.9, y: 55.7, side: 'left', tags: [], note: 'Whole cob, through the impinger.' },
        { label: 'Chilli jalapeño butter', x: 60.4, y: 55.0, side: 'right', tags: ['Milk'], note: 'Brushed over the whole cob first.' },
        { label: 'Buffalo mayo', x: 69.8, y: 49.1, side: 'right', tags: ['Egg'], note: 'Coats the cob.' },
        { label: 'Toasted cashews', x: 36.8, y: 50.0, side: 'left', tags: ['Tree nut'], note: 'The crumb, all over.' },
        { label: 'Pea shoots', x: 57.5, y: 38.7, side: 'left', tags: [], note: 'On top.' }
      ],
      sections: [
        { title: 'Method', steps: ['Brush the whole corn cob with chilli jalapeño butter and run it through the impinger.', 'Coat in buffalo mayo.', 'Crumb with toasted cashews.', 'Serve on the big round grey plate.', 'Pea shoots on top.'] }
      ],
      labelNote: 'Check the chilli jalapeño butter and buffalo mayo labels.'
    },
    {
      id: 'beetroot-bites', art: 'beetroot-bites', no: '47', kind: 'snack', forLine: 'Snack', name: 'Crispy Beetroot Bites',
      menu: 'Crispy Beetroot Bites: fried beetroot, caramelised chilli jam, Korean-style cucumber.',
      yield: 'Per serve. 7 pieces of fried beetroot tossed in chilli jam, piled in the middle, Korean-style cucumber on top.',
      ingredients: [
        { q: '7 pieces', name: 'Crispy beetroot bites', note: 'fried', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Caramelised chilli jam', link: 'chilli-jam' },
        { q: '[Qty]', name: 'Korean-style cucumber', link: 'korean-cucumber' }
      ],
      pins: [
        { label: 'Crispy beetroot bites', x: 36.3, y: 56.6, side: 'left', tags: ['Gluten?'], note: '7 pieces, fried, tossed in chilli jam, piled in the middle.' },
        { label: 'Korean-style cucumber', x: 50.5, y: 38.2, side: 'right', link: 'korean-cucumber', note: 'On top of the pile.' },
        { label: 'Caramelised chilli jam', x: 41.5, y: 46.5, side: 'left', link: 'chilli-jam', note: 'The bites are tossed in it.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Toss the 7 beetroot bites in the caramelised chilli jam.', 'Pile them in the middle of the plate.', 'Korean-style cucumber on top.'] }
      ]
    },
    {
      id: 'brisket-cob', art: 'brisket-cob', no: '48', kind: 'snack', forLine: 'Snack', name: 'Brisket Cob',
      menu: 'Brisket Cob: slow-roasted house-rubbed brisket, cream cheese, corn, caramelised onion, in a cob.',
      yield: 'Per serve. A cob loaf filled with cob loaf mix, grated mozzarella on top, spring onions to garnish.',
      ingredients: [
        { q: '1', name: 'Cob loaf', tags: ['Gluten'] },
        { q: '280 ml', name: 'Cob loaf mix', note: 'cream cheese, corn and caramelised onion are in the mix', link: 'cob-mix' },
        { q: 'about 50 g', name: 'Grated mozzarella', note: 'bought in, on top', link: 'grated-mozzarella', tags: ['Milk'] },
        { q: '[Qty]', name: 'Spring onions', note: 'garnish' }
      ],
      pins: [
        { label: 'Cob loaf', x: 49.1, y: 28.3, side: 'right', tags: ['Gluten'], note: '' },
        { label: 'Cob loaf mix', x: 44.3, y: 51.9, side: 'left', link: 'cob-mix', note: '280 ml in the hollowed cob.' },
        { label: 'Grated mozzarella', x: 54.7, y: 46.2, side: 'right', link: 'grated-mozzarella', note: 'About 50 g, on top.' },
        { label: 'Spring onions', x: 50.9, y: 41.5, side: 'right', tags: [], note: 'Garnish.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Fill the hollowed cob with 280 ml of cob loaf mix.', 'About 50 g grated mozzarella on top.', 'Spring onions to garnish.'] }
      ]
    },
    {
      id: 'wings', art: 'wings', no: '49', kind: 'snack', forLine: 'Snack', name: 'Fried Chicken Wings',
      menu: 'Fried Chicken Wings: double-smoked BBQ sauce.',
      yield: 'Per serve. 380 to 420 g fried wings in double-smoked BBQ sauce, with cowboy candy (jalapeño candy) on top.',
      ingredients: [
        { q: '380 to 420 g', name: 'Chicken wings', note: 'portioned in a sandwich bag' },
        { q: '[Qty]', name: 'Wing flour', link: 'wing-flour', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Double-smoked BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'Cowboy candy', note: 'also called jalapeño candy, candied jalapeños, on top', link: 'cowboy-candy' }
      ],
      pins: [
        { label: 'Chicken wings', x: 39.6, y: 42.5, side: 'right', tags: [], note: '380 to 420 g, fried.' },
        { label: 'Double-smoked BBQ sauce', x: 58.5, y: 64.2, side: 'left', tags: ['Gluten?', 'Soy?'], note: 'On the wings.' },
        { label: 'Cowboy candy', x: 51.9, y: 41.0, side: 'right', link: 'cowboy-candy', note: 'Also called jalapeño candy. On top of the wings.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Wings in the double-smoked BBQ sauce.', 'Cowboy candy (jalapeño candy) on top of the wings.'] }
      ]
    },
    {
      id: 'haloumi-tacos', art: 'haloumi-tacos', no: '50', kind: 'snack', forLine: 'Snack', name: 'Haloumi Tacos',
      menu: 'Haloumi Tacos: slaw, lime aioli, haloumi, charred corn, avocado, sour cream.',
      yield: 'Per serve. Tortillas with haloumi, slaw, charred corn, avocado, lime aioli, sour cream.',
      ingredients: [
        { q: '[Qty]', name: 'Flour tortillas', tags: ['Gluten', 'Soy?'] },
        { q: '[Qty]', name: 'Haloumi', tags: ['Milk'] },
        { q: '[Qty]', name: 'Slaw', link: 'slaw' },
        { q: '[Qty]', name: 'Charred corn', link: 'charred-corn' },
        { q: '[Qty]', name: 'Avocado' },
        { q: '[Qty]', name: 'Lime aioli', tags: ['Egg'] },
        { q: '[Qty]', name: 'Sour cream', tags: ['Milk'] }
      ],
      pins: [
        { label: 'Flour tortillas', x: 65.1, y: 16.8, side: 'left', tags: ['Gluten', 'Soy?'], note: '' },
        { label: 'Haloumi', x: 44.5, y: 42.7, side: 'right', tags: ['Milk'], note: '' },
        { label: 'Slaw', x: 33.0, y: 25.5, side: 'left', link: 'slaw' },
        { label: 'Charred corn', x: 63.9, y: 67.7, side: 'right', tags: [], note: '' },
        { label: 'Avocado', x: 34.0, y: 50.0, side: 'left', tags: [], note: '' },
        { label: 'Lime aioli', x: 47.2, y: 26.4, side: 'right', tags: ['Egg'], note: '' },
        { label: 'Sour cream', x: 53.7, y: 75.0, side: 'left', tags: ['Milk'], note: '' }
      ]
    },
    {
      id: 'pork-belly-bites', art: 'pork-belly-bites', no: '51', kind: 'snack', forLine: 'Snack', name: 'Crispy Pork Belly Bites',
      menu: 'Crispy Pork Belly Bites: caramelised chilli jam, Korean-style cucumber.',
      yield: 'Per serve. Crispy pork belly tossed in chilli jam, piled in the middle, Korean-style cucumber on top.',
      ingredients: [
        { q: '280 to 290 g', name: 'Roasted pork belly', note: 'cut into bites, portioned in a sandwich bag', link: 'pork-belly-batch' },
        { q: '[Qty]', name: 'Caramelised chilli jam', link: 'chilli-jam' },
        { q: '[Qty]', name: 'Korean-style cucumber', link: 'korean-cucumber' }
      ],
      pins: [
        { label: 'Pork belly bites', x: 36.3, y: 56.6, side: 'left', link: 'pork-belly-batch', note: 'Crispy, tossed in chilli jam, piled in the middle.' },
        { label: 'Korean-style cucumber', x: 50.5, y: 38.2, side: 'right', link: 'korean-cucumber', note: 'On top of the pile.' },
        { label: 'Caramelised chilli jam', x: 37.7, y: 47.2, side: 'left', link: 'chilli-jam', note: 'The bites are tossed in it.' }
      ],
      sections: [
        { title: 'Prep ahead', steps: ['Portion the roasted pork belly bites, 280 to 290 g per bag, into sandwich bags.'] },
        { title: 'Plating', steps: ['Toss the pork belly bites in the caramelised chilli jam.', 'Pile them in the middle of the plate.', 'Korean-style cucumber on top.'] }
      ]
    },
    {
      id: 'calamari', art: 'calamari', no: '52', kind: 'snack', forLine: 'Snack', name: 'Salt and Szechuan Pepper Calamari',
      menu: 'Salt and Szechuan Pepper Calamari: lime aioli.',
      yield: 'Per serve. 12 strips of calamari, dusted in corn flour, fried and tossed in Szechuan seasoning. Lime aioli and a lemon wedge.',
      ingredients: [
        { q: '12 pieces', name: 'Calamari', note: 'strips, not rings', tags: ['Mollusc'] },
        { q: '[Qty]', name: 'Corn flour', note: 'to dust' },
        { q: '[Qty]', name: 'Szechuan seasoning', note: 'bought in, tossed through after frying' },
        { q: '[Qty]', name: 'Lime aioli', note: 'bought in', link: 'lime-aioli', tags: ['Egg?'] },
        { q: '1', name: 'Lemon wedge' }
      ],
      pins: [
        { label: 'Calamari strips', x: 41.5, y: 45.3, side: 'right', tags: ['Mollusc'], note: '12 strips, not rings.' },
        { label: 'Szechuan seasoning', x: 55.7, y: 50.9, side: 'left', tags: [], note: 'Bought in. Tossed through after frying.' },
        { label: 'Lime aioli', x: 80.2, y: 73.6, side: 'left', link: 'lime-aioli', note: 'Bought in.' },
        { label: 'Lemon wedge', x: 25.5, y: 73.6, side: 'right', tags: [], note: '' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Dust the calamari strips in corn flour.', 'Deep-fry at 175 °C. [Time to confirm]', 'Toss through the Szechuan seasoning.'] },
        { title: 'Plating', steps: ['Calamari strips on the plate.', 'Lime aioli on the side.', 'Lemon wedge.'] }
      ],
      labelNote: 'Check the Szechuan seasoning and lime aioli labels for allergens.'
    },
    {
      id: 'riblets', art: 'riblets', no: '53', kind: 'snack', forLine: 'Snack', name: 'Smoked BBQ Pork Riblets',
      menu: 'Smoked BBQ Pork Riblets: bourbon BBQ sauce, cowboy candy.',
      yield: 'Per serve. Smoked riblets tossed in bourbon BBQ sauce, topped with cowboy candy.',
      ingredients: [
        { q: '390 to 410 g', name: 'Pork riblets', note: 'smoked, cut from the pork ribs into individual riblets, portioned in a sandwich bag' },
        { q: '[Qty]', name: 'Bourbon BBQ sauce', link: 'bourbon-bbq-sauce' },
        { q: '[Qty]', name: 'Cowboy candy', note: 'also called jalapeño candy, candied jalapeños', link: 'cowboy-candy' }
      ],
      pins: [
        { label: 'Pork riblets', x: 36.8, y: 54.7, side: 'right', tags: [], note: 'Smoked. 390 to 410 g.' },
        { label: 'Bourbon BBQ sauce', x: 56.6, y: 33.7, side: 'left', link: 'bourbon-bbq-sauce', note: 'The riblets are tossed in it.' },
        { label: 'Cowboy candy', x: 48.1, y: 44.3, side: 'left', link: 'cowboy-candy', note: 'Candied jalapeños. On top.' }
      ],
      sections: [
        { title: 'Prep ahead', steps: ['Cut the pork ribs into individual riblets.', 'Portion the riblets, 390 to 410 g per bag, into sandwich bags. One bag is one serve.'] },
        { title: 'Plating', steps: ['Toss the riblets through the bourbon BBQ sauce.', 'Pile them on the plate.', 'Cowboy candy on top.'] }
      ]
    },
    {
      id: 'garlic-bread', art: 'garlic-bread', no: '54', kind: 'snack', forLine: 'Snack', name: 'Garlic Bread',
      menu: 'Garlic Bread.',
      yield: 'Per serve. Cut diagonally through the centre and placed on the plate.',
      ingredients: [
        { q: '[Qty]', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk', 'Soy?'] }
      ],
      pins: [
        { label: 'Garlic bread', x: 36.3, y: 49.1, side: 'right', tags: ['Gluten', 'Milk', 'Soy?'], note: '7 inch, bought in. Cut diagonally through the centre.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Cut the garlic bread diagonally through the centre.', 'Place the two pieces nicely on the plate.'] }
      ]
    },
    {
      id: 'bacon-cheese-bread', art: 'bacon-cheese-bread', no: '55', kind: 'snack', forLine: 'Snack', name: 'Bacon and Cheese Bread',
      menu: 'Bacon and Cheese Bread.',
      yield: 'Per serve. Cut diagonally through the centre and placed on the plate.',
      ingredients: [
        { q: '[Qty]', name: 'Bread', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Bacon' },
        { q: '[Qty]', name: 'Cheese', tags: ['Milk'] }
      ],
      pins: [
        { label: 'Bread', x: 26.0, y: 60.4, side: 'right', tags: ['Gluten'], note: '' },
        { label: 'Bacon', x: 67.2, y: 46.7, side: 'left', tags: [], note: '' },
        { label: 'Cheese', x: 36.3, y: 49.1, side: 'right', tags: ['Milk'], note: 'Melted.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Cut the bread diagonally through the centre.', 'Place the two pieces nicely on the plate.'] }
      ]
    },
    {
      id: 'chips-snack', art: 'chips-snack', no: '56', kind: 'snack', forLine: 'Snack', name: 'Chips',
      menu: 'Chips with a choice of aioli or gravy.',
      yield: 'Per serve, in a bowl. Aioli or gravy.',
      ingredients: [
        { q: '[Qty]', name: 'Chips' },
        { q: '[Qty]', name: 'Aioli', link: 'aioli', note: 'or gravy, guest\'s choice', tags: ['Egg'] },
        { q: '[Qty]', name: 'Gravy', note: 'or aioli', link: 'gravy' }
      ],
      pins: [
        { label: 'Chips', x: 44.3, y: 52.8, side: 'right', tags: [], note: 'In a bowl.' },
        { label: 'Aioli or gravy', x: 83.0, y: 17.9, side: 'left', tags: ['Egg'], note: 'Guest\'s choice.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve the chips in a bowl.', 'Aioli or gravy, the guest\'s choice.'] }
      ]
    },

    /* Mains */
    {
      id: 'beef-cheek', art: 'beef-cheek', no: '57', kind: 'main', forLine: 'Plate', name: 'Beef Cheek',
      menu: 'Beef Cheek: red wine-braised beef cheek, roasted honey pumpkin purée, fried onion, herb oil.',
      yield: 'Per plate. Pumpkin purée swooped and smeared, braised beef cheek a bit off centre, herb oil drizzled round, fried shallots on top.',
      ingredients: [
        { q: '[Qty]', name: 'Roasted honey pumpkin purée', note: 'big kitchen spoon swoop and smear' },
        { q: '[Qty]', name: 'Beef cheek', note: 'braised in red wine', link: 'beef-cheek-batch' },
        { q: '[Qty]', name: 'Herb oil', note: 'lightly drizzled round' },
        { q: '[Qty]', name: 'Fried shallots', note: 'on top', tags: ['Gluten?'] }
      ],
      pins: [
        { label: 'Roasted honey pumpkin purée', x: 32.1, y: 58.5, side: 'left', tags: [], note: 'Big kitchen spoon swoop and smear.' },
        { label: 'Beef cheek', x: 51.9, y: 45.3, side: 'left', link: 'beef-cheek-batch', note: 'Red wine braised. A bit off centre.' },
        { label: 'Fried shallots', x: 54.7, y: 38.7, side: 'right', tags: ['Gluten?'], note: 'On top.' },
        { label: 'Herb oil', x: 69.8, y: 33.0, side: 'right', tags: [], note: 'Lightly drizzled round the plate.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Swoop and smear the pumpkin purée across the plate with a big kitchen spoon.', 'Place the beef cheek a bit off centre.', 'Drizzle the herb oil lightly round the plate.', 'Top with the fried shallots.'] }
      ]
    },
    {
      id: 'fish-chips', art: 'fish-chips', no: '58', kind: 'main', forLine: 'Plate', name: 'Fish and Chips',
      menu: 'Fish and Chips: XXXX-battered fish, tartare, lemon, chips and salad.',
      yield: 'Per plate. Battered fish, tartare, lemon, chips and salad.',
      ingredients: [
        { q: '[Qty]', name: 'Fish fillet', tags: ['Fish'] },
        { q: '[Qty]', name: 'Beer batter', note: 'XXXX', link: 'beer-batter', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Tartare sauce', link: 'tartare', tags: ['Egg', 'Soy?'] },
        { q: '[Qty]', name: 'Lemon' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Battered fish', x: 42.5, y: 36.8, side: 'left', tags: ['Fish'], note: 'XXXX batter.' },
        { label: 'Tartare', x: 74.5, y: 37.7, side: 'left', tags: ['Egg', 'Soy?'], note: '' },
        { label: 'Lemon', x: 69.8, y: 23.6, side: 'left', tags: [], note: '' },
        { label: 'Chips', x: 28.3, y: 66.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },
    {
      id: 'chicken-schnitzel', art: 'chicken-schnitzel', no: '59', kind: 'main', forLine: 'Plate', name: 'Chicken Schnitzel',
      menu: 'Chicken Schnitzel: chips, salad and a choice of sauce.',
      yield: 'Per plate. Sauce of choice, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '[Qty]', name: 'Sauce of choice', note: 'gravy, mushroom, pepper, garlic, jus, Diane or béarnaise' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Chicken schnitzel', x: 41.5, y: 34.0, side: 'right', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: 'Bought in.' },
        { label: 'Sauce of choice', x: 72.6, y: 45.3, side: 'left', tags: [], note: 'Gravy, mushroom, pepper, garlic, jus, Diane or béarnaise.' },
        { label: 'Chips', x: 28.3, y: 67.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },
    {
      id: 'chicken-parmy', art: 'chicken-parmy', no: '60', kind: 'main', forLine: 'Plate', name: 'Chicken Parmy',
      menu: 'Chicken Parmy: shaved leg ham, Napoli sauce, mozzarella, chips and salad.',
      yield: 'Per plate. Napoli, shaved leg ham and mozzarella, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '[Qty]', name: 'Napoli sauce' },
        { q: '[Qty]', name: 'Shaved leg ham' },
        { q: '[Qty]', name: 'Mozzarella', tags: ['Milk'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Chicken schnitzel', x: 30.4, y: 37.7, side: 'left', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: 'Bought in.' },
        { label: 'Napoli sauce', x: 63.2, y: 41.7, side: 'right', tags: [], note: '' },
        { label: 'Shaved leg ham', x: 40.6, y: 28.2, side: 'left', tags: [], note: '' },
        { label: 'Mozzarella', x: 50.9, y: 32.9, side: 'right', tags: ['Milk'], note: 'Melted on top.' },
        { label: 'Chips', x: 28.3, y: 67.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },

    /* Salads */
    {
      id: 'caesar', art: 'caesar', no: '61', kind: 'main', forLine: 'Salad', name: 'Pub Caesar',
      menu: 'Pub Caesar: cos lettuce, crispy bacon, poached egg, toasted sourdough, parmesan, dressing.',
      yield: 'Per bowl. Cos, crispy bacon, poached egg, sourdough, parmesan, Caesar dressing.',
      ingredients: [
        { q: '[Qty]', name: 'Cos lettuce' },
        { q: '[Qty]', name: 'Crispy bacon' },
        { q: '1', name: 'Poached egg', tags: ['Egg'] },
        { q: '[Qty]', name: 'Toasted sourdough', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Parmesan', tags: ['Milk'] },
        { q: '[Qty]', name: 'Caesar dressing', tags: ['Egg', 'Fish?', 'Milk?'] }
      ],
      pins: [
        { label: 'Cos lettuce', x: 31.2, y: 63.2, side: 'left', tags: [], note: '' },
        { label: 'Crispy bacon', x: 37.7, y: 45.3, side: 'left', tags: [], note: '' },
        { label: 'Poached egg', x: 49.9, y: 36.7, side: 'left', tags: ['Egg'], note: '' },
        { label: 'Toasted sourdough', x: 59.2, y: 53.7, side: 'right', tags: ['Gluten'], note: '' },
        { label: 'Parmesan', x: 60.4, y: 43.3, side: 'right', tags: ['Milk'], note: 'Shaved.' },
        { label: 'Caesar dressing', x: 42.5, y: 62.4, side: 'right', tags: ['Egg', 'Fish?', 'Milk?'], note: '' }
      ]
    },
    {
      id: 'green-bowl', art: 'green-bowl', no: '62', kind: 'main', forLine: 'Salad', name: 'Green Bowl',
      menu: 'Green Bowl: charred broccolini, baby spinach, gem lettuce, brown rice, heirloom cherry tomatoes, red onion, toasted cashews.',
      yield: 'Per bowl. The premixed green bowl mix, crowded in the centre of the bowl, broccolini across the sides, cashews crumbled on top.',
      ingredients: [
        { q: '[Qty]', name: 'Green bowl mix', note: 'premixed', link: 'green-bowl-mix' },
        { q: '[Qty]', name: 'Broccolini', note: 'charred' },
        { q: '[Qty]', name: 'Toasted cashews', note: 'crumbled on top', tags: ['Tree nut'] }
      ],
      pins: [
        { label: 'Green bowl mix', x: 58.0, y: 57.5, side: 'right', link: 'green-bowl-mix', note: 'Premixed. Crowded in the centre of the bowl.' },
        { label: 'Broccolini', x: 36.8, y: 41.5, side: 'left', tags: [], note: 'Charred. Across the sides.' },
        { label: 'Toasted cashews', x: 51.9, y: 45.3, side: 'right', tags: ['Tree nut'], note: 'Crumbled on top.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Put the green bowl mix in a bowl, crowded in the centre.', 'Lay the charred broccolini across the sides.', 'Crumble the toasted cashews on top.'] }
      ]
    },
    {
      id: 'green-bowl-mix', art: 'green-bowl-mix', no: '120', kind: 'batch', forLine: 'For the green bowl', name: 'Green Bowl Mix', short: 'Green bowl mix',
      yield: 'Premixed. Everything in the green bowl except the broccolini and the cashews.',
      ingredients: [
        { q: '[Qty]', name: 'Baby spinach' },
        { q: '[Qty]', name: 'Gem lettuce' },
        { q: '[Qty]', name: 'Brown rice' },
        { q: '[Qty]', name: 'Heirloom cherry tomatoes' },
        { q: '[Qty]', name: 'Red onion' }
      ],
      sections: [
        { title: 'Method', steps: ['Mix the baby spinach, gem lettuce, brown rice, heirloom cherry tomatoes and red onion together.', '[Batch size, mixing and storage to confirm]'] }
      ]
    },
    {
      id: 'pumpkin-salad', art: 'pumpkin-salad', no: '63', kind: 'main', forLine: 'Salad', name: 'Honey and Maple Roasted Pumpkin',
      menu: 'Honey and Maple Roasted Pumpkin: five-spice roasted pumpkin, maple, seed granola, basil pesto, feta, fried kale.',
      yield: 'Per plate.',
      ingredients: [
        { q: '[Qty]', name: 'Pumpkin', note: 'five-spice roasted' },
        { q: '[Qty]', name: 'Maple' },
        { q: '[Qty]', name: 'Seed granola', link: 'seed-granola' },
        { q: '[Qty]', name: 'Basil pesto', tags: ['Tree nut?', 'Milk?'] },
        { q: '[Qty]', name: 'Feta', tags: ['Milk'] },
        { q: '[Qty]', name: 'Fried kale' }
      ],
      pins: [
        { label: 'Pumpkin', x: 36.8, y: 37.7, side: 'left', tags: [], note: 'Five-spice roasted.' },
        { label: 'Maple', x: 55.7, y: 37.5, side: 'right', tags: [], note: 'Drizzled.' },
        { label: 'Seed granola', x: 44.1, y: 49.1, side: 'left', link: 'seed-granola', note: '' },
        { label: 'Basil pesto', x: 69.1, y: 62.5, side: 'right', tags: ['Tree nut?', 'Milk?'], note: '' },
        { label: 'Feta', x: 54.7, y: 52.7, side: 'right', tags: ['Milk'], note: '' },
        { label: 'Fried kale', x: 33.0, y: 62.3, side: 'left', tags: [], note: '' }
      ]
    },

    /* Seniors */
    {
      id: 'senior-fish-chips', art: 'senior-fish-chips', no: '64', kind: 'main', forLine: 'Senior', name: 'Senior Fish and Chips',
      menu: 'Seniors Fish and Chips: XXXX-battered fish, tartare, chips and salad.',
      yield: 'Senior plate. Battered fish, tartare, chips and salad.',
      ingredients: [
        { q: '[Qty]', name: 'Fish fillet', tags: ['Fish'] },
        { q: '[Qty]', name: 'Beer batter', note: 'XXXX', link: 'beer-batter', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Tartare sauce', link: 'tartare', tags: ['Egg', 'Soy?'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Battered fish', x: 42.5, y: 36.8, side: 'left', tags: ['Fish'], note: 'XXXX batter, senior size.' },
        { label: 'Tartare', x: 74.5, y: 37.7, side: 'left', tags: ['Egg', 'Soy?'], note: '' },
        { label: 'Chips', x: 28.3, y: 66.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },
    {
      id: 'senior-calamari', art: 'senior-calamari', no: '65', kind: 'main', forLine: 'Senior', name: 'Senior Calamari',
      menu: 'Seniors Calamari: chips and salad.',
      yield: 'Senior plate. 12 pieces of calamari, chips and salad.',
      ingredients: [
        { q: '12 pieces', name: 'Calamari', tags: ['Mollusc', 'Gluten?'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Calamari', x: 48.1, y: 35.8, side: 'right', tags: ['Mollusc', 'Gluten?'], note: '12 pieces.' },
        { label: 'Chips', x: 28.3, y: 66.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
      ]
    },
    /* ---------- Country Rev-Up Specials: from the smoker (permanent, Oct 2026) ---------- */
    {
      id: 'butchers-board', art: 'butchers-board', no: '87', kind: 'main', forLine: 'Smoker special', name: 'Butchers Board',
      menu: 'Butchers Board: brisket, pulled pork, pulled lamb, Texas sausages and sides.',
      yield: 'Per board. Brisket, pulled pork, pulled lamb, Texas sausages, coleslaw and cornbread.',
      ingredients: [
        { q: '[Qty]', name: 'Smoked brisket', link: 'brisket' },
        { q: '[Qty]', name: 'Pulled pork', note: 'from the smoker' },
        { q: '[Qty]', name: 'Pulled lamb', note: 'from the smoker' },
        { q: '[Qty]', name: 'Texas sausages', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'New slaw', note: 'the coleslaw', link: 'slaw' },
        { q: '[Qty]', name: 'Cornbread', note: '[recipe or bought in to confirm]', tags: ['Gluten?', 'Milk?', 'Egg?'] },
        { q: '[Qty]', name: 'Maple butter', note: 'glaze on the cornbread', tags: ['Milk'] },
        { q: '[Qty]', name: 'Alabama white sauce', note: '[recipe to confirm]', tags: ['Egg?'] },
        { q: '[Qty]', name: 'Double-smoked BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'Bourbon BBQ sauce', link: 'bourbon-bbq-sauce' },
        { q: '[Qty]', name: 'Bread and butter pickles', note: 'bought in' }
      ],
      pins: [
        { label: 'New slaw', x: 16, y: 45.8, side: 'left', link: 'slaw', note: 'The coleslaw.' },
        { label: 'Cornbread', x: 24.5, y: 34.9, side: 'left', tags: ['Gluten?', 'Milk?', 'Egg?'], note: 'Glazed with maple butter, then in the oven. [Recipe or bought in to confirm]' },
        { label: 'Pulled pork', x: 41.5, y: 35.8, side: 'right', tags: [], note: 'From the smoker.' },
        { label: 'Pulled lamb', x: 56.6, y: 43.4, side: 'left', tags: [], note: 'From the smoker.' },
        { label: 'Texas sausages', x: 69.3, y: 33, side: 'right', tags: ['Gluten?', 'Soy?'], note: '' },
        { label: 'Brisket', x: 83, y: 54.7, side: 'left', tags: [], note: 'Smoked, sliced.' },
        { label: 'Bread and butter pickles', x: 17.9, y: 64.6, side: 'left', tags: [], note: '' },
        { label: 'Double-smoked BBQ sauce', x: 29.7, y: 66, side: 'right', tags: ['Gluten?', 'Soy?'], note: '' },
        { label: 'Bourbon BBQ sauce', x: 41.5, y: 64.2, side: 'right', link: 'bourbon-bbq-sauce', note: '' },
        { label: 'Alabama white sauce', x: 53.3, y: 66, side: 'right', tags: ['Egg?'], note: '[Recipe to confirm]' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Brisket, pulled pork and pulled lamb come from the smoker [times and holding to confirm].', 'Cornbread: glaze the top with maple butter, then into the oven [oven setting and time to confirm].'] },
        { title: 'Plating', steps: ['Serve on a plastic board with a wood finish. Back row, left to right: cornbread on coleslaw, pulled pork, pulled lamb, Texas sausages, brisket. Front left: four small bowls on a napkin with pickles, double-smoked BBQ sauce, bourbon BBQ sauce and Alabama white sauce.'] }
      ],
      labelNote: 'Check the sausage label.'
    },
    {
      id: 'beast-board', art: 'beast-board', no: '88', kind: 'main', forLine: 'Smoker special', name: 'The Beast Board',
      menu: 'The Beast Board: brisket, pulled pork, pulled lamb, sliders, Texas sausages, chicken wings and sides.',
      yield: 'Per board. Brisket, pulled pork, pulled lamb, sliders, Texas sausages, chicken wings, coleslaw and cornbread.',
      ingredients: [
        { q: '[Qty]', name: 'Smoked brisket', link: 'brisket' },
        { q: '[Qty]', name: 'Pulled pork', note: 'from the smoker' },
        { q: '[Qty]', name: 'Pulled lamb', note: 'from the smoker' },
        { q: '[Qty]', name: 'Sliders', note: '[filling to confirm]', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Texas sausages', tags: ['Gluten?', 'Soy?'] },
        { q: '380 to 420 g', name: 'Chicken wings', note: '[seasoning to confirm]' },
        { q: '[Qty]', name: 'New slaw', note: 'the coleslaw', link: 'slaw' },
        { q: '[Qty]', name: 'Cornbread', note: '[recipe or bought in to confirm]', tags: ['Gluten?', 'Milk?', 'Egg?'] },
        { q: '[Qty]', name: 'Maple butter', note: 'glaze on the cornbread', tags: ['Milk'] },
        { q: '[Qty]', name: 'Alabama white sauce', note: '[recipe to confirm]', tags: ['Egg?'] },
        { q: '[Qty]', name: 'Double-smoked BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'Bourbon BBQ sauce', link: 'bourbon-bbq-sauce' },
        { q: '[Qty]', name: 'Bread and butter pickles', note: 'bought in' }
      ],
      pins: [
        { label: 'New slaw', x: 11.3, y: 45.8, side: 'left', link: 'slaw', note: 'The coleslaw.' },
        { label: 'Cornbread', x: 19.8, y: 34.9, side: 'left', tags: ['Gluten?', 'Milk?', 'Egg?'], note: 'Glazed with maple butter, then in the oven. [Recipe or bought in to confirm]' },
        { label: 'Pulled pork', x: 36.8, y: 35.8, side: 'right', tags: [], note: 'From the smoker.' },
        { label: 'Pulled lamb', x: 51.9, y: 43.4, side: 'left', tags: [], note: 'From the smoker.' },
        { label: 'Texas sausages', x: 64.6, y: 33, side: 'right', tags: ['Gluten?', 'Soy?'], note: '' },
        { label: 'Brisket', x: 78.3, y: 54.7, side: 'left', tags: [], note: 'Smoked, sliced.' },
        { label: 'Chicken wings', x: 92.5, y: 30.2, side: 'left', tags: [], note: '380 to 420 g. [Seasoning to confirm]' },
        { label: 'Sliders', x: 92.9, y: 62.3, side: 'left', tags: ['Gluten?'], note: '[Filling to confirm]' },
        { label: 'Bread and butter pickles', x: 13.2, y: 64.6, side: 'left', tags: [], note: '' },
        { label: 'Double-smoked BBQ sauce', x: 25, y: 66, side: 'right', tags: ['Gluten?', 'Soy?'], note: '' },
        { label: 'Bourbon BBQ sauce', x: 36.8, y: 64.2, side: 'right', link: 'bourbon-bbq-sauce', note: '' },
        { label: 'Alabama white sauce', x: 48.6, y: 66, side: 'right', tags: ['Egg?'], note: '[Recipe to confirm]' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Brisket, pulled pork and pulled lamb come from the smoker [times and holding to confirm].', 'Cornbread: glaze the top with maple butter, then into the oven [oven setting and time to confirm].'] },
        { title: 'Plating', steps: ['Serve on a plastic board with a wood finish. Back row, left to right: cornbread on coleslaw, pulled pork, pulled lamb, Texas sausages, brisket, with the chicken wings at the back right and the sliders at the front right. Front left: four small bowls on a napkin with pickles, double-smoked BBQ sauce, bourbon BBQ sauce and Alabama white sauce.'] }
      ],
      labelNote: 'Check the sausage and slider labels.'
    },
    {
      id: 'pulled-pork-burger', art: 'pulled-pork-burger', diagram: 'pulled-pork-burger-build', no: '89', kind: 'main', forLine: 'Smoker special', name: 'Pulled Pork Burger',
      menu: 'Pulled Pork Burger: pulled pork, Carolina BBQ and slaw with fries.',
      yield: 'Per plate. Pulled pork and slaw in the bun, Carolina BBQ, fries on the side.',
      ingredients: [
        { q: '[Qty]', name: 'Burger bun', tags: ['Gluten?', 'Sesame?'] },
        { q: '[Qty]', name: 'Pulled pork', note: 'from the smoker' },
        { q: '[Qty]', name: 'Carolina BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'New slaw', link: 'slaw', note: 'in the burger, under the pulled pork' },
        { q: '[Qty]', name: 'Fries', note: 'on the side' }
      ],
      pins: [
        { label: 'Pulled pork burger', x: 35.8, y: 39.6, side: 'right', tags: ['Gluten?'], note: 'Bottom to top: bun base, new slaw, pulled pork with Carolina BBQ, bun top. [Quantities to confirm]' },
        { label: 'Fries', x: 66.0, y: 57.5, side: 'left', tags: [], note: 'On the side.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Pulled pork from the smoker [reheat to confirm].'] },
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'New slaw on the bun base.', 'Pulled pork with Carolina BBQ on top of the slaw. [Inference: sauce tossed through the pork, to confirm]', 'Bun top.', 'Fries on the side.'] }
      ],
      labelNote: 'Check the bun and sauce labels.'
    },
    {
      id: 'brisket-board', art: 'brisket-board', no: '90', kind: 'main', forLine: 'Smoker special', name: 'Brisket Board',
      menu: 'Brisket Board: brisket, slaw, served with fries.',
      yield: 'Per board. Brisket, slaw, fries.',
      ingredients: [
        { q: '[Qty]', name: 'Smoked brisket', link: 'brisket' },
        { q: '[Qty]', name: 'New slaw', link: 'slaw' },
        { q: '[Qty]', name: 'Fries' }
      ],
      pins: [
        { label: 'Brisket', x: 30.2, y: 29.2, side: 'right', tags: [], note: 'Smoked, sliced.' },
        { label: 'New slaw', x: 69.8, y: 24.5, side: 'left', link: 'slaw', note: '' },
        { label: 'Fries', x: 48.1, y: 63.2, side: 'left', tags: [], note: '' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Brisket from the smoker, card 79.'] },
        { title: 'Plating', steps: ['Serve on a plastic board with a wood finish. [Layout to confirm]'] }
      ],
      labelNote: ''
    },
    {
      id: 'pork-knuckle', art: 'pork-knuckle', no: '92', kind: 'main', forLine: 'Special', name: 'Pork Knuckle',
      yield: 'Per plate. Pork knuckle on potato mash with pork sauce, hot honey glaze, 5 onion rings, fried shallots and sauerkraut.',
      ingredients: [
        { q: '[Qty]', name: 'Potato mash', link: 'mash' },
        { q: '[Qty]', name: 'Pork sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'Pork knuckle' },
        { q: '[Qty]', name: 'Hot honey glaze', note: 'on the knuckle' },
        { q: '5', name: 'Onion rings', tags: ['Gluten?', 'Egg?'] },
        { q: '[Qty]', name: 'Fried shallots', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Sauerkraut' }
      ],
      pins: [
        { label: 'Onion rings', x: 49.1, y: 30.2, side: 'left', tags: ['Gluten?', 'Egg?'], note: '5 rings on top of the knuckle.' },
        { label: 'Hot honey glaze', x: 44.3, y: 38.7, side: 'left', tags: [], note: 'Over the knuckle.' },
        { label: 'Pork knuckle', x: 61.3, y: 42.5, side: 'right', tags: [], note: '' },
        { label: 'Fried shallots', x: 69.8, y: 50.9, side: 'right', tags: ['Gluten?'], note: 'Scattered over the knuckle and the sauce.' },
        { label: 'Potato mash', x: 54.7, y: 59.4, side: 'right', link: 'mash', note: 'The knuckle sits on it.' },
        { label: 'Pork sauce', x: 30.2, y: 51.9, side: 'left', tags: ['Gluten?', 'Soy?'], note: 'Around the mash. [Recipe to confirm]' },
        { label: 'Sauerkraut', x: 26.4, y: 61.3, side: 'left', tags: [], note: '[Position to confirm]' }
      ],
      sections: [
        { title: 'Plating', steps: [
          'Potato mash in the middle of the plate.',
          'Pork sauce around the mash.',
          'Pork knuckle on the mash.',
          'Hot honey glaze over the knuckle.',
          '5 onion rings stacked on top of the knuckle.',
          'Fried shallots over the knuckle and the sauce.',
          'Sauerkraut on the plate [position to confirm].'
        ] }
      ],
      labelNote: 'Check the sauce, onion ring and fried shallot labels.'
    },
    {
      id: 'chicken-adobo', art: 'chicken-adobo', no: '124', kind: 'main', forLine: 'Special', name: 'Chicken Adobo', short: 'Adobo',
      yield: 'Per plate with 180 g steamed jasmine rice. Batch: 2.5 kg bone-in chicken thigh braised in soy and vinegar. [Serves per batch to come]',
      ingredients: [
        { q: '2.5 kg', name: 'Chicken thigh', note: 'bone-in, skin-on' },
        { q: '250 ml', name: 'Soy sauce', tags: ['Soy', 'Gluten?'] },
        { q: '200 ml', name: 'White cane vinegar' },
        { q: '500 ml', name: 'Unsalted chicken stock', tags: ['Gluten?'] },
        { q: '100 g', name: 'Garlic', note: 'crushed, half for the marinade' },
        { q: '200 g', name: 'Brown onion', note: 'sliced' },
        { q: '5 pcs', name: 'Bay leaves' },
        { q: '10 g', name: 'Whole black peppercorns' },
        { q: '25 g', name: 'Brown sugar' },
        { q: '40 ml', name: 'Neutral cooking oil' },
        { q: '180 g', name: 'Jasmine rice', note: 'steamed, per plate' }
      ],
      pins: [
        { label: 'Jasmine rice', x: 35.8, y: 43.4, side: 'left', tags: [], note: '180 g, steamed.' },
        { label: 'Chicken adobo', x: 63.2, y: 50.9, side: 'right', tags: ['Soy', 'Gluten?'], note: 'Skin side up, beside the rice. [Pieces per serve to come]' },
        { label: 'Adobo sauce', x: 66.0, y: 72.6, side: 'right', tags: ['Soy', 'Gluten?'], note: 'From the pot, over the chicken. [Amount per serve to come]' }
      ],
      sections: [
        { title: 'Prepare and marinate', steps: ['Check the chicken and trim the excess fat.', 'Combine with the soy sauce, half the garlic, the bay leaves and the peppercorns.', 'Refrigerate for 30 min, or longer if your service schedule needs it.'] },
        { title: 'Brown the chicken', steps: ['Heat the oil in a large pot.', 'Drain the chicken. Keep the marinade.', 'Brown the chicken in batches so the pot is not overcrowded.'] },
        { title: 'Sauté the aromatics', steps: ['Cook the rest of the garlic and the onion until fragrant.', 'Return the chicken to the pot.'] },
        { title: 'Add the liquids', steps: ['Add the kept marinade, the vinegar and the water or stock.', 'Bring to the boil and simmer for 5 min before stirring.'] },
        { title: 'Braise', steps: ['Cover partly and simmer gently for 30 to 45 min, turning the chicken as needed.', 'Probe the thickest pieces: at least 75 °C.'] },
        { title: 'Finish the sauce', steps: ['Add the brown sugar. Taste and adjust.', 'Reduce uncovered until the sauce lightly coats the chicken.'] },
        { title: 'Plating', steps: ['180 g steamed jasmine rice on the plate.', 'Chicken adobo beside the rice, skin side up. [Pieces per serve to come]', 'Sauce from the pot over the chicken. [Amount per serve to come]'] }
      ],
      labelNote: 'Check the soy sauce and stock labels. Most soy sauce has wheat.'
    },

    {
      id: 'charred-corn', art: 'charred-corn', no: '93', kind: 'component', forLine: 'For the taco board and the haloumi tacos', name: 'Charred Corn Kernels', short: 'Charred corn',
      yield: 'Corn prepped the same way as the corn ribs, with all the kernels cut off the cob. Quantity per serve to come.',
      ingredients: [
        { q: '[Qty]', name: 'Corn cobs', note: 'same start as the corn ribs', link: 'corn' }
      ],
      sections: [
        { title: 'Method', steps: [
          'Steam the whole cobs 12 min, then char on the grill until well charred, as for the corn ribs (card 08).',
          'Cut all the kernels off the cob.'
        ] }
      ],
      contains: [],
      check: [],
      labelNote: 'Recheck if butter or a seasoning goes on.'
    },

    /* ---------- Functions platters (functions menu, 17 Oct 2026). Prices stay off the site. */
    {
      id: 'pizza-platter', art: 'pizza-platter', no: '94', kind: 'main', forLine: 'Functions', name: 'Pizza Platter',
      yield: 'Per platter. Margherita and pepperoni pizza, garlic bread.',
      ingredients: [
        { q: '1/2 slab', name: 'Margherita pizza', tags: ['Gluten', 'Milk', 'Soy?'] },
        { q: '1/2 slab', name: 'Pepperoni pizza', tags: ['Gluten', 'Milk', 'Soy?'] },
        { q: '1 whole', name: 'Garlic bread', note: 'G. Banga on the functions menu', tags: ['Gluten', 'Milk?', 'Soy?'] }
      ],
      pins: [
        { label: 'Margherita pizza', x: 22.6, y: 32.1, side: 'left', tags: ['Gluten', 'Milk', 'Soy?'], note: '1/2 slab.' },
        { label: 'Pepperoni pizza', x: 69.8, y: 32.1, side: 'right', tags: ['Gluten', 'Milk', 'Soy?'], note: '1/2 slab.' },
        { label: 'Garlic bread', x: 46.2, y: 58.5, side: 'right', tags: ['Gluten', 'Milk?', 'Soy?'], note: '1 whole.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve on a large rectangular white and grey marble board. [Layout to confirm]'] }
      ],
      labelNote: 'Check the labels of all bought-in items.'
    },
    {
      id: 'aussie-platter', art: 'aussie-platter', no: '95', kind: 'main', forLine: 'Functions', name: 'Aussie Platter',
      yield: 'Per platter. Party pies, sausage rolls, duck spring rolls, meatballs, quiche, 3 sauces.',
      ingredients: [
        { q: '10ea', name: 'Party pies', tags: ['Gluten', 'Milk?', 'Soy?'] },
        { q: '10ea', name: 'Sausage rolls', tags: ['Gluten', 'Milk?', 'Soy?'] },
        { q: '8ea', name: 'Spring rolls, duck', note: 'cut', tags: ['Gluten', 'Soy?', 'Sesame?'] },
        { q: '20ea', name: 'Meatballs', tags: ['Gluten?', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '8ea', name: 'Quiche', tags: ['Gluten', 'Milk', 'Egg'] },
        { q: '2ea', name: 'Tomato sauce', link: 'tomato-sauce' },
        { q: '2ea', name: 'BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '2ea', name: 'Sweet chilli sauce' }
      ],
      pins: [
        { label: 'Party pies', x: 19.8, y: 29.2, side: 'left', tags: ['Gluten', 'Milk?', 'Soy?'], note: '10.' },
        { label: 'Sausage rolls', x: 51.9, y: 29.7, side: 'left', tags: ['Gluten', 'Milk?', 'Soy?'], note: '10.' },
        { label: 'Duck spring rolls', x: 81.1, y: 29.7, side: 'right', tags: ['Gluten', 'Soy?', 'Sesame?'], note: '8, cut.' },
        { label: 'Meatballs', x: 19.3, y: 53.8, side: 'left', tags: ['Gluten?', 'Egg?', 'Milk?', 'Soy?'], note: '20.' },
        { label: 'Quiche', x: 53.3, y: 55.7, side: 'left', tags: ['Gluten', 'Milk', 'Egg'], note: '8.' },
        { label: 'Tomato sauce', x: 81.1, y: 50, side: 'right', link: 'tomato-sauce', note: '2 pots.' },
        { label: 'BBQ sauce', x: 81.1, y: 60.4, side: 'right', tags: ['Gluten?', 'Soy?'], note: '2 pots.' },
        { label: 'Sweet chilli sauce', x: 81.1, y: 70.8, side: 'right', tags: [], note: '2 pots.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve on a large rectangular white and grey marble board. [Layout to confirm]'] }
      ],
      labelNote: 'Check the labels of all bought-in items.'
    },
    {
      id: 'vege-platter', art: 'vege-platter', no: '96', kind: 'main', forLine: 'Functions', name: 'Vege Platter',
      yield: 'Per platter. Vege spring rolls, vege quiche, mozzarella sticks, pumpkin arancini, fried haloumi, garlic bread, 3 sauces.',
      ingredients: [
        { q: '10ea', name: 'Spring rolls, vege', tags: ['Gluten', 'Soy?', 'Sesame?'] },
        { q: '8ea', name: 'Quiche, vege', tags: ['Gluten', 'Milk', 'Egg'] },
        { q: '10ea', name: 'Mozzarella sticks', tags: ['Gluten', 'Milk', 'Egg?'] },
        { q: '10ea', name: 'Pumpkin arancini', tags: ['Gluten?', 'Milk?', 'Egg?'] },
        { q: '8ea', name: 'Fried haloumi', tags: ['Milk', 'Gluten?'] },
        { q: '1 whole', name: 'Garlic bread', note: 'G. Banga on the functions menu', tags: ['Gluten', 'Milk?', 'Soy?'] },
        { q: '2ea', name: 'Tomato sauce', link: 'tomato-sauce' },
        { q: '2ea', name: 'BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '2ea', name: 'Sweet chilli sauce' }
      ],
      pins: [
        { label: 'Vege spring rolls', x: 19.3, y: 29.2, side: 'left', tags: ['Gluten', 'Soy?', 'Sesame?'], note: '10.' },
        { label: 'Vege quiche', x: 51.9, y: 30.2, side: 'left', tags: ['Gluten', 'Milk', 'Egg'], note: '8.' },
        { label: 'Mozzarella sticks', x: 81.6, y: 29.7, side: 'right', tags: ['Gluten', 'Milk', 'Egg?'], note: '10.' },
        { label: 'Pumpkin arancini', x: 19.3, y: 51.9, side: 'left', tags: ['Gluten?', 'Milk?', 'Egg?'], note: '10.' },
        { label: 'Fried haloumi', x: 51.9, y: 52.8, side: 'left', tags: ['Milk', 'Gluten?'], note: '8.' },
        { label: 'Garlic bread', x: 35.4, y: 70.3, side: 'left', tags: ['Gluten', 'Milk?', 'Soy?'], note: '1 whole.' },
        { label: 'Tomato sauce', x: 81.1, y: 50, side: 'right', link: 'tomato-sauce', note: '2 pots.' },
        { label: 'BBQ sauce', x: 81.1, y: 60.4, side: 'right', tags: ['Gluten?', 'Soy?'], note: '2 pots.' },
        { label: 'Sweet chilli sauce', x: 81.1, y: 70.8, side: 'right', tags: [], note: '2 pots.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve on a large rectangular white and grey marble board. [Layout to confirm]'] }
      ],
      labelNote: 'Check the labels of all bought-in items.'
    },
    {
      id: 'yumcha-platter', art: 'yumcha-platter', no: '97', kind: 'main', forLine: 'Functions', name: 'Yumcha Platter',
      yield: 'Per platter. Dim sims, cocktail spring rolls, wontons, karage chicken, prawn crackers, 2 sauces.',
      ingredients: [
        { q: '10ea', name: 'Dim sims', tags: ['Gluten', 'Soy?', 'Sesame?', 'Egg?'] },
        { q: '10ea', name: 'Spring rolls, cocktail', tags: ['Gluten', 'Soy?', 'Sesame?'] },
        { q: '10ea', name: 'Wontons', tags: ['Gluten', 'Egg?', 'Soy?', 'Crustacean?'] },
        { q: '10ea', name: 'Karage chicken', tags: ['Gluten', 'Soy?', 'Egg?'] },
        { q: 'handful', name: 'Prawn crackers', tags: ['Crustacean', 'Gluten?'] },
        { q: '2ea', name: 'Sweet soy sauce', tags: ['Soy', 'Gluten?'] },
        { q: '2ea', name: 'Sweet chilli sauce' }
      ],
      pins: [
        { label: 'Dim sims', x: 19.3, y: 29.7, side: 'left', tags: ['Gluten', 'Soy?', 'Sesame?', 'Egg?'], note: '10.' },
        { label: 'Cocktail spring rolls', x: 50.9, y: 29.7, side: 'left', tags: ['Gluten', 'Soy?', 'Sesame?'], note: '10.' },
        { label: 'Wontons', x: 80.7, y: 29.7, side: 'right', tags: ['Gluten', 'Egg?', 'Soy?', 'Crustacean?'], note: '10.' },
        { label: 'Karage chicken', x: 19.8, y: 54.7, side: 'left', tags: ['Gluten', 'Soy?', 'Egg?'], note: '10.' },
        { label: 'Prawn crackers', x: 53.3, y: 54.7, side: 'left', tags: ['Crustacean', 'Gluten?'], note: 'A handful.' },
        { label: 'Sweet soy sauce', x: 81.1, y: 50.9, side: 'right', tags: ['Soy', 'Gluten?'], note: '2 pots.' },
        { label: 'Sweet chilli sauce', x: 81.1, y: 63.2, side: 'right', tags: [], note: '2 pots.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve on a large rectangular white and grey marble board. [Layout to confirm]'] }
      ],
      labelNote: 'Check the labels of all bought-in items.'
    },
    {
      id: 'antipasto-platter', art: 'antipasto-platter', no: '98', kind: 'main', forLine: 'Functions', name: 'Antipasto Platter',
      yield: 'Per platter. Prosciutto, leg ham, salami, cheese, crackers, grilled sourdough, dried fruit salad, 3 dips, 2 of each: tomato relish, caramelised onions and basil pesto.',
      ingredients: [
        { q: '80 g', name: 'Prosciutto' },
        { q: '100 g', name: 'Leg ham' },
        { q: '100 g', name: 'Salami' },
        { q: '300 g total', name: 'Cheese selection', note: 'Cracker Barrel, blue cheese and brie', tags: ['Milk'] },
        { q: '1/2 pkt', name: 'Crackers', tags: ['Gluten', 'Sesame?', 'Soy?'] },
        { q: '1 cob', name: 'Sourdough', note: 'cut and grilled', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Dried fruit salad', note: 'the dried fruit selection' },
        { q: '2ea', name: 'Tomato relish', note: 'dip', link: 'tomato-relish' },
        { q: '2ea', name: 'Caramelised onions', note: 'dip' },
        { q: '2ea', name: 'Basil pesto', note: 'dip', tags: ['Tree nut?', 'Milk?'] }
      ],
      pins: [
        { label: 'Prosciutto', x: 17.9, y: 28.3, side: 'left', tags: [], note: '80 g.' },
        { label: 'Leg ham', x: 43.4, y: 28.3, side: 'left', tags: [], note: '100 g.' },
        { label: 'Salami', x: 75.5, y: 28.3, side: 'right', tags: [], note: '100 g.' },
        { label: 'Cracker Barrel cheese', x: 10.4, y: 48.6, side: 'left', tags: ['Milk'], note: 'Part of the 300 g cheese selection.' },
        { label: 'Blue cheese', x: 24.5, y: 48.6, side: 'left', tags: ['Milk'], note: 'Part of the 300 g cheese selection.' },
        { label: 'Brie', x: 36.8, y: 48.6, side: 'right', tags: ['Milk'], note: 'Part of the 300 g cheese selection.' },
        { label: 'Crackers', x: 60.4, y: 48.6, side: 'right', tags: ['Gluten', 'Sesame?', 'Soy?'], note: '1/2 pkt.' },
        { label: 'Sourdough', x: 84.4, y: 48.6, side: 'right', tags: ['Gluten'], note: '1 cob, cut and grilled.' },
        { label: 'Dried fruit salad', x: 13.2, y: 67.9, side: 'left', tags: [], note: 'Quantity to come.' },
        { label: 'Tomato relish', x: 34.9, y: 67.9, side: 'left', link: 'tomato-relish', note: 'A dip. 2 pots.' },
        { label: 'Caramelised onions', x: 55.7, y: 67.9, side: 'right', tags: [], note: 'A dip. 2 pots.' },
        { label: 'Basil pesto', x: 76.4, y: 67.9, side: 'right', tags: ['Tree nut?', 'Milk?'], note: 'A dip. 2 pots.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve on a large rectangular white and grey marble board. [Layout to confirm]'] }
      ],
      labelNote: 'Check the labels of all bought-in items.'
    },
    {
      id: 'seafood-platter', art: 'seafood-platter', no: '99', kind: 'main', forLine: 'Functions', name: 'Seafood Platter',
      yield: 'Per platter. Scallops, B.B. whiting, fried squid, king prawns, oysters, sweet potato chips, lemon wedges, 2 sauces.',
      ingredients: [
        { q: '6-8ea', name: 'Scallops', tags: ['Mollusc'] },
        { q: '7ea', name: 'B.B. whiting', note: 'kids fish', tags: ['Fish', 'Gluten?', 'Egg?'] },
        { q: '100 g', name: 'Fried squid', tags: ['Mollusc', 'Gluten?', 'Egg?'] },
        { q: '6-8ea', name: 'King prawns', tags: ['Crustacean'] },
        { q: '10ea', name: 'Oysters', tags: ['Mollusc'] },
        { q: 'Large handful', name: 'Sweet potato chips' },
        { q: '[Qty]', name: 'Lemon wedges' },
        { q: '2ea', name: 'Tartare sauce', link: 'tartare' },
        { q: '2ea', name: 'Sweet chilli sauce' }
      ],
      pins: [
        { label: 'Scallops', x: 17.9, y: 29.2, side: 'left', tags: ['Mollusc'], note: '6-8.' },
        { label: 'B.B. whiting', x: 49.5, y: 29.2, side: 'left', tags: ['Fish', 'Gluten?', 'Egg?'], note: '7. The kids fish.' },
        { label: 'Fried squid', x: 80.2, y: 29.2, side: 'right', tags: ['Mollusc', 'Gluten?', 'Egg?'], note: '100 g.' },
        { label: 'King prawns', x: 19.3, y: 51.9, side: 'left', tags: ['Crustacean'], note: '6-8.' },
        { label: 'Oysters', x: 53.3, y: 51.9, side: 'left', tags: ['Mollusc'], note: '10.' },
        { label: 'Sweet potato chips', x: 82.1, y: 55.7, side: 'right', tags: [], note: 'Large handful.' },
        { label: 'Lemon wedges', x: 16, y: 70.8, side: 'left', tags: [], note: 'Quantity to come.' },
        { label: 'Tartare sauce', x: 42, y: 70.8, side: 'right', link: 'tartare', note: '2 pots.' },
        { label: 'Sweet chilli sauce', x: 62.7, y: 70.8, side: 'right', tags: [], note: '2 pots.' }
      ],
      sections: [
        { title: 'Plating', steps: ['Serve on a large rectangular white and grey marble board. [Layout to confirm]'] }
      ],
      labelNote: 'Check the labels of all bought-in items.'
    },

    {
      id: 'prawn-topper', art: 'prawn-topper', no: '100', kind: 'side', forLine: 'Topper', name: 'Prawn Topper',
      menu: 'Prawn topper: 5 pieces.',
      yield: 'Per topper. 5 pieces of prawn.',
      ingredients: [
        { q: '5 pieces', name: 'Prawns', tags: ['Crustacean'] }
      ],
      pins: [
        { label: 'Prawns', x: 40, y: 45, side: 'left', tags: ['Crustacean'], note: '5 pieces.' }
      ],
      sections: [{ title: 'Plating', steps: ['Place the 5 prawns on top of the steak. [Cooking and finish to confirm]'] }]
    },
    {
      id: 'calamari-topper', art: 'calamari-topper', no: '101', kind: 'side', forLine: 'Topper', name: 'Calamari Topper',
      menu: 'Calamari topper: 8 calamari strips.',
      yield: 'Per topper. 8 calamari strips.',
      ingredients: [
        { q: '8 strips', name: 'Calamari strips', tags: ['Mollusc', 'Gluten?'] }
      ],
      pins: [
        { label: 'Calamari strips', x: 40, y: 45, side: 'left', tags: ['Mollusc', 'Gluten?'], note: '8 strips.' }
      ],
      sections: [{ title: 'Plating', steps: ['Place the 8 calamari strips on top of the steak. [Cooking and finish to confirm]'] }]
    },
    {
      id: 'chicken-topper', art: 'chicken-topper', no: '102', kind: 'side', forLine: 'Topper', name: 'Chicken Topper',
      menu: 'Chicken topper: chicken tenders.',
      yield: 'Per topper. Chicken tenders cooked in Italian herbs. [Number of tenders to confirm]',
      ingredients: [
        { q: '[Qty]', name: 'Chicken tenders' },
        { q: '[Qty]', name: 'Italian herbs' }
      ],
      pins: [
        { label: 'Chicken tenders', x: 40, y: 45, side: 'left', tags: [], note: 'Cooked in Italian herbs, steamed to 75 °C core. [Number of tenders to confirm] [Unverified] drawing shows 3.' }
      ],
      sections: [
        { title: 'Cooking', steps: [
          'Cook the chicken tenders in Italian herbs.',
          'Steam them in the oven to a core temperature of 75 °C. [Oven programme, temperature and time to confirm]'
        ] },
        { title: 'Plating', steps: ['[Plating to confirm]'] }
      ]
    },
    {
      id: 'mushroom-topper', art: 'mushroom-topper', no: '103', kind: 'side', forLine: 'Topper', name: 'Mushroom Topper',
      menu: 'Mushroom topper: mushrooms roasted in Italian herbs.',
      yield: 'Per topper. Mushrooms cooked with Italian herbs in the oven. [Quantity and cut to confirm]',
      ingredients: [
        { q: '[Qty]', name: 'Mushrooms' },
        { q: '[Qty]', name: 'Italian herbs' }
      ],
      pins: [
        { label: 'Mushrooms', x: 40, y: 45, side: 'left', tags: [], note: 'Cooked with Italian herbs in the oven. [Quantity and cut to confirm] [Unverified] drawing is a guide only.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Cook the mushrooms with Italian herbs in the oven. [Oven programme, temperature and time to confirm]'] },
        { title: 'Plating', steps: ['[Plating to confirm]'] }
      ]
    },
    /* ---------- Batch cards from AVC Live (Oct 2026): only fully confirmed ingredient lists ---------- */
    {
      id: 'chips-salad', no: '66', art: 'chips-salad', kind: 'batch', forLine: 'For steaks, schnitzels, parmys and fish', name: 'Chips and Salad', short: 'Chips + salad',
      avc: 'GLOBAL 200g CHIP PORTION MEALS SEP26 / GLOBAL BASE SALAD PORTION SEP26',
      yield: 'Per serve: 200 g chips and one base salad.',
      ingredients: [
        { q: '200 g', name: 'Chips', note: '9 mm skin-on' },
        { q: '3 g', name: 'Cooking salt', note: 'for the chips' },
        { q: '15 g', name: 'Mesclun' },
        { q: '25 g', name: 'Cherry tomatoes' },
        { q: '5 g', name: 'Carrot, julienne' },
        { q: '10 g', name: 'Peeled red onion' },
        { q: '10 g', name: 'Lebanese cucumber' },
        { q: '20 ml', name: 'Green goddess dressing', link: 'green-goddess', note: 'vegan', tags: ['Soy?', 'Sesame?'] },
        { q: '2 g', name: 'Salt flakes', note: 'on the salad' }
      ],
      contains: [],
      check: [{ allergen: 'Soy', from: 'green goddess dressing' }, { allergen: 'Sesame', from: 'green goddess dressing' }],
      labelNote: 'Check the chip and dressing labels. AVC also lists chicken salt and lemon pepper on the chips at 0 g, so they are not counted here.'
    },
    {
      id: 'pork-belly-batch', done: true, no: '67', art: 'pork-belly-batch', kind: 'batch', forLine: 'For the pork belly and the pork belly bites', name: 'Pork Belly and Crackle', short: 'Pork belly',
      avc: 'Pork Belly & Crackle',
      yield: 'Batch: 25 serves, 240 g of raw belly per serve.',
      ingredients: [
        { q: '6 kg', name: 'Pork belly', note: 'boneless, rind on, 240 g raw per serve' },
        { q: '1 kg', name: 'Pork skin', note: 'for the crackle' }
      ],
      sections: [
        { title: 'Method: iCombi programme', steps: ['Put the pork belly in the iCombi and start the preprogrammed pork belly programme.'] },
        { title: 'Method: by hand, step by step', steps: ['Step 1, steam: 20 min.', 'Step 2, steam roast: 50% humidity, 140 °C, until the core reaches 75 °C.', 'Step 3, roast: 230 °C, 20 min.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Fresh pork only, so no label check needed.'
    },
    {
      id: 'side-veg', done: true, no: '68', kind: 'batch', forLine: 'For the rissoles', name: 'Seasonal Vegetables', short: 'Side veg', art: 'side-veg',
      yield: 'Batch prep: 12 carrots, 6 cauliflower heads, 8 broccoli heads. Per plate: 3 pieces of each, about 120 g.',
      ingredients: [
        { q: '12', name: 'Carrots' },
        { q: '6 heads', name: 'Cauliflower' },
        { q: '8 heads', name: 'Broccoli' }
      ],
      sections: [
        { title: 'Prep', steps: ['Cut the 12 carrots in half, then on an angle.', 'Take the florets from the 6 cauliflower heads and the 8 broccoli heads.', 'Put each vegetable in its own steam tray.', 'Steam the carrots for 6 min.', 'Steam the cauliflower for 4 min.', 'Steam the broccoli for 2 min.', 'Straight into ice water.'] },
        { title: 'Service, per plate', steps: ['Heat the vegetables in the poaching pot.', 'Finish in a pan with a bit of oil, salt and pepper.', 'Every plate must get a bit of each: carrot, cauliflower and broccoli, 3 pieces of each, about 120 g in total.'] }
      ],
      contains: [],
      check: []
    },
    {
      id: 'gravy', art: 'gravy', no: '69', kind: 'batch', forLine: 'For schnitzels, rissoles, mash and poutine', name: 'Gravy', short: 'Gravy',
      avc: 'BASE GRAVY BATCH (1LT)',
      yield: 'Batch: 10 L.',
      ingredients: [
        { q: '1.2 kg', name: 'Rich brown gravy mix' },
        { q: '10 L', name: 'Water' }
      ],
      sections: [
        { title: 'Method', steps: ['Bring the water to the boil.', 'Make a slurry with the gravy powder.', 'Mix the slurry into the boiling water.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Gluten free, dairy free and vegan. Check the gravy mix label when a new batch of powder comes in.'
    },
    {
      id: 'mash', art: 'mash', no: '70', kind: 'batch', forLine: 'For the rissoles and other plates', name: 'Potato Mash', short: 'Mash',
      yield: 'The same mash on every plate across the menu. Main plates: 150 g. Bought in, Farm Frites butter mash.',
      ingredients: [
        { q: '150 g', name: 'Potato mash', note: 'Farm Frites, bought in', tags: ['Milk?'] }
      ],
      sections: [
        { title: 'Method', steps: ['Steam off the mash in a flat tray for 20 min.'] }
      ],
      contains: [],
      check: [{ allergen: 'Milk', from: 'butter mash' }],
      labelNote: 'Check the mash label.'
    },
    {
      id: 'spinach-puree', done: true, no: '71', kind: 'batch', forLine: 'For the pork belly', name: 'Spinach Purée', short: 'Spinach purée', art: 'spinach-puree',
      yield: 'Batch: 1 kg spinach. A serve is 50 ml, a wavy squiggle across the plate. Makes about 1.2 L, about 24 serves.',
      ingredients: [
        { q: '1 kg', name: 'Spinach' },
        { q: '700 ml', name: 'Cooking cream', tags: ['Milk'] },
        { q: '100 g', name: 'Salted butter', tags: ['Milk'] },
        { q: '10 g', name: 'Table salt' },
        { q: '5 g', name: 'Cracked black pepper' },
        { q: '2 g', name: 'Nutmeg' },
        { q: '15 ml', name: 'Lemon juice', note: 'added after blending and cooling' }
      ],
      sections: [
        { title: 'Method', steps: ['Quickly blanch the spinach in a pot of water for 2 min.', 'Put it straight into ice water to keep the green.', 'Squeeze out the excess liquid.', 'Blend with the cooking cream, salted butter, salt, cracked black pepper and nutmeg until smooth.', 'Let the purée cool right down.', 'Stir in the lemon juice only once the purée is blended and cooled. Added warm, the acid can split the cream.'] }
      ],
      contains: [{ allergen: 'Milk', from: 'cooking cream and butter' }],
      check: [],
      labelNote: 'Check the cooking cream and butter labels.'
    },
    {
      id: 'red-wine-jus', art: 'red-wine-jus', no: '72', kind: 'batch', forLine: 'For the pork belly', name: 'Red Wine Jus', short: 'Red wine jus',
      yield: 'Batch: 5 L.',
      ingredients: [
        { q: '750 g', name: 'Red wine jus powder', tags: ['Soy'] },
        { q: '5 L', name: 'Water' }
      ],
      sections: [
        { title: 'Method', steps: ['Bring the water to the boil.', 'Make a slurry with the jus powder.', 'Mix the slurry into the boiling water.'] }
      ],
      contains: [{ allergen: 'Soy', from: 'jus powder' }],
      check: [],
      labelNote: 'Gluten free. Check the jus powder label when a new batch of powder comes in.'
    },
    {
      id: 'fried-onions', done: true, no: '73', kind: 'batch', forLine: 'For the pork belly', name: 'Fried Onions', short: 'Fried onions', art: 'fried-onions',
      yield: 'Batch: 8 white onions and 400 g cornflour. Makes about 3 kg.',
      ingredients: [
        { q: '8', name: 'White onions', note: 'sliced' },
        { q: '400 g', name: 'Cornflour' }
      ],
      sections: [
        { title: 'Method', steps: ['Slice the white onions.', 'Coat the sliced onions in the cornflour.', 'Deep fry at 175 °C until crispy.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the cornflour label.'
    },
    {
      id: 'carbonara-sauce', no: '74', kind: 'batch', forLine: 'For the carbonara', name: 'Creamy Garlic Sauce', short: 'Creamy garlic sauce', art: 'carbonara-sauce',
      yield: 'Batch: 10 L of cream. This is the carbonara sauce, 400 ml per plate.',
      ingredients: [
        { q: '10 L', name: 'Cream', tags: ['Milk'] },
        { q: '500 g', name: 'Crushed garlic' },
        { q: '1 L', name: 'White wine' },
        { q: '25 g', name: 'Table salt' }
      ],
      sections: [
        { title: 'Method', steps: ['[Method to confirm]'] }
      ],
      contains: [{ allergen: 'Milk', from: 'cream' }],
      check: [],
      labelNote: 'Check the cream label.'
    },
    {
      id: 'fettuccine', no: '75', kind: 'batch', forLine: 'For the carbonara', name: 'Fettuccine, Batch Cooked', short: 'Fettuccine', art: 'fettuccine',
      yield: 'Batch: 5 kg fettuccine. Portions of 250 g cooked fettuccine, each wrapped in glad wrap.',
      ingredients: [
        { q: '5 kg', name: 'Fettuccine', note: 'one batch [dried or cooked weight and product to confirm]', tags: ['Gluten'] }
      ],
      sections: [
        { title: 'Method', steps: ['Cook the 5 kg batch of fettuccine for 8 min.', 'Portion it after cooking: 250 g per portion, each wrapped in glad wrap.', '[Storage and how it is reheated to confirm]'] }
      ],
      contains: [{ allergen: 'Gluten', from: 'fettuccine' }],
      check: [],
      labelNote: 'Check the fettuccine label for egg.'
    },
    {
      id: 'mushroom-sauce', no: '76', kind: 'batch', forLine: 'For the Grill Maiden\'s Board', name: 'Mushroom Sauce', short: 'Mushroom sauce', art: 'mushroom-sauce',
      yield: 'Batch: 5 L. One portion of sauce is 50 ml.',
      ingredients: [
        { q: '960 g', name: 'Mushrooms' },
        { q: '600 g', name: 'Gravy powder' },
        { q: '80 g', name: 'Crushed garlic' },
        { q: '1', name: 'Large onion' },
        { q: '400 ml', name: 'Cooking cream', tags: ['Milk'] },
        { q: '3', name: 'Thyme sprigs' },
        { q: '80 ml', name: 'Red cooking wine' },
        { q: '2 g', name: 'Cracked black pepper' },
        { q: '5 g', name: 'Table salt' },
        { q: '200 ml', name: 'Water', note: 'for the slurry' }
      ],
      sections: [
        { title: 'Method', steps: [
          'Cook off the ingredients individually: the mushrooms, onion, garlic and thyme.',
          'Deglaze with the red cooking wine.',
          'Top up with the cooking cream.',
          'Make a slurry with the gravy powder and 200 ml of water, and add it.',
          'Season with the cracked black pepper and table salt. [When to add them to confirm]'
        ] }
      ],
      contains: [{ allergen: 'Milk', from: 'cooking cream' }],
      check: [],
      labelNote: 'Check the gravy powder and cooking cream labels.'
    },
    {
      id: 'diane-sauce', no: '77', kind: 'batch', forLine: 'For the Grill Maiden\'s Board', name: 'Diane Sauce', short: 'Diane sauce', art: 'diane-sauce',
      yield: 'Batch: 5 L. One portion of sauce is 50 ml.',
      ingredients: [
        { q: '1150 g', name: 'Gravy powder' },
        { q: '125 g', name: 'Crushed garlic' },
        { q: '1000 ml', name: 'Red cooking wine' },
        { q: '1 L', name: 'Cooking cream', tags: ['Milk'] },
        { q: '250 ml', name: 'Worcestershire sauce', tags: ['Fish?', 'Gluten?', 'Soy?'] },
        { q: '500 g', name: 'Tomato sauce', link: 'tomato-sauce' },
        { q: '200 ml', name: 'Water', note: 'for the slurry' }
      ],
      sections: [
        { title: 'Method', steps: [
          'Cook off the ingredients individually, starting with the garlic.',
          'Deglaze with the red cooking wine.',
          'Add the Worcestershire sauce and the tomato sauce. [Order to confirm]',
          'Top up with the cooking cream.',
          'Make a slurry with the gravy powder and 200 ml of water, and add it.'
        ] }
      ],
      contains: [{ allergen: 'Milk', from: 'cooking cream' }],
      check: [{ allergen: 'Fish', from: 'Worcestershire sauce' }, { allergen: 'Gluten', from: 'Worcestershire sauce' }, { allergen: 'Soy', from: 'Worcestershire sauce' }],
      labelNote: 'Check the Worcestershire sauce, tomato sauce, gravy powder and cooking cream labels.'
    },
    {
      id: 'wing-flour', done: true, no: '78', kind: 'batch', forLine: 'For the wings', name: 'Szechuan Wing Flour', short: 'Wing flour', art: 'wing-flour',
      yield: 'Batch: 1.15 kg of mix. 50 g per Grill Maiden\'s Board.',
      ingredients: [
        { q: '1000 g', name: 'Cornflour' },
        { q: '150 g', name: 'Szechuan spice seasoning' }
      ],
      sections: [
        { title: 'Method', steps: ['Mix the cornflour and the szechuan spice seasoning together.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the szechuan seasoning label for gluten, soy and sesame.'
    },
    {
      id: 'brisket', no: '79', kind: 'batch', forLine: 'For the Grill Maiden\'s Board, the Taco Board and the Brisket Cob', name: 'Smoked Brisket', short: 'Brisket', art: 'brisket',
      yield: 'Batch: one whole brisket, about 12 kg.',
      ingredients: [
        { q: '1', name: 'Whole beef brisket', note: 'about 12 kg' },
        { q: '[Qty]', name: 'Brisket rub', note: 'house rub [to confirm]' }
      ],
      sections: [
        { title: 'Method', steps: [
          'Slow smoke the brisket to a core of 73 °C.',
          'Wrap it up.',
          'Finish it in the smoker until the core reaches 93 °C.'
        ] },
        { title: 'On the day', steps: ['Grill Maiden\'s Board: 500 g, finished in the kick oven. [Oven setting to confirm]'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the rub label for allergens.'
    },
    {
      id: 'oven-brisket', no: '121', kind: 'batch', forLine: 'Brisket cooked in the oven', name: 'Oven Baked Brisket', short: 'Oven brisket', art: 'oven-brisket',
      yield: 'Per 1/1 GN pan. [Brisket weight per pan to confirm]',
      ingredients: [
        { q: '[Qty]', name: 'Beef brisket' },
        { q: '[Qty]', name: 'Brisket rub', note: 'house rub [to confirm]' }
      ],
      tip: { title: 'On the iCombi', text: 'Steam bake, 70% humidity, 123 °C, 15 hours. Or start the preprogrammed brisket programme.' },
      sections: [
        { title: 'Method', steps: [
          'Rub the brisket all over with the rub.',
          'Put it in a big 1/1 GN gastro pan.',
          'Lay one sheet of baking paper on top.',
          'Wrap the pan in aluminium foil, twice.',
          'Cook in the Rational: steam bake, 70% humidity, 123 °C, 15 hours. Or use the preprogrammed brisket programme.',
          '[Core temperature, resting and slicing to confirm]'
        ] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the rub label for allergens.'
    },
    {
      id: 'ranch', no: '80', kind: 'batch', forLine: 'For the chicken burger', name: 'Ranch', short: 'Ranch', art: 'ranch',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Ranch', note: 'Bought in [product to confirm]', tags: ['Milk?', 'Egg?'] }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [{ allergen: 'Milk', from: 'ranch' }, { allergen: 'Egg', from: 'ranch' }],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'aioli', done: true, no: '81', kind: 'batch', forLine: 'For several dishes', name: 'Garlic Aioli', short: 'Aioli', art: 'aioli',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Aioli', note: 'Oli & Vine garlic aioli, bought in (AVC product).', tags: ['Egg?'] }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [{ allergen: 'Egg', from: 'aioli' }],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'american-cheese-sauce', art: 'american-cheese-sauce', no: '117', kind: 'batch', forLine: 'For the poutine fries', name: 'American Cheese Sauce', short: 'Cheese sauce',
      yield: 'Bought in. No prep. Serve size is on the dish card.',
      ingredients: [
        { q: '1', name: 'American cheese sauce', note: 'bought in', tags: ['Milk'] }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [{ allergen: 'Milk', from: 'cheese sauce' }],
      check: [],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'grated-mozzarella', art: 'grated-mozzarella', no: '118', kind: 'batch', forLine: 'For the poutine fries and the brisket cob', name: 'Grated Mozzarella', short: 'Grated mozzarella',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Grated mozzarella', note: 'bought in', tags: ['Milk'] }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [{ allergen: 'Milk', from: 'mozzarella' }],
      check: [],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'lime-aioli', art: 'lime-aioli', no: '119', kind: 'batch', forLine: 'For the calamari', name: 'Lime Aioli', short: 'Lime aioli',
      yield: 'Bought in. No prep. Serve size is on the dish card.',
      ingredients: [
        { q: '1', name: 'Lime aioli', note: 'bought in', tags: ['Egg?'] }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [{ allergen: 'Egg', from: 'aioli' }],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'tartare', done: true, no: '82', kind: 'batch', forLine: 'For the fish dishes', name: 'Tartare Sauce', short: 'Tartare sauce', art: 'tartare',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Tartare sauce', note: 'Oli & Vine tartare sauce, bought in (AVC product).', tags: ['Egg?'] }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [{ allergen: 'Egg', from: 'tartare sauce' }],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'pizza-sauce', done: true, no: '83', kind: 'batch', forLine: 'For the parmigiana', name: 'Pizza Sauce', short: 'Pizza sauce', art: 'pizza-sauce',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Pizza sauce', note: 'Mutti pizza sauce classica, bought in (AVC product).' }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'tomato-sauce', done: true, no: '84', kind: 'batch', forLine: 'For the fish and chips and the Diane sauce', name: 'Tomato Sauce', short: 'Tomato sauce', art: 'tomato-sauce',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Tomato sauce', note: 'Heinz tomato sauce, gluten free, bought in (AVC product).' }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'green-goddess', done: true, no: '85', kind: 'batch', forLine: 'For the chips salad', name: 'Green Goddess Dressing', short: 'Green goddess dressing', art: 'green-goddess',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Green goddess dressing', note: 'Birch & Waite green goddess dressing, vegan and gluten free, bought in (AVC product).' }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'kids-bolognese', no: '91', kind: 'batch', forLine: 'For the senior and kids bolognese', name: 'Bolognese Sauce', short: 'Bolognese sauce', art: 'kids-bolognese', avc: 'Bolognaise Batch S25',
      yield: 'Batch: about 5 L, half of the 10 kg kitchen sheet. Serve size is on each dish card.',
      ingredients: [
        { q: '500 g', name: 'Brown onions' },
        { q: '250 g', name: 'Garlic, peeled' },
        { q: '2.5 kg', name: 'Pizza sauce', link: 'pizza-sauce' },
        { q: '5 g', name: 'Black pepper, cracked fine' },
        { q: '75 g', name: 'Tomato paste' },
        { q: '75 g', name: 'Caster sugar' },
        { q: '2500 g', name: 'Beef mince, prime 85' },
        { q: '50 g', name: 'Italian mixed herbs' },
        { q: '15 g', name: 'Salt' },
        { q: '250 ml', name: 'Red wine' }
      ],
      sections: [
        { title: 'Method', steps: [
          'Cook the beef mince in a hot pot until coloured.',
          'Remove the beef.',
          'Saute the onion and garlic, add the herbs.',
          'Deglaze with the red wine and reduce.',
          'Put the beef back in the pot.',
          'Add the pizza sauce and the sugar.'
        ] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the supplier labels for allergens, especially the herbs and tomato paste.'
    },
    {
      id: 'tomato-relish', no: '86', kind: 'batch', forLine: 'For the steak sandwich', name: 'Tomato Relish', short: 'Tomato relish', art: 'tomato-relish',
      yield: 'Bought in. No prep. Serve size is on each dish card.',
      ingredients: [
        { q: '1', name: 'Tomato relish', note: 'Bought in [product to confirm]' }
      ],
      sections: [
        { title: 'Method', steps: ['Bought in. No prep.'] }
      ],
      contains: [],
      check: [],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'cob-mix', no: '104', kind: 'batch', forLine: 'For the Brisket Cob', name: 'Cob Loaf Mix', short: 'Cob loaf mix', art: 'cob-mix',
      yield: 'Batch: 5000 ml. 280 ml fills one cob loaf.',
      ingredients: [
        { q: '2 kg', name: 'Sour cream', tags: ['Milk'] },
        { q: '2 kg', name: 'Cream cheese', tags: ['Milk'] },
        { q: '400 g', name: 'Mozzarella', tags: ['Milk'] },
        { q: '1 kg', name: 'Caramelised onion' },
        { q: '1 kg', name: 'Corn kernels' },
        { q: '1 kg', name: 'Sliced mushrooms' },
        { q: '100 g', name: 'Garlic' },
        { q: '10 g', name: 'Salt', note: 'seasoning' },
        { q: '4 g', name: 'Black pepper', note: 'seasoning' }
      ],
      sections: [
        { title: 'Method', steps: [
          'Saute the garlic and mushrooms. Season.',
          'Soften the cream cheese and sour cream, and add.',
          'Add the mozzarella last.',
          'Check the seasoning.'
        ] },
        { title: 'For the bread and service', steps: [
          'Hollow out the Laurent cob loaf. Keep the lid.',
          'Add 280 ml of cob loaf mix. Add about 50 g of grated mozzarella on top.',
          'Oven at 180 °C for 5 min, or until the contents are hot.',
          'Garnish with spring onions.'
        ] }
      ],
      contains: [{ allergen: 'Milk', from: 'sour cream, cream cheese, mozzarella' }],
      check: [],
      labelNote: 'Check the supplier labels for allergens, especially the caramelised onion. The cob loaf itself has gluten (see the Brisket Cob card).'
    },
    {
      id: 'bourbon-bbq-sauce', art: 'bourbon-bbq-sauce', no: '105', kind: 'batch', forLine: 'For the ribs, riblets and smoked boards', name: 'Bourbon BBQ Sauce', short: 'Bourbon BBQ', avc: 'Bourbon BBQ Sauce Batch A25',
      yield: 'Batch: 5 L.',
      ingredients: [
        { q: '4 kg', name: 'Heinz BBQ sauce', note: 'gluten free' },
        { q: '250 g', name: 'Bourbon BBQ dry rub', note: 'Krio Krush', tags: ['Gluten?', 'Soy?'] },
        { q: '1 kg', name: 'Hickory smoked BBQ sauce', note: 'Sunshine', tags: ['Gluten?', 'Soy?'] }
      ],
      sections: [
        { title: 'Method', steps: ['Combine all ingredients.'] }
      ],
      labelNote: 'Check the supplier labels for allergens on the dry rub and the hickory smoked BBQ sauce.'
    },
    {
      id: 'chilli-jam', art: 'chilli-jam', no: '106', kind: 'batch', forLine: 'For the beetroot bites and the pork belly bites', name: 'Chilli Jam', short: 'Chilli jam',
      yield: 'Batch: 2000 g.',
      ingredients: [
        { q: '500 g', name: 'Gochujang', tags: ['Gluten?', 'Soy?'] },
        { q: '1 kg', name: 'Red capsicum' },
        { q: '250 g', name: 'Red chilli' },
        { q: '100 g', name: 'Crushed garlic' },
        { q: '100 g', name: 'Crushed ginger' },
        { q: '150 g', name: 'Caster sugar' },
        { q: '150 ml', name: 'Rice wine vinegar' },
        { q: '20 g', name: 'Salt' }
      ],
      sections: [
        { title: 'Method', steps: ['Roast and blitz the capsicum and chilli.', 'Add all the ingredients to a pot.', '[Add water to the right consistency: rest of the step to confirm]'] }
      ],
      labelNote: 'Check the gochujang label for allergens.'
    },
    {
      id: 'korean-dressing', art: 'korean-dressing', no: '107', kind: 'batch', forLine: 'For the Korean-style cucumber', name: 'Korean Dressing', short: 'Korean dressing',
      yield: 'Batch: 1500 ml.',
      ingredients: [
        { q: '300 g', name: 'Gochujang hot pepper paste', tags: ['Gluten?', 'Soy?'] },
        { q: '300 g', name: 'Caster sugar' },
        { q: '150 ml', name: 'Soy sauce', tags: ['Soy', 'Gluten?'] },
        { q: '200 g', name: 'Crushed ginger' },
        { q: '100 g', name: 'White sesame seeds', tags: ['Sesame'] },
        { q: '300 ml', name: 'Sesame oil', tags: ['Sesame'] },
        { q: '300 ml', name: 'Rice wine vinegar' },
        { q: '0.5 bunch', name: 'Spring onion' }
      ],
      sections: [
        { title: 'Method', steps: ['[Method to confirm]'] }
      ],
      labelNote: 'Check the gochujang and soy sauce labels for allergens.'
    },
    {
      id: 'seed-granola', art: 'seed-granola', no: '108', kind: 'batch', forLine: 'For the honey and maple roasted pumpkin', name: 'Seed Granola', short: 'Seed granola',
      yield: 'Batch: 2000 g.',
      ingredients: [
        { q: '500 g', name: 'Linseeds' },
        { q: '500 g', name: 'Pumpkin seeds (pepitas)' },
        { q: '500 g', name: 'Pine nuts', tags: ['Tree nut?'] },
        { q: '250 g', name: 'Black sesame seeds', tags: ['Sesame'] },
        { q: '250 g', name: 'White sesame seeds', tags: ['Sesame'] },
        { q: '500 g', name: 'Honey' },
        { q: '500 ml', name: 'Canola oil' }
      ],
      sections: [
        { title: 'Method', steps: ['Boil the honey and canola oil until combined.', 'Mix with the seeds in trays.', 'Bake at 120 °C, stirring every 10 minutes.', '[Bake time to confirm]'] }
      ],
      labelNote: 'Check the supplier labels for allergens, especially the pine nuts.'
    },
    {
      id: 'cowboy-candy', art: 'cowboy-candy', no: '109', kind: 'batch', forLine: 'For the riblets and the wings', name: 'Cowboy Candy', short: 'Cowboy candy', aka: 'jalapeno candy jalapeño candy candied jalapeno',
      yield: 'Batch: 1000 g. Also called jalapeño candy.',
      ingredients: [
        { q: '500 ml', name: 'Cider vinegar' },
        { q: '1 kg', name: 'Caster sugar' },
        { q: '20 g', name: 'Salt' },
        { q: '5 g', name: 'Turmeric' },
        { q: '10 g', name: 'Mustard seed' },
        { q: '1 kg', name: 'Jalapeños', note: 'sliced' }
      ],
      sections: [
        { title: 'Method', steps: ['Add all the ingredients except the jalapeños to a pot.', 'Simmer to a syrup consistency.', 'Add the sliced jalapeños.', 'Transfer to containers to cool. Pour over the remaining syrup.'] }
      ],
      labelNote: 'Check the supplier labels for allergens, especially the mustard seed.'
    },
    {
      id: 'beef-cheek-batch', art: 'beef-cheek-batch', no: '110', kind: 'batch', forLine: 'For the beef cheek', name: 'Braised Beef Cheek', short: 'Beef cheek',
      yield: 'Batch: 10 kg raw beef cheeks, red wine braise.',
      ingredients: [
        { q: '10 kg', name: 'Beef cheeks', note: 'raw, untrimmed' },
        { q: '150 ml', name: 'Cooking oil', note: 'high smoke point' },
        { q: '1 kg', name: 'Brown onions', note: 'medium dice' },
        { q: '600 g', name: 'Carrots', note: 'medium dice' },
        { q: '400 g', name: 'Celery sticks', note: 'medium dice' },
        { q: '300 g', name: 'Garlic' },
        { q: '200 g', name: 'Tomato paste' },
        { q: '3 L', name: 'Dry red wine', note: 'shiraz or cabernet, 4 standard bottles' },
        { q: '5 to 6 L', name: 'Dark beef stock', note: 'good quality or glace base, enough to submerge the meat' },
        { q: '1 large bunch', name: 'Fresh thyme' },
        { q: '5 sprigs', name: 'Fresh rosemary' },
        { q: '10 pieces', name: 'Bay leaves', note: 'dried' },
        { q: '1 tablespoon', name: 'Black peppercorns', note: 'whole' }
      ],
      sections: [
        { title: 'Method', steps: ['[Method to confirm]'] }
      ],
      labelNote: 'Check the beef stock label for allergens.'
    },
    {
      id: 'cookie-dough', art: 'cookie-dough', no: '111', kind: 'batch', forLine: 'For the skillet cookie', name: 'Skillet Cookie Dough', short: 'Cookie dough',
      yield: 'Batch: roughly 6.65 kg, portioned into 140 g balls. 15 balls per tub.',
      ingredients: [
        { q: '1.6 kg', name: 'Flour', note: 'sifted', tags: ['Gluten'] },
        { q: '32 g', name: 'Flaky sea salt' },
        { q: '32 g', name: 'Bi-carb soda' },
        { q: '904 g', name: 'Unsalted butter', note: 'for the beurre noisette', tags: ['Milk'] },
        { q: '448 g', name: 'Unsalted butter', note: 'cubed', tags: ['Milk'] },
        { q: '1.6 kg', name: 'Brown sugar' },
        { q: '400 g', name: 'Caster sugar' },
        { q: '8', name: 'Eggs', tags: ['Egg'] },
        { q: '16', name: 'Egg yolks', tags: ['Egg'] },
        { q: '1.36 kg', name: 'Dark chocolate nibs', tags: ['Milk?', 'Soy?'] },
        { q: '80 g', name: 'Vanilla extract' }
      ],
      sections: [
        { title: 'Method', steps: [
          'Place the 904 g butter in a heavy based saucepan over medium heat until it foams, turns a dark colour, smells nutty and the milk solids have fallen to the bottom of the pan. Careful not to burn.',
          'Scrape the butter and milk solids into a bowl and leave to cool.',
          'Once cool, whisk in the 448 g cubed butter gently. It should start to melt but not foam and sizzle, so test with one piece first.',
          'Whisk together the flour, salt and bi-carb in a bowl.',
          'Put the butter in a stand mixer and whisk in the brown sugar and caster sugar until smooth with no lumps.',
          'Add the eggs and yolks gradually, one at a time, whisking between each. Whisk in the vanilla extract.',
          'Change the whisk for the paddle. Add the premixed dry ingredients a third at a time, mixing between each addition. Add the chocolate nibs and mix until all incorporated.',
          'The mix should be very soft at this stage. Cover the large metal bowl in glad wrap and rest and set in the fridge.',
          'Ball the dough into 140 g servings. Wrap each one in glad wrap and place on a tray in a single layer so they do not squash.',
          'Freeze the trays to solidify. Once set, place the balls in ice cream tubs, 15 balls per tub for stocktake.',
          'Defrost 1 tub at a time to keep wastage to a minimum.'
        ] },
        { title: 'Baking and plating (from the printed recipe)', steps: [
          'Spray the cast iron pan with canola spray and press the cookie into the pan slightly so it spreads evenly while baking.',
          'Bake at 190 °C for 9 to 10 minutes.',
          'Set the cast iron pan on a wooden serving board. Quenelle the ice cream on top and drizzle lightly with butterscotch sauce. Dust with icing sugar and serve.'
        ] }
      ],
      labelNote: 'Check the supplier labels for allergens, especially the chocolate nibs.'
    },
    {
      id: 'korean-cucumber', art: 'korean-cucumber', no: '112', kind: 'batch', forLine: 'For the beetroot bites and the pork belly bites', name: 'Korean-Style Cucumber', short: 'Korean cucumber',
      yield: 'Batch: 4 kg sliced cucumbers.',
      ingredients: [
        { q: '4 kg', name: 'Sliced cucumbers' },
        { q: '1500 ml', name: 'Korean dressing', note: 'the whole batch', link: 'korean-dressing' }
      ],
      sections: [
        { title: 'Method', steps: ['[Method to confirm]'] }
      ]
    },
    {
      id: 'spaghetti', art: 'spaghetti', no: '114', kind: 'batch', forLine: 'For the senior and kids bolognese', name: 'Spaghetti', short: 'Spaghetti',
      yield: 'Senior plate: 1.5 portions of 180 g. Kids plate: 120 g.',
      ingredients: [
        { q: '[Qty]', name: 'Spaghetti', tags: ['Gluten'] }
      ],
      sections: [
        { title: 'Method', steps: ['[Method to confirm]'] }
      ],
      labelNote: 'Check the supplier label for allergens.'
    },
    {
      id: 'cowboy-butter', art: 'cowboy-butter', no: '115', kind: 'batch', forLine: 'For the flank steak', name: 'Cowboy Butter', short: 'Cowboy butter',
      yield: 'Batch: 1850 g.',
      ingredients: [
        { q: '1500 g', name: 'Butter', tags: ['Milk'] },
        { q: '350 g', name: 'Bourbon BBQ dry rub', note: 'Krio Krush', tags: ['Gluten?', 'Soy?'] }
      ],
      sections: [
        { title: 'Method', steps: ['Mix the bourbon BBQ dry rub through the butter.', 'Roll the butter and store it in the freezer.', 'When needed, cut portions of about 80 g.'] }
      ],
      contains: [{ allergen: 'Milk', from: 'butter' }],
      labelNote: 'Check the supplier label for allergens on the dry rub.'
    },
    {
      id: 'asian-greens', art: 'asian-greens', no: '116', kind: 'batch', forLine: 'For the barramundi', name: 'Asian Greens', short: 'Asian greens',
      yield: 'Batch: pak choy, gai lan, choy sum and broccolini. One serve is 2 pieces of each.',
      ingredients: [
        { q: '2 pieces', name: 'Pak choy', note: 'per serve' },
        { q: '2 pieces', name: 'Gai lan', note: 'per serve' },
        { q: '2 pieces', name: 'Choy sum', note: 'per serve' },
        { q: '2 pieces', name: 'Broccolini', note: 'per serve' }
      ],
      sections: [
        { title: 'Prep', steps: ['Cut the stems off the pak choy, gai lan and choy sum.', 'Trim the bottom of the broccolini.', 'Place the greens and the broccolini in a perforated steam tray.', 'Steam for 2 min.', 'Shock in ice water.', '[Draining and storage to confirm]'] }
      ],
      contains: [],
      check: []
    }
  ]
};
