# Admin visual design options

Requested 1 November 2026. Status: three new design drafts, awaiting the user's choice. The earlier Review desk behaviour remains the working baseline; its previous selection does not select a visual direction for this new round.

The user wants the whole admin panel to share the Kitchen Book's visual language and feel simpler and more fluent. This is a design comparison only. No production app, roles, storage, rules or backend behaviour changes in this branch.

## What needs improving

The current admin competes with itself: section navigation, sub-tabs, toolbars, lists and forms have similar weight. Task headings lose the book's condensed typography. Context, optional fields and repeated labels push the primary action too far down a phone. The new draft should lead with the current job, keep a simple way back, preserve work and make the next useful action clear.

All options reuse the real Barlow, Barlow Condensed and Caveat typefaces, warm paper, charcoal shell, orange accents, thin rules, rectangular actions and pill choices. They retain the existing application header and phone navigation rather than adding a competing navigation system. All figures and people are synthetic examples.

## The three directions

| Direction | Layout and flow | Best fit | Tradeoff |
| --- | --- | --- | --- |
| A. The Chef's Desk, recommended | One-level chapter rail, ruled task list and adjacent context or editor. Focused task pages on phones. | Frequent admin work and repeated reviews. | More structured than the other options. |
| B. The Docket Rail | Kitchen dockets in task lanes, followed by focused review. Phone shows one lane at a time. | Quick check-ins between service. | Long queues take more space. |
| C. The Kitchen Book | Printed chapter contents and an open-book spread, then a short focused review sequence. | Deliberate, calm work with fewer controls at once. | More navigation between chapters. |

Recommendation: A keeps the proven review behaviour while giving it a clearer, calmer hierarchy. B is the closest to the kitchen wall and landing-page dockets. C has the strongest printed-book character. The final choice belongs to the user.

## Shared scope

Every concept includes item links, explicit training assessments, reports, saved records, Operations and Settings. Saved assessments distinguish a section from a single recipe. Prep activity never confirms skill. Source identities remain explicit. Back retains a draft; Cancel is explicit. Saves in these previews update only local example state and report the result.

After a choice, apply that direction consistently across the admin panel, including its older operational and settings screens. Preserve current permissions, private drafts, saved-record access during summary failures, version checks, read budgets, source identity and the existing shared navigation. The design must not invent new analysis, automatic assessments or new data requirements.

## Review files

- `index.html` is the interactive comparison with desktop/phone controls.
- `a.html`, `b.html`, `c.html` are the individual working mockups.
- `admin-design-review.html` is the portable single-file comparison.
- `previews/` contains desktop, phone and focused-task screenshots using the actual typefaces.

## Verification and next step

Verify all initial layouts at 390, 768 and 1440 px, keyboard navigation, example-only labelling, task Back/Resume, explicit link/assessment saves, stored assessment scope, settings, modal focus and the comparison controls. This verifies the design drafts, not a production implementation. The user's A/B/C choice is required before implementation or publication.

Completed checks: all three layouts fit 390, 768 and 1440 px without horizontal overflow, with the actual Barlow, Barlow Condensed and Caveat fonts loaded. Phone review actions stay above the existing navigation, and fields scroll clear of them. A preserves draft and queue context; B passes 36 focused checks including full assessment records, modal keyboard behaviour, text size and saved shift notes; C preserves recipe-only assessment scope in summaries, reports and saved records. The normal and portable comparisons pass 58 browser checks across phone and desktop, including all three previews, keyboard selection, preserved example state, downloads and full-size views. Final comparison captures have no recorded browser errors.
