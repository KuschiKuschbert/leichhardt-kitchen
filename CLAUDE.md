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
| Proposed named staff welcome and whole-app personalisation audit | `docs/staff-personalisation-options/brief.md` (designs only, no selected implementation) |
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
| Head chef / sous chef panel, chosen dedicated admin-style panel | `docs/chef-panel-options/brief.md` (Chosen implementation, permissions, reads and verification) |
| Prep, Orders, Wastage, Transfers and the chef hat; who did a Prep line on a shared screen | `docs/work-pages-design-options/brief.md`, `docs/shared-prep-attribution.md` |
| Head-set section minimums, Prep room, smart matching and Before service | `docs/prep-standards.md`, `docs/prep-par-options/brief.md` |
| Today's team and its chosen notebook, council and build record | `docs/todays-team-options/brief.md`, `docs/team-notebook-options/brief.md` (Chosen, Build, council), `docs/prep-book.md` (Today's team) |
| Planning staff sections ahead, dated drafts, week picker and read costs | `docs/team-week-options/brief.md` (chosen A, implementation and verification) |
| Today's team person worksheet, single roster and per-person details | `docs/team-tidy-options/brief.md` (current choice C, historical A checks and current verification) |
| Cleaning page, ordered pack down, repeat schedule, checks, Pass verification and team release | `docs/cleaning-schedule.md`, `docs/cleaning-options/brief.md` (chosen C + A), `docs/cleaning-options/implementation.md`, `docs/cleaning-options/release-toggle.md`; keep unbranded templates in `js/cleaning-schedule.js`, separate from history; anchored intervals must agree in client and rules |
| Compact Cleaning management, chosen M1 groups and responsive repeat-task editor | `docs/cleaning-chef-options/implementation.md` (contract and current verification), `docs/cleaning-chef-options/brief.md` (designs and council) |
| Chef to-do notebook layout | `docs/chef-todo-options/brief.md` (Chosen, implementation contract) |
| Drinks run notebook style | `docs/drinks-notebook.md`, `docs/code-contracts.md` (Drinks run) |
| Recipe amounts, the recipe and drawing editor, the drawing studio, smoker batches | `docs/recipe-multiplier.md`, `docs/recipe-editor-options/brief.md`, `docs/studio-options/brief.md`, `docs/smoker-batches.md` |
| Suppliers, order cut-offs, the supplier order and Delivery received | `docs/supplier-workspace.md`, `docs/cutoff-options/brief.md`, `docs/receiving-design-options/brief.md`, `docs/delivery-received.md`; chosen Latest/Earlier purchase labels: `docs/supplier-last-order-status-options/brief.md` |
| Wastage history and CSV reports | `docs/wastage-history.md`, `docs/report-exports.md` |
| Transfer storage and returns | `docs/transfer-returns.md` (publish rules from the feature branch first: it indexes loans) |
| Functions: cancel, Undo, delete, print | `docs/function-cancellation.md`, `docs/function-printing.md` |
| Operandio cooling: B desktop pill, fixed mobile ring, manual 2-hour/4-hour stages, completion lockout until next midnight, three-chime alerts | `docs/operandio-cooling.md`, `docs/operandio-cooling-options/brief.md` |
| Operandio clock motion: chosen B desktop pill and fixed mobile ring, implementation and release checks | `docs/operandio-clock-motion-options/brief.md` |
| Pings: who gets them, the sound | `docs/ping-recipients.md`, `docs/ping-sound.md` |
| Back arrow and page trail | `docs/navigation.md` |
| Merging, the queue, `urgent` | `docs/auto-merge.md` |
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
- **Lazy:** `js/manage.js` (`mountManage()` in `js/app.js`); `js/draw.js`, `js/library.js`, `js/lib/*.js`, then `js/smart.js`, `js/compose.js`; `js/suppliers.js`, `js/supplier-core.js`, `js/supplier-store.js` (an authorised chef only); `js/deliveries.js`; `js/fnedit.js`; `js/admin-dashboard.js`, `js/analysis-core.js`, `js/admin-intelligence.js`, `js/proofreader-admin.js` (from `js/prep.js`).
- **Rules and tests:** `firestore.rules` (a template, see Never in this repo); `tests/` (click tests, with a stand-in for Firebase in `tests/fake/`), `tests/rules/` (the rules on the emulator).
- **Shipping:** `.github/workflows/pr-tests.yml` (Click tests), `auto-merge.yml` (the queue: `tests/auto-merge-queue.test.js` finds its step "Move the queue on by one" by name, so change the two together), `council-check.yml` and `scripts/council-check.mjs`, `flaky-report.yml`, `publish-rules.yml` with `scripts/publish-rules.sh`, `lock-probe.yml`, `live-tests.yml`; `scripts/guard-main.mjs` (the main-branch hook in `.claude/settings.json`), `scripts/pre-merge.sh`, `.github/pull_request_template.md`.
- **Server jobs:** `nightly-learning.yml` and `scripts/nightly-*.mjs` (03:00: learning counts, summaries, the analysis, day digests, `teamsum/main`; the phones never write learning counts), `nightly-backup.yml` (03:30, reads only), `cutoff-push.yml` and `scripts/cutoff-push.mjs` (every 10 minutes); one-off index jobs (`scripts/access-bootstrap.mjs`, `scripts/*-index.mjs`, proved by `scripts/*-check.mjs`: read the matching note first); `scripts/fold-recipes.mjs` (run it without `--write` first, never commit the Backup file); `scripts/session-check.mjs` (legacy).
- **Other:** `README.md` (the overview), `menu-survey.md` (the menus behind the drawing library, no prices), `icons/`, `icon.svg`, `qr.svg`, `qr.png`, `qr-sign.pdf`.
- **Codex:** `AGENTS.md` points each session here for the shared working rules.

## Routes
Supplier tools: `#/suppliers`, `#/suppliers/<id>`, `#/suppliers/manage`, `#/suppliers/<id>/manage`, `#/suppliers/cutoff/<cut-off id>/<date>`. Read `docs/supplier-workspace.md` before changing its data contract. The three supplier scripts load only for an authorised chef. Goods are private Firestore data, never static assets.

`#/` landing (the now and next board; signed out, the Recipes docket), `#/recipes` (Pass or Tiles), `#/r/<id>[/<id>...]` a recipe and the trail to it, `#/prep`, `#/orders`, `#/deliveries`, `#/waste`, `#/transfers`, `#/guides`, `#/guides/<id>`, `#/minutes`, `#/mail`, `#/drinks`, `#/todo` (the chef to-do list: head chef and sous chefs only), `#/team` (Today's team: shifts, sections and breaks; head chef and sous chefs set it), `#/chef` (Head chef / Sous chef panel: current canonical chef PIN role), `#/admin`, `#/settings`, `#/manage` (head chef, sous chefs and admin: the recipe list), `#/manage/r/<id>`, `#/manage/new`, `#/manage/new/<id>`, `#/manage/draw/<drawing id>`, `#/manage/draw/new/<recipe id>/<plate|pan|side|build>`, `#/fn` (functions: today and the next days), `#/fn/now` (the service view), `#/fn/<id>`, `#/functions` (function managers only), `#/functions/new`, `#/functions/<id>`.

## Ground rules (no exceptions)
These hold for every session, every message and every change, however small. A hook in `.claude/settings.json` (`scripts/guard-main.mjs`) refuses edits and commits on `main`, so a session that skips them is stopped.

1. **Every interaction starts on a new branch.** Before touching a file, make a worktree on a fresh branch from the latest `main`:
   `git fetch origin main && git worktree add -b <type>/<short-name> .claude/worktrees/<short-name> origin/main`
   and work only in that folder. Never edit in the main checkout, never commit to `main`, never push `main`. One theme per worktree, branch and pull request: unrelated changes get their own worktree. A session that already has a worktree keeps it for that theme only. A cloud session that is given a branch to work on (`ccr-...`) uses that branch instead of a new worktree, started from the latest `main`; everything else here still holds.
2. **Check what else is in flight before marking ready.** Run `scripts/pre-merge.sh` from the worktree. It lists the open pull requests with their state, every worktree with its branch and uncommitted changes, and whether `main` moved since the branch started. Only one merge at a time: the Auto-merge queue merges ready pull requests oldest first and brings `main` into one at a time (How changes ship, step 7). Without the queue, wait for a branch that is ready or merging, then bring the new `main` into yours once, let Click tests run again, and merge. Do not bring `main` in every time it moves (see Keeping usage down). Never remove or reset a worktree that is not yours.
3. **Clean handoffs.** A branch is handed over only when it is pushed, has a pull request that says what was done and what is left, the tests pass, and `README.md` is in step. After a squash merge: `git -C "<main checkout>" pull --ff-only origin main`, remove the worktree and delete the branch. In a cloud session the main checkout sits on the session branch: run `git reset --keep origin/main` there and `git branch -dr origin/<session branch>` once GitHub has deleted it, or the stop hook reports merged commits as unpushed (7 Nov 2026). Nothing is left half done on `main`, and nothing lives only in a worktree.

## How changes ship
1. Start as above: a worktree on its own branch from the latest `main`.
2. Test before pushing: `node --check` on changed JS, then the test files for what you changed: `cd tests && npm install && npm test -- <part of a file name>` (for example `npm test -- prep waste`). CI runs the whole suite on every pull request, so run it all locally only for a change that touches many pages (`js/prep.js` startup, `sw.js`, the security header). `npm test` with no names serves the repo locally and runs every file in `tests/` in Chrome: each page at 390, 768 and 1280 px (no sideways scroll, no JS errors) and the click paths for the prep pages, orders, wastage, minutes, admin and recipe search. Firebase is replaced by the stand-in in `tests/fake/`, so no real PIN or data is needed and nothing is written to the real book. In a cloud session, where Google Chrome is not installed, run them with `CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell npm test` (the folder name changes with the Playwright version: `ls /opt/pw-browsers`) (the full Chromium there no longer runs headless the way the tests start it). Add checks for the click paths you change to the matching `*.test.js` file (or a new one). The same tests run on GitHub on every pull request to `main` (the **Click tests** check, `.github/workflows/pr-tests.yml`); a pull request does not merge until it is green. After merging, `BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test` runs the same tests on the live site.
3. If `firestore.rules` changes: test it on the Firestore emulator first (`cd tests/rules && npm install && npm test`, and add a check for every new rule), publish it with the **Publish rules** workflow in the Actions tab (Run workflow; it fills the `KITCHEN_PIN` and `OWNER_EMAIL` secrets into a copy and deploys it with the service account), or from your own computer with `scripts/publish-rules.sh`, then merge the code that needs it. Publish rules before code that writes new fields or collections; publish after code when the rules get stricter about something old code does not send. Another pull request that merges after you published publishes `main`'s rules and drops your unmerged rule: bring `main` in and publish the merged rules again before yours merges (7 Nov 2026). Follow the authoritative feature contract when preparation and a compatible staged release require a more specific order.
4. After merging, wait for GitHub Pages (about a minute), then check the live site. The **Live click tests** workflow runs the click tests against the live site by itself after each Pages deploy (and from the Actions tab); read its result.
5. Keep `README.md` in step with every change: the overview there, the detail in `docs/prep-book.md` or the feature's note, a decision in `docs/head-chef-decisions.md`.
6. Before marking it ready, run `scripts/pre-merge.sh` and follow the ground rules above.
7. **Ready means merge in the next release window** (head chef, 4 Nov 2026; windows 5 Nov 2026, `docs/auto-merge.md`). Work in progress is a draft. Mark a pull request ready only when it is finished, its tests pass and `README.md` is in step: the Auto-merge workflow then merges it once Click tests pass, in a release window (15:00 to 16:30 or 22:30 to 02:30, Queensland time), bringing `main` in one pull request at a time. A fix the kitchen needs now gets the `urgent` label and merges when green. A run of the workflow by hand with Release now opens the window for 30 minutes, and a waiting run opens each window even when GitHub skips the timed runs (6 Nov 2026). Do not merge it or bring `main` in yourself; fix a conflict or failed check, which the queue skips. A pull request that stays `UNKNOWN` because GitHub missed its last push (the branch has a newer commit than the pull request shows; #516 and #520 on 4 Nov 2026) is skipped too: push once more. Anything that is the head chef's call stays a draft or gets the `hold` label. The publish order in step 3 still applies. Then do step 4 and report the live result. Until the `AUTOMERGE_TOKEN` secret is set (the workflow prints a notice), the session merges as before (head chef, 21 Oct 2026) when its user has asked.

## Keeping usage down (3 Nov 2026)
Measured on 2 and 3 November 2026: about 45 pull requests in two days, 100 Click tests runs at 20 minutes each (33 hours of runner time; 21 cancelled by a newer push, 16 failed on timing), and 52 "merge `main` into the branch" commits across 40 pull requests. Most of the cost was repeated test runs and reading big files, not the work itself.
- **Read big files in parts.** `docs/prep-book.md` is about 290 KB, `README.md` about 120 KB, and `docs/ux-council-audit.md`, `docs/whole-app-audit.md` and `docs/whole-app-inventory.md` are 30 to 72 KB each. Never read one whole: search for the heading or word you need (Grep), then read that part only. The audit notes are for audit work only.
- **Keep this file short** (8 Nov 2026). It loads in every session and every agent, so every 4 KB here costs about 1,000 tokens each time. A new note or file gets one short row here; its dates, the design chosen, its tests and the detail go in `docs/session-map.md` or its own note.
- **Let the queue bring `main` in.** It updates one ready pull request at a time (How changes ship, step 7). Merge `main` in yourself only to fix a conflict, once. Every merge of `main` starts another Click tests run (about 6 minutes on five runners); with several sessions open that multiplies.
- **Push when the work is finished.** Each push cancels the running Click tests and starts again. Make the fixes, run the files you changed (How changes ship, step 2), then push once.
- **Every merge costs the kitchen's reads** (5 Nov 2026). A new version reloads the screens left open (at most once an hour) and every phone that comes back, and each reload reads its lists again. 48 merges in a day helped use up the free 50,000 reads by 13:00. Group small changes to one page in one pull request. Since 5 Nov 2026 ready pull requests merge only in the two release windows (`docs/auto-merge.md`).
- **Wait without spending.** One check-in per pull request (about 50 minutes, then 4 hours). Do not poll, do not re-read a pull request that has not changed, and do not reply to a notice that needs nothing.
- **A timing failure is not your bug until it repeats.** When Click tests fails on a test your change does not touch, read the failing test's name first. Re-run once; if it fails again, or a different timing test fails, say so in the pull request and fix it in its own pull request.
- **Agents only where they pay.** Use parallel agents for the service council (once per major decision, not per push) and wide audits. Do a lookup, a single file or a known fix yourself.
- **Few sessions at once.** Three or four open pull requests merge smoothly; eight make each other run Click tests again and again. Group small changes to one page in one pull request when they share the same files.
- **Keep "Require branches to be up to date before merging" on** (head chef, 4 Nov 2026). `main` goes straight to the phones, so every pull request is tested against the exact `main` it joins; two that pass alone can still break together. Cut the catch-up cost with fewer sessions and the queue bringing `main` in one pull request at a time, not by turning the setting off. A merge queue would remove the waiting but needs an organisation-owned repository.
- **Ready means merge in the next release window.** Mark a pull request ready when it is finished and stop: the Auto-merge workflow merges it in the next window and brings `main` in one at a time (How changes ship, step 7). No waiting, no polling for the merge. `urgent` is for a fix the kitchen needs now, not to skip the wait.

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
- `main` is protected: the **Click tests** check must pass and the branch must be up to date with `main`; force pushes and deleting `main` are refused.
- Not enforced by GitHub: reviews (none required, Claude merges by the head chef's decision of 21 Oct 2026), and the protection does not apply to admins. The main-branch guard hook (`scripts/guard-main.mjs`) stops Claude Code sessions from working on `main`; a person with admin rights can still push to it.
- The **Click tests** job checks `js/*.js`, `js/lib/*.js` and `sw.js` parse, runs the click tests, then the rules checks on the Firestore emulator (`tests/rules`) and the nightly learning check (`scripts/emulator-check.mjs`), since 22 Oct 2026. A pull request that changes only `*.md` files or files under `docs/` passes after the parse check in about a minute (3 Nov 2026); do not put anything the book loads or a test reads under `docs/`. Since 4 Nov 2026 the browser files run in five shares of equal work on five runners at once (by `tests/timings.json`, longest files first; refresh it with `UPDATE_TIMINGS=1` when one share is clearly slower), with the rules beside them, about 5 to 6 minutes instead of 25. A file that takes longer than any share runs in parts beside itself (`offline-writes.test.js` and its `-2`, `-3` files, 4 Nov 2026); the job named **Click tests** collects them. A file still running after 10 minutes is stopped and counted as failed (`FILE_TIMEOUT`, 4 Nov 2026), so a hang no longer holds a runner to its 30 minute limit. A failed file runs once more on its own: a pass then shows as a "passed on retry" warning, and the same file passing on retry twice is a bug for its own pull request: the weekly issue "Click tests that needed a second try" (`scripts/flaky-report.mjs`) lists them, marked Yes. When a run fails, read its annotations or summary first (`gh api repos/<owner>/<repo>/check-runs/<id>/annotations`), not the whole log.

## Things that are easy to break
Short warnings. The full contract for each part is its section in `docs/code-contracts.md` (or the feature note in the table above): read it before you change that part.
- **One clock.** Anything saved, or compared with a saved time, uses `now()` (`LK_TIME.now()` outside `js/prep.js`). Today's date, hours and weekdays use `dayNow()` and `T.day`, `T.hour`, `T.mins`, `T.dow`, `T.clock`, `T.at` (Queensland). Never `new Date()` or `Date.now()` for those; `Date.now()` is only for time passing on the phone. Do not name a local variable `now` or `dayNow`.
- **Writes.** Every write goes through `W()` in `js/prep.js`; the rules refuse a direct `setDoc`. Ask `canW()`, never `S.tok`. PIN tries are one every 20 seconds per person, so a test that types two PINs for one person waits 21 seconds.
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
- **Functions.** Phone and email live only in `fncontact`. `first`, `last`, `from`, `until` and `kq` come from `derive()`. Keep rule checks on `functions` cheap and test the largest booking (12 lines, 8 rounds) on the emulator.
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

## Coding rules (22 Oct 2026)
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

## Head chef decisions
Dated decisions about how the book should work (who may do what, what moved where) are in `docs/head-chef-decisions.md`, newest first. Check there before changing who sees or writes something, and add a new decision there with its date.

## Skills
The `leichhardt-recipe-book` and `leichhardt-kitchen-book-backend` skills summarise this repo. When they and this file or `README.md` disagree, this file and `README.md` win; mention the difference so the skill can be updated.

## Open items
`docs/open-work.md`, "Open items", lists what is still to do with the head chef (folding the head chef's recipe changes into `js/data.js` from a Backup; App Check is enforced and the Browser key restricted since 22 Oct 2026). Read it when the head chef asks what is left, keep it in step, and remove items as they are done. "Bringing the code in line" in the same file lists the older code that does not meet the coding rules yet, in the order to fix it; each item is its own branch and pull request.
