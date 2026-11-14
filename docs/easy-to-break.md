# Things that are easy to break, and changes that went wrong before

Moved here word for word from `CLAUDE.md` on 11 Nov 2026, so that file stays short. `CLAUDE.md` keeps the short version; this note is the full rule.

## Things that are easy to break

Short warnings. The full contract for each part is its section in `docs/code-contracts.md` (or the feature note in the table above): read it before you change that part.
- **One clock.** Anything saved, or compared with a saved time, uses `now()` (`LK_TIME.now()` outside `js/prep.js`). Today's date, hours and weekdays use `dayNow()` and `T.day`, `T.hour`, `T.mins`, `T.dow`, `T.clock`, `T.at` (Queensland). Never `new Date()` or `Date.now()` for those; `Date.now()` is only for time passing on the phone. Do not name a local variable `now` or `dayNow`.
- **Writes.** Every write goes through `W()` in `js/prep.js`; the rules refuse a direct `setDoc`. Ask `canW()`, never `S.tok`. PIN tries are one every 20 seconds per person, so a test that types two PINs for one person waits 21 seconds.
- **Rules helpers.** A helper in `firestore.rules` that one collection uses is defined inside that collection's match block; only helpers two or more blocks use sit at the top. Google stops compiling at about 5 seconds and answers 503, and every top-level helper slows every rule (14 Nov 2026). `tests/rules-weight.test.js` fails otherwise. `docs/rules-publication.md`.
- **Security header.** `index.html` lists every outside service the book may load; a new one goes there and is a head chef decision. Inline `<script>` and `onclick=` do not run. pdf.js: change `PDFJS` in `js/prep.js` and the header together.
- **Text widths in tests.** The tests stand Google Fonts in with nothing, and the stand-in fonts differ from machine to machine: a check that depends on how wide text is measures in Barlow (`tests/todays-team.test.js`) or compares with and without (7 Nov 2026).
- **Test helpers.** `L.waitFor`, not `page.waitForFunction`; `L.settle(p, ms)`, not `p.waitForTimeout(ms)`. A check on something read from Firestore waits for that thing itself. A file's top-level catch calls `process.exit(1)`, never only `process.exitCode = 1` (`tests/exit-on-error.test.js`).
- **Names stay apart per feature.** Classes and click attributes are per feature (`.rail` on the Pass, `.wtop` for the landing and top bar; `data-note`, `data-p`, `data-act`; `dk-` landing dockets, `dr-` drinks; `td` is a table cell, to-do is `todo-`). Check `css/app.css` and the feature's section first.
- **After the tap.** Every action answers in its own frame and says what it did, by name, where the person is looking. A list line shows at once with its slip (`slipName()`), Not sent while it waits; a form's Save says Saved only after the server answers (`svButton()`) and turns off the words that belonged to the unsaved form. Answer the six questions in `docs/action-feedback.md` for every new button.
- **A line above a live list** keeps the list header's height: measure the header with and without it in the test, or a tick lands on the wrong row (7 Nov 2026, `docs/design-patterns.md`).
- **One name, one meaning.** A top-level function or var name used twice in one file silently replaces the first: search before naming. `tests/design-patterns.test.js` fails on it.
- **Firestore** cannot store a list inside a list: use a list of small maps (`teamsum/main`, 7 Nov 2026).
- **Sheets and popups** go on `document.body`, one at a time through `sheetBusy()` and `sheetNext()`. Nothing opens by itself over Who are you? (`namesUp()`) or a live Undo.
- **No new listeners or polling.** Listeners are only for today's live data. Pings, minutes, mail, to-do, drinks, guides and recipe changes are read on open, once a day or after 30 minutes away; each section says exactly when.
- **Recipes lists.** Shelves and tile groups use `content-visibility: auto`: anything that measures or scrolls to a plate goes through `backHome()`. Tap feedback uses `scale` inside `:where()`, never `transform`.
- **Saved shell.** Read `docs/saved-shell-generations.md` before touching `sw.js` or the update handshake. Every startup file is in `SHELL` and both `js/upkeep.js` lists; lazy pages are not.
- **Lazy pages and their API numbers** (`MG_API`, `FE_API`, `SUP_API`, `LK_DRAW.api`, the delivery page): bump a pair only when an older copy of one cannot run with the other. A change that only adds keeps them.
- **Recipes and drawings.** `js/overlay.js` loads after `js/data.js` and before `js/prep.js` and `js/app.js`. Edits start from `LK_RX.pristine(id)` or `LK_RX.change(id)`. Everything drawn from Firestore or IndexedDB goes through `LK_RX.clean()`. Walk drawing parts with `isPiece()` or `itemOfEl()`, not `el.t === 'item'`. Draw it for me uses `LIB.P.rng`, never `Math.random`, keeps `node tests/smart-match.js` at 85% or more and `node tests/style-check.js` clean.
- **Functions.** A round's sent, left and trips come only from `roundState()`, and Sent and Confirm out are two checks: To plate now, Late and the band follow Sent; only the shelf follows Out (`docs/code-contracts.md`, Trips). Phone and email live only in `fncontact`. `first`, `last`, `from`, `until` and `kq` come from `derive()`. Keep rule checks on `functions` cheap and test the largest booking (12 lines, 8 rounds) on the emulator.
- **Shared maths lives in one file** that the phones and the server jobs both run: cut-offs in `js/cutoffs.js`, the list batch time in `js/learn.js`, amounts in `js/amounts.js`.
- **Held-back pages.** Any new link, card or read for guides, pings, minutes or cleaning checks `featOn()`. Cleaning is off by default for the team, with canonical chef setup access and matching server rules.
- **Admin panel.** A new block gets a `.label` or `h3.a-ch-h` (the nav chips read them). Lists that grow go through `lvHTML()`. No hand-built long tables, no second sticky bar.
- **Prep list.** Double ups merge only through `mergeDups()`, from a server read; a `dupOk` line never merges. Tomorrow's list cut comes from `cutFor()`.
- **Top bar.** Pings, the chef hat and the round Today's team chip (7 Nov 2026), all the bell's size. A button with words in it wraps the page tabs on a laptop and cuts "Kitchen Book" on a phone (measured 7 Nov 2026, `docs/todays-team-options/brief.md`); anything more is a head chef decision. Sign-offs and `hist` copies are immutable; a change after publishing is a new version.
- **Transfers.** A new line field needs the rules, `scripts/nightly-learn.mjs` and `tests/safe-text.test.js`. Six tabs is the most the phone tab bar fits.

## Changes that went wrong before (28 Oct 2026)

Each rule here is a bug the book shipped and then fixed. Check your change against them before the pull request.

**Walk every role through the change (#397, #398, #387).** An access or rules change locked staff out of their own minutes sign-off, and the head chef's Google device out of saving after a sous chef had. List every read and write the page makes, then run each through each role on the emulator: signed out, staff, lead, view only, Functions only, sous chef, the head chef on a PIN, the remembered Google device while locked, its matching head PIN plus grant, the same device with staff signed in, and the shared tablet. A rule that tests only the new write is not enough. The page's reads fail too, and a refused read must say so, never show "nobody" or "0". `tests/rules/client-shapes.test.mjs` holds one row per call shape the book sends, with who may and who asks, for nine sign-ins: add a row for a new call. `tests/roles.test.js` opens each page as each role and fails on a read the rules refuse, and the stand-in (`tests/fake/`) refuses what the rules refuse.

**A merge keeps what is stored (#398).** `setDoc` with `merge` leaves the old `by` and any field you do not send. Test a second writer after the first, not only the first save. `W()` always sends `by` (`wBy()`), including `''`.

**An answer from the cache is not "nothing there" (#400, #405).** A listener or query offline answers at once from memory, empty, with `fromCache` or pending metadata. Never read that as an empty list, never save it to `lk.*` or IndexedDB, never write from it (a cook who sees an empty order list adds the item again). Writes made with no signal live in the tab's memory only: nothing may reload the book (refresh, update, 04:00) while one is waiting, and the screen says which lines are not sent. Every reload path goes through `lkServerUp()`.

**Never guess, never save nothing (#396, #399).** When no item matches, or more than one does, show a short card that says so. Do not pick the first by name. A Save with nothing to save is off, and `save()` refuses it too, so a button left on by an older page cannot blank a recipe's plate, a list or a label.

**Prove the fix fails first.** A fix to a bug adds the check that fails on the old code, and the pull request says so ("4 failed of 67 on the old file, 0 of 67 with the fix"). A test written only after the fix proves nothing.

**Say which way rules change.** A pull request that touches `firestore.rules` says in its first lines whether the rules get looser (publish before the client) or stricter (publish after), which role each check covers, and that the Lock probe passes after publishing. If the change needs an index or a migration script, the Publish rules workflow runs it before the client merges.

**Decisions move, so does this file.** When a head chef decision or a `docs/` note supersedes a line here, change the line in the same pull request. Do not leave both. A line marked as older wording is a stopgap, not a fix.
