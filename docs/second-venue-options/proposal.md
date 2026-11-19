# Proposal: a second venue, its setup, and Add from AVC Live

19 November 2026, Queensland. Round 1 of the service council. No code yet. Role-based analysis, not research with staff.

## The problem in the kitchen

The head chef of another venue in the same hotel group (also in Queensland) has asked to use the Kitchen Book for his team. Today the book serves one kitchen only:

- one Firebase database, with one kitchen PIN and one owner email in the published rules;
- Leichhardt's recipes built into the code (`js/data.js`, about 175 KB, loaded on every phone and public);
- one set of server jobs (nightly learning, 03:30 backup, cut-off pushes every 10 minutes, rules publishing, the lock probe), all pointed at that database;
- the Queensland clock (the second venue is also in Queensland, so this stays).

The head chef (owner) has decided (19 Nov 2026, in chat):

- The second venue gets its **own database**. Its staff can change nothing at Leichhardt.
- The owner owns both databases and must be able to **see and manage everything** at the second venue.
- The second venue's head chef gets his **own head chef account** (his own Google mailbox plus his PIN), with **every feature** the owner has, from day one, for his venue only.
- He starts with an **empty recipe book**. The owner wants to help set it up, ideally with an **upload of AVC Live costed recipes** (the group's costing system) that turns a costing into a Kitchen Book recipe.
- The longer goal is the same base app for more of the group's venues. Not in scope now; the design should not block it.

## Who has it, how often

| Who | What | How often |
| --- | --- | --- |
| Second venue's head chef | Sets up his kitchen: sections, shifts, staff and PINs, suppliers and cut-offs, cleaning, prep standards, which pages staff see, recipes | Once (a few hours over some days), then occasional changes |
| Second venue's staff | Use the book in service exactly as Leichhardt's team do | Every shift |
| The owner | Maintains the one code base, sees and manages both venues, may load recipes for the new venue | Weekly; heavier during setup |
| Any head chef (both venues) | Adds dishes from AVC Live costings | New dishes, and each seasonal menu change (about 4 a year, 20 to 60 recipes each) |

## What people do today

The second venue cannot use the book. The setup pieces all exist, but scattered and unordered (measured on the click tests' stand-in, see the evidence packet):

1. Admin, Kitchen, Overview: **Order cut-offs** (0 suppliers), **Suppliers & pars**, **Kitchen sections** (None), **Shifts** (None), Shift pings, Minutes, Guides; **Pages staff see**, Weekly top tickers, Sous chefs read Kitchen mail, **Who books functions**; Backup, **Kitchen PIN**. "Each row says what it is set to. Tap it to change it."
2. Admin, Team, People: the staff list, roles, capability ticks, PINs.
3. Cleaning, Repeat tasks: "No cleaning tasks set yet." Import of the unbranded template is a chef's explicit action.
4. Admin, Prep: Prep standards (section minimums).
5. Manage Recipes & Drawings, New recipe: one recipe at a time, every ingredient typed (the form is 1450 px tall at 390 px).

That is at least 9 places with no order, no sign of what is still missing for a working book, and no way to bring recipes in except typing.

## The change (three parts)

**1. The second venue (mostly invisible plumbing).** Same code, same address. A phone joins a venue once through a join link and remembers it; the venue's name shows where "Leichhardt Hotel Kitchen" shows now. Leichhardt keeps `js/data.js`; the new venue's book comes only from its own database (the existing Firestore recipe and drawing documents, as the head chef's new recipes are stored now). Server jobs, backup, rules publishing and the lock probe run once per venue, each with its own secrets. Rules get an owner slot so the owner's verified Google plus his own PIN at that venue opens its admin panel, beside the venue's own head chef. Recipes stay public per venue unless the head chef decides otherwise.

**2. Getting a venue started.** Something that takes the new head chef from an empty book to a working one: what to set, in what order, what is done, what is missing, and where staff can start using it. Exact form is for round 2.

**3. Add from AVC Live.** In Manage, a head chef chooses one or many AVC Live costing PDFs (Print, Save as PDF). The phone reads them (the book already loads pdf.js 4.10.38 from jsdelivr for admin Guides; the security header allows that one folder), keeps only recipe name, kind, ingredient names, quantities, units, yield and links to sub-recipes, and never reads prices, GP or supplier codes. Each becomes a draft the chef checks before it joins the book. Method and allergens stay "To come" until written or tagged.

## Prototype evidence (owner's real cards, kept private, not in the repo)

A throwaway reader was run on 13 real AVC Live cards (19 Nov 2026). Facts, without prices or codes:

- Every card is a Chrome "Print to PDF" with a text layer; one or two pages; the ingredient table repeats its header on page 2.
- All 13 gave the recipe name, group (BATCH, MAINS, ADD ONS, SPECIAL, SCHNITZEL/PARMY, PLEASE SELECT, blank), portions, "This batch makes" yield, and every ingredient's quantity and unit (GRAMS, MLS, EACH, PORTION, PACKET). The reader used only the Product and Quantity/UOM columns by position.
- Sub-recipe rows carry the sub-recipe's AVC number, so links can be exact. Several sub-recipes already exist in Leichhardt's book under their AVC name (`avc` field), e.g. base gravy, pork belly and crackle, chip and salad portions.
- Supplier product names need tidying: pack sizes come off by rule, but brands and codes leak (a brand after "#" at the end of a name, or before the product at the start).
- **No card had allergens or a method.** Imported recipes would be "Allergens incomplete" until tagged.
- AVC leaves out zero-cost items: the gravy card has 120 g mix for 1 L and no water; the book's gravy is 1.2 kg mix and 10 L water.
- Two uploads were the same recipe (same AVC number).
- Odd lines exist (a 1 g line that looks mis-entered; "1 PACKET" of a portion). They must be flagged, not guessed.

## Cost

| | Estimate |
| --- | --- |
| Reads | Venue: none new at Leichhardt. Setup: reads the venue's existing config once a day (already read). Import: none until Save; Save writes one recipe document plus its public mirror per recipe (existing path). A second database has its own free 50,000 reads a day. |
| Files | Venue setting and join link in the startup (small); setup screen and AVC reader as lazy files; per-venue workflow matrix; rules owner slot. |
| Tests | Click tests as a second venue with an empty book; reader unit tests on synthetic cards (no real prices); rules emulator checks for the owner slot and that one venue's sessions cannot touch the other. |
| Rules | Stricter or equal for Leichhardt (owner slot adds no new reader); the second database gets the same template. |
| Risk | A phone carrying one venue's drafts, PIN session or cached data into the other; a recipe missing from a venue with no `js/data.js`; saved shell and App Check per database; release windows now affect two kitchens; staff seeing unfinished setup. |

## Design references to test

- **Todoist:** quick add with known defaults; the import fills what the card says and never guesses a unit or a match.
- **Duolingo:** progress shows real completed setup and a clear next step, not points.
- **Headspace:** calm plain words for a new head chef; never an onboarding interruption for staff in service.
- **Linear:** reuse the admin panel's frame and names; no second navigation.
- **Airbnb:** a recipe draft shows everything it needs (name, yield, ingredients, links, what is missing) in one place before it is added.
- **Things 3:** occasional settings tucked away once done; today's work stays first.
- Flighty: not relevant (nothing live or time-based in setup).

## Questions for round 1

Is each part worth building now, as proposed? What should be cut or deferred? What would most improve it?
