# Today's team: occasional shifts like Smoker stay out of the way until someone is on them

15 November 2026, Queensland. Head chef request: "can we have the option to hide some shifts like smoker in the todays team admin part if needed and then add them when needed?" Clarified: "I would like to have the option to still have the shift in the whole system, but unless I put someone on smoker it is hidden." The pain: Today's team clutter (the Smoker tick box under Add staff, the Smoker chip in a person's details). Not the roster file, not Home.

**Status: round 1 Build smaller (5 of 5); round 2 designs in progress.** Role-based analysis, not research with staff. [Proposal](proposal.md), [evidence packet](evidence-packet.md).

## Round 1

Five fresh agents read the proposal, the evidence packet and the baseline screenshots (source `main` at `da18bf7`).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | Most of it is built: the grid already drops an empty Smoker column. Left: one tick box (+48 px at 390 px, none at 1280 px) and a chip that adds no row. Shape 1 only, with a "+ Smoker" that opens Smoker in one tap. Settle how the roster file treats a hidden shift first: a 10:00 to 15:00 roster time overlaps a 06:00 to 11:00 Smoker. |
| Head chef | Build smaller | Real but small. Hiding the details chip makes the rare job slower (5 taps to 6) and that chip is how a sous chef adds someone. Add staff only: one admin tick per shift, "Only when someone is on it", a "+ Smoker" link in place of the box, details chips as built. Start the saved overview's timeline at the earliest planned shift. |
| Skeptic | Build smaller | Most of it is done; on a laptop the gain is almost nothing. Behind one link the rare job gains a tap, so ask how often Smoker runs. Shape 1's choice, "Show on Today's team: Always / Only when someone is on it", for Add staff and the details chips only. The way back is one named tap in place, "+ Smoker", never a general More link; once shown for a date it stays shown; a hidden shift is never ticked by default. |
| New starter | Build smaller | Behind "More services", a new sous chef never learns Smoker exists. "Off" already means three things. Name it: "+ Smoker" in both places; in the details it puts the person straight on Smoker (Breaks, + Smoker, picker, choose: 4 taps, not 5). Add staff pre-ticks a service: it must never be a hidden one. |
| Keeper of the book | Build smaller | Cheap: no read, listener or rules change; one true/false on `config/main.kitShifts`, admin only. Keep it out of `kitShifts()` filtering and `off`, or a Smoker cook drops off Home (section follows the shift). `shClean` must keep the field, and an older saved copy strips it on any admin Save (mild: Smoker shows again). One "shown on Today's team" helper for both the screen and the Add handler. |

**Verdict: Build smaller, 5 of 5.**

**Cuts all five accept:**
- Shape 1 only: one admin setting per shift in Admin, Kitchen, Shifts, "Show on Today's team only when someone is on it". No rules change. Shape 2 (guess from recent plans) breaks Todoist's "nothing guessed"; shape 3 needs a rules change and locks the sous chefs out; shape 4 hides the shift from the whole book.
- Only the planner's choices change: the Add staff service boxes and (see disagreement) the details chips. The grid, Home, Your day, the On today board, the roster fill, Copy last weekday and `kitShifts()` stay as they are. A person on a hidden shift is always shown.
- The way back is one named tap in place, "+ Smoker", never a general "More services" link (a new sous chef would never learn Smoker exists).
- A hidden shift is never ticked by default in Add staff, and Add selected staff uses the same list as the boxes on screen.
- Once a hidden shift is shown for a date (someone on it, or "+ Smoker" tapped), it stays shown for that date, so a mistaken Remove can be undone in place.

**Disagreement:**
- The details chips. The head chef would leave them as built (hiding the chip adds a tap and it is how a sous chef adds someone). The cook, the new starter, the skeptic and the keeper would hide it too, with "+ Smoker" in its place; the new starter's version puts the person straight on Smoker (4 taps, not 5). Either way it changes the rule built today, "the details panel still offers every service" (`tests/team-shift-tabs.test.js` checks it), so it is the head chef's call.
- The head chef would also start the saved overview's timeline at the earliest planned shift; the others did not mention it.
- The skeptic would ask first how often Smoker runs (Not evidenced): if most weeks, hiding costs a tap most weeks.

**Break-it findings:**

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| A hidden default tick: Add staff ticks the chosen service, or else the first shift in Kitchen order (`tmShNow()`); Service for break tools can choose Smoker. If only the box is hidden, a whole group lands on Smoker unseen; Add selected staff reads `kitShifts()`, not the boxes on screen. | Checked in source (skeptic, keeper, new starter); the silent add is Risk / Not evidenced | One shown-list helper for the boxes and the Add handler; a hidden shift is never the default. Click test in `tests/team-quick-add.test.js`. |
| The roster file brings Smoker back: `services()` fills every shift a roster time overlaps. With the synthetic times (Smoker 06:00 to 11:00) a 10:00 to 15:00 cook also lands on Smoker. | Reproduced in node with synthetic shifts (keeper); real Smoker times Not evidenced | A head chef question: should the roster fill skip a shift set to show only when someone is on it? Its own small change with a node test row. |
| Controls vanish under the finger: Remove Smoker on the last person on it would hide the chip and the Add button that undoes it. | Checked in source; Risk | Keep a shown shift shown for that date; a remove-then-add click test. |
| The setting is wiped: `shClean` keeps only id, name, from, to and off, and the admin Save rewrites the list; an older saved copy strips the field. Two admin devices with Kitchen open: the later Save wins. | Checked in source (keeper) | Add the field to `shClean`; a test that a People save keeps it; Smoker showing again is the safe failure. |
| Hidden from Home: if the setting fed `kitShifts()` or `off`, a Smoker cook's section would vanish from Home. | Checked in source (keeper) | Keep it out of `kitShifts()` filtering; a Home test with a person on a hidden shift. |

**Out of scope, noted:** the stand-in's time boxes in Admin, Kitchen, Shifts show 12-hour times clipped ("03:00 PI") in the test browser's locale; the 24-hour rule says the book should show 24-hour times. Its own fix, after checking an Australian-locale phone.
