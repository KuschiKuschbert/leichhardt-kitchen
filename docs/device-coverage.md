# Device coverage

Which screen sizes each part of the book has been checked at, which it has not, and a plan to work through the rest.

Head chef, 26 November 2026: "make a list of unchecked sizes in all our PRs, so we can work through them with a plan. Once I am done with my current cleaning tasks sessions." So the list is made now, and the work waits until the cleaning sessions are done. **The plan below is proposed: each step needs the head chef's go.** Nothing in the app or the tests has changed for it.

## The screens

| Screen | What we know | Size used in checks |
| --- | --- | --- |
| Phones | Personal, one person each. The design width. | 390 x 844, touch |
| The kitchen tablet | Kitchen Book OS with a Back and Home pill ([app-launch.md](app-launch.md)). | 768 x 1024, touch |
| Five section screens | 21 to 24 inch, one in every section, all staff use them for the work all shift (owner, 11 Nov 2026). Touch (head chef, 26 Nov 2026). "The section screen can be read from where the cook stands nice and clean" (head chef, 26 Nov 2026). | **1920 x 1080 at 100 %**, read from the Screens row (26 Nov 2026): 1920 x 1080 pixels, the book's window 1920 x 1008 as the installed app, touch and a mouse. |
| Front of house screen for functions | "I believe it's a 24inch aio screen" (head chef, 26 Nov 2026), then "so does the function foh scree[n]" run on 1920x1080. | **1920 x 1080** (head chef, 26 Nov 2026). Touch and which pages it shows: to confirm. |
| The head chef's computer, and a laptop | Admin work. The head chef's own device read 1920 x 1080 at 100 %, a mouse, the book's window 1920 x 929 (26 Nov 2026). | 1920 x 1080 and 1280 x 900, mouse |

The book's page stops at 1240 px, so a 1920 px screen has about 340 px empty each side ([mascot study](mascot-desktop-options/brief.md)). Every section screen is exactly that.

**Touch and mouse.** Every shared screen in the list reads touch and a mouse. The list says whether a mouse is there, not which input the screen treats as its main one (saved as `ptr`, not shown). The book's mouse-only parts follow the main input, `(hover: hover) and (pointer: fine)`, so a section screen with the mouse as its main input gets them. Step 1 tests a 1920 x 1080 screen both ways, so the answer is covered either way.

## What "checked" means here

Three kinds of evidence, kept apart. None of them is a person looking at the real screen.

1. **The every-page click test** (`tests/pages.test.js`) opens Home, Recipes and three recipe cards, Settings, Prep, Orders, Wastage, Transfers, Minutes, Mail, Drinks, Chef to-do, Guides, every admin tab and the Manage Recipes pages at 390 x 844 (touch), 768 x 1024 (touch) and 1280 x 900 (mouse). It checks only two things: no sideways scroll and no page errors. It does not open Today's team (`#/team`), the chef panel (`#/chef`), Cleaning, Functions (`#/fn`, `#/fn/now`, `#/functions`), Deliveries or Suppliers; their own test files cover them.
2. **A test file of its own at that width.** Most click tests run at 390 x 844 unless they say otherwise (`tests/lib.js`). The table below counts test files that name a page and a width.
3. **The pull request text** names the width. That is the list in [device-coverage/prs.md](device-coverage/prs.md).

## What the list shows

Of 861 merged pull requests (up to #887), 575 changed something people see. Their text names these widths:

| | Phone | Tablet | Laptop | Section screen | Wide screens in words only | No width at all |
| --- | --- | --- | --- | --- | --- | --- |
| Pull requests (of 575) | 282 | 141 | 194 | **2** | 98 | 281 |

The two that name a section-screen width are #126 (Prep shows more lines on big screens, October) and #677 (a finished section said large, with the mascot, 11 Nov 2026). The click tests agree: only `tests/mascot-wide-finish.test.js` and `tests/today-finishes.test.js` open a 1920 px page, both on Prep, and **no test opens any page wide and touch together**, which is what a section screen is.

By page, from titles and files (approximate):

| Page | PRs | Phone | Tablet | Laptop | Section screen | No width |
| --- | --- | --- | --- | --- | --- | --- |
| Admin and chef panel | 101 | 53 | 31 | 42 | 0 | 45 |
| Functions | 76 | 33 | 18 | 22 | 0 | 43 |
| Today's team | 59 | 40 | 23 | 25 | 0 | 17 |
| Prep | 56 | 31 | 15 | 21 | 1 | 23 |
| Suppliers and cut-offs | 55 | 31 | 12 | 18 | 0 | 23 |
| Recipes | 51 | 21 | 11 | 16 | 0 | 29 |
| Recipe editor and drawings | 47 | 19 | 10 | 13 | 0 | 27 |
| Orders | 36 | 16 | 7 | 10 | 0 | 18 |
| Shared controls and sheets | 35 | 23 | 12 | 16 | 0 | 12 |
| Sign in and lock | 33 | 5 | 2 | 3 | 0 | 28 |
| Home | 27 | 22 | 9 | 11 | 0 | 5 |
| Wastage | 27 | 13 | 8 | 10 | 0 | 13 |
| Minutes | 24 | 10 | 4 | 9 | 0 | 13 |
| Deliveries | 21 | 13 | 6 | 5 | 0 | 8 |
| Top bar and tabs | 20 | 9 | 8 | 9 | 0 | 9 |
| Guides | 18 | 12 | 12 | 11 | 0 | 6 |
| Pings | 17 | 4 | 4 | 4 | 0 | 12 |
| Cleaning | 14 | 9 | 5 | 5 | 0 | 5 |
| Transfers | 12 | 9 | 4 | 7 | 0 | 2 |
| Settings | 10 | 4 | 0 | 2 | 0 | 6 |

A pull request can count for more than one page; 91 matched none and are in the list as Other.

## Each page today, in the tests

Later pull requests replace earlier ones, so the work is on each page as it is now, not on each old pull request. Test files that name the page, and how many of them name each width (approximate, from `tests/*.test.js` on 26 Nov 2026):

| Page | Route | Every-page test | Own test files | Tablet | Laptop | 1920 | Wide and touch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Prep | `#/prep` | yes | 180 | 10 | 47 | 1 | 0 |
| Orders | `#/orders` | yes | 102 | 8 | 29 | 0 | 0 |
| Wastage | `#/waste` | yes | 59 | 3 | 17 | 0 | 0 |
| Transfers | `#/transfers` | yes | 29 | 4 | 7 | 0 | 0 |
| Cleaning | `#/cleaning` | **no** | 17 | 1 | 6 | 0 | 0 |
| Home | `#/` | yes | 85 | 8 | 25 | 0 | 0 |
| Today's team | `#/team` | **no** | 26 | 1 | 9 | 0 | 0 |
| Recipes and cards | `#/recipes`, `#/r/` | yes | 82, 41 | 11, 5 | 27, 13 | 0 | 0 |
| Functions | `#/fn`, `#/fn/now`, `#/functions` | **no** | 25, 10, 25 | **0** | 7, 2, 5 | 0 | 0 |
| Guides | `#/guides` | yes | 30 | 1 | 9 | 0 | 0 |
| Deliveries | `#/deliveries` | **no** | 15 | 0 | 4 | 0 | 0 |
| Suppliers | `#/suppliers` | **no** | 37 | 7 | 14 | 0 | 0 |
| Chef panel | `#/chef` | **no** | 8 | 2 | 3 | 0 | 0 |
| Admin | `#/admin` | yes | 125 | 5 | 46 | 0 | 0 |
| Settings | `#/settings` | yes | 26 | 4 | 11 | 0 | 0 |
| Manage Recipes | `#/manage` | yes | 35 | 2 | 11 | 0 | 0 |

**Touch on a wide screen.** Mouse-only behaviour sits behind `(hover: hover) and (pointer: fine)` in 10 rules in `css/app.css`, and a few checks in `js/app.js` and `js/prep.js` ask for a coarse pointer, touch points or hover. So a wide touch screen gets the touch versions if it reports a coarse pointer. Whether the section screens do is not known: a touch all-in-one with a mouse plugged in may report a fine pointer. Some layouts switch by width alone (900, 1000, 1100 and 1150 px in `js/suppliers.js`, `js/prep.js` and `js/manage.js`, 768 px in `js/fnedit.js`); they decide layout, not touch.

## The plan (proposed)

After the cleaning sessions, one step at a time, each with the head chef's go:

0. **Read the real screens. Done 26 Nov 2026.** The Screens row in Admin, Kitchen read every shared screen as 1920 x 1080 at 100 %, the book's window 1920 x 1008, touch and a mouse, and the head chef said the front of house screen is 1920 x 1080 too. The head chef's own computer is 1920 x 1080 with a mouse. The Screens row has done its job and can come out in one pull request ([The Screens row](#the-screens-row)).
1. **Put the real sizes into the every-page test.** Add 1920 x 1080 with touch as the main input, the same with the mouse as the main input (the section and front of house screens), and 1920 x 1080 with a mouse (the head chef's computer), and add Today's team, Cleaning, the three Functions pages, Deliveries, Suppliers and the chef panel to its pages. One test-only pull request. It catches sideways scroll and errors on every page at once. A failure is a finding to fix, never a check to loosen.
2. **A Where it goes pass on the service pages**, at the section size with touch, 768 and 390, with a busy-day fixture: Prep, Orders, Wastage, Transfers, Cleaning, Home, Today's team and the recipe card. The questions are the council's ([Where it goes](../.claude/skills/service-council/SKILL.md#where-it-goes-and-how-loud)), read against [design misses](design-misses.md). About six agents, one per group of pages, with the UX and interaction designer brief. The findings go into this note, page by page.
3. **Functions on the front of house screen:** `#/fn`, `#/fn/now` and `#/functions` at that screen's size, the pages with no tablet or wide test today.
4. **Admin and the chef panel at 1280**, then at a section size if the head chef uses them there. Already the most measured, so last.
5. **Each finding** goes through the quick check or the council, the head chef chooses, and the fixes ship as small pull requests grouped by page, because every merge that changes the book costs the kitchen's reads.

## The Screens row

Asked for on 26 November 2026: "I don't know the size exactly and I can't look it up. Can we push a way to read the screen size and resolution of all screens the app is installed on?", then "Yes I think I only need it in the admin panel once." Admin only, built so it can be removed in one pull request once the sizes are known.

- **What a device saves:** `screens/<its anonymous uid>` with `sw` and `sh` (the screen in CSS px, so 1536 x 864 on a 1920 x 1080 screen at 125 %), `w` and `h` (the book's window), `dpr` (the scale), `tp` (touch points), `ptr` (coarse, fine or none), `mouse` (any fine pointer), `hov` (any hover), `app` (opened as the installed app), `kind` (shared or personal), `sec` (a shared screen's section id), `at` and `by`. Numbers and fixed words only, no browser name.
- **When:** `scrMark()` in `js/prep.js`, about 4 seconds after a typed PIN (`signedIn()`), only with a live session (`canW()`) and a signal, else three more tries 15 seconds apart. `lk.screen.v1` keeps what was saved, with the device's uid: the device writes again only when its screen size (either way round, so turning a phone does not count), touch, pointer, mouse, app, type or section changes. The window and the scale move with the address bar, the keyboard and zoom, so they are saved but do not count. A refused or failed write is dropped without a word and tried at the next sign-in. Nothing shows on the device.
- **Who:** anyone signed in with their own PIN writes their device's own record, functions only too (the front of house screen); a second person on a shared screen replaces it when it changed. Only the verified admin reads or removes them (`firestore.rules`, `screens/{uid}`).
- **The row:** Admin, Kitchen, Records and safety, **Screens the book runs on**. Opening it reads every record once; **Read again** reads them again. Each device shows as a shared screen (with its section) or a person's device, its size and scale, its pixels and the book's window, touch and mouse, the installed app, and who saved it and when (the person who signed in when the device saved it; a later person on the same screen saves nothing unless the screen changed). Over 200 devices, it shows 200 and says there are more. Every value is checked by type before it shows. A refused read says so, with Try again.
- **Tests:** `tests/screen-sizes.test.js` (saved once after the PIN on a phone and on a 1920 px touch shared screen, not again for the next person, a refused save shows nothing, the list at 1280 and 390 px with a hostile record, a refused read), the `scrMark()` and `scrLoad()` rows in `tests/rules/client-shapes.test.mjs`.
- **Removing it:** take out the rules block, `scrMark()`, the row and its test in one pull request; the records can be deleted by the admin or left.

## How it was made

26 November 2026, from the repo at `b313f94`:

- All merged pull requests with their text: `gh api -X GET search/issues -f q='repo:KuschiKuschbert/leichhardt-kitchen is:pr is:merged' -f per_page=100 --paginate` (861).
- The files each one changed: the full history of `main` (`git fetch --filter=blob:none --unshallow origin main`), each squash commit's `(#N)` or merge commit's "Merge pull request #N" (857 matched).
- [device-coverage/analyse.py](device-coverage/analyse.py) reads both and finds the widths named in each pull request's text; [device-coverage/write_prs.py](device-coverage/write_prs.py) writes the list; [device-coverage/tests_matrix.py](device-coverage/tests_matrix.py) counts the test files per page and width. Fifteen pull requests across the width groups were checked by hand against their text.
