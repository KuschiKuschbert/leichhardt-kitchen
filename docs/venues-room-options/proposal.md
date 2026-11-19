# Proposal: a Venues room in the owner's admin panel

19 November 2026, Queensland. Round 1 of the service council. No code yet. Role-based analysis, not research with staff. Source commit: `main` at 086c033.

Background: [the second venue brief](../second-venue-options/brief.md). The owner chose its mix the same day. Each venue has its own web address and its own empty book; each venue's head chef is the admin of his own venue; the owner is admin at every venue (a rules change still to build). No new roles for now; roles added later are the same for every venue.

## The problem

The owner asked (19 Nov 2026): "can I get a new room in my admin panel to add new head chefs and venues and manage them from there?" Earlier: "otherwise I am sitting here setting up all venues and every time someone comes to me to change" things. The group's longer goal is the book in more of its pubs.

Who has it: the owner only. How often: adding a venue, a few times a year (one now); changing a venue's head chef, when one leaves (rare); checking that every venue is healthy, weekly or after a release; helping a venue head chef, whenever asked.

What happens today: nothing exists, because there is one venue. A venue is defined outside the book:

| Part of a venue | Where it lives today | Who can change it |
| --- | --- | --- |
| Its Firebase project (database, sign-in, App Check) | Firebase console | The owner, by hand |
| Its kitchen PIN and admin email | GitHub Actions secrets `KITCHEN_PIN`, `OWNER_EMAIL`; filled into the rules template when **Publish rules** runs | The owner, in GitHub |
| Its web address and copy of the book | GitHub Pages (`publish-site.yml`) | Merges to `main` |
| Its server jobs | 6 workflows use the secrets: publish-rules (14 uses), prep-minimums (7), nightly-backup (5), nightly-learning (4), cutoff-push (2), lock-probe (1) | Code in the repo |
| Its head chef and staff | `config/main` (`headId`, `people`) in its own database | Its admin |

## The change

A room in the owner's admin panel (not a venue head chef's) that lists the venues and lets the owner:

1. **Add a venue:** name, its head chef's Google email, a kitchen PIN; then the venue's project, address, rules, server jobs and empty book are prepared.
2. **Change a venue's head chef:** a new email; the venue's rules are published again.
3. **See every venue's health:** its address, head chef, the book version it runs, when its rules were published, its last backup, its last lock check and live tests, reads used.
4. **Open a venue** (its own address) to help there, where the owner is admin too.

**Limits found while writing this proposal** (for the reviewers to test):

- A web page must never hold the keys that create projects, publish rules or change secrets. So the room can only *ask*; a server job (GitHub Actions, like the 03:00 jobs) does the work with the keys, and reports back into a private status record the room reads. Adding a venue cannot be one tap that is done at once.
- Creating a Firebase project from a job is likely to need a company Google Cloud organisation (a service account cannot simply create projects under a personal account), App Check needs a site key per address, and Google limits how many projects one account may hold. **Not evidenced; to confirm.** If so, the first steps of adding a venue stay by hand in the Firebase console, and the room guides and checks them.
- **The other way to hold many venues:** one shared Firebase project with each venue under its own path. Leichhardt's data already sits under `kitchens/<id>/...`. Firebase Hosting can serve several sites from one project, each its own address, so browser storage stays apart. Adding a venue would then be writing records, not creating a project; but the rules become one set for all venues (a large rewrite of the most sensitive file), the free daily reads are shared by every venue, and one bad rules publish reaches all venues. Round 1 of the second venue brief chose one project per venue. **This proposal does not decide it; the reviewers should say whether the room is worth building before it is decided.**

## Cost

| | Estimate |
| --- | --- |
| Reads | Opening the room: 1 to 2 reads (a venue list and a status record), in the owner's admin only; status written by the jobs, never polled |
| Writes | A request record per action (admin-only); the jobs write status |
| Files | A lazy room file; one workflow that reads requests and runs the per-venue steps; the per-venue matrix in 6 workflows; secrets per venue as GitHub environments |
| Rules | An owner-only store for venues, requests and status at the owner's home venue |
| Tests | Click tests for the room; emulator rows that a venue head chef cannot read or write it; a dry-run test of the job |
| Risk | A request that half-finishes (project made, rules not published); a head chef changed to a wrong email (locks him out, or lets the wrong person in); a status shown as healthy when the job never ran; one release reaching every venue |

## Design references to test

- **Flighty:** what matters now and next across venues, with real times and status from data already recorded; stale status never shown as live.
- **Airbnb:** a venue's address, head chef, health and next action together.
- **Linear:** one frame; the room as a room in the existing rail.
- **Duolingo:** adding a venue shows real progress through its steps and what is next.
- **Headspace:** plain words for steps that touch Google, GitHub and keys.
- **Things 3:** rare actions (add a venue, change a head chef) tucked away; the health list first.
- Todoist: an email typed for a head chef is checked, never guessed.

## Questions for round 1

Is the room worth building now, with one extra venue? What should be cut or deferred? Does it change the one-project-per-venue choice? What would most improve it?
