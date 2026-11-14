# Signed-out Home: options

Study started 15 November 2026 at the head chef's request: "If we start the app and no one has signed in yet we only see the pick docket screen. In the kitchen-book-os we have the splash screen that then does the same. Can we spruce that up a bit?" Source commit `bb89126`. No app change until the head chef chooses.

## Round 1 verdict: Build smaller (5 of 5), 15 November 2026

Five fresh reviewers, same proposal and evidence packet (`evidence.md`, `baseline/`). Role-based analysis, not research with real staff.

| Reviewer | Verdict | The one change |
| --- | --- | --- |
| Cook mid-service | Build smaller | Names on Home on shared screens only, with the work-waiting notice; drop Coming up |
| Head chef | Build smaller | Ship the heading and the dark sign-in button first, names on Home second |
| Skeptic | Build smaller | Ship the heading and the dark sign-in button now; names only once the after-lock tap count is measured |
| New starter | Build smaller | If names come, keep "Who are you? Tap your name, then your PIN" above them |
| Keeper | Build smaller | Heading, sign in as `.btn.dark`, Recipes with search, keep `.kb-home`; names later |

**What all five agree on.** "Pick a docket" over one docket is untrue (Headspace), and Kitchen sign in, the main action, is a plain `.btn` when the design patterns make `.btn.dark` the one main action (Linear; Manage functions on the same line already uses it). Keep the neutral heading and the "Cook as written" line.

**Cut.** Coming up on the signed-out Home: functions need `privateAccess()` (`js/functions.js:1881`), so it would need a new read and rule, or would show the last cook's cached data after a lock (Flighty rejected). The splash styling: four of five called it dressing that does nothing at service; the splash only plays on a cold start.

**Deferred.** Names on Home. Only the shared tablet saves the tap: a personal phone at 04:00 already goes straight to its owner's PIN (`js/prep.js:7329`). It would duplicate `whoHTML()` (Here today order, the retained-work notice), switch off the celebrations (`gated()` in `js/seasonal/theme-bridge.js:21` treats `.p-names` as a sign-in screen) and land about 900 ms after Home draws.

**Disagreement.** None on the verdict. The cook would build names on shared screens now; the other four would wait.

**Contract fit: Needs work** (all five). Replacing the docket wall departs from "Signed-out and Functions-only users retain their existing Home" (`docs/home-staff-first.md`) and from the celebrations' `.kb-home` hook and `tests/seasonal.test.js:98` (`.wall-main .dockets`). That is a proposed departure for the head chef, not a violation. Functions-only Home shares the same code branch. Contrast, keyboard focus and states are Not evidenced.

### Correction to the proposal

The proposal said the tablet drops back to this page on every idle lock. Wrong. **Reproduced** in the click-test stand-in (shared device, Sam signed in, 1280 px, 11 minutes idle, then a tap):

| Page left open | After the idle lock |
| --- | --- |
| `#/` Home | The signed-out Home ("Pick a docket") |
| `#/prep` | Stays on Prep: "Sam, enter your PIN", with Not me |
| `#/recipes` | Stays on Recipes (public) |

So the tablet shows this Home after a lock only when it was left on Home, plus every cold start (the kiosk's power-on and its 04:15 restart) and every new or public device. Not evidenced: how often the kitchen leaves the tablet on Home.

### Break-it findings

| Scenario | Evidence | Repair or check | Disposition |
| --- | --- | --- | --- |
| Idle lock on a work page keeps that page and re-picks the last person | Reproduced (table above) | None needed; corrects the frequency claim | Recorded |
| Shared tablet locks with Sam's unsent work; Ann taps her name on a copied Home list and only gets a refusal toast (`js/prep.js:1414`), with no Change person | Risk / Not evidenced (source review) | Reuse `whoHTML()` whole, or no names on Home | Names deferred |
| Names arrive about 900 ms after Home draws (`js/app.js:1871`) and push Recipes down mid-tap | Risk / Not evidenced (source review) | Reserve the space; show names only once the settings are in | Names deferred |
| A sign-in list on Home switches off the celebrations (`gated()`) | Checked in source (`js/seasonal/theme-bridge.js:21`) | Keep `.kb-home`; no `.p-names` on Home | Carried into round 2 |

### Checks before release (from the Skeptic and Keeper)

One signed-out click test at 390 and 1280 px in the fake-Firebase fixture: roster arriving late, offline cold open, after an idle lock, the date at midnight versus the 04:00 lock, an active celebration, the install card, Functions-only Home. Then on the real kiosk after its splash. No rules change and no new saved-shell file unless a design adds a read.

## Round 1 proposal (no code)

### The problem in the kitchen

When nobody is signed in, Home (`#/`, `viewLanding()` in `js/app.js`) still draws the old six-docket wall, filtered down to one docket. The heading says **Pick a docket**, but there is only one docket to pick (Recipes). Under it sits a plain white **Kitchen sign in** button, then the footer line. Everything else is empty kraft.

- 390 px phone (`baseline/now-390.png`): heading, date, Kitchen sign in, one Recipes docket, footer. The content ends about 400 px down; the rest of the screen to the tab bar (about 370 px) is empty. The tab bar holds one tab, Recipes.
- 1280 px shared screen (`baseline/now-1280.png`): one 264 px docket on the left; about three quarters of the width is empty.
- The main job of a signed-out kitchen screen is to get the next person signed in. That action is the smallest, palest thing on the page (a white outline button), while the Recipes docket has the pin, the big name and the orange Open.

### Who sees it, and how often

Measured from the code and the device contract (`docs/device-sessions.md`), not from usage logs:

- **The shared kitchen tablet** (the Lenovo kiosk, from 15 Nov 2026): every 10-minute idle lock and every 04:00 lock drops it back to this screen. Probably several times a shift. On a cold start the kiosk plays its own splash (mise en place with the pass board, chosen 15 Nov 2026) and then lands here, so the first thing after a branded splash is the emptiest page in the book.
- **Every personal phone at 04:00**: the daily lock shows the same page until the person enters their PIN.
- **A new phone** that has not had the kitchen PIN yet, and anyone who opens the public link (recipes are public).
- Offline cold open already swaps Kitchen sign in for "No signal. The kitchen pages open when the phone is back online." (`tests/offline-open.test.js`); that stays.

### What people do today

Sign in on the shared tablet (kitchen PIN already on the device): **Kitchen sign in** (tap 1) → **Who are you?** list of names (`baseline/who-are-you-*.png`, tap 2 on your name) → 4-digit PIN. The first PIN of the day opens Home. So 2 taps plus the PIN. A device without the kitchen PIN goes Kitchen sign in → Kitchen PIN (`baseline/kitchen-pin-390.png`) → Open → name → PIN.

Find a recipe: 1 tap (the docket, the Recipes tab, or Recipes in the top bar on a laptop), then search.

### The change proposed

Replace the leftover single-docket wall with a proper signed-out start screen that does its two real jobs, in this order: **sign in** (main) and **recipes** (public, one tap). Bring across the look of the kiosk splash so the tablet goes splash → a page that clearly belongs to it. Candidate ingredients for round 2 (not decided):

- A heading that fits: the kitchen's name and today's date, not "Pick a docket". Keep the neutral heading (no person's name) that the personalisation decision requires for public and locked views.
- Sign in as the clear main action. Possibly the **Who are you?** names on Home itself when the device already has the kitchen PIN, which would save one tap. The names are already live on such a device: `js/prep.js:385` listens to `login/roster` when nobody is signed in, so this costs no new read.
- Recipes kept one tap away, with the search pill so a cook can look something up without signing in.
- Optional, quiet: Coming up (today's functions or a celebration) only where the data is already public on the device. Not evidenced yet whether any is.

### Cost

- Files: `js/app.js` (the signed-out branch of `viewLanding()`), `css/app.css`, maybe `js/prep.js` if the name list is shared with Who are you?. No new file in the saved shell.
- Reads: none new if it uses what the device already holds (roster listener above). Must be confirmed per design.
- Rules: none.
- Tests: `tests/home-board.test.js` (the signed-out assertion "the Recipes docket, as before"), `staff-personalisation.test.js`, `staff-welcome-layout.test.js`, `offline-open.test.js`, `offline-pages.test.js` all check the current words; they change with it. Page width checks at 390, 768, 1280.
- Risk: the seasonal celebrations hang their note before `.kb-home` and draw on the dockets; the retained-work notice ("someone's work is waiting") lives on Who are you?; the 04:00 lock and handover rules must not change; Functions-only users keep their own Home.

### Design references to test

- **Headspace**: calm, short words a new starter understands; one obvious next step.
- **Linear**: the main action more prominent than navigation; one frame.
- **Flighty**: what matters now (today, the next function) only if the device already holds it; no new polling.
- **Duolingo**: the tap answers at once and truthfully (signing in, a wrong PIN).

### Service rules check

No new tab, top bar or tab bar button. No pop-up. Not a service list page. Taps to sign in: 2 + PIN today; 1 + PIN if names sit on Home. Taps to Recipes: 1 today, 1 after.

## Round 2: three designs within the cut (15 November 2026)

The head chef chose round 2 on the smaller scope. Every design keeps: the neutral heading (no person's name), `.dockets.kb-home` with at least one docket (the celebrations' hook and `tests/seasonal.test.js`), the "Cook as written" line, the install card and the No signal sentence where they show today, the tab bar and top bar as they are, and the Functions-only Home as it is. None adds a read, a listener, a rule, a pop-up, a tab or a saved-shell file. None puts staff names on Home (deferred in round 1).

Previews: `design-baseline/`, `design-a/`, `design-b/`, `design-c/` (a still copy of the real rendered shell from `bb89126` with `css/app.css`; only `<main>` changes). `index.html` shows all four side by side. Screenshots in `shots/` at 390 x 844, 768 x 1024 and 1280 x 800. Measurements are **Preview**, Chrome, synthetic date, Barlow and Caveat from Google Fonts, no install card, no celebration, no function band.

### A: Same wall, true words (changes the least)

The docket wall stays as it is. The heading becomes the day ("Sunday", "15 November" under it), the same frame as the signed-in Home board. Kitchen sign in becomes the one `.btn.dark` (the book's filled orange main button), full width on a phone, with one line under it: "Your name and your own PIN open the prep list, orders, wastage and the other kitchen pages." The Recipes docket is unchanged.

- For: smallest change, no relearning; the main action now looks like the main action everywhere else in the book (Linear); the heading is true and matches signed-in Home.
- Against: the single docket still sits alone on a wide screen (three quarters of 1280 px empty); finding a recipe still takes 2 taps to the search box.

### B: Sign in is a docket (rethinks the layout)

No separate button. The wall gets two dockets, so "Pick a docket" is true again: **Sign in** (chef hat, "Staff", "Your name and PIN open Prep, Orders, Wastage and the rest.", a Sign in button on wide screens) first, then **Recipes** ("Every dish, its allergens and the method. No sign in needed."). Two columns from 720 px, stacked on a phone.

- For: keeps the book's own docket language and the heading; each docket says what it is for; fills the wide screen better; celebrations keep two dockets to draw on.
- Against: two equal dockets, so no single main action (the Linear test fails: sign in no longer stands out); the "Staff" label sits where a number goes and uses the orange label colour; on a phone both dockets are whole-card links with no button, as today.

### C: Search recipes from Home (removes the most friction)

The day as the heading and the `.btn.dark` sign in as in A (button and its short line side by side on wide screens). The Recipes docket becomes a wide card holding the book's search pill ("Search 128 recipes") and, on wide screens, an Open the pass button. Typing in it opens Recipes with the words already in the search box and the list filtered.

- For: a recipe lookup is 1 tap to the keyboard instead of 2 (Todoist: the usual job is quick); the public half of the book is useful right on Home for a cook who has not signed in yet.
- Against: biggest build; the hand-off from the Home box to the Recipes page must keep the keyboard up and the typed letters (Not evidenced on the Lenovo, Android Chrome or iPhone); on a phone the card has no Open button (the Recipes tab carries it, as today); a search box on the shared tablet's start screen invites guests or passers-by to type.

### Measured (Preview)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Heading | Pick a docket (untrue) | Sunday | Pick a docket (true) | Sunday |
| Sign in on the shared tablet (kitchen PIN on the device) | 2 taps + PIN | 2 + PIN | 2 + PIN | 2 + PIN |
| Find a recipe by name: taps to the keyboard | 2 | 2 | 2 | 1 |
| Open the recipe list | 1 | 1 | 1 | 1 (tab or Open the pass) |
| Sign in target at 390 px (w x h) | 144 x 48 | 358 x 48 | 358 x 131 (whole docket) | 358 x 48 |
| Sign in label contrast | 16.9:1 (outline) | 5.05:1 (white on orange) | 4.76:1 (Sign in button, wide screens) | 5.05:1 |
| Help line contrast on kraft or paper | none | 4.92:1 | 9.84:1 (on docket paper) | 4.92:1 |
| Last line on a 390 px phone (tab bar at 776) | 401 | 462 | 527 | 547 |
| Sideways scroll at 390, 768, 1280 | none | none | none | none |
| Navigation levels | 1 | 1 | 1 | 1 |
| Build size | | 1 small PR | 1 small PR | 1 PR, with a search hand-off and its tests |
| Relearning | | none | small (sign in moved into a docket) | small (a new search box) |
| New reads, listeners or rules | | none | none | none (recipes are in `js/data.js`) |
| Main risk | | low | no single main action; docket semantics | keyboard and focus hand-off on real devices |

Not evidenced for all three: keyboard focus rings, reduced motion (the dockets' arrival is unchanged), an active celebration, the install card, 768 px with large text, the real kiosk after its splash.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Layout | Button row above the existing wall | Two-docket wall, no button row | Button row above one wide card |
| Hierarchy | One filled main action, then Recipes | Two equal choices | One filled main action, then a search field |
| Recipe task | Docket, then search | Docket, then search | Search on Home |
| Heading | The day | Pick a docket | The day |

## Round 2 scores (six fresh reviewers, 15 November 2026)

Scale: out of 10, 10 = ship it as drawn. Every reviewer said the designs differ structurally (the screen designer: A and C share a frame, so only partly).

| Reviewer | A | B | C | Recommends |
| --- | --- | --- | --- | --- |
| Cook mid-service | 7 | 4 | 5 | A with C's short line |
| Head chef | 8 | 3 | 5 | A with C's short line |
| Skeptic | 7 | 4 | 5 | A with C's short line and one shared heading helper |
| New starter | 7 | 4 | 5 | A with B's "No sign in needed" and a kitchen PIN note |
| Keeper | 7 | 4 | 5 | A on its own |
| Kitchen screen designer | 7 | 4 | 5 | A with C's line and B's "No sign in needed"; sign in 52 px tall from 720 px |

**Why A wins.** One filled main action (Linear) with a true heading in the signed-in Home's own frame, one `js/app.js` branch, nothing to relearn. **Why not B.** It undoes the one fix round 1 agreed (no single main action), its chef hat repeats the Menu icon, and "Staff" in the number slot reads like an orange status tag. Moving sign in to where Recipes was invites a tap from habit. **Why not C.** The hand-off is unproven and, from the source, likely to drop the keyboard: navigation rebuilds `#app` and keeps focus only when the hash is unchanged (`js/app.js:1889`), and every search handler keys on `#find`. "Open the pass" gives Recipes a second name that is untrue in Tiles view. On a phone the card stops being a link.

**Shared weak points of A as drawn (Preview).** From 720 px the docket's Open (207 x 52) outweighs sign in (192 x 48); A's two-line help pushes "Cook as written" to 814 px, off a 1280 x 800 screen; the book's orange focus ring on kraft is 1.75:1.

### Mix of all three

| From | Part | Take or reject | Principle | Why |
| --- | --- | --- | --- | --- |
| A | Day heading, `.btn.dark` sign in, full width on a phone, docket unchanged | Take | Linear, Headspace | One main action, true words, smallest change |
| A | Two-line help under the button on wide screens | Reject | Rule 4 | Pushes the footer off 1280 x 800 |
| B | Sign in as a docket, "Pick a docket" | Reject | Linear, Headspace | No single main action; habit taps; repeated icon; "Staff" tag |
| B | "No sign in needed" for Recipes | Take, moved into the help line | Headspace | True and short; on the docket it made the wide docket taller and pushed the footer off again (measured 810 px) |
| C | Short help line beside the button from 720 px | Take | Headspace | Keeps the footer in view |
| C | Search on Home, "Open the pass" | Reject | Duolingo, Headspace | Unproven hand-off, a second name, card not a link on a phone |
| New starter | "New device? The kitchen PIN comes first" | Take | Duolingo | A new phone asks for the kitchen PIN first; known on the device, no read |
| Designer | Sign in at least as heavy as Open from 720 px; ink focus ring on the wall | Take | Linear, WCAG 2.2 | Sign in 264 x 52 against Open 207 x 52; ink ring 8.36:1 on kraft |

All six rejected blending all three as drawn: B's docket and A's button are two routes to one job, and C's field is a third orange control.

### The recommended mix (`design-mix/`)

Heading "Sunday", date "15 November". **Kitchen sign in** as the one `.btn.dark`: full width on a phone, 264 x 52 from 720 px (the docket's width). One help line: "Your name and PIN open the kitchen pages. Recipes need no sign in." Under it on a phone, beside the button from 720 px. On a device without the kitchen PIN: "New device? The kitchen PIN comes first, then your name and PIN. Recipes need no sign in." With no signal: the existing No signal sentence replaces the button and its line, in the wall's readable brown. The Recipes docket, `.dockets.kb-home`, the footer and the tab bar are unchanged. The wall's focus ring is ink.

| Measured (Preview) | Today | Mix |
| --- | --- | --- |
| Sign in target, 390 px | 144 x 48 outline | 358 x 48 filled |
| Sign in target, 1280 px, against Open | 144 x 48 vs 207 x 52 | 264 x 52 vs 207 x 52 |
| Sign in label | 16.9:1 (outline) | 5.05:1 white on orange |
| Help line on kraft (`#4a4231`) | none | 4.92:1 (worst stripe) |
| No signal sentence on kraft | 3.54:1 (`--muted`, today) | 4.92:1 |
| Focus ring on kraft | 1.75:1 (orange) | 8.36:1 (ink); keyboard reaches sign in after the top bar, checked in the preview |
| Footer bottom: 390 x 844 / 768 x 1024 / 1280 x 800 | 401 / 784 / 753 | 462 / 798 / 767, all on screen |
| Tablet portrait 600 x 1005 | | footer at 449, phone layout |
| Tablet landscape 1004 x 600 | | footer below the fold, as today (the docket alone is 379 px) |
| Taps: sign in / to the recipe keyboard / recipe list | 2 + PIN / 2 / 1 | 2 + PIN / 2 / 1 |
| Reads, listeners, rules, saved-shell files | | none new |

**Review status.** A lead synthesis of the parts the six reviewers named. It adds no flow or risk their reviews did not cover, except moving "No sign in needed" from the docket into the help line (measured above). Not separately re-reviewed.

## Recommendation

**Recommend the mix: A's frame and main button, C's short line beside it on wide screens, B's "No sign in needed" in that line, the new-device note, sign in as heavy as Open, and an ink focus ring.** It fixes both round 1 faults (an untrue heading, a pale main action) at the cost of one small pull request, with nothing for the team to relearn and nothing new to read. Main downside: on a wide screen the page stays mostly empty kraft beside one docket, and a recipe search stays 2 taps.

### Departure for the head chef

Changing the signed-out heading and sign-in button departs from "Signed-out and Functions-only users retain their existing Home" (`docs/home-staff-first.md`). Functions-only Home stays exactly as it is.

### Break-it findings, round 2

| Scenario | Evidence | Repair or check | Disposition |
| --- | --- | --- | --- |
| The heading flips back to "Pick a docket": `homeWelcomePaint()` also writes it (`js/app.js:697`) and reruns on `lk-cfg`, `lk-who` and the celebrations' state | Risk / Not evidenced (source review) | One shared words helper for both; test the heading after `lk-cfg` | Must fix in the build |
| Functions-only Home changes by accident: it shares `viewLanding()` | Risk (source review) | Guard on `functionOnly()`; test it unchanged | Must fix in the build |
| The date: `LK_TIME.day()` rolls at midnight, the session at 04:00 (`js/boot.js:35`) | Risk (source review) | Test 23:59 to 00:01 on the signed-out Home | Check in the build |
| C drops the keyboard on the hand-off | Risk / Not evidenced | Not built | C rejected |
| B offline: a live Sign in docket beside the No signal sentence | Risk / Not evidenced | Not built | B rejected |

### Checks before ready

Amend `tests/home-board.test.js` (the signed-out case it already opens): the day heading after `lk-cfg`, one `.btn.dark`, one docket, the new-device line, Functions-only unchanged, 23:59 to 00:01, offline with the No signal sentence and no button. `tests/seasonal.test.js`, `offline-open.test.js`, `staff-personalisation.test.js` and `staff-welcome-layout.test.js` updated for the words and passing. Implemented-app shots at 390, 768 and 1280 with the install card and a celebration on. Then the real kiosk after its splash and after an idle lock on Home.

## Chosen, 15 November 2026

The head chef chose the mix: "I'd like to build the mix, but, before users get logged out save their last screen and when they log back in on the same day get them back to where they were?" Built in the same pull request, as one sign-in theme:

1. **The mix**, as previewed. `homeWords()` in `js/app.js` is now the one helper for the heading's first draw and every repaint (the Break-it finding), `signInBlock()` draws `.wall-sign`, `LK_PREP.kitchenPin()` says whether the device has the kitchen PIN (no read), `--wall-ink` replaces the raw `#4a4231` on the wall. Functions-only Home is unchanged.
2. **Back to your own page later the same day.** A small change on the existing sign-in (no tab, button, pop-up or step), so it took the quick check, recorded in `docs/home-staff-first.md` (Later sign-ins that day). The 10 Nov rule "later PINs keep the page" still holds when the person chose the page; when the sign-in started from the signed-out Home, Not me or Sign out, the PIN goes back to the person's own last page from earlier that day and the button names it.

### Implemented app (click-test stand-in, synthetic people, `implemented/`)

| | 390 x 844 | 768 x 1024 | 1280 x 800 |
| --- | --- | --- | --- |
| Heading / date | Sunday / 15 November | same | same |
| Footer bottom | 462 | 798 | 767 |
| With Tihar on (celebration note between sign in and the docket) | 642 | | 849 (today's page also drops the footer below 800 with a note on) |
| Sideways scroll, browser errors | none | none | none |

New device at 390: "New device? The kitchen PIN comes first, then your name and PIN. Recipes need no sign in." The install card did not show in the stand-in (Not evidenced). Still to check after release: the real kiosk after its splash, and after an idle lock left on Home.

### Tests

`tests/home-board.test.js` (signed-out Home: the day, one `.btn.dark`, both help lines, the heading after `lk-cfg` and `lk-who`, sign in at least as big as Open and the footer on screen at 390 and 1280), `tests/login-home.test.js` part 11 (Not me on another cook's lock, Kitchen sign in on Home, a page chosen before signing in, yesterday's page ignored), `tests/staff-welcome-layout.test.js` (the neutral heading during Tihar is the day), `tests/design-patterns.test.js` (new names). Both changed files fail on the old code (checked against `main` at `bb89126`). Locally also green: roles, after-the-tap, live-lists, device-sessions, device-lock-handover, seasonal-shell, read-budget (no new reads), staff-personalisation, offline-open, offline-pages.

**Open finding.** `tests/seasonal.test.js`, check "#/orders: Kitchen Book, the stamp and a still edge", failed in 5 of 9 local runs with six heavy test files in parallel when this branch's `js/app.js` was present, and in 0 of 9 without it (main, this worktree at main, and `js/prep.js` alone). It passes on its own (178 of 178) and in a throttled step-by-step reproduction on both branches. No mechanism found: the new names are unique, `js/app.js` is wrapped, and Home shows no repaint loop. CI retries a failed file once on its own. If it fails in CI, it gets its own look before this merges.
