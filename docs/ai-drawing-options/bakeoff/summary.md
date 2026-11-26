# AI drawing bake-off: the numbers

Made by `scripts/ai-bakeoff/report.js` from 81 dishes (81 with an AI plate). Scores are `tests/plating-check.js` against the book's own 76 hand-made plates: lower is better, the book's own plates score about 0.

| | Draw it for me | Claude |
| --- | --- | --- |
| Score median | 0.01 | 0.44 |
| Score mean | 0.23 | 0.97 |
| Dishes over 2 | 0 | 12 |
| Something in the recipe missing or off the servingware | 1 | 7 |

Claude better by more than 0.1: 6. Worse by more than 0.1: 47. About the same: 28.

Cost: US$2.46 in all, median US$0.03 a plate. Wait: median 9.17 s, slowest 10% over 14.84 s.
Failed answers: 0. Answers served by another model: 0. Unknown pieces or names in answers: 0 dishes.

| Dish | Draw it for me | Claude | Claude's faults | Claude left off |
| --- | --- | --- | --- | --- |
| Pizza Platter | 1.28 | 0.15 | - | - |
| Butchers Board | 1.39 | 0.44 | Maple butter is in the recipe but not on the plate. | Maple butter |
| Wedges | 1.15 | 0.53 | sauce stick Sweet chilli sauce 4.0 | - |
| Green Bowl | 0.31 | 0.00 | - | - |
| Grill Maiden's Board | 0.76 | 0.50 | long Pork Cumberland sausage 4.6 | Oven brisket, Wing flour |
| Mash Serve | 0.31 | 0.09 | - | - |
| Pub Caesar | 0.10 | 0.00 | - | - |
| Brisket Cob | 0.13 | 0.06 | - | Cob loaf mix |
| Calamari Topper | 0.11 | 0.08 | - | - |
| Senior Fish and Chips | 0.02 | 0.00 | - | Beer batter, Chips and salad |
| 180 g Eye Fillet | 0.01 | 0.00 | - | Sea salt flakes, Chips and salad |
| Chicken Burger | 0.00 | 0.00 | - | Crumbed chicken thigh, Sliced cheese, Ranch, Oak leaf, Tomato |
| New Pork Ribs | 0.50 | 0.50 | sauce stick Bourbon BBQ sauce 3.5 | - |
| 250 g Rump | 0.00 | 0.00 | - | Sea salt flakes, Chips and salad |
| 300 g Rib Fillet | 0.00 | 0.00 | - | Sea salt flakes, Chips and salad |
| 350 g Flank Steak | 0.00 | 0.00 | - | Chips and salad |
| Beef Schnitzel | 0.00 | 0.00 | - | Chips and salad |
| The OZ Smash Burger | 0.00 | 0.00 | - | Smash patty, Burger cheese, Shortcut bacon, Sliced beetroot, Tomato, Red onion, Bread and butter pickles, Tomato ketchup, Oak leaf lettuce |
| Carbonara | 0.00 | 0.00 | Creamy garlic sauce is in the recipe but not on the plate. | Creamy garlic sauce, White cooking wine |
| Senior Chicken Schnitzel | 0.00 | 0.00 | - | Chips and salad |
| Senior Parmy | 0.00 | 0.00 | - | Chips and salad |
| Senior Spaghetti Bolognese | 0.00 | 0.00 | - | - |
| Salt and Szechuan Pepper Calamari | 0.00 | 0.00 | - | Corn flour, Szechuan seasoning |
| Chips | 0.00 | 0.00 | Gravy is in the recipe but not on the plate. | Gravy |
| Fish and Chips | 0.00 | 0.00 | - | Beer batter, Chips and salad |
| Chicken Schnitzel | 0.00 | 0.00 | - | - |
| Chicken Parmy | 0.50 | 0.50 | garnish big: Mozzarella 58% of main | Chips and salad |
| Senior Calamari | 0.00 | 0.00 | - | Chips and salad |
| Pulled Pork Burger | 0.00 | 0.00 | - | Pulled pork, Carolina BBQ sauce, New slaw |
| Beast Burger | 0.00 | 0.00 | - | - |
| Poutine Fries | 0.26 | 0.28 | - | - |
| Bacon and Cheese Bread | 0.00 | 0.07 | - | - |
| Senior Lamb Rissoles | 0.00 | 0.07 | - | - |
| Smoked BBQ Pork Riblets | 0.30 | 0.39 | - | - |
| Mushroom Topper | 0.00 | 0.12 | - | Italian herbs |
| Side Salad | 0.69 | 0.81 | long Continental cucumber 3.8 | - |
| Barramundi | 0.09 | 0.21 | - | Sesame oil |
| Vegan Rissoles | 0.03 | 0.17 | - | Table salt |
| Chickpea Mushroom Burger | 0.00 | 0.14 | - | Beetroot falafel, Vegan aioli, Chunky avocado, Tomato, Green oak lettuce |
| Smash Burger | 0.00 | 0.14 | - | Smash patty, Burger cheese, Bread and butter pickles, American mustard, Tomato sauce, Oak leaf lettuce |
| Lamb Rissoles | 0.00 | 0.15 | - | - |
| Vege Platter | 0.74 | 0.90 | 11 extra copies | - |
| Kids Spaghetti Bolognese | 0.00 | 0.19 | - | - |
| Yumcha Platter | 0.90 | 1.15 | 14 extra copies | - |
| 500 g Rump | 0.00 | 0.25 | - | Sea salt flakes, Chips and salad |
| Steamed Seasonal Vegetables | 0.66 | 0.92 | - | - |
| Sticky Toffee Pudding | 0.07 | 0.42 | - | - |
| Pork Belly | 0.01 | 0.37 | - | Oil, Table salt |
| Beef Cheek | 0.44 | 0.81 | - | - |
| Pork Knuckle | 0.08 | 0.50 | sauce stick Hot honey glaze 3.6 | - |
| Snickers Spring Rolls | 0.00 | 0.43 | - | Small Snickers bars |
| Chicken Adobo | 0.00 | 0.50 | White cane vinegar is in the recipe but not on the plate.; Brown onion is in the recipe but not on the plate.; Whole black peppercorns is in the recipe but not on the plate. | White cane vinegar, Brown onion, Whole black peppercorns, Unsalted chicken stock, Garlic, Bay leaves, Brown sugar, Neutral cooking oil |
| Chicken Topper | 0.06 | 0.61 | - | Italian herbs |
| Garlic Bread | 0.00 | 0.61 | - | - |
| Slaw Serve | 0.11 | 0.89 | - | - |
| Smoked Mac and Cheese | 0.43 | 1.30 | - | - |
| Prawn Topper | 0.00 | 0.90 | - | - |
| Donut Fries | 0.00 | 0.92 | - | Ground cinnamon, Icing sugar mix |
| Smoked Pulled Lamb Nachos | 0.33 | 1.30 | garnish big: Grated mozzarella 199% of main, Smashed avocado puree 55% of main, Pico de gallo 50% of main | - |
| Chicken Schnitzel French | 0.00 | 1.00 | garnish big: French parmi topper 51% of main; 4 extra copies | Chips and salad |
| Chicken Schnitzel Mexican | 0.00 | 1.00 | garnish big: Mexican topper 76% of main; 4 extra copies | Chips and salad |
| Skillet Cookie | 0.00 | 1.01 | - | - |
| Crispy Beetroot Bites | 0.00 | 1.03 | - | - |
| Buffalo BBQ Corn on the Cob | 0.05 | 1.24 | Chilli jalapeño butter is in the recipe but not on the plate. | Chilli jalapeño butter |
| Steak Sandwich | 0.00 | 1.47 | overlap Turkish roll / Side sauce of choice 34% | Topside steak, Cheese, Shortcut bacon, Egg, Tomato relish, Aioli, Oak leaf lettuce, Tomato |
| Guinness Beef Pie | 0.00 | 1.48 | overlap Pie shell and lid / Green peas 38%; Guinness beef pie mix is in the recipe but not on the plate. | Guinness beef pie mix |
| The Beast Board | 1.07 | 2.58 | overlap Smoked brisket / Chicken wings 31%; 5 extra copies; Maple butter is in the recipe but not on the plate. | Maple butter |
| Brisket Board | 0.70 | 2.24 | overlap Smoked brisket / Fries 35% | - |
| Fish Burger | 0.00 | 1.57 | overlap Milk bun / Chips 42% | Blue grenadier fillet, Beer batter, Tartare sauce, Green oak lettuce, Tomato, Red onion |
| Honey and Maple Roasted Pumpkin | 0.27 | 1.98 | Basil pesto under Pumpkin; sauce stick Maple 3.9 | - |
| Guacho Taco Share Board | 0.98 | 2.86 | garnish big: Pico de gallo 66% of main, Chunky avocado 65% of main | Oven brisket |
| Seafood Platter | 1.53 | 3.44 | overlap Oysters / B.B. whiting 29%; long Scallops 5.5; 8 extra copies | - |
| Fried Chicken Wings | 0.03 | 1.99 | sauce stick Double-smoked BBQ sauce 3.5 | Wing flour |
| Crispy Pork Belly Bites | 0.25 | 2.49 | - | - |
| Aussie Platter | 0.87 | 3.46 | overlap Meatballs / Quiche 37%; 6 extra copies | - |
| Antipasto Platter | 0.07 | 3.17 | garnish big: Prosciutto 65% of main; long Cheese selection 3.9; 5 extra copies | - |
| Philly Cheesesteak Loaded Potato | 0.00 | 3.54 | overlap Pulled BBQ brisket / Roast capsicum strips 54%; garnish big: Caramelised onion 52% of main | - |
| Haloumi Tacos | 1.00 | 4.71 | overlap Haloumi / Charred corn 64%; sauce stick Lime aioli 11.6; long Charred corn 8.2; 7 extra copies | - |
| Chicken Schnitzel Americana | 0.00 | 4.86 | overlap Chicken schnitzel / Americana topper 100% | Chips and salad |
| BBQ Pulled Beef Loaded Fries | 0.00 | 6.06 | overlap Pulled BBQ brisket / Cowboy candy 100%; sauce stick Alabama white sauce 3.5 | - |
| Feast of the Feather | 0.05 | 6.89 | overlap Yorkshire pudding / Smoked chicken 100% | - |
