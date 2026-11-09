# Colour across the whole book

9 November 2026, Queensland. **Preview only. No surface concept has been selected and no production styling is changed.**

The owner clarified the scope: "i mean for all blocks, books, banners, etc.? show me the design across the app in some examples". The earlier status-colour pass in PR #632 addresses small state cues. This comparison addresses the larger surfaces around them.

[Open the comparison](index.html). Choose A, B or C, switch between phone and desktop, and open a matched comparison with the current look. The recommendation is advice for the owner's choice.

[Private interactive preview](https://kitchen-book-colours-j9v6.solarfried.chatgpt.site), published with Sites. It contains the same examples and supports viewing without the source folder. The owner-private deployment is a design gallery, separate from the operational Kitchen Book.

## Examples and source

Ten scenes use the actual app renderer: Home, Prep, Orders, Today's team, Chef to-do, Drinks run, Cleaning, Functions, Recipes and Admin. Each has matching baseline, A, B and C captures at 390 and 1280 px. Synthetic records come from the Firebase stand-in; no private kitchen records are needed. Existing Barlow, Barlow Condensed and Caveat fonts are retained.

An eleventh scene is an explicitly illustrative banner component board using existing component classes. It compares neutral information, attention, confirmation and error treatments together. It is not a claim that these messages appear together in a live workflow.

Source baseline: `c7e52c7`. The proposals layer the prior PR #632 state-colour CSS and preview-only surface rules onto that baseline. This separates the existing look from the proposed combined result. The gallery's [manifest](manifest.json) links each scene and capture.

## Three strategies

### A. Purpose on the whole block

Large cards and book surfaces carry their purpose: charcoal for current live work, sage for people, steel for working notebooks, amber for upcoming information, and ivory for reference and forms. Writing areas stay light enough to read.

For: useful recognition when Home mixes people, work and upcoming cards; strongest visible connection between similar blocks on different pages.

Against: several coloured blocks can compete with a genuine warning. Amber upcoming information can look urgent, and sage people surfaces can look completed. Purpose needs to remain clear from the heading and words.

### B. Coloured books, quiet pages

Chapter colour sits mainly on headings, covers and spines. Prep and general work books use steel, Orders amber, Team sage, Functions charcoal, and Recipes ivory. Writing pages stay warm paper. Existing approved Home surfaces remain in place, preserving the staff-first page's familiar purpose colours.

For: recognisable books with quiet, readable rows and forms; less competition between chapter identity and operational states; preserves Home continuity.

Against: chapter colour describes the book, so a smaller panel inside it may need words to explain its purpose. The amber Orders heading must not imply that an order is due.

### C. Colour only when needed

Routine covers, cards and writing areas stay paper or charcoal. Colour appears locally when something needs attention or has a confirmed state. The live service board remains charcoal.

For: clearest separation between ordinary work and an exception; closest to the current rule that a fill should earn attention; least colour to interpret during service.

Against: less distinct identity between books and less visual separation between people, work and upcoming cards on Home.

## Surface roles and precedence

- **Cover, header and spine:** identify the book or purpose. A sage book is a people book, never a declaration that the whole book is saved.
- **Writing page:** warm paper for rows, quantities, recipe methods, planners and form fields. Preserve existing type, rules, spacing, controls and tick placement.
- **Banner:** communicates the particular message. Neutral information stays quiet; amber names attention; green confirms the stated action; red names an error or refusal. Words and symbols accompany colour.
- **Live board or band:** charcoal remains available inside every chapter for current work, breaks and service timing. It does not mean failure or completion.

Local operational meaning takes precedence over chapter decoration. A failure must stay visible within any book; a due item must remain distinct from a routine amber heading; confirmation colours follow an acknowledged result. Loading, unavailable, empty, unsent and saved states retain their different words. No whole green book implies Saved.

Safety and allergen messages retain conspicuous wording and local emphasis. Chart categories, roster sections and selected controls keep their own labelled meanings. Reference panels and form fields remain quiet even inside a coloured chapter. Ordinary upcoming information must not gain an urgent label merely because it is amber.

## Council

**Verdict: Build smaller, 5 of 5.** Build concrete colour examples across the existing app, then let the owner choose. Keep this pass to surfaces and local state cues. Add no feature, navigation, workflow, data operation or layout change.

These are independent role-based reviews, not research with kitchen staff. Scores are out of 5.

| Reviewer | A | B | C | Preference |
| --- | ---: | ---: | ---: | --- |
| Operations and product | 3 | 4.5 | 4 | B |
| Visual design | 3.7 | 4.5 | 4.3 | B |
| New starter | 4 | 3 | 3.5 | A |
| Keeper of the book | 3 | 4.5 | 4 | B |
| Sceptic | 3 | 4.5 | 3.8 | B |

**Recommendation: B, supported by 4 of 5 reviewers.** Use coloured book headings and spines with quiet writing pages and shared banner meanings. Preserve the approved Home surfaces and charcoal current-work bands. Green and red stay local to actual states.

The new starter prefers A because purpose colours carry the Home relationship into blocks elsewhere. This is a real disagreement about recognition versus visual restraint. The owner has not chosen between them.

## Service cost and verification

| Measure | Before and after |
| --- | --- |
| Main-task taps | No application control or handler changes. Task click journeys were not remeasured for this preview. |
| Complete rows visible at 390 px | Every measured row and control retains its position and size; no extra line is consumed. No absolute row count is claimed. |
| Layout and navigation levels | Existing structure retained. All 60 app-screen comparisons have identical measured geometry. |
| Reads, writes, listeners and rules | No new data behaviour; captures use the stand-in |
| Build size | This preview and its supporting documentation only; production scope follows the choice |
| Relearning | A introduces purpose colours, B chapter identities, C fewer decorative distinctions |
| Main risk | Colour mistaken for urgency, completion or saved state |

Capture and geometry results are in [measurements.json](measurements.json). Ten actual app screens at 390 and 1280 px were captured under the current styles and each of A, B and C. All 60 app-screen comparisons retain identical measured rows, controls and surface bounds, with no page errors or sideways overflow. The illustrative banner board adds six matched comparisons, also with unchanged geometry. The gallery's real manifest renders all 11 examples at 390, 768 and 1280 px; strategy/device switches, comparison, 100% view, Escape and focus return pass, with no page errors or overflow. [Gallery checks](gallery-checks.json).

The visual reviewer inspected B on Home, Prep, Orders, Team, Function service and Admin, plus A/C Prep and Team. B remained their recommendation; no unreadable text or blank panels were observed. A's people-book right page was adjusted to carry its purpose tint so the comparison clearly differs from B's quiet paper page. This is a rendered design review, not a complete WCAG certification or a replacement for staff feedback.

The examples demonstrate rendering in a mocked browser environment. They do not verify production data, real-device legibility, colour perception in kitchen lighting or staff understanding. No usability research has been conducted. These limits do not prevent comparing the three concrete options.

## Choice and next step

**Chosen: awaiting the owner's selection.** The gallery is the reviewable result. A later production change should apply only the selected surface rules, retain the app's service and data contracts, and measure matching task geometry and local states before release.
