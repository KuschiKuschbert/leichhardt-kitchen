# Step 3 findings: Functions on the front of house screen

26 November 2026. Step 3 of the [device coverage plan](../../device-coverage.md). **Implemented app on the click-test stand-in, synthetic data, role-based review.** Nobody has watched a functions person use this screen. Three UX and interaction reviewers (Opus) each judged two pages from [the packet](packet.md), its 30 pictures and [metrics.json](metrics.json): Fay's Home and the Functions list; the service view and a function's page; the bookings list and the form. **Nothing here is built. Every change is the head chef's choice.**

Evidence words: **Reproduced** is checked in the app on the stand-in; **Measured** is a number from metrics.json or the pictures' pixels; **Seen** is read off a picture; **Source** is read in the code, not run; **Opinion** is a reviewer's judgement.

## What works at 1920 (keep)

- **The service view fits one screen** with no band above it: the trip waiting to be confirmed, Confirm out and all three rounds with their countdowns and dietaries end about 980 px down a 1008 px screen (Measured). Confirm out is the loudest thing on it, white and 48 px on the dark board, and it is the action with the consequence (Seen).
- The coordinator's waiting shelf comes first (22 Nov), dietaries are on every round and the prints sit at the end (8 Nov) (Seen).
- Today's cards on `#/fn` sit two across at 1280 and 1920; on a quiet day the band drops to 97 px (Measured).
- The bookings list fits: 3 of 4 rows in view, 1.16 screens; search and Coming up share one row (22 Nov) (Measured).
- The form's Save bar says "8 platters · 3 rounds from 14:10 · 40 guests" and Save stays off until something changes (Seen).
- Touch and mouse pictures match: nothing depends on hover.

## 1. One tap hides Confirm out for the day (Reproduced; two reviewers)

On every page that keeps the full band (Fay's Home, `#/fn`, a function's page, the bookings list and the form), the band's minus folds it for the rest of the kitchen day on that screen (`lk.fn.fold`), even while a trip waits for Fay. Folded, the line reads "14:50 Birthday 60th", with no Confirm out, and it stays folded after a reload. On the fold pages (Orders, Wastage and the rest) the minus is switched off while a trip waits. Checked on the stand-in at 1920: on `#/fn` and Home, Confirm out was there, one tap on the minus, gone, and still gone after a reload; on Wastage the minus was off and Confirm out stayed.

Cost: on the shared front of house screen one brush of the 36 px minus leaves the service view as the only place to confirm a trip, and the trip waits until a chef confirms it after 10 minutes (Source).

Candidate (inline, no pop-up): a trip waiting for this person, or any other warning, keeps the band open on every page, as on the fold pages, with a 44 px tap area on the minus. This narrows 22 Oct 2026 (Hide folds the band for the day).

## 2. The trip Fay confirms shows no dietaries (Source)

"3 gluten free, 1 vegan. Nut allergy at table 4" sits under round 2 on the service board, about 290 px below the trip Fay is confirming; once a function's last round is sent, no round row is left to show it (`shelfHTML()` draws no notes).

Candidate (inline): the Dietaries and notes line under each waiting trip. Extends 8 Nov 2026 (dietaries on every round).

## 3. `#/fn` says things twice (Seen, Measured)

- Two different "next" times for one function: the band says "14:10 Birthday 60th, Waiting" (the trip), the card says "Next out 14:50 Round 2 of 3".
- Club lunch's "14:30, 4 × Antipasto" shows three times on one screen; Service view twice (band and page).
- About 210 px of title and two hint lines sit above Today; the first card starts at 694 px, 2 of 4 cards in view at 1920, 0 of 4 at 1280 and 390 (Measured).

Candidates (inline, no decision touched): the card's Next out line names a waiting trip; a one-round card drops the repeated time and platters; "Up to date" moves onto the Today heading line; the band leaves out its Service view on `#/fn`.

## 4. A function's page leads with the kitchen's job (Measured)

The dark Next out panel comes first; the dietaries come after Every round and Kitchen comment, below the first screen at every size (the first round starts at 939 px at 1920).

Candidate (inline): the notes under the date line; from 1100 px, Next out and Whole function side by side (about 95 px back, Opinion).

## 5. The form uses half its column (Measured)

7 of 27 fields in view at 1920 (4 at 1280, 1 at 390); 2.55 screens tall. From 900 px each pair of boxes is capped at 288 px, so the boxes end at x 946 in a column that runs to 1560; Platters and When the platters go out sit below the first screen at every size. Cost: a change to guests or round times means scrolling away from the facts it depends on (Opinion).

Candidate: from about 1150 px, Platters and When the platters go out beside the boxes, as the recipe editor's ingredient panel (22 Nov). A new layout: the head chef's OK.

## 6. Small targets on a screen that may be touch (Measured)

Under 44 px at 1920: the band's Service view and minus, the Tomorrow row, Home's Open functions, the board's function names, and the form's TBC and Not known yet ticks (labels 40 px). It costs only on touch, and whether this screen is touch is not known.

Candidate (a fix): 44 px tap areas, the text the same size.

## 7. Smaller ones

- **Home is loudest about the wrong thing** (Seen, Opinion): Manage functions is a filled button, Fay's daily page is an underlined Open functions link, and a large Recipes docket repeats the top bar's Recipes. Candidate: Open functions and Manage functions as equal buttons in one row, a Recipes line instead of the docket for Functions-only people.
- **On a busy day Fay's shelf pushes the rounds down** (Opinion, from pixels): each waiting trip takes about 150 px; three would push Still to go out to about 870 px. Candidate: from 1100 px the shelf on the left and the rounds on the right, the shelf still first in reading order. Changes 22 Nov (side by side for the kitchen only).
- **The full band above booking work** (Measured): 262 px, 26 % of the screen at 1920. Candidate: the bookings list and the form open with the band folded, as Orders does. At 14:00 here it would stay open anyway (a round within the hour, a trip waiting, a kitchen comment), so it saves room only at quieter hours; untested. Changes 22 Oct as extended 23 and 26 Nov.
- **The Room field is said twice** (Seen): a box, then a two-line "Choose Room, area or table (optional) ▾" pill. It comes from the shared picker (`js/controls.js`), so a change reaches every field of that kind: a quick check against `docs/adaptive-controls.md`.
- **Fiftieth use:** the two different "next" times on `#/fn` will wear worst (Fay learns to trust one of them, and it may not be the band); the intro sentence above the service board helps only the first time.
