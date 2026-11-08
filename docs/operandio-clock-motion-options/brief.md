# Operandio clock motion options

## Chosen

Awaiting the owner's choice. These are six animated mockups: three designs, each on mobile and desktop. The working timer and live book are unchanged. The owner requested the pill interaction and asked to compare the motion before implementation.

Open [the interactive comparison](index.html). Tick Preview chime, then Play animation to hear the existing soft chime. Manual tapping also works. A full automated demo takes 18 seconds, with simulated taps; the manual preview waits for the explicit next tap before starting four hours. All time is synthetic. No preview reads or writes kitchen data.

The flow in every design is clock → Start → two-hour countdown → green Done / Start 4 h → explicit tap → four-hour countdown → final Done. Desktop retains the numeric countdown. Mobile uses a 44px progress clock and a tap reveals the exact time without altering the timer.

## Three designs

| Design | Mobile animation | Desktop header animation | Strength | Trade-off |
| --- | --- | --- | --- | --- |
| A, filling ring | [Play](a-mobile.gif) | [Play](a-desktop.gif) | Familiar clock with a quiet sideways reveal and a clear outside ring | Thin progress ring and small duration badge need a close glance |
| B, filling face | [Play](b-mobile.gif) | [Play](b-desktop.gif) | Larger filled area, with one gentle settle as Start opens | The fill shares space with the hands; more visual weight |
| C, two stages | [Play](c-mobile.gif) | [Play](c-desktop.gif) | Large stage number, completed first arc remains visible during stage two; one completion jiggle | The arcs need learning; equal halves indicate stages, not equal durations |

The recordings show native 390px phone and 1280px desktop layouts. GIFs crop the header to keep the clock readable. The comparison includes the wider page context. B settles by 2px once; C jiggles by 2px once. Reduce motion removes the morph and these effects without removing the state or words.

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

The mobile brand fades while the pill is open; Back, Today's team, Pings and the chef hat remain available and stationary. Desktop reserves 152px for the clock. Tablet widths 720–1099 use two rows within the existing 96px header so the pill never covers navigation. Header height stays 64px on phone and 96px on tablet/desktop. No list is covered.

## Council

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

Recommendation: **A**, with explicit duration labels and a readable Start 4 h caption. Five of six preferred its familiar clock and quiet movement. The cook preferred B's larger progress area for a quick bench glance. C's stage number reads more clearly, but its two arcs and loss of clock hands require more explanation.

All six flagged the small next-action caption beneath Done. The final previews strengthen it to 13px bold while retaining the owner's requested Done label. The designer also identified B's translucent fill contrast; that was increased before the final recordings to 3.28:1 against the header, with 4.13:1 for the hands against the fill. The keeper and skeptic raised countdown screen-reader chatter; the visual readout now opts out of live announcements while the separate polite region announces stage changes only. Tiny duration badges and C's arc interpretation remain visible trade-offs for the owner to compare. No design has been selected on the owner's behalf.

## Verification and boundaries

- Geometry: 216 design/state/width combinations, across 320, 390, 720, 768, 979, 1099, 1100 and 1280px. No overflow, overlapping navigation, clipped copy, moving peers or moving lists. The final 13px caption passed the full geometry rerun; the portable comparison passed its 30 checks again.
- Behaviour: 87 browser checks cover static state capture, pending feedback, explicit manual four-hour start, mobile inspect-only tap, desktop readout, one chime at each completion, mute, reduced motion and no browser errors.
- The hidden button and status retain matching geometry so changing to final Done animates smoothly while the hidden element stays invisible and unavailable to pointer/focus interaction.
- Six real browser recordings show the full sequence. A portable comparison embeds all six previews and local assets. Its 30 browser checks cover frame APIs, responsive modes, tabs, Play, Reset, chime and full-size previews. Google web fonts remain a network dependency; the font stack supplies a fallback.
- This is presentation verification. Shared-device notifications, permission enforcement, network loss, saved deadlines, reopening and personal Got it remain the existing live timer's responsibility. A chosen implementation must reuse that controller and preserve those behaviours, including Start another batch and existing pings.
- No production files, shell version, service worker, Firestore rules or data change. Reverting this documentation PR removes the studies.

## Source

`preview.html` is a script-free synthetic native Prep snapshot with only the existing chime and preview motion script loaded. `motion.js` and `motion.css` implement the three studies. `index.html`, `gallery.js` and `gallery.css` compare them. Baseline and state PNGs document the layouts; six GIFs provide replay without running JavaScript. The [proposal](proposal.md) records the scope before the drawings.
