# Coding rules (22 Oct 2026)

Moved here word for word from `CLAUDE.md` on 11 Nov 2026, so that file stays short. `CLAUDE.md` keeps the short version; this note is the full rule.

These hold for every file, old and new. When you touch code that breaks one, bring that code in line in the same branch if it is small, otherwise add it to "Bringing the code in line" in `docs/open-work.md`. Older code that breaks a rule is listed there, so do not copy it as a pattern. One helper per job: use the one that exists (`esc()`, `W()`, `dayCache()`, `lvHTML()`, `now()`, `dayNow()`, `LK_RX.clean()`), never write a second.

**Reads (the free plan stops the book for the day at 50,000 reads)**
- Every new read says in a comment when it runs and what it costs: on open, once a day, after 30 minutes, or on a tap, and how many reads.
- No reads in a loop. Read many records in one query (`in` with up to 30 ids, a date range, or `collectionGroup`), never one `getDoc` per item or one `getDocs` per day. An empty collection still costs a read.
- A listener (`onSnapshot`) is only for today's live data that other phones change during service (today's prep, orders and wastage lines, `config/main`, the function list). Anything that changes overnight or rarely is read once a day and kept with `dayCache()`.
- A once-a-day job keeps its "done today" flag on the phone (`lk.*`), not only in memory, so the 04:00 refresh and updates do not run it again.
- Admin past-day reports read past days from the day digests where they are current (`digestRead()`, 5 Nov 2026), the rest through the current memory-only Firestore cache and existing correction stamps (`pastRead()` in `js/prep.js`). Reuse loaded data within the page; after a full reload, re-read non-empty past days as needed. Do not introduce persistent private report storage. Refresh is a tap, never a timer.
- Totals that every phone needs from many past days (what is usual, what is wasted often) are worked out by the nightly job into one small record that phones read once a day.
- `tests/read-budget.test.js` sets a read budget for a staff phone's first open of the day, a reload, the admin panel and the admin panel again the same day, the Proofreader and Manage functions (the stand-in in `tests/fake/` bills reads like Firestore: `__fake.bill`, and the records the rules look up for each request, `__fake.ruleBill`, since 7 Nov 2026). A change that goes over it either reads less or raises the budget in the same pull request with the reason.

**Saved copies on the phone**
- Every saved copy (`lk.*`, IndexedDB) says in a comment what makes it out of date.
- A change to a past day must reach the saved copies on other phones too, not only the phone that made it: call `markPast('p' | 'o' | 'x', date)` after the write (x: a past transfer, from the verified admin), and have the saved copy check `pastStamp()` before it is used.
- A copy is saved only when every part came in. A failed read is never saved as "nothing there".

**Who sees what**
- Anything staff must not see is locked in `firestore.rules`, not only hidden on screen. Hidden-only is a bug.
- Staff pages show today. Past days, totals and corrections live in the admin panel for the head chef and sous chefs.
- Staff phones do not read past lines just to build hints: the hints come from the nightly summaries and the day digests (`digest/<day>`, `docs/prep-book.md`). A fix to a past day names its day (`markPast()`, `pastNames()`), so other phones read just that day.

**Text on screen**
- Everything typed by a person or read from Firestore goes through `esc()` before it goes into HTML, attributes included.
- A value from Firestore placed in a `style`, an SVG attribute or a URL is checked by type first: a number in range, a colour (`#rgb`, `#rrggbb` or a named colour), or one of a fixed list. Never put it in as it came.
- SVG from Firestore or IndexedDB goes through `LK_RX.clean()` every time it is drawn, including copies kept on the phone.
- Links are fixed `#/` routes or use `encodeURIComponent`. No `eval`, `new Function` or string timers.
- `tests/safe-text.test.js` seeds a booby-trapped line into every kind of record others see and checks each page shows the words and adds no markup. A new field that others see gets a line there.

**Forms**
- Fill in what the book already knows (section, unit, reason, the usual amount), and keep it easy to change: the filled box is selected on tap, so typing replaces it.
- A suggestion chip fills every field it knows, not just the name.

**Screens**
- Build from the patterns in `docs/design-patterns.md`. A new one goes there in the same pull request, with its names in `tests/design-patterns.test.js`, and a new look is the head chef's call.
- Dismissible popups and sheets follow the shared frame and cancellation contract in `docs/adaptive-controls.md` (Shared modal frame). Mandatory kitchen/PIN/name screens stay non-dismissible, and pending-save guards remain authoritative.
- A choice of more than about 12 things gets a type-to-find box with the likely few first, not a long dropdown.
- A row that scrolls sideways fades at its edge so people can see there is more.
- Group with space and headings first. Approved book covers, headers, spines and existing purpose cards may use the shared surfaces in `docs/surface-colours.md`; writing pages stay quiet and stronger state fills identify attention or a named outcome. Do not box every group. A long list of rows may alternate a light tint to keep the eye on its row (Settings, head chef 5 Nov 2026), counted from the rows on screen.
- Pages work at 390, 768 and 1280 px with no sideways scroll (the click tests check it). Verify delivered layout claims in the full app with its actual shell, fonts, representative data and complete forms; keep preview measurements separate.

**Loading**
- The book's start loads only what the landing page and the prep pages need. Anything big that only one page uses is loaded by that page (the loader `mountManage()` uses), and stays in `SHELL` if the book needs it with no signal.
- `js/art.js` is the exception, measured on 22 Oct 2026: loading it later saved 9 ms at the start and cost 90 ms on Recipes (`docs/open-work.md`, Bringing the code in line). Measure before moving anything else out of the start.
