# Cleaning implementation

8 November 2026. The head chef approved C's grouped daily list with A's chef week review after the [three designs and council](brief.md), and asked to match the existing app's style and fonts exactly.

## Behaviour and design

**Admin release switch (8 November 2026):** Cleaning starts off for staff, leads and view-only accounts until the verified admin enables it in Kitchen → Overview → Pages staff see. Head and sous chefs retain setup access. The server applies the same gate. See [the release-switch contract](release-toggle.md).

When enabled, `#/cleaning` occupies the sixth navigation slot and appears under Every day in the hat. Canonical chefs retain those links during setup. Guides is in **chef hat → More**, with its existing feature and access checks; guide links from recipes and search remain. The existing chef panel is retained.

The page uses the existing shell, Barlow body, Barlow Condensed headings, Caveat task handwriting, notebook rows, tick artwork, shared worker sheet, controls, colours and save feedback. Today groups jobs by responsible section, with shared kitchen jobs visible. Chefs switch to a weekly matrix on wide screens or a day list on phones. Completed jobs show the worker and time. A personal phone records its signed-in person; a shared screen asks **Who did this?** and also retains the authenticated recorder.

Head and sous chefs set the actual tasks, responsible section or shared kitchen, area, repeat weekdays and optional existing guide. Coldroom, freezer, dry store, oven, fryers, behind equipment, pass and shelves are area suggestions. No example jobs, people or repeat schedule are seeded. The first implementation has one occurrence per Queensland calendar day; lunch/close splits are not configured.

New tasks start today. Edits and archives start tomorrow; today's and past expected jobs retain their original wording, area, ownership and weekdays. Week cells distinguish done, missed, future due and not due. Only today can be ticked. Undo belongs to the authenticated recorder for two minutes and preserves the previous stamp for audit. No second sign-off, backdating, automatic completion or carry-forward is added.

## Data and permissions

`js/cleaning.js` is lazy, with API version 1, and is absent from the saved shell lists. `P.cleaning()` in `js/prep.js` shares the existing clock, canonical roles, `W()` writer, pending writes and device lifecycle.

- `cleaningTasks/<revisionId>` stores immutable task fields plus `root`, `prev`, `next`, `from`, `until`, `at`, and `by`. Closing a revision and creating its successor is one atomic batch, with a two-way link to forbid competing successors. A correction of tomorrow's scheduled revision can close its interval at zero length without rewriting history.
- `cleaningDone/<YYYY-MM-DD>_<revisionId>` stores `day`, `task`, `version`, `done`, `doneAt`, recorder id/name, worker id/name, and `by`. Compare-and-set versions reject stale ticks and Undo. Reopening retains the last stamp; another completion records a fresh one.
- Current kitchen sessions can read task metadata when Cleaning is enabled; canonical chefs retain access while it is off. Staff read today's completions only and need the existing Tick capability to complete work. Canonical head/sous chefs read weeks and manage schedules. Functions-only, signed-out and remembered Google-only access are denied. View-only remains read-only.
- Schedule data and completions stay in tab memory. Handover clears private state; scheduled locks retain unfinished work for the same recorder. A failed save checks its exact generated revision on retry before creating anything else, including after the same recorder unlocks again.

A page open or explicit Refresh makes two server queries: task revisions with `until > rangeStart`, capped at 501 to detect more than 500, and completions for today (staff equality) or a chef range of at most seven days, capped at 2001 to detect more than 2000. Limits fail visibly rather than silently truncating. Approximate bill is returned task plus completion documents, minimum empty-query charges and existing rule lookups. Switching a cached range reuses tab memory. There are no startup cleaning reads, listeners, polling or private persistent copies. Midnight and Undo deadlines are local UI timers; an actual day change loads the new day once. A failed schedule save's retry adds one authoritative document read to reconcile a lost acknowledgement.

Manual backup includes both full collections. The encrypted nightly backup includes all task revisions and completion records in its normal selected window. Recovery checks preserve revision links, worker/recorder stamps and Undo versions. Moving the kitchen PIN stops before any destination write when cleaning records exist: immutable history requires a separately reviewed, source-bound copy procedure. It does not silently omit records or loosen live history rules.

## Verification and release

The focused cleaning browser suite passed 112 checks, including lost acknowledgement across unlock, retained existing edits after a failed reread, concurrent tick/Undo, canonical permissions, shared attribution, midnight rollover, local Undo expiry, bounded reads and matrix containment. Safe-text passed 61 checks. Navigation, role/private access, chef menu, PIN-move refusal, read-budget and design-pattern checks passed. Existing prep-lock and work-recovery suites also passed. The full Firestore/Auth emulator suite passed, including 231 focused cleaning checks and 1,926 actual client-shape calls across nine identities. The isolated backup recovery round trip passed with 62 synthetic documents, plus delivery and backup reuse checks.

[Actual-app screenshots and measurements](implementation/measurements.json) use synthetic jobs and people and the existing Google Fonts families at 390, 768 and 1280 px, plus Large and Extra large phone text. No horizontal overflow or measured control below 44 × 44 px. At 390 × 844, seven complete daily rows fit (six at larger text), against six visible Prep rows in the design baseline. The chef phone week view shows three complete rows after its date controls; staff never see those controls. Confirmed ticks keep the row height stable. The wide matrix stays inside the paper with the footer below. These are visual and interaction checks, not a full accessibility certification.

- [Daily phone list](implementation/cleaning-staff-390.png)
- [Chef weekly matrix](implementation/cleaning-chef-week-1280.png)
- [Task setup](implementation/cleaning-editor-390.png)
- [Completed job](implementation/cleaning-done-390.png)
- [Existing Prep reference](implementation/prep-reference-390.png)

The initial page release added rules for new collections and published them before the client: [Publish rules, run 42471882907](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/42471882907) passed on implementation commit `fff3121`, including compilation/publication, canonical foundation verification and the live Lock probe. [PR #609](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/609) tracks the full required CI result and normal release queue. The follow-up admin switch tightens existing access, so its rules publish after the compatible client as described in the release-switch contract.

## Rollback

Use a normal PR for a compatible client correction. Keep the saved cleaning records, immutable history, admin release flag and matching server gate. A client rollback does not erase data and must continue to honour the release switch.
