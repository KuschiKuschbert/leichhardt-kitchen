# Step 2 evidence packet (26 Nov 2026)

Label for everything here: **Implemented app on the click-test stand-in, synthetic data, role-based review.** Nobody has watched a cook use these screens. The pictures and numbers come from `docs/device-coverage/step2/shots.cjs` at commit f6f1183 of `main`.

## The kitchen's screens (read on 26 Nov 2026, and the head chef's words)

- Five section screens, 21 to 24 inch, one in every section, all staff use them for the work all shift. Touch and a mouse. 1920 x 1080 at 100 % scale; the book's window is 1920 x 1008 (installed app). Which input the screen treats as its main one is not known, so pictures come with touch and with a mouse.
- The head chef: "The section screen can be read from where the cook stands nice and clean." **Do not propose bigger text; readability from the bench is settled.**
- A front of house screen for Functions: 1920 x 1080 (head chef). Not in this pass.
- The kitchen tablet: the test default 768 x 1024 with touch (not read from the tablet). Phones: 390 x 844, touch.
- The book's page column stops at 1240 px, so a 1920 px screen has 340 px either side.

## The service rules (head chef, 5 Nov 2026)

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

## ## Where it goes, and how loud it is

**Head chef, 26 November 2026.** Several changes were reworked after a bit of use: too loud, too crowded, or in the wrong place ([the cases](design-misses.md)). This adds no class and no colour. It says which existing piece to reach for, and the service council answers it for every change people will see (`.claude/skills/service-council/SKILL.md`, Where it goes).

- **Inline is the start.** The main job of a work page is on the page, one tap from its tab (service rule 1). A new piece goes inline first and moves only for a reason below.
- **A fold** (`.tm-fold`, `.o-cut-fold`): detail a cook wants sometimes, not at every glance. The closed line still says what is inside and anything that needs action. Never fold what stops a mistake. A card that already holds the whole thing has no second copy behind a fold (On today, 10 Nov 2026).
- **A bottom sheet, a centred modal from 768 px** (`.nt-wrap`, `ModalFrame()`, `.ux-picker`): a side task with its own choices, or a form, that the cook finishes or cancels and then lands on the same list; or a long list of choices. On a service page a new sheet or pop-up needs the head chef's OK (service rule 2) and does not open over a list unless it stops a mistake (rule 3). A council recommendation for one is that request.
- **Its own page** (a route in CLAUDE.md, Routes): a task with more state than one screen holds, that a person leaves and comes back to, that needs Back and a link, or that is admin work.
- **Loud is for a consequence.** The loudest thing on a screen is what costs a mistake or a missed deadline if it is missed (the amber Too few band, a due cut-off). Everything else is quiet paper and words, while approved celebrations, the mascot, Saved and New stamps, brand orange and the colour contracts keep their own rules. Red stays for a failed Save. Too quiet is a miss as well: the Too few warning was made louder on 16 Nov 2026. Colour meanings stay in [colour-coding.md](colour-coding.md) and [surface-colours.md](surface-colours.md).
- **Say it once.** A fact appears once on a card. A board with nothing on it hides (the empty current-break board). A choice most days never need is off the everyday path (a hidden shift).
- **Check the opening screen on the busiest day** at 390 px: a long list, the functions strip, a due cut-off. If the work is pushed down to one line, slim the band, not the work (Prep, 19 Nov 2026).
- **Devices.** A phone (390 px, personal), the kitchen tablet (768 px), the five section screens (21 to 24 inch, touch, one in every section, everyone's main work screen all shift, read from the bench; owner 11 Nov and head chef 26 Nov 2026), a front of house screen for Functions (1920 x 1080), and for admin the head chef's computer (1920 x 1080, mouse) and a laptop (1280 px). The phone is the design width, but the section screens are where most service work is read. They are 1920 x 1080 at 100 % with touch and a mouse (read 26 Nov 2026), and the page stops at 1240 px, so about 340 px each side is empty there ([device coverage](device-coverage.md)). From 768 px a sheet is a centred modal, and a wider screen uses its room to show more at once (the Search and Show chips share a row from 1100 px), never to move a main job. A wide screen is not a mouse: mouse-only behaviour stays behind `(hover: hover) and (pointer: fine)`. Measure service pages at 390 px, 768 px and 1920 x 1080 with touch, Functions at 1920 x 1080, and admin pages at 1280 px and 1920 x 1080.

## Design misses: changes reworked after use (the record)

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

## Decisions already made that these pages show (do not re-propose what they rejected)

- **22 Oct 2026.** The function band and sheet are in the book's look (beige band, ink-edged rows, the book's sheet top), no yellow. The band has a label ("Functions today", "Functions coming up", "Functions today and soon"). Hide folds it to one line for the day on that phone. The Hide and Show button is a small round minus and plus, so it takes less room (22 Oct 2026). Every function view writes amounts as "2 × Pizza". Under Next out the sheet shows the whole function added up ("Whole function 12 platters"), in place of the old Platters list, which read like a second Next out.

- **19 November 2026, Prep opens with the slim functions strip and keeps your place.** On a busy day, with three functions tonight and a cut-off due, the function band (216 px) and the cut-off bar (94 px) left the head chef's Prep one line on the opening screen of a 390 px phone. Coming back from Orders, Wastage or Transfers, Prep always started at the top again.

- **11 November 2026, the kitchen's wide screens say a finished section large.** The owner asked to enhance the mascot "at least on desktops" and said the kitchen works on five 21 to 24 inch screens, one in every section. The council ([the study](mascot-desktop-options/brief.md)): round 1 Build smaller, 5 of 5; round 2, six reviewers, the full-size scene first for four and a mascot beside the book last for all six; four of six named one blend, and the owner said "yea lets go". Built: from 900 px wide a finished section says the slip's own sentence large on its own tab, "Sauce is done." and "Grill has 1 left.", with the mascot under his words as a still at half size; the finished list's card says it the same way and only there is he his drawn size, with the one Serve play he had. Words first, then the largest mascot that fits; quiet with no signal; nothing while a line is left; no line or button moves; phones and tablets under 900 px are exactly as they were. A section's own tab no longer keeps its plain words from 900 px. What is left shipped in the page's ink, as drawn; the owner then said "Green", so both lines are in the done green, like the slip. Home stays as it is: all six said so. The owner then said the five screens are shared kitchen screens that everyone uses for everything, so a tick asks Who did this? and a screen locks 10 minutes after the last touch: the finished 

- **9 November 2026, desktop Home cleanup.** The owner requested a less cluttered desktop Home after the staff-first release. Refine the existing layout with matching columns and spacing, compact quiet-day prep and upcoming items below current work. Preserve section, break and coworkers first, the native fonts/header and the existing phone/tablet layout. [Contract and comparisons](home-staff-first.md#desktop-spacing-and-alignment-9-november-2026).

- **8 November 2026, Wall board for all Prep accounts.** The head chef asked for Wall board on admin, head-chef, chef and sous-chef accounts without having to use a shared device. Every account already authorised to open Prep may use it on personal or shared devices, with its existing line permissions. Keep the same Wall board tab on today's list with at least two named sections, the same board and Back button, and the browser's saved view choice. Personal actions use the signed-in person's attribution; shared screens retain Who's on it? and Who did this? View-only accounts remain read-only. Existing private-session and Functions-only boundaries, reads and rules stay. This replaces the shared-device-only availability restriction. See `docs/prep-book.md`, Wall board, and `docs/code-contracts.md`, Prep page reads.

- **26 November 2026, the kitchen's screens are 1920 x 1080.** The Screens row in Admin, Kitchen read every shared screen as 1920 x 1080 at 100 %, 1920 x 1080 pixels, the book's window 1920 x 1008 as the installed app, touch and a mouse. The head chef: "Yeah the kitchen screens run on 1920x1080 and so does the function foh scree[n]". His own computer read 1920 x 1080 with a mouse. So the council measures service pages at 390, 768 and 1920 x 1080 with touch, Functions at 1920 x 1080, and admin pages at 1280 and 1920 x 1080. Step 0 of the [device coverage](device-coverage.md) plan is done; step 1 waits for the head chef's go.

- **Orders and the functions band (23 Nov 2026):** 23 November 2026. Orders starts with the existing fold for routine functions. Live warnings keep their detail and actions, and the band and function-derived list updates wait through a held touch. [Council, decision and checks](band-options/brief.md#orders-starts-with-the-existing-functions-fold-23-november-2026). `tests/orders-functions-fold.test.js`.
- **The top bar (docs/easy-to-break.md):** pings, the chef hat and the round Today's team chip, all the bell's size. A button with words in it wraps the page tabs on a laptop and cuts "Kitchen Book" on a phone; anything more in the top bar is a head chef decision.
- The split bar for the functions band came last in round 2 of the band council; the head chef asked for something more practical, and chose the slim strip on Prep.

## The pictures

In `docs/device-coverage/step2/`, named `<page>-<size>.png`:
- `1920-touch` and `1920-mouse`: a busy afternoon at 14:00 (20 prep lines in five sections, 8 order requests, 6 wastage entries, 3 transfers, three functions tonight, a supplier cut-off at 15:00, today's team planned, Cleaning on with its built-in jobs), 1920 x 1008.
- `1920-quiet`: the same with no functions and no cut-off.
- `768` and `390`: the busy afternoon on the tablet and a phone, with touch.
- A cook (Ann, staff) on a shared section screen opens Prep, Orders, Wastage, Transfers, Cleaning, Home and the recipe card (Laksa); the sous chef (Sam) opens Today's team.
- Each picture is what shows without scrolling.

## The numbers (metrics.json)

`emptyEachSide`: px either side of the page column. `rows` and `rowsInView`: list rows on the page and fully in view (null where not counted). `firstRowTop`: where the first list row starts, in px from the top. `bars`: the dark top bar, the functions band (`fn-band`, `is-strip` is Prep's slim strip), the cut-off bar (`cut-band`) and page heads (`nb-ph`), with their heights. `text`: font sizes in px of text in view.

```json
{
"prep-1920-touch": {
"route": "#/prep",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 18,
"rowsInView": 10,
"firstRowTop": 350,
"text": {
"smallest": 11,
"median": 14.4,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band is-strip",
"top": 132,
"h": 44
},
{
"cls": "nb-ph",
"top": 201,
"h": 99
},
{
"cls": "nb-ph",
"top": 201,
"h": 99
}
],
"scrollHeight": 1008
},
"prep-1920-mouse": {
"route": "#/prep",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 18,
"rowsInView": 11,
"firstRowTop": 347,
"text": {
"smallest": 11,
"median": 14.4,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band is-strip",
"top": 132,
"h": 44
},
{
"cls": "nb-ph",
"top": 201,
"h": 99
},
{
"cls": "nb-ph",
"top": 201,
"h": 99
}
],
"scrollHeight": 1008
},
"prep-768": {
"route": "#/prep",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": 18,
"rowsInView": 9,
"firstRowTop": 406,
"text": {
"smallest": 12,
"median": 15,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band is-strip",
"top": 132,
"h": 44
},
{
"cls": "nb-ph",
"top": 257,
"h": 99
},
{
"cls": "nb-ph",
"top": 1592,
"h": 99
}
],
"scrollHeight": 1879
},
"prep-390": {
"route": "#/prep",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": 18,
"rowsInView": 8,
"firstRowTop": 291,
"text": {
"smallest": 9.5,
"median": 12,
"largest": 41.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 64
},
{
"cls": "fn-band is-strip",
"top": 64,
"h": 44
},
{
"cls": "nb-ph",
"top": 177,
"h": 78
},
{
"cls": "nb-ph",
"top": 1519,
"h": 90
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 1942
},
"prep-1920-quiet": {
"route": "#/prep",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 18,
"rowsInView": 11,
"firstRowTop": 306,
"text": {
"smallest": 11,
"median": 13,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "nb-ph",
"top": 157,
"h": 99
},
{
"cls": "nb-ph",
"top": 157,
"h": 99
}
],
"scrollHeight": 1008
},
"orders-1920-touch": {
"route": "#/orders",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 8,
"rowsInView": 8,
"firstRowTop": 306,
"text": {
"smallest": 11,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 50
},
{
"cls": "nb-ph",
"top": 207,
"h": 99
}
],
"scrollHeight": 1008
},
"orders-1920-mouse": {
"route": "#/orders",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 8,
"rowsInView": 8,
"firstRowTop": 306,
"text": {
"smallest": 11,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 50
},
{
"cls": "nb-ph",
"top": 207,
"h": 99
}
],
"scrollHeight": 1008
},
"orders-768": {
"route": "#/orders",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": 8,
"rowsInView": 8,
"firstRowTop": 306,
"text": {
"smallest": 12,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 50
},
{
"cls": "nb-ph",
"top": 207,
"h": 99
}
],
"scrollHeight": 1024
},
"orders-390": {
"route": "#/orders",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": 8,
"rowsInView": 8,
"firstRowTop": 222,
"text": {
"smallest": 11,
"median": 13,
"largest": 41.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 64
},
{
"cls": "fn-band",
"top": 64,
"h": 50
},
{
"cls": "nb-ph",
"top": 131,
"h": 90
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 934
},
"orders-1920-quiet": {
"route": "#/orders",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 8,
"rowsInView": 8,
"firstRowTop": 256,
"text": {
"smallest": 11,
"median": 13,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "nb-ph",
"top": 157,
"h": 99
}
],
"scrollHeight": 1008
},
"waste-1920-touch": {
"route": "#/waste",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 6,
"rowsInView": 6,
"firstRowTop": 557,
"text": {
"smallest": 11,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 1008
},
"waste-1920-mouse": {
"route": "#/waste",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 6,
"rowsInView": 6,
"firstRowTop": 557,
"text": {
"smallest": 11,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 1008
},
"waste-768": {
"route": "#/waste",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": 6,
"rowsInView": 6,
"firstRowTop": 557,
"text": {
"smallest": 11,
"median": 16,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 1024
},
"waste-390": {
"route": "#/waste",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": 6,
"rowsInView": 5,
"firstRowTop": 539,
"text": {
"smallest": 11,
"median": 14,
"largest": 41.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 64
},
{
"cls": "fn-band",
"top": 64,
"h": 218
},
{
"cls": "nb-ph",
"top": 299,
"h": 157
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 1109
},
"waste-1920-quiet": {
"route": "#/waste",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 6,
"rowsInView": 6,
"firstRowTop": 339,
"text": {
"smallest": 11,
"median": 16,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "nb-ph",
"top": 157,
"h": 99
}
],
"scrollHeight": 1008
},
"transfers-1920-touch": {
"route": "#/transfers",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 3,
"rowsInView": 3,
"firstRowTop": 604,
"text": {
"smallest": 11,
"median": 16,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 1008
},
"transfers-1920-mouse": {
"route": "#/transfers",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 3,
"rowsInView": 3,
"firstRowTop": 604,
"text": {
"smallest": 11,
"median": 16,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 1008
},
"transfers-768": {
"route": "#/transfers",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": 3,
"rowsInView": 3,
"firstRowTop": 604,
"text": {
"smallest": 12,
"median": 16,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 1024
},
"transfers-390": {
"route": "#/transfers",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": 3,
"rowsInView": 2,
"firstRowTop": 567,
"text": {
"smallest": 11,
"median": 13.6,
"largest": 41.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 64
},
{
"cls": "fn-band",
"top": 64,
"h": 218
},
{
"cls": "nb-ph",
"top": 299,
"h": 138
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 1058
},
"transfers-1920-quiet": {
"route": "#/transfers",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 3,
"rowsInView": 3,
"firstRowTop": 385,
"text": {
"smallest": 11,
"median": 16,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "nb-ph",
"top": 157,
"h": 99
}
],
"scrollHeight": 1008
},
"cleaning-1920-touch": {
"route": "#/cleaning",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 46,
"rowsInView": 6,
"firstRowTop": 641,
"text": {
"smallest": 11,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 3513
},
"cleaning-1920-mouse": {
"route": "#/cleaning",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 46,
"rowsInView": 7,
"firstRowTop": 641,
"text": {
"smallest": 11,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 3431
},
"cleaning-768": {
"route": "#/cleaning",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": 46,
"rowsInView": 6,
"firstRowTop": 641,
"text": {
"smallest": 12,
"median": 15.2,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "nb-ph",
"top": 375,
"h": 99
}
],
"scrollHeight": 3589
},
"cleaning-390": {
"route": "#/cleaning",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": 46,
"rowsInView": 2,
"firstRowTop": 593,
"text": {
"smallest": 11,
"median": 13,
"largest": 41.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 64
},
{
"cls": "fn-band",
"top": 64,
"h": 218
},
{
"cls": "nb-ph",
"top": 299,
"h": 90
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 4296
},
"cleaning-1920-quiet": {
"route": "#/cleaning",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": 46,
"rowsInView": 10,
"firstRowTop": 423,
"text": {
"smallest": 11,
"median": 16,
"largest": 51.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "nb-ph",
"top": 157,
"h": 99
}
],
"scrollHeight": 3294
},
"home-1920-touch": {
"route": "#/",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 16,
"largest": 44
},
"bars": [
{
"cls": "wtop",
"top": 0,
"h": 132
}
],
"scrollHeight": 1009
},
"home-1920-mouse": {
"route": "#/",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 16,
"largest": 44
},
"bars": [
{
"cls": "wtop",
"top": 0,
"h": 132
}
],
"scrollHeight": 1009
},
"home-768": {
"route": "#/",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 12,
"median": 16,
"largest": 33.6
},
"bars": [
{
"cls": "wtop",
"top": 0,
"h": 132
}
],
"scrollHeight": 1025
},
"home-390": {
"route": "#/",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 13.6,
"largest": 25.6
},
"bars": [
{
"cls": "wtop",
"top": 0,
"h": 64
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 1345
},
"home-1920-quiet": {
"route": "#/",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 15,
"largest": 44
},
"bars": [
{
"cls": "wtop",
"top": 0,
"h": 132
}
],
"scrollHeight": 1009
},
"team-1920-touch": {
"route": "#/team",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 14,
"largest": 44
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "cut-band",
"top": 350,
"h": 68
},
{
"cls": "tm-nhead",
"top": 444,
"h": 68
}
],
"scrollHeight": 1572
},
"team-1920-mouse": {
"route": "#/team",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 14,
"largest": 44
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "cut-band",
"top": 350,
"h": 68
},
{
"cls": "tm-nhead",
"top": 444,
"h": 68
}
],
"scrollHeight": 1572
},
"team-768": {
"route": "#/team",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 12,
"median": 14,
"largest": 32
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
},
{
"cls": "cut-band",
"top": 350,
"h": 68
},
{
"cls": "tm-nhead",
"top": 444,
"h": 68
}
],
"scrollHeight": 1680
},
"team-390": {
"route": "#/team",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 14,
"largest": 27.2
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 64
},
{
"cls": "fn-band",
"top": 64,
"h": 218
},
{
"cls": "cut-band",
"top": 282,
"h": 94
},
{
"cls": "tm-nhead",
"top": 494,
"h": 58
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 1963
},
"team-1920-quiet": {
"route": "#/team",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 14,
"largest": 44
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "tm-nhead",
"top": 157,
"h": 68
}
],
"scrollHeight": 1285
},
"recipe-1920-touch": {
"route": "#/r/laksa",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 15,
"largest": 57.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
}
],
"scrollHeight": 1490
},
"recipe-1920-mouse": {
"route": "#/r/laksa",
"errors": 0,
"touch": false,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 15.2,
"largest": 57.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
}
],
"scrollHeight": 1490
},
"recipe-768": {
"route": "#/r/laksa",
"errors": 0,
"touch": true,
"vw": 768,
"vh": 1024,
"column": {
"left": 0,
"width": 768
},
"emptyEachSide": 0,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 13,
"median": 15,
"largest": 57.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
},
{
"cls": "fn-band",
"top": 132,
"h": 218
}
],
"scrollHeight": 2086
},
"recipe-390": {
"route": "#/r/laksa",
"errors": 0,
"touch": true,
"vw": 390,
"vh": 844,
"column": {
"left": 0,
"width": 390
},
"emptyEachSide": 0,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 15,
"largest": 48
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 64
},
{
"cls": "fn-band",
"top": 64,
"h": 218
},
{
"cls": "tabbar",
"top": 776,
"h": 68
}
],
"scrollHeight": 2206
},
"recipe-1920-quiet": {
"route": "#/r/laksa",
"errors": 0,
"touch": true,
"vw": 1920,
"vh": 1008,
"column": {
"left": 340,
"width": 1240
},
"emptyEachSide": 340,
"rows": null,
"rowsInView": null,
"firstRowTop": null,
"text": {
"smallest": 11,
"median": 15,
"largest": 57.6
},
"bars": [
{
"cls": "wtop has-back",
"top": 0,
"h": 132
}
],
"scrollHeight": 1272
}
}
```
