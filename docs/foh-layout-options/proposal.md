# Front of house layouts: the design study (26 November 2026)

The head chef chose a design study for two layouts on the front of house screen, from step 3 of the device coverage plan ([findings](../device-coverage/step3/findings.md), sections 5 and 7): "Form: platters beside" and "Shelf beside the rounds". Round 1 is replaced by that review and his choice to study them; this is round 2: a design frame, three designs, seven scorers. **Implemented app on the click-test stand-in, synthetic data, role-based review. Nothing built until the head chef chooses.**

## Who and where

Fay works front of house: Functions only, with the Functions tick (she books and changes functions), on the shared front of house screen, a 24 inch all-in-one at 1920 x 1080 (its window taken as 1920 x 1008; touch not known). The head chef's laptop is 1280 x 800. Phones (390) and the kitchen tablet (768) stay as they are. A screen set to 125 % is 1536 x 806.

## 1. The booking form (`#/functions/<id>`)

Today ([pictures](today/), `form-*.png`): The function (name; date and event start; guests and room), then Platters, When the platters go out, Service and dietary notes, Kitchen comment; the Save bar is docked at the bottom with the summary ("8 platters · 3 rounds from 14:10 · 40 guests") and Save. From 900 px each pair of boxes is capped at 288 px, so at 1920 the boxes end at x 946 in a column that runs to 1560. 7 of 27 fields are wholly above the Save bar at 1920, 3 at 1536 and 1280, 0 at 390; the form is 2.6 screens tall at 1920, 3.2 at 1280 and 4 at 390. Platters and When the platters go out are below the first screen at every size. The functions band (it ends at 402 px at 1920 and 366 px at 1536 and 1280 with a trip waiting) sits above it, and stays open while a warning is up (26 Nov 2026, #910); folding it on the bookings pages is "Not now".

Cost: a change to guests or round times means scrolling away from the platters and rounds it depends on (Opinion).

## 2. The service view's shelf for Fay (`#/fn/now`)

Today ([pictures](today/), `fnnow-*.png`, three trips waiting): the coordinator's confirmation queue comes first (22 Nov 2026, "Keep the coordinator's confirmation queue first"), full width above the rounds; for the kitchen, from 1100 px, the shelf already sits beside the rounds. Each waiting trip is a card of about 220 px (what went, large; sent and Waiting; since 26 Nov the dietaries and notes; Confirm out). With three trips the shelf fills the first screen at 1920 and every round still to go is below it. Two trips of the same function repeat its dietaries (since #910).

Cost: Fay confirms trips and watches what is coming; on a busy service the rounds still to go (with their countdowns and dietaries) are off the screen.

## Decisions these layouts must keep

- The coordinator's confirmation queue first (22 Nov 2026), in reading order; Confirm out the loudest thing, one tap, 44 px.
- The dietaries on every round (8 Nov 2026) and on each trip waiting (26 Nov 2026).
- The form's one Save bar with the summary and Save (the consistency sweep, step 3, 20 Nov 2026); typed times, never guessed (18 Nov 2026); Save off until something changes.
- No new pop-up, tab or top bar button on a service page without the head chef's OK.
- Phones and the tablet unchanged; one breakpoint per layout, tested at the breakpoint, 1 px either side, 1536 and 1920.

## Design references to test

Linear (the action beside its work), Things 3 (today's work in view), Flighty (now and next clear, nothing moving under a finger), Todoist (quick entry).
