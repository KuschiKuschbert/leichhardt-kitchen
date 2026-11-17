# Proposal: the mascot at the finish line of Orders, Functions and Cleaning

17 November 2026, Queensland. Round 1 of the service council for three pages at once, because they would share one pattern. No code, no design yet.

## What the owner asked

"Can you think about how to make the mascot smarter across the core?" Offered a plan (he talks on Home; on each work page he turns up only at that page's own finish line), the owner chose Orders, Functions and Cleaning for a short council each, not Transfers (`docs/mascot-voice-options/brief.md`, Across the core). They also chose to build design A on Prep (today finishes today) and to ship the Home welcome he says.

## The pattern it would reuse

The finished prep list's card (`docs/kitchen-mascot.md`, Under a finished prep list; `docs/design-patterns.md`, Finished-list card and Finished words wide): when every line of the view is done and the server has every tick, the page's own "done" sentence becomes a card: the words in the done green speech shape, the mascot beside them (48 x 64 px on a phone), or on a wide screen the words large with him under them. A state worked out on every draw from what the page holds, never from a cached or refused read. Nothing while a line is left or waiting to be sent. One play, once a kitchen day per device, on the screen whose tick made the finish; a still everywhere else. Not a control. Words never wait for his art. No read, write, listener or setting.

## The three finish lines

| Page | Who sees it | What the page says at the finish today | What he would add |
| --- | --- | --- | --- |
| **Orders** (`#/orders`, today's request list) | Everyone who uses Orders; chefs tick lines ordered, staff add requests | "Everything on this list has been ordered. See Ordered today below." in the page | The card: "Every line ordered. 8 of 8." with him, when every line of today's order list is ticked ordered and the server has every tick (idea 8 of the cheer study) |
| **Functions** (`#/fn/<id>`, `#/fn/now`) | The kitchen and function managers on the day | On the function: "All 3 rounds sent, last 19:40, Sam". On the phone that sent the last round: the slip "Smith wedding all sent. Taken off the lists: ..." with Undo | "Every round is out." with him on that function's page once every round is Sent and the server holds it (`allSentAt()` in `js/functions.js`, the same rule that takes its lines off the lists). Never per round (idea 6) |
| **Cleaning** (`#/cleaning`, held back from the team until switched on) | Whoever does pack down at close | The pack down list, ordered by section; each job ticked or marked Unable to complete | "Kitchen is packed down. Good night, team." with him when the last pack-down job of the day is recorded (idea 5). Never on a cooling record or a check that failed |

## What it would not do

Not on Recipes, Wastage or cooling (quiet zones, a face there reads as a blessing on food safety). Never over a list, never beside Undo, never while a line is left or Not sent, no sound, no new read. Transfers was not chosen.

## Cost (rough)

`js/prep.js` (Orders and Cleaning draw), `js/functions.js` (the function page), `css/app.css` only if the card needs a variant; `js/mascot.js` (18 KB) and one still (about 45 KB) load the first time one of these finishes, from the browser's cache after. Tests for each page at 390, 768 and 1280 px, roles, a held write, Undo, another screen's tick. Changes no rule the owner has not already accepted for Prep.

## Design references to test

Duolingo (progress shows real finished work, with a clear next step), Flighty (from data already held; no stale status shown as live), Things 3 (today's work in front), Headspace (calm, short words; one name for each thing), Linear (one pattern in one frame).
