# The admin panel's People page: council brief

19 November 2026, Queensland. Asked by the owner (the head chef): "should we restyle the peoples room in the admin panel?", then "Do this task here". The page is Admin › Team › People, `peopleListHTML()` in `js/prep.js`. Role-based analysis on the click tests' stand-in with made-up people, not research with staff. **Status: chosen and built 19 November 2026, the head chef: "Build the mix".**

Files in this folder: `evidence-packet.md` (round 1 evidence: today's page, measurements, contracts), `designs.md` (round 2: the three designs, measurements and taps, as given to the reviewers), `round2-brief.md` (the shared reviewer brief), `preview/designs.js` (draws every design over the real admin panel on the stand-in), `evidence/` (the pictures), `index.html` (every design side by side) and `montage-390.png` (the phone views side by side).

## Today

Every person is an open form: a name box, a role, four tick boxes, four links. With 15 people (Implemented app, stand-in): one person is 375 px on a phone and 111 px on a laptop, the page is 6,761 px on a phone and 2,954 px on a laptop, and **no person is on the first screen at 390, 768 or 1280 px**. A long name is cut inside its box. Two filters do the same job. Add a person is at the bottom. The four permissions are called Write, Tick, Remove here and "add, tick, remove" on the sous chef's page. Pictures: `evidence/now-*.png`.

## Round 1: should we build it?

**Verdict: Build smaller, 4 of 5.**

| Reviewer | Verdict | Main reason |
| --- | --- | --- |
| Cook mid-service | Build smaller | Never sees the page; a row in words lets the chef spot a wrong permission. Keep Reset PIN one tap from the person. |
| Head chef | Build smaller | Real but small: one person, a few times a month, never in service. Cheap fixes first. |
| Skeptic | Build smaller | Search and Open page already exist; the laptop tick table is the best scan; the phone is the real pain. |
| New starter | **Build** | Nobody readable on the first screen; status hides in a fade and grey boxes; Delete sits beside Stopped working here. |
| Keeper of the book | Build smaller | No reads, but about 40 test files touch the page; keep the test hooks; a short line must show the draft. |

What "smaller" meant: the cheap fixes (one filter, the stray hint folded, Add a person on top, names in full); compact rows like the sous chef's Staff row for the phone; words built from the real ticks, never the role; state in words; Reset PIN kept apart because it writes at once; no second save step; Delete not hidden beside Stopped working here.

## Round 2: three designs

Drawn over the real admin panel on the stand-in (`designs.md`, pictures `evidence/a-*`, `b-*`, `c-*`). All three include the cheap fixes and the state words.

- **A. Tidy table** (changes the least): every person still an open form, tighter. Pictures `a-390-working.png`, `a-1280-working.png`.
- **B. Rows that open in place** (rethinks the flow): a list in words, one person opened in place to change. Pictures `b-390.png`, `b-390-open.png`, `b-1280-open.png`.
- **C. Each person's page holds the changes** (the shortest list): grouped rows, every change on the person's page. Pictures `c-390.png`, `c-1280-working.png`, `c-390-page.png`.

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| One person, 390 / 1280 px (Preview) | 375 / 111 | 263 / 61 | 119 / 64 | 57 / 57 |
| People on the first screen, 390 / 768 / 1280 | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 3 / 3 | 2 / 4 / 4 |
| Page height, 390 / 1280 px | 6,761 / 2,954 | 4,808 / 1,901 | 2,570 / 1,702 | 1,840 / 1,362 |
| Taps: role, tick, left, delete, Reset PIN | 3, 2, 3, 3, 2 | 3, 2, 3, 3, 2 | 4, 3, 4, 4, 2 | 4, 3, 4, 4, 3 |
| Pull requests, relearning | | 1, none | 1, little | 1 to 2, some |
| New reads or rules | | none | none | none (the person page's 14 days already read once a visit) |
| Risk | | low, but stray edits stay | about 40 test files | page moves with a draft; groups move people |

### Scores (rankings, best first; no numeric scores were asked)

| Reviewer | 1st | 2nd | 3rd |
| --- | --- | --- | --- |
| Cook mid-service | B | A | C |
| Head chef | B | A | C |
| Skeptic | **A** | B | C |
| New starter | B | C | A |
| Keeper of the book | B | A | C |
| Kitchen screen designer | B | C | A |

**B first for 5 of 6. C last for 4 of 6.** All six said the designs differ in structure (the screen designer called A close to cosmetic, today's form made tighter).

**Disagreement.** The skeptic ranked A first: the page is used a few times a month by one person, B adds a tap to every change and moves selectors in about 40 test files, and the laptop loses the one-glance tick table. The skeptic would take B's words line on the phone only.

### Contract fit (all: Needs work)

- Works: every state said in words (Off the list, Not saved, Deleted when you save); the sage people family on the open row; red only for Delete and the deleted state; no sideways scroll at 390, 768 and 1280 (Preview).
- Needs work: B's open row is a new pattern, to be added to `docs/design-patterns.md`; a sage fill on the open row could read as done (screen designer); C's three columns of `c-tool` rows depart from "one layout at every width" (a proposed change, not a defect); A's name boxes still cut "Wiremu Te Rangi-H" at 1280 although all three promise full names (a box cannot wrap).
- Not evidenced: rendered contrast of the orange Not saved and red Deleted words on paper and sage, light and dark; keyboard focus; reduced motion; 44 px for the text links; real Saving, Saved and failed states; the other-phone line; Keep these changes / Undo them.
- One name for each thing: B's first drawing said "Add" closed and "Add lines" open (four reviewers flagged it).

### Design references

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: one frame, the work first | Needs work: the form is the frame; nobody on the first screen | Works: one row style, one place to change | Needs work: two places (list and page), columns break one layout |
| Things 3: occasional details tucked away | Needs work: every box live, a stray tap edits | Works: one person open at a time | Works: edits on the page |
| Airbnb: status and next action together | Needs work: the tick table, below the first screen | Works: role, rights, state and Change on one row | Needs work: status on the list, actions on another page |
| Headspace: one name for each thing, plain words | Works after the rename | Needs work: Add / Add lines (fixed in the mix) | Works: "Resets at once", "Waits for Save" |
| Duolingo: honest feedback, a way back | Works: struck name, Undo delete | Needs work: deleted row not drawn | Not evidenced |
| Todoist: quick add with known defaults | Works: Add a person on top | Works | Works |
| Flighty: now and next | Not relevant: no times on this page | Not relevant | Not relevant |

### Break-it findings

| Scenario | Design | Evidence | Disposition |
| --- | --- | --- | --- |
| A permanent delete rides along in one Save: the bar said only "2 unsaved changes: Tom, Ann" (skeptic) | B, C, A on a phone | Reproduced in the preview pictures (wording); the save itself Risk / Not evidenced | Repaired in the mix: the bar names "Deleted when you save: Ann" in red. Needs a click test: delete one, edit another, save from elsewhere. |
| The Save bar (about 160 px on a phone) hides the people and the open person's role (skeptic, screen designer, new starter) | all, worst in C | Seen in the preview pictures (`c-390-working.png`, `c-390-page.png`) | Mix: a one-line bar on a phone (about 90 px). Remeasure with unsaved changes in the built app. |
| A row waiting to be deleted still offers Reset PIN, which writes at once (skeptic) | A, B | Seen in the preview | Mix: a deleted row shows only Undo delete. |
| Reset PIN while a role change waits: the slip confirms the reset and the chef thinks the role saved (cook) | all | Risk / Not evidenced | Mix: the open row says "Reset PIN works at once. Everything else here waits for Save changes."; the bar keeps "1 change: Tom". Check the slip's words in the built app. |
| Another phone saves while a person is open; Sort by Role moves the open person (keeper) | B | Risk / Not evidenced | The open person stays open with the other-phone line; the open row is forgotten when its person is filtered out, deleted elsewhere or saved. Click test. |
| "Undo all" beside Save changes reads as undoing a PIN reset too (skeptic, on the first mix) | mix | Seen in the first mix picture | Repaired: the bar keeps Undo unsaved changes with its second tap. Test: reset a PIN, then undo. |
| The shared Save bar change reaches Kitchen settings; off-list last breaks Name A to Z (keeper, on the mix) | mix | Source review | Kitchen settings checked at 390, 768, 1280; off-list last dropped. |
| Delete, Close, failed Save: the closed row must still say Deleted when you save, with Undo (keeper) | B | Risk / Not evidenced | Click test. |

## Mixing all three

Every reviewer was asked whether blending A, B and C could beat their first choice. **None said yes to all three**: A's live table and B's one open row fight, and C's page makes a third place to change the same person (three layouts across about 40 test files). Five of six want **B with parts of A and C**.

| From | Part | Take or reject | Why | Principle |
| --- | --- | --- | --- | --- |
| A | the cheap fixes, the test hooks (`.a-name`, `a-remove-person`, `a-reset-pin`, `a-add-person`) | Take | least churn, same behaviour | Linear |
| A | a deleted row struck through, Deleted when you save, Undo delete | Take | a true state and a way back | Duolingo |
| A | always-live boxes on every row | Reject | stray edits; nobody on the first screen | Things 3 |
| A | the tick table on the laptop beside B on the phone (the skeptic's blend) | Reject | two layouts, two sets of hooks, twice the test churn | Linear |
| B | rows that open in place, one at a time; Reset PIN on the row | Take | words first, 119 px a person, Reset PIN still 2 taps | Airbnb, Things 3 |
| C | "Head chef · Everything", "Resets at once", "Waits for Save" | Take | plain, true words | Headspace |
| C | a page per person for every change; role groups | Reject | Reset PIN 3 taps, page moves with a draft, people jump groups while a change waits | Airbnb, Linear |

## Recommendation

**Recommend B's rows that open in place + A's deleted-row cue + C's words, with the reviewers' repairs.** In one pull request:

- One row a person at every width: initial, full name, "Staff · Add, Tick" built from the ticks ("Head chef · Everything"), the state in words; Reset PIN (a 44 px link) and **Change ▾** on the right (under the words on a phone).
- **Change ▾** opens that person in place, one at a time, on paper with a sage edge: Name and Role, "What Tom may do" (Add, Tick, Remove, Functions, the same words as the row), "Reset PIN works at once. Everything else here waits for Save changes.", then **Leaving · waits for Save changes**: Stopped working here (or Put back on the list) and Delete for good, then Open Tom's page ›.
- A row deleted in the draft: name struck through, "Deleted when you save", only Undo delete. Off-the-list people keep their place in the chosen sort (the Everyone filter's Off the list finds them).
- The Save bar names deletions in red ("Deleted when you save: Ann"), only when one waits, and keeps **Undo unsaved changes** with its second tap. On a phone its buttons sit on one line (about 90 px). This is the shared admin Save bar, so the Kitchen settings rows get the same layout, with their own words.
- The cheap fixes: Search, one Everyone filter and Add a person on one line at the top; How roles and ticks work and Add several names as folds; the stray hint gone.

Why it beats the alternatives: it is the only design that puts people on a phone's first screen without moving editing to another page (119 px a person against 375 today and 263 in A); nothing is editable by a stray tap; the rare and permanent actions sit under one plain heading away from the row; Reset PIN stays 2 taps. It keeps the one draft and one Save, needs no reads, rules or saved data.

**Main downside:** one more tap for every change (a role change 3 → 4, a tick 2 → 3), and the laptop loses the one-glance tick table (words on each row instead). Rule 4 asks why that is worth it: the page is used a few times a month, and each person shrinks from 375 px to 119 px on a phone with no stray edits.

### The combined preview

Pictures `evidence/m-390.png`, `m-390-open.png`, `m-390-working.png`, `m-390-deleted.png`, `m-768.png`, `m-1280.png`, `m-1280-open.png`, `m-1280-working.png`. Preview: one person 119 px at 390, 64 px at 1280; people on the first screen 1 / 3 / 3 at 390 / 768 / 1280 with nothing unsaved; page 2,570 / 1,757 / 1,702 px; the Save bar about 90 px on a phone. Taps as B. At 390 px the two Save bar buttons' words wrap onto two lines each in the preview; check in the build.

**Review status:** the lead's synthesis, then a focused follow-up on the combined preview from the three reviewers it touched most (the skeptic, who dissented; the kitchen screen designer; the keeper of the book). All three said the mix beats their earlier choice: the skeptic "yes, narrowly" over A ("one extra tap is acceptable on a page the owner uses a few times a month"); the screen designer and the keeper over pure B. Their findings on the mix:

- Repaired in the preview: the delete named in the bar; the deleted row with only Undo delete; names in full; Name box and `.a-name` back; one name per permission; the open row on paper with a sage edge; Reset PIN in the same place on every row; the phone bar about 90 px instead of about 160.
- A new risk the mix itself added, now repaired: the first mix called the bar's second button "Undo all", which suggests a PIN reset is undone too. The bar keeps today's **Undo unsaved changes** with its second tap.
- Keeper: the Save bar is shared with the Kitchen settings rows, so the release changes that page too (check it at 390, 768 and 1280); the deletion words show only when a deletion waits; putting off-the-list people last would be a second sort outside `lvHTML()` (Name A to Z would no longer be A to Z), so **dropped**: they keep their place in the chosen sort and the Everyone filter's Off the list finds them; the open row is forgotten when its person is filtered out, deleted elsewhere or saved.
- Still Risk / Not evidenced: with any unsaved change, no whole person fits on a phone's first screen (the bar covers the first row; the last row must stay reachable above the bar); 44 px for Stopped working here, Delete for good and Open Tom's page; contrast of the orange and red words side by side in the bar, light and dark; keyboard focus; reduced motion; Saving, Saved and failed in the one-line bar; the other-phone line; Keep these changes / Undo them; the head chef's row; Add a person opening its row with the Name box focused; another phone saving while a row is open; a failed Save keeping both lines.

## Before it is ready (verification plan)

- Remeasure the built page at 390, 768 and 1280 with 15 people, with and without unsaved changes, and record any difference from the preview.
- One stand-in click test (keeper): edit Tom, Close, delete Ann, Undo, delete again, a change from another phone, a refused save, then Save once; the saved team list and capability lists equal today's for the same edits.
- Click tests: a deleted row shows only Undo delete; the bar names the deletion; Reset PIN's slip while a change waits; the open person stays open after another phone saves; Close keeps the draft and the row says Not saved.
- Rendered contrast of the Not saved and Deleted words on paper and on the open row, light and dark; keyboard focus; 44 px targets.
- Rules unchanged: the rules emulator suite runs as usual. The `docs/design-patterns.md` entry for the row that opens in place, with its names in `tests/design-patterns.test.js`.

## Chosen

19 November 2026, the head chef: **"Build the mix"**: B's rows that open in place + A's deleted-row cue + C's words, as recommended, with the follow-up repairs (Undo unsaved changes kept with its second tap, deletion words only when one waits, off-the-list people keep their sort place). The build is checked against the verification plan above.

## Built

19 November 2026. `js/prep.js` (`peopleListHTML()`, `personRowHTML()`, `personEditHTML()`, `canWords()`, `personChanges()`, `draftWho()`, `draftGoneHTML()`; Delete marks `gone` in the draft and `saveConfig()` drops it; `lvHTML()` takes one `tool` button), `css/app.css` (`.pp-*`, `.a-gone`, the phone Save bar), `docs/design-patterns.md` (A row that opens in place).

**Implemented app, stand-in, 15 people** (pictures `evidence/built-*.png`):

| | Preview (the mix) | Built |
| --- | --- | --- |
| One person, 390 / 1280 px | 119 / 64 | 118 / 63 |
| People fully on the first screen, 390 / 768 / 1280, nothing unsaved | 1 / 3 / 3 | 1 / 2 / 3 |
| Page height, 390 / 768 / 1280 | 2,570 / 1,757 / 1,702 | 2,793 / 1,938 / 1,884 |
| The Save bar on a phone, a change and a deletion waiting | about 90 px | 165 px |
| Sideways scroll | none | none |

Differences from the preview, none of them a change to the chosen design: the list's own count and filter line sit above the rows (one person fewer on a tablet's first screen); "Undo unsaved changes" wraps onto two lines in its half of the phone bar and the deletion has its own red line, so the bar is taller than drawn (still two buttons on one line); **Add several names stays open under the list** (a fold there saved no room at the top and cost a tap) with How roles and ticks work beside it as a fold; off-the-list people keep their place in the chosen sort. Taps as the mix: a role 4, a tick 3, Stopped working here 4, Delete for good 4, Reset PIN 2, a new person 2.

Checked in the stand-in (`tests/people-safety.test.js`): rows in words with no field until Change; one person open at a time; Stopped working here and Put back on the list from the open row, Not saved in the row and the name in the Save bar; after Save every row closes and Off the list shows with no Reset PIN; Reset PIN from the row; Delete for good never for the head chef, two taps, the row struck through with only Undo delete, the slip and the bar naming the person; Undo delete says Undone; the keeper's check (Ann's tick changed, Bo deleted, another phone renaming Sam meanwhile, one Save keeps all three, Bo's PIN wiped and Sam's kept). `tests/targets.test.js`: fields and role 44 px, ticks 28 px with 44 px labels, Change, Reset PIN, Stopped working here and Delete for good 44 px. Twelve other test files follow the rows (one person opens before their fields are used).

Still Not evidenced: rendered contrast of the orange and red words, dark mode and keyboard focus beyond the existing controls; Saving and failed states in the one-line phone bar; the live site after release.


## Tap the name to edit (22 November 2026)

Tap the underlined name to open or close the same editor in the row. Its chevron and expanded state follow the row. Only one editor opens at a time, and closing it keeps the draft. Reset PIN stays a separate action.

The quick check favoured one direct action beside the person's role and permissions. Keyboard focus stays on the name after the editor closes. The reset and removal flows use their existing controls. Opening a row is one tap before and after.

Measured in the implemented admin panel with 15 synthetic people and the list scrolled to its first row in a 900 px-high viewport. At 390 px the first row is 65 px high, down from 120 px, and 14 rows fit where 7 fit before. At 768 and 1280 px, the first row stays 65 px and 14 rows fit. The name's touch target is at least 44 px at all three widths.

## Compact roster and focused editor (22 November 2026)

**Verdict: Build smaller.** The head chef chose a mix after looking at the compact roster, an editor next to the roster and a roster grouped by role on desktop and mobile. Use the compact roster by default and open the editor only when someone is selected. Keep the role filter and Role sort in the shared toolbar.

- At 1000 px and wider, Name, Role and Permissions line up. The selected person's form sits alongside the roster and stays reachable as the list scrolls. Close editor or the selected name returns keyboard focus to the roster.
- Below 1000 px, the role and permissions sit below each name. Selecting someone takes the page with their name and fields. The existing header Back restores search, filter, scroll and focus. Draft edits remain available both in the form and in the room's Save dock.
- Opening an editor still takes one tap. Reset PIN takes one tap to pick the person and two taps to confirm the immediate action. That puts the person's name and the reminder about immediate reset beside the action. The row and Save dock still name draft permissions and pending deletions. The same config reads and writes serve both layouts.

The simple roster applies Linear's one frame and Things 3's occasional details. The phone view gives the form the whole width and keeps Headspace's plain labels. Draft words and the acknowledged Save preserve Duolingo's feedback principle. The paper editor uses the sage people edge. Role-group headings were left out of this choice since the existing filter and sort provide access by role.

**Break-it checks.** The 390 px stand-in journey found a 71 px scroll shift after Back with a permission draft. Returning after widening the viewport to 600 px also moved the selected name in the roster. Back restores the name to its previous height after the layout settles. Crossing 1000 px switches the header Back action with the layout. The click test checks the return position, search, filter, focus and the permission draft through both layouts. Desktop clicks check the single selected editor, alignment and keyboard focus. Existing checks cover PIN confirmation, off-list people, deletion and Undo, and preserving another device's save while a draft is open.

On a phone, a roster refresh can briefly change the height of the admin jump row. Chromium's automatic scroll anchoring then moved the list by 72 px. The phone People page leaves the position to the roster itself. A synthetic update from another device now checks that the selected row stays at the same height during that refresh.

**Implemented app measurements.** Chromium with the Firebase stand-in and 15 synthetic people. Counted complete roster rows on the first screen from the top of the admin page, before opening an editor. The baseline was #781, the same People layout as branch base #782. The layouts also fit at 320, 999 and 1000 px without horizontal overflow.

| Viewport | First row before / after | Complete rows before / after |
| --- | --- | --- |
| 390 × 844 | 65 / 68 px | 2 / 3 |
| 768 × 844 | 65 / 68 px | 2 / 3 |
| 1280 × 900 | 65 / 51 px | 3 / 5 |

[Desktop roster and editor](evidence/mixed-desktop-editor.png) · [Mobile roster](evidence/mixed-mobile-roster.png) · [Mobile editor](evidence/mixed-mobile-editor.png)
