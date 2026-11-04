# Open work

Moved out of `README.md` on 3 November 2026 so sessions can read it in parts (README had grown past 350 KB). What is still to do with the head chef, and the older code that does not meet the coding rules in `CLAUDE.md` yet. Keep both lists in step and remove an item once it is merged.

### Open items (22 Oct 2026)

Done on 19 Oct 2026: the lock is proved on the live book after every publish and weekly, the nightly backup runs and a backup was decrypted on the head chef's Mac, the web app is registered for App Check (Fraud Defense) and every phone sends a token, and the `BACKUP_KEY` secret is in. Still open, in order, for the head chef and the next session:

Done on 22 Oct 2026 by the head chef: the Browser key works only from `kuschikuschbert.github.io/*`, the old branch `ccr-c40e44af-ixs9p5` is deleted, and the `APPCHECK_DEBUG_TOKEN` secret is saved: the Lock probe reads "App Check token in hand." and all 13 checks pass on the live book. The wastage lock, the past-day stamp and the `summary` rule were published on 22 Oct 2026 (a day early, so the Logged often chips and usual amounts work at once). App Check is enforced for Cloud Firestore since 22 Oct 2026: the Lock probe passes with the debug token, and a request without an App Check token is refused. The first PIN set-up window rules (S5) were published on 22 Oct 2026 (Publish rules on main after #339). The S9 rules (function contacts and minutes drafts locked) were published on 22 Oct 2026 after #342; the Lock probe passes all 19 checks. PIN sessions phase 2 (the older PIN proof switched off, #344) and the shift ping times (#346) were published on 22 Oct 2026 at 21:40 kitchen time, after the Session check said Ready; the Lock probe passes all 19 checks. 7 people had not opened the book since phase 1: a phone of theirs still on the older book asks for the PIN once when it next opens. The Firebase files are kept on the phone for no signal since 22 Oct 2026 (P5; draft #338 replaced). For a new loading failure, inspect current App Check metrics, authentication, rules and the live probe result. Do not weaken published access or attestation as a loading workaround.

1. **Fold book changes back into `js/data.js`** (the tool is built, 28 Oct 2026; run it when the head chef has changed recipes in the book). Current recipe changes are published through the public recipe/drawing mirrors without requiring the kitchen PIN. Folding them into `js/data.js` keeps the bundled static fallback in step; it does not change public/private access. Get a Backup file (admin panel, Settings, Backup, or the decrypted nightly backup), keep it outside the repository, then `node scripts/fold-recipes.mjs <file>` to read the report and `node scripts/fold-recipes.mjs <file> --write` to change `js/data.js`. Run the tests and open a pull request. See Folding back into js/data.js under Recipes changed in the book. Last folded 29 Oct 2026: 11 recipes (slaw, poutine, lamb-nachos, beetroot-bites, brisket-cob, wings, antipasto-platter, seafood-platter, chips-salad, diane-sauce, cowboy-butter) and the guest menu order (lamb-nachos and buffalo-corn-cob-with-cashew-crumb in Specials).

2. **Two recipes are hidden in the book but still in `js/data.js`** (29 Oct 2026): `chicken-adobo` (also first in Specials) and `pork-knuckle`. This is a dated static-source cleanup note. Recheck current public mirrors and hidden-recipe behaviour before acting. The owner still decides whether to remove the static entries or show the recipes again; no decision is made by this documentation update.

3. **Build the work pages redesign** (chosen 3 Nov 2026, see `docs/head-chef-decisions.md`). Seven steps in [the options brief](docs/work-pages-design-options/brief.md), one pull request each. Remove this item when the last step is live.

4. **Choose the drawing studio layout** (proposed 4 Nov 2026): A, three steps, or B, quiet canvas (recommended), in [the studio options brief](studio-options/brief.md). Nine fixes for either design can ship first. Record the choice in `docs/head-chef-decisions.md`, then build in five steps, one pull request each.

Remove each item here once it is done.

### Bringing the code in line (22 Oct 2026)

The coding rules in `CLAUDE.md` came from a check of the whole book on 21 Oct 2026. This is the older code that does not meet them yet, in the order to fix it. Each item is its own branch and pull request, with its tests. Remove an item once it is merged.

Done, all on 22 Oct 2026:
- the wastage log
- the read budget (what stays as it is, and why, is under Reads kept small)
- past-day changes reaching every phone
- text on screen
- filling in what the book knows
- the screens: the dimmed chef menu, the tab fades, the type-to-find recipe links and fewer boxes on the admin panel

Done on 2 November 2026:
- admin report read-cache fidelity: the stand-in now loses its read cache on reload, matching `memoryLocalCache`. The truthful baseline is 219 reads after an admin reload and zero on same-page report returns in the current fixture. No production cache change is needed for that existing cost. Private reports stay in memory under the current access contract. The earlier proposal to persist private report records is superseded. The lifetime regression failed 3 of 12 checks against the old stand-in and passes all 12 with the corrected model.

Still to do:
- one toast helper (23 Oct 2026): `js/manage.js`, `js/fnedit.js` and `js/draw.js` each build their own toast on the page body. They load only for the head chef or a function manager, so they were left as they are when `js/app.js`'s copy for Signed out went into `toast()` in `js/prep.js` (`plainToast()`). Hand them the prep one through `LK_PREP.book()`, with the file falling back to its own when the book has none, so `MG_API`, `FE_API` and the files' `API` stay as they are (a new number shuts the page with no signal on phones that kept the older file, see Installing it as an app, the service worker).
- one two-tap helper (28 Oct 2026): `js/manage.js` and `js/fnedit.js` each keep their own `arm()` and `armed()` (and `js/fnedit.js` clears its own when a function is removed). `js/draw.js` and `js/deliveries.js` use the prep one (`arm(key, redraw)` and `armed(key)` in `LK_PREP.book()`) since 28 Oct 2026. Move the other two onto it the same way, keeping `MG_API`, `FE_API` and the files' `API` as they are (each falls back to its own when the book has none).

- two nits from the review of the no-signal fixes (28 Oct 2026), each needing more than a line: the cut-off bar keeps its no-signal words after its listener is refused (`cutWatch()`'s error callback leaves `cutState` at `'offline'`; the stand-in needs to refuse a listener started with no signal once the signal is back to check it); `loadAdmins()`, `pickName()` and `loadMine()` say No signal for every failure that is not a refusal, the daily read limit too (say it only for `unavailable` or `deadline-exceeded`).

Code that breaks a coding rule from now on is fixed in the same branch, or added here.

Measured and kept as it is: `js/art.js` (1.3 MB, 164 kB zipped) still loads at start (22 Oct 2026). Loading it only when Recipes opens was built and measured on a phone six times slower than a laptop: the start was 9 ms sooner (284 to 275 ms until the scripts had run, 71 to 65 ms at full speed), nothing less was downloaded (it stays in `SHELL`), and the first Recipes after each start was about 90 ms slower (944 to 1036 ms). Recipes is the page the book opens most, so the change was not merged.
