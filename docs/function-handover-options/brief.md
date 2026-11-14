# Function handover: a two-way check on what goes out

Status: **chosen 14 November 2026: the recommended mix, as a trial; built the same day.** Role-based analysis, not research with real staff.

## The request

The head chef, 14 November 2026: "For our functions service screen, can we make it that for functions, we can tick off what has been sent but still appears on the screen and functions person has to confirm it has gone out, like a 2 way check?" Then: "for functions that all go out at once a tick system for individual platters is missing."

Today (commit 5d92379): a cook taps **Sent** on a round of the service view (`#/fn/now`) and the round leaves the board at once; a "just sent" line with Undo sits under the board for 2 minutes. Nobody on the functions side confirms anything. An all-at-once function is one round with one Sent tick: all 14 platters of a wedding are sent, or none are, although the runners take them out over several trips. The Functions coordinator can tick Sent too.

Baseline: [baseline/](baseline/) (implemented app in the click-test stand-in, 18:10, 390 x 844): 4 rounds to go, 2 fit whole in the first screen, 3 start there; Sent is 1 tap and 84 x 48 px. `capture-baseline.cjs` makes it again.

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5),** unchanged by the head chef's addendum (5 of 5 again).

What every reviewer said, in short:

- **Cook:** a sent round kept full size stays at the top in time order and pushes the round to plate next down about 250 px each; a sent 18:00 row still saying 10 MIN LATE invites plating it twice. Fold each sent round to one line, under the rounds still to go.
- **Head chef:** the need is real but uncounted, and a check nobody sees just leaves rows on the board. Put Out on the band the coordinator already sees on Home; a chef confirms if nobody else does; one person must not do both halves.
- **Skeptic:** most of the gap closes by showing "Sent 18:10, Ann" on the coordinator's band. Keeping sent rows changes the live board's contract ("the rows still to go"), so it is the head chef's call. Name who acts when Out does not come.
- **New starter:** "Sent" is a status word on a button; three kinds of waiting (not sent yet, waiting for Functions, late) need different words and an icon. Each side sees only its own button.
- **Keeper:** cheap to run (no new listener; about 150 to 300 reads a night). Keep Sent driving To plate now, Late and the band; a compact waiting line, a chef fallback and an attention state on the existing 20-second redraw.

After the addendum (per-platter ticks):

| Reviewer | Kitchen granularity | Functions confirms |
| --- | --- | --- |
| Cook | Count per kind, with one tap for the rest of a kind (14 taps at most, 5 when kinds go whole) | Per kind, plus All out |
| Head chef | Per kind, one tap each; build ticking before the two-way check | Per round |
| Skeptic | Per kind; a count only after a tap on the kind | Per round |
| New starter | Count per kind ("2 of 4 sent") | Per round |
| Keeper | Count per kind, as a map of increments in the round's record | Per round |

Everyone: no row per single platter (up to 300 of a kind); keep one tap for a whole round.

Disagreement: where a sent round goes (under the board: cook, skeptic, keeper, head chef; folded in place: new starter), how fine the kitchen's tick is (kind: head chef, skeptic; count: the other three), and how fine Functions' confirm is (kind: the cook; round: the other four).

### Break-it findings from round 1

All **Risk / Not evidenced** (source review only; no build exists). Each becomes a check before the build is ready.

| Scenario | Expected | Hypothesis | Impact | Smallest repair or check |
| --- | --- | --- | --- | --- |
| Sent, Out, a chef takes Sent back, Sent again | Waiting for Functions again | `tickSent` saves with merge, so old `outAt`/`outBy` survive and the round shows as out | The check is skipped in the recovery case | Undo clears Out; rules refuse Out without Sent; emulator row for Sent, Out, Undo, Sent |
| A late round is sent, and "leaves the board" is built by making sent mean Out | Not Late, not in To plate now, the band moves on | One check (`isSentK`) drives the board, To plate now, Late, the band and the sheet | Platters plated twice, a false Late | Two checks, Sent and Out; a functions-board test for To plate now and the band |
| No coordinator on shift, nobody taps Out | Someone is told; the record says never confirmed | The row vanishes when the function leaves the list (`windowOf()`) | It looks like a safety check and proves nothing | Attention after 10 minutes, chef fallback, "Never confirmed" kept on the function's page and run sheet; test before and after the window ends |
| A held write (no signal in the Beer garden) | Not sent yet on that phone | `watchSent` ignores pending writes; `sentCell` shows the time at once | Out looks done on Fay's phone while the kitchen still waits | A Not sent yet state on both sides; offline cases in the stand-in |
| Two cooks tick the same round at once | Both ticks kept | A count list saved with merge is replaced whole: last writer wins | Platters shown unsent, sent twice | A map by platter, or increments, or separate records; a two-writer emulator test |
| A manager edits the platters after some are ticked | Ticks stay on the right platter | Lines are held by position | The wrong platter shows as sent | Key every tick by the platter's recipe id (the editor allows each platter once per booking: `js/fnedit.js`, `have[c.rid]`); a lowered count shows "4 sent, 3 booked" |
| Phones on the old code during the release window | No lost confirmation | Old code drops the round at Sent and can undo a round already out | Mixed boards for up to a day | Publish the rules first; old phones update at the next open; a rollback keeps the wider field list |

## Round 2: three designs

The designs, the night they show, the measurements, taps, costs and risks: [designs.md](designs.md). Previews: [design-a/](design-a/), [design-b/](design-b/), [design-c/](design-c/) (`build.cjs`, `capture.cjs`, `measurements.json`).

- **A, Waiting shelf** (changes the least): today's board; each platter kind is a tick; a round with everything sent becomes one line on a Waiting for Functions shelf at the end of the board; Functions confirms the round.
- **B, Three stages** (rethinks the flow): the board grouped by where the food is (To send, With the runners, Out) with counts; each kind is a line with +1 and Rest; Functions confirms each kind or All out.
- **C, Trips** (removes the most friction): what leaves the pass together is a trip; Send all is one trip, Send part sets a trip inside the row; each trip is a slip under its round; Functions confirms each trip.

### How they differ

| | A Waiting shelf | B Three stages | C Trips |
| --- | --- | --- | --- |
| Board layout | Today's rows, a shelf at the end | Grouped by stage, counts at the top | Today's rows, trip slips inside each row |
| Kitchen unit | A whole kind | A count per kind (+1, Rest) | A trip (Send all, or Send part) |
| Functions unit | A whole round | A kind, or All out | A trip |
| Part of a kind | No | Yes | Yes |

### Scores (1 to 10, six fresh reviewers, the same evidence)

| Reviewer | A | B | C | First choice | Recommended |
| --- | --- | --- | --- | --- | --- |
| Cook | 6 | 4 | 7 | C | C with A's shelf (and B's order for Fay) |
| Head chef | 6 | 4 | 7 | C | C; trips first, then the Out check once the night with no coordinator is named |
| Skeptic | 5 | 3 | 6 | C | C-led blend: a round moves to A's shelf once nothing is left; B's order for Fay only |
| New starter | 6 | 4 | 7 | C | C with word fixes; a blend does not beat C |
| Keeper | 7 | 4 | 6 | A | A; A with C's records could beat A |
| Screen designer | 7 | 4 | 6 | A | A-led blend: A's board, kind buttons and shelf, C's trip slips |
| **Total (of 60)** | **37** | **23** | **39** | C 4, A 2 | |

What decided it:

- **B last for everyone.** Only 1 round starts on the first screen and none fits whole; the wedding row has 10 buttons with +1 beside Rest; about twice the reads; increments can overshoot. Its words ("2 of 3 sent, 1 to go") and its order for Fay (what she must confirm first) were the parts worth taking.
- **C:** matches how runners work; Fay confirms what one runner carried; each trip a record that never changes. Against it: the waiting Rotary row held the top above the late wedding, so Send all sat at 592 px; 9 taps for three trips; Send part and Cancel were 24 px links.
- **A:** least to learn, the highest first action (349 px), the shelf keeps the first screen for work. Against it: no part of a kind, and Fay can confirm nothing until a whole round has gone, which is the head chef's addendum case.
- **Every reviewer** caught that the three coordinator previews still showed Fay the kitchen's send buttons, against round 1. The mix fixes it.

### Reference fit

| Principle | A | B | C |
| --- | --- | --- | --- |
| Flighty: now and next first | Works: the shelf keeps the top for work | Needs work: counts strip and stages push work down | Needs work: a waiting row above a late one |
| Things 3: open work apart from done | Works (shelf) | Needs work: sent kinds stay under To send | Works: a row shows only what is left |
| Airbnb: status and next action together | Needs work: a part-sent round has no confirm | Works for Fay (by kind) | Works: who, what, when and status on one slip |
| Duolingo: each tap answers truthfully | Needs work: Not sent yet drawn as a ticked box | Needs work: "3 of 3, not sent yet" | Works in the preview; double send Not evidenced |
| Headspace: one name, plain words | Works | Needs work: "Rest", "Out", "All out" | Needs work: "Send trip 3 (3)" |
| Linear: one frame, consistent actions | Works | Needs work: a second board order | Works |

### Contract fit (all three, before the mix)

| Check | Result | Evidence |
| --- | --- | --- |
| Surface purpose | Works | The charcoal live board and band stay; no new surface |
| State meaning | Needs work | Waiting is words and an hourglass, never green (works); Never confirmed wore the waiting hourglass though it is final; A's Not sent yet showed a ticked box |
| Words and non-colour cues | Needs work | One tick sent, two ticks out, hourglass waiting; names varied (Out, All out, Confirm out); the band's "11 MIN" had no word |
| Contrast | Works (Preview) | Lowest 5.8:1 (charcoal on orange, Waiting 11 min); others 8.8 to 16.9:1; dark mode and focus Not evidenced |
| Tap targets | Needs work | Buttons 44 px or more; text links (Undo, Send part, Cancel) 24 px |
| Roles | Fails round 1 | Fay's previews showed send controls |
| Service continuity | Needs work | Rows started in the first screen: A 2, B 1, C 3 (one with no kitchen work), today 3 |

### Break-it findings from round 2

All **Risk / Not evidenced** unless marked; previews are static.

| Scenario | Expected | Hypothesis | Impact | Repair or check |
| --- | --- | --- | --- | --- |
| Fay on the service view (all three previews) | Confirm out only | Send controls visible to her (**Checked in the static previews**); she mis-taps Send all | Platters still on the pass marked sent; the bride's Fruit platter never plated | Draw each role's controls; rules: coordinator-only staff cannot send, the sender cannot confirm their own trip except a chef's fallback; rows in `tests/roles.test.js` and `tests/rules/client-shapes.test.mjs` |
| Two phones send the same part at once (B, C) | One send | C: two trip records (id from time and person); B: two increments | 10 sent of 5; Fay asked to confirm a trip that never left | Trip id = round plus trip number, create only; the second phone gets Not saved; emulator test with two writers |
| The board redraws while a part trip is being set (C, and any picker) | Picks and focus kept | The `lk-fn` redraw in `js/app.js` replaces `#main` on each listener change and the 20-second timer (**checked in source**) | A lost tap, picks reset | Keep picks in module state, patch the row in place; a click test that fires `lk-fn` with picks set |
| Phones on the old code during the release (C) | The round shows sent | Old `sentRec()` reads only `fid_at` and cannot see trip records (**checked in source**) | Plated and sent twice | Write the round's old record `sent: true` in the same batch once nothing is left |
| Fay taps Out with no signal, a chef confirms, then Fay's write lands | One Out stands | Refused, or it overwrites who confirmed | Wrong name on the record | Out once in the rules; the later write is refused and says who confirmed |
| A late last round sent near the window's end | Waiting, then attention | The function leaves the board at `until` and shows Never confirmed early (**checked in source**) | A false Never confirmed | Keep a function with a waiting trip on the board until confirmed or Queensland midnight; fake-clock tests at `until` and midnight |
| Big counts (60 of one kind) | Quick to set | − and + cost one tap a platter | Slow part trips | A tap on a kind takes all of it; test a 60-platter fixture |

### Mix of all three

| From | Part | Take or reject | Why, and the principle |
| --- | --- | --- | --- |
| A | Shelf at the end of the board for what waits on Functions | Take | The first screen stays for work (Things 3, Flighty). Cook, skeptic, head chef, keeper, designer |
| A | Kind buttons, high in the row | Take, as the trip picker (the lead's synthesis) | One tap per kind, 44 px, plain checkbox (Things 3). Designer and keeper valued them |
| A | All or nothing per kind, confirm per round | Reject | Cannot send part of a kind; Fay cannot confirm early trips (the addendum case) |
| B | Fay's view: what she must confirm first | Take, for Fay only | Now and next for this person (Flighty). Cook, skeptic, designer |
| B | "2 of 3 sent, 1 to go" words | Take the wording | Plain (Headspace). Head chef, new starter |
| B | Stages, counts strip, +1 and Rest, increments | Reject | Fewest visible rounds, most buttons, double reads, counts can overshoot (Linear, Flighty) |
| C | Trips as the unit, a record each, Confirm out per trip | Take | Matches runners; Fay confirms what one runner carried (Airbnb, Duolingo) |
| C | Waiting slips in place at the top in time order | Reject | Holds the top above live work (Flighty). Moved to the shelf |
| C | Send part as a separate panel | Replace | The kind buttons pick a trip with one tap less; no panel to open |

Could all three beat the best single design? Yes, but only as "C's trips + A's shelf and kind buttons + B's order for Fay". B's board and increments cannot join: they fight the time order and C's records. The blend's conflict, sent food in two places, is settled by one rule: every waiting trip is on the shelf, and a row only says how much has gone.

### The combined preview and its review

[design-mix/](design-mix/), described in [designs.md](designs.md#the-mix-trips-a-shelf-and-tap-what-goes-combined-preview). Review status: **the lead's synthesis, checked by a focused follow-up from five of the six round 2 reviewers** (the head chef reviewer was not asked again; the mix adds no cost or need question). One part is the lead's own, not a reviewer's: A's kind buttons as the trip picker.

| Reviewer | Mix | Their best single design | Their remaining point (all applied in the preview unless marked) |
| --- | --- | --- | --- |
| Cook | 8 | C 7 | A pick must not wear a tick: a pressed button saying "In this trip". Send all at 617 px against today's 419 stays (not applied: the row is the late wedding) |
| New starter | 8 | C 7 | Words on the row while picked; clear picks at the daily lock and handover |
| Skeptic | 7 | C 6 | Double tap after a part send; stale picks shrink to what is left; the legacy write must not be refused true-over-true; big counts typed |
| Keeper | 8 | A 7 | "Created once" lives in the update rule (an identical repeat accepted, any change refused); the legacy write and Undo need their own rule paths; back up recent days only |
| Screen designer | 8 | A 7 | Keep the − slot from the start; a much stronger picked fill (now ink on paper, 16.9:1); Fay's real screen (now her own snapshot) |

Agreement: every reviewer who saw it scored the mix above their best single design.

## Recommendation

**Recommend the mix: C's trips + A's shelf and kind buttons + B's order for Functions.** The kitchen taps what goes and presses one button that says what it sends; each send is a trip; every trip waiting for Functions sits on one shelf at the end of the board, counted in the board's top line; Fay sees that shelf first, no send buttons, and one Confirm out per trip, also on her Home band.

Why it beats the others: it is the only option that does both halves of the request. It ticks platters off as runners take them, including part of a kind, which A cannot do. And Fay confirms each runner's trip as it lands, where A waits for the whole round. It keeps the late round at the top of the board, which C did not. B's layout lost on every count. Principles that help: Flighty (the work first, the waiting count visible but quiet), Things 3 (what is left apart from what is sent), Airbnb (who, what, when and status on one shelf line), Duolingo (the button says what it will send; nothing looks saved before it is).

Main downside: the first Send drops from 419 px today to 617 px on a late wedding row at 390 px, and only 1 round fits whole on the first screen (3 rounds to go, 2 start there). A whole round is still 1 tap. "Trip" is a new word for the team.

Also the head chef's choice:

- **Who confirms.** Recommended: the Functions coordinators and the people with the Functions tick; a head or sous chef after 10 minutes, saved as "confirmed by Sam for Functions". The sender never confirms their own trip.
- **No coordinator on.** Recommended: on a night with no coordinator, the chef fallback is the check. Otherwise trips stay orange and leave a "Never confirmed" mark.
- **The live board's contract** (`docs/design-patterns.md`: "the rows still to go") gains a waiting shelf. This is a deliberate change for the head chef's OK, not an accident.
- **Build order** (the head chef reviewer's advice): trips and part sends first, then the Out check, as two pull requests after the rules.

## Verification before it is ready

Implemented-app checks, none done yet:

- **Rules emulator**, every role (signed out, staff, lead, view only, Functions only, sous chef, head chef on a PIN, admin, shared tablet):
  - create a trip
  - an identical repeat is accepted; any change is refused
  - a second phone's same trip number is refused
  - coordinator-only staff cannot send
  - Out once, never on a void trip, never by the sender
  - a chef's Out only after 10 minutes by server time
  - Undo only before Out
  - the legacy round write: true over true, and Undo by someone other than its sender
  - the largest booking (12 kinds, 8 rounds)
  - old-client record shapes
- **Client shapes:** a row each in `tests/rules/client-shapes.test.mjs`. `tests/roles.test.js` opens the page for each role.
- **Click tests**, in `tests/functions-board.test.js` or a new file:
  - picks survive an `lk-fn` redraw and shrink when another phone sends
  - a double tap sends one trip
  - Not sent yet with no signal, on both sides
  - a refusal keeps the picks
  - Undo
  - Fay sees no send controls
  - To plate now leaves out what was sent
  - the band moves on
  - a round sent only by an old phone
  - the fake clock at the window's end, 10 minutes and midnight
  - a 60-platter kind
  - 390, 768 and 1280 px with no sideways scroll
  - the read budget
- **Remeasure the full app:** at 390, 768 and 1280 px as the cook and as Fay, with the real shell, against this preview. Say any difference.
- **Not evidenced in the previews:**
  - dark and high-contrast themes
  - keyboard focus
  - reduced motion
  - screen reader words for a picked kind
  - the nightly backup's cost as `fnsent` grows (back up recent days only)

## Chosen

**14 November 2026: the mix, as a trial.** The head chef: "Let's try this for now. Might change it later. Needs a trial run." The open questions went with the recommendation (no other answer was given; any of them can change after the trial):

- Functions coordinators and the people with the Functions tick confirm each trip. The sender never confirms their own trip.
- A head or sous chef may confirm for Functions 10 minutes after a trip was sent, saved as confirmed for Functions. On a night with no coordinator, that is the check.
- The rules go first, then the screens, in this one pull request (the session has one branch); the rules are published before the client merges.

After the trial, the head chef may change the words, who confirms, the 10 minutes, or take the confirm half off. Rolling back is a revert of the client: the trip records stay, and older code ignores them (it reads only each round's own Sent record, which the last trip sets).

## Built (14 November 2026)

What the kitchen sees is described in `docs/prep-book.md` (Trips and the two-way check); the code contract is in `docs/code-contracts.md` (Functions, Trips). Screenshots and numbers of the implemented app: [built/](built/) (`measurements.json`).

Differences from the combined preview, after the build:

- Each kind button keeps an empty 44 px slot for its − from the start (the screen designer's repair), so on a 390 px phone a kind sits on its own line more often: the wedding row with three kinds left is 410 px, not 363, and its Send all sits at 646 px from the top, not 617. With two kinds picked the row is 461 px and Send is at 697 px. At 768 and 1280 px all three rounds start on the first screen and two fit whole.
- A part-sent round's late words say "Due 18:30, 5 still to send" and the band says "All, the rest not sent yet", not "not sent yet" beside "9 of 14 sent".
- After a press the Send button rests for 1.5 seconds: "Sending trip 3..." while the server has not answered, "Sent trip 3" once it has. A refusal ends the rest at once, so a retry is never taken for a double tap. A trip waiting for the signal says Not sent yet on the shelf and never holds the button longer.
- For Functions people the band puts the function with the longest-waiting trip first (it was last, behind "+1 more", as a function with nothing left to send).
- A one-round function lists its trips under Next out on the sheet (Every round is not shown for one round).
- **After the head chef tried it (14 Nov 2026):** a tap on a kind puts in one platter, not all that is left, so one Fruit can go with another kind in one trip. Then, at the head chef's word ("instead of having take one away, add one to the kind"), the − became a **+** beside the kind: a tap on the kind puts one in or takes the kind out, + adds one more up to what is left and rests once all of it is in. The cost: a whole kind is now a tap per platter (4 Antipasto: 4 taps, not 1); a whole round is still one tap (Send all), and a kind of 10 or more still has its box to type the number. The three-trip wedding is 15 taps, not 7 (12 platter taps for the first two trips and 3 Sends, the last a Send all).
- Not done, kept for after the trial: typed counts are offered from 10 of a kind (not measured with real counts); the nightly backup still reads every `fnsent` record ever kept; no push or sound tells a coordinator a trip is waiting (no new listener or polling).

Implemented-app measurements (click-test stand-in, synthetic night at 18:35, 390 x 844, the tab bar taken off): cook 3 rounds to go, 2 start in the first screen, 1 fits whole; the waiting line at 250 px; first kind button at 418 px. Fay: the shelf first, her first Confirm out at 361 px, no send or pick buttons. Not measured: dark and high-contrast themes, keyboard focus order, a screen reader's words for a picked kind.

Checks run: `tests/fn-handover.test.js` (45 checks, the tap and + among them: picks, double tap, another phone's send, Clear, Send all with the round's tick, Undo, a refusal keeping the picks, no signal, Fay's band and shelf, the chef's fallback, after the window, 390, 768 and 1280 px, no explicit reads; the layout check fails on the first build, where the Not sent yet line did not wrap); `tests/rules/rules.test.mjs` (37 trip checks, 11 of them fail on `main`'s rules); `tests/rules/client-shapes.test.mjs` (6 rows, 9 sign-ins each); the existing function tests with Send and Undo in place of Sent.
