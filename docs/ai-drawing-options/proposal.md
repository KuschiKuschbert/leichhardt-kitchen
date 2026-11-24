# AI drawing in the studio: round 1 proposal and evidence packet

Source commit: `70ce8f4` (main, 17 Nov 2026). Written for the service council's round 1. No code has been written. Every reviewer gets this same file.

## 1. The proposal (one page)

**The ask.** The owner (the head chef) has US$100 of Claude API credit. They asked: "I could use AI to generate drawings in the app with Claude API calls and rate limit them per day and before I reach the limit amount. Couldn't I?"

**The problem in the kitchen.** Each recipe card can carry a plate drawing (shown on the card and on The Pass with labels), a side view and a build drawing. The head chef or a sous chef makes them in the drawing studio (`#/manage/draw/...`). Today the studio's **Draw it for me** lays the plate out with fixed rules on the device, then the chef fixes it by hand and saves. On 15 Nov 2026 the owner found those drawings "fairly clumsy", asked about AI, weighed a model on the device, on GitHub and through Firebase, and chose to improve the rules "without any AI for now". The rules were rebuilt that day (measurements below).

**Who has it, how often.** Head chef and sous chefs only (drawing management). Not a service task: nobody draws during service. It happens when a dish is added or changed: menu changes, specials (4 on the Specials list today), new batch cards. How many drawings are made or fixed per week is **Not evidenced** (that lives in Firestore; this session cannot read it).

**What people do today.** Open the recipe's drawing slot, which opens the studio with **Draw it for me** in the middle of the empty plate (1 tap). The book draws and says "Drawn by the book: ..." with Undo and Try another. If it was unsure of an ingredient, Check shows a badge and a "Which drawing?" panel with picks. The chef moves, resizes or swaps parts by hand, then Save (1 tap). A recipe save also draws empty slots by itself.

**The change.** Add an AI way to draw in the studio:
- A server piece holds the API key, because the repo and the site are public. The proposal is a Firebase callable Cloud Function (needs the Blaze plan: Plan C was chosen on 13 Nov 2026, but the notes do not record it as switched on).
- The function checks the caller: App Check, and a live head chef or sous chef PIN session with its grant, as the recipe editor's writes do.
- **Limits, enforced on the server:** a daily number (for example 20 drawings per Queensland day) and a total stop (for example at US$90), counted in one Firestore transaction that reserves a slot before the call, then records the real cost from the answer's token counts. A US$100 spend limit on the key in the Claude Console is the backstop.
- **What Claude makes:** either (1) a layout that picks and places pieces from the book's own library (842 pieces, 12 files), drawn by the studio's existing renderer, or (2) a whole new SVG drawing. Either way the result goes through `LK_RX.clean()` and the chef tweaks and saves as today.
- The phone shows how many AI drawings are left today, and says plainly when the day's or the total budget is used up.

**Cost.**
- Money (estimates, not measured): about US$0.10 to 0.20 per drawing for option 1 (Claude Opus 5.5 at US$4 in / US$20 out per million tokens; about 14k tokens in, 2k to 5k out with thinking), about US$0.25 to 0.40 for option 2. At 20 a day flat out, US$100 lasts about 25 to 50 days; at real use, much longer. Cloud Functions stay inside the free amounts at this use.
- Reads: about 2 reads and 2 writes per AI drawing (the counter and the cost record). None in service, no listeners. Free plan limit is 50,000 reads a day.
- Files and work: a new `functions/` folder (the book's first server code that runs on demand), `firebase.json`, a deploy workflow with the service account, an Anthropic API key as a Firebase secret, rules for the counter (server-only), the security header's `connect-src` gains the function's address, a control in the studio (`js/draw.js` / `js/smart.js`), a stand-in for the function in `tests/fake/`, click tests, rules emulator tests, and a way to test the function itself.
- Risk: a new outside service (Anthropic) and a new server runtime; key handling; spending real money; a slow answer (5 to 20 s, estimate) in a studio built for instant taps; reverses two head chef decisions (21 Oct and 15 Nov, below).

**Design references and the benefit to test.** Duolingo (each tap answers at once and truthfully; a long wait needs honest progress and recovery), Headspace (one name for each thing: "Draw it for me" versus an AI button), Flighty (real status: "12 of 20 left today", never stale), Todoist (known defaults visible and editable), Linear (one place for actions, no second system). The benefit to test: fewer hand fixes per drawing and better plates for dishes the rules draw badly, compared with what the 15 Nov rules already do.

## 2. Evidence

### Measurements today (Implemented app and node checks, commit 70ce8f4)

| Check | Result | How |
| --- | --- | --- |
| Draw it for me matcher | 80 dishes, 422 visible ingredients, 415 matched with confidence (98%), 100% drawn | `node tests/smart-match.js` |
| Plating against the book's 76 hand-made plates | score median 0.01, mean 0.23, none over 2, worst seafood-platter 1.5 (15 Nov before the rebuild: median 1.42, 26 of 77 over 2, worst 9.6) | `node tests/plating-check.js` |
| Studio, Chicken Burger, 390 x 844, head chef | Draw it for me: 1 tap, drew 2 parts (burger, chips), note "Drawn by the book: side by side." with Undo and Try another, no page errors | click-test stand-in, screenshot `shots/burger-390-drawn.png` |
| Studio, Coconut Laksa, 1280 x 800, head chef | Draw it for me: 1 tap, 2 parts, "Drawn by the book: classic plating."; Check badge 1; "Which drawing?" asks about **Palm sugar** with picks Sugar snap peas, Cruffin, Poffertjes, Find it in the library, Leave it off | stand-in, `shots/laksa-1280-drawn.png`, also `shots/laksa-390-drawn.png` |
| Taps to a saved plate drawing today | open the slot, Draw it for me (1), Save (1), plus hand fixes (not counted: varies) | stand-in |

Screenshots: `docs/ai-drawing-options/shots/` (burger-390-empty, burger-390-drawn, laksa-390-drawn, laksa-1280-drawn). Synthetic fixture: Ann (head chef), Sam (sous), Bo (staff), the real `js/data.js` recipes.

### Current contracts (excerpts)

- **Head chef decision, 21 Oct 2026:** "Draw it for me: the book draws the plate, the side view and the build drawing from the recipe, and the head chef tweaks it. Plain rules on the device, no AI service." (`docs/head-chef-decisions.md`)
- **Head chef decision, 15 Nov 2026:** "The owner found the auto drawings 'fairly clumsy' and wanted them better, more reliable and easier to use, first asking about AI. After weighing a model on the device, on GitHub and through Firebase, they chose to improve what is there without any AI for now." Plates are laid out from the book's 76 hand-made plates and follow the card's own Plating or Serve steps (43 of 77 dishes have them). **Keep until redraw:** a saved plate changes only when the head chef taps Draw it again. (`docs/head-chef-decisions.md`)
- **Drawing studio, chosen 4 Nov 2026, B "Quiet canvas":** one bar at the thumb (Add food, Plate, Check, More) showing only what can be done now; panels under the drawing, never on it; Draw it for me on the empty plate and its note once; one way to close; More tools as tiles in groups ("Draw it for me", "Draw by hand", "Pick and place", "Keep and reuse"). (`docs/studio-options/brief.md`, Chosen and Build)
- **Draw it for me contract:** plain rules on the device, no AI service, no new reads beyond one `getDoc` of `book/matches`; the same recipe and seed give the same drawing (seeded random only); matcher kept at 85% or more. (`docs/code-contracts.md`, Draw it for me)
- **Drawings made in the book:** everything from Firestore goes through `LK_RX.clean()` (plain shapes and text only); library items are plain SVG with metadata `js/smart.js` relies on. A plate's save also writes the recipe's Pass labels from its parts; the allergen lens reads those labels. (`docs/code-contracts.md`)
- **Access:** head chef and sous chef manage recipes and drawings; signed out sees current recipes and their drawings. Rules enforce access, not hidden buttons. (`docs/private-kitchen-access.md`)
- **Security header:** `index.html` lists every outside service the book may load; a new one is a head chef decision. Today `connect-src` allows `'self'`, `*.googleapis.com`, `www.google.com`, `www.gstatic.com`, pdf.js on jsdelivr and the project's firebaseapp.com. (`CLAUDE.md`, `docs/easy-to-break.md`)
- **Writes:** every write goes through `W()`; no new listeners or polling; reads say when they run and what they cost. (`CLAUDE.md`, `docs/coding-rules.md`)
- **Billing:** Plan C chosen 13 Nov 2026 (Blaze, pay as you go with a US$5 budget alert); the head chef switches it on; not recorded as on. (`docs/firestore-usage.md`, Plan C chosen)
- **After the tap** (`docs/action-feedback.md`, The rule): answer in the tap's own frame; confirm in words where the eye is; a failure stays and keeps the work; a tap that cannot act says why; colour never alone.
- **Loading and motion** (`docs/loading-motion.md`, Behaviour): waits name the actual work; busy buttons keep their width and block repeat submission; a confirmed state only after the answer; reduced motion removes motion, never the words.
- **Surface colours:** the studio is a work tool on the book's quiet paper and charcoal bars (screenshots). No new colour meaning is proposed in round 1.

### Service rules (head chef, 5 Nov 2026)

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it: count the taps for the main task and the lines on a 390 px phone, before and after.

The studio is not a service page. No new tab or top bar button is proposed.

## 3. Council method excerpts (from `.claude/skills/service-council/SKILL.md`)

### Current design contracts

Before either round, read the current `CLAUDE.md` reading map and the affected feature's chosen design and later decisions. Prepare one short evidence packet for every reviewer: the source commit, relevant contract excerpts with file and heading references, baseline screenshots and available measurements. Include this section, Design references and Try to break it below. Fresh agents do not inherit the lead's reading: a bare link or "keep the approved colours" is not enough. Reuse the packet between rounds unless the contracts or proposal change; the quick check reads the same sources without spawning reviewers.

Every visual proposal includes the relevant parts of [shared surface colours](../surface-colours.md#selected-design), [operational colour meanings](../colour-coding.md#shared-meanings) and [design patterns](../design-patterns.md). Include the affected category exceptions, plus [action feedback](../action-feedback.md#the-rule) and [loading and motion](../loading-motion.md#behaviour) when states or interactions are involved. These documents own the tokens and detailed rules; do not create another palette in a feature brief.

### Colour and state checks

| Check | Evidence the council needs |
| --- | --- |
| Surface purpose | Work books, including Orders, use steel; people use sage; current live boards use charcoal; reading and writing stay quiet paper. Check the actual cover, header, edge and interior, not just a palette. |
| State meaning | Local state cues take priority over surface decoration. Attention/pending, confirmed success and failure follow the operational contract. Keep brand/action orange, charcoal Prep Urgent and explicit inclusion/assignment meanings. A sage people surface or green draft assignment is not Saved; neutral upcoming information is not automatically amber. |
| Words and exceptions | Status remains understandable through words, icons, ticks or pressed state without colour. Preserve affected category legends, charts, heat scales, allergen certainty, New/Moved tags, art, celebrations and print. Colour does not establish access or food safety. |
| Real contrast | Measure the rendered foreground and background, including ancestor opacity and light/dark variants: normal text 4.5:1, large text 3:1, meaningful control/state boundaries 3:1 where applicable. Check visible keyboard focus; do not infer a whole-app accessibility pass from token values or screenshots. |
| Relevant states | Show the affected ordinary, selected, disabled, saving/Not sent, Saved, empty and failure states. Distinguish confirmed empty data from a failed read. Exercise acknowledgement, retry and work recovery where affected; list states that do not apply. |
| Service continuity | Measure visible rows, tap targets and main-task tap counts before and after at the relevant 390, 768 and 1280 px widths. Justify lost rows or added taps under the service rules. Keep controls stable through state changes; useful motion respects reduced motion and cannot imply completion or move a live target. |

Round 1 identifies contract risks and the evidence the designs will need. Round 2 records **Contract fit** alongside the reference comparison: **Works**, **Needs work**, **Not evidenced**, or **Not relevant** with a reason, source and evidence for each applicable check. The quick check needs only a short contract-fit note and the relevant evidence. Untested states and contrast remain Not evidenced. Identify the check needed before calling the implementation ready; do not add a review round for missing measurements.

Label measurements as **Preview** or **Implemented app**, with the source commit, role, viewport, fixture and font conditions. A schematic that omits the app header, reminders or full form fields cannot establish delivered density or task cost. Before marking a layout change ready, remeasure the complete implemented app at the relevant widths with its actual shell, full forms, representative data and states. Record any difference from the chosen preview, including extra scrolling, fewer visible lines/groups or added taps. Material departures from the approved design return to the head chef under the existing design-choice rules; do not rerun the whole council for routine verification.

Separate a deliberate proposal to change an approved rule from an accidental violation. Name the exact proposed departure and leave it for the head chef's choice. A high preference score or similarity to another app never makes a contract violation acceptable. Recommend a repair or smaller compliant option where possible; keep unresolved failures and missing evidence visible in the recommendation and handoff.

### Design references

Use these in both rounds and small-change quick checks (head chef, 9 November 2026). They turn the [seven-app research](../whole-app-redesign-options/brief.md#what-the-seven-apps-do-well-and-what-fits-a-kitchen) into questions about the kitchen task. Give this section to every reviewer. Select the principles that apply; briefly explain when none do. There is no reward for copying more apps.

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Are the page frame, action placement and names consistent, with the work more prominent than navigation? | Tiny dense controls, keyboard-only paths or a second navigation system |
| Things 3 | Are today's work and upcoming work distinct? Are occasional details tucked away while frequent actions stay visible? | Drag-only actions or hiding the chosen one-tap Urgent, Recipe and On it controls |
| Airbnb | Can the person see a job's time, place, requirements, status and next action together, without hunting through screens? | Decorative cards, photos or duplicated information that displaces useful lines |
| Todoist | Is adding quick, with known defaults visible and editable, usual items easy to find, and extra fields shown when needed? | Guessing a section, unit or quantity from ambiguous text, or hiding required inputs |
| Flighty | Is what matters now and next clear, with real times, deadlines and status from data the person may already read? | New listeners or polling just for the look, distracting movement or stale status presented as live |
| Duolingo | Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery? | Points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement |
| Headspace | Are labels calm, short and understandable to a new starter, with one name for each thing and words on actions? | Vague reassurance, unexplained icons or onboarding interruptions during service |

The service rules, current feature contracts and the head chef's later choices take priority over the research and its early recommendations. Keep the book's approved colours, notebook style, handwritten line words and functionality. Use existing [design patterns](../design-patterns.md), [action feedback](../action-feedback.md) and [loading and motion](../loading-motion.md). Approved celebrations, Saved/New stamps and useful motion remain; motion must respect reduced motion and never delay an action or shift a live list. Keep current access, draft recovery and read-budget rules.

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

