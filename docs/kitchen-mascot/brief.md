# Leichhardt kitchen mascot animations

10 November 2026, Queensland. The full ten-action animation library requested by the owner, plus the offset smoker as an eleventh bonus. These extend the first two studies using the same Smashed Burger character. The owner confirmed house-smoked food and an on-site offset smoker. This folder is a standalone preview; the live Kitchen Book does not load it.

## Research and direction

The [official hotel homepage](https://leichhardthotel.com.au/) presents a country-inspired social pub with live music, family meals and hearty food. [Eat & Drink](https://leichhardthotel.com.au/eat-drink/) connects its food to Rockhampton's beef heritage and Queensland beef, and highlights smoked BBQ riblets and a double-patty smashed beef burger. Both pages were read on 10 November 2026. The current menu linked by that page is [Spring Food 2026](https://leichhardthotel.com.au/wp-content/uploads/2026/10/Menu-Food-1.pdf). Menu descriptions are inspiration, not edits to the app's recipes.

Our interpretation is country hospitality, generous food and quiet pride in the kitchen's craft. The burger is offered outward with a wink; the smoker is tended with deliberate movements. The offset smoker comes from the owner's direct confirmation, not an inferred equipment specification. Its drawing is illustrative, not a measured copy of the actual machine.

The original Smashed Burger character remains the identity reference: golden star, cyan robot face, pink cheeks, metal limbs, striped navy apron, patterned navy bandana and knot on the viewer's right. All 88 authored poses retain the bandana. These generated pixel-art adaptations are not a pixel-for-pixel recovery of the JPEG or MP4. Small differences in eye shapes, markings and contours remain, including slight frame-to-frame variation. The smoker has softer shading than the star. Keep these limits visible when considering final production art.

The app's existing warm paper, charcoal, steel and orange frame the artwork. The preview imports the current app CSS. Local unmodified copies of the app's existing Barlow fonts, with their SIL OFL licences, keep the preview independent of external font requests. The artwork's bright colours do not become operational status colours. See [surface colours](../surface-colours.md) and [motion](../loading-motion.md).

## The complete animation set

Each clip has eight frames. Serve is the original Burger's up clip; it is not counted twice.

| Clip | Action | Duration | Playback |
| --- | --- | --- | --- |
| Idle | Blink, shift weight and puff the small chimney | 3.80 seconds | Loop |
| Welcome | Raise a hand, wave, smile and lower it | 2.70 seconds | Loop |
| Look around | Left and right glances with shallow turns | 3.32 seconds | Loop |
| Recipe reading | Open the notebook, follow a line, turn a page and close | 3.65 seconds | Loop |
| Ready to cook | Lift the spatula, adjust stance and settle | 3.25 seconds | Loop |
| Smash | Press a beef ball against the flat-top into a thin patty | 3.59 seconds | Once, then hold |
| Flip | Lift, turn and catch one patty, then return it to the grill | 2.68 seconds | Once, then hold |
| Build | Assemble the burger and present the finished tray | 3.90 seconds | Once, then hold |
| Serve (Burger's up) | Present burger and chips, wink, nod and return | 3.18 seconds | Loop |
| Walk | Carry the level tray through a few steps, stop and settle | 2.49 seconds | Once, then hold |
| At the smoker, extra | Open the chamber, tend the food, close and settle | 3.80 seconds | Loop |

Smash and Build change the food illustration, so they hold their final state rather than pretending to be seamless loops. The preview says Settled; Play or Replay explicitly restarts them. Flip and Walk also finish on a settled pose. The gallery exposes all eleven named actions and fetches only the selected atlas. Keyboard arrows browse the choices; Enter or Space loads the focused action.

The smoker has a horizontal chamber, a separate lower side firebox and a chimney at the opposite end. Gestures are decorative and do not report cooking progress, temperatures or food safety.

## Files and playback

- `index.html`, `preview.css`, `preview.js`: isolated review gallery with eleven named actions, paper/charcoal surfaces, Play/Pause, Replay, individual downloads and a larger view when there is room. No app routes, controls or operational data are changed.
- `assets/*-sheet.png`: full-resolution RGBA artwork masters, 1536 × 1024, four columns by two rows.
- `assets/*-sheet-compact.webp`: lossless static sprite atlases, 768 × 512, with 192 × 256 frames. Derived by exact 2:1 nearest-neighbour sampling. All eleven atlases total 3,136,082 bytes; only the selected one loads initially.
- `assets/manifest.json`: version 2, row-major frame order, per-frame durations and a loop boolean. Source masters remain available for future correction.
- `assets/<clip>.webp`: transparent animated WebP exports, with one-shot or looping playback as defined in the manifest.
- `assets/<clip>.gif`: shareable animations composited on the app's warm paper, with matching playback. GIF exports are previews; use the transparent assets for integration.
- `assets/*-still.png`: static first frames and fallback artwork.
- `export-animations.mjs`: repeatable extraction and encoding with ImageMagick 7. Run `node docs/kitchen-mascot/export-animations.mjs` from the repository root.

Serve the repository over HTTP and open `/docs/kitchen-mascot/`. The preview plays actual frames with smoothing off. Reduced motion starts with a still; explicit Play is available. Hidden tabs and offscreen scenes pause. A user's Pause survives visibility changes. Missing atlases fall back to the still; missing stills show an unavailable message.

## Verification and scope

Independent visual review checked all 88 frames for the bandana, character identity and readable props. Look around retains the knot through its shallow turns. Smash visibly contacts and flattens the beef; Flip retains one patty throughout. An initially airborne Walk step was corrected so one boot stays planted, then independently rechecked. The offset smoker layout passes. The limitations above are retained rather than claiming an exact master or perfectly seamless loop.

Browser checks and measurements are recorded in `verification.json`. They cover the isolated preview at 390, 768 and 1280 px, playback, reduced motion, visibility, fallbacks and layout. These are preview checks, not live-app integration evidence or a staff usability study.

All eleven actions are reachable and load at all three widths with local Barlow fonts. The gallery requests one atlas at startup, disposes old players during selection, supports manual keyboard activation and preserves a user's Pause. All four one-shot actions play all eight frames, hold the last with no timer and restart correctly. Reduced motion, actual offscreen suspension, simulated document visibility, rapid selection, live-region announcements and both image fallbacks pass. There were no JavaScript errors or unexpected failed requests. Earlier two-clip checks remain labelled as history. `asset-verification.json` records all 88 decoded animated WebP frames matching the compact atlases exactly, with timings and binary GIF/WebP loop counts verified.

Verdict: Not needed (standalone artwork studies and documentation; no application change). All ten requested actions and the smoker bonus are represented. New placement within Home or service pages remains a separate UI decision under the existing service-council workflow. No reads, writes, listeners, rules, saved fields or shell entries are introduced. Rolling back this folder and its documentation removes the preview without affecting kitchen operations.
