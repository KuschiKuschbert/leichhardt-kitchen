# Working on the Leichhardt Kitchen Book

The Kitchen Book is the Leichhardt Hotel kitchen's web app: the recipe book, the prep list, the order list, the wastage log, the team's how-to guides and the head chef's admin panel. Plain HTML, CSS and JavaScript on GitHub Pages, no build step. Live at https://kuschikuschbert.github.io/leichhardt-kitchen/.

## Never in this repo (it is public)
- The kitchen PIN and the owner's email. `firestore.rules` is a template with `KITCHEN_PIN` and `OWNER_EMAIL`; the real values only live in the published rules in the Firebase console.
- Prices, GP, supplier codes or anything else from AVC Live beyond ingredient names and quantities. AVC Live itself is read only: never change it.
- Staff names or PINs (they live in Firestore).

## Writing style (everything the team sees, and the code comments)
- No em dashes anywhere. Australian English, metric units, 24-hour time, Celsius, Australian kitchen terms.
- Plain, short sentences. Staff read this on the line.
- Only recipes, quantities, temperatures and times the head chef confirmed. Anything else goes in `[square brackets]` and shows as "To come".

## Files
| File | What it is |
| --- | --- |
| `index.html` | The page, the book's clock (`LK_TIME`), the daily 04:00 self-refresh, the service worker registration |
| `js/data.js` | Every recipe (the only file staff edit). Field guide at the top |
| `js/art.js` | Plates, pans, side views, build views, technique diagrams |
| `js/app.js` | Routing, top bar, recipe views (Pass, Tiles), recipe cards, settings, install, QR |
| `js/prep.js` | Prep list, orders, wastage, guides, admin panel, staff lock, insights, learning, suggestions |
| `js/firebase-config.js` | Public Firebase web config |
| `css/app.css` | The Leichhardt look |
| `firestore.rules` | Rules template (see above) |
| `manifest.webmanifest`, `sw.js`, `icons/`, `icon.svg` | Installable app: manifest, service worker (network first), rope KB logo |
| `qr.svg`, `qr.png`, `qr-sign.pdf` | QR code to open the book, and the A4 sign |
| `README.md` | Everything the app does, for people and for the next session |
| `tests/` | Click tests (Playwright with a stand-in for Firebase): `cd tests && npm install && npm test` |

## Routes
`#/` landing (five dockets), `#/recipes` (Pass or Tiles), `#/r/<id>[/<id>...]` a recipe and the trail to it, `#/prep`, `#/orders`, `#/waste`, `#/guides`, `#/guides/<id>`, `#/minutes`, `#/admin`, `#/settings`.

## How changes ship
1. Every new piece of work starts in its own git worktree, on a fresh branch from the latest `main`. Never edit in the main checkout and never commit straight to `main`. One theme per worktree, per branch and per pull request: unrelated changes get their own worktree. Squash merge, then remove the worktree and its branch.
2. Test before merging: `node --check` on changed JS, then `cd tests && npm install && npm test`. It serves the repo locally and runs every file in `tests/` in Chrome: each page at 390, 768 and 1280 px (no sideways scroll, no JS errors) and the click paths for the prep pages, orders, wastage, minutes, admin and recipe search. Firebase is replaced by the stand-in in `tests/fake/`, so no real PIN or data is needed and nothing is written to the real book. Add checks for the click paths you change to the matching `*.test.js` file (or a new one). After merging, `BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test` runs the same tests on the live site.
3. If `firestore.rules` changes: test it on the Firestore emulator first, publish it in the Firebase console (with the real PIN and email filled in), then merge the code that needs it. Publish rules before code that writes new fields or collections; publish after code when the rules get stricter about something old code does not send.
4. After merging, wait for GitHub Pages (about a minute), then check the live site.
5. Keep `README.md` in step with every change.

## Things that are easy to break
- `.rail` is the steel shelf rail on the Pass; the landing and top bar use `.wtop`. Do not reuse class names across features (check `css/app.css` first).
- Every write goes through `W()` in `js/prep.js`, which adds the writer's id (`by`) and the PIN proof with a server timestamp. Direct `setDoc` calls bypass the staff lock and are refused.
- The prep pages read Firestore; keep reads small (the free plan has a daily read limit). Past days are cached once a day per phone with `dayCache()` / `lk.past` (prep, order history, recent waste, the waste review note); Everything to order is patched on the phone after a tick, not read again. Do not add polling.
- The shift pings popup (called notes in the code and the data) is appended to `document.body`, not `#app`, so page redraws do not remove it. Its clicks use `data-note` (the bell and the popup), the editor inside the prep root uses `data-p`, and the recipe pages use `data-act`; keep them apart. Pings are read with one small query when the book opens each day, and again only after 30 minutes away or at 10:30 if the book was already open: do not add a listener or polling. Who may write them is `sousIds` or `pingIds` in `config/main` (kept in step by the admin panel, `seedIds()`); a sous chef's save sends only `people`.
- Meeting minutes follow the same pattern (one small query, refreshed after 30 minutes away), a bell (`.mbell`) in the top bar, clicks via `data-p` / `data-k` with `mn-` names. Sign-offs and `hist` copies are immutable in the rules; a change after publishing is a new version, never an edit of the old one.
- Admin lists that can grow go through `lvHTML()` in `js/prep.js` (search, filter chips, sort, Show more, phone cards). Give each list its own `key`, keep `data-k` names unique (`lv-q:<key>`, `lv-s:<key>`), and use `lvReveal(key)` when a row is added so it is on screen. Do not hand-build a long `<table>` in the admin area.
- Guides keep each PDF page or photo as a picture in its own Firestore record (`guides/<id>/pages/<n>`, under 950 kB, made on the head chef's device), because the free plan has no file storage and a record holds at most 1 MB. The list is read once a day per phone and kept in `lk.guides`; pages are read once per version and then come from Firestore's offline copy. Do not add a listener. A page opened big is appended to `document.body` and its clicks use `data-gz`. pdf.js is loaded from jsDelivr only when a PDF is chosen; the tests serve it from `tests/node_modules/pdfjs-dist`.
- The service worker caches the app shell. Bump `CACHE` in `sw.js` when icons or the manifest change.
- One clock: anything saved, or compared with a saved time, uses `now()` in `js/prep.js` (`LK_TIME.now()` elsewhere), and today's date, hours and weekdays use `dayNow()` and `T.day`, `T.hour`, `T.mins`, `T.dow`, `T.clock`, `T.at` (kitchen time, Queensland). Never `new Date()` or `Date.now()` for those: the phone's clock and zone can be wrong. `Date.now()` is only for time passing on the phone (timers, the PIN lock, the idle sign-out). Do not name a local variable `now` or `dayNow`, it hides the helper.
