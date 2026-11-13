# Working on the Leichhardt Kitchen Book

Current access and session contracts: read `docs/private-kitchen-access.md` and `docs/device-sessions.md` before changing login, permissions, recipes or function writes. They define the current public/private, role, daily-session and work-recovery contracts. Dated history is not an alternative access path.

The Kitchen Book is the Leichhardt Hotel kitchen's web app: the recipe book, the prep list, the order list, the wastage log, the transfer list (stock shared with the other venues), the team's how-to guides and the head chef's admin panel. Plain HTML, CSS and JavaScript on GitHub Pages, no build step. Live at https://kuschikuschbert.github.io/leichhardt-kitchen/.

Admin means the owner's verified Google identity plus this device's live head-chef PIN session and matching grant. Operational reads and writes use the persistent anonymous device identity. Google alone grants no operational access. Personal devices retain Google but unlock daily after 04:00 Queensland time. Shared idle/daily locks clear this device's authority and retain the original person's work behind the PIN screen; voluntary handover waits for unsent work and clears private drafts. See the access/device notes above.

## Never in this repo (it is public)
- The kitchen PIN and the owner's email. `firestore.rules` is a template with `KITCHEN_PIN` and `OWNER_EMAIL`; the real values only live in the published rules in the Firebase console.
- Prices, GP, supplier codes or anything else from AVC Live beyond ingredient names and quantities. AVC Live itself is read only: never change it.
- Staff names or PINs (they live in Firestore).

## Read the note before you change it
`CLAUDE.md` is loaded in every session, so it holds rules, not feature manuals. A feature's detail lives in `docs/<name>.md` and `README.md`. A new feature note goes in `docs/` with one short row here (what it covers, where it is) and its full row, with dates and the design chosen, in `docs/session-map.md`. Never a long bullet. Read the note first:

| Changing | Read |
| --- | --- |
| A new page, tab, button, setting, sheet or workflow; how a service task is done; removing a feature; any design choice | `.claude/skills/service-council/SKILL.md`: run the service council first |
| Any screen piece: a page card, chips and pickers, Save, a sheet, a top bar chip, a list header line, a fold, an admin block, a chef hat tile | `docs/design-patterns.md`: use one, or add the new one there and its names to `tests/design-patterns.test.js` |
| Home, list rows, the chef hat, the function page or the admin panel (the chosen whole-book redesign) | `docs/whole-app-redesign-options/brief.md` (Chosen, Build) and its `every-page.html` |
| Staff-first Home: personal shift, break/return, scheduled coworkers and full-team disclosure | `docs/home-staff-first.md` |
| The kitchen mascot: a shuffled daily action per person on Home, tap to replay; the card under a finished prep list; the section's sentence on the slip | `docs/kitchen-mascot.md` |
| The study behind the mascot's cheers: the idea list, both council rounds, the designs; the ideas not built yet | `docs/mascot-cheer-options/brief.md` (both steps chosen and built) and its `ideas.md` |
| The finished words on wide screens (from 900 px): a finished section's own tab and the finished list, said large with the mascot under his words | `docs/kitchen-mascot.md` (the contract), `docs/mascot-desktop-options/brief.md` (the study: round 1 Build smaller; the chosen blend, built) |
| Named staff welcome, current identity and personalisation audit | `docs/staff-personalisation-options/brief.md` (chosen A, long-name treatment and implementation checks) |
| Login, who can read or write what, recipes, function writes | `docs/private-kitchen-access.md` (wins over anything older in this file) |
| Device choice, Google, daily PIN unlock, Update, Settings | `docs/device-sessions.md` (replaces earlier session wording), `docs/settings-options/brief.md` |
| Staff Add/Tick/Delete and capability lists | `docs/staff-capabilities.md` |
| Publishing the rules from GitHub | `docs/rules-publication.md` |
| The saved shell, updates and rollback | `docs/saved-shell-generations.md` |
| Head chef decisions; open items and older code to bring in line; how each prep and admin part works | `docs/head-chef-decisions.md`, `docs/open-work.md`, `docs/prep-book.md` (search, then read the part) |
| Code contracts: pings, minutes, mail, to-do, drinks, sections, guides, recipes and drawings, functions, wastage, transfers, cut-offs, the clock | `docs/code-contracts.md` |
| Firestore reads and writes, what each page costs | `docs/firestore-usage.md` |
| What a tap shows after it | `docs/action-feedback.md` (the rule), `docs/action-feedback-options/brief.md` (the audit) |
| Loading, saving, progress and motion | `docs/loading-motion.md` (current), `docs/loading-feedback-options/brief.md` |
| Shared controls, search and tables | `docs/adaptive-controls.md`, `docs/ux-council-audit.md` |
| A whole-app audit | `docs/whole-app-audit.md`, `docs/ux-council-audit.md`, `docs/whole-app-inventory.md` |
| Shared surface and operational colours, banners and category exceptions | `docs/surface-colours.md` (chosen hybrid), `docs/colour-coding.md`, `docs/design-patterns.md` |
| Admin: analysis, proofreader, dashboard, pages, look | `docs/admin-intelligence.md`, `docs/proofreader-admin.md`, `docs/admin-dashboard-options/brief.md`, `docs/admin-pages-options/brief.md`, `docs/admin-design-options/brief.md`, `docs/admin-flow-spec.md` |
| Cross-training without written assessments (Who has worked where, the planner hint); admin Inbox and Dashboard (chosen R, 10 Nov 2026) | `docs/cross-training-options/brief.md`, `docs/admin-dashboard-restyle-options/brief.md` |
| Reports, Team: At a glance cards and when the counts run to (chosen A in Look 1, 12 Nov 2026) | `docs/team-glance-options/brief.md` |
| A smarter book (13 Nov 2026): Filled for you on Wastage, Transfers and Orders; Reports, Records with the nightly food safety count; the audit's other ideas | `docs/smart-book-options/brief.md` (chosen and built), its `audit.md`, `scripts/records-core.mjs` |
| Head chef / sous chef panel, chosen dedicated admin-style panel | `docs/chef-panel-options/brief.md` (Chosen implementation, permissions, reads and verification) |
| Prep, Orders, Wastage, Transfers and the chef hat; who did a Prep line on a shared screen | `docs/work-pages-design-options/brief.md`, `docs/shared-prep-attribution.md` |
| Orders as a shared request list with compact supplier cut-offs (chosen C) | `docs/order-list-options/brief.md` |
| Head-set section minimums, Prep room, smart matching and Before service | `docs/prep-standards.md`, `docs/prep-par-options/brief.md` |
| Renaming a kitchen section: old names kept, lines and counts under the name now (`secNow()`) | `docs/section-renames.md` |
| Today's team and its chosen notebook, council and build record | `docs/todays-team-options/brief.md`, `docs/team-notebook-options/brief.md` (Chosen, Build, council), `docs/prep-book.md` (Today's team) |
| Planning staff sections ahead, dated drafts, week picker and read costs | `docs/team-week-options/brief.md` (chosen A, implementation and verification) |
| Earlier Today's team worksheet and selected-day filtering | `docs/team-tidy-options/brief.md` (9 November C, retained behaviour and historical verification) |
| Today's team: row service/section, focused details and reachable Save | `docs/team-page-options/brief.md` (C chosen 10 November), `docs/team-page-options/implementation.md` |
| Cleaning page, ordered pack down, repeat schedule, checks, Pass verification and team release | `docs/cleaning-schedule.md`, `docs/cleaning-options/brief.md` (chosen C + A), `docs/cleaning-options/implementation.md`, `docs/cleaning-options/release-toggle.md`; keep unbranded templates in `js/cleaning-schedule.js`, separate from history; anchored intervals must agree in client and rules |
| Compact Cleaning management, chosen M1 groups and responsive repeat-task editor | `docs/cleaning-chef-options/implementation.md` (contract and current verification), `docs/cleaning-chef-options/brief.md` (designs and council) |
| Chef to-do notebook layout | `docs/chef-todo-options/brief.md` (Chosen, implementation contract) |
| Drinks run notebook style | `docs/drinks-notebook.md`, `docs/code-contracts.md` (Drinks run) |
| Recipe amounts, the recipe and drawing editor, the drawing studio, smoker batches | `docs/recipe-multiplier.md`, `docs/recipe-editor-options/brief.md`, `docs/studio-options/brief.md`, `docs/smoker-batches.md` |
| Suppliers, order cut-offs, the supplier order and Delivery received | `docs/supplier-workspace.md`, `docs/cutoff-options/brief.md`, `docs/receiving-design-options/brief.md`, `docs/delivery-received.md`; chosen Latest/Earlier purchase labels: `docs/supplier-last-order-status-options/brief.md` |
| Wastage history and CSV reports | `docs/wastage-history.md`, `docs/report-exports.md` |
| Transfer storage and returns | `docs/transfer-returns.md` (publish rules from the feature branch first: it indexes loans) |
| Functions: cancel, Undo, delete, print | `docs/function-cancellation.md`, `docs/function-printing.md` |
| Functions ahead of time: the chosen mix (Function this week card, Next function line, Orders tag, who has said Got it), when a function shows before its day | `docs/function-ahead-options/brief.md` (Chosen, build plan) |
| Operandio cooling: manual stages, shared confirmation, quiet reminders and 10:00–21:00 Queensland window with nightly expiry | `docs/operandio-cooling.md`, `docs/operandio-cooling-options/brief.md` |
| Operandio clock motion: chosen B desktop pill and fixed mobile ring, implementation and release checks | `docs/operandio-clock-motion-options/brief.md` |
| Pings: who gets them, the sound | `docs/ping-recipients.md`, `docs/ping-sound.md` |
| Back arrow and page trail | `docs/navigation.md` |
| Merging, the queue, `urgent` | `docs/auto-merge.md` |
| Publishing the site: only a merge that changes a file the phones load republishes; the book then updates silently when safe (no band unless asked) | `docs/site-publishing.md` |
| Nightly backup and recovery | `docs/backup-recovery.md` |
| Seasonal celebrations and festival dates | `docs/seasonal-celebrations.md`, `docs/seasonal-calendar.md`, `docs/celebration-options/brief.md` |

## Service council (5 Nov 2026)

Before building anything major (a new page, tab, button, setting, sheet or workflow, a change to how a service task is done, removing a feature, any design choice), run the council in `.claude/skills/service-council/SKILL.md`. Round 1: five critical reviewers ask whether it is needed and adds value. Round 2: three structurally different designs unless the head chef requests another number, with pros and cons, scored by the council and a screen designer. Explicitly consider a mix of all three using the seven-app principles, then give one clear recommendation; a recommended mix needs its own combined preview and evidence. Record the verdict, scores, disagreement and recommendation in the feature's brief and link it in the reading map above. The council advises; the head chef decides. Show the head chef the verdict and designs before changing the app. Small changes get the quick check, fixes none. Every pull request that changes the app has a `Verdict:` line (the Council check shows red without one, but never stops a merge).

Both rounds and small-change quick checks use the council skill's **Current design contracts** and **Design references**: Linear, Things 3, Airbnb, Todoist, Flighty, Duolingo and Headspace. Give every reviewer the relevant current contract excerpts, including surface and operational colour rules for visual work. Record contract fit, evidence, trade-offs and unresolved issues; approved choices win over app inspiration.

The Skeptic also runs the skill's **Try to break it** review; the Keeper checks technical failure and recovery. Record concrete failure scenarios, distinguish reproduced faults from untested risks, and carry unresolved findings into the recommendation and verification plan. Use isolated synthetic fixtures and keep security detail private.

**Service rules** (head chef, 5 Nov 2026). The book is used in a busy service: quick to read, few taps.
- The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
- No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
- Nothing appears over a list during service unless it stops a mistake.
- A change that adds taps or takes away visible lines says why it is worth it: count the taps for the main task and the lines on a 390 px phone, before and after.

## Whole-app audits

Read `docs/whole-app-audit.md` for the stack-specific audit, independent council, feature-preservation matrix, design comparisons, verification and rollback workflow.
Reconcile current PRs and approved designs first. Complete discovery and concrete design proposals before application changes; obtain the owner's choice before new layouts, navigation or capability removals.
After approval, implement small reversible units under the existing shipping rules. Distinguish source review, mocked browser checks, emulator checks and verified live behaviour; keep detailed findings in the linked records and private security evidence out of this public repo.

## Writing style (everything the team sees, and the code comments)
- No em dashes anywhere. Australian English, metric units, 24-hour time, Celsius, Australian kitchen terms.
- Plain, short sentences. Staff read this on the line.
- Only recipes, quantities, temperatures and times the head chef confirmed. Anything else goes in `[square brackets]` and shows as "To come".
- Times in messages to the head chef are Queensland time (Rockhampton, UTC+10, no daylight saving), 24-hour: "21:52", not "11:52 UTC". GitHub, workflow runs and tools report UTC, so add 10 hours before saying a time.

## Files
**Shell** below means: loaded by `index.html`, listed in `SHELL` in `sw.js` and in both lists in `js/upkeep.js` (a startup file missing from one of the three breaks the saved copy). **Lazy** means loaded by the page that needs it and in none of them. Each file's full row, with its notes and tests: `docs/session-map.md`.

- **Start:** `index.html` (the page and its security header), `js/boot.js` (first in `<head>`: the install offer, text size, the clock `LK_TIME`), `js/device.js` (device choice), `js/upkeep.js` (end of `<body>`: the 04:00 refresh, updates, the service worker), `sw.js` and `manifest.webmanifest` (the installable app and saved shell), `js/firebase-config.js`, `css/app.css`.
- **Recipes:** `js/data.js` (every recipe, the only file staff edit, field guide at the top), `js/overlay.js` (the head chef's changes laid over it), `js/art.js` (plates, pans and diagrams).
- **Shared, shell:** `js/amounts.js`, `js/learn.js`, `js/cutoffs.js`, `js/chime.js` (also run by node, before `js/prep.js`); `js/controls.js`, `js/motion.js`, `js/functions.js`; `js/seasonal/` with its css and `fonts/`.
- **Cooling, shell:** `js/cooling-core.js`, `js/cooling.js`, `js/cooling-ui.js`, `css/cooling.css` (see `docs/operandio-cooling.md`).
- **Main:** `js/app.js` (routing, top bar, recipe views and cards, settings), `js/prep.js` (prep, orders, wastage, guides, admin panel, staff lock, insights).
- **Lazy:** `js/manage.js` (`mountManage()` in `js/app.js`); `js/draw.js`, `js/library.js`, `js/lib/*.js`, then `js/smart.js`, `js/compose.js`; `js/suppliers.js`, `js/supplier-core.js`, `js/supplier-store.js` (an authorised chef only); `js/deliveries.js`; `js/fnedit.js`; `js/admin-dashboard.js`, `js/analysis-core.js`, `js/admin-intelligence.js`, `js/proofreader-admin.js` (from `js/prep.js`); `js/mascot.js` (`mascotSync()` in `js/app.js`).
- **Rules and tests:** `firestore.rules` (a template, see Never in this repo); `tests/` (click tests, with a stand-in for Firebase in `tests/fake/`), `tests/rules/` (the rules on the emulator).
- **Shipping:** `.github/workflows/publish-site.yml` with `scripts/site-changed.sh` (Publish site: only when the phones need it), `.github/workflows/pr-tests.yml` (Click tests), `auto-merge.yml` (the queue: `tests/auto-merge-queue.test.js` finds its step "Move the queue on by one" by name, so change the two together), `council-check.yml` and `scripts/council-check.mjs`, `flaky-report.yml`, `publish-rules.yml` with `scripts/publish-rules.sh`, `lock-probe.yml`, `live-tests.yml`; `scripts/guard-main.mjs` (the main-branch hook in `.claude/settings.json`), `scripts/sync-on-start.sh` (the session start hook there: brings a clean main checkout up to date with GitHub, only fetches anywhere else), `scripts/pre-merge.sh`, `.github/pull_request_template.md`.
- **Server jobs:** `nightly-learning.yml` and `scripts/nightly-*.mjs` (03:00: learning counts, summaries, the analysis, day digests, `teamsum/main`, each day's food safety count for Records with `scripts/records-core.mjs`; the phones never write learning counts), `nightly-backup.yml` (03:30, reads only), `cutoff-push.yml` and `scripts/cutoff-push.mjs` (every 10 minutes); one-off index jobs (`scripts/access-bootstrap.mjs`, `scripts/*-index.mjs`, proved by `scripts/*-check.mjs`: read the matching note first); `scripts/fold-recipes.mjs` (run it without `--write` first, never commit the Backup file).
- **Other:** `README.md` (the overview), `menu-survey.md` (the menus behind the drawing library, no prices), `icons/`, `icon.svg`, `qr.svg`, `qr.png`, `qr-sign.pdf`, `art/mascot/` (mascot sprite sheets and stills, never in the saved shell).
- **Codex, Antigravity and other agents:** `AGENTS.md` points each session here for the shared working rules.

## Routes
Supplier tools: `#/suppliers`, `#/suppliers/<id>`, `#/suppliers/manage`, `#/suppliers/<id>/manage`, `#/suppliers/cutoff/<cut-off id>/<date>`. Read `docs/supplier-workspace.md` before changing its data contract. The three supplier scripts load only for an authorised chef. Goods are private Firestore data, never static assets.

`#/` landing (the now and next board; signed out, the Recipes docket), `#/recipes` (Pass or Tiles), `#/r/<id>[/<id>...]` a recipe and the trail to it, `#/prep`, `#/orders`, `#/deliveries`, `#/waste`, `#/transfers`, `#/guides`, `#/guides/<id>`, `#/minutes`, `#/mail`, `#/drinks`, `#/todo` (the chef to-do list: head chef and sous chefs only), `#/team` (Today's team: shifts, sections and breaks; head chef and sous chefs set it), `#/chef` (Head chef / Sous chef panel: current canonical chef PIN role), `#/admin`, `#/settings`, `#/manage` (head chef, sous chefs and admin: the recipe list), `#/manage/r/<id>`, `#/manage/new`, `#/manage/new/<id>`, `#/manage/draw/<drawing id>`, `#/manage/draw/new/<recipe id>/<plate|pan|side|build>`, `#/fn` (functions: today and the next days), `#/fn/now` (the service view), `#/fn/<id>`, `#/functions` (function managers only), `#/functions/new`, `#/functions/<id>`.

## Ground rules (no exceptions)
These hold for every session, every message and every change, however small. A hook in `.claude/settings.json` (`scripts/guard-main.mjs`) refuses edits and commits on `main`, so a session that skips them is stopped.

1. **Every interaction starts on a new branch.** Before touching a file, make a worktree on a fresh branch from the latest `main`:
   `git fetch origin main && git worktree add -b <type>/<short-name> .claude/worktrees/<short-name> origin/main`
   and work only in that folder. Never edit in the main checkout, never commit to `main`, never push `main`. One theme per worktree, branch and pull request: unrelated changes get their own worktree. A session that already has a worktree keeps it for that theme only. A cloud session that is given a branch to work on (`ccr-...`) uses that branch instead of a new worktree, started from the latest `main`; everything else here still holds. On the Mac there is one copy of the repo: every tool (Claude, Codex, Antigravity) opens that folder and makes its worktrees under its `.claude/worktrees/`. Never clone the repo into another folder.
2. **Check what else is in flight before marking ready.** Run `scripts/pre-merge.sh` from the worktree. It lists the open pull requests with their state, every worktree with its branch and uncommitted changes, and whether `main` moved since the branch started. Only one merge at a time: the Auto-merge queue merges ready pull requests oldest first and brings `main` into one at a time (How changes ship, step 7). Without the queue, wait for a branch that is ready or merging, then bring the new `main` into yours once, let Click tests run again, and merge. Do not bring `main` in every time it moves (see Keeping usage down). Never remove or reset a worktree that is not yours.
3. **Clean handoffs.** A branch is handed over only when it is pushed, has a pull request that says what was done and what is left, the tests pass, and `README.md` is in step. After a squash merge: `git -C "<main checkout>" pull --ff-only origin main`, remove the worktree and delete the branch. In a cloud session the main checkout sits on the session branch: run `git reset --keep origin/main` there and `git branch -dr origin/<session branch>` once GitHub has deleted it, or the stop hook reports merged commits as unpushed (7 Nov 2026). Nothing is left half done on `main`, and nothing lives only in a worktree.

## How changes ship
1. Start as above: a worktree on its own branch from the latest `main`.
2. Test before pushing: `node --check` on changed JS, then the test files for what you changed: `cd tests && npm install && npm test -- <part of a file name>` (for example `npm test -- prep waste`). CI runs the whole suite on every pull request, so run it all locally only for a change that touches many pages (`js/prep.js` startup, `sw.js`, the security header). `npm test` with no names serves the repo locally and runs every file in `tests/` in Chrome: each page at 390, 768 and 1280 px (no sideways scroll, no JS errors) and the click paths for the prep pages, orders, wastage, minutes, admin and recipe search. Firebase is replaced by the stand-in in `tests/fake/`, so no real PIN or data is needed and nothing is written to the real book. In a cloud session, where Google Chrome is not installed, run them with `CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell npm test` (the folder name changes with the Playwright version: `ls /opt/pw-browsers`) (the full Chromium there no longer runs headless the way the tests start it). Add checks for the click paths you change to the matching `*.test.js` file (or a new one). The same tests run on GitHub on every pull request to `main` (the **Click tests** check, `.github/workflows/pr-tests.yml`); a pull request does not merge until it is green. After merging, `BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test` runs the same tests on the live site.
3. If `firestore.rules` changes: test it on the Firestore emulator first (`cd tests/rules && npm install && npm test`, and add a check for every new rule), publish it with the **Publish rules** workflow in the Actions tab (Run workflow; it fills the `KITCHEN_PIN` and `OWNER_EMAIL` secrets into a copy and deploys it with the service account), or from your own computer with `scripts/publish-rules.sh`, then merge the code that needs it. Publish rules before code that writes new fields or collections; publish after code when the rules get stricter about something old code does not send. Another pull request that merges after you published publishes `main`'s rules and drops your unmerged rule: bring `main` in and publish the merged rules again before yours merges (7 Nov 2026). Follow the authoritative feature contract when preparation and a compatible staged release require a more specific order.
4. After merging, wait for GitHub Pages (about a minute), then check the live site. **Publish site** republishes only when the merge changes a file the phones load (`docs/site-publishing.md`); notes, tests, scripts and workflows alone do not, so no phone is asked to update. The **Live click tests** workflow runs the click tests against the live site by itself after each publish (and from the Actions tab); read its result.
5. Keep `README.md` in step with every change: the overview there, the detail in `docs/prep-book.md` or the feature's note, a decision in `docs/head-chef-decisions.md`.
6. Before marking it ready, run `scripts/pre-merge.sh` and follow the ground rules above.
7. **Ready means merge in the next release window** (head chef, 4 Nov 2026; windows 5 Nov 2026, `docs/auto-merge.md`). Work in progress is a draft. Mark a pull request ready only when it is finished, its tests pass and `README.md` is in step: the Auto-merge workflow then merges it once Click tests pass, in a release window (15:00 to 16:30 or 22:30 to 02:30, Queensland time), bringing `main` in one pull request at a time. A fix the kitchen needs now gets the `urgent` label and merges when green. A run of the workflow by hand with Release now opens the window for 30 minutes, and a waiting run opens each window even when GitHub skips the timed runs (6 Nov 2026). Do not merge it or bring `main` in yourself; fix a conflict or failed check, which the queue skips. A pull request that stays `UNKNOWN` because GitHub missed its last push (the branch has a newer commit than the pull request shows; #516 and #520 on 4 Nov 2026) is skipped too: push once more. Anything that is the head chef's call stays a draft or gets the `hold` label. The publish order in step 3 still applies. Then do step 4 and report the live result. Until the `AUTOMERGE_TOKEN` secret is set (the workflow prints a notice), the session merges as before (head chef, 21 Oct 2026) when its user has asked.

## Keeping usage down (3 Nov 2026)
Measured on 2 and 3 November 2026: most of the cost was repeated test runs and reading big files, not the work. The numbers and the reason for each rule: `docs/keeping-usage-down.md`.
- **Read big files in parts.** `docs/prep-book.md` (about 290 KB), `README.md` (about 100 KB) and the audit notes: search (Grep), then read that part only. Never read one whole.
- **Keep this file short** (8 Nov 2026). It loads in every session and every agent. A new note or file gets one short row here; the detail goes in `docs/session-map.md` or its own note.
- **Let the queue bring `main` in.** Merge `main` in yourself only to fix a conflict, once.
- **Push when the work is finished.** Each push cancels the running Click tests and starts again.
- **Every merge that changes the book costs the kitchen's reads** (5 Nov 2026): each phone offers an update and reloads. Group small changes to one page in one pull request. A merge of notes, tests or workflows alone is not republished (13 Nov 2026).
- **Wait without spending.** One check-in per pull request (about 50 minutes, then 4 hours). Do not poll, do not re-read a pull request that has not changed, do not reply to a notice that needs nothing.
- **A timing failure is not your bug until it repeats.** Read the failing test's name first. Re-run once; if it fails again, say so in the pull request and fix it in its own pull request.
- **Agents only where they pay.** Parallel agents for the service council (once per major decision) and wide audits. Do a lookup, a single file or a known fix yourself.
- **Few sessions at once.** Three or four open pull requests merge smoothly; eight make each other run Click tests again and again.
- **Keep "Require branches to be up to date before merging" on** (head chef, 4 Nov 2026).
- **Ready means merge in the next release window.** Mark it ready when it is finished and stop. `urgent` is for a fix the kitchen needs now, not to skip the wait.

## Commits and pull requests
- The title says what changes for the team, in plain words: "Recipes opens faster and taps answer at once", not "Refactor backHome".
- The body says why first, with measured numbers when there are any (times, sizes, counts), then one line per file or part changed, then the tests added or changed.
- Same writing style as everything else: no em dashes, short sentences.
- `.github/pull_request_template.md` holds the sections every pull request fills in (why, council, what changes for the team, files, tests, reads and rules, rollback). Open work in progress as a draft.
- Branch names: `feat/`, `fix/`, `docs/`, `ci/`, `ux/` plus a short name, or the `claude/...` name the app gives a session. One owner per worktree: a session works only in the worktree it made or was given.

## Rollback, dependencies and secrets
- **Undo a bad merge** with `git revert <merge commit>` on a new branch and its own pull request, never a force push to `main`. Pages redeploys in about a minute and every phone picks the old code up through the update check (README, Good to know). Saved data is not rolled back by a revert: if the change wrote new fields, say in the pull request whether old code ignores them. For saved-shell storage changes, follow `docs/saved-shell-generations.md`: retain compatible generation metadata and the last good copy; never blindly restore the legacy worker.
- **Rules repair and rollback** follow `docs/private-kitchen-access.md`, `docs/device-sessions.md` and `docs/staff-capabilities.md`. Retain canonical capability lists, booking effects and current session/grant enforcement. Do not restore client-only capability checks or raw Google operational access as a workaround. Use the reviewed compatible rules publication procedure and verify the foundation and live Lock probe separately; read `docs/rules-publication.md`.
- **Big look changes** keep a baseline first: a git tag on `main` (like `usability-baseline-2026-10-20`) and `tests/shots-baseline*/` (ignored by git), so the old look can be compared and restored.
- **Dependencies:** the book itself has none to install. `tests/`, `tests/rules/` and `scripts/` have package manifests and lockfiles for browser checks, rules checks and server jobs; change a version in its own pull request with the relevant checks and full required test gate. A new outside script, font or service also needs the security header in `index.html` and is a head chef decision.
- **Secrets** (`FIREBASE_SA`, `KITCHEN_PIN`, `OWNER_EMAIL`, `BACKUP_KEY`) live only in GitHub Actions secrets and the Firebase console. Never print them in a workflow log, a test, a screenshot or a pull request.
- **Audit notes with security findings** stay out of this public repo: keep them untracked in their worktree or in a private artifact, and put only the fixes in pull requests.

## What GitHub enforces (checked 22 Oct 2026)
Full detail, with how the Click tests job is split and retried: `docs/keeping-usage-down.md` (What GitHub enforces).
- `main` is protected: **Click tests** must pass and the branch must be up to date with `main`; force pushes and deleting `main` are refused. Reviews are not required, and the protection does not apply to admins.
- A pull request that changes only `*.md` files or files under `docs/` passes after the parse check in about a minute. Do not put anything the book loads or a test reads under `docs/`.
- A failed test file runs once more on its own. When a run fails, read its annotations or summary first, not the whole log.

## Things that are easy to break
**Before changing any code, read `docs/easy-to-break.md`**: one short warning per part of the book (tests, sheets, the saved shell, lazy pages, recipes and drawings, functions, the admin panel, the prep list, the top bar, transfers). Each part's full contract is its section in `docs/code-contracts.md` or the feature note in the table above. The ones that bite most:
- **One clock.** Anything saved, or compared with a saved time, uses `now()` (`LK_TIME.now()` outside `js/prep.js`). Today's date, hours and weekdays use `dayNow()` and `T.*` (Queensland). Never `new Date()` or `Date.now()` for those. Do not name a local variable `now` or `dayNow`.
- **Writes.** Every write goes through `W()` in `js/prep.js`; the rules refuse a direct `setDoc`. Ask `canW()`, never `S.tok`.
- **Security header.** `index.html` lists every outside service the book may load; a new one is a head chef decision. Inline `<script>` and `onclick=` do not run.
- **No new listeners or polling.** Listeners are only for today's live data.
- **Saved shell.** Every startup file is in `SHELL` and both `js/upkeep.js` lists; lazy pages are not. Read `docs/saved-shell-generations.md` before touching `sw.js`.
- **After the tap.** Every action answers in its own frame and says what it did, by name (`docs/action-feedback.md`).
- **One name, one meaning.** A top-level function or var name used twice in one file silently replaces the first: search before naming.
- **Sheets and popups** go on `document.body`, one at a time through `sheetBusy()` and `sheetNext()`.
- **Held-back pages.** Any new link, card or read for guides, pings, minutes or cleaning checks `featOn()`.
- **Test helpers.** `L.waitFor`, not `page.waitForFunction`; `L.settle(p, ms)`, not `p.waitForTimeout(ms)`.

## Changes that went wrong before (28 Oct 2026)
Each rule is a bug the book shipped and then fixed. The story and the pull request numbers: `docs/easy-to-break.md`. Check your change against them before the pull request.
- **Walk every role through the change.** List every read and write the page makes and run each through each role on the emulator. Add a row to `tests/rules/client-shapes.test.mjs` for a new call; `tests/roles.test.js` opens each page as each role.
- **A merge keeps what is stored.** Test a second writer after the first. `W()` always sends `by`.
- **An answer from the cache is not "nothing there".** Never read an offline or pending answer as an empty list, never save it, never write from it. Every reload path goes through `lkServerUp()`.
- **Never guess, never save nothing.** No match, or more than one: show a card that says so. A Save with nothing to save is off, and `save()` refuses it too.
- **Prove the fix fails first.** A fix adds the check that fails on the old code, and the pull request says so.
- **Say which way rules change.** Looser (publish before the client) or stricter (publish after), which role each check covers, and that the Lock probe passes after publishing.
- **Decisions move, so does this file.** When a decision or a `docs/` note supersedes a line here, change the line in the same pull request.

## Coding rules (22 Oct 2026)
**Before writing code, read `docs/coding-rules.md`** (reads, saved copies on the phone, who sees what, text on screen, forms, screens, loading). The rules hold for every file, old and new. When you touch code that breaks one, bring it in line in the same branch if it is small, otherwise add it to "Bringing the code in line" in `docs/open-work.md`; older code listed there is not a pattern to copy. In short:
- **One helper per job:** use the one that exists (`esc()`, `W()`, `dayCache()`, `lvHTML()`, `now()`, `dayNow()`, `LK_RX.clean()`), never write a second.
- **Reads.** The free plan stops the book for the day at 50,000 reads. Every new read says in a comment when it runs and what it costs. No reads in a loop. A listener is only for today's live data; the rest is read once a day and kept with `dayCache()`. `tests/read-budget.test.js` holds the budget: read less, or raise it in the same pull request with the reason.
- **Saved copies** say what makes them out of date, and are saved only when every part came in. A change to a past day calls `markPast()`.
- **Who sees what.** Anything staff must not see is locked in `firestore.rules`, not only hidden on screen. Staff pages show today.
- **Text on screen.** Everything typed by a person or read from Firestore goes through `esc()`, attributes included. A value placed in a `style`, an SVG attribute or a URL is checked by type first. SVG goes through `LK_RX.clean()` every time it is drawn. A new field that others see gets a line in `tests/safe-text.test.js`.
- **Screens.** Build from `docs/design-patterns.md`; a new look is the head chef's call. Pages work at 390, 768 and 1280 px with no sideways scroll.
- **Loading.** The start loads only what the landing page and the prep pages need. Measure before moving anything out of the start.

## Head chef decisions
Dated decisions about how the book should work (who may do what, what moved where) are in `docs/head-chef-decisions.md`, newest first. Check there before changing who sees or writes something, and add a new decision there with its date.

## Skills
The `leichhardt-recipe-book` and `leichhardt-kitchen-book-backend` skills summarise this repo. When they and this file or `README.md` disagree, this file and `README.md` win; mention the difference so the skill can be updated.

## Open items
`docs/open-work.md`, "Open items", lists what is still to do with the head chef (folding the head chef's recipe changes into `js/data.js` from a Backup; App Check is enforced and the Browser key restricted since 22 Oct 2026). Read it when the head chef asks what is left, keep it in step, and remove items as they are done. "Bringing the code in line" in the same file lists the older code that does not meet the coding rules yet, in the order to fix it; each item is its own branch and pull request.
