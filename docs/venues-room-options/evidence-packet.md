# Evidence packet: a Venues room in the owner's admin panel

19 November 2026, Queensland. Source commit: `main` at 086c033. Role-based analysis, not research with staff.

Read in full: [proposal.md](proposal.md), this packet, the **Current contracts (excerpts)** section of [the second venue evidence packet](../second-venue-options/evidence-packet.md) (access, devices, design patterns, colour, after the tap, loading, coding rules, never in the repo, shipping), the **Round 1**, **Recommendation** and **Chosen** sections of [the second venue brief](../second-venue-options/brief.md), and `.claude/skills/service-council/SKILL.md` sections **The service rules**, **Current design contracts**, **Design references** and **Try to break it**.

## Screenshots (Implemented app, stand-in, commit 086c033)

- `docs/second-venue-options/baseline-admin-kitchen-1280.png`: the admin panel at 1280 x 900: the dark rail with Find, Inbox, Dashboard, then the rooms Today, Reports, Team, Kitchen, Prep; the Kitchen room's tabs and its Overview rows.
- `docs/second-venue-options/mix-inbox-390.png` and `mix-setup-1280.png`: the chosen mix for a venue head chef (Inbox row, Getting started rows).

## Current contracts that bear on the room (excerpts)

**Admin rooms** (`js/prep.js`, `A_GROUPS`): Today (inbox, dashboard, overview, references, proofreader, mail), Reports, Team (people, plan), Kitchen (kitchen-home, cutoffs, suppliers, notes, minutes, guides, reference-records, tools), Prep (prep-standards). `docs/design-patterns.md`, Admin: "A role panel uses panelShellHTML() for the owner's and chefs' same ad-admin/ad-layout shell, rail, heading, tabs and a-pane." "A new thing that needs the head chef is a row there [the Inbox], not a new page." "A row that opens another page is an a.c-tool ... the page's name, one sentence ... and Open ›." "The laptop rail is dark: Find, the Inbox with its count and the Dashboard, then the four rooms. On a phone Find sits in the page heading and the rooms stay one row."

**Admin identity** (`firestore.rules`, `adminSession()`): today an admin session is the owner's Google identity plus the canonical head chef's PIN session (`s.by == headId`) and a matching device grant. The chosen second venue model adds a second admin (the owner at every venue): a rules change not built yet.

**Secrets and publishing** (`CLAUDE.md`, Rollback, dependencies and secrets; `docs/rules-publication.md`): `FIREBASE_SA`, `KITCHEN_PIN`, `OWNER_EMAIL`, `BACKUP_KEY` "live only in GitHub Actions secrets and the Firebase console. Never print them in a workflow log, a test, a screenshot or a pull request." Rules are a template filled at publish time by the **Publish rules** workflow; the **Lock probe** checks live rules. "Publish rules before code that writes new fields or collections; publish after code when the rules get stricter."

**Server jobs**: `nightly-learning.yml` (03:00), `nightly-backup.yml` (03:30, reads only; reuses the newest successful run's file without checking its project: a round 1 finding), `cutoff-push.yml` (every 10 minutes), `lock-probe.yml`, `live-tests.yml`, `publish-site.yml`, `publish-rules.yml`, `prep-minimums.yml`. All point at one project today (`js/firebase-config.js`: `projectId: 'leichhardt-kitchen'`).

**Reads** (`CLAUDE.md`, Coding rules): the free plan stops a project's book for the day at 50,000 reads; every new read says when it runs and what it costs; no new listeners or polling; `tests/read-budget.test.js` holds the budget.

**Shipping** (`CLAUDE.md`, How changes ship): one merge that changes a file the phones load republishes the site; release windows 15:00 to 16:30 and 22:30 to 09:30 Queensland; ready means merge in the next window.

## Not evidenced (to confirm before round 2 builds on it)

- Whether a GitHub Actions job can create a Firebase project and its App Check site key without a Google Cloud organisation.
- Google's project limit for the owner's account.
- Whether Firestore's free daily reads apply only to one database per project.
- Several Firebase Hosting sites in one project, each its own origin (documented by Firebase; not tried here).
