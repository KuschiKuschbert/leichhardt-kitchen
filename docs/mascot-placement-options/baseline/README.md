# Actual app baseline

Captured from commit `69589ff6590d20d4ec5a4ed7f1dfcbf201007b5a`. App source matches main `7f85629`; the branch adds mascot assets and documentation. These are observations of the existing app, not placement previews.

The browser used `tests/lib.js` Firebase stand-ins and the busy signed-in staff fixture from `tests/home-staff-first.test.js`. All staff and service records are synthetic. No production data or services were read. The configured kitchen clock is 14:00, and the function service banner remains visible on the work pages. The default recipe presentation is Pass.

Barlow 400/600/700 and Barlow Condensed 700 came from the existing mascot font folder. Caveat 700 came from the existing licensed font in `docs/order-list-options/assets/`. Browser routing answered the app's existing Google Fonts requests with these local files. All five used faces report loaded. No application files were changed.

## Captures

| Viewport | Home | Recipes | Smash Burger | Smoked Brisket |
| --- | --- | --- | --- | --- |
| 390 × 844 | [Home](home-390.png) | [Recipes](recipes-390.png) | [Smash](smash-390.png) | [Brisket](smoked-brisket-390.png) |
| 768 × 1024 | [Home](home-768.png) | [Recipes](recipes-768.png) | [Smash](smash-768.png) | [Brisket](smoked-brisket-768.png) |
| 1280 × 900 | [Home](home-1280.png) | [Recipes](recipes-1280.png) | [Smash](smash-1280.png) | [Brisket](smoked-brisket-1280.png) |

Also captured: [Prep at 390 × 844](prep-390.png) and [Smoked Brisket lower page diagnostic](smoked-brisket-390-lower.png).

## Measured geometry

Values are CSS pixels at the top of the page. Complete rectangles and font status are in [baseline.json](baseline.json).

| Measurement | 390 | 768 | 1280 |
| --- | ---: | ---: | ---: |
| Top bar height | 64 | 132 | 132 |
| Home welcome top | 88 | 180 | 164 |
| Own day bottom | 370.9 | 491.7 | 469.3 |
| Coworkers bottom | 594.7 | 486.2 | 463.8 |
| Recipe search top | 205.9 | 307.8 | 307.8 |
| Smash ingredients heading top | 1502.3 | 1495.1 | 894.9 |
| Brisket ingredients heading top | 1375 | 1515.4 | 671.2 |

At 390, Home shows the complete personal section, shift hours, break and return, both overlapping coworkers and the closed full-team disclosure above the tab bar at y=776. Prep shows four complete rows above the fixed Add a line dock at y=707. A fifth row extends beneath the dock and does not count as fully visible.

The existing busy service banner and default Pass drawings explain the recipe ingredient positions. These numbers should not be compared with a simplified recipe mock-up that omits those elements.

## Exercised actions

- From Home to Smash Burger: tap Recipes, tap Search, type `smash`, tap the matching result. Three taps plus text entry. Once Recipes is open, focusing Search takes one tap; opening the filtered result takes one more.
- From Smash Burger top to ingredients on phone/tablet: one Ingredients tap. The heading lands at y=118 in this fixture. Desktop has no visible section-jump row.
- From Prep: one Add a line tap opens the dialog with the text field focused.
- From Prep: one checkbox tap changes the count to `1 of 6 done`.

These checks exercise the existing controls. They do not claim any proposed mascot implementation preserves those paths.

## Baseline limitation

All captures have zero browser errors. Every capture fits horizontally except Smoked Brisket at 390. Its document width is 486 px, a 96 px overflow, repeated in a fresh context and after scrolling. The long batch description in the existing narrow-screen `.eyebrow` treatment extends past its column. This is recorded as an existing issue and was not changed by this artwork placement task.
