# A place for the kitchen mascot

10 November 2026, Queensland. **Recommend A: a brief Home welcome, once then still. Owner decision pending.** All six round-2 reviewers rank A first. These are isolated design previews, not production placements. [Compare the three designs](index.html) or [watch A in the actual Home layout](evidence/a-home-motion.mp4). The live app has not been changed.

Source: `69589ff6590d20d4ec5a4ed7f1dfcbf201007b5a`; application files match main `7f85629`. [Proposal](proposal.md), [shared evidence packet](evidence-packet.md), [implemented-app baseline](baseline/README.md). This is role-based council analysis, not research with real staff.

## What the character brings

The owner chose the Smashed Burger star robot: gold star, cyan face, pink cheeks, grey limbs, striped apron and patterned navy bandana with the knot on the viewer's right. That identity stays in every action. The [asset brief](../kitchen-mascot/brief.md) records the official hotel/menu research: country hospitality, Rockhampton beef, generous burgers and house-smoking. The owner confirmed an offset smoker on site.

The character can make the app feel like this kitchen. No speed, learning or productivity gain has been established. It must not become a second status system, obscure staff's work, demonstrate an unverified method or imply that food is cooked safely. The current native wait, Saved, Not sent and failure feedback remains authoritative.

## Round 1: should it enter the app?

**Verdict: Build smaller, 5 of 5.** All five independently favour a small Home greeting, with most recommending that recipe placement and an in-app collection be cut from the first release. Each reviewed the same proposal, actual-app baseline and contract packet. The cook, head chef and new starter flagged missing design-pattern excerpts; the packet was completed before round 2. Their original evidence criticism is retained here rather than erased.

| Reviewer | Main reason | Most useful change |
| --- | --- | --- |
| Cook mid-service | Home's Prep block starts at y743 against a y776 tab bar; recipes already require scrolling | Brief greeting in existing space; no automatic recipe playback |
| Head chef | Branding is the demonstrated benefit, not time saved; eleven atlases cost 3.14 MB | Include a still as the cheapest comparator; defer recipe placement |
| Skeptic | Existing welcome and celebrations already provide warmth | One small placement at a time; do not blend by default |
| New starter | A cooking cartoon could be mistaken for instructions or readiness | Small non-interactive Home greeting, then still |
| Keeper | Zero new reads fits the free plan, but updates and playback need maintenance | One still and one selectively loaded brief animation |

There is no dissent on the verdict. There are differences in emphasis: the head chef prefers a still first, while the cook and new starter allow a short greeting. Contract compliance of a future implementation remains Not evidenced. Baseline screenshots cannot establish animation lifecycle or real kitchen legibility.

## Three designs

All three preserve the bandana and pixel art. They use existing app fonts, paper and controls. None adds navigation, a floating overlay, a mascot save celebration or an operational write.

| Dimension | A: A wave at the top | B: A moment with the menu | C: Meet the kitchen mascot |
| --- | --- | --- | --- |
| Placement | Existing Home greeting's spare space | After the complete relevant recipe | After all existing Home work and Coming up |
| Hierarchy | Small decoration next to personal welcome | Secondary, closed reference fold | Secondary, closed collection fold |
| Trigger | Welcome once per page session, then still | Open fold, select a food action and Play | Open fold, select any action and Play |
| Scope | Welcome only | Burger actions; smoker scene on a house-smoked recipe | All eleven actions |
| New app controls | None | Native disclosure and player controls | Native disclosure and player controls |
| Name/text priority | Omit mascot if it cannot fit without displacement | Home untouched | Home heading untouched |
| Main downside | Small art; sometimes absent for long names | Weak service benefit and possible instructional confusion | More controls and maintenance; little connection to a task |

Every pair differs in both layout/hierarchy and interaction or task location. A changes least. B ties the artwork to the menu. C gives the full library one optional home while keeping it away from the work above it. B and C are credible alternatives for an owner who values broader access to the artwork, not claims that staff need another task.

### What the full library is for

| Animation | Sensible use | Boundary |
| --- | --- | --- |
| Welcome | Short arrival beside Home's existing welcome | Once, then settle; never replay on clock paints |
| Idle | A resting pose or optional collection loop | No permanent movement beside lists |
| Look around | Optional collection/brand scene | No tracking or glancing that implies alerts |
| Recipe reading | Optional collection or future introductory material | Never a recipe-loading indicator |
| Ready to cook | Optional burger illustration | Does not assert a station is ready |
| Smash / Flip / Build | Optional burger artwork under B, or collection | Separate from the written method, quantities and plating |
| Serve | Optional burger presentation or collection | Never a queued/successful-save indicator |
| Walk | Optional collection/brand scene | Never walks over the app or moves a control |
| At the smoker | Optional house-smoked recipe artwork under B | Represents the on-site offset smoker, not temperature, time or doneness |

The existence of an animation does not oblige the app to display it. The complete standalone collection remains useful for review and future brand material.

## Implementation after a design is chosen

Promote only the selected public art into a versioned application asset directory, such as `assets/mascot/`, rather than make the app depend on the design-study folder. Use a small plain-JavaScript sprite player, with the existing compact lossless WebP atlases and manifest timings. Preserve original artwork; use integer pixel coordinates, disable canvas smoothing and apply `image-rendering: pixelated`. A still exists before an animation loads. The player owns rendering only, not cooking, saved work, identity or network status.

Home's `homeHeading()`/`homeWelcomePaint()` in `js/app.js` already own the full-name greeting. Reserve no extra card height, and use measured available space before showing art. Keep the full name and date exactly as approved. The app's central render replaces `app.innerHTML`, so mount/dispose must follow that lifecycle, including route changes and redraws. Do not attach a new greeting to each minute's clock paint.

B would require an explicit, reviewed mapping of recipe IDs to artwork. Recipe text may be overridden by saved edits; do not guess the animation from a name or treat it as a recipe source. Keep the existing Pass/Tiles renderers, ingredient jumps, allergens and plating drawings intact. C would reuse one player and load only the selected clip.

Start still for reduced motion; stop animation on hidden/offscreen, navigation and disposal. A finishes after 2.7 seconds and does not need a new pause control. B/C require explicit Play, Pause and Replay, retain user pause intent and avoid frame-by-frame screen-reader announcements. Failed or unavailable art leaves the task and its dimensions usable. No art belongs on PIN, identity or mandatory recovery gates.

No Firebase read, listener, rule, stored staff preference or operational field is required. Do not fetch all eleven atlases at startup. Keep master PNGs, GIFs and unused clips out of the saved shell. A later player/CSS startup entry must join the index, `sw.SHELL` and both upkeep lists as one coherent generation. Optional media needs a bounded, versioned cache or a still/omission fallback; an atlas failure cannot prevent a complete app update or an offline recipe opening. Preserve the last valid saved generation and all private drafts.

Ship as one focused implementation PR after selection, followed by the normal release checks. B/C have a larger testing surface than A. The exact file/byte budget will be measured from the chosen implementation, not estimated from all masters in this asset branch.

## Verification boundaries

The baseline includes the real top bar, tab bar, busy function-service banner, personal cards and current typography. Synthetic staff Ann and made-up services come from the existing test fixtures. At 390, four Prep rows are fully visible above the fixed Add dock; a fifth geometrically inside the viewport is occluded and is not counted. Search takes three taps plus text entry from Home to Smash, and Ingredients takes one tap on phone/tablet.

An existing Smoked Brisket 390 px overflow of 96 px was reproduced before any mascot injection. It comes from the long batch eyebrow and is not repaired or attributed to the mascot here. Captures are browser-fixture evidence, not a claim about kitchen lighting, real devices, screen-reader usability or server enforcement.

## Preview measurements

[Main verification](preview-verification.json): 171 passing checks, 25 captures, all three viewports. [Independent Home edge checks](evidence/a-edge-verification.json): eight scenarios. [Gallery navigation check](gallery-verification.json): 390, 768 and 1280 px, every screenshot-width and example choice loads, 44 px controls, no overflow or JavaScript exceptions. The [round-2 evidence guide](preview-summary.md) makes the sources and limits explicit.

| Task or cost | Implemented baseline | Preview A | Preview B | Preview C |
| --- | --- | --- | --- | --- |
| Home to Smash via search | 3 taps + typing | Same | Same | Same |
| Ingredients jump, phone/tablet | 1 tap | 1 | 1 | 1 |
| Prep Add / tick, 390 | 1 / 1 tap | 1 / 1 | 1 / 1 | 1 / 1 |
| Full Prep rows above Add dock, 390 | 4 | 4 | 4 | 4 |
| Extra navigation levels | 0 | 0 | 0 | 0 |
| New disclosure depth | 0 | 0 | 1 | 1 |
| Optional animation interaction | None | None | Open + Play; select adds a tap | Open + Play; select adds a tap |
| Mascot media before an optional fold opens | None | One welcome still and atlas | None | None |
| New fixture Firebase calls | 0 | 0 | 0 | 0 |
| Build size, estimate after selection | None | One focused PR | One larger PR with recipe mapping | One larger PR with collection controls |
| Relearning | None | None | New optional controls | New optional controls |
| Leading risk | Existing behaviour | Mount/dispose and small art | Instructional ambiguity and recipe mapping | Duplicate collection and asset/test coverage |

A's normal 390 px sprite is 64×85.33 px at x310/y76. It has 12 px clearance below the top bar and 7.45 px before the first work card. Heading, date and staff/work card geometry is unchanged. The larger text and Christmas fixtures also fit; the forty-character name and locked Home omit art before requesting it. Reduced motion requests no atlas and stays still. Returning Home in the same page session stays still. The motion capture shows the actual rendered 2.7-second greeting and one second at rest.

B/C keep all measured core recipe/Home geometry unchanged. Their folds intentionally move the global footer down, both when closed and opened. Opening fetches a still only; Play fetches the selected atlas. The main tests exercise manual pause, one-shot Smash settling and replay, replacement across all eleven collection choices, offscreen suspension, blocked artwork and successful retry. Hidden-tab checks use a test-owned `document.hidden` value and the visibility event; offscreen checks use actual scrolling. Expected aborted-resource console messages are recorded separately from JavaScript exceptions.

The Welcome atlas is 263,554 bytes and its still 44,100 bytes, plus the manifest/player. That is the relevant first-use art cost for A, not all 3.14 MB of atlases. These are uncompressed transfer-file sizes, not measured real-device latency or memory. Master sheets and GIFs remain outside the application startup plan.

## Round 2: ranking and disagreement

All six fresh reviewers inspected the same contracts and evidence, each with all three options. The score is an ordinal ranking, best first; no numerical score was requested or inferred.

| Reviewer | Ranking | Recommendation and reservation |
| --- | --- | --- |
| Cook mid-service | A, C, B | A alone; branding adds no demonstrated service benefit |
| Head chef | A, C, B | A with a still first; questions animation maintenance for a brand benefit |
| Skeptic | A, C, B | A alone; sometimes absent, and existing welcome already supplies warmth |
| New starter | A, C, B | A alone; no learning benefit, cooking verbs in B could mislead |
| Keeper | A, B, C | A once then still; prefers B over C's broader maintenance scope |
| Screen designer | A, C, B | A; bandana detail remains small and disappears when names need room |

There is agreement on A's placement, not unanimous agreement on animation: the head-chef reviewer recommends a still first. Five reviewers prefer C to B as a fallback because it separates play from recipe instructions; the keeper ranks B second because it exposes fewer actions. These are advisory role perspectives, not the owner's decision or observations from staff.

### Reference comparison

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: keep the work prominent | Works: no new control or displacement | Works: core recipe remains above fold | Works: work remains above fold |
| Things: occasional detail stays optional | Works: no extra task | Works: closed disclosure, explicit Play | Works: closed collection, explicit Play |
| Airbnb: complete task context | Works: staff context stays together | Needs work: more page length and farther footer for no established task value | Works above fold; extra collection does not add task context |
| Todoist: quick entry | Works as a constraint: Prep Add/tick unchanged | Works as a constraint: same checks | Works as a constraint: same checks |
| Flighty: real state and no decorative polling | Works: zero new fixture calls | Works: no operational status or requests | Works: one player, no operational status or requests |
| Duolingo: truthful feedback | Works: greeting carries no success claim | Needs work: cooking verbs can imply steps; actual confusion not tested | Works in preview: labelled playback, no work reward |
| Headspace: calm, understandable words | Works: existing welcome remains | Needs work: Ready/Serve may look instructional | Needs work: new starter flagged unfamiliar “Idle” |

The comparisons describe the measured preview and the role reviews. They do not establish kitchen comprehension or task speed. The references support restraint; resembling a favourite app is not the goal.

### Contract fit

| Check | Result and evidence |
| --- | --- |
| Surface purpose | Works in Preview: existing charcoal/sage/steel Home blocks remain; reference folds use the shared reference-paper token. No work surface is recoloured. |
| State meanings and words | Works in Preview: native operational state UI is untouched. Artwork never denotes Saved, completion, temperature or a running cook. B/C use playback words. B's instructional interpretation remains a risk. |
| Art exception | Works: the approved pixel art and bandana are reused directly; sprite colour does not replace operational colour. |
| Rendered contrast | B's measured normal text ranges from 5.05:1 to 16.87:1, with 3 px ink focus rings at 14.69:1 against reference paper. Round-2 reviewers correctly marked C-specific contrast, ancestor opacity and boundaries Not evidenced in the initial packet. The later [direct C measurements](contrast-verification.json) resolve that gap: all ancestors have opacity 1 without filters/blending, normal text is at least 5.05:1, meaningful boundaries at least 4.35:1 and all 42 focused controls retain a 3 px ring at 14.69:1. The folds have no dark variant. Disabled/loading/unavailable-state contrast remains outside this bounded check. No whole-app WCAG claim. |
| Targets and service continuity | Works in Preview: added controls are at least 44 px; measured task geometry, taps and unobscured Prep rows remain unchanged. B/C move the footer and add optional scrolling. |
| Ordinary/selected/loading/unavailable | Checked in bounded preview fixtures for B/C. Blocked media leaves content usable, and retry recovers after unblocking. A omits unavailable art. |
| Saving/Not sent/Saved and operational empty/failure | Not relevant to new decoration state. Existing native states are not replaced or re-certified. No new data operation exists. |
| Reduced motion and playback | Checked in the preview: A remains still; explicit playback, pause, one-shot settling and real offscreen stopping pass. Background visibility uses simulation, not a native mobile lifecycle claim. |
| Production offline, access and recovery | Not evidenced by this study. Actual saved-shell update/offline reopening, mount/dispose, identity redraw and real-device checks remain implementation requirements. No new authority is granted by art. |

### Break-it findings and disposition

| Scenario | Evidence and consequence | Disposition / smallest later check |
| --- | --- | --- |
| Long name or Extra large text crowds the welcome | Checked in eight A edge fixtures: unchanged rectangles; forty-character names omit art before requests | Preserve the measured-space guard; remeasure the chosen implementation with full names and app text settings |
| Seasonal art competes with greeting | Checked in the synthetic Christmas named-Home fixture: 64 px mascot fits without moving work | Keep seasonal heading exclusion; physical legibility and further active celebration combinations remain Not evidenced |
| Missing artwork blocks or shifts work | Checked in synthetic aborted-request fixtures: task geometry remains; A disappears; B/C retry recovers | Keep artwork optional; separately test native offline saved-shell recovery |
| Return, redraw or handover repeats/leaks playback | Return navigation and preview replacement pass; real app identity redraw/handover lifecycle is Risk / Not evidenced | Mount/dispose in existing render paths, then count active timers/observers through redraw and handover |
| An optional atlas prevents a saved-shell update | Risk / Not evidenced; previews do not exercise service-worker generations | Interrupt art requests during isolated update/offline reopening; preserve last complete generation and usable recipes |
| New starter interprets B as the recipe or food readiness | Risk / Not evidenced, raised across the reviews; no staff confusion was observed | Reject B in the first integration. If reconsidered, test actual understanding and preserve written methods |
| Broader collection duplicates existing gallery | Observed design cost: eleven choices and Open/Play below Home work; no measured task benefit | Keep the complete gallery outside the service app |
| Selected chip text changes before its background finishes fading | Reproduced in the supplementary contrast check: inherited 180 ms background interpolation caused 30 intermediate samples at 2.34–2.83:1 | Fixed only in preview chip CSS by switching text/fill/border together while retaining scale/translation/shadow feedback. All 31 targeted repair checks pass across B/C at all widths; 144 immediate/intermediate/settled sample moments are at least 5.27:1. Original failures remain in the record. The comparison gallery uses the same restriction. No production CSS changed. |
| Brisket 390 px overflow | Reproduced in the baseline before injection, unchanged at 96 px | Existing separate issue; do not attribute it to this proposal or silently expand this task |

No demonstrated access, data-loss or service-blocking fault was found in the bounded injected previews. That statement does not certify the future production integration.

## All-three mix and recommendation

| Source and part | Take or reject | Principle and kitchen effect | Cost / evidence |
| --- | --- | --- | --- |
| A: existing-space greeting and omission rule | Take | Linear: identity without moving work | Exact phone/tablet/laptop geometry and A edge fixtures |
| B: recipe attachment | Reject for first integration | Headspace/Duolingo: avoid cooking ambiguity | Removes mapping maintenance and a new recipe disclosure |
| B: deferred loading / explicit playback when interactive | Keep as an engineering rule for any future optional art, not another placement | Things/Flighty: pay only when used | B/C lazy-load and playback fixtures; A retains its bounded automatic greeting |
| C: full in-app collection | Reject | Things: keep occasional exploration outside service work | Existing standalone gallery already exposes all eleven actions |
| C: one-player reuse | Keep as an implementation principle, not another UI | Flighty: bounded rendering work | Replacement and lifecycle checks in the standalone/injected previews |

**Recommend A alone, with the 2.7-second Welcome once per page session, then a still.** It meets the owner's animation request and gives the app a recognisable kitchen identity while preserving the existing service layout. The head-chef reviewer's still-first alternative remains a reasonable lower-cost choice. The main downside of A is that the character is small and occasionally absent; it is branding, not an established efficiency improvement.

An A+B+C app mix does not beat A: it duplicates access, adds disclosures and playback controls, increases page length and broadens maintenance without demonstrated kitchen value. Reusing loading/lifecycle principles does not create a combined UI proposal. No mix is recommended, so no combined preview or inherited mix score is claimed.

**Chosen: pending owner selection.** The next authorised implementation should be limited to that selection. The repository's service-council rule requires showing the alternatives and recommendation before changing the app; no production code or release was performed by this study.
