# The scorers' answers, as given (round 2, 26 November 2026)

Seven fresh agents, each with the same packet, frame, designs and pictures. Kept word for word; the lead's notes are marked.

## The head chef
Scores: form A 4, B 7, C 6; service A 7, B 6, C 5.

Structural, not cosmetic.

Value: nobody has watched Fay; how often trips stack is unknown. Mostly the shelf is empty and all three equal today. Build nothing: Fay scrolls, and no mistake follows because the kitchen sends. Modest gain, so keep it cheap.

Form: B (1.80 screens, platter rows in view everywhere; JS wrappers), C (CSS only, guests and 6 fields in view at 1280; no platter rows, a blank gap under Platters), A (my laptop unchanged).
Service, 1920 first: A (every Confirm out and next countdown in view at every width; one trip still shows 2 of 4 rounds, as today), B (4 of 4 with one trip; rounds jump from 1168 to 553 px wide when a first trip lands; overturns my 22 Nov decision), C (0 rounds whole at 1536; platters mid-row against the 14 Nov trial).

Take A's cards (Things 3: today's work in view) and C's four-across facts from 1150 (Todoist: known fields visible where I book). Reject B's shelf beside (Flighty: the board moves), A's form (nothing at 1280) and C's rows (Linear: Confirm out 1000 px from its trip).

Blend of all three: no. B's beside conflicts with C's full-width facts and A's cards. Split by page.

Recommendation: one CSS-only pull request, C's form plus A's service view, no decision changed. Downside: on my laptop the platters and round times stay below the first screen (B does better).

Contract fit: Works on surfaces, 48 px Confirm out, Waiting in words and icon, docked Save. Unresolved: B's tab order (brief says kept, frame says changes). Not evidenced: the 1280 form under a quiet band (all measured under 366 px), 4+ trips in A, touch, contrast, extra large text.

## The kitchen screen designer
Scores: form A 3, B 7, C 6; service A 8, B 5, C 6.

Implemented app, stand-in, synthetic data, role-based. Structural: one column, two columns, paired bands; cards, side column, rows.

Form, best first. B: both platter rows on the first screen at every width; guests and round 2 one scroll apart. Weak: guests off screen at 1280; needs wrappers in js/fnedit.js. C: guests in view at 1280, CSS only. Weak: platters cut at the dock; about 440 px dead gap. A: gains only at 1536. B beats C: platters everywhere, better at extra large text.

Service, best first. A: every Confirm out and the next countdown in view at all three widths. Weak: one trip leaves the shelf two thirds empty. C: one Confirm out column, scales best. Weak: rounds 0 of 2 at 1536 and 1280; label about 1,000 px from its button. B: rounds whole everywhere. Weak: rounds jump 615 px sideways as the shelf fills or empties.

Take A's trip cards (Linear: action beside its work) and B's form columns (Things 3: work in view). Reject C's rows (Airbnb: status and next action together) and B's service (Flighty: nothing moves on a live board).

Blend of all three: no. C's four boxes do not fit B's half column; cards and rows clash.

Recommendation: B's form with A's service view; departs from no decision. Downside: the laptop changes and it needs a build.

Contract fit: surfaces, worded Waiting and 48 px Confirm out Work. B's and C's service views are proposed changes (22 and 14 Nov). Not evidenced: rendered contrast, focus, touch, nested grid scroll. Tab order (WCAG 2.4.3): brief and B's CSS disagree; settle first. Shared risk: a second tap confirms trip 2. Remeasure with 4+ trips and 6 kinds.

## The cook mid-service
Scores: form A 5, B 7, C 6; service A 7, B 5, C 6.

Structural: platters and shelf move. Confirm out stays one tap. Form scrolls between guests and round 2's time: 2 today and in A, 1 in B and C.

Form: 1. B, platters beside the facts, 9 fields at 1920; weak: guests off screen at 1536 and 1280, wrappers unbuilt. 2. C, guests in view at every width; weak: 7 fields at 1920, as today. 3. A, laptop unchanged; weak: still two scrolls.

Service: 1. A, every Confirm out and the next countdown in view at all widths, each under its own platters; weak: one trip shows rounds 2 of 4, as today. 2. C, compact rows; weak: platters mid-row, Confirm out about 1,000 px from its trip name, rounds 0 of 2 at 1536. 3. B, best rounds at 1920; weak: they jump from x 376 to 991 whenever the shelf fills or empties.

Take A's cards (Linear: action beside its work); reject its form. Take B's form (Airbnb: time, guests, platters together); reject Fay's shelf beside rounds (Flighty: nothing moving under the eye). Reject C's rows (Linear); its form is the fallback.

Blending all three cannot win: A's cards and C's rows compete for one shelf; B's and C's forms exclude each other.

Kitchen: identical pixels on the stand-in. Shared risk, fixed by none: trip 2's Confirm out lands under the finger, so a double tap clears it from the kitchen's shelf. Check on real Firestore.

Recommendation: form B plus service A. Downside: B changes the laptop; remeasure once built.

Contract fit: service A Works. B and C need the head chef's OK (22 Nov, 14 Nov). Not evidenced: touch, contrast, Waiting N min, Not confirmed, 4+ trips, nested grid scroll.

## The new starter
Scores: form A 6, B 7, C 5; service A 8, B 6, C 6.

Is it structural? Yes. The form is one column (A), two columns (B) or paired rows (C). The waiting trips are cards (A), a side column (B) or one row each (C).

Form, best first
1. B. Strength: the platter rows show on the first screen at 1920, and the dietary notes sit high. Weakness: the round grid scrolls sideways inside its box (6 kinds by 5 rounds, and at extra large text). A platter column can hide there, and no picture shows a cue that it scrolls.
2. A. Strength: one reading order, like the phone. Weakness: the laptop stays as it is today, so Fay's two screens look different.
3. C. Strength: guests are in view at 1280. Weakness: at 1920 there is about 450 px of empty left column before the nut allergy notes. A new starter may think the form has ended.

Service view, best first
1. A. Strength: each trip sits in its own box with its own Confirm out, and every Confirm out is in view at 1280, 1536 and 1920. It departs from no decision. Weakness: the rounds drop about 280 px when a trip arrives, as they do today.
2. C. Strength: the Waiting pill sits right beside Confirm out. Weakness: the trip's name is 1,100 px from its button, on rows that look almost the same.
3. B. Strength: the rounds stay still when Fay confirms. Weakness: at 1536 the third trip is off screen, and Fay's board shows no count of waiting trips. In js/functions.js that count line is for the kitchen only.

Take and reject
- Take A's boxed trips (Airbnb: needs, status and action together).
- Take B's form columns (Things 3: the job in view).
- Reject C's paired form rows (Things 3: what stops a mistake must stay easy to find).

Blending all three: this means putting C's pill inside A's card. It gains little for a reorder and another combined preview.

Recommendation: B's form with A's service view. Together they depart from no decision. Main downside: the laptop form changes, and the grid needs a visible scroll cue, tested before release. B's build adds wrappers in js/fnedit.js, so it needs remeasuring once built.

Contract fit: Needs work. The surfaces are kept, and Waiting shows in words with an icon. I read "Confirming out...", the failed confirm and the form's red reason in the code only. No picture of any design shows them, so they are Not evidenced, and so are contrast and touch. Evidence: implemented app with each design's CSS, on the click-test stand-in with synthetic data, judged by role.

## The skeptic
Scores: form A 3, B 6, C 5; service A 6, B 4, C 5.

Mostly nice-to-have: at 1920 today every Confirm out shows; the service gain is read-only rounds. Form numbers all have the 402 px band open; normal booking unmeasured. Structural, not cosmetic.

Form: B (only one with platter rows on the first screen, one scroll; changes the laptop, Tab zigzags, js/fnedit.js wrappers need remeasuring); C (one scroll at 1920 and 1280, CSS only; 1920 fields as today); A (laptop untouched; gains nothing at 1920 or 1280).
Service: A (every Confirm out and next countdown at every width, 22 Nov kept; one trip gains nothing); C (Confirm outs always in view; rounds 0 of 2 below 1920); B (rounds never move on a confirm; Confirm outs lost below 1920).

Take A's cards (Flighty: now and next together) and B's form (Airbnb: guests beside platters). Reject C's trip row (Linear: Confirm out about 1,000 px from its trip label; departs 14 Nov).

Blend of all three: no; A's cards, C's rows and B's side shelf are rival shapes of one shelf. B's form plus A's service beats any single.

Break it:
1. Second tap (Reproduced, all designs). Source review: no Undo for Fay; the form's band repeats it. Fix in any choice: hold a confirmed trip in place.
2. B: the first trip shrinks rounds from 1168 to 553 px wide (Checked in the study).
3. B, four trips (about 220 px each): fourth Confirm out likely off screen (Not evidenced; test 4 trips).

Recommend A's service view, then B's form. Downside: the open band still hides round times; the laptop changes.

Contract fit: B (22 Nov) and C (14 Nov) propose departures, not violations. Surfaces and Waiting words Work; contrast, focus, touch Not evidenced. study.cjs not run.

## The keeper of the book
Scores: form A 5, B 5, C 7 (with wrappers; as previewed 4); service A 7, B 6, C 6.

Structural, not cosmetic.

Reproduced in a static replica of the form's order with each design's CSS (dock not exercised): B and C pin sections to fixed grid rows. New function: the Save bar lands above The function (B) or between it and Platters (C), and scrolls away. Restored draft: C drops The function below the kitchen comment, on the recovery path. A keeps order in every state.

Form: C first (take its bands, Airbnb: guests in view at every width, one scroll; not "CSS only": needs two pair wrappers, which keep reading order). B (9 fields at 1920; Tab zigzags; column wrappers would reorder the page). A (safe; no laptop gain). B and C round grids scroll sideways at 6 x 5 (touch Not evidenced).

Service: A first (take its cards, Flighty: every Confirm out and countdown in view at all widths, rounds move 33 px). B (rounds never move, but Out today keeps the shelf after the first confirm: rounds half width all shift, source only; reject, departs 22 Nov). C (fixed Confirm out column; 0 rounds whole at 1536; a pending confirm collapses its auto column).

No three-way blend: C's form covers A's; cards and rows exclude each other. Recommend C's form with pair wrappers plus A's service: no new reads, listeners or rules; app.css and fnedit.js. Downside: the second tap still lands on trip 2.

Before release, at breakpoint ±1, 1280, 1536, 1920: new, draft, restored, conflict, problems, review, All at once, Out today only, pending confirm, failed read, Waiting N min, five trips.

Contract fit: Needs work (those states; C departs 14 Nov). Packet and brief disagree on today's numbers; the packet cites missing files.

(Lead's note: the keeper's replica is a static copy of editHTML()'s top-level order with each design's CSS, in the session scratchpad; it found B: new function, head then Save bar then The function; B restored draft, Last changed below the kitchen comment; C new function, The function then Save bar then Platters; C restored draft, The function after the comment. It also flagged: the packet's today numbers (4 fields, band 270) came from the first measuring script; the packet cited today.cjs and metrics.json, now study.cjs and study.json; only 2 rounds are still to go in the fixture.)

## The UX and interaction designer (scoring)
Scores: form A 4, B 6, C 7; service A 7, B 6, C 5.

Role-based, not staff research; Implemented app plus design CSS, stand-in, synthetic. Structural, not cosmetic.

Form, weighted to the booking laptop:
1. C: guests in view at every width; one scroll to round 2's time, even with 6 kinds. Weak: no platter row first at 1920; about 430 px blank under Add a platter.
2. B: best short booking at 1920 (9 fields). Weak: 6 kinds means two scrolls again at 1280; Tab runs right, then back left.
3. A: safe; laptop unchanged.

Service:
1. A: every Confirm out and next countdown at every width; platters lead. Weak: one trip shows 2 of 4 rounds.
2. B: 4 of 4 rounds with one trip. Weak: the rounds jump 615 px sideways whenever the shelf fills or empties; 2 of 3 Confirm outs at 1536.
3. C: compact. Weak: Confirm out 750 px from its trip's name.

Take: A's cards (Linear: the action beside its work); C's form bands (Airbnb: guests, platters and times together). Reject: B's collapsing column (Flighty: Fay's reading place moves); C's trip rows (Linear; platters stop leading, 14 Nov).

Blending all three: no. B's columns fit neither C's four-across row nor A's full-width cards. The two-page mix beats any single design; no shared selectors, so the pictures stand.

Recommendation: form C, service A. Downside: no platter row on Fay's first screen; from 6 kinds the round grid scrolls inside its box (B too; the frame expected 12 by 8).

Contract fit: the mix Works, no decision departs; B's and C's service views need the head chef's OK (22 and 14 Nov). Not evidenced: touch, Tab order, 4+ trips, a second tap hitting trip 2's Confirm out (every design). Remeasure after building.

(Lead's note: long booking, 6 kinds x 5 rounds: B 2 scrolls, 791 px apart; C 1 scroll, 698 px. Booking contact in B sits inside The function's block.)

