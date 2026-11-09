# Welcome A: focused implementation review

10 November 2026, Queensland. The owner selected A, subject to confidence in the name handling and service layout. This follows the original visual review; it is not a new council round or research with staff.

**Verdict: support the refined A.** The original concern was that a complete long name at enlarged text displaced the team. The implemented heading now uses a compact treatment above 12 characters and a further step above 28 characters on phones. These sizes use rem units, retain Caveat and scale with the person's chosen text size. The complete name remains in the heading. There is no truncation, first-name guessing, extra welcome card or dismissal.

The earlier visual recommendation favoured C because of the long-name cost. The measured refinement resolves that concern for the representative names below while preserving A's clear welcome. This focused review supports the owner's selected A; the original option scores remain historical evidence.

## What was caught and repaired

- A medium name, Ana María O’Neill, still used the large heading with the initial 18-character threshold. At 125% text its 104 px heading pushed the full-team control below the initial phone viewport. Lowering the threshold to 12 produces a readable 33 px heading and keeps the control visible.
- A long name on a shared phone at 125% text made the identity pill overlap the KB mark. The shared header now reserves the brand and action targets, while allowing the name label to use the remaining width. The compact label may ellipsise, but the complete name stays in the accessible label and opens in the menu with one tap.
- The representative 40-character name uses a 1.2rem heading on phones. Its height remains almost identical to the ordinary enlarged-text heading. The shared header repair also passed at 768, 1280, 1400 and 1440 px.
- The seasonal regression exposed Tihar's leftmost marigold string over the new welcome. A runtime comparison against `9ab1910` confirmed that the same signed-in Sam fixture previously said Tuesday and cleared all four tested ornament families. The new Welcome, Sam collided with Tihar. At 125% text, the medium name could also meet Diwali, Lunar New Year and Galungan ornaments. This was a named-heading regression, not a signed-out or timing issue. [Recorded comparison](seasonal-before.json) preserves the measured rectangles and source hashes.

The geometry regression had **2 failures out of 46 checks** before the name-size and shared-header repairs. Its initial completed run passed **49 out of 49** with the real fonts. Expanded seasonal integration coverage now passes **68 out of 68**, including the three representative names at 125%, four ornament families, live renaming during a celebration, Still, desktop and signed-out Home.

The seasonal repair deliberately hides only the anchored ornaments when Home has a named welcome. The celebration explanation and background ambience remain. This CSS follows name changes immediately without a new listener, timer or data read, and changes no heading or card geometry. Signed-out Home retains its ornaments. Giving the complete name and date clear space is preferable to a new decorative layout or shrinking the user's text preference. The existing seasonal explanation itself occupies space above the board; the three-coworker initial-viewport result below applies to ordinary Home, not to a celebration page with that explanation.

## Actual app evidence

These are screenshots of the implemented app with synthetic Firebase records. The capture does not replace the greeting or alter layout DOM. It supplies the app's existing official fonts locally, except for the named fallback cases. [Measurements](measurements.json) record the exact source hashes, including seasonal CSS, and all 34 scenarios; there are 35 screenshots including the opened full-team disclosure.

| Phone at 125% text | Heading height | Team card bottom | Complete coworkers | Full-team control visible |
| --- | ---: | ---: | ---: | --- |
| Ann | 52.00 px | 772.55 px | 3 | Yes |
| Ana María O’Neill | 33.00 px | 753.55 px | 3 | Yes |
| Alexandria Catherine Montgomery-Smythe J, 40 characters | 52.78 px | 773.33 px | 3 | Yes |
| Same 40-character name, fonts unavailable | 52.78 px | 810.97 px | 3 | No |

The 390 × 844 phone tab bar starts at 776 px. Control visibility measures the disclosure itself, not merely the presence of its DOM element. The ordinary and 40-character real-font cards differ vertically by only 0.78 px at enlarged text. Short-name Home keeps the original geometry at 390, 768 and 1280 px. Prep row positions and its Add region are identical for the short and long names in the regression fixture.

Useful captures: [ordinary phone](ordinary-390.png), [40-character enlarged phone](long-large-390.png), [medium name enlarged](medium-large-390.png), [shared enlarged phone](shared-long-large-390.png), [desktop](ordinary-1280.png), [shared wide desktop](shared-long-1440.png), [Devanagari](devanagari-390.png), [CJK](cjk-390.png) and [opened full team](full-team-390.png).

Seasonal integration captures show [Tihar with a long enlarged name](seasonal-long-large-390.png), [Diwali with the medium name](seasonal-medium-large-390.png), [Tihar on desktop](seasonal-long-large-1280.png) and [neutral Home retaining ornaments](seasonal-neutral-390.png). Every captured visible ornament clears the heading and date.

Unassigned, unset and failed-team states retain their distinct wording while welcoming the authenticated person. The functions-only example gets its greeting without the staff day/team board. Signed-out Home remains neutral. A missing display name falls back to the weekday. These captures have no recorded browser errors or horizontal overflow.

## Contract fit and remaining limits

The approved charcoal personal board, sage team card, steel work card, native fonts, tabs, clock and action placement are preserved. Home remains section and break first, then coworkers, then work. No new service action or data read is introduced by the presentation. The familiar-frame and calm-language principles now support A without the earlier representative long-name density penalty.

This is bounded layout evidence. Forty unusually wide repeated glyphs can still require scrolling, especially with fallback fonts; they remain complete and wrap without horizontal clipping. The measured 40-character fallback-font case needs scrolling to reach the full-team control. No universal name-length density guarantee, full accessibility audit or screen-reader validation is claimed. The identity/session regression suite and normal release checks remain separate evidence for rename propagation, sign-out, role enforcement and deployment.

Verification command used the checked-in regression with locally supplied official font faces:

```sh
BASE=http://127.0.0.1:8783/ CHROME=/usr/bin/chromium LK_WELCOME_TEST_FONTS=/tmp/lk-welcome-test-fonts.css node tests/staff-welcome-layout.test.js
```

Without that local font input, the regression requests the same Google Fonts families as the app. If they are unavailable it explicitly skips only the real-font density section; fallback, shared-header and Prep geometry checks still run. The local result above exercised the real-font section in full.
