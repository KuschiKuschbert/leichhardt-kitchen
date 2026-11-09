# Leichhardt kitchen mascot animations

10 November 2026, Queensland. Two completed animation studies and reusable assets, based on the owner's selected Smashed Burger character. The owner confirmed house-smoked food and an on-site offset smoker. This folder is a standalone preview; the live Kitchen Book does not load it.

## Research and direction

The [official hotel homepage](https://leichhardthotel.com.au/) presents a country-inspired social pub with live music, family meals and hearty food. [Eat & Drink](https://leichhardthotel.com.au/eat-drink/) connects its food to Rockhampton's beef heritage and Queensland beef, and highlights smoked BBQ riblets and a double-patty smashed beef burger. Both pages were read on 10 November 2026. The current menu linked by that page is [Spring Food 2026](https://leichhardthotel.com.au/wp-content/uploads/2026/10/Menu-Food-1.pdf). Menu descriptions are inspiration, not edits to the app's recipes.

Our interpretation is country hospitality, generous food and quiet pride in the kitchen's craft. The burger is offered outward with a wink; the smoker is tended with deliberate movements. The offset smoker comes from the owner's direct confirmation, not an inferred equipment specification. Its drawing is illustrative, not a measured copy of the actual machine.

The original Smashed Burger character remains the identity reference: golden star, cyan robot face, pink cheeks, metal limbs, striped navy apron, patterned navy bandana and knot on the viewer's right. All sixteen authored poses retain the bandana. These generated pixel-art adaptations are not a pixel-for-pixel recovery of the JPEG or MP4. Small differences in eye shapes, markings and contours remain, including slight frame-to-frame variation. The smoker has softer shading than the star. Keep these limits visible when considering final production art.

The app's existing warm paper, charcoal, steel and orange frame the artwork. The preview imports the current app CSS. Local unmodified copies of the app's existing Barlow fonts, with their SIL OFL licences, keep the preview independent of external font requests. The artwork's bright colours do not become operational status colours. See [surface colours](../surface-colours.md) and [motion](../loading-motion.md).

## The two animations

| Clip | Action | Frames | Cycle |
| --- | --- | --- | --- |
| Burger's up | Lift and present burger and chips, wink, nod and return | 8 | 3.18 seconds |
| At the smoker | Reach, open the chamber, tend the food, close and settle | 8 | 3.80 seconds |

The smoker has a horizontal chamber, a separate lower side firebox and a chimney at the opposite end. Gestures are decorative and do not report cooking progress, temperatures or food safety.

## Files and playback

- `index.html`, `preview.css`, `preview.js`: isolated review page with paper/charcoal surfaces, Play/Pause, Replay and a larger view when there is room. No app routes, controls or operational data are changed.
- `assets/*-sheet.png`: full-resolution RGBA artwork masters, 1536 × 1024, four columns by two rows.
- `assets/*-sheet-compact.webp`: lossless static sprite atlases, 768 × 512, with 192 × 256 frames. Derived by exact 2:1 nearest-neighbour sampling. The two atlases total 612,814 bytes.
- `assets/manifest.json`: row-major frame order and per-frame durations. Source masters remain available for future correction.
- `assets/burger.webp`, `assets/smoker.webp`: transparent animated WebP exports.
- `assets/burger.gif`, `assets/smoker.gif`: shareable animations composited on the app's warm paper. GIF exports are previews; use the transparent assets for integration.
- `assets/*-still.png`: static first frames and fallback artwork.
- `export-animations.mjs`: repeatable extraction and encoding with ImageMagick 7. Run `node docs/kitchen-mascot/export-animations.mjs` from the repository root.

Serve the repository over HTTP and open `/docs/kitchen-mascot/`. The preview plays actual frames with smoothing off. Reduced motion starts with a still; explicit Play is available. Hidden tabs and offscreen scenes pause. A user's Pause survives visibility changes. Missing atlases fall back to the still; missing stills show an unavailable message.

## Verification and scope

Independent visual review checked all sixteen frames for the bandana, character identity and readable props. The offset smoker layout passes that visual check. The limitations above are retained rather than claiming an exact master or perfectly seamless loop.

Browser checks and measurements are recorded in `verification.json`. They cover the isolated preview at 390, 768 and 1280 px, playback, reduced motion, visibility, fallbacks and layout. These are preview checks, not live-app integration evidence or a staff usability study.

All preview geometry checks pass with the actual local Barlow fonts loaded. Earlier full playback checks used system fallback fonts after Chromium rejected Google's certificate; this condition is separated in the evidence. The final live-region check observed six frame changes with one Playing announcement, followed by one Paused announcement. There were no JavaScript errors. `asset-verification.json` records that all sixteen decoded animated WebP frames match the compact atlases exactly, with all frame durations preserved.

Verdict: Not needed (standalone artwork studies and documentation; no application change). The owner's requested two animation subjects are represented. New placement within Home or service pages remains a separate UI decision under the existing service-council workflow. No reads, writes, listeners, rules, saved fields or shell entries are introduced. Rolling back this folder and its documentation removes the preview without affecting kitchen operations.
