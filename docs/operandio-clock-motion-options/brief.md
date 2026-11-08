# Operandio clock motion options

## Chosen

**Chosen: B on desktop, fixed filling ring on mobile.** On 9 November the owner said "yeah lets go with b", then "implement and bring live", and requested three loud chimes. The mobile ring remains fixed at 44px in every state. Four hours always waits for a separate tap after two hours. This branch implements that choice using the existing shared timer, not the accelerated preview clock.

The original three desktop designs remain below as the decision record. The prototype comparison uses synthetic time and single preview chimes; production uses the saved server deadlines and three stronger chimes. Implementation verification and release status are recorded at the end of this brief.

Open [the interactive comparison](index.html). Tick Preview chime, then Play animation to hear the existing soft chime. Manual tapping also works. A full automated demo takes 18 seconds, with simulated taps; the manual preview waits for the explicit next tap before starting four hours. All time is synthetic. No preview reads or writes kitchen data.

Desktop keeps clock → Start → two-hour countdown → green Done / Start 4 h → explicit tap → four-hour countdown → final Done. Mobile keeps a fixed circle: clock → orange play icon → filling ring → green tick and chime → explicit tap → four-hour filling ring → final green tick. The first tap arms Start; the second starts two hours. A running mobile clock is a read-only status and never expands. After two hours, four hours waits indefinitely for an explicit tap. The production implementation keeps the existing named Operandio completion ping.

## Three desktop designs, shared mobile ring

| Design | Mobile animation | Desktop header animation | Strength | Trade-off |
| --- | --- | --- | --- | --- |
| A, filling ring | [Play](a-mobile.gif) | [Play](a-desktop.gif) | Familiar clock with a quiet sideways reveal and a clear outside ring | Thin progress ring and small duration badge need a close glance |
| B, filling face | [Play](b-mobile.gif) | [Play](b-desktop.gif) | Larger filled area, with one gentle settle as Start opens | The fill shares space with the hands; more visual weight |
| C, two stages | [Play](c-mobile.gif) | [Play](c-desktop.gif) | Large stage number, completed first arc remains visible during stage two; one completion jiggle | The arcs need learning; equal halves indicate stages, not equal durations |

The recordings show native 390px phone and 1280px desktop layouts. GIFs crop the header to keep the clock readable. The revised mobile GIF adds a separate demo caption beneath the capture so simulated taps cannot be mistaken for automatic stage starts. The comparison includes the wider page context. On desktop B settles by 2px once; C jiggles by 2px once. Mobile has no expansion, bounce or jiggle; all three mobile recordings show the same perimeter ring. Reduce motion removes the morph and these effects without removing the state or words.

## Cost on screen

| Measurement | Existing timer | A | B | C |
| --- | --- | --- | --- | --- |
| Start two hours from Prep | 2 taps | 2 | 2 | 2 |
| Start four hours after first stage | 2 from closed dropdown, 1 from open ping | 1 from Done | 1 | 1 |
| Add / tick a Prep line from its tab | 1 tap | 1 | 1 | 1 |
| Fully visible Prep rows at 390 × 844 | 5 plus 1 partial | Same | Same | Same |
| Timer navigation | 1 dropdown | In-place control | In-place control | In-place control |
| Expected implementation | Already built | 1 UI PR with focused checks | 1 UI PR with focused checks | 1 UI PR with focused checks |
| Relearning | Existing dropdown | Low | Low | Moderate, stage arcs |
| New database reads, rules or libraries | None for this comparison | 0 | 0 | 0 |
| Main risk | Existing behaviour | Small duration badge | Fill legibility | Arc meaning and extra motion |

Measured with the same synthetic native Prep fixture and real Barlow fonts. At 390 × 844 the first row stays at y=323; bottom navigation starts at y=776. All six timer states have identical row positions. The baseline was measured with the preview scripts and CSS disabled, not inferred from a different fixture. Counts differ from older briefs because their fixture and font metrics differ.

The mobile brand stays visible in every state; Back, Today's team, Pings and the chef hat remain available and stationary. Desktop reserves 152px for the clock. Tablet widths 720–1099 use the native header with the same fixed 44px clock, so the former expanded-prompt reservation is unnecessary. Header height stays 64px on phone and 96px on tablet/desktop. No list is covered.

## Council

**9 November quick refinement:** the owner explicitly requested a fixed mobile filling ring. No new control, popup, backend or step is added. Start remains two taps and the second stage still needs its own tap. The mobile trade-off is icon-only actions and no exact inline countdown; accessible names and hover titles name Operandio, the stage and each action. The previous tap-to-inspect expansion is removed. The original council below reviewed the earlier six studies; its votes are not claimed as review of this refinement.

The underlying shared timer retains the earlier Round 1 **Build smaller, 5 of 5** verdict. This presentation round follows the owner's explicit request. Six fresh role reviewers inspected all three mobile and desktop screenshots, with completion and second-stage examples. This is role-based analysis, not research with real kitchen staff.

| Reviewer | First | Second | Third |
| --- | --- | --- | --- |
| Cook mid-service | B | A | C |
| Head chef | A | B | C |
| Skeptic | A | B | C |
| New starter | A | B | C |
| Keeper | A | B | C |
| Screen designer | A | C | B |
| Points, 3 / 2 / 1 | A: 17 | B: 12 | C: 7 |

Original council recommendation: **A**, with explicit duration labels and a readable desktop Start 4 h caption. Five of six preferred its familiar clock and quiet movement. The cook preferred B's larger progress area for a quick bench glance. C's stage number reads more clearly, but its two arcs and loss of clock hands require more explanation.

All six flagged the small next-action caption beneath Done. The desktop previews strengthen it to 13px bold while retaining the owner's requested Done label. The designer also identified B's translucent fill contrast; that was increased before the final recordings to 3.28:1 against the header, with 4.13:1 for the hands against the fill. The keeper and skeptic raised countdown screen-reader chatter; the visual readout now opts out of live announcements while the separate polite region announces stage changes only. Tiny duration badges and C's arc interpretation remain visible trade-offs for the owner to compare. The owner subsequently selected B for desktop and the fixed perimeter ring for mobile. That choice supersedes the council recommendation.

## Verification and boundaries

- Geometry: 216 design/state/width combinations, across 320, 390, 720, 768, 979, 1099, 1100 and 1280px. No overflow, overlapping navigation, clipped copy, moving peers or moving lists. The final 13px caption passed the full geometry rerun; the portable comparison passed its 30 checks again.
- Original behaviour checks: 87 passed for the first set of studies. The current mobile refinement passes 108 focused checks, including fixed 44px geometry, read-only running, explicit manual next-stage start, reduced motion and no browser errors. An extra simulated hour after the first manual timer finishes leaves it waiting at done1. All nine mobile states are pixel-identical across A, B and C.
- The hidden button and status retain matching geometry so changing to final Done animates smoothly while the hidden element stays invisible and unavailable to pointer/focus interaction.
- Three desktop browser recordings and the revised shared mobile recording show the full sequence. The same mobile recording is supplied in all three pairs, matching their verified identical rendering. A portable comparison embeds all six previews and local assets. Its 30 browser checks cover frame APIs, responsive modes, tabs, Play, Reset, chime and full-size previews. Google web fonts remain a network dependency; the font stack supplies a fallback.
- This is presentation verification. Shared-device notifications, permission enforcement, network loss, saved deadlines, reopening and personal Got it remain the existing live timer's responsibility. A chosen implementation must reuse that controller and preserve those behaviours, including Start another batch and existing pings.
- Those checks describe the design previews. The approved implementation below changes the production presentation and cooling sound while preserving the existing timer controller, saved shell membership and rules.

## Source

`preview.html` is a script-free synthetic native Prep snapshot with only the existing chime and preview motion script loaded. `motion.js` and `motion.css` implement the three studies. `index.html`, `gallery.js` and `gallery.css` compare them. Baseline and state PNGs document the layouts; six GIFs provide replay without running JavaScript. The [proposal](proposal.md) records the scope before the drawings.


## Approved implementation, 9 November 2026

The production clock uses the existing authoritative model and start hooks. Header inserts mount the clock once, then patch its control in place through arming, pending and confirmation. Desktop uses B's filled face and one gentle settle; mobile uses the fixed perimeter ring. The existing details route, personal pings, permissions, recovery and new-batch action remain.

`LK_CHIME.playCooling()` schedules three stronger soft chimes through the existing limiter. `stopCooling()` cancels any remaining or delayed notes. The cooling adapter honours sound Off and stops the sequence when the ping closes or the session changes; the sound module also cancels on hiding or leaving the page. Ordinary ping sounds stay unchanged. No new reads, listeners, fields, permissions, external assets or services.

Production verification uses synthetic kitchen data and does not start a real batch:

- UI: 85 checks; shared-controller integration: 55; real-app motion: 83 with real Barlow fonts; controller: 25 test groups. Covers confirmation before countdown, explicit four-hour start, a new batch, fixed mobile geometry, stable neighbouring controls, route repaint, reduced motion and session lock.
- Competing starts: closing a visible refusal restores the confirmed shared countdown without clearing the controller's error detail. The expanded UI regression fails 7 checks on the previous source and passes all 85 with the fix. A new refusal still appears, and stale or missing shared state stays protected. Independently reviewed in Chromium.
- Sound: 34 cooling checks plus 34 existing ping-sound checks. A real OfflineAudioContext measured +4.37 dB RMS and +3.06 dB peak against the ordinary chime, with a peak of 0.726 and no clipping. Physical speaker volume still depends on the device; no hardware or Safari interruption claim is made.
- Actual app screenshots: [desktop Start](implementation/1280-armed.png), [countdown](implementation/1280-first.png), [Done](implementation/1280-done1.png); [mobile Start](implementation/390-armed.png), [ring](implementation/390-first.png), [Done](implementation/390-done1.png).

The full Click tests gate and Pages release follow [PR #615](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/615). This presentation and sound update needs no rules or backend deployment.
