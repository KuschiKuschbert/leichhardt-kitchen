# AI drawing in the studio: the council's study

Asked 17 Nov 2026. The owner has US$100 of Claude API credit and asked whether Claude could draw in the app, with a daily limit and a stop before the credit runs out. The round 1 proposal and evidence packet is [proposal.md](proposal.md) (source commit `70ce8f4`). This is role-based review by fresh agents, not research with real staff.

## Round 1 (18 Nov 2026)

**Verdict: Build smaller, 3 of 5.** The head chef and the skeptic said Don't build (not now).

**What all five agree on:**
- **Option 1 only:** Claude picks and places pieces from the book's own library, and the studio draws them.
- **Never option 2,** a whole new SVG drawing. It has no parts, so a saved plate would get no Pass labels, and the allergen lens reads those labels.

Three of five (the head chef, the skeptic and the keeper) say the same next step: prove it away from the app first.

| Reviewer | Verdict | Main reasons | The one change |
| --- | --- | --- | --- |
| Cook mid-service | Build smaller | Never in service, so no taps change. The benefit is Not evidenced. A confident wrong pick does more harm than a clumsy one. Keep one name, Draw it for me (Headspace). | Option 1 only |
| Head chef | Don't build (not now) | A small problem, mostly fixed on 15 Nov (98% matched, plating median 0.01). The credit is fine; the build is not: the first server code, a key, Blaze, a deploy workflow, rules and tests. The gaps are in the library more than in the layout. | Spend about US$5 offline first: Claude on the 10 worst dishes and the next specials, scored by `plating-check` and the head chef's eye. Claude also draws missing library pieces, checked by `library-check` in a normal pull request. |
| Skeptic | Don't build (not now) | Draw it for me already does this in 1 tap, with no wait and no cost. The cost is out of scale for an occasional job. The benefit is untested, and the faults left look small enough for the rules to fix. Linear and Headspace: a second Draw button with a second name. | A bake-off: the 10 worst plates in `tests/plating-check.js` plus 5 batch cards, AI against Draw it for me, scored by the check and the head chef's eye, with real tokens and seconds recorded |
| New starter | Build smaller | Two names for one job, and one of them costs money. A 5 to 20 s wait that can land unsaved, fail or be lost on Close. Wrong picks are remembered for the next recipe. | Option 1 only; say its wait, the count left and the result in words |
| Keeper | Build smaller | Reads are cheap: about 6 reads and 3 writes per drawing. The server is not cheap. Server code would make a second copy of the access check, outside the rules and their emulator tests. Option 2 breaks contracts. | An offline bake-off with the key kept off the book: option 1 on the 80 dishes, scored by `plating-check` and a blind pick by the head chef (about US$10 to 15). Build only if it clearly wins. |

**Disagreement:**
- The head chef and the skeptic would not build into the app now, only test offline.
- The cook, the new starter and the keeper would build option 1 if it is proved.

The keeper's Build smaller also puts the offline test first.

### Contract fit

| Check | Result | Evidence |
| --- | --- | --- |
| Service rules | Works | The studio is not a service page. No tab, bar button or pop-up on a service page is proposed. |
| No AI service (21 Oct) and the same seed gives the same drawing (15 Nov, `docs/code-contracts.md` Draw it for me) | Proposed departure, head chef's call | All five call it a deliberate change, not a violation |
| Security header | Proposed departure, head chef's call | `connect-src` would need the function's address |
| Pass labels come from a plate's parts (`docs/code-contracts.md`, Drawings made in the book) | Option 2 violates it; option 1 Not evidenced | Five of five |
| Keep until redraw | Risk | An AI plate marked as book-made at the current `lv` would be redrawn by the rules on the next recipe save (break-it 2) |
| After the tap, loading and motion | Not evidenced | No wait, failure or limit state exists to check |
| Save state on a phone | Works today, Needs work for a long wait | Below 900 px the state words are for a screen reader only (`css/app.css`, `.dw-top .mg-state`). The Save button's own word (Save or Saved) carries the state, so it is not colour alone, as one reviewer said. A 15 s paid wait has no visible words yet. |
| Site publishing | Needs work at build | `scripts/site-changed.sh` would count `functions/` and `firebase.json` as files the phones load (checked) |

### Break-it findings

All are **Risk / Not evidenced**: no AI code exists. Security detail stays at the level of outcome and fix.

| # | Scenario | Hypothesis and impact | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- |
| 1 | Head chef saves an option 2 drawing | No parts mean no Pass labels, so the allergen lens shows wrong information | Drop option 2 | Accepted by all five |
| 2 | An AI plate is saved, then a sous chef saves the recipe or a card it uses | `autoDraw()` / `redrawFrom()` replaces the paid plate and its hand fixes with a rules drawing | Give AI plates their own marker that autodraw skips; a case in `tests/autodraw.test.js` | Carry into any build |
| 3 | A slow answer: a second tap, Undo, Try another, Close, or the shared tablet locks | Two charges, a late answer over hand edits or on the next person's screen, and the day's slots used up | Button busy at once; a request id and the drawing's version checked before applying; the server ignores a repeat; a late answer is offered, not applied | Carry into any build |
| 4 | The server stops after calling Claude but before recording the cost | The US$90 stop drifts low | Reserve the worst case before the call and settle after; the day keyed to the Queensland date (test 13:59 and 14:00 UTC); a unit test with a mocked API | Carry into any build |
| 5 | A bad release of the function | A git revert does not stop a deployed function | An off switch on the server and a key revoke step | Carry into any build |

### What was checked

- Both node checks were re-run by the lead and the skeptic: 98% matched, plating median 0.01, none over 2.
- The phone save-state and site-publishing claims were checked in source (above).
- Not evidenced:
  - the quality, wait and real token cost of an AI drawing
  - how many drawings are made each week
  - whether Blaze is on
  - the 50 batch cards, side views and builds, which `plating-check` does not cover

### Lead's recommendation

**Run the offline bake-off before round 2.** Round 2 would design the studio's AI button. Three reviewers say not to build that until AI is shown to beat Draw it for me, so designing it first would waste work.

The bake-off:
- Option 1 only.
- The 80 dishes are scored with `plating-check`.
- The 10 worst dishes plus 5 batch cards are shown side by side, unlabelled, for the head chef's pick.
- Real tokens, seconds and dollars are recorded for each drawing.
- About US$10 to 15 of the credit.
- The key goes through the cloud session's secure credential form, or stays on the owner's computer. It never goes in the repo or the book.

If AI clearly wins, round 2 designs the studio piece with break-it 2 to 5 built in. If not, the credit goes to the head chef reviewer's other idea: Claude drawing missing library pieces, checked by `library-check` in normal pull requests, with no server.

**Head chef's choice (24 Nov 2026):** the bake-off first.

## The bake-off

Built and ready to run: `scripts/ai-bakeoff/` (how to run it, what Claude is sent and its limits: its `README.md`).

- **What it does.** Claude lays out each of the 81 plated dishes from the book's own parts and library pieces (option 1). The prompt gives it each dish, its method, what Draw it for me draws today, the servingware names, the library and the house style measured from the 76 hand-made plates.
- **How it is scored.** Each plate is scored with the same measures as Draw it for me's own gate (`tests/plating-check.js`, which now also measures a drawing made elsewhere). A self-test turns six of the book's own plates (among them the four worst) into answers and back, and each scores exactly the same.
- **Cost and limits.** A hard cap stops it before US$15. About 21,000 tokens of the prompt are cached and each dish adds about 1,000. Real cost and wait per plate are recorded.
- **The blind pick.** 15 dishes (the 10 Draw it for me draws worst, and 5 more) side by side, left and right shuffled (`docs/ai-drawing-options/bakeoff/blind.html` once run). The head chef sends back a code.
- **Blocked on the key.** A Claude API key cannot be a network secret in the cloud environment. It can only be an environment variable there (readable by every session and command in it). On the owner's own computer it need not be saved at all: `run.js` asks for it when it starts, hides the typing and keeps it in memory for that run only (24 Nov 2026).
- **Left out on purpose.** Pans, side views and builds: a batch card's pan is drawn from the card as one part, so there is nothing to place.
