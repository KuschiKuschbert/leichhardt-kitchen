# Session map: which note to read, and every file

Moved from `CLAUDE.md` on 8 November 2026, word for word, so the file every session loads keeps one short row per note and a short list of files. This page keeps the full rows: the dates, the chosen designs, the tests and the notes for each file. Search it for the note or file name you need (Grep), then read that row.

When a note or a file is added: its full row goes here, and one short row (what it covers, where it is) goes in `CLAUDE.md`. When the two disagree, the note itself wins, then `CLAUDE.md`.

## Which note to read before you change it

`CLAUDE.md`, "Read the note before you change it", has the short version of this table.

| Changing | Read |
| --- | --- |
| A new page, tab, button, setting, sheet or workflow; how a service task is done; removing a feature; any design choice | `.claude/skills/service-council/SKILL.md`: run the service council first (5 Nov 2026) |
| Building any screen piece: the look, a page card, chips and pickers, Save, a sheet, a top bar chip, a list header line, a fold, an admin block, a chef hat tile | `docs/design-patterns.md` (8 Nov 2026): use one, or add the new one there and its names to `tests/design-patterns.test.js` |
| Whole-app audit, consistency, redundancy, security and performance review | `docs/whole-app-audit.md` (brief), `docs/ux-council-audit.md` (evidence), `docs/whole-app-inventory.md` (route coverage) |
| Login, who can read or write what, recipes, function writes | `docs/private-kitchen-access.md` (wins over anything older in this file) |
| Head chef decisions; open items and older code to bring in line; how each prep and admin part works | `docs/head-chef-decisions.md`, `docs/open-work.md`, `docs/prep-book.md` (search, then read the part) |
| Code contracts per feature: pings, minutes, mail, to-do, drinks, sections, guides, recipes and drawings, functions, wastage, transfers, cut-offs, the clock | `docs/code-contracts.md` |
| Staff Add/Tick/Delete, canonical capability lists and staged publication | `docs/staff-capabilities.md` |
| Saved public shell generations, update migration and compatible rollback | `docs/saved-shell-generations.md` |
| GitHub rules publication, release confirmation and synthetic publisher checks | `docs/rules-publication.md` |
| Device choice, Google persistence, daily PIN unlock, Update confirmation | `docs/device-sessions.md` (2 Nov 2026, replaces earlier session wording) |
| Multiplying recipe amounts | `docs/recipe-multiplier.md` |
| Shared-screen Prep attribution, modal picker, recorder identity and completion credit | `docs/shared-prep-attribution.md` |
| Admin analysis, references, training records and nightly analysis | `docs/admin-intelligence.md` |
| Admin autocorrect repairs, shared protected words and private correction history | `docs/proofreader-admin.md` |
| Admin visual design, selected A: The Chef's Desk | `docs/admin-design-options/brief.md` |
| Admin dashboard, selected A with B's headlines (3 Nov 2026) | `docs/admin-dashboard-options/brief.md` |
| Admin pages redesign, selected B: Four rooms on the shared page kit (4 Nov 2026), built in seven steps by 5 Nov 2026 | `docs/admin-pages-options/brief.md` |
| Prep, Orders, Wastage, Transfers and chef hat redesign, selected: shared fixes, then A with four pieces of B (3 Nov 2026), built in steps, the last on 4 Nov 2026 | `docs/work-pages-design-options/brief.md` |
| Settings page for each role, selected A: One sorted page (3 Nov 2026) | `docs/settings-options/brief.md`, `docs/device-sessions.md` |
| Seasonal celebration redesign, recommended set selected (3 Nov 2026) | `docs/celebration-options/brief.md` |
| Recipe and drawing editor layout, selected A's chapters with B's full-screen studio (3 Nov 2026) | `docs/recipe-editor-options/brief.md` |
| Drawing studio, selected B: quiet canvas, with more servingware colours (4 Nov 2026) | `docs/studio-options/brief.md` |
| Shared controls, deferred search, table interactions and council audit | `docs/adaptive-controls.md`, `docs/ux-council-audit.md` |
| Loading, saving, measured progress and reduced motion | `docs/loading-motion.md` (current), `docs/loading-feedback-options/brief.md` (recommended set chosen 4 Nov 2026, findings and build steps) |
| What a tap shows after it: a save, add, tick, Undo or Refresh, its words, where the person is left (5 Nov 2026) | `docs/action-feedback.md` (the rule), `docs/action-feedback-options/brief.md` (audit of 307 actions, designs, scores) |
| What reads and writes Firestore, what each page costs, and the plan to stay inside the free plan (audit, 5 Nov 2026) | `docs/firestore-usage.md` |
| Nightly backup format, protected decryption and isolated recovery checks | `docs/backup-recovery.md` |
| Suppliers, order history, cut-off sheets | `docs/supplier-workspace.md` |
| Order cut-off patterns (a day and time per delivery day) and the heads-up the day before, selected the recommended mix (5 Nov 2026) | `docs/cutoff-options/brief.md` |
| Supplier order and Delivery received redesign, selected A: The Order Sheet (3 Nov 2026) | `docs/receiving-design-options/brief.md` |
| Wastage history, ranges, CSV | `docs/wastage-history.md` |
| CSV text, quoting and numeric values across reports | `docs/report-exports.md` |
| Transfer storage and returns | `docs/transfer-returns.md` (publish rules from the feature branch first: it indexes loans) |
| Function cancel, Undo, delete | `docs/function-cancellation.md` |
| Function print copy | `docs/function-printing.md` |
| Delivery temperatures | `docs/delivery-received.md` |
| Shift ping recipients | `docs/ping-recipients.md` |
| Ping sound and the head chef's choice of sound | `docs/ping-sound.md` |
| Back arrow and page trail | `docs/navigation.md` |
| Merging: ready means merge in the next release window, the one-at-a-time queue, `urgent`, the token | `docs/auto-merge.md` |
| Seasonal celebrations, festival dates and their sources | `docs/seasonal-celebrations.md`, `docs/seasonal-calendar.md` |
| Admin flow baseline behind The Chef's Desk | `docs/admin-flow-spec.md` |
| Smoker batch cards and what was left out (30 Oct 2026) | `docs/smoker-batches.md` |
| Today's team: shifts, sections, breaks and the team chip, selected A with three pieces of B (7 Nov 2026), all four steps built (the chef's page, the staff side, the training numbers in `teamsum/main`), then split shifts and chefs' own sections (7 Nov 2026) | `docs/todays-team-options/brief.md`, `docs/prep-book.md` (Today's team) |
| The whole book redesigned from seven apps (Linear, Things 3, Airbnb, Todoist, Flighty, Duolingo, Headspace): chosen 8 Nov 2026 (B's now and next home with the celebrations, admin B Inbox with a dashboard, handwritten line words, Urgent in one tap), built in eight grouped steps, Prep first; not started | `docs/whole-app-redesign-options/brief.md` (Chosen, Build), `every-page.html` there: read them before changing Home, list rows, the chef hat, the function page or the admin panel |

## Every file

`CLAUDE.md`, "Files", has the short version of this table.

**Shell** below means: loaded by `index.html`, listed in `SHELL` in `sw.js` and in both lists in `js/upkeep.js` (a startup file missing from one of the three breaks the saved copy). **Lazy** means loaded by the page that needs it and in none of them.

| File | What it is |
| --- | --- |
| `index.html` | The page and its security header (which outside services may load) |
| `js/boot.js` | Runs first in `<head>`: the install offer, the saved text size, the book's clock (`LK_TIME`) |
| `js/device.js` | Personal/shared device choice and guarded Settings controls. `docs/device-sessions.md` |
| `js/upkeep.js` | Runs at the end of `<body>`: the daily 04:00 self-refresh, automatic updates, the service worker registration |
| `js/data.js` | Every recipe (the only file staff edit). Field guide at the top |
| `js/overlay.js` | Lays the head chef's recipe changes (`book/index`, `recipes/<id>`, `lk.rx` on the phone) over `js/data.js`. After `js/data.js`, before `js/prep.js` and `js/app.js` |
| `js/art.js` | Plates, pans, side views, build views, technique diagrams |
| `js/amounts.js`, `js/learn.js`, `js/cutoffs.js`, `js/chime.js` | Shared with node, before `js/prep.js`, shell: typed amounts (`LK_AMT`), when tomorrow's list was written (`LK_LEARN`, `tests/learn.test.js`), order cut-offs (`LK_CUT`, also `scripts/cutoff-push.mjs`), ping sounds (`LK_CHIME`, `docs/ping-sound.md`) |
| `js/controls.js`, `js/motion.js` | Shared pickers, deferred search and report tables (`docs/adaptive-controls.md`); Ink in motion helpers, callers own wait and offline states (`docs/loading-motion.md`). Shell |
| `js/functions.js` | Functions: schedule maths (also run by node), the band under the top bar, the function sheet, `#/fn`, the landing card. Shell |
| `js/app.js` | Routing, top bar, recipe views (Pass, Tiles), recipe cards, settings, install, QR |
| `js/prep.js` | Prep list, orders, wastage, guides, admin panel, staff lock, insights, learning, suggestions |
| `js/seasonal/`, `css/seasonal*.css`, `css/celebration-ticker.css`, `fonts/` | Seasonal celebrations: catalogue, calendar, effects, six-language copy, the Devanagari font. Shell. `docs/seasonal-celebrations.md` |
| `js/firebase-config.js`, `css/app.css` | Public Firebase web config; the Leichhardt look |
| `js/manage.js` | Manage Recipes & Drawings (`#/manage`). Lazy: `mountManage()` in `js/app.js`, for the head chef, sous chefs and the admin |
| `js/draw.js`, `js/library.js`, `js/lib/*.js` | The drawing editor (`#/manage/draw/...`) and its library. Lazy, with the editor. `tests/library-check.js`, `tests/contact.js` |
| `js/smart.js`, `js/compose.js` | Draw it for me (`book/matches`) and the recipe reader that draws a card in the book's look. Lazy, after `js/draw.js`. `tests/smart-match.js`, `tests/compose-read.js`, `tests/style-check.js` |
| `menu-survey.md` | The 120 Queensland menus behind the library (inspiration only, no prices) |
| `js/suppliers.js`, `js/supplier-core.js`, `js/supplier-store.js` | Supplier workspace (`#/suppliers`). Lazy, for an authorised chef. `docs/supplier-workspace.md` |
| `js/deliveries.js` | Delivery received (`#/deliveries`). Lazy. `docs/delivery-received.md` |
| `js/fnedit.js` | Manage functions (`#/functions`). Lazy, for someone ticked for Functions |
| `js/admin-dashboard.js` | The admin Dashboard (`LK_DASH`): headlines, tiles and charts from the nightly `analysis/dashboard` record. Lazy, from `js/prep.js` when the page opens. `docs/admin-dashboard-options/brief.md` |
| `js/analysis-core.js`, `js/admin-intelligence.js`, `js/proofreader-admin.js` | Admin Review desk: analysis maths (shared with node), the analysis workspace, the proofreader. Lazy, from `js/prep.js`, admin only. `docs/admin-intelligence.md`, `docs/proofreader-admin.md` |
| `firestore.rules` | Rules template (see Never in this repo) |
| `manifest.webmanifest`, `sw.js`, `icons/`, `icon.svg` | Installable app: manifest, service worker (saved shell generations), rope KB logo |
| `qr.svg`, `qr.png`, `qr-sign.pdf` | QR code to open the book, and the A4 sign |
| `README.md` | What the app does, for people and for the next session: the overview, with the long parts in `docs/head-chef-decisions.md`, `docs/prep-book.md` and `docs/open-work.md` |
| `tests/` | Click tests (Playwright with a stand-in for Firebase in `tests/fake/`). `tests/rules/`: the rules on the emulator |
| `.claude/settings.json`, `scripts/guard-main.mjs` | The main-branch guard: a Claude Code hook that refuses edits and commits on `main` |
| `scripts/pre-merge.sh`, `.github/pull_request_template.md` | Run before merging (open pull requests, worktrees, whether `main` moved); the pull request sections |
| `.github/workflows/auto-merge.yml` | Merges a ready pull request once Click tests pass, in a release window (15:00 to 16:30 or 22:30 to 02:30; `urgent` at any time), and brings `main` in one at a time, with the `AUTOMERGE_TOKEN` secret. `docs/auto-merge.md`. `tests/auto-merge-queue.test.js` runs the queue step (found by its name, "Move the queue on by one") with a stand-in for `gh`: change the two together |
| `.claude/skills/service-council/`, `scripts/council-check.mjs`, `.github/workflows/council-check.yml` | The service council (when it runs, the two rounds, the reviewer briefs) and the Council check: red on a ready pull request that changes the app without a `Verdict:` line. Advice only, not required. `tests/council-check.test.js` |
| `scripts/flaky-report.mjs`, `.github/workflows/flaky-report.yml` | Every Monday 07:13: the files that passed only on retry, hit the 10 minute limit or failed on the live site, kept in one issue (label `flaky-report`). `tests/flaky-report.test.js` |
| `.github/workflows/pr-tests.yml` | The **Click tests** check on every pull request to `main` (branch protection requires it) |
| `.github/workflows/publish-rules.yml`, `scripts/publish-rules.sh`, `.github/workflows/lock-probe.yml`, `.github/workflows/live-tests.yml` | Publish the rules from GitHub (secrets `FIREBASE_SA`, `KITCHEN_PIN`, `OWNER_EMAIL`) or from your own computer, prove the lock on the live book after (`tests/rules/probe.mjs`, also weekly), and run the click tests on the live site after each Pages deploy. `docs/rules-publication.md` |
| `scripts/nightly-learn.mjs`, `scripts/nightly-analysis.mjs`, `scripts/analysis.mjs`, `scripts/dashboard.mjs`, `.github/workflows/nightly-learning.yml` | Nightly at 03:00 kitchen time: learning counts (`learned`, `ordlearned`), `summary/waste` and `summary/transfers`, then the analysis (`analysisDaily`, `analysis/*`, the admin Dashboard's numbers) and the day digests (`digest/<day>`, one record per past day, 5 Nov 2026), and Today's team's training numbers (`teamsum/main`, chefs and admin only, 7 Nov 2026), published only after every read succeeds. The phones never write learning counts. `docs/admin-intelligence.md` |
| `scripts/nightly-backup.mjs`, `scripts/backup-crypto.mjs`, `.github/workflows/nightly-backup.yml` | Nightly encrypted backup at 03:30 kitchen time (AES-256-GCM, `BACKUP_KEY`, kept 90 days). Reads only. `docs/backup-recovery.md` |
| `scripts/cutoff-push.mjs`, `.github/workflows/cutoff-push.yml` | Phone pushes for order cut-offs every 10 minutes (`push`, once each in `pushsent`, none once ticked in `cutdone`) |
| `scripts/access-bootstrap.mjs`, `scripts/ping-index.mjs`, `scripts/transfer-index.mjs`, `scripts/*-check.mjs` | One-off index and migration jobs the Publish rules workflow runs before a rules change that needs them, and the emulator checks that prove them and the server jobs. Read the matching `docs/` note before running one |
| `scripts/fold-recipes.mjs` | Folds the head chef's recipe changes from a Backup file into `js/data.js`: run it without `--write` first. Never commit the Backup file. `tests/fold-recipes.test.js` |
| `scripts/session-check.mjs`, `.github/workflows/session-check.yml` | Legacy session diagnostic (by hand, prints by list place and role only). Current session and grant checks: `docs/device-sessions.md`, `tests/rules/device-auth.test.mjs` |
