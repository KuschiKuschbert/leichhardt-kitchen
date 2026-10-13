/*
  Leichhardt Kitchen Recipe Book: recipe data
  ===========================================
  This is the only file you need to edit to add or change a recipe.

  Each recipe has:
    id         short unique name, no spaces (used in links), e.g. "laksa"
    no         card number, matching the printed cards, e.g. "06"
    kind       "main", "side", "dessert", "batch" or "component"
    forLine    where it belongs, e.g. "Plate" or "For the barramundi"
    name       the name staff see
    avc        optional: the recipe's name in AVC Live, so a search for it finds the card
    yield      the portion or batch line under the name
    art        which drawing to use in The Pass view (see js/art.js), or leave it out
    ingredients: list of { q: quantity, name, link: id of another recipe (makes it tappable),
                 note, tags: allergens in this ingredient, add "?" for "may contain" }
    pins       (plated dishes, The Pass view) where each part sits on the plate drawing:
               { label, x, y (percent across and down), link or tags, note }
    sections   list of { title, steps: [ ... ] }
    contains   allergens it definitely has: { allergen, from }
    check      allergens it may have, so check the label: { allergen, from }
               Leave contains and check out and the book works them out from the ingredient tags.
    labelNote  one line about labels to check
    tip        optional box, e.g. iCombi settings: { title, text }
    safety     optional orange warning: { title, text }
    diagram    optional technique drawing id (see js/art.js), e.g. "corn-cut"

  Write anything not confirmed yet in [square brackets] so it shows as a placeholder.

  Batch recipes that are not in the book yet: give the ingredient a link anyway, e.g. link: 'gravy'.
  It shows as "Card to come", and every dish that uses it is marked "Allergens incomplete" and left
  out of the Free from filter. Add a recipe with id: 'gravy' later and the links and allergens switch on.

  Quantities for cards 13 onward come from the AVC Live costings (Spring 26). Costs stay in AVC.
*/
window.LK_DATA = {
  updated: '14 October 2026',
  allergens: ['Gluten', 'Milk', 'Egg', 'Soy', 'Peanut', 'Fish', 'Crustacean', 'Sesame'],
  recipes: [
    {
      id: 'burger', no: '02', kind: 'main', forLine: 'Plate', name: 'Chicken Burger', art: 'burger', avc: 'Ranch Chicken Burger Complete S26',
      yield: 'Per plate. Thigh and ranch bought in.',
      ingredients: [
        { q: '1', name: 'Burger bun', note: 'milk bun', tags: ['Gluten', 'Milk'] },
        { q: '1', name: 'Crumbed chicken thigh', note: 'bought in, 170 g', tags: ['Gluten'] },
        { q: '1 slice', name: 'Sliced cheese', tags: ['Milk'] },
        { q: '100 g', name: 'Ranch', note: 'bought in, across both layers', tags: ['Milk', 'Egg'] },
        { q: '[Qty]', name: 'Oak leaf' },
        { q: '30 g', name: 'Tomato' },
        { q: '150 g', name: 'Chips' }
      ],
      pins: [
        { label: 'Burger', x: 59.4, y: 35.8, tags: ['Gluten', 'Milk', 'Egg', 'Soy?'], note: 'Bottom to top: bun, ranch, oak leaf, tomato, crumbed thigh with sliced cheese, ranch, bun.' },
        { label: 'Chips', x: 28.3, y: 73.6, tags: [], note: 'In the fryer, as current. On the side.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Deep-fry the bought-in crumbed thigh until golden brown.', 'Probe the thigh: core 75 °C before it goes to the pass.', 'Chips in the fryer, as current.'] },
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'Ranch.', 'Oak leaf.', 'Tomato.', 'Chicken thigh, sliced cheese on top.', 'Ranch.', 'Bun top.', 'Chips on the side.'] }
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
        { q: '[Qty]', name: 'Mash', tags: ['Milk'] },
        { q: '[Qty]', name: 'Peas' },
        { q: '[Qty]', name: 'Gravy', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Garnish' }
      ],
      pins: [
        { label: 'Gravy', x: 59.4, y: 43.4, tags: ['Gluten?'], note: 'Over the top.' },
        { label: 'Pie', x: 69.8, y: 59.4, tags: ['Gluten', 'Milk?'], note: '250 g beef pie mix, lid on loose. Probe the centre: 75 °C.' },
        { label: 'Peas', x: 83.0, y: 69.8, tags: [], note: 'On top and to the side.' },
        { label: 'Mash', x: 22.6, y: 58.5, tags: ['Milk'], note: 'The pie sits half on it.' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Fill the pie shell with 250 g beef pie mix. Lid on, loose.', 'Bake.', 'Probe the centre before service: 75 °C.'] },
        { title: 'Plating', steps: ['Mash on the plate.', 'Pie sits half on the mash, lid loose on top.', 'Peas on top and to the side.', 'Gravy over the top.', 'Garnish.'] }
      ],
      contains: [{ allergen: 'Gluten', from: 'pastry, Guinness (barley), possibly the gravy' }, { allergen: 'Milk', from: 'mash, likely the pastry' }],
      check: []
    },
    {
      id: 'barra', no: '04', kind: 'main', forLine: 'Plate', name: 'Barramundi', art: 'barra',
      yield: 'Per plate. 180 g rice, 160 ml laksa, charred greens, barra on top.',
      ingredients: [
        { q: '[Portion]', name: 'Barramundi', note: 'as current', tags: ['Fish'] },
        { q: '180 g', name: 'Steamed rice', link: 'rice' },
        { q: '160 ml', name: 'Coconut laksa', link: 'laksa' },
        { q: '[Qty]', name: 'Asian greens', note: 'bok choy, choy sum, kai lan' },
        { q: '[Qty]', name: 'Sesame oil', tags: ['Sesame'] }
      ],
      pins: [
        { label: 'Barramundi', x: 46.2, y: 46.2, tags: ['Fish'], note: 'Cook as current. Probe: core 63 °C. On top of the greens.' },
        { label: 'Greens', x: 59.4, y: 59.4, tags: ['Sesame'], note: 'Quick blanch to order, sesame oil, char in a pan. On the rice.' },
        { label: 'Coconut laksa', x: 77.4, y: 35.8, link: 'laksa' },
        { label: 'Steamed rice', x: 42.5, y: 68.9, link: 'rice' }
      ],
      sections: [
        { title: 'Prep: Asian greens', steps: ['Quickly wash the bok choy, choy sum and kai lan.', 'Hold in a prep bain.'] },
        { title: 'Cooking', steps: ['Cook the barra as current.', 'Probe: core 63 °C before the pass.', 'Greens to order: quick blanch in boiling water.', 'Sesame oil, then char in a pan.', 'Heat the laksa through.'] },
        { title: 'Plating', steps: ['180 g steamed rice.', '160 ml laksa over the rice and a bit around.', 'Charred greens on the rice.', 'Barra on top of the greens.'] }
      ],
      contains: [{ allergen: 'Fish', from: 'barra' }, { allergen: 'Sesame', from: 'sesame oil' }],
      check: [],
      labelNote: 'Check the laksa paste and stock labels.'
    },
    {
      id: 'rice', no: '05', kind: 'batch', forLine: 'For the barramundi', name: 'Steamed Rice', short: 'Rice', art: 'rice',
      yield: 'Batch: 2 kg raw rice. 180 g per plate.',
      ingredients: [
        { q: '2 kg', name: 'Rice' },
        { q: '3.8 L', name: 'Water' },
        { q: '1 tbsp', name: 'Chicken stock', tags: ['Gluten?', 'Soy?'] },
        { q: '5', name: 'Bay leaves' }
      ],
      sections: [
        { title: 'Method', steps: ['Wash the rice 3 times until the water runs clear.', 'Spread the rice in a shallow GN pan. Add the water, chicken stock and bay leaves.', 'Steam 25 min.', 'Check the rice. It must not be too soft. If it needs more, steam on in 2 min steps, checking each time.'] }
      ],
      contains: [],
      check: [{ allergen: 'Gluten', from: 'chicken stock' }, { allergen: 'Soy', from: 'chicken stock' }],
      labelNote: 'Stock powders can also carry celery. Check the label.',
      tip: { title: 'On the iCombi', text: 'Steam mode, 100 °C, 25 min. Save it as a programme called RICE using the programming guide.' }
    },
    {
      id: 'laksa', no: '06', kind: 'batch', forLine: 'For the barramundi', name: 'Coconut Laksa', short: 'Laksa', art: 'laksa',
      yield: 'Batch: about 2.4 L, roughly 15 serves at 160 ml.',
      ingredients: [
        { q: '250 g', name: 'Laksa paste', tags: ['Crustacean?', 'Peanut?', 'Soy?'] },
        { q: '2000 ml', name: 'Coconut cream' },
        { q: '20 g', name: 'Palm sugar' },
        { q: '50 ml', name: 'Lime juice' },
        { q: '100 ml', name: 'Fish sauce', tags: ['Fish'] }
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
      yield: 'Full serve 600 g ribs, half 300 g. Both get 150 g new slaw and 5 corn ribs.',
      ingredients: [
        { q: '600 g or 300 g', name: 'Pork ribs', note: 'full or half serve, Barkers Creek, bought in' },
        { q: '150 g', name: 'New slaw', link: 'slaw' },
        { q: '5', name: 'Corn ribs', link: 'corn' }
      ],
      pins: [
        { label: 'Pork ribs', x: 46.2, y: 35.8, tags: [], note: 'Full serve 600 g, half 300 g, cooked as current. Check the glaze and seasoning labels.' },
        { label: 'Corn ribs', x: 75.5, y: 62.3, link: 'corn' },
        { label: 'New slaw', x: 34.9, y: 73.6, link: 'slaw' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Cook the pork ribs as current.', 'Corn ribs: steam, char and cut.', 'Slaw: dressed base from the prep fridge.'] },
        { title: 'Plating', steps: ['Pork ribs: 600 g full serve or 300 g half serve.', '150 g new slaw, same for both serves.', '5 corn ribs, criss-cross stacked, same for both serves.'] }
      ],
      contains: [], check: [],
      labelNote: 'Check the rib glaze and seasoning labels as current.'
    },
    {
      id: 'corn', no: '08', kind: 'component', forLine: 'For the new pork ribs', name: 'Corn Ribs', short: 'Corn ribs', art: 'corn',
      yield: 'One cob makes 8 corn ribs; 5 per serve.',
      ingredients: [
        { q: '1 cob', name: 'Corn', note: 'makes 8 corn ribs' },
        { q: '5', name: 'Corn ribs per serve' }
      ],
      sections: [
        { title: 'Method', steps: ['Steam the whole cobs 12 min, then char on the grill until well charred.', 'Cut each cob in half across the middle.', 'Cut each half top to bottom through the middle, then again, to make quarters.', 'Trim the hard centre off each quarter. 4 ribs per half, 8 per cob.'] },
        { title: 'Plating', steps: ['5 per plate, criss-cross stacked.'] }
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
        { q: '[Qty]', name: 'Aioli', note: 'for service', tags: ['Egg'] },
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
        { q: '1 scoop', name: 'Ice cream', tags: ['Milk'] }
      ],
      pins: [
        { label: 'Snickers rolls', x: 44.3, y: 45.3, tags: ['Peanut', 'Milk', 'Soy', 'Egg', 'Gluten'], note: '3 small Snickers in spring roll wrappers, criss-cross stacked.' },
        { label: 'Ice cream', x: 74.5, y: 71.7, tags: ['Milk'], note: '1 scoop.' }
      ],
      sections: [
        { title: 'Prep', steps: ['Wrap each Snickers, ends tucked in. Seal the top edge with a little water.'] },
        { title: 'Cooking', steps: ['Deep-fry in the low temp fryer until golden.'] },
        { title: 'Plating', steps: ['Criss-cross stack the 3 rolls.', 'Add 1 scoop of ice cream.'] }
      ],
      contains: [{ allergen: 'Peanut', from: 'Snickers' }, { allergen: 'Milk', from: 'Snickers, ice cream' }, { allergen: 'Soy', from: 'Snickers' }, { allergen: 'Egg', from: 'Snickers' }, { allergen: 'Gluten', from: 'spring roll wrappers' }],
      check: []
    },
    {
      id: 'butterscotch', no: '11', kind: 'batch', forLine: 'For the skillet cookie', name: 'Butterscotch Sauce', short: 'Butterscotch', art: 'butterscotch',
      yield: 'Batch: roughly 500 g.',
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
      yield: 'Per plate. 300 g cookie, ice cream, butterscotch sauce.',
      ingredients: [
        { q: '300 g', name: 'Skillet cookie dough', link: 'cookie-dough' },
        { q: '80 g', name: 'Vanilla ice cream', tags: ['Milk'] },
        { q: '[Amount]', name: 'Butterscotch sauce', link: 'butterscotch' }
      ],
      pins: [
        { label: 'Butterscotch sauce', x: 50, y: 42, link: 'butterscotch' }
      ],
      sections: [
        { title: 'Cooking', steps: ['[Bake temperature and time]'] },
        { title: 'Plating', steps: ['[How the butterscotch goes on]'] }
      ],
      contains: [{ allergen: 'Milk', from: 'ice cream' }], check: [],
      labelNote: 'Check the ice cream label.'
    },
    /* ---------- From the AVC Live costings, Spring 26 ---------- */

    /* Steaks */
    {
      id: 'eye-fillet', no: '13', kind: 'main', forLine: 'Plate', name: '180 g Eye Fillet', avc: '180g Eye Fillet S26',
      yield: 'Per plate. Mushroom sauce, chips and salad.',
      ingredients: [
        { q: '180 g', name: 'Eye fillet', note: 'grass fed' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '70 ml', name: 'Mushroom sauce', link: 'mushroom-sauce' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ]
    },
    {
      id: 'rump-250', no: '14', kind: 'main', forLine: 'Plate', name: '250 g Rump', avc: '250G Rump S26',
      yield: 'Per plate. Mushroom sauce, chips and salad.',
      ingredients: [
        { q: '250 g', name: 'Rump', note: 'grain fed MB1' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '80 ml', name: 'Mushroom sauce', link: 'mushroom-sauce' },
        { q: '1.1 portions', name: 'Chips and salad', link: 'chips-salad' }
      ]
    },
    {
      id: 'rib-fillet', no: '15', kind: 'main', forLine: 'Plate', name: '300 g Rib Fillet', avc: '300G Rib Fillet S26',
      yield: 'Per plate. Mushroom sauce, chips and salad.',
      ingredients: [
        { q: '300 g', name: 'Rib fillet', note: 'grain fed MB1' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '70 ml', name: 'Mushroom sauce', link: 'mushroom-sauce' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ]
    },
    {
      id: 'rump-500', no: '16', kind: 'main', forLine: 'Plate', name: '500 g Rump', avc: '500G Rump S26',
      yield: 'Per plate. Mushroom sauce, chips and salad.',
      ingredients: [
        { q: '500 g', name: 'Rump', note: 'grain fed MB1' },
        { q: '1 g', name: 'Sea salt flakes', note: 'Maldon' },
        { q: '70 ml', name: 'Mushroom sauce', link: 'mushroom-sauce' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ]
    },
    {
      id: 'flank', no: '17', kind: 'main', forLine: 'Plate', name: '350 g Flank Steak', avc: '350g Flank, cowboy butter, chips and salad',
      yield: 'Per plate. Cowboy butter, chips and salad.',
      ingredients: [
        { q: '350 g', name: 'Flank steak' },
        { q: '80 g', name: 'Cowboy butter', link: 'cowboy-butter', tags: ['Milk'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ]
    },

    /* Schnitzels */
    {
      id: 'schnitzel-french', no: '18', kind: 'main', forLine: 'Plate', name: 'Chicken Schnitzel French', avc: 'Chicken Schnitzel French S26',
      yield: 'Per plate. French topper, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'hand cut, 340 to 380 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '1 portion', name: 'French parmi topper', link: 'french-topper' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'schnitzel-mexican', no: '19', kind: 'main', forLine: 'Plate', name: 'Chicken Schnitzel Mexican', avc: 'Chicken Schnitzle Mexican S26',
      yield: 'Per plate. Mexican topper, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'double butterfly panko, 350 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '1 portion', name: 'Mexican topper', link: 'mexican-topper' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'schnitzel-americana', no: '20', kind: 'main', forLine: 'Plate', name: 'Chicken Schnitzel Americana', avc: 'Chicken Schnitzel Americana S26',
      yield: 'Per plate. Americana topper, chips and salad.',
      ingredients: [
        { q: '1', name: 'Chicken schnitzel', note: 'double butterfly panko, 350 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '½ portion', name: 'Americana topper', link: 'americana-topper' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'beef-schnitzel', no: '21', kind: 'main', forLine: 'Plate', name: 'Beef Schnitzel', avc: 'Beef Schnitzel S26',
      yield: 'Per plate. Gravy, lemon, chips and salad.',
      ingredients: [
        { q: '300 g', name: 'Beef schnitzel', note: '290 to 310 g, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '20 g', name: 'Lemon' },
        { q: '60 ml', name: 'Gravy', link: 'gravy' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      labelNote: 'Check the schnitzel label.'
    },

    /* Burgers and sandwiches */
    {
      id: 'smash', no: '22', kind: 'main', forLine: 'Plate', name: 'Smash Burger', art: 'burger', avc: 'Smash Burger S26',
      yield: 'Per plate. 180 g patty, two cheese slices, chips.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '180 g', name: 'Smash patty', link: 'smash-patty' },
        { q: '2 slices', name: 'Burger cheese', tags: ['Milk'] },
        { q: '20 g', name: 'Bread and butter pickles' },
        { q: '20 ml', name: 'American mustard' },
        { q: '40 ml', name: 'Tomato ketchup' },
        { q: '[Qty]', name: 'Oak leaf lettuce' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' }
      ],
      labelNote: 'Check the bun label.'
    },
    {
      id: 'oz-smash', no: '23', kind: 'main', forLine: 'Plate', name: 'The OZ Smash Burger', art: 'burger', avc: 'The OZ Smash Burger S26',
      yield: 'Per plate. 180 g patty, bacon, beetroot, half a chips portion.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '180 g', name: 'Smash patty', link: 'smash-patty' },
        { q: '1 slice', name: 'Burger cheese', tags: ['Milk'] },
        { q: '90 g', name: 'Shortcut bacon' },
        { q: '50 g', name: 'Sliced beetroot' },
        { q: '50 g', name: 'Tomato' },
        { q: '10 g', name: 'Red onion' },
        { q: '10 g', name: 'Bread and butter pickles' },
        { q: '40 ml', name: 'Tomato ketchup' },
        { q: '[Qty]', name: 'Oak leaf lettuce' },
        { q: '½ portion', name: 'Chips', note: 'of the 200 g raw portion' }
      ],
      labelNote: 'Check the bun and bacon labels.'
    },
    {
      id: 'fish-burger', no: '24', kind: 'main', forLine: 'Plate', name: 'Fish Burger', art: 'burger', avc: 'Fish Burger S26',
      yield: 'Per plate. 180 g beer-battered blue grenadier, chips.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '180 g', name: 'Blue grenadier fillet', note: 'skinless, MSC', tags: ['Fish'] },
        { q: '50 ml', name: 'Beer batter', link: 'beer-batter', tags: ['Gluten'] },
        { q: '70 ml', name: 'Tartare sauce', note: 'bought in', tags: ['Egg', 'Soy?'] },
        { q: '[Qty]', name: 'Green oak lettuce' },
        { q: '50 g', name: 'Tomato' },
        { q: '50 g', name: 'Red onion' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' }
      ],
      labelNote: 'Check the bun and tartare labels.'
    },
    {
      id: 'chickpea-burger', no: '25', kind: 'main', forLine: 'Plate', name: 'Chickpea Mushroom Burger', art: 'burger', avc: 'Chickpea Mushroom Burger S26',
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
      labelNote: 'Check the bun, falafel and aioli labels.'
    },
    {
      id: 'steak-sandwich', no: '26', kind: 'main', forLine: 'Plate', name: 'Steak Sandwich', avc: 'Steak sandwich S26',
      yield: 'Per plate. 150 g topside, bacon, egg, chips.',
      ingredients: [
        { q: '1', name: 'Turkish roll', note: 'oval, 130 g', tags: ['Gluten', 'Sesame?', 'Soy?'] },
        { q: '150 g', name: 'Topside steak' },
        { q: '90 g', name: 'Shortcut bacon' },
        { q: '1', name: 'Egg', tags: ['Egg'] },
        { q: '30 g', name: 'Caramelised onion relish' },
        { q: '50 ml', name: 'Smokey BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'Baby cos' },
        { q: '50 g', name: 'Tomato' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' }
      ],
      labelNote: 'Check the roll, BBQ sauce, relish and bacon labels.'
    },

    /* Other mains */
    {
      id: 'lamb-rissoles', no: '27', kind: 'main', forLine: 'Plate', name: 'Lamb Rissoles', avc: 'Lamb Rissoles FULL S26',
      yield: 'Per plate. 3 rissoles, mash, veg, onion rings, gravy.',
      ingredients: [
        { q: '1 serve', name: 'Lamb rissoles', note: '240 g, 3 rissoles', link: 'rissole-mix' },
        { q: '150 g', name: 'Potato mash', note: 'Farm Frites, bought in', tags: ['Milk?'] },
        { q: '0.6 portion', name: 'Side veg', link: 'side-veg' },
        { q: '80 g', name: 'Tempura onion rings', note: 'bought in', tags: ['Gluten', 'Egg?', 'Soy?'] },
        { q: '50 ml', name: 'Gravy', link: 'gravy' }
      ],
      labelNote: 'Check the mash and onion ring labels.'
    },
    {
      id: 'vegan-rissoles', no: '28', kind: 'main', forLine: 'Plate', name: 'Vegan Rissoles', avc: 'Vegan Rissoles Full S26',
      yield: 'Per plate. 3 beetroot falafel, mash, veg.',
      ingredients: [
        { q: '3', name: 'Beetroot falafel', note: '40 g each, plant based, bought in', tags: ['Sesame?', 'Soy?'] },
        { q: '200 g', name: 'Mash', link: 'mash' },
        { q: '1 portion', name: 'Side veg', link: 'side-veg' },
        { q: '1 g', name: 'Table salt' }
      ],
      labelNote: 'Check the falafel label.'
    },
    {
      id: 'pork-belly', no: '29', kind: 'main', forLine: 'Plate', name: 'Pork Belly', avc: 'Pork Belly Main S26',
      yield: 'Per plate. 200 g belly, mash, spinach purée, red wine jus.',
      ingredients: [
        { q: '200 g', name: 'Roasted pork belly', link: 'pork-belly-batch' },
        { q: '5 g', name: 'Table salt' },
        { q: '200 g', name: 'Mash', link: 'mash' },
        { q: '50 ml', name: 'Spinach purée', link: 'spinach-puree' },
        { q: '50 ml', name: 'Red wine jus', link: 'red-wine-jus' }
      ]
    },
    {
      id: 'carbonara', no: '30', kind: 'main', forLine: 'Plate', name: 'Carbonara', avc: 'Carbonara S26',
      yield: 'Per plate. 300 g fettuccine, 400 ml sauce, garlic bread.',
      ingredients: [
        { q: '300 g', name: 'Fettuccine', link: 'fettuccine', tags: ['Gluten'] },
        { q: '400 ml', name: 'Carbonara sauce', link: 'carbonara-sauce' },
        { q: '10 ml', name: 'White cooking wine' },
        { q: '20 g', name: 'Shaved parmesan', tags: ['Milk'] },
        { q: '0.05 bunch', name: 'Chives' },
        { q: '1 piece', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk?', 'Soy?'] }
      ],
      labelNote: 'Check the garlic bread label.'
    },

    /* Share boards */
    {
      id: 'grill-board', no: '31', kind: 'main', forLine: 'Share board', name: "Grill Maiden's Board", avc: "Grill Maiden's Board S26",
      yield: 'Per board. Rump, brisket, wings, sausage, chips, salad, two sauces.',
      ingredients: [
        { q: '250 g', name: 'Rump', note: 'grain fed MB1' },
        { q: '500 g', name: 'Brisket', note: 'grain fed MB2' },
        { q: '400 g', name: 'Chicken middle wings' },
        { q: '50 g', name: 'Wing flour', link: 'wing-flour', tags: ['Gluten?'] },
        { q: '90 g', name: 'Pork Cumberland sausage', note: 'thick', tags: ['Gluten?', 'Soy?'] },
        { q: '1 portion', name: 'Diane sauce', link: 'diane-sauce' },
        { q: '1.5 portions', name: 'Mushroom sauce', link: 'mushroom-sauce' },
        { q: '1.1 portions', name: 'Chips', note: '200 g raw portion' },
        { q: '1', name: 'Side salad', link: 'side-salad' }
      ],
      labelNote: 'Check the sausage label.'
    },
    {
      id: 'taco-board', no: '32', kind: 'main', forLine: 'Share board', name: 'Guacho Taco Share Board', avc: 'Guacho Taco Share Board S26',
      yield: 'Per board. Six tortillas, tenders, brisket, pulled pork, slaw, pico.',
      ingredients: [
        { q: '6', name: 'Flour tortillas', note: '5 inch', tags: ['Gluten', 'Soy?'] },
        { q: '240 g', name: 'Southern-style chicken tenders', note: '60 to 80 g each, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '200 g', name: 'Brisket', note: 'grain fed MB2' },
        { q: '200 g', name: 'Pulled pork', link: 'pulled-pork' },
        { q: '200 g', name: 'Slaw', link: 'slaw' },
        { q: '100 g', name: 'Pico de gallo', link: 'pico' },
        { q: '60 g', name: 'Chunky avocado' },
        { q: '60 ml', name: 'Light sour cream', tags: ['Milk'] }
      ],
      labelNote: 'Check the tortilla and tender labels.'
    },

    /* Seniors */
    {
      id: 'senior-schnitzel', no: '33', kind: 'main', forLine: 'Senior', name: 'Senior Chicken Schnitzel', avc: 'Senior Chicken Schnitzle S26',
      yield: 'Senior plate. Half a schnitzel, gravy, chips and salad.',
      ingredients: [
        { q: '½', name: 'Chicken schnitzel', note: 'half a 350 g double butterfly, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '30 g', name: 'Lemon' },
        { q: '50 ml', name: 'Gravy', link: 'gravy' },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      labelNote: 'Check the schnitzel label.'
    },
    {
      id: 'senior-parmy', no: '34', kind: 'main', forLine: 'Senior', name: 'Senior Parmy', avc: 'senior parmy S26',
      yield: 'Senior plate. Half a schnitzel, sauce, ham, mozzarella, chips and salad.',
      ingredients: [
        { q: '½', name: 'Chicken schnitzel', note: 'half a 350 g double butterfly, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '30 g', name: 'Pizza sauce', note: 'Mutti' },
        { q: '20 g', name: 'Virginian ham', note: 'sliced' },
        { q: '30 g', name: 'Shredded mozzarella', tags: ['Milk'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      labelNote: 'Check the schnitzel and ham labels.'
    },
    {
      id: 'senior-rissoles', no: '35', kind: 'main', forLine: 'Senior', name: 'Senior Lamb Rissoles', avc: 'Lamb Rissoles Senior S26',
      yield: 'Senior plate. 2 rissoles, mash, veg, gravy.',
      ingredients: [
        { q: '2', name: 'Lamb rissoles', note: '0.66 of the 240 g, 3-rissole serve', link: 'rissole-mix' },
        { q: '150 g', name: 'Mash', link: 'mash' },
        { q: '½ portion', name: 'Side veg', link: 'side-veg' },
        { q: '60 ml', name: 'Gravy', link: 'gravy' }
      ]
    },
    {
      id: 'senior-bolognese', no: '36', kind: 'main', forLine: 'Senior', name: 'Senior Spaghetti Bolognese', avc: 'Senior Spaghetti Bolognaise S26',
      yield: 'Senior plate. Spaghetti, 200 g bolognese, garlic bread.',
      ingredients: [
        { q: '1.5 portions', name: 'Spaghetti', note: '180 g portion', link: 'spaghetti', tags: ['Gluten'] },
        { q: '200 g', name: 'Kids bolognese', link: 'kids-bolognese' },
        { q: '10 g', name: 'Shaved parmesan', tags: ['Milk'] },
        { q: '½ piece', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk?', 'Soy?'] }
      ],
      labelNote: 'Check the garlic bread label.'
    },

    /* Sides */
    {
      id: 'side-salad', no: '37', kind: 'side', forLine: 'Side', name: 'Side Salad', avc: 'Side Salad - Fitzys S26',
      yield: 'Per side.',
      ingredients: [
        { q: '40 g', name: 'Mesclun mix' },
        { q: '100 g', name: 'Continental cucumber' },
        { q: '25 g', name: 'Cherry tomatoes', note: 'a tenth of a 250 g punnet' },
        { q: '20 g', name: 'Red onion' },
        { q: '10 g', name: 'Julienne carrot' },
        { q: '10 ml', name: 'French dressing', note: 'gluten free, Masterfoods', tags: ['Egg?', 'Soy?'] }
      ],
      labelNote: 'Check the French dressing label.'
    },
    {
      id: 'wedges', no: '38', kind: 'side', forLine: 'Side', name: 'Wedges', avc: 'Sides - Wedges S26',
      yield: 'Per serve. 400 g wedges, sour cream, sweet chilli.',
      ingredients: [
        { q: '400 g', name: 'Seasoned potato wedges', note: 'McCain, bought in', tags: ['Gluten?', 'Soy?'] },
        { q: '80 ml', name: 'Light sour cream', tags: ['Milk'] },
        { q: '80 ml', name: 'Sweet chilli sauce' }
      ],
      labelNote: 'Check the wedge and sweet chilli labels.'
    },
    {
      id: 'mac-side', no: '39', kind: 'side', forLine: 'Side', name: 'Smoked Mac and Cheese', avc: 'Smoked Mac Side S26',
      yield: 'Per side. 250 g with panko.',
      ingredients: [
        { q: '250 g', name: 'Smoked mac and cheese', link: 'smoked-mac', tags: ['Gluten', 'Milk'] },
        { q: '5 g', name: 'Panko crumbs', tags: ['Gluten'] }
      ]
    },
    {
      id: 'slaw-side', no: '40', kind: 'side', forLine: 'Side', name: 'Slaw Serve', avc: 'Sides - Slaw Serve S26',
      yield: 'Per side. 200 g slaw.',
      ingredients: [
        { q: '200 g', name: 'Slaw', link: 'slaw' },
        { q: '0.05 bunch', name: 'Chives' }
      ]
    },
    {
      id: 'mash-side', no: '41', kind: 'side', forLine: 'Side', name: 'Mash Serve', avc: 'Sides - Mash Serve S26',
      yield: 'Per side. 250 g mash, 60 ml gravy.',
      ingredients: [
        { q: '250 g', name: 'Mash', link: 'mash' },
        { q: '60 ml', name: 'Gravy', link: 'gravy' },
        { q: '0.05 bunch', name: 'Chives' }
      ]
    },
    {
      id: 'greens-side', no: '42', kind: 'side', forLine: 'Side', name: 'Steamed Greens', avc: 'Sides - Steamed Greens Serve S26',
      yield: 'Per side. One portion of side veg.',
      ingredients: [
        { q: '1 portion', name: 'Side veg', link: 'side-veg' }
      ]
    },

    /* Desserts */
    {
      id: 'sticky-toffee', no: '43', kind: 'dessert', forLine: 'Plate', name: 'Sticky Toffee Pudding', avc: 'Sticky Toffee Pudding Complete S26',
      yield: 'Per plate. 150 g pudding, rum butterscotch, honeycomb, ice cream.',
      ingredients: [
        { q: '150 g', name: 'Sticky date pudding', note: 'Country Chef tray, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '100 ml', name: 'Rum butterscotch', link: 'rum-butterscotch', tags: ['Milk'] },
        { q: '50 g', name: 'Honeycomb', link: 'honeycomb' },
        { q: '80 g', name: 'Vanilla ice cream', tags: ['Milk'] }
      ],
      labelNote: 'Check the pudding and ice cream labels.'
    },
    {
      id: 'donut-fries', no: '44', kind: 'dessert', forLine: 'Plate', name: 'Donut Fries', avc: 'Donut Fries S26',
      yield: 'Per serve. 110 g donut fries.',
      ingredients: [
        { q: '110 g', name: 'Donut fries', note: 'funnel fries, bought in', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'] },
        { q: '50 ml', name: 'Maple syrup' },
        { q: '20 g', name: 'Whipped cream', note: 'aerosol', tags: ['Milk'] },
        { q: '3 g', name: 'Ground cinnamon' },
        { q: '5 g', name: 'Icing sugar mix' }
      ],
      labelNote: 'Check the donut fries and maple syrup labels.'
    },

    /* Batch recipes */
    {
      id: 'rissole-mix', no: '45', kind: 'batch', forLine: 'For the lamb rissoles', name: 'Lamb Rissole Mix', short: 'Rissoles', avc: 'Rissoles Batch 5000g A25',
      yield: 'Batch: 5 kg lamb mince. A 240 g serve is 3 rissoles.',
      ingredients: [
        { q: '5 kg', name: 'Lamb mince' },
        { q: '500 g', name: 'Carrots' },
        { q: '500 g', name: 'Brown onions', note: 'large' },
        { q: '100 g', name: 'Crushed garlic' },
        { q: '100 g', name: 'Pork fat' },
        { q: '20 g', name: 'Table salt' },
        { q: '10 g', name: 'Ground white pepper' }
      ]
    }
  ]
};
