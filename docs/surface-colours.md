# Shared surface colours

9 November 2026, Queensland. **Chosen and implemented: B's book structure, A's purpose meanings and C's restraint.** After reviewing the app-wide examples, the owner approved this hybrid and authorised implementation. This extends the [operational status-colour pass](colour-coding.md) in [PR #632](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/632).

## Selected design

Colour identifies an existing book or block through its cover, header, spine or quiet edge. Warm paper remains inside for reading and writing. Use purpose consistently across pages: steel for work, sage for people, charcoal for current live boards and bands, and quiet ivory for reference and forms. **Orders uses steel.** The amber Orders identity shown in the original B preview was not selected.

Amber belongs to named attention or pending work; green confirms the stated success; red identifies errors, invalid entries and existing destructive or adverse actions. Keep the words, icons, ticks, pressed states and confirmation timing. A sage people book never means that the whole plan is Saved.

| Role | Shared surface token or treatment |
| --- | --- |
| Work covers, headers and edges | `--surface-work: color-mix(in srgb, var(--steel) 65%, var(--paper))`; `--surface-work-edge: #A9AFB6` |
| People covers, headers and edges | `--surface-people: #EAF5EE`; `--surface-people-edge: #8AA391` |
| Reading and writing interiors | `--surface-paper: #FBF8F1` |
| Reference, form and quiet information surfaces | `--surface-reference: #F2EFE8` |
| Current live boards and bands | Existing charcoal with readable light text and local state accents |
| Attention, pending, confirmed success and error | Shared operational tokens in [colour coding](colour-coding.md), with explicit state words |

Prep, Orders, Chef to-do, Drinks run, Cleaning and general work blocks share the work family. Team and people blocks share the people family. Functions retain quiet card bodies and charcoal current-service strips. Recipes, instructions and form fields retain quiet paper. Home keeps its approved staff-first layout and familiar purpose surfaces; its attention board remains distinct from the personal charcoal board.

Local state meaning takes precedence over surface decoration. Failed reads, Not sent, Saving, Saved, unset, unavailable and confirmed empty records retain their different wording. Neutral information does not acquire attention styling merely because it is upcoming. Existing explicit assignment/inclusion green retains its label and does not acknowledge a save.

Preserve the existing meanings of category palettes, chart series, heat scales, roster timeline segments, allergen certainty, function New/Moved tags, drawings, seasonal art and print. Keep the named charcoal Prep Urgent treatment. No broad surface selector may recolour those meanings or imply that food is safe.

## Council and owner decision

The owner first clarified that the work covered whole blocks, books and banners, then reviewed three actual-app strategies: A, purpose on the whole block; B, coloured books with quiet pages; C, colour only when needed. The [preview record](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/634) retains the design comparison. Its original options remain historical proposals; the selected hybrid here is the production contract.

**Verdict: Build smaller, 5 of 5.** Keep the work to surfaces and existing local states, preserving layouts, service steps and data behaviour. These are independent role-based reviews, not research with kitchen staff. Original option scores are out of 5:

| Reviewer | A | B | C | Preference |
| --- | ---: | ---: | ---: | --- |
| Operations and product | 3 | 4.5 | 4 | B |
| Visual design | 3.7 | 4.5 | 4.3 | B |
| New starter | 4 | 3 | 3.5 | A |
| Keeper of the book | 3 | 4.5 | 4 | B |
| Sceptic | 3 | 4.5 | 3.8 | B |

B was recommended by 4 of 5 reviewers. The new starter preferred A because purpose meanings carry Home's recognition into blocks elsewhere. The owner chose the hybrid above, retaining that purpose continuity while limiting stronger colour to headers, covers and states. These scores assess the original options, not a separate review of the final hybrid.

## Implementation boundaries and acceptance

- Retain the existing page structure, responsive layout, type, controls, dimensions, navigation, permissions and handlers. Add no task step, saved field, read, write, listener or dependency.
- Put shared surface values in `:root` in `css/app.css`; use the existing selectors and notebook parts. Keep writing areas quiet and labels readable on their actual surface.
- Preserve acknowledged Save, pending and failure paths, claimed Prep ownership, ticking, Undo, selected controls and focus rings.
- Compare representative books, Home, banners, forms and live boards before and after at 390, 768 and 1280 px. Measure visible rows, control geometry and primary-task taps rather than assuming they are unchanged.
- Check computed text and control contrast, category/art exceptions and monochrome printing. Run the affected state and journey checks plus the required CI gate.

## Evidence and release

The [selected examples](surface-colours/selected-examples.png) show actual Prep, Orders, Team and Home rendering with synthetic records. [Measurement summary](surface-colours/verification.json): 42 same-DOM before/after pairs across 14 scenes at 390, 768 and 1280 px, with 2,202 surface, row and control boxes unchanged. No overflow or browser errors occurred. Coverage includes Home, all five named workbooks, both recipe views and a recipe card, function service, Admin Inbox and People, and the shared Prep Add form. Existing primary-task controls and handlers are unchanged, so the main tasks retain their tap count and measured row density. The To-do fill follows the existing cover corners.

`tests/surface-colours.test.js` passes 172 assertions on the real workbook, reference, modal, Home and live-board surfaces, including small header text, effective ancestor opacity and local states. The lowest checked normal text is 4.759:1 and large text is 3.333:1. The 11.52 px dietary label fails on the baseline tinted charcoal board at 4.239:1 and passes at 9.941:1 with the light live-board text token, verified at all three widths. Keyboard focus on steel headers uses dark ink: its visible 3 px outline improves from 2.726:1 on commit `ae0388a` to 13.005:1, verified on the real Cleaning setup Close control at all three widths. Closing still dismisses setup alone. Twelve focused status, Home, notebook, modal and supplier test files also pass. The broader client and rules results are attached to PR #632; the normal required checks gate release. Existing app fonts were replayed from TLS-verified cached responses where Chromium could not load Google Fonts directly.

Before release, the independently approved Team refinement in PR #635 landed. Its one-roster flow, compact header, disclosures and desktop shell are preserved. Three additional same-DOM Team comparisons against `d4d383e:css/app.css` retain all 111 measured boxes at 390, 768 and 1280 px, with no overflow or browser errors. The selected examples use this newer Team screen. The merged source still passes all 172 surface assertions without removing or changing any check.

Baseline main is tagged `colour-surface-baseline-2026-11-09`. The same-DOM surface comparisons use committed `14cfab4:css/app.css`, which includes the earlier status fixes. Baseline images remain in the ignored `tests/shots-baseline/surface-2026-11-09/` folder. Screenshots and browser tests use synthetic Firebase records; no production records were read or written. They do not establish real-device legibility or staff understanding in kitchen lighting. Production checks run after the normal Pages deployment.

Ship through the existing PR #632 and release rules after verification. No new dependency, shell entry, read, write, listener, rule or saved-data field was added. Roll back the surface CSS and its matching documentation/tests through a fresh branch and PR if needed. No data migration or data rollback is required; preserve unrelated application changes.
