# A Venues room in the owner's admin panel

Service council, 19 November 2026. Proposal: [proposal.md](proposal.md). Evidence: [evidence-packet.md](evidence-packet.md). Background: [the second venue brief](../second-venue-options/brief.md) (mix chosen the same day). Role-based analysis, not research with staff. Nothing is built.

The owner asked for "a new room in my admin panel to add new head chefs and venues and manage them from there".

## Round 1

**Verdict: Build smaller (4 of 5).** Build only a read-only list of each venue's health, with a way to open each venue. Adding a venue and changing a venue's head chef stay out of the book: in GitHub and the Firebase console, with a written checklist and a workflow the owner runs by hand.

| Reviewer | Verdict | Their one change |
| --- | --- | --- |
| Cook mid-service | Build smaller | Anything that changes a venue's rules or site runs only in that venue's release window, the Lock probe right after, and the last good rules go back if it fails |
| Head chef | Build smaller (and only later, at the third venue) | A read-only health list with Open links, each line saying when its job last reported |
| Skeptic | **Don't build (now)**; revisit at the third venue | Only a read-only health list the jobs write, each row "Checked <time>", Stale or Never checked in words; Add and Change stay in GitHub with a checklist |
| New starter | Build smaller | A head chef change says Done only after the new chef signs in at his venue; until then "Asked 14:02, not done yet" |
| Keeper | Build smaller | The room shows only each job's own result and time |

### Why the add and change actions are cut (all five)

1. **Keys.** A PIN or email typed on a page can reach a venue's published rules only through a GitHub token able to rewrite every secret, or by storing the PIN and email in a database record. Both break the rule that secrets live only in GitHub Actions secrets and the Firebase console. One stolen admin session could then hand a venue to the wrong person.
2. **Nothing starts the job.** Firestore cannot start a GitHub workflow; the job would have to check on a timer, and GitHub ran the 10-minute timed job only 3 to 7 times a day (`docs/firestore-usage.md`). All Publish rules runs share one queue that keeps one waiting run, so a request could be cancelled while the room still says Requested.
3. **The hard part may not be possible from a job.** Creating a Firebase project and its App Check key without a Google Cloud organisation is Not evidenced, so "Add a venue" would shrink to a checklist anyway.
4. **The owner's burden is already gone.** Each venue's head chef is admin of his own venue (chosen the same day), so day-to-day changes no longer come to the owner. What is left is rare: one venue now.

### Disagreement

- Skeptic: do not build anything now; GitHub's secrets and Actions pages, Publish rules and each venue's own Dashboard health line cover it. Head chef: agrees it can wait for the third venue.
- Cook, new starter and keeper: the read-only health list is worth having once there are two venues, as long as it never shows an old status as current.

### Contract fit

Needs work. `docs/design-patterns.md` says a new thing that needs the head chef "is a row there [the Inbox], not a new page", and the rail's rooms are fixed (the note says "four rooms" in one place and "five rooms" in another; `A_GROUPS` has five). A sixth owner-only room is a proposed departure for the owner to decide, not an accident; at 390 px the row of rooms may not fit (Not evidenced: no preview). A health record pattern already exists: the jobs write `analysis/health`, `js/admin-dashboard.js` reads it and marks it stale after 36 hours.

### Break-it findings (round 1)

| Scenario | Expected | Evidence | Smallest repair or check |
| --- | --- | --- | --- |
| Rules for the wrong venue: one venue's PIN and email published to another's project | Refused | Risk / Not evidenced. Today's guard is Leichhardt's project id written into the publisher | Each venue's settings carry its expected project id (not secret); the publisher refuses a mismatch; a row in `rules-publisher-check` |
| Shown healthy when a job stopped (a skipped timed run, a missing secret) | "Not checked since …" or "Never checked" | Risk / Not evidenced | Each check has an expected interval (backup 26 hours, lock check 8 days); a fixture with an old status |
| A request shown Requested or Done when the job was cancelled or did the wrong one | Done only when the job writes back its run and result; "Not done. Run again." after 30 minutes | Risk (source read) | Only if requests are ever built: one open request per venue, newest wins, status from reading back the live rules |
| A venue head chef (or a future non-owner head chef at Leichhardt) opens the room | Refused | Risk / Not evidenced | Owner-only rule (not `isAdmin()`), emulator rows for each role at both venues |

### Carried into the venue plumbing whatever is chosen

- Leichhardt's project id is written into `js/firebase-config.js`, `scripts/publish-rules.sh`, `scripts/publish-rules.cjs`, `scripts/rules-publisher-check.cjs`, `scripts/import-prep-standards.mjs`, `scripts/ping-index.mjs` and `scripts/prep-import-crypto.mjs`; each needs a per-venue value with a mismatch guard.
- Five secrets per venue (`FIREBASE_SA`, `KITCHEN_PIN`, `OWNER_EMAIL`, `BACKUP_KEY`, `APPCHECK_DEBUG_TOKEN`), as one GitHub environment per venue.
- A rules publish changes only in the venue's release window, then the Lock probe.
- To confirm before any venue is created: whether the Blaze plan is on, whether free reads are per project or per database, whether a project can be created without a Google Cloud organisation, and the project limit. The one-project-per-venue choice stands (Leichhardt alone used about 44,000 device reads by 13:00 on 5 Nov 2026).

## Recommendation after round 1

**Do not build the room now.** For the second venue: a written "Add a venue" checklist in `docs/` and one hand-run GitHub workflow with inputs (venue name, project id) that prepares the venue's copy of the site and checks its rules, with secrets entered in GitHub's own settings. A venue's head chef change is a secret change in GitHub followed by Publish rules in the release window. At the third venue, run round 2 for a read-only health list (each line with its job's time, stale said in words, an Open link), placed as the owner decides: a row in Today, a block on the Dashboard, or a room.

## Chosen (19 November 2026)

**The owner agreed: no Venues room now.** For the second venue, a written Add a venue checklist and one hand-run GitHub workflow; secrets stay in GitHub's own settings; a head chef change is a secret change then Publish rules in the release window, then the Lock probe. At the third venue, round 2 runs for a read-only health list. Round 2 did not run.
