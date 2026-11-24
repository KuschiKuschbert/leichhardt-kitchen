# Booking contact in the Functions editor

## Chosen

**C, Booking contact beside the booking facts.** The head chef delegated the routine choices for the remaining space audit. The council chose one contact row inside **The function**, with the contact name or a plain status and a labelled **Add contact** or **Edit contact** action. The three existing fields open underneath. The row keeps the booking facts in one column and the form keeps its existing Save action. An existing phone number takes one tap to reach the labelled Phone field.

Show an unavailable or unverified read in words and reveal the fields on entry. A verified empty contact or a new booking can say **No contact added**. Saving an unrelated booking change preserves the existing private contact when its read failed. Reveal invalid contact and focus the relevant field. Retain the existing date, version, draft, review, confirmation and print behaviour. The manager’s current access controls both the contact summary and fields. The kitchen band, kitchen document and print stay clear of private contact details. [Functions contract](../code-contracts.md#functions) · [Access](../private-kitchen-access.md) · [Print](../function-printing.md)

## Round 1

**Build smaller, 5 of 5.** Trim the optional Booking contact block. The earlier space audit measured an existing edit at about 3,720 px on a 390 px phone. An open empty contact group took 292 px of that before the manager reached Platters. Keep the event date and time, location, guests, platters, rounds and one Save flow in the current form. The useful gain is less scrolling through empty contact fields. Hold further section folding or navigation for separate evidence.

The five reviews were based on kitchen roles and synthetic fixtures. The main condition was that a failed or cached-only read stay visibly uncertain. A contact data or validation regression would outweigh the shorter form.

## Round 2

The same task in all three designs was to open a new or existing booking, reach Platters, and enter or correct the optional name, phone and email when needed. The Chromium previews used released source `f29eb5660be4`, the full shell and expanded Functions band, the book’s fonts and a synthetic manager with Functions access. The fixture was 16 June 2026 at 18:20 Queensland time. The existing booking had three rounds and an authoritative reply confirming the contact document was absent. Separate fixtures exercised populated, failed, cache-only, pending, invalid and Extra large states.

| Design | Layout and contact entry | Gain | Cost |
| --- | --- | --- | --- |
| A. Native disclosure | Keep the separate group before Platters. Open populated, unread and invalid contact. A verified empty group needs one tap to show the fields. | Familiar control and a shorter verified-empty form. | A populated contact opens an extra 227 px on the 390 px fixture. |
| B. Desktop sidebar | Use a separate disclosure at 390 and 768 px, folded for empty and populated contact. Keep contact directly editable beside the booking form from 1100 px. | The shortest tested desktop route to Platters and zero reveal taps at 1280 px. | The planning column loses 368 px. The same action changes position and behaviour across widths. |
| C. Contact at the booking facts | Put the status or name with the event details and show the fields with one labelled local action. Unknown and invalid contact are visible. | Booking facts and contact stay together. A populated contact can stay folded. | Opening the fields adds a tap for optional work and requires focus to survive a redraw. |

A and B share the phone structure. They differ at desktop in both placement and default entry sequence. C integrates the contact into The function at every width and changes the native disclosure to a named action. All candidates retain one Save, no new route, the same ordinary opening form-section count at 390 px and the existing contact read path. Each fits one local pull request. A needs the least relearning, B varies by width, and C introduces a labelled reveal. No new rules or schema are proposed.

### Preview measurements

Each cell gives contact height / Platters top / document height in CSS pixels. These are full-shell measurements from the isolated preview and baseline. The opening viewport gained no whole form section at ordinary size.

| Layout | New 390 × 844 | Empty edit 390 × 844 | New 768 × 900 | Empty edit 768 × 900 | New 1280 × 800 | Empty edit 1280 × 800 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Released baseline | 292 / 1381 / 2358 | 292 / 1465 / 3720 | 210 / 1096 / 1881 | 210 / 1151 / 2810 | 210 / 1078 / 1862 | 210 / 1132 / 2791 |
| A | 63 / 1152 / 2129 | 63 / 1236 / 3492 | 63 / 950 / 1735 | 63 / 1005 / 2663 | 63 / 931 / 1716 | 63 / 986 / 2645 |
| B | 63 / 1152 / 2128 | 63 / 1236 / 3491 | 63 / 950 / 1734 | 63 / 1005 / 2662 | 305 / 858 / 1642 | 305 / 913 / 2571 |
| C | 45 / 1133 / 2111 | 45 / 1217 / 3473 | 45 / 932 / 1717 | 45 / 986 / 2645 | 45 / 913 / 1698 | 45 / 967 / 2626 |

At 390 px, C brought Platters 248 px earlier for the existing empty booking. The keyboard opened each folded version with Enter and kept focus on its control. Each tested contact trigger was at least 44 px high. The Extra large populated C fixture wrapped the contact name and retained a 44 px action. The comparison is available in the space-audit session’s Booking contact packet (`booking/evidence.md`, `measurements.json` and the matched `*-empty-390.png`, `*-empty-768.png` and `*-empty-1280.png` frames).

### Reference and contract fit

| Principle | A | B | C |
| --- | --- | --- | --- |
| Things 3, fold occasional work | Works for verified empty. A populated contact occupies the full group. | Works below 1100 px. Desktop shows all fields by default. | Works. The name or status stays in view while optional fields fold. |
| Airbnb, keep booking facts together | Works. Contact follows the booking details. | Needs work. The sidebar separates contact and reduces the planning width. | Works. Contact sits with date, time, guests and room. |
| Linear and Todoist, predictable controls and quick entry | Works. One native action and the existing Save. | Needs work. Position and the reveal tap depend on width. | Works. One labelled reveal for existing fields, at the same point on all widths. |
| Duolingo and Headspace, honest feedback and clear words | Works in the checked read and validation fixtures. | Works in the same fixtures. | Works. Add, Edit and the contact status describe the action and read result. |

Flighty’s now-and-next treatment matters to the Functions band, outside this contact-only choice. The previews kept existing paper surfaces and status styling. In the rendered contact sample, the label measured 16.16:1, the status 6.83:1 and the 3 px keyboard outline 3.39:1 against paper. The previews exercised the clean disabled Save, named validation, loading, failed and unverified states. Dark-scheme contrast, field and state boundaries, reduced motion and real phone keyboard behaviour remain unverified in the previews. [Surface colours](../surface-colours.md) · [Design patterns](../design-patterns.md) · [Action feedback](../action-feedback.md) · [Loading and motion](../loading-motion.md)

### Break-it findings

| Scenario | Evidence and release check |
| --- | --- |
| Contact read stalls, fails or returns cache-only absence, then the manager saves a different field. | Checked in the preview. A stalled read showed **Opening the function**. A failed read showed **Contact unavailable** and cache-only absence showed **Contact not verified**. The successful unrelated save after a failed read kept the stored synthetic contact. Recheck cache-only and older draft recovery against a newer contact. |
| A manager enters an invalid email, then tries Save or leaves and resumes. | Checked at 390 px. Save draft was refused without a write, focus moved to Email and the same person’s restored draft kept the typed value. C preview kept invalid inputs visible. Check the implemented closed group reopens on the error and stays clear of the book’s Save dock and the keyboard. |
| A shared device loses the manager’s access or changes person while a contact or draft is open. | Risk / Not evidenced in the preview. Check that the next person cannot see the private contact or recover the former manager’s draft. Keep the existing server enforcement and verify the session checks and kitchen and print output. |

The base editor and all three previews showed 471 px of page width at 390 px with Extra large text. A separate local probe traced it to absolutely positioned labels for the rounds table. Giving the existing table scroller a positioned containing block brought the page to 390 px in C. Focus reached the last labelled round input by scrolling the table 247 px while page scroll stayed at zero. This was an isolated repair check. The branch still needs its own geometry and interaction record.

### Vote and mix

**All six reviewers ranked C first.** The cook, head-chef reviewer, sceptic, new starter, keeper and screen designer reviewed the same previews. No numeric scores were assigned. C’s advantage is the consistent location and explicit action. Its cost is the extra reveal for optional fields. A’s native disclosure remains familiar and B reaches Platters sooner on desktop.

| From | Part considered | Decision |
| --- | --- | --- |
| A | Reuse the verified-empty and invalid-reveal rules. | Keep these rules in C’s single control. A separate disclosure adds a second location for the same task. |
| B | Add a desktop sidebar for direct editing. | Leave it out. It consumes planning width and changes the reading order across devices. |
| C | Keep the one contact row and local editing. | Choose this flow at every width. |

A + B + C would trade one reliable location for a sidebar or a second disclosure. C already gives the useful verified-empty and validation behaviour and keeps one Save. Recommend C for the delegated implementation.

## Implemented app verification

The implemented source was captured in Chromium with the same synthetic data, role, Queensland time, fonts and full shell as the previews. The table gives contact height / Platters top / document height in CSS pixels.

| Width | New before | New implemented | Existing empty before | Existing empty implemented |
| --- | ---: | ---: | ---: | ---: | ---: |
| 390 px | 292 / 1381 / 2358 | 45 / 1133 / 2111 | 292 / 1465 / 3720 | 45 / 1217 / 3473 |
| 768 px | 210 / 1096 / 1881 | 45 / 932 / 1717 | 210 / 1151 / 2810 | 45 / 986 / 2645 |
| 1280 px | 210 / 1078 / 1862 | 45 / 913 / 1698 | 210 / 1132 / 2791 | 45 / 967 / 2626 |

The ordinary-size captures have one existing Save, the same three input labels, a minimum 44 px contact action, and no horizontal page overflow. The implementation follows the chosen preview at all three sizes. At 390 px with Extra large text, page width fell from 471 to 390 px. The rounds table still scrolls within its 350 px frame. Keyboard focus reached the labelled Pizza input for round 3 while the page stayed at scrollX 0.

The stand-in exercised the ordinary and functions-only manager roles, one successful contact read on opening, a stalled response, total contact read failure and a cache-only absent answer. An unrelated Save after failed contact read preserved the stored private contact. Hiding an invalid email kept the value and focus on the contact button. Save draft reopened and focused the invalid field without writing. Back and Carry on with it recovered the same draft. A valid contact stayed in the form through a held Save and the saved acknowledgement appeared after release. A staff session could neither open the editor nor request the contact.

Two-manager check: on the released app, the first manager saved a restored food-only draft and overwrote the contact that the second manager had already saved. The implemented editor carries forward newly read contact fields the first manager did not edit, so that food save leaves the private contact document intact. It also retains an intentionally changed email alongside a newer name from a different manager. An older unmarked local draft retains its values and asks through the existing version conflict before it can overwrite a newer contact.

Full-size before and after captures and the measurements are in the space-audit session’s `booking/implemented` evidence. Local browser coverage includes `function-booking-contact.test.js`, `function-form-fixes.test.js`, `function-list-actions.test.js` and `function-time-boxes.test.js`. Live role enforcement, real device keyboard and the release itself need their normal release checks.
