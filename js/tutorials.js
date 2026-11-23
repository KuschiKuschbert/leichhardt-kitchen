/* The tutorial videos as guides (docs/tutorial-videos.md, In the book). Made by scripts/tutorials/catalogue.mjs from the
   storyboards: do not change it by hand. Loaded by js/prep.js only when Guides opens, never at the start. */
window.LK_TUTORIALS = {
 "v": 1,
 "list": [
  {
   "id": "sign-in",
   "n": 1,
   "title": "Signing in",
   "who": "all",
   "sum": "Here's how to set up a device, sign in with your PIN and unlock it each day.",
   "len": 93,
   "steps": [
    "This device: The first time you open the book, it asks how this device is used. My own device is just for you. Your PIN unlocks it each day after 04:00. A shared kitchen screen is for the whole team. It locks after 10 minutes.",
    "Just recipes: Only after a recipe? Tap View recipes for now. Recipes never need a sign in.",
    "Kitchen sign in: This is the kitchen screen, so tap Shared kitchen screen. Then tap Kitchen sign in.",
    "Your name: Pick your name. The first time, you choose your own four digit PIN to go with it.",
    "Your PIN: Tap your name, then type your PIN. It shows as dots, so nobody else sees it. Your first sign in of the day opens Home.",
    "Walk away: Say you start an order, then get called away. Nobody touches the screen for 10 minutes. So a shared screen locks itself.",
    "Kept for you: Your name stays on the lock, and your work is kept behind your PIN. Someone else? They tap Not me and sign in as themselves.",
    "Back to work: Type your PIN and you're straight back, with Lemons still there. Every device asks for your PIN again after 04:00, ready for the new day."
   ],
   "pv": 1
  },
  {
   "id": "home",
   "n": 2,
   "title": "Home",
   "who": "all",
   "sum": "Your section, your break and your team, the moment you open the book.",
   "len": 84,
   "steps": [
    "Hello: Home greets you by name. The mascot plays when you first open the book each day. Tap him to see it again.",
    "Your day: Your day comes first: your section and your shift hours. Then your break, and when you're back.",
    "On with you: Next, who is on with you today, by section. Tap View today's full team to see the whole day.",
    "Prep and more: Prep by section shows how much is left in each section. Coming up lists the functions later in the week.",
    "Functions: Tomorrow's function gets its own card, with the food times and the platters. Tap Got it once you have read it, and the next one comes up.",
    "Top bar: Up top, the people button shows your day in one tap. The bell holds today's shift pings from the chefs. The clock beside them is the cooling timer.",
    "Chef hat: The chef hat is your menu: your section, functions, the drinks run, Settings and more. Not you on this phone? Sign out is at the top.",
    "Every list: The tabs open each list in one tap. Tap the logo to come back to Home from anywhere."
   ],
   "pv": 1
  },
  {
   "id": "recipes",
   "n": 3,
   "title": "Recipes",
   "who": "all",
   "sum": "Find any dish, check its allergens and follow the method.",
   "len": 68,
   "steps": [
    "Search: Type a dish, an ingredient or an allergen in the search box. The list shrinks as you type. Tap a dish to open it.",
    "Allergens: Every card starts with its allergens, and where they come from. A question mark means check the supplier label.",
    "Ingredients: Then everything on it, with the amounts.",
    "Batch recipes: An underlined ingredient has its own recipe card. Tap it to open it. The trail at the top takes you back.",
    "The method: The method is step by step. Tap a step to tick it off as you go.",
    "Keep screen on: Hands busy? Tap Keep screen on, and the phone stays awake while a recipe is open.",
    "Free from: Cooking for an allergy? Back on the list, tap Free from, then choose the allergen. Only the dishes without it stay on the list.",
    "Pass or Tiles: The Pass shows each dish on its plate. Tiles shows them as cards, with their allergens."
   ],
   "pv": 1
  },
  {
   "id": "prep",
   "n": 4,
   "title": "Prep list",
   "who": "all",
   "sum": "Here's how to add your prep, tick it off and share out the jobs.",
   "len": 92,
   "steps": [
    "Today's list: This is today's prep list. Every line is something to make before service, grouped by section. The count up top shows how much is done.",
    "Start here: Urgent lines carry a black flag. Do those first. The numbers one, two and three show where to start.",
    "Your section: Tap a section to see just your lines. Tap the All button to see the whole list again.",
    "Add a line: To add something, tap Add a line. Write what to make. Pick the section, and the amount if you know it. Then tap Add. It's on the list straight away.",
    "Quick add: The things this kitchen makes often wait under Quick add. One tap puts them on, with the usual amount.",
    "Tick it off: When a job's done, tap its box. Ticked the wrong one? Tap Undo on the slip, straight away. Tick it again when it is really done. The book keeps your name and the time.",
    "On it: Starting a big job? Tap On it. Your letter shows on the line, so nobody doubles up.",
    "Change a line: The three dots let you change the amount, or move a line to another section. Wrote the wrong thing? Undo it straight away, or ask a chef to take it off."
   ],
   "pv": 1
  },
  {
   "id": "orders",
   "n": 5,
   "title": "Orders",
   "who": "all",
   "sum": "Here's how to ask for stock, and how the chefs tick it off once it's ordered.",
   "len": 93,
   "steps": [
    "The list: This is today's order list. Each line is something the team needs, with the amount and who asked. The count shows how much is ordered so far. Anyone can add a request. The head chef or a sous chef does the ordering.",
    "Add a request: Need something? Tap Add request. Write what you need.",
    "Filled for you: The book fills in the usual amount, and says so under the box. Change it if you need more or less.",
    "How urgent: Say how urgent it is. Running low, or out now. Then tap Add. It's on the list straight away.",
    "Supplier cut-offs: Chefs see the supplier cut-offs here. Tap the View button to open them. Each supplier shows when its order closes, and how long is left. Placed the order by phone or email? Tap Order placed. Everyone sees it's done, with your name and the time.",
    "Tick it off: When a line is ordered, tap its box. Ticked the wrong one? Tap Undo on the slip, straight away. Tick it again once it is really ordered. The book keeps your name and the time.",
    "Ordered today: A ticked line stays for ten minutes, then moves to Ordered today. Tap it to see what's been ordered. Each one has its own Undo."
   ],
   "pv": 1
  },
  {
   "id": "wastage",
   "n": 6,
   "title": "Wastage",
   "who": "all",
   "sum": "Here's how to log what gets thrown out, and why.",
   "len": 91,
   "steps": [
    "Today's waste: This is today's wastage log. The total shows what has gone in the bin today. The bar shows why, with one colour for each reason. Each entry says what it was, how much, the section and who logged it.",
    "Log waste: Throwing something out? Tap Log waste. Write what it is.",
    "Amount and unit: Weigh or count it, and write the amount. Then tap its unit. Always the real amount, never a dollar value.",
    "Reason and section: Pick why it was wasted. Each reason says what it means. Then tap the section it came from.",
    "Log it: Tap Log it. The button says what it saves. It's in the log straight away, and the sheet stays open for the next one.",
    "Filled for you: Logged it before? Write the name. The book fills in the reason and the unit from last time, and says so under the boxes. You still weigh it, and write the amount for today.",
    "Undo: Logged the wrong thing? Tap Undo, straight away. Only a chef can undo an entry. If you're a cook, ask the head chef.",
    "Make it again: Expired stock or a cooking fault gets Make it again. One tap puts it on today's prep list."
   ],
   "pv": 1
  },
  {
   "id": "transfers",
   "n": 7,
   "title": "Transfers",
   "who": "all",
   "sum": "Here's how to log stock shared with the other venues, and mark it back when it's returned.",
   "len": 78,
   "steps": [
    "Still out: This is the transfer list, for stock shared with the other venues. Still out comes first. Each card says which venue has it, who came for it, and since when. Out for a week or more, and the card turns red.",
    "Log a transfer: Lent something, or borrowed it? Tap Log a transfer. Pick which way it went. Then write the venue, and who came for it.",
    "What and how much: Write what they took, and how much. Then tap its unit. The amount, never a price.",
    "Log it: Taking a few things? Tap Add another item for each one. Then tap Log it. It goes under Still out.",
    "Mark returned: When all of it comes back, tap Mark returned. It moves to Done today, with your name and the time.",
    "Undo return: Marked the wrong one? For two minutes, Undo return sits right beside it. Tap it, and it's back under Still out. After two minutes, only a chef can undo it."
   ],
   "pv": 1
  },
  {
   "id": "deliveries",
   "n": 8,
   "title": "Delivery received",
   "who": "all",
   "sum": "Here's how to check a delivery in, with its temperatures.",
   "len": 75,
   "steps": [
    "Check it in: When a delivery arrives, check it in here. Your name and the time are filled in for you.",
    "The supplier: The suppliers due today are right here. Tap the one that's come in. Not on the list? Write its name in the box.",
    "What came in: Say what came in. Chilled, frozen, or both. This one has both, so tap the Both button.",
    "Temperatures: Probe the food, and write each temperature. Frozen reads below zero. If the minus is missing, the book asks. One tap on the minus key fixes it.",
    "Items and notes: Add the items, or anything wrong with them, if you like.",
    "Save delivery: Then tap Save delivery. It's under Today's deliveries, with the time, both readings and your name.",
    "Still to come: Suppliers due today that haven't come in yet are listed at the bottom. Saved readings stay as they were recorded. To fix one, save it again with a note."
   ],
   "pv": 1
  },
  {
   "id": "guides",
   "n": 9,
   "title": "Guides",
   "who": "all",
   "sum": "Here's how to find a guide, follow it step by step, and print it.",
   "len": 76,
   "steps": [
    "All the guides: Every guide the head chef has written is here, grouped by kind. Each card says how many pages and steps it has.",
    "Pick a kind: Tap the All button to pick a kind of guide. Pick Cleaning, and only the cleaning guides show. Pick All again to see every guide.",
    "Search: Or search for it. Type a word, like smoke. The guides that match show straight away.",
    "Open a guide: Tap a guide to open it. It says what it is for, and how many pages and steps it has.",
    "Step by step: Tap Step by step to see one step at a time, big. The page from the guide shows with the step. Tap Next step when you're ready for the next one.",
    "Its pages: The guide's own pages are under the steps. Tap a page to open it big. Tap Next to turn the page.",
    "Print it: Need it on paper? Download the printable sheets here. Then print them, or keep the PDF on your phone."
   ],
   "pv": 1
  },
  {
   "id": "team-talk",
   "n": 10,
   "title": "Pings, minutes and mail",
   "who": "all",
   "sum": "Here's how the kitchen keeps everyone in the loop.",
   "len": 92,
   "steps": [
    "Shift pings: A shift ping is a short message from the chefs. It pops up on screen. Each one says what it is about and who sent it. Close it, and the bell up top opens it again any time.",
    "Got it: Read them, then tap Got it. Anything else waiting for you comes next, like minutes to sign.",
    "Meeting minutes: Tap the minutes to read them. The actions that are yours are marked Yours.",
    "Sign them: Read to the end. The sign box says: I have read and understood these minutes. Tap Sign as Sam. Your name, the version and the time are kept.",
    "Write a ping: Chefs write the pings. Open the chef hat, then Shift pings. Tap Write a ping, and type it in.",
    "Who gets it: Send it to everyone, or pick one person. It shows today, or pick a day ahead. Then tap Save ping.",
    "Kitchen mail: Kitchen mail goes to the head chef. Pick what it is about, and how soon it matters. Write a short message, then tap Send to Chef.",
    "Sent, Seen, Done: Your mail is listed underneath. Sent means it went. Seen means Chef has read it. Done means it is sorted."
   ],
   "pv": 1
  },
  {
   "id": "drinks",
   "n": 11,
   "title": "Drinks run",
   "who": "all",
   "sum": "Set your usual drink once, and the order adds itself up.",
   "len": 69,
   "steps": [
    "Open it: The drinks run is in the chef hat menu.",
    "The order: The order adds up everyone's usual drink, the same drinks together. Five people are in today, so there are five drinks.",
    "On today: On today shows who has signed in today, with their drink. Anyone not in yet stays off the order. Tap Show them to see them.",
    "Coffee first: A usual can have a coffee and a soft drink. The order takes the coffee, and the soft drink shows in brackets, so the runner can swap.",
    "Your usual: Your usual sits at the top. Tap Change to set it.",
    "Pick it: Choose the size, and change the milk or the sugar if you need to. Anything else, like extra hot, goes in the box below.",
    "Save it: Check your usual under the form, then tap Save my usual. The order changes straight away."
   ],
   "pv": 1
  },
  {
   "id": "todays-team",
   "n": 12,
   "title": "Today's team",
   "who": "chefs",
   "sum": "Here's how a chef puts the day's team on their sections, with their breaks.",
   "len": 86,
   "steps": [
    "Today's team: This is Today's team. Head and sous chefs set it. It's for the day shown here. Nothing is saved for today yet.",
    "Fill the day: Add staff puts people on a service. Quicker still: open Copy a day, and tap Use last Tuesday. Last week's shifts, sections and breaks fill in.",
    "Sections: Everyone has a section for each service. Tap it to change it. Bo moves to the fryer.",
    "Breaks: Tap Break beside a name to give them a break. It starts at the first time left today. Tap the time to change it.",
    "Too few: When too few are on at a busy time, the book warns you here. Only three are on Dinner at the busy time, and four are needed.",
    "Add a service: Ann can stay on for Dinner. Tap Add a service, then Dinner. Now four are on, and the warning goes.",
    "Save: Nothing is shared until you tap Save. Then the plan is saved for everyone, with your name and the time.",
    "On break now: The card at the top shows who is on a break now. Staff see their own day from the round chip up top."
   ],
   "pv": 1
  },
  {
   "id": "cleaning",
   "n": 13,
   "title": "Cleaning",
   "who": "all",
   "sum": "Here's how to tick off today's cleaning jobs, and how the Pass check works.",
   "len": 70,
   "steps": [
    "Today's jobs: This is today's cleaning list. The count shows how many jobs are done. Each job says where it is, and whose section it is.",
    "Tick it off: When a job's done, tap its box. Your name and the time go on it. Tapped the wrong one? Tap Undo on the slip, straight away.",
    "How to: Some jobs have a How to link. Tap it to open the guide for that job. Tap the back arrow to come back to the list.",
    "Checks: Some jobs have checks to tick, like Cover and label all food. Tap the job to see how to do it, and its checks.",
    "Pass check: Ann ticked the start of day checks. Now they wait for the Pass check. The Pass checker looks, then taps Verify Pass check.",
    "Set it up: Chefs set the jobs in Repeat tasks. Add a job, and choose its section and the days it repeats."
   ],
   "pv": 1
  },
  {
   "id": "functions",
   "n": 14,
   "title": "Functions",
   "who": "all",
   "sum": "Here's how to see what's booked, send each round, and book a new function.",
   "len": 138,
   "steps": [
    "Today and soon: This page shows today's functions, and the next seven days. Each card says when the next round goes out, and what goes in it. Under each day, the book adds up the platters to make.",
    "The band: The band under the top bar shows today's functions, on every page. The time of the next round comes first. Tap a function to see all of it: what goes out next, and every round.",
    "Service view: With two functions on, tap Service view. Every round still to go is here, in order, with how long until it's due. When a round leaves the pass, tap Send all. It waits for Functions to confirm it, with Undo if you sent the wrong one.",
    "Cancel and Undo: If a function is called off, tap Cancel function on its card. The kitchen is told straight away. Tapped the wrong one? Tap Undo cancel, and it is back.",
    "Book a function: Function managers book them too. Tap the chef hat, then Functions. Tap New function. Write the name, the date, the start time and the guests.",
    "Add platters: Tap Choose a platter, pick one, then write how many. Add the next one the same way. The bar at the bottom adds them up, and says when it's ready.",
    "Check and confirm: Tap Check and confirm. This is what the kitchen will see. Then tap Confirm function. The band says its stock is on the order list today."
   ],
   "pv": 1
  },
  {
   "id": "settings",
   "n": 15,
   "title": "Settings",
   "who": "all",
   "sum": "Your own settings, and how this phone or tablet works.",
   "len": 74,
   "steps": [
    "Open Settings: Settings is at the bottom of the chef hat menu.",
    "Your card: Your card at the top says who is signed in, and how this device is used. Sign out is here too.",
    "My section: My section today is where your prep lines and wastage go. Change it here. It clears at midnight.",
    "What you can do: What you can do lists what the head chef has set for you. Usual drink opens the drinks run, to set your coffee.",
    "Text size: Text size makes the whole book bigger on this phone. Normal puts it back.",
    "Recipes: Recipes open with chooses the Pass or Tiles on this phone.",
    "Keep screen on: Keep the screen on stops the phone sleeping while a recipe is open.",
    "This device: How this device is used says My own device, or Shared kitchen screen. Change it, or forget this device, here.",
    "Update now: The book updates by itself when nothing is waiting to send. When an update is ready, tap Update now to get it straight away."
   ],
   "pv": 1
  },
  {
   "id": "chef-panel",
   "n": 16,
   "title": "The chef panel",
   "who": "chefs",
   "sum": "Here's how the head chef and the sous chefs run the shift from one place.",
   "len": 127,
   "steps": [
    "Open the panel: Head chefs and sous chefs have their own panel. Tap the chef hat, then Sous chef panel. It has five rooms: Today, Reports, Team, Kitchen and Prep.",
    "Dashboard: Today opens on the Dashboard. At a glance: the prep done, the orders, and today's team. Tap one to open it. Chef to-do and Shift pings sit next to it.",
    "Add a job: Tap Chef to-do. This list is only for the chefs. Write the job. Add the day it's due, and who it's for, if you like. Then tap Add to the list.",
    "Tick it off: When a job's done, tap its box. The slip names it. Tap Undo if it was the wrong one. Chef to-do is in the chef hat too.",
    "Reports: Reports keeps the prep and order records. Prep history shows a day's prep list, and what was ticked. Pick another day here. Order history works the same way.",
    "Team: Team is for the people. Today's team sets who is on, their section and their break. Manage staff adds or removes a person. Meeting minutes shows who has signed the latest minutes.",
    "Kitchen: Kitchen is one page of rows. Recipes and drawings, Supplier order, Functions, Delivery received and Guides. Tap a row to open that tool.",
    "Section standards: Prep holds the section standards. Pick a section to see what it should have ready before service. Only the head chef changes them."
   ],
   "pv": 1
  },
  {
   "id": "supplier-order",
   "n": 17,
   "title": "Supplier order",
   "who": "chefs",
   "sum": "Here's how the chefs write each supplier's order, check it and record it.",
   "len": 107,
   "steps": [
    "Cut-offs first: The cut-offs sit at the top. Northside Foods closes at 15:00. Pick a supplier here, or tap its name up top.",
    "Write the order: Each item shows its par, and what you ordered last time. Type how many in the To order box. Plus and minus change it by one.",
    "Staff requests: Staff requests shows what the team asked for on the order list. Ann asked for panko, so write it in. Nothing is ticked off here. The request stays on the order list.",
    "Review: When it's all in, tap Review order. Check every line. Send it the usual way. Copy order text helps. The book sends nothing itself.",
    "Record it: Once the order is placed, tap Record order placed. Northside Foods now shows as ordered, and leaves the cut-offs.",
    "Order history: Order history shows each order, and who recorded it. Choose a date to see that order.",
    "Order done: Ordered by phone or email instead? Open the order list. Under the cut-offs, tap Order placed beside the supplier. It shows who ordered it, with Undo."
   ],
   "pv": 1
  },
  {
   "id": "recipes-manage",
   "n": 18,
   "title": "Recipes and drawings",
   "who": "chefs",
   "sum": "Here's how the chefs change a recipe, mark a special and draw the plate.",
   "len": 106,
   "steps": [
    "The recipe list: This lists every recipe in the book. Find one by name, card number or ingredient. Tap it to open its form.",
    "The recipe form: Each part of the recipe has its own tab. Ingredients opens first. Type in a row to change an amount or a name. Save stays grey until something changes.",
    "Special: Card details holds two switches. Show in the book hides or shows the recipe. Special puts a dish first on the Pass and Tiles. Then tap Save.",
    "Drawings: Drawings shows the plate, with its labels. Draw it in the studio opens the drawing studio.",
    "The studio: Draw it for me draws the dish from its recipe. Try another gives a new layout. Undo takes it back. Add food puts more on the plate. Drag a part to move it. Tap Save, and the recipe shows the new drawing.",
    "New recipe: Back on the list, New recipe starts an empty card. Cards to come lists the cards still to write. Make this card opens a new recipe for it. Write the name staff see, then fill in each part."
   ],
   "pv": 1
  },
  {
   "id": "admin-today",
   "n": 19,
   "title": "Admin: Today",
   "who": "chefs",
   "sum": "Here's what needs you today, and how to find any page fast.",
   "len": 126,
   "steps": [
    "Five rooms: The admin panel has five rooms: Today, Reports, Team, Kitchen and Prep. Each room keeps its pages as tabs, under its name. Today opens on the Inbox.",
    "The Inbox: The Inbox lists what needs you today. Open kitchen mail comes first, the most urgent at the top. Then minutes still to sign, item links to check and transfers not back. Each line has a button that opens its page.",
    "Today's numbers: Under it are today's numbers, from the nightly run. Prep ticked yesterday, waste in the last seven days and functions today. Tap a number to open its report. Waste opens Wastage, in Reports. Tap Today to come back.",
    "Dashboard: The Dashboard shows how the kitchen is going. Pick 7, 30 or 90 days. What changed says it in plain words, with a link to the report. The week ahead lists functions and order cut-offs.",
    "Item links: Item links is a review desk for the names the team writes. Tap a name to check its recipe or supplier item. This one already has its recipe. Tap Save and return to confirm the link.",
    "Proofreader: The Proofreader shows lines where autocorrect saved other words. Here, brie became brine. Tap Restore original to put back what was typed. Or tap Edit wording.",
    "Kitchen mail: Kitchen mail is what the team wrote to you, the most urgent first. Change how soon it matters with this chip. When it's dealt with, tick it off.",
    "Find: To jump to any page, tap Find. On a keyboard, press the slash key. Type a few letters of a page or a name. Tap it, and the page opens."
   ],
   "pv": 1
  },
  {
   "id": "admin-reports",
   "n": 20,
   "title": "Admin: Reports",
   "who": "chefs",
   "sum": "Here's how to read what the kitchen recorded, and follow it back to its source.",
   "len": 125,
   "steps": [
    "Insights: Insights reads the prep list over the last 30 days. Narrow it down by the days, a section, a person or a weekday. What stands out says what changed, in plain words. The tiles add it up, against the 30 days before.",
    "Records: Records keeps the nightly food safety count for every finished day. Each day says its deliveries, its cleaning and its cooling. Tap a day to read it: every delivery and cooling stage, with the time and who. Print it, or export it as a CSV file.",
    "Wastage: Wastage shows what was thrown out, and why. Pick the period, and the tiles add it up. History lists every entry. Summary adds it up by day and by reason. Export CSV saves it for a spreadsheet.",
    "Transfers: Transfers shows what other venues took from us, and what we took from them. Each venue has its own totals. Every transfer is listed below it, with the day and who wrote it.",
    "Team: Team starts with At a glance: what stands out about who worked where. Here, only Bo worked Sauce in the last 30 days. Tap See the table for who has worked where. Each number is the shifts worked in that section.",
    "Item evidence: Item evidence lists every recorded item, and where it came from. Tap one to read its evidence: how often it was written, on which days, and its recipe. The back arrow takes you to the list.",
    "Learning: Learning shows what the prep list has learned from the team. Every line written is counted. An item becomes a regular after four uses. The most written items come first."
   ],
   "pv": 1
  },
  {
   "id": "admin-kitchen",
   "n": 21,
   "title": "Admin: Team and Kitchen",
   "who": "chefs",
   "sum": "Here's how to set up the people, the day's team and the kitchen.",
   "len": 128,
   "steps": [
    "People: Team opens on People: everyone in the book. Pick a role for each person. Then tick what they can do: write, tick and remove lines. Create or edit functions sets who books functions. Fay has it. Reset PIN lets a person choose a new PIN. Do it with them there.",
    "Today's team: Today's team sets who is on each shift, their section and their break. Each row is one person, with their hours, sections and break. Choose roster file fills next week from the Humanforce roster. The days come in as drafts. Check each one, then save it.",
    "Kitchen overview: The Kitchen room opens on Overview. Each row says what it is set to. Tap it to change it. Kitchen sections opens in place. Shifts sets each service and its times. Pages staff see and the weekly top tickers are here too.",
    "Cut-offs and suppliers: Order cut-offs: tick the days each supplier delivers, and the time the order has to be in. The book reminds the team before each cut-off. Suppliers and pars opens the catalogue and the supplier order.",
    "Pings and minutes: Shift pings pop up on every phone at the time you set. Tap Write a ping to add one. Today's pings are listed under it. Minutes: write them after the meeting. The team reads them and signs with their own PIN. The register shows who has signed.",
    "Guides and links: Guides are the team's how-to sheets. Tap Add a guide to add one. Confirmed links lists every name linked to a recipe or a supplier item.",
    "Section standards: The Prep room holds Section standards: what each section should have ready before service. Pick a section, and set each item's minimum. Smart prep par levels turns it on for the whole team."
   ],
   "pv": 1
  }
 ]
};
