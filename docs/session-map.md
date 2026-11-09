# Session map: which note to read, and every file

## Shared modal frame, 9 November 2026

The owner approved the existing picker frame across all dismissible sheets: touch-visible ×, matching title/spacing/corners, swipe cancellation and one 768 px responsive breakpoint. `js/controls.js`, `css/app.css`, menu history in `js/app.js`, native-dialog queue recognition in `js/prep.js` and occasion history in `js/seasonal/theme-bridge.js`. Real forms, native dialogs, guide pages, cooling and gestures are covered by modal-frame, modal-overlays, modal-close, swipe-dismiss, cooling, seasonal and the full Click tests. No reads, saved fields or rules change. [Contract, quick check and comparisons](adaptive-controls.md#shared-modal-frame-9-november-2026).

## Supplier Latest/Earlier purchase labels, 9 November 2026

The head chef selected A, Label the reference, after the [council and three visual directions](supplier-last-order-status-options/brief.md#chosen). Latest order / Earlier order uses loaded order IDs, keeps quantity/date visible and adds no read, tap or measured row height. `js/suppliers.js?v=24`, its loader in `js/app.js`, `css/app.css` and the focused `tests/supplier-order-status.test.js` implement and check the labels. Unknown history remains neutral, including old-record replay after a failed read. [Actual measurements and screenshots](supplier-last-order-status-options/brief.md#implementation-evidence).

## Planning staff sections ahead, 9 November 2026

The later requested empty-break-board refinement hides only confirmed valid empty current status; clock paints can show it again without reads or replacing draft inputs. The notebook suite passes 76 checks, including four failures on the prior source. [Contract](team-notebook-options/brief.md#hide-a-confirmed-empty-board-9-november-2026).

The head chef requested dated section planning a week ahead, reviewed three isolated previews, then chose A, a week strip in Today's team, and authorised coding. Round 1: Build smaller, 5 of 5. Round 2: A first for 6 of 6. `js/prep.js` and `css/app.css` extend the roster notebook with Monday to Sunday, previous/next week, Today, written day status and dated Save. Each date retains its own memory-only draft and version, separate from today's live record. Future saves do not invalidate today's staff view; older dates are read-only. The week query is bounded, with no listener. `tests/team-week.test.js`, existing team/Home/device/read-budget checks, the design registry and the real-emulator client shape matrix cover the changed contracts. `docs/team-week-options/` retains the proposal, previews, council, actual-app screenshots, density measurements and release status. [Feature record](team-week-options/brief.md).

## Quieter team management review, 9 November 2026

The head chef also asked to tidy the noisy planner across the existing management entry points, then chose A, Quiet notebook, one list, on 9 November 2026. Round 1: Build smaller, 5 of 5. Round 2: A first for 5 of 6, scores A 16, C 13, B 7; the new starter preferred C. [Three isolated interactive previews](team-tidy-options/index.html) retain the comparison. The chosen shared notebook keeps section-first assignment, one person list with labelled per-person details, visible summaries, compact date/status, section counts and a single dated Save before secondary tools. Existing weekly/date/access/draft contracts remain. The brief separates actual baseline and schematic preview measurements and records implementation and release evidence. [Feature record](team-tidy-options/brief.md).

## Each supplier item's last order, 9 November 2026

The existing supplier row shows its last recorded quantity and Queensland date, including purchases omitted from the newest supplier order. One bounded history page on selection, explicit Older orders coverage and no new saved fields for this reference. Split entries merge their own and inherited history chronologically, at most 42 order reads for 20 returned rows. `js/suppliers.js?v=24`, `css/app.css`, the lazy URL in `js/app.js`; `tests/supplier-last-ordered.test.js`, supplier workspace, quantities and module versions. [Contract, quick council and verification](supplier-workspace.md#each-items-last-order-9-november-2026).

Moved from `CLAUDE.md` on 8 November 2026, word for word, so the file every session loads keeps one short row per note and a short list of files. This page keeps the full rows: the dates, the chosen designs, the tests and the notes for each file. Search it for the note or file name you need (Grep), then read that row.

When a note or a file is added: its full row goes here, and one short row (what it covers, where it is) goes in `CLAUDE.md`. When the two disagree, the note itself wins, then `CLAUDE.md`.

## Operandio daily lockout, 9 November 2026

The owner requested disabling the timer after the second deadline until the following Queensland midnight. `js/cooling-core.js` derives the day gate from the exact server timestamp; `js/cooling.js` guards direct calls and `js/cooling-ui.js` shows completion as read-only, returning to ready at midnight without a reset write. The stricter `firestore.rules` and matching stand-in enforce the same date gate. Focused cooling and real emulator regressions include roles, refreshes, two screens, exact midnight and cross-midnight deadlines. [Contract, small-change council and checks](operandio-cooling.md#daily-lockout-9-november-2026). Publish rules after the compatible client; no new stored fields or reads.

## Sheet and modal close button, 9 November 2026

Historical rollout, superseded by the shared modal frame above. The owner initially requested a small × on bottom sheets and modals for non-touch screens. The shared `SwipeDismiss()` helper in `js/controls.js` adds a missing header close using the original cancellation callback. `css/app.css` controls pointer/hover visibility and title spacing; `js/app.js` and `js/upkeep.js` keep the visible control in their keyboard loops. [Contract and verification](adaptive-controls.md#swipe-to-close-9-november-2026); `tests/modal-close.test.js`, `tests/update-confirmation.test.js` and existing overlay/swipe checks. No reads, rules, stored fields or saved-shell manifest changes.

## Swipe to close, 9 November 2026

The owner requested swiping to dismiss the existing sheets and modals. The small-change quick check retains the same layout, visible rows and service taps. `js/controls.js` shares header/grip drag handling and routes dismissal through the original backdrop/Cancel action; `css/app.css` adds pointer feedback and reduced-motion support. [Contract, council and verification](adaptive-controls.md#swipe-to-close-9-november-2026), [shared pattern](design-patterns.md#over-the-page); `tests/swipe-dismiss.test.js`, `tests/adaptive-controls.test.js`, `tests/overlays-back.test.js`. No new reads, rules or saved data.

## Operandio clock motion, 9 November 2026

The owner chose B's desktop countdown pill and the fixed mobile filling ring, authorised implementation and live release, and requested three louder chimes. The 4-hour stage still waits for a separate tap after 2 hours. [Decision, comparison and verification](operandio-clock-motion-options/brief.md), [feature contract](operandio-cooling.md). `js/cooling-ui.js` and `css/cooling.css` own the presentation; `js/app.js`, `js/prep.js` and `js/cooling.js` retain the clock while headers redraw and adapt the existing controller. `js/chime.js` owns the bounded three-chime sound. No new data reads, writes or rules. The preview source and recordings remain under `docs/operandio-clock-motion-options/` as the decision record.

## Operandio cooling, 8 November 2026

The head chef approved the compact 248 by 155 px clock dropdown, everyone with kitchen PIN access starting two hours, and a separate manual Start for four hours. Council: Build smaller, 5 of 5. The latest clarification needs pings only on logged-in open screens; saved start times preserve the timer after closure. No new service or billing change. [Feature contract](operandio-cooling.md), [chosen design and council](operandio-cooling-options/brief.md).

| Files | Role and checks |
| --- | --- |
| `js/cooling-core.js`, `js/cooling.js`, `js/cooling-ui.js`, `css/cooling.css` | Shell: timing contract, shared subscription, direct writes and compact UI. Core/controller/UI/access/integration tests are `tests/cooling*.test.js`. |
| `js/prep.js`, `js/app.js` | Existing session/write/overlay adapters, top chip and guarded route. |
| `sw.js`, `index.html`, `js/upkeep.js` | Saved shell membership. Existing supplier push handling is unchanged. |
| `firestore.rules`, `tests/rules/cooling.test.mjs` | Strict additive canonical stage transitions. Publish reviewed rules before dependent client. |
| `scripts/nightly-backup.mjs`, `scripts/backup-recovery-check.mjs` | Current run and precise start-time recovery. Move PIN waits for an unfinished batch. |

## Which note to read before you change it

Supplier template order and separate delivery schedules, 9 November 2026: the existing catalogue importer follows an updated full catalogue's stable ID sequence, preserves live existing item records, inserts new IDs once and retains extras. The optional order-only file also remains supported. The owner requested separate Dry Goods and Seafood entries, preserving their existing configured reminders. The follow-up screenshot confirms an existing Seafood catalogue, not that the revised private file has been applied. If the incoming destination ID is absent, a unique exact saved supplier name reuses that catalogue. Strict original-name and full-pack matching preserves its different item IDs, raw item maps and own orders. An explicit split atomically archives original copies and adds immutable `historyFrom`/`historyBefore` metadata and a complete optional `historyItems` map. Mapped drafts and template matching follow those links. History merges two bounded streams using independent emitted cursors, at most 42 order reads per UI page. Orders are never rewritten. The contract, quick council, counts, read costs and release requirements are in `docs/supplier-workspace.md`, Template order updates and Separate delivery schedules. Synthetic checks are in `tests/supplier-catalogue-reorder.test.js`, `tests/supplier-template-order.test.js`, `tests/supplier-split.test.js`, `tests/supplier-existing-split.test.js`, `tests/supplier-core.test.js` and the supplier/call-shape emulator suites. UI/core/store APIs are 11/6/4 at lazy URLs 23/7/7. Publish the additive map/first-attachment rules before the dependent client, then verify the canonical foundation and live Lock probe. New repair checks and live application remain pending until recorded in the pull request. Actual supplier goods and import files remain outside the public repository.

Section prep standards, chosen 8 November 2026: `docs/prep-standards.md` records the Prep room, canonical head-owned minimums, normal typed matching, complete Before service reference, private per-item schema, paged read policy, drafts and release requirements. `js/prep-standards.js` is lazy and uses the bridge in `js/prep.js`; it is not a startup shell file. `docs/prep-par-options/brief.md`, `index.html` and `refined.html` retain the council and design comparison. The implemented real-font density is recorded separately in `implemented-density.json`; browser, rules and backup checks cover the feature. PR #612 records release evidence.

`CLAUDE.md`, "Read the note before you change it", has the short version of this table.

| Changing | Read |
| --- | --- |
| A new page, tab, button, setting, sheet or workflow; how a service task is done; removing a feature; any design choice | `.claude/skills/service-council/SKILL.md`: run the service council first (5 Nov 2026) |
| Building any screen piece: the look, a page card, chips and pickers, Save, a sheet, a top bar chip, a list header line, a fold, an admin block, a chef hat tile | `docs/design-patterns.md` (8 Nov 2026): use one, or add the new one there and its names to `tests/design-patterns.test.js` |
| Whole-app audit, consistency, redundancy, security and performance review | `docs/whole-app-audit.md` (brief), `docs/ux-council-audit.md` (evidence), `docs/whole-app-inventory.md` (route coverage) |
| Login, who can read or write what, recipes, function writes | `docs/private-kitchen-access.md` (wins over anything older in this file) |
| Head chef / sous chef panel (chosen 8 Nov 2026): dedicated `#/chef` panel like the actual admin, sharing its four-room shell, rail, tabs and Find; Today uses current-day lists and existing editors, Reports reads one selected prep/order day, Team embeds planner/roster/minutes register, Kitchen links to existing tools. Canonical chef PIN access, current permissions, separate in-memory chef tabs, existing locks and drafts | `docs/chef-panel-options/brief.md` (Chosen implementation, read costs, failure states, focused browser checks and release status), `docs/private-kitchen-access.md` and `docs/navigation.md`. `proposal.md` and `index.html` there retain the earlier design comparison; the owner's clarification selects the dedicated panel |
| Head chef decisions; open items and older code to bring in line; how each prep and admin part works | `docs/head-chef-decisions.md`, `docs/open-work.md`, `docs/prep-book.md` (search, then read the part) |
| Code contracts per feature: pings, minutes, mail, to-do, drinks, sections, guides, recipes and drawings, functions, wastage, transfers, cut-offs, the clock | `docs/code-contracts.md` |
| Kitchen cleaning (8 Nov 2026): approved C daily list + A chef week review, existing notebook styling, Guides into the hat, private who/when ticks, chef repeat setup and admin-controlled team release | `docs/cleaning-options/brief.md`, `docs/cleaning-options/implementation.md`, `docs/cleaning-options/release-toggle.md`; actual jobs and weekdays are entered by chefs |
| Drinks run notebook (8 Nov 2026): grouped order on the left, Your usual and people on the right from 1100 px; original phone reading order and one usual-drink editor on a single sheet; same colours, data and taps | `docs/drinks-notebook.md`, `docs/code-contracts.md` (Drinks run), `tests/drinks-notebook.test.js`, `tests/drinks.test.js` |
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
| Today's team roster notebook, refined A chosen (8 Nov 2026): planner left and saved scheduled-away status right from 1100 px, one flow below; pinned Whole day draft review, scrollable configured shifts and section-first assignment; one draft and version-protected Save. Original Build smaller 5 of 5, A 4 of 6 and six-reviewer follow-up recorded. Implemented and checked locally, eight-file suite and final 63-check notebook rerun passed, CI and authorised live release pending | `docs/team-notebook-options/brief.md` (Chosen, Build, preserved contract, historical preview comparison, actual tap/phone visibility checks and local validation), `docs/prep-book.md` (Today's team), `docs/code-contracts.md` (Today's team roster notebook); `a.html`, `b.html` there are the original concepts |
| Chef to-do: selected B, Open notebook (8 Nov 2026), after the council recommended A; jobs left and the single editor right from 1100 px, one flow below; built and checked locally, awaiting pull request checks and release | `docs/chef-todo-options/brief.md` (Chosen, preserved contract, preview history and implementation validation), `docs/prep-book.md` (Chef to-do) |
| Staff-first Home, approved 9 Nov 2026: section/shift, break/return, scheduled coworkers before work; saved full team in a disclosure; desktop spacing/alignment refinement on 9 Nov | `js/prep.js`, `css/app.css`; `docs/home-staff-first.md`; Home browser checks |
| The whole book redesigned from seven apps (Linear, Things 3, Airbnb, Todoist, Flighty, Duolingo, Headspace): chosen 8 Nov 2026 (B's now and next home with the celebrations, admin B Inbox with a dashboard, handwritten line words, Urgent in one tap), built in eight grouped steps, Prep first; not started | `docs/whole-app-redesign-options/brief.md` (Chosen, Build), `every-page.html` there: read them before changing Home, list rows, the chef hat, the function page or the admin panel |

## Every file

`CLAUDE.md`, "Files", has the short version of this table.

**Shell** below means: loaded by `index.html`, listed in `SHELL` in `sw.js` and in both lists in `js/upkeep.js` (a startup file missing from one of the three breaks the saved copy). **Lazy** means loaded by the page that needs it and in none of them.

| File | What it is |
| --- | --- |
| `AGENTS.md` | Added 8 November 2026: Codex reads the full `CLAUDE.md` at the start of every task, including its required notes and skills. Shared rules stay in `CLAUDE.md`; this entry point only refers to them. Checked the relative link and Markdown-only scope. |
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
