# AI drawing in the studio: round 2 evidence packet

Source commit: `496878c9` (main, 26 Nov 2026). Every round 2 reviewer gets this same file. Pictures are in `docs/ai-drawing-options/round2/shots/`: open them with the Read tool.

## 1. What round 2 designs

How a head chef or sous chef gets **Claude to lay out a plate drawing** in the drawing studio (`#/manage/draw/...`), and keeps or discards it.

- **Scope the evidence supports.** Option 1 only: Claude picks and places the book's own library pieces and the recipe's own parts. It never draws new SVG. Plated dishes only: pans, side views and builds were not tested, so any design that offers them is Not evidenced.
- **Boards.** The head chef picked "neither" on 3 of 4 boards. A design that offers AI on boards must say so plainly.
- **Who.** Head chef and sous chefs (recipe and drawing management). Nobody draws during service. It happens when a dish is added or changed: menu changes, specials, a plate redrawn.
- **Draw it for me stays.** It is instant, costs nothing and works with no signal. Nobody has proposed removing it.

## 2. Round 1 (18 Nov 2026): Build smaller, 3 of 5

- Cook, new starter and keeper: Build smaller. Head chef and skeptic: Don't build (not now), and test offline first. The offline bake-off has now been run (section 3).
- **All five:** option 1 only. Never a whole new SVG drawing, because it has no parts, so no Pass labels, and the allergen lens reads those labels.
- **Headspace and Linear (cook, skeptic):** one name, one way to draw. Avoid a second Draw button with a second name.
- **The five break-it risks.** All are Risk / Not evidenced, because no AI code exists yet.

| # | Scenario | Hypothesis and impact | Smallest repair or check |
| --- | --- | --- | --- |
| 1 | An option 2 drawing (whole SVG) is saved | No parts, so no Pass labels, so the allergen lens is wrong | Option 1 only (accepted) |
| 2 | An AI plate is saved, then someone saves the recipe or a card it uses | `autoDraw()` / `redrawFrom()` replaces the paid plate and its hand fixes with a rules drawing, silently | AI plates carry their own marker that autodraw skips; a case in `tests/autodraw.test.js`. **This changes the Keep until redraw contract (section 5): a proposed departure for the head chef.** |
| 3 | A slow answer meets a second tap, Undo, Try another, Close, or the shared tablet locking | Two charges; a late answer lands over hand edits or on the next person's screen; the day's slots used up | Busy button at once; a request id and the drawing's version checked before applying; the server ignores a repeat; a late answer is offered, not applied |
| 4 | The server stops after calling Claude but before recording the cost | The spend stop drifts low | Reserve the worst case before the call, settle after; the day keyed to the Queensland date; a unit test with a mocked API |
| 5 | A bad release of the server piece | A git revert does not stop a deployed function | An off switch on the server and a key revoke step |

## 3. The bake-off (run on the owner's Mac, 26 Nov 2026)

Claude (Opus 5.5, effort medium) laid out all 81 plated dishes from the book's parts and library. The head chef then picked blind on 15 dishes, with left and right shuffled. Full numbers: `docs/ai-drawing-options/bakeoff/summary.md`. The pairs as pictures: `shots/pairs-1.png` (1 to 8) and `shots/pairs-2.png` (9 to 15), Claude on the left, Draw it for me on the right.

**Blind picks: Claude 10, Draw it for me 1, neither 4 of 15.** The plating-check score is against the house style of the 76 hand-made plates; lower is closer.

| # | Dish | Picked | Draw it for me score | Claude score |
| --- | --- | --- | --- | --- |
| 1 | Grill Maiden's Board | Neither | 0.76 | 0.50 |
| 2 | Philly Cheesesteak Loaded Potato | Claude | 0.00 | 3.54 |
| 3 | Pizza Platter | Neither | 1.28 | 0.15 |
| 4 | Fried Chicken Wings | Neither | 0.03 | 1.99 |
| 5 | Guacho Taco Share Board | Claude | 0.98 | 2.86 |
| 6 | Wedges | Claude | 1.15 | 0.53 |
| 7 | Haloumi Tacos | Claude | 1.00 | 4.71 |
| 8 | Seafood Platter | Claude | 1.53 | 3.44 |
| 9 | Yumcha Platter | Claude | 0.90 | 1.15 |
| 10 | 500 g Rump | Claude | 0.00 | 0.25 |
| 11 | Sticky Toffee Pudding | Claude | 0.07 | 0.42 |
| 12 | Kids Spaghetti Bolognese | Draw it for me | 0.00 | 0.19 |
| 13 | Butchers Board | Claude | 1.39 | 0.44 |
| 14 | Aussie Platter | Claude | 0.87 | 3.46 |
| 15 | The Beast Board | Neither | 1.07 | 2.58 |

- **Over all 81 dishes,** the plating check scored Claude worse: median 0.44 against 0.01. 47 dishes were worse by more than 0.1, 6 better and 28 the same. 12 were over 2, against 0 for Draw it for me.
- **The disagreement, raw.** 8 of the 10 plates the head chef picked as Claude's scored worse than Draw it for me's. The faults the check gave Claude's picked plates:
  - Haloumi Tacos: overlap of haloumi and corn 64%, lime aioli a long stick, 7 extra copies.
  - Philly potato: overlap of brisket and capsicum 54%, caramelised onion big against the main.
  - Aussie Platter: overlap of meatballs and quiche 37%, 6 extra copies.
  - Seafood Platter: overlap of oysters and whiting 29%, 8 extra copies.
  - Taco board: pico de gallo and avocado big against the main.

  Judge for yourself whether the check or the eye should decide.
- **What Claude left off that a guest sees** (Check: "in the recipe but not on the plate"): the maple butter on the Butchers and Beast Boards, the chilli jalapeño butter on the corn, and the gravy with the chips. It was rightly left off on others: the adobo's cooked-in vinegar, onion and peppercorns, and the pie mix inside the pie. Draw it for me had 1 such dish, Claude 7.
- **Reliability.** 81 of 81 answered. None failed, none was handed to another model, and none named a piece that does not exist.

**Cost and wait (measured).**

| | Cost a plate | Wait |
| --- | --- | --- |
| Warm: calls back to back, the 21,000-token prompt read from cache | median US$0.03 (US$0.011 to 0.06) | median 9 s, slowest 10% over 15 s, at most 23 s (boards the slowest) |
| Cold: one tap after more than 5 minutes, the prompt written to cache again | US$0.19 (measured once: the first call of the run, Wedges) | 10 s on that call; not measured more |

In the studio, taps are minutes or days apart, so most taps would be cold, about US$0.19. US$100 is then about 500 single taps, or about 3,000 plates when many are drawn in one go. A smaller prompt, with only the pieces near the dish's ingredients, would cut the cold cost. That is a build choice, not measured.

## 4. Where the Claude call could run: facts, not a pick

The API key cannot be in the book (the repo and site are public). Three paths:

| Path | What the chef sees | What it needs |
| --- | --- | --- |
| A Cloud Function the studio calls | An answer in about 9 to 23 s | Firebase's pay as you go plan (Blaze; Plan C was chosen 13 Nov 2026, not recorded as switched on); a new `connect-src` entry in the security header (a head chef decision); the session and role checks written again in server code, outside the rules and their emulator tests (round 1 keeper's concern); a deploy step; an off switch |
| A request saved through `W()`, picked up by a GitHub Actions job | The answer comes later. GitHub runs its 10-minute schedule only 3 to 7 times a day, so "later today", not seconds | The key as an Actions secret, like the existing secrets. The rules already check who may write, so no new access code. No security header change |
| The nightly 03:00 job (`nightly-learning.yml`) | "Ready tomorrow" | The same as the Actions path. Many plates in one run keep the cache warm: about US$0.03 a plate |

Each path's result has to come back as a drawing the studio opens: today's drawings are Firestore documents (`drawings/<id>`) read through the book.

**Prerequisites that stay the head chef's call:**
- Firebase's pay as you go plan (Blaze), for the Cloud Function path only.
- Reversing the head chef decisions of 21 Oct ("Draw it for me: plain rules on the device, no AI service") and 15 Nov ("without any AI for now").
- Any security header change (the Cloud Function path).
- The autodraw marker (risk 2), which changes Keep until redraw.

## 5. The studio today (Implemented app, stand-in, commit `496878c9`)

Pictures: Haloumi Tacos after Draw it for me, signed in as the head chef, at 390 x 844 (touch), 768 x 1024 (touch), 1280 x 800 (mouse) and 1920 x 1080 (touch): `shots/today-haloumi-390.png`, `-768`, `-1280`, `-1920`. The empty plate before Draw it for me at 390 px: `shots/today-empty-390.png`.

- **Today's taps for a plate:** open the drawing slot, Draw it for me (1), Save (1), plus hand fixes (these vary). Draw it for me draws in under a second.
- After it draws, a note on the canvas says "Drawn by the book: <style>." with Undo, Try another and a close ×. The bar at the thumb has Add food, Plate, Check (with a count badge when something needs a look) and More.
- On a phone the state words ("Not saved yet. Kept on this device.") are for screen readers only, and the Save button's own word carries the state (Save, Saved). From 900 px the words show in the top bar.

## 6. Contract excerpts

### Draw it for me and Keep until redraw (`docs/code-contracts.md`, Draw it for me)

Draw it for me (`js/smart.js`): plain rules on the device, no AI service and no new reads beyond one `getDoc` of `book/matches` when the editor opens (and one of the plate drawing when a side view is drawn). It plugs into `js/draw.js` only through `smart('tools')`, `smart('panel')`, `LK_SMART.ui.cmd`, `LK_SMART.match`, `teach` and `pendingOps()` (the picks ride in the drawing's save batch). The same recipe and seed must give the same drawing: use `LIB.P.rng`, never `Math.random`. Keep the matcher at 85% or more on the book's dishes (`node tests/smart-match.js`); a new library piece with a clear name and search words is the usual fix for a miss. The side view's labels go above each part (`labelAbove()` in `js/draw.js`), like the book's own side views; the plain side shapes are `side-profile-<side.s>` in `js/lib/build.js`.

**Keep until redraw (head chef, 15 Nov 2026).** A plate Draw it for me lays out carries `layout.lv` (`LK_SMART.LV`, now 2) and `layout.tv` (its turn, `{ m }` the mirror); `drawFresh()` reuses the saved `tv`. A plate with an older or no `lv` is never drawn again on save (`redrawFrom()`, after its filters): it stays exactly as it is until the head chef taps Draw it again. `js/manage.js` passes `{ ingsChanged, added }` into `autoDraw()`; the save's slip names kept plates only when the ingredients changed ("Kept the older plate drawing: ..."), and says in red when a newly added ingredient has no Pass label on one (the allergen lens reads the labels; a row renamed in place is not new, and a Pass label the recipe already has counts). A save whose drawings could not be checked (no picks, no signal for a drawing, said in red as "Drawings not checked") carries its ingredient changes to the next save (`e.drawPend`). A side view or build drawn again for a dish whose plate was kept is named as such ("the side view of X"). Undo after Draw it again puts the old layout back with the old parts (`snapUndo()` in `js/draw.js`), so a plate the head chef did not keep in the new layout stays older. Tidy up keeps a hand-moved main on its mash and never takes a hand-moved part as a bed; Draw it again lays a main on a mash the head chef kept, or a mash under a kept main. A pan gets exactly the parts it got before 15 Nov 2026 (the batch-amount rule is for plates; a pan's garnish by weight is still more pieces). Pans, side views and builds carry no `lv` and keep the 21 Oct 2026 behaviour. LV goes up only when the rules for where parts go change; a recipe fold or a new library piece does not change it. `fresh()` stops Draw it for me and autodraw on a phone whose `js/draw.js` is older than `js/smart.js` (no `render.oval`): the slip asks to reload (`js/draw.js?v=10` in `js/manage.js`).

### Drawings made in the book (`docs/code-contracts.md`)

Drawings made in the book (`js/draw.js`): a recipe points to one with `art`, `side` or `diagram` set to `@<drawing id>`. `js/overlay.js` keeps them in IndexedDB (`lk-book`) and lays them into `LK_ART` under the `@` key (plates and pans with their own viewBox in `LK_ART.vb`); `lk-art` tells `js/app.js` to redraw. Everything from Firestore goes through `LK_RX.clean()` first (plain shapes and text only); keep it that way for any new field that is drawn. The servingware is wrapped in `data-surf` so `foodMask()` leaves it out. A library piece's drawing never changes under a saved drawing: `defs` keeps a copy, and an item's `v` in `js/lib/` goes up whenever its drawing changes. Library items must pass `node tests/library-check.js` (plain SVG, no ids, seeded random only, unique ids, the metadata `js/smart.js` relies on: role, g or n, form, side). Clicks use `data-dw`, typing `data-dwf`, classes `dw-`; the editor draws into `#mg-root`, and `js/manage.js` does not draw while it is open. A plate or pan drawing's save also writes the recipe (`LK_MG.patchRecipe()`): the Pass labels are made from the parts (`ing`, plus the ingredients drawn inside a part in `also`, names joined with `|`, their list places in `ai`), except labels marked `own`.

### The studio, chosen 4 Nov 2026 (`docs/studio-options/brief.md`)

- **4 November 2026, drawing studio: B, quiet canvas, with more servingware colours.** The studio keeps its full screen and loses the dock, the floating part bar and the drawers over the food. One bar at the thumb shows only what can be done now; a picked part turns it into that part's Colour, Label, More, Delete and Done. The nine shared fixes come with it. Plates, bowls and boards also get more colours: many more plate and bowl colours with any colour as well, and more wood tones for boards. See [the studio options](studio-options/brief.md).

### Access (`docs/private-kitchen-access.md`)

- Head chef and sous chef: recipe and drawing management. Supplier catalogue editing remains head-chef/admin only.

### Head chef decisions on AI for drawings

- **21 Oct 2026.** Draw it for me: the book draws the plate, the side view and the build drawing from the recipe, and the head chef tweaks it. Plain rules on the device, no AI service. The head chef's picks of a drawing for an ingredient are kept for the next recipe (`book/matches`, head chef only).
- **15 November 2026, Draw it for me lays plates out like the book's own; saved plates stay as they are until redrawn.** The owner found the auto drawings "fairly clumsy" and wanted them better, more reliable and easier to use, first asking about AI. After weighing a model on the device, on GitHub and through Firebase, they chose to improve what is there without any AI for now. The plates are now laid out from the book's own 76 hand-made plates (protein at the back, chips front left, salad front right, a sauce of choice in a ramekin, a main on its mash or rice, garnish sized to the main), measured by `tests/plating-check.js` (score median 1.42 before, 0.00 after; dishes over 2: 26 before, no

### After the tap (`docs/action-feedback.md`, The rule)


1. **Answer in the tap's own frame.** Something changes before the server is asked. A list line (add, tick, remove on Prep, Orders, Wastage, Transfers) shows at once with its slip, as since 4 Nov 2026; while the write waits, the line says Not sent and the floating band says Not sent yet. A form's Save button says Saving... at its own width (`svButton()`) and shows Saved, Sent or a green tick only once the write resolved: an answer from the cache, or a listener hearing this phone's own pending write, is not Saved (CLAUDE.md, Changes that went wrong before).
2. **Confirm where the eye is, in words.** Words say what changed and where: "Added Slice tomatoes to Sauce", "Saved 14:02. The sous chefs see the new cut-offs now.", "Undone: Slice tomatoes". Never "Added", "Done" or "Saved" alone when the thing has a name. A confirmation is never only a small grey line, never only at the top of a page whose button is lower down, and never behind an open sheet.
   - **A form's Save, Publish, Record or Send button** uses `svButton()` with `svStart()`, `svDone()` and `svFail()` (`js/prep.js`): Saved with a tick for 1.2 s once the write resolved, one waiting line after 4 s, Try again with a red line that stays. Lazy pages that cannot reach it keep their own button but follow the same four states, words and classes (`saveBtnHTML()` in `js/manage.js`).
   - **A button that changes while someone types** is changed in place with `btnPatch()` (`js/prep.js`, also `LK_PREP.btnPatch`), never replaced: leaving a box by tapping the button fires change between finger down and finger up, and a new element there loses the tap.
   - **An add, tick, remove or change on a list line** uses the docket slip (`toast()`), with Undo where the change can be undone.
3. **Clear the old words.** Once Saved shows, anything that belonged to the unsaved form goes or turns off: Undo unsaved changes, "Save to make the change", a Tap again still armed.
4. **Then leave the person where they are, with a stamp on what changed.** Chosen by the head chef on 5 November 2026 (the mix of A and C in [the options brief](action-feedback-options/brief.md)). Nothing scrolls by itself. What was saved wears a small green stamp, "Saved 14:02" (`.lk-stamp` in `css/app.css`), on the card or bar that changed and beside the Save button, until the page is left or it changes again. An add sheet stays ready for the next line and lists what it added ("Added just now", the last two, each with Undo); after Close the slip names the last line. Lines this phone just added wear "New 14:02" for 2 minutes.
5. **A failure stays and keeps the work.** Red, read out at once (`errMsg()`, `toast(..., 'bad')`, `role="alert"`), until the next try, an edit or OK. Never on a timer. Typed text goes back in its box (`failed(e, restore)`). A failed save takes its Undo with it (`dropUndo()`).
   - If today's Prep tick on a personal device fails for lack of connection, **Not saved. Tap the box to retry.** stays in that line through other actions. Its existing box retries in one tap and the line stays in place while it waits. The slip names the tick once the retry is accepted. The notice is kept in the tab for that session and kitchen day. Shared-device worker selection and permission refusals keep their existing flows.
   - On a phone the older Undo button wraps its named label if needed. It keeps its own tap target and the same action and lifetime.
6. **Undo says Undone.** An Undo on the slip says "Undone: ..." with what it undid, unless what it ran says so itself ("Put back Milk on the order list", "Unticked Laksa. It is open again."). Untick, un-order and Put back name the line. A slip names the line through `slipName()` (cut after 40 letters, so the section always shows).
7. **A tap that cannot act says why.** An empty Add puts the cursor in the box and says what is missing; Refresh says when it last read ("Up to date, read 14:02") or why it could not.
8. **Colour carries meaning, never alone.** Orange is the accent, urgent, rolled and the counts; green (`--done-ink`) is saved and done; red is a failure. A switched-off button looks off (faint words, light edge), so it is never mistaken for one still waiting. Stamps are words in a box, never a fill. Reduce motion removes fades and slides, never the words.


### Loading and motion (`docs/loading-motion.md`, Behaviour)


- The initial HTML names the book and the wait before the deferred app scripts run.
- Active waits trace only a detail of the matching native icon, on a 1.8 second cycle with a rest. The base drawing stays visible. A prep checkmark never suggests an unconfirmed completion.
- First list loads use decorative handwritten placeholder rows in the existing notebook. They are hidden from assistive technology. Loaded recipes remain usable during their existing background check; its status changes without replacing the search field or results. Very short recipe checks do not flash a message.
- Lazy editors, reports, access checks and update checks name the actual work. Offline and failure messages remain actionable and static.
- Busy save buttons keep a stable minimum width and touch height. Existing pending flags prevent repeat submission. A confirmed check is shown only in existing success branches after the write resolves. Drafts and queued-write warnings keep their existing meaning.
- Guide preparation counts completed pages. Guide saving counts acknowledged page writes, any old-page cleanup and the final guide record. It cannot reach completion while the final record is still pending. Unknown totals show a named wait without a percentage.
- Landing dockets have one small entrance per page session. Reduced motion removes tracing, entrances and progress transitions. A known browser offline event immediately stops active decorative traces, without triggering reads or retries. Pending operations keep their busy markup even when drawn offline, so the same icon resumes on reconnection (4 Nov 2026, replaces #462). Settled errors and offline results remain still.


### Where it goes, and how loud it is (`docs/design-patterns.md`)


**Head chef, 26 November 2026.** Several changes were reworked after a bit of use: too loud, too crowded, or in the wrong place ([the cases](design-misses.md)). This adds no class and no colour. It says which existing piece to reach for, and the service council answers it for every change people will see (`.claude/skills/service-council/SKILL.md`, Where it goes).

- **Inline is the start.** The main job of a work page is on the page, one tap from its tab (service rule 1). A new piece goes inline first and moves only for a reason below.
- **A fold** (`.tm-fold`, `.o-cut-fold`): detail a cook wants sometimes, not at every glance. The closed line still says what is inside and anything that needs action. Never fold what stops a mistake. A card that already holds the whole thing has no second copy behind a fold (On today, 10 Nov 2026).
- **A bottom sheet, a centred modal from 768 px** (`.nt-wrap`, `ModalFrame()`, `.ux-picker`): a side task with its own choices, or a form, that the cook finishes or cancels and then lands on the same list; or a long list of choices. On a service page a new sheet or pop-up needs the head chef's OK (service rule 2) and does not open over a list unless it stops a mistake (rule 3). A council recommendation for one is that request.
- **Its own page** (a route in CLAUDE.md, Routes): a task with more state than one screen holds, that a person leaves and comes back to, that needs Back and a link, or that is admin work.
- **Loud is for a consequence.** The loudest thing on a screen is what costs a mistake or a missed deadline if it is missed (the amber Too few band, a due cut-off). Everything else is quiet paper and words, while approved celebrations, the mascot, Saved and New stamps, brand orange and the colour contracts keep their own rules. Red stays for a failed Save. Too quiet is a miss as well: the Too few warning was made louder on 16 Nov 2026. Colour meanings stay in [colour-coding.md](colour-coding.md) and [surface-colours.md](surface-colours.md).
- **Say it once.** A fact appears once on a card. A board with nothing on it hides (the empty current-break board). A choice most days never need is off the everyday path (a hidden shift).
- **Check the opening screen on the busiest day** at 390 px: a long list, the functions strip, a due cut-off. If the work is pushed down to one line, slim the band, not the work (Prep, 19 Nov 2026).
- **Devices.** A phone (390 px, personal), the kitchen tablet (768 px), the five section screens (21 to 24 inch, touch, one in every section, everyone's main work screen all shift, read from the bench; owner 11 Nov and head chef 26 Nov 2026), a front of house screen for Functions (1920 x 1080), and for admin the head chef's computer (1920 x 1080, mouse) and a laptop (1280 px). The phone is the design width, but the section screens are where most service work is read. They are 1920 x 1080 at 100 % with touch and a mouse (read 26 Nov 2026), and the page stops at 1240 px, so about 340 px each side is empty there ([device coverage](device-coverage.md)). From 768 px a sheet is a centred modal, and a wider screen uses its room to show more at once (the Search and Show chips share a row from 1100 px), never to move a main job. A wide screen is not a mouse: mouse-only behaviour stays behind `(hover: hover) and (pointer: fine)`. Measure service pages at 390 px, 768 px and 1920 x 1080 with touch, Functions at 1920 x 1080, and admin pages at 1280 px and 1920 x 1080.


### Design misses (`docs/design-misses.md`, the table)

| Decision | Found | What the record says | What was chosen | Question to ask next time (proposed) |
| --- | --- | --- | --- | --- |
| 5 Nov 2026, I'm on it button ([adaptive-controls.md](adaptive-controls.md)) | Not stated | At 390 px the new button left the words 58 px wide and broke "Laksa" mid-word. | Option A: on every phone below 480 px the actions sit below the words. | With the new control added, how wide are the words at 390 px, and at Extra large text? |
| 9 Nov 2026, mobile Operandio clock ([record](head-chef-decisions.md)) | In a preview | The expanding mobile pill was rejected as crowded: "just the ring filling". | The ring keeps one small footprint through start, running and completion. | Does a change of state keep the control's footprint on a phone? |
| 9 Nov 2026, Today's team planner | After release | The admin, head and sous planner was noisy. A (Quiet notebook) was chosen, then C (Person worksheet) the same day. | C, Person worksheet, keeping the weekly planner, one Save and the break board. | Has the planner been judged with a whole real day on it, not a short one? |
| 9 Nov 2026, desktop Home | After release | A less cluttered desktop Home was asked for after the staff-first release. | Matching columns and spacing, quiet-day prep and upcoming items compact below current work. | Was the page looked at at 1280 px as well as on the phone? |
| 9 Nov 2026, the empty break board ([contract](team-notebook-options/brief.md#hide-a-confirmed-empty-board-9-november-2026)) | After release | The head chef asked to hide On break now when nobody is on a break. | Hide a checked, empty current plan; keep loading, error and unknown states. | What does it show when there is nothing, and is it hidden only when confirmed empty? |
| 9 Nov 2026, a close × for non-touch screens ([contract](adaptive-controls.md#swipe-to-close-9-november-2026)) | After release | The owner asked for a visible close control on sheet and modal headers. | A small × on non-touch screens, reusing the panel's own Cancel action. | Can a person with a mouse or keyboard close it, not only a thumb? |
| 10 Nov 2026, On today on Home ([contract](home-staff-first.md#on-today-board-10-november-2026)) | After release | It looked very loud. Each name was listed twice with the hours on every row, then again behind View today's full team. | C, a section board: each name once, each shift's hours once, no second copy behind a fold. | Is any fact shown twice, including behind a fold? |
| 13 Nov 2026, the update band (PR 686) | After release | The owner still saw "New version available / Update now" and asked whether it could update silently. A 48 px band covered the top of the page, possibly for a whole shift. | No band when an update is found by itself. Taps for it go from 1 to 0. | Does a notice sit over the page during service, and does the cook have to act on it? |
| 15 Nov 2026, a shift like Smoker | After release | The clutter was the Smoker tick box under Add staff and the Smoker chip in a person's details. | B repaired: the shift stays set up but is hidden until someone is on it, then offered as "+ Smoker". | Is a choice most days never need sitting on the everyday path? |
| 15 and 16 Nov 2026, the Too few warning | After release | A line in the Save bar was built first. The next day the owner asked for a live warning before saving, "like a red bar", and for it to be louder. | An amber band in the Save dock with the fact first and Accept for the day. Red stays for a failed Save. | Does how loud it is match what missing it costs? Too quiet is a miss as much as too loud. |
| 15 Nov 2026, swipe to close ([fault](adaptive-controls.md#fault-on-phones-found-and-fixed-15-november-2026)) | After release | The owner said swiping a sheet down did not seem to work. The grip took a touch only on a 44 x 5 px spot, so 12 of 14 kinds of sheet ignored it. | A full-width grip strip, and a pull on the body closes when it is already at the top. | Does the gesture work where a thumb actually lands? |
| 16 Nov 2026, transfer cards ([evidence](transfer-returns.md#phone-card-width-16-november-2026)) | After release | Cards ran off the right edge. The loan grid expanded to its content width, and a wider check found long amounts and titles crossing controls. | The grid is held to the notebook and long words and amounts wrap. | Do long amounts and titles fit at 390 px and at enlarged text? |
| 16 Nov 2026, the phone's Home button on the kitchen tablet (PR 717) | Not stated | Home on the tablet's Back or Home pill reloaded the whole book, about two seconds, and lost half-typed text. | The installed app focuses the open book instead of reloading it. | Does a control on the shared tablet behave as it does on the phone? |
| 16 Nov 2026, On break now on short phones (PRs 722, 724) | After release | The sticky Save bar covered the last On break names on the head chef's 390 x 844 phone (722). After that went live the head chef asked about shorter phones: 0 of 4 names showed at 375 x 667, and 3 of 4 or 2 of 4 at 360 x 740 (724). | The board sits first on every phone below 720 px, above the notebook title. 320 px phones stay short, as noted in the PR. | Does the bar cover the content on the shortest phone, not only on the head chef's? |
| 19 Nov 2026, Prep's opening screen | After release | With three functions tonight and a cut-off due, the function band (216 px) and the cut-off bar (94 px) left one line of Prep on a 390 px opening screen. | The slim functions strip, and Prep keeps your place. | What does the opening screen show on the busiest day? |
| 19 Nov 2026, Guide previews (PR 762) | After release | The tutorial previews looped on every device whenever on screen. The head chef: "the preview should only start playing when we hover over it, never play the preview when on mobile device/touchscreen device". | Previews play on hover with a mouse; a phone or tablet gets still images. | Does an idea that suits a mouse (hover, motion) still make sense on touch? |
| 19 Nov 2026, the People page (PR 770) | After release | Every person was an open form: 375 px each at 390 px, a 6,761 px page, and nobody on the first screen at 390, 768 or 1280 px. The head chef asked for a restyle. | One row a person (118 px), Change opens them in place. Taps go from 3 to 4. | With a full roster, how many people are on the first screen at each width? |
| 22 and 23 Nov 2026, the opening-screen batch (PRs 784 to 811) | Mostly not stated | More than twenty pull requests in two days moved the main thing higher or beside something at 390, 768 and 1280 px. In the eight read: the Wastage review began 1,252 px down with 12 entries (788); the Prep Add bar covered part of the third tick (804) and its first Add button sat 221 px lower (794); a busy routine Functions band took room from the Orders checklist (810); open Booking contact fields filled the space before Platters, 248 px on a phone (811); Inbox priorities sat below the opening screen (790). Most bodies do not say how each was found. | Per pull request: the review beside the daily total, one row of Prep tools, shorter gaps, routine Functions folded on Orders, Booking contact as one Add or Edit row, priorities first. One cost is stated: three Wastage entries fully visible, down from four (788). | Where is the main job on the opening screen at each width, in pixels or complete rows? Is anything routine or optional ahead of it? |

## 7. Council method excerpts (`.claude/skills/service-council/SKILL.md`)

### The service rules

Every proposal and every design is checked against these (head chef, 5 November 2026; also in `CLAUDE.md`):

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

Count, do not guess: the taps for the main task, and the list lines visible on a 390 px phone, before and after. Measure them in the click-test stand-in (`tests/`, `tests/fake/`) or a preview, and say how.

### Current design contracts

Before either round, read the current `CLAUDE.md` reading map and the affected feature's chosen design and later decisions. Prepare one short evidence packet for every reviewer: the source commit, relevant contract excerpts with file and heading references, baseline screenshots and available measurements. Include this section, Design references, Try to break it and Where it goes below, and paste the [Where it goes rule](../../design-patterns.md#where-it-goes-and-how-loud-it-is) and the [design misses](../../design-misses.md) as excerpts for any change people will see. Fresh agents do not inherit the lead's reading: a bare link or "keep the approved colours" is not enough. Reuse the packet between rounds unless the contracts or proposal change; the quick check reads the same sources without spawning reviewers.

Every visual proposal includes the relevant parts of [shared surface colours](../../surface-colours.md#selected-design), [operational colour meanings](../../colour-coding.md#shared-meanings) and [design patterns](../../design-patterns.md). Include the affected category exceptions, plus [action feedback](../../action-feedback.md#the-rule) and [loading and motion](../../loading-motion.md#behaviour) when states or interactions are involved. These documents own the tokens and detailed rules; do not create another palette in a feature brief.

### Colour and state checks

| Check | Evidence the council needs |
| --- | --- |
| Surface purpose | Work books, including Orders, use steel; people use sage; current live boards use charcoal; reading and writing stay quiet paper. Check the actual cover, header, edge and interior, not just a palette. |
| State meaning | Local state cues take priority over surface decoration. Attention/pending, confirmed success and failure follow the operational contract. Keep brand/action orange, charcoal Prep Urgent and explicit inclusion/assignment meanings. A sage people surface or green draft assignment is not Saved; neutral upcoming information is not automatically amber. |
| Words and exceptions | Status remains understandable through words, icons, ticks or pressed state without colour. Preserve affected category legends, charts, heat scales, allergen certainty, New/Moved tags, art, celebrations and print. Colour does not establish access or food safety. |
| Real contrast | Measure the rendered foreground and background, including ancestor opacity and light/dark variants: normal text 4.5:1, large text 3:1, meaningful control/state boundaries 3:1 where applicable. Check visible keyboard focus; do not infer a whole-app accessibility pass from token values or screenshots. |
| Relevant states | Show the affected ordinary, selected, disabled, saving/Not sent, Saved, empty and failure states. Distinguish confirmed empty data from a failed read. Exercise acknowledgement, retry and work recovery where affected; list states that do not apply. |
| Service continuity | Measure visible rows, tap targets and main-task tap counts before and after at the relevant widths: 390 px, 768 px and 1920 x 1080 with touch for service pages (a phone, the kitchen tablet, a section screen; confirmed 26 Nov 2026, [device coverage](../../device-coverage.md)), 1920 x 1080 for Functions (the front of house screen), 1280 px and 1920 x 1080 for admin pages and anything else used on a laptop; say why a width is skipped. Justify lost rows or added taps under the service rules. Keep controls stable through state changes; useful motion respects reduced motion and cannot imply completion or move a live target. |

Round 1 identifies contract risks and the evidence the designs will need. Round 2 records **Contract fit** alongside the reference comparison: **Works**, **Needs work**, **Not evidenced**, or **Not relevant** with a reason, source and evidence for each applicable check. The quick check needs only a short contract-fit note and the relevant evidence. Untested states and contrast remain Not evidenced. Identify the check needed before calling the implementation ready; do not add a review round for missing measurements.

Label measurements as **Preview** or **Implemented app**, with the source commit, role, viewport, fixture and font conditions. A schematic that omits the app header, reminders or full form fields cannot establish delivered density or task cost. Before marking a layout change ready, remeasure the complete implemented app at the relevant widths with its actual shell, full forms, representative data and states. Record any difference from the chosen preview, including extra scrolling, fewer visible lines/groups or added taps. Also walk the flow in the implemented app at those widths with a busy-day fixture and answer the Where it goes questions: a layout can measure well and still be too loud, too crowded or in the wrong place, and this is the one point that sees the real app. Material departures from the approved design return to the head chef under the existing design-choice rules; do not rerun the whole council for routine verification.

Separate a deliberate proposal to change an approved rule from an accidental violation. Name the exact proposed departure and leave it for the head chef's choice. A high preference score or similarity to another app never makes a contract violation acceptable. Recommend a repair or smaller compliant option where possible; keep unresolved failures and missing evidence visible in the recommendation and handoff.

### Design references

Use these in both rounds and small-change quick checks (head chef, 9 November 2026). They turn the [seven-app research](../../whole-app-redesign-options/brief.md#what-the-seven-apps-do-well-and-what-fits-a-kitchen) into questions about the kitchen task. Give this section to every reviewer. Select the principles that apply; briefly explain when none do. There is no reward for copying more apps.

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Are the page frame, action placement and names consistent, with the work more prominent than navigation? | Tiny dense controls, keyboard-only paths or a second navigation system |
| Things 3 | Are today's work and upcoming work distinct? Are occasional details tucked away while frequent actions stay visible? | Drag-only actions or hiding the chosen one-tap Urgent, Recipe and On it controls |
| Airbnb | Can the person see a job's time, place, requirements, status and next action together, without hunting through screens? | Decorative cards, photos or duplicated information that displaces useful lines |
| Todoist | Is adding quick, with known defaults visible and editable, usual items easy to find, and extra fields shown when needed? | Guessing a section, unit or quantity from ambiguous text, or hiding required inputs |
| Flighty | Is what matters now and next clear, with real times, deadlines and status from data the person may already read? | New listeners or polling just for the look, distracting movement or stale status presented as live |
| Duolingo | Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery? | Points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement |
| Headspace | Are labels calm, short and understandable to a new starter, with one name for each thing and words on actions? | Vague reassurance, unexplained icons or onboarding interruptions during service |

The service rules, current feature contracts and the head chef's later choices take priority over the research and its early recommendations. Keep the book's approved colours, notebook style, handwritten line words and functionality. Use existing [design patterns](../../design-patterns.md), [action feedback](../../action-feedback.md) and [loading and motion](../../loading-motion.md). Approved celebrations, Saved/New stamps and useful motion remain; motion must respect reduced motion and never delay an action or shift a live list. Keep current access, draft recovery and read-budget rules.

For each relevant principle, record the concrete benefit, evidence and trade-off in the feature brief. Round 2 uses a small comparison table: principle, then one column per design marked **Works**, **Needs work** or **Not evidenced**, with a short reason. Explain rejected ideas or **Not relevant** together where helpful. Cite measured taps/visible lines, screenshots or exercised states; a still image cannot prove speed, save feedback or recovery. The quick check needs only a short reference-fit note, not another review round. Rank kitchen value and the evidence above resemblance to an app.

### Try to break it

The existing **Skeptic** is the adversarial reviewer in both rounds. Keep the challenge to whether the feature is worth building, then try to disprove its claims of being clear, quick and reliable. The **Keeper** checks the technical failure, recovery and verification implications. No new reviewer or full review round is added. Criticism must name a plausible failure and its consequences; do not invent faults, reject everything automatically or prescribe more prompts without evidence.

Consider the applicable families below and prioritise the most consequential realistic cases. Report up to three leading scenarios per review, with more detail in the existing brief only when needed. A quick check does this within its self-review; fixes keep their existing exemption and regression-test rules.

| Failure family | Challenge |
| --- | --- |
| Confusion and accidental action | Can a rushed person choose the wrong day, item or unit, miss the next action, or confuse Back/Cancel with saving or deleting? Try long labels and unfamiliar roles. |
| Repetition and delayed answers | What happens after double taps, repeated Save, retry or Undo while an answer is delayed? Can work be duplicated, removed twice or overwritten by a late response? |
| Failed reads and writes | With no signal, a held write or refusal, does the page preserve work and show the right pending/failure state? Can an empty cache look like confirmed empty data or a pending write look Saved? |
| Interruption and handover | What happens on Back, closing a sheet, navigation, reload/update or daily lock while work is unsent? Does same-person recovery retain the right draft, and does handover prevent the next person inheriting it or its authority? |
| Time boundaries | For time-based features, check just before, at and after the relevant Queensland midnight, deadline and recurrence boundaries, separately from the 04:00 device unlock. Do accepted work and saved anchors survive rollover, and are required records ready before actions become usable? Use the feature's current contract; do not assume every feature changes day together. |
| Access and conflicting state | Can a wrong role read or write, a stale session retain authority, or two writers silently lose each other's work? Check current role/device, draft-versus-saved and version contracts; hidden controls alone do not prove enforcement. |
| Misleading presentation | Could colour, motion, disabled controls or hidden feedback imply success, availability or food safety that is not established? Can the task and recovery still be understood without colour or a mouse? |

Round 1 records risks and the evidence needed to test them. Round 2 exercises supported interactions in isolated previews or existing test fixtures where possible, including new failure paths in a proposed mix. Use synthetic data; this review does not authorise disruptive production tests, real staff identities, operational writes or notifications. If a preview cannot exercise a case, say so and name the smallest later check. A source review or mock is not proof of live behaviour or server enforcement.

Record **Break-it findings** in the existing brief: scenario and role/state, expected result, observed result or hypothesis, impact, evidence location and environment, smallest repair or verification needed, and disposition. Label evidence **Reproduced**, **Checked in [named fixture]**, **Risk / Not evidenced**, or **Not applicable** with a reason. Checked means only the stated case and environment passed. Keep security reproduction and authority-bypass details in the existing private evidence record; the public brief contains only a non-sensitive outcome, fix and verification summary.

The lead reconciles findings before recommending: say what was fixed and checked, what still needs verification before readiness, and what is deferred with a reason. A preference score or majority vote does not resolve a demonstrated failure. Keep unresolved access, data-loss or service-blocking failures prominent; change the recommendation or name the required repair. A hypothetical concern remains a risk, not a claimed defect. If no actionable issue was found, state the reviewed scope and limits instead of claiming the design cannot break.

### Where it goes, and how loud

Head chef, 26 November 2026 (`docs/head-chef-decisions.md`). Changes were being reworked after a bit of use: too loud, too crowded, or in the wrong place (a line where a sheet was needed, a sheet where a line would do). The council now has a UX and interaction designer for this, and every change people will see answers these questions. The rule is [Where it goes, and how loud it is](../../design-patterns.md#where-it-goes-and-how-loud-it-is); the real cases it comes from are in [design misses](../../design-misses.md). A quick check answers them itself; round 2 gets them from the design frame and the UX designer.

| Question | What the council checks |
| --- | --- |
| Placement | For each new piece: inline, fold, sheet or modal, or its own page? Why that one, and not the one above or below it? A sheet or pop-up on a service page is a request for the head chef's OK (service rule 2): say so in the recommendation. |
| Loudness | What is the loudest thing on the screen, and what does missing it cost: a mistake, a deadline, or nothing? Loud has to earn its place by that cost. Too quiet is a miss as much as too loud. |
| Crowding | Is any fact shown twice? Does an empty or rarely used piece take room on the everyday path? What does the opening screen of a 390 px phone show on the busiest day (a long list, a band, a due cut-off)? |
| Devices | A phone (390 px, personal), the kitchen tablet (768 px), the five section screens (21 to 24 inch, touch, one in every section, everyone's main work screen all shift, read from the bench; 1920 x 1080 at 100 %, touch and a mouse, read 26 Nov 2026), the front of house screen for Functions (1920 x 1080), and for admin the head chef's computer (1920 x 1080, mouse) and a laptop (1280 px), as in [device coverage](../../device-coverage.md): is it the same flow, with the room used to show more, not to move a main job? Can the section screen be read from where the cook stands? Which widths were measured, as Preview or Implemented app? |
| Fiftieth use | The first use is not the test. After a week of service, what gets in the way: an extra tap, a prompt, a band that never clears, a loud thing that is usually nothing? |

Judge from the evidence. This is role-based analysis, not research with staff: say so, and do not claim a feel the council did not see in the implemented app.

