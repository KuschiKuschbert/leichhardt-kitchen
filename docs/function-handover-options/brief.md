# Function handover: a two-way check on what goes out

Status: council done, waiting for the head chef's choice (14 November 2026). Nothing in the app has changed. Role-based analysis, not research with real staff.

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

Scores, the mix and the recommendation: below, once the council has scored.
