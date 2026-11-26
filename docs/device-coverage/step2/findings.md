# Step 2 findings: the service pages on the kitchen's 1920 x 1080 screens

26 November 2026. Step 2 of the [device coverage plan](../../device-coverage.md). **Implemented app on the click-test stand-in, synthetic data, role-based review.** Nobody has watched a cook use these screens. Four fresh UX and interaction reviewers (Opus) each judged two pages from [the packet](packet.md), its 40 pictures and [metrics.json](metrics.json): Prep and Orders, Wastage and Transfers, Cleaning and Today's team, Home and the recipe card. They were told the head chef finds the screens read "nice and clean" from where the cook stands, so none proposes bigger text. **Nothing here is built. Every change is the head chef's choice.**

Evidence words: **Measured** is a number from metrics.json or the pictures' pixels; **Seen** is read off a picture; **Opinion** is a reviewer's judgement of feel.

## What works at 1920 (keep)

- The main job is one tap from every tab: Add a line, Add request, Log waste, Log a transfer, each in its page head, filled orange; the tick box leads every row (all four reviewers).
- Nothing sits over a list. Prep's section tabs sit beside the book and cost no height. Urgent reads at once.
- Home fits one screen, section and break first, each coworker once with "back 14:30". The recipe card shows title, yield and allergens beside the drawing on the first screen, checked allergens solid and unchecked dashed.
- Transfers: each loan is one bordered card with its Mark returned; "Mark returned when all of it is back" stops a part return being marked whole. Today's team: one row a person on one clock, the section picker one tap; the cut-off bar is loud for a real consequence.
- Touch against mouse changes almost nothing: rows are 1 to 2 px taller with touch (Measured). The book's two input branches render the same at 1920.

## 1. The functions band takes the top of the screen (all four reviewers)

On a busy afternoon the full band is **218 px** on Wastage, Transfers, Cleaning, Today's team and the recipe card (Measured). With the 132 px top bar that is 350 of 1008 px before the page starts. Prep already opens with the slim strip (44 px) and Orders with its fold (50 px).

| Page at 1920, busy | First item starts | In view | Quiet day |
| --- | --- | --- | --- |
| Wastage | 557 px | all 6 entries; about 8 fit | 339 px |
| Transfers | 604 px | all 3 loans; about 4 fit | 385 px |
| Cleaning | 641 px | 6 of 46 jobs | 423 px, 10 jobs |
| Today's team | head at 444 px (with the 68 px cut-off bar) | 1 whole person | head at 157 px, 3 people |
| Recipe card (Laksa) | 350 px | 3 of 5 Into the pan lines, no method | all 5 and step 1 |

The band is about platters; on these pages its orange Service view is among the loudest things in view, and "+1 more" hides a function beside about 900 px of empty band (Seen).

Candidates (none adds a button or pop-up, so service rule 2 is not touched; each changes a decision):
- **a. Orders' fold on these pages** (50 px, opens by itself for notices and a round due within the hour). Three of four reviewers led with it. Gains about 168 px: about 3 more Cleaning jobs, 3 people on Today's team, the whole of Into the pan. Changes 22 Oct 2026 (the full band on every page) and widens 23 Nov 2026 (the fold on Orders). Trade-off: Service view is two taps until food is close; the head chef staffs Today's team to functions, so on that page hidden names cost him more.
- **b. Prep's slim strip** (44 px). Changes 19 Nov 2026 ("other pages keep the band"). Trade-off: carries less; platters one tap away.
- **c. Use the side room from 1600 px** (the band beside the page, or one line a function across the width). A new look: round 2 designs first.
- Whichever: Cancelled, Moved, Changed, No signal and Could not load must stay in sight (band brief).

## 2. The section screen shows no more than the tablet (three reviewers)

The page column stops at 1240 px, leaving 340 px empty each side (Measured), and inside it the pages are the tablet's layout, wider:
- **Prep's notebook has a fixed height** of about 742 px, with 65 to 109 px blank under it: 9 complete lines of 18 at 1920, the same 9 as the tablet (Measured from the pictures). Letting it run to the bottom of the window gives 1 more line on a busy day and 2 on a quiet one, and touches no decision.
- **Prep's Handy page uses 40 % of the spread for two done lines**, with about 530 px of blank paper (Seen); "2 of 20 done" and "Done today (2)" say the same.
- **Orders** rows run about 1,083 px; the words end by x 813 and the ⋯ sits about 1,020 px from the tick (Measured). **Cleaning** rows run 1,166 px; the ▾ sits about 1,130 px from its box (Seen). A long reach, and a touch can land on the wrong row (Opinion).
- **The top bar is 132 px at 1920** against 64 px on a phone, for one row of controls (Measured). A whole-book question.

Candidates: wide layouts from 1100 px (Prep's sections running on to the right page with Done today folded; Cleaning's groups side by side; Orders at a reading width or with Used in on the item's line; the ⋯ and ▾ nearer their row). Each is a new look: round 2 designs first, gated at 1100 px so 768 and 390 stay as they are, and checked at the 1280 laptop.

## 3. Touch controls are drawn at mouse size (Prep, Orders)

On it is about 40 x 23 px and sits 12 px from Urgent; the tick box is about 30 px; the same with touch and with a mouse (Measured, drawn size only: tap areas not measured). The phone gets bigger controls because of its width, not its touch. Cost (Opinion): a reach from the bench marks a line Urgent for everyone. Candidate: switch the bigger controls on with `(any-pointer: coarse)`, which also reaches the tablet; `(pointer: coarse)` may never switch on, as the screens' main input is unknown. Trade-off: taller rows, against section 2. First measure the real tap areas.

## 4. Your own work is not first

- **Prep** opens on Grill and Sauce while the cook's head says "Lunch: Larder"; Larder starts at y 840 with 1 of its 5 lines in view (Seen). Candidate: the cook's own section first under All, as Cleaning already does. Check first what sets the section order today.
- **Home's "Your day" names nobody on a shared screen**: Ann's name is only in the greeting and the hat chip, so the next cook may read "Your break, Not set" as theirs until the screen locks (Opinion, untested). Candidate: "Ann's day" on shared screens only.
- **Home's "Larder 5 left"** is the quietest line, grey, bottom right, not marked as yours (Seen). Candidate: "Larder, yours" in words and weight, no new colour, quieter than the amber Too few band.
- **Home's Prep card moves**: Larder's row sits at about x 988 on a busy day and x 404 on a quiet one (Seen). Untested risk: a tap meant for Larder lands on a function if functions draw after the team.

## 5. Mistakes the pictures point at (one page each)

- **Transfers: which way the stock went is the quietest fact on a card.** "Borrowed from Riviera" and "Lent to Riviera" share one small heading; the In and Out pill colour-coding names is not drawn on the cards (Seen, confirmed in the source). Cost (Opinion): with a driver waiting, the wrong stock goes back. Candidate: the existing In and Out pill before each heading, no new colour.
- **Recipe card: no jump to Method at 1920.** The Allergens, Ingredients, Method and Pan chips show at 768 and 390, not at 1920; Method starts at about y 1170 on a busy day (Seen). Candidate: the chips on the trail row, which is empty at 1920. Check first why they are hidden there.
- **Recipe card: Keep screen on against the 10-minute lock.** A cook reading without touching may meet the PIN screen mid-batch, or the button may do nothing on a shared screen. Untested: check on a shared session.
- **Today's team: one person's controls span about 960 px.** + Break sits by the name near x 375, a set break's pickers end near x 1335, the section picker near x 692 (Seen). The same miss was repaired at 1280 before. Candidate: from 1100 px, the break pickers straight after the sentence, keeping 17 Nov's + Break by the name.

## 6. Said twice (small)

Transfers "3 still out" then a "Still out" heading; Prep "2 of 20 done" and "Done today (2)"; Today's team "Saved" four times, and its dock covers rows with nothing to save; Home's 14:00 three times; Cleaning's 167 px of words before the first job, "To do" on every row (some may be fixture setup). Wastage's total and bar cover 2 of 6 entries and leave out "12 ea", probably because the fixture's reasons are not the book's own (unconfirmed).

## Gaps in the evidence

- `rowsInView` in metrics.json counts rows the book clips and rows under a phone's docked Add button. Counted from the pictures: Prep 9 complete lines at 1920 (not 10 or 11); at 390 Prep 6, Orders 7, Wastage 3, Transfers 1 complete above the dock. Use the picture counts for before and after.
- No chef on a section screen (staff never see the cut-off bar, `cutWho()`); Cleaning with a screen section set; Today's team with a full roster; a long order day; Wastage with the book's own reasons; the tap areas of On it, Urgent and the tick box.

## Quick wins and the head chef's choices

Small, no earlier decision touched (each a quick check, then a pull request grouped by page):
1. Prep's notebook runs to the bottom of the window at 1920 (+1 to 2 lines).
2. Transfers draws its existing In and Out pill on each card.
3. Today's team's break pickers sit after the sentence from 1100 px.
4. The recipe card shows its section chips at 1920, once we know why they are hidden.

The head chef's choices:
- **A. The functions band** on Wastage, Transfers, Cleaning, Today's team and the recipe card: Orders' fold (recommended by three of four reviewers), Prep's strip, or as it is.
- **B. Use the room at 1920** (wide layouts from 1100 px for Prep, Orders and Cleaning): a council round 2 with designs, or not now.
- **C. Bigger touch controls** wherever touch is present: measure first, then decide.
- **D. Your own work first** on Prep (own section first) and Home ("Ann's day" on shared screens).
- The 132 px top bar at 1920 is a whole-book question for later.
