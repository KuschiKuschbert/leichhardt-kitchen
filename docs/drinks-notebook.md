# Drinks run notebook

8 November 2026. The head chef asked for Drinks run to use the same style as the chosen Chef to-do and Today's team notebooks. This applies that direction to the existing drinks page.

## Scope and quick check

**Verdict: Build smaller (quick check).** Reuse the approved notebook and colour pattern. Keep the grouped order, usual-drink form and people list; add no navigation, step, database read, dependency or saved field. The style direction is settled by the request to match the existing pages.

The order is read from the left page on laptops from 1100 px, with Your usual and the team on the right, joined by the notebook spine. Phones and tablets keep their existing reading order: heading, Your usual, The order, On today and the folded people who have not signed in. Use warm paper, burnt-orange headings and selected choices, green existing ticks, handwritten drink names and typed quantities. The page grows with its contents; it has no inner list scroll or fixed height.

Changing a usual uses the existing single form on one notebook sheet. The team still steps aside while editing. Resizing keeps the same draft and controls. First-PIN One more thing, the usual-drink nudge, session authority, Save and Cancel, grouping and caching keep their existing contracts in `docs/prep-book.md` and `docs/code-contracts.md`.

## One drink each (10 November 2026)

The owner said the order showed all possible drinks for the people on shift. A usual can hold a coffee and a soft drink, and the order counted both, so one person with both added two drinks to the run. The owner chose **coffee first** from three options (the others were a main drink marked in the usual, and a pick for today on each row, which both need a new saved field and a rules change).

**Verdict: Build (quick check).** One drink per person on today goes on the order: `dkPick()` is the coffee, otherwise the soft drink and anything else (`dkCold()`). The row shows the other as "(or ...)" and Your usual says "Or" instead of "Also", so whoever does the run knows what to swap to. Same taps (0 to read the order), same lines; the order has fewer lines when people have both. No new read, field, rule or saved copy. The "Anything else for the run" words go with the soft drink, so they reach the order only when there is no coffee.

Tests: `tests/drinks.test.js` and `tests/drinks-notebook.test.js` count one drink each and check a person with only a soft drink still gets it (7 failed on the old code, 0 with the change).

## Preserved behaviour

- Change is one tap; Save my usual is one tap after choosing or typing. Existing folds and Show them each take one opening tap. No new tap is added.
- The order counts one drink for each person who opened the book today (10 Nov 2026: the coffee, or the soft drink when there is no coffee), the same drinks together. It is rendered once. A tick still means the person opened the book with their PIN, not that a runner has collected their drink.
- A checked empty order says Nothing on the order yet. Loading and failed reads stay distinct and retain Try again.
- One form writes only the signed-in person's existing drinks record. No new listener, read, storage, role, schema or rule is introduced.
- Text still goes through the existing escaping helpers. The notebook uses existing colour and font tokens.

## Verification

Use synthetic drinks and people with the Firebase stand-in. Compare actual-font layouts at 320, 390, 768 and 1280 px with normal and largest text, including long names and drink notes. Check grouped quantities, off-today people, one form, draft retention during resizing, exact saved fields, empty and failed reads, control sizes, contrast and read reuse. The existing drinks tests cover first-PIN onboarding and the original form/save paths.

Local verification passed the new 30-check `tests/drinks-notebook.test.js` and the existing drinks, kitchen-page, safe-text and design-pattern tests. The usual form preserved its words and exact save fields across phone, tablet and laptop reflow. Grouped quantities, off-today people, unknown versus empty, first-PIN onboarding and read reuse passed.

The actual-font comparison used the same synthetic people and drinks, with 844 px viewport height. At 390 px, complete rows are counted above the bottom navigation:

| Measure | Before | Notebook |
| --- | ---: | ---: |
| Complete order rows, normal text | 3 | 3 |
| Complete people rows, normal text | 3 | 3 |
| First order row top | 306.6 px | 265.9 px |
| First person row top | 513.0 px | 478.2 px |
| Complete order / people rows, largest text | 3 / 1 | 3 / 1 |
| Change a usual | 1 tap | 1 tap |
| Save after choosing or typing | 1 tap | 1 tap |
| Show the other people | 1 tap | 1 tap |

All 40 layout/scenario samples and 872 sampled text contrasts passed at 320, 390, 768 and 1280 px with normal and largest text. This includes long names, maximum notes, editing and active choices. No sideways overflow, page error or visible target under 44 px was found. The lowest sampled text contrast was 4.864:1; selected Size and Strength were 5.266:1, and enabled Save was 5.048:1. These are sampled checks, not a full accessibility certification. The same drinks and activity records were read before and after.

Implementation screenshots with synthetic data: [phone](drinks-notebook/phone.png), [laptop](drinks-notebook/laptop.png). The pull request records CI, Pages deployment and live verification; local mocked checks do not claim real kitchen-data verification.
