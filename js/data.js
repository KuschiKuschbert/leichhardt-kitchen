/*
  Leichhardt Kitchen Recipe Book: recipe data
  ===========================================
  This is the only file you need to edit to add or change a recipe.

  Each recipe has:
    id         short unique name, no spaces (used in links), e.g. "laksa"
    no         card number, matching the printed cards, e.g. "06"
    kind       "main", "snack", "side", "dessert", "batch" or "component"
    forLine    where it belongs, e.g. "Plate" or "For the barramundi"
    name       the name staff see
    avc        optional: the recipe's name in AVC Live, so a search for it finds the card
    menu       optional: how the guest menu describes it (shown on the card, and searchable)
    yield      the portion or batch line under the name
    art        which drawing to use in The Pass view (see js/art.js), or leave it out
    ingredients: list of { q: quantity, name, link: id of another recipe (makes it tappable),
                 note, tags: allergens in this ingredient, add "?" for "may contain" }
    pins       (plated dishes, The Pass view) where each part sits on the plate drawing:
               { label, x, y (percent across and down), side ('left' or 'right' for the label,
               optional), link or tags, note }
    sections   list of { title, steps: [ ... ] }
    contains   allergens it definitely has: { allergen, from }
    check      allergens it may have, so check the label: { allergen, from }
               Leave contains and check out and the book works them out from the ingredient tags.
    labelNote  one line about labels to check
    tip        optional box, e.g. iCombi settings: { title, text }
    safety     optional orange warning: { title, text }
    diagram    optional technique or build drawing id (see js/art.js), e.g. "corn-cut" or "smash-build"

  Write anything not confirmed yet in [square brackets] so it shows as a placeholder.

  Batch recipes that are not in the book yet: give the ingredient a link anyway, e.g. link: 'gravy'.
  It shows as "Card to come", and every dish that uses it is marked "Allergens incomplete" and left
  out of the Free from filter. Add a recipe with id: 'gravy' later and the links and allergens switch on.

  Quantities for cards 13 onward come from the AVC Live costings (Spring 26). Costs stay in AVC.
*/
window.LK_DATA = {
  updated: '15 October 2026',
  allergens: ['Gluten', 'Milk', 'Egg', 'Soy', 'Peanut', 'Tree nut', 'Fish', 'Crustacean', 'Mollusc', 'Sesame'],
  recipes: [
    {
      id: 'burger', no: '02', diagram: 'burger-build', kind: 'main', forLine: 'Plate', name: 'Chicken Burger', art: 'burger', avc: 'Ranch Chicken Burger Complete S26',
      yield: 'Per plate. Thigh and ranch bought in.',
      ingredients: [
        { q: '1', name: 'Burger bun', note: 'milk bun', tags: ['Gluten', 'Milk'] },
        { q: '1', name: 'Crumbed chicken thigh', note: 'bought in, 170 g', tags: ['Gluten'] },
        { q: '1 slice', name: 'Sliced cheese', tags: ['Milk'] },
        { q: '100 g', name: 'Ranch', note: 'bought in, across both layers', tags: ['Milk', 'Egg'] },
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
      yield: 'Per plate. 300 g cookie, ice cream, butterscotch sauce.',
      ingredients: [
        { q: '300 g', name: 'Skillet cookie dough', link: 'cookie-dough' },
        { q: '80 g', name: 'Vanilla ice cream', tags: ['Milk'] },
        { q: 'About 75 ml', name: 'Butterscotch sauce', link: 'butterscotch' }
      ],
      pins: [
        { label: 'Cookie', x: 34.0, y: 58.5, side: 'left', tags: [], note: '300 g dough, baked in the skillet. Card to come.' },
        { label: 'Butterscotch sauce', x: 44.3, y: 41.5, side: 'right', link: 'butterscotch' },
        { label: 'Vanilla ice cream', x: 50.9, y: 51.9, side: 'right', tags: ['Milk'], note: '80 g.' }
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
      yield: 'Per plate. Two smashed patties (180 g), cheese on each, chips.',
      ingredients: [
        { q: '1', name: 'Milk bun', note: 'sliced', tags: ['Gluten', 'Milk', 'Egg?', 'Soy?'] },
        { q: '180 g', name: 'Smash patty', note: '2 patties', link: 'smash-patty' },
        { q: '2 slices', name: 'Burger cheese', note: 'one on each patty', tags: ['Milk'] },
        { q: '20 g', name: 'Bread and butter pickles' },
        { q: '20 ml', name: 'American mustard' },
        { q: '40 ml', name: 'Tomato sauce', note: 'ketchup' },
        { q: '[Qty]', name: 'Oak leaf lettuce' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' }
      ],
      sections: [
        { title: 'Plating, bottom to top', steps: ['Bun base.', 'Smashed patty, cheese on top.', 'Smashed patty, cheese on top.', 'Tomato sauce.', 'American mustard.', 'Pickles.', 'Bun top.', 'Chips on the side.'] }
      ],
      pins: [
        { label: 'Smash burger', x: 60.4, y: 35.8, side: 'right', tags: [], note: 'Milk bun, 2 smashed patties (180 g) with cheese on each, tomato sauce, American mustard, pickles. Card to come.' },
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
        { q: '10 g', name: 'Bread and butter pickles' },
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
        { q: '70 ml', name: 'Tartare sauce', note: 'bought in', tags: ['Egg', 'Soy?'] },
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
      yield: 'Per plate. 150 g topside, cheese, bacon, egg, beetroot relish, aioli, chips, side sauce.',
      ingredients: [
        { q: '1', name: 'Turkish roll', note: 'oval, 130 g', tags: ['Gluten', 'Sesame?', 'Soy?'] },
        { q: '150 g', name: 'Topside steak' },
        { q: '1 slice', name: 'Cheese', tags: ['Milk'] },
        { q: '90 g', name: 'Shortcut bacon' },
        { q: '1', name: 'Egg', tags: ['Egg'] },
        { q: '[Qty]', name: 'Beetroot relish' },
        { q: '[Qty]', name: 'Aioli', note: 'on the top half of the roll', tags: ['Egg'] },
        { q: '1 leaf', name: 'Oak leaf lettuce' },
        { q: '3 slices', name: 'Tomato' },
        { q: '1 portion', name: 'Chips', note: '200 g raw' },
        { q: '[Qty]', name: 'Side sauce of choice', note: 'guest chooses' }
      ],
      sections: [
        { title: 'Cooking', steps: ['Grill the steak to the guest\'s wished doneness.'] },
        { title: 'Plating, bottom to top', steps: ['Turkish roll base.', 'Beetroot relish.', 'Oak lettuce.', '3 slices of tomato.', 'Topside steak.', 'Cheese.', 'Bacon.', 'Egg.', 'Aioli on the top half of the Turkish roll, then close.', 'Chips and a side sauce of choice on the side.'] }
      ],
      pins: [
        { label: 'Steak sandwich', x: 53.8, y: 34.9, side: 'right', tags: [], note: 'Turkish roll, topside, cheese, bacon, egg, beetroot relish, aioli on the top half, oak lettuce, tomato.' },
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
      yield: 'Per plate. 300 g belly, mash, spinach purée, peas, bacon, red wine jus.',
      ingredients: [
        { q: '300 g', name: 'Roasted pork belly', note: 'portioned to 300 g', link: 'pork-belly-batch' },
        { q: '25 ml', name: 'Oil', note: 'for frying the belly' },
        { q: '5 g', name: 'Table salt', note: 'on the crackling' },
        { q: '150 g', name: 'Mash', link: 'mash' },
        { q: '50 ml', name: 'Spinach purée', note: 'a wavy squiggle across the whole plate', link: 'spinach-puree' },
        { q: '80 g', name: 'Peas' },
        { q: '80 g', name: 'Diced bacon', note: 'bacon rasher, diced' },
        { q: '50 ml', name: 'Red wine jus', link: 'red-wine-jus' },
        { q: '40 g', name: 'Fried shallots', note: 'fried onions, made in house', link: 'fried-onions' },
        { q: '[Qty]', name: 'Green garnish', note: 'snow pea tendrils, sliced spring onion, parsley or finely sliced chives' }
      ],
      pins: [
        { label: 'Pork belly', x: 36.8, y: 39.6, side: 'left', tags: [], note: '300 g, roasted. Jus on top.', link: 'pork-belly-batch' },
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
          'Portion the roasted pork belly to 300 g.',
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
          'Finish with 40 g fried shallots and the green garnish.'
        ] }
      ]
    },
    {
      id: 'carbonara', art: 'carbonara', no: '30', kind: 'main', forLine: 'Plate', name: 'Carbonara', avc: 'Carbonara S26',
      menu: 'Classic Pub Carbonara: fettuccine, bacon, cream, parmesan, half a garlic bread.',
      yield: 'Per plate. 300 g fettuccine, 400 ml sauce, garlic bread.',
      ingredients: [
        { q: '300 g', name: 'Fettuccine', link: 'fettuccine', tags: ['Gluten'] },
        { q: '400 ml', name: 'Carbonara sauce', link: 'carbonara-sauce' },
        { q: '10 ml', name: 'White cooking wine' },
        { q: '20 g', name: 'Shaved parmesan', tags: ['Milk'] },
        { q: '0.05 bunch', name: 'Chives' },
        { q: '1 piece', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk?', 'Soy?'] }
      ],
      pins: [
        { label: 'Fettuccine', x: 42.5, y: 52.8, side: 'right', tags: ['Gluten'], note: '300 g with 400 ml carbonara sauce (bacon, cream). Card to come.' },
        { label: 'Parmesan', x: 55.9, y: 37.5, side: 'right', tags: ['Milk'], note: '20 g shaved.' },
        { label: 'Chives', x: 44.3, y: 41.5, side: 'left', tags: [], note: '0.05 bunch.' },
        { label: 'Garlic bread', x: 79.2, y: 71.7, side: 'left', tags: ['Gluten', 'Milk?', 'Soy?'], note: '1 piece, 7 inch.' }
      ],
      labelNote: 'Check the garlic bread label.'
    },

    /* Share boards */
    {
      id: 'grill-board', art: 'grill-board', no: '31', kind: 'main', forLine: 'Share board', name: "Grill Maiden's Board", avc: "Grill Maiden's Board S26",
      menu: 'Grill Maiden\'s Shareboard: 300 g slow-roast brisket, 250 g rump, Cumberland pork sausage, chicken wings, chips and salad, choice of two sauces.',
      yield: 'Per board. Rump, brisket, wings, sausage, chips, salad, two sauces of choice.',
      ingredients: [
        { q: '250 g', name: 'Rump', note: 'grain fed MB1' },
        { q: '500 g', name: 'Brisket', note: 'slow roasted' },
        { q: '400 g', name: 'Chicken middle wings' },
        { q: '50 g', name: 'Wing flour', link: 'wing-flour', tags: ['Gluten?'] },
        { q: '90 g', name: 'Pork Cumberland sausage', note: 'thick', tags: ['Gluten?', 'Soy?'] },
        { q: '1 portion', name: 'Diane sauce', note: 'first sauce of choice, costed as Diane', link: 'diane-sauce' },
        { q: '1.5 portions', name: 'Mushroom sauce', note: 'second sauce of choice, costed as mushroom', link: 'mushroom-sauce' },
        { q: '1.1 portions', name: 'Chips', note: '200 g raw portion' },
        { q: '1', name: 'Side salad', link: 'side-salad' }
      ],
      pins: [
        { label: 'Rump', x: 23.5, y: 28.3, side: 'left', tags: [], note: '250 g.' },
        { label: 'Brisket', x: 52.7, y: 23.4, side: 'left', tags: [], note: '500 g, slow roasted.' },
        { label: 'Chicken wings', x: 29.2, y: 61.2, side: 'right', tags: [], note: '400 g, wing flour.' },
        { label: 'Cumberland sausage', x: 65.8, y: 48.1, side: 'right', tags: ['Gluten?', 'Soy?'], note: '90 g.' },
        { label: 'Chips', x: 50.7, y: 75.7, side: 'left', tags: [], note: '1.1 portions.' },
        { label: 'Side salad', x: 17.9, y: 48.1, side: 'right', link: 'side-salad' },
        { label: 'Sauce of choice', x: 82.1, y: 31.4, side: 'left', tags: [], note: 'Costed as Diane. Card to come.' },
        { label: 'Second sauce', x: 87.0, y: 69.8, side: 'left', tags: [], note: 'Costed as mushroom, 1.5 portions. Card to come.' }
      ],
      labelNote: 'Check the sausage label.'
    },
    {
      id: 'taco-board', art: 'taco-board', no: '32', kind: 'main', forLine: 'Share board', name: 'Guacho Taco Share Board', avc: 'Guacho Taco Share Board S26',
      menu: 'Guacho Taco Shareboard: pulled pork, beef brisket, southern-style chicken tenders, pico de gallo, sour cream, avocado, six tortillas, slaw, corn tostadas.',
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
      pins: [
        { label: 'Flour tortillas', x: 13.0, y: 22.4, side: 'right', tags: ['Gluten', 'Soy?'], note: '6, 5 inch.' },
        { label: 'Chicken tenders', x: 54.0, y: 30.4, side: 'left', tags: ['Gluten', 'Egg?', 'Milk?', 'Soy?'], note: '240 g, southern style.' },
        { label: 'Brisket', x: 77.4, y: 28.3, side: 'right', tags: [], note: '200 g.' },
        { label: 'Pulled pork', x: 24.8, y: 65.1, side: 'left', tags: [], note: '200 g. Card to come.' },
        { label: 'Slaw', x: 49.1, y: 66.0, side: 'left', link: 'slaw' },
        { label: 'Pico de gallo', x: 74.5, y: 57.5, side: 'left', tags: [], note: '100 g. Card to come.' },
        { label: 'Avocado', x: 86.8, y: 67.7, side: 'left', tags: [], note: '60 g chunky.' },
        { label: 'Sour cream', x: 70.8, y: 76.4, side: 'left', tags: ['Milk'], note: '60 ml.' }
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
        { q: '30 g', name: 'Pizza sauce', note: 'Mutti; Napoli on the menu' },
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
        { q: '½ piece', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk?', 'Soy?'] }
      ],
      pins: [
        { label: 'Spaghetti', x: 37.7, y: 58.5, side: 'left', tags: ['Gluten'], note: '1.5 portions. Card to come.' },
        { label: 'Kids bolognese', x: 54.9, y: 50.1, side: 'right', tags: [], note: '200 g. Card to come.' },
        { label: 'Parmesan', x: 43.2, y: 42.5, side: 'left', tags: ['Milk'], note: '10 g shaved.' },
        { label: 'Garlic bread', x: 78.3, y: 71.7, side: 'left', tags: ['Gluten', 'Milk?', 'Soy?'], note: 'Half piece.' }
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
      id: 'greens-side', art: 'greens-side', no: '42', kind: 'side', forLine: 'Side', name: 'Steamed Seasonal Vegetables', avc: 'Sides - Steamed Greens Serve S26',
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
      id: 'rissole-mix', no: '45', kind: 'batch', forLine: 'For the lamb rissoles', name: 'Lamb Rissole Mix', short: 'Rissoles', art: 'rissole-mix', avc: 'Rissoles Batch 5000g A25',
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
      yield: 'Per serve. Fries, melted cheddar and mozzarella, gravy.',
      ingredients: [
        { q: '[Qty]', name: 'Chips' },
        { q: '[Qty]', name: 'Cheddar', tags: ['Milk'] },
        { q: '[Qty]', name: 'Mozzarella', tags: ['Milk'] },
        { q: '[Qty]', name: 'Gravy', link: 'gravy' }
      ],
      pins: [
        { label: 'Chips', x: 30.9, y: 63.2, side: 'left', tags: [], note: 'Fries.' },
        { label: 'Cheddar', x: 34.9, y: 39.6, side: 'left', tags: ['Milk'], note: 'Melted.' },
        { label: 'Mozzarella', x: 65.1, y: 57.5, side: 'left', tags: ['Milk'], note: 'Melted.' },
        { label: 'Gravy', x: 48.1, y: 47.2, side: 'right', tags: [], note: 'Over the top. Card to come.' }
      ]
    },
    {
      id: 'beetroot-bites', art: 'beetroot-bites', no: '47', kind: 'snack', forLine: 'Snack', name: 'Crispy Beetroot Bites',
      menu: 'Crispy Beetroot Bites: fried beetroot, caramelised chilli jam, Korean-style cucumber.',
      yield: 'Per serve. Fried beetroot, chilli jam, Korean-style cucumber.',
      ingredients: [
        { q: '[Qty]', name: 'Crispy beetroot bites', note: 'fried', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Caramelised chilli jam' },
        { q: '[Qty]', name: 'Korean-style cucumber', tags: ['Sesame?', 'Soy?'] }
      ],
      pins: [
        { label: 'Crispy beetroot bites', x: 38.7, y: 45.5, side: 'right', tags: ['Gluten?'], note: 'Fried.' },
        { label: 'Caramelised chilli jam', x: 72.6, y: 35.8, side: 'left', tags: [], note: '' },
        { label: 'Korean-style cucumber', x: 63.2, y: 67.0, side: 'left', tags: ['Sesame?', 'Soy?'], note: '' }
      ]
    },
    {
      id: 'brisket-cob', art: 'brisket-cob', no: '48', kind: 'snack', forLine: 'Snack', name: 'Brisket Cob',
      menu: 'Brisket Cob: slow-roasted house-rubbed brisket, cream cheese, corn, caramelised onion, in a cob.',
      yield: 'Per serve. Brisket, cream cheese, corn and caramelised onion in a cob loaf.',
      ingredients: [
        { q: '[Qty]', name: 'Cob loaf', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Brisket', note: 'slow roasted, house rub' },
        { q: '[Qty]', name: 'Cream cheese', tags: ['Milk'] },
        { q: '[Qty]', name: 'Corn' },
        { q: '[Qty]', name: 'Caramelised onion' }
      ],
      pins: [
        { label: 'Cob loaf', x: 27.4, y: 41.5, side: 'left', tags: ['Gluten'], note: '' },
        { label: 'Brisket', x: 46.2, y: 37.5, side: 'right', tags: [], note: 'Slow roasted, house rub.' },
        { label: 'Cream cheese', x: 61.5, y: 60.6, side: 'right', tags: ['Milk'], note: '' },
        { label: 'Corn', x: 51.9, y: 49.1, side: 'right', tags: [], note: '' },
        { label: 'Caramelised onion', x: 41.5, y: 56.6, side: 'left', tags: [], note: '' }
      ]
    },
    {
      id: 'wings', art: 'wings', no: '49', kind: 'snack', forLine: 'Snack', name: 'Fried Chicken Wings',
      menu: 'Fried Chicken Wings: double-smoked BBQ sauce.',
      yield: 'Per serve. Fried wings in double-smoked BBQ sauce.',
      ingredients: [
        { q: '[Qty]', name: 'Chicken wings' },
        { q: '[Qty]', name: 'Wing flour', link: 'wing-flour', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Double-smoked BBQ sauce', tags: ['Gluten?', 'Soy?'] }
      ],
      pins: [
        { label: 'Chicken wings', x: 39.6, y: 42.5, side: 'right', tags: [], note: 'Fried.' },
        { label: 'Double-smoked BBQ sauce', x: 58.5, y: 64.2, side: 'left', tags: ['Gluten?', 'Soy?'], note: 'On the wings.' }
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
        { q: '[Qty]', name: 'Charred corn' },
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
      yield: 'Per serve. Crispy pork belly, chilli jam, Korean-style cucumber.',
      ingredients: [
        { q: '[Qty]', name: 'Roasted pork belly', note: 'cut into bites', link: 'pork-belly-batch' },
        { q: '[Qty]', name: 'Caramelised chilli jam' },
        { q: '[Qty]', name: 'Korean-style cucumber', tags: ['Sesame?', 'Soy?'] }
      ],
      pins: [
        { label: 'Pork belly bites', x: 30.2, y: 48.1, side: 'right', tags: [], note: 'Crispy. Card to come.' },
        { label: 'Caramelised chilli jam', x: 48.1, y: 37.7, side: 'right', tags: [], note: 'Over the bites.' },
        { label: 'Korean-style cucumber', x: 65.1, y: 67.9, side: 'left', tags: ['Sesame?', 'Soy?'], note: '' }
      ]
    },
    {
      id: 'calamari', art: 'calamari', no: '52', kind: 'snack', forLine: 'Snack', name: 'Salt and Szechuan Pepper Calamari',
      menu: 'Salt and Szechuan Pepper Calamari: lime aioli.',
      yield: 'Per serve. Salt and Szechuan pepper calamari, lime aioli.',
      ingredients: [
        { q: '[Qty]', name: 'Calamari', note: 'salt and Szechuan pepper coating', tags: ['Mollusc', 'Gluten?'] },
        { q: '[Qty]', name: 'Lime aioli', tags: ['Egg'] }
      ],
      pins: [
        { label: 'Calamari', x: 42.5, y: 44.3, side: 'right', tags: ['Mollusc', 'Gluten?'], note: 'Salt and Szechuan pepper.' },
        { label: 'Lime aioli', x: 72.6, y: 66.0, side: 'left', tags: ['Egg'], note: '' }
      ]
    },
    {
      id: 'riblets', art: 'riblets', no: '53', kind: 'snack', forLine: 'Snack', name: 'Smoked BBQ Pork Riblets',
      menu: 'Smoked BBQ Pork Riblets: bourbon BBQ sauce, cowboy candy.',
      yield: 'Per serve. Smoked riblets, bourbon BBQ sauce, cowboy candy.',
      ingredients: [
        { q: '[Qty]', name: 'Pork riblets', note: 'smoked' },
        { q: '[Qty]', name: 'Bourbon BBQ sauce', tags: ['Gluten?', 'Soy?'] },
        { q: '[Qty]', name: 'Cowboy candy', note: 'candied jalapeños' }
      ],
      pins: [
        { label: 'Pork riblets', x: 36.8, y: 54.7, side: 'right', tags: [], note: 'Smoked.' },
        { label: 'Bourbon BBQ sauce', x: 56.6, y: 33.7, side: 'left', tags: ['Gluten?', 'Soy?'], note: 'On the riblets.' },
        { label: 'Cowboy candy', x: 48.1, y: 44.3, side: 'left', tags: [], note: 'Candied jalapeños.' }
      ]
    },
    {
      id: 'garlic-bread', art: 'garlic-bread', no: '54', kind: 'snack', forLine: 'Snack', name: 'Garlic Bread',
      menu: 'Garlic Bread.',
      yield: 'Per serve.',
      ingredients: [
        { q: '[Qty]', name: 'Garlic bread', note: '7 inch, bought in', tags: ['Gluten', 'Milk?', 'Soy?'] }
      ],
      pins: [
        { label: 'Garlic bread', x: 49.1, y: 49.1, side: 'right', tags: ['Gluten', 'Milk?', 'Soy?'], note: '7 inch, bought in.' }
      ]
    },
    {
      id: 'bacon-cheese-bread', art: 'bacon-cheese-bread', no: '55', kind: 'snack', forLine: 'Snack', name: 'Bacon and Cheese Bread',
      menu: 'Bacon and Cheese Bread.',
      yield: 'Per serve.',
      ingredients: [
        { q: '[Qty]', name: 'Bread', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Bacon' },
        { q: '[Qty]', name: 'Cheese', tags: ['Milk'] }
      ],
      pins: [
        { label: 'Bread', x: 32.1, y: 58.5, side: 'right', tags: ['Gluten'], note: '' },
        { label: 'Bacon', x: 50.9, y: 47.2, side: 'left', tags: [], note: '' },
        { label: 'Cheese', x: 61.3, y: 41.5, side: 'right', tags: ['Milk'], note: 'Melted.' }
      ]
    },
    {
      id: 'chips-snack', art: 'chips-snack', no: '56', kind: 'snack', forLine: 'Snack', name: 'Chips',
      menu: 'Chips with a choice of aioli or gravy.',
      yield: 'Per serve. Aioli or gravy.',
      ingredients: [
        { q: '[Qty]', name: 'Chips' },
        { q: '[Qty]', name: 'Aioli', note: 'or gravy, guest\'s choice', tags: ['Egg'] },
        { q: '[Qty]', name: 'Gravy', note: 'or aioli', link: 'gravy' }
      ],
      pins: [
        { label: 'Chips', x: 40.6, y: 52.8, side: 'right', tags: [], note: '' },
        { label: 'Aioli or gravy', x: 74.5, y: 35.8, side: 'left', tags: ['Egg'], note: 'Guest\'s choice.' }
      ]
    },

    /* Mains */
    {
      id: 'beef-cheek', art: 'beef-cheek', no: '57', kind: 'main', forLine: 'Plate', name: 'Beef Cheek',
      menu: 'Beef Cheek: red wine-braised beef cheek, roasted honey pumpkin purée, fried onion, herb oil.',
      yield: 'Per plate. Braised beef cheek, pumpkin purée, fried onion, herb oil.',
      ingredients: [
        { q: '[Qty]', name: 'Beef cheek', note: 'braised in red wine' },
        { q: '[Qty]', name: 'Roasted honey pumpkin purée' },
        { q: '[Qty]', name: 'Fried onion', tags: ['Gluten?'] },
        { q: '[Qty]', name: 'Herb oil' }
      ],
      pins: [
        { label: 'Beef cheek', x: 40.5, y: 47.2, side: 'left', tags: [], note: 'Red wine braised.' },
        { label: 'Roasted honey pumpkin purée', x: 63.2, y: 59.4, side: 'left', tags: [], note: '' },
        { label: 'Fried onion', x: 50.9, y: 37.7, side: 'right', tags: ['Gluten?'], note: 'On top.' },
        { label: 'Herb oil', x: 69.8, y: 47.2, side: 'right', tags: [], note: 'Dots round the plate.' }
      ]
    },
    {
      id: 'fish-chips', art: 'fish-chips', no: '58', kind: 'main', forLine: 'Plate', name: 'Fish and Chips',
      menu: 'Fish and Chips: XXXX-battered fish, tartare, lemon, chips and salad.',
      yield: 'Per plate. Battered fish, tartare, lemon, chips and salad.',
      ingredients: [
        { q: '[Qty]', name: 'Fish fillet', tags: ['Fish'] },
        { q: '[Qty]', name: 'Beer batter', note: 'XXXX', link: 'beer-batter', tags: ['Gluten'] },
        { q: '[Qty]', name: 'Tartare sauce', tags: ['Egg', 'Soy?'] },
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
      yield: 'Per bowl.',
      ingredients: [
        { q: '[Qty]', name: 'Broccolini', note: 'charred' },
        { q: '[Qty]', name: 'Baby spinach' },
        { q: '[Qty]', name: 'Gem lettuce' },
        { q: '[Qty]', name: 'Brown rice' },
        { q: '[Qty]', name: 'Heirloom cherry tomatoes' },
        { q: '[Qty]', name: 'Red onion' },
        { q: '[Qty]', name: 'Toasted cashews', tags: ['Tree nut'] }
      ],
      pins: [
        { label: 'Brown rice', x: 34.7, y: 37.5, side: 'left', tags: [], note: '' },
        { label: 'Baby spinach', x: 62.3, y: 33.7, side: 'right', tags: [], note: '' },
        { label: 'Gem lettuce', x: 31.8, y: 63.2, side: 'left', tags: [], note: '' },
        { label: 'Broccolini', x: 65.1, y: 65.2, side: 'left', tags: [], note: 'Charred.' },
        { label: 'Cherry tomatoes', x: 45.1, y: 46.9, side: 'left', tags: [], note: 'Heirloom.' },
        { label: 'Red onion', x: 49.3, y: 55.7, side: 'right', tags: [], note: '' },
        { label: 'Toasted cashews', x: 55.7, y: 44.3, side: 'right', tags: ['Tree nut'], note: '' }
      ]
    },
    {
      id: 'pumpkin-salad', art: 'pumpkin-salad', no: '63', kind: 'main', forLine: 'Salad', name: 'Honey and Maple Roasted Pumpkin',
      menu: 'Honey and Maple Roasted Pumpkin: five-spice roasted pumpkin, maple, seed granola, basil pesto, feta, fried kale.',
      yield: 'Per plate.',
      ingredients: [
        { q: '[Qty]', name: 'Pumpkin', note: 'five-spice roasted' },
        { q: '[Qty]', name: 'Maple' },
        { q: '[Qty]', name: 'Seed granola', tags: ['Gluten?', 'Sesame?'] },
        { q: '[Qty]', name: 'Basil pesto', tags: ['Tree nut?', 'Milk?'] },
        { q: '[Qty]', name: 'Feta', tags: ['Milk'] },
        { q: '[Qty]', name: 'Fried kale' }
      ],
      pins: [
        { label: 'Pumpkin', x: 36.8, y: 37.7, side: 'left', tags: [], note: 'Five-spice roasted.' },
        { label: 'Maple', x: 55.7, y: 37.5, side: 'right', tags: [], note: 'Drizzled.' },
        { label: 'Seed granola', x: 44.1, y: 49.1, side: 'left', tags: ['Gluten?', 'Sesame?'], note: '' },
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
        { q: '[Qty]', name: 'Tartare sauce', tags: ['Egg', 'Soy?'] },
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
      yield: 'Senior plate. Calamari, chips and salad.',
      ingredients: [
        { q: '[Qty]', name: 'Calamari', tags: ['Mollusc', 'Gluten?'] },
        { q: '1 portion', name: 'Chips and salad', link: 'chips-salad' }
      ],
      pins: [
        { label: 'Calamari', x: 48.1, y: 35.8, side: 'right', tags: ['Mollusc', 'Gluten?'], note: '' },
        { label: 'Chips', x: 28.3, y: 66.0, side: 'right', tags: [], note: 'Chips and salad portion. Card to come.' },
        { label: 'Salad', x: 71.7, y: 66.0, side: 'left', tags: [], note: 'Chips and salad portion. Card to come.' }
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
        { q: '20 ml', name: 'Green goddess dressing', note: 'vegan', tags: ['Soy?', 'Sesame?'] },
        { q: '2 g', name: 'Salt flakes', note: 'on the salad' }
      ],
      contains: [],
      check: [{ allergen: 'Soy', from: 'green goddess dressing' }, { allergen: 'Sesame', from: 'green goddess dressing' }],
      labelNote: 'Check the chip and dressing labels. AVC also lists chicken salt and lemon pepper on the chips at 0 g, so they are not counted here.'
    },
    {
      id: 'pork-belly-batch', no: '67', art: 'pork-belly-batch', kind: 'batch', forLine: 'For the pork belly and the pork belly bites', name: 'Pork Belly and Crackle', short: 'Pork belly',
      avc: 'Pork Belly & Crackle',
      yield: 'Batch: 25 serves.',
      ingredients: [
        { q: '6 kg', name: 'Pork belly', note: 'boneless, rind on' },
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
      id: 'side-veg', no: '68', kind: 'batch', forLine: 'For the rissoles', name: 'Seasonal Vegetables', short: 'Side veg', art: 'side-veg',
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
      id: 'gravy', no: '69', kind: 'batch', forLine: 'For schnitzels, rissoles, mash and poutine', name: 'Gravy', short: 'Gravy',
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
      id: 'mash', no: '70', kind: 'batch', forLine: 'For the rissoles and other plates', name: 'Potato Mash', short: 'Mash',
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
      id: 'spinach-puree', no: '71', kind: 'batch', forLine: 'For the pork belly', name: 'Spinach Purée', short: 'Spinach purée', art: 'spinach-puree',
      yield: 'Batch: 1.5 kg spinach, about 1 L of purée. A serve is 50 ml, a wavy squiggle across the plate.',
      ingredients: [
        { q: '1.5 kg', name: 'Spinach' },
        { q: '300 ml', name: 'Cooking cream', tags: ['Milk'] },
        { q: '80 g', name: 'Salted butter', tags: ['Milk'] },
        { q: '10 g', name: 'Table salt' }
      ],
      sections: [
        { title: 'Method', steps: ['Quickly blanch the spinach in a pot of water for 2 min.', 'Put it straight into ice water to keep the green.', 'Squeeze out the excess liquid.', 'Blend with the cooking cream, salted butter and salt until smooth.'] }
      ],
      contains: [{ allergen: 'Milk', from: 'cooking cream and butter' }],
      check: [],
      labelNote: 'Check the cooking cream and butter labels.'
    },
    {
      id: 'red-wine-jus', no: '72', kind: 'batch', forLine: 'For the pork belly', name: 'Red Wine Jus', short: 'Red wine jus',
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
      id: 'fried-onions', no: '73', kind: 'batch', forLine: 'For the pork belly', name: 'Fried Onions', short: 'Fried onions', art: 'fried-onions',
      yield: 'Batch: 8 white onions and 400 g cornflour.',
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
    }
  ]
};
