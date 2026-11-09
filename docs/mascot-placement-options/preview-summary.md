# Round-2 evidence guide

Read with `evidence-packet.md` and `brief.md`. Source app commit `69589ff` matches main `7f85629`; candidates are local injections in `candidate.js`/`candidate.css`. **Preview**, not delivered app. All data is synthetic. Local Barlow and Caveat files answer the app's font requests; the complete real shell, busy service banner, staff context and default Pass recipe drawings remain present. Screenshots of B/C are labelled as scrolled views, not initial screens.

## Designs and captures

| Design | Central idea | Representative 390 px image | Other sizes |
| --- | --- | --- | --- |
| A | Brief non-interactive greeting in existing Home space, then still | `evidence/a-home-390.png` | `a-home-768.png`, `a-home-1280.png` |
| B | Closed fold after the full relevant recipe; explicit Play for burger/smoker art | `evidence/b-smash-open-390.png`, `evidence/b-brisket-open-390.png` | Same names with 768/1280; `b-smash-closed-*` |
| C | Closed full collection after Home's work; explicit Play | `evidence/c-home-open-390.png` | Same name with 768/1280; `c-home-closed-*` |

All are actual-app browser captures with injected candidates. A adds no height. B/C add their disclosure after the core content and before the existing global footer, so they intentionally move that footer farther down. They do not move the core recipe or Home work. All three options differ in at least two meaningful ways: placement/hierarchy and trigger/disclosure. The complete animation collection already exists outside the app at `docs/kitchen-mascot/`.

## Measured service cost

`preview-verification.json` records before/after DOM geometry, requests, controls, exercised actions and playback checks for 390×844, 768×1024, 1280×900. `baseline/baseline.json` owns the separate Implemented app baseline. Inspect checks and limitations, not just totals.

| Task or cost | Baseline | A | B | C |
| --- | --- | --- | --- | --- |
| Home → Smash via Recipes/search | 3 taps + typing | 3 + typing | 3 + typing | 3 + typing |
| Ingredients jump on phone/tablet | 1 tap | 1 | 1 | 1 |
| Prep Add / tick, 390 | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| Full Prep rows above fixed dock, 390 | 4 | 4 | 4 | 4 |
| Extra navigation levels | 0 | 0 | 0 | 0 |
| New disclosure depth | 0 | 0 | 1 | 1 |
| Optional initial animation interaction | None | 0 | Open + Play, plus scrolling | Open + Play, plus scrolling |
| New Firebase calls from injection | 0 | 0 | 0 | 0 |

A's normal phone sprite is 64×85.33 at x310/y76, between the y64 top bar and y168.78 first card. The greeting/date/card rectangles match before/after. B/C are closed without any mascot-media request; opening requests one still, and Play requests one atlas. They share one player and dispose replaced selections. The recipe and Home core geometry is preserved in measured pairs. The baseline Brisket phone overflow remains 96 px; it predates these candidates.

## Independent A edge checks

`evidence/a-edge-verification.json` covers eight 390 px scenarios with exact before/after rectangles and synthetic read/write counters: normal, forty-character name, Extra large text, long name plus Extra large, Christmas with named heading, locked Home, reduced motion and blocked art. All preserve existing rectangles and add no fixture reads/writes. Long names and locked Home omit artwork before requesting it. Extra large Ann and Christmas fit. Reduced motion makes no atlas request and stays still. Normal arrival settles and a return from Recipes stays still. Deliberately aborted artwork requests create expected network-console messages, not JavaScript exceptions; the decoration disappears without displacement.

## Scope and limits

The main verification also covers explicit Play/Pause, Smash settling/replay, real-scroll IntersectionObserver suspension, test-controlled visibility events, the collection's eleven choices, missing-art fallback and control geometry. Check the final JSON for any unresolved results. Visibility simulation is not a claim about every browser's native background throttling. Existing save/read states are untouched by this docs-only study; no held-write/server-enforcement claim is made. Native offline saved-shell behaviour, production mount/dispose integration, assistive technology and physical kitchen legibility still need the chosen implementation's checks.

Rendered B contrast/focus appears in the main JSON. Supplementary `contrast-verification.json` directly measures C at all three widths, ancestor opacity and control boundaries. It preserves the reproduced transient chip-selection contrast failure and verifies its preview-only CSS repair across B/C: 31 passing targeted checks, 144 immediate/intermediate/settled sample moments, minimum 5.27:1. The initial council packet predated these supplementary measurements, and reviewers' original evidence gaps are retained in the brief. Disabled/loading/unavailable-state contrast remains outside this bounded check. No whole-app accessibility pass follows from this study.

## Round-2 review

Use your role's brief in `.claude/skills/service-council/reviewers.md`, under 300 words. Decide whether the alternatives are structural. Rank A/B/C best first, with a strength and weakness each. Give Contract fit and reference fit with actual evidence/limits. Assess A+B+C explicitly: useful or rejected part from each, interaction costs, whether a blend beats your first choice. Finish with one named recommendation and downside. The skeptic/keeper should prioritise up to three realistic break-it scenarios. Unsupported cases remain Risk / Not evidenced. There is no numerical score scale; the requested score is an ordinal ranking.
