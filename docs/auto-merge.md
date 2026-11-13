# Auto-merge: ready means merge in the next release window

Head chef decision, 4 November 2026. A pull request that is ready (not a draft) and has no `hold` label merges by itself once Click tests pass and it is up to date with `main`. Nobody has to say "merge when green" and no session has to stay awake for it.

## Release windows (5 November 2026)

The head chef chose Plan B of `docs/firestore-usage.md`. Every merge is a new version, and every new version reloads the screens left open and every phone that comes back; each reload reads its lists again. On 4 and 5 November 48 merges in a day helped use up the free 50,000 reads by 13:00. So ready pull requests merge only in two release windows between services, Queensland time: **15:00 to 16:30** and **22:30 to 02:30** (`RELEASE_WINDOWS` in the workflow; the night window ran to midnight until the head chef moved its end to 02:30 on 8 Nov 2026, written as two windows that meet at midnight, `2230-2400` and `0000-0230`, as the HHMM times do not wrap).

- Outside a window a ready pull request waits with auto-merge off. Its Click tests still run, so it is green when the window opens.
- When a window opens, every ready pull request that is not held gets auto-merge, and the queue merges them one at a time as below. One that is still merging when the window closes may finish; the rest wait for the next window.
- **The waiting run opens each window** (6 Nov 2026). The queue runs on every pull request change, push to `main` and finished Click tests, and on a timer (every 20 minutes, and at 15:03 and 22:33). On 5 November GitHub ran only 3 of those timed runs in 14 hours, none in a window, so nothing merged that night. Now, whenever the queue finds a ready pull request waiting outside a window, it makes sure one run waits for the window: Run workflow with `wait`, named "Waiting for the release window". That run sleeps until a minute after the next window opens, then switches auto-merge on and moves the queue. Runners cost nothing on a public repository. GitHub stops a job after 6 hours, so a longer wait sleeps 5 hours 45 minutes and the queue after it starts the next one. The timed runs stay as a fallback.
- **`urgent`**: a pull request with this label gets auto-merge at any time and merges when green. Use it for a fix the kitchen needs now (a page that does not load, a wrong amount), not to skip the wait.
- **Release now**: Actions, Auto-merge, Run workflow, tick Release now. It opens the window for 30 minutes (6 Nov 2026). It used to open it only for its own run: on 6 November at 07:53 it merged #566 and brought `main` into #565, and the run that update started found the window shut and switched #565's auto-merge off again. The queue now finds a Release now from the last 30 minutes by its name.
- **One-off extension, 9 November 2026:** the owner asked to keep the window open until **08:00 Tuesday 10 November, Queensland time**. `RELEASE_UNTIL` is the full UTC deadline `2026-11-09T22:00:00Z`, checked by the PR switch, queue and waiting job. It adds an open window only while the current time is strictly before that instant. At 08:00 it expires automatically, including on later days; no daily schedule is widened and no rollback job is needed. Missing, malformed or relative dates add no extension. The usual daily windows, `urgent`, 30-minute Release now and queue protections still apply. As with a normal window close, auto-merge is switched off on the next queue pass; an already enabled pull request may still finish merging.
- Several merges in one window reach a screen left open as at most one or two reloads (it takes an update nobody asked for at most once an hour, `js/upkeep.js`).

`tests/auto-merge-queue.test.js` runs the window step, the switch and the waiting run's sleep with a stand-in clock: closed at 12:30, open at 15:00 and 23:59, closed at 16:30, urgent, Release now and its 30 minutes, the waiting run (started once, not twice, the next after 5 hours 45 minutes), and GitHub refusing. The dated extension also covers 02:30, immediately before, exactly at and after 08:00, the following morning, missing/invalid dates, normal windows after expiry, and draft/hold/fork guards. The original 6 Nov cases fail 19 of 169 checks on the older workflow.

## How it works

`.github/workflows/auto-merge.yml` runs when a pull request opens, changes, is marked ready or draft, or gets a label; when `main` moves; when Click tests finish on any pull request; every 20 minutes (at 7, 27 and 47 past the hour); and by hand.

- **Ready and not held:** it switches on GitHub's auto-merge (squash). GitHub merges the pull request the moment Click tests pass and it is up to date.
- **Draft or `hold`:** auto-merge is switched off. Work in progress stays a draft.
- **One at a time:** the queue reads the ready pull requests oldest first. One that is merging or still testing means wait. One that failed Click tests or has a conflict is skipped until its session fixes it. The first one that is behind `main` is brought up to date (GitHub's Update branch), and the queue stops there. When it merges, `main` moves and the next one is brought up to date. So only one pull request runs Click tests again after each merge, not all of them.
- **Not worked out yet (`UNKNOWN`):** GitHub has not yet said whether the pull request merges cleanly. It never stops the queue. The queue asks GitHub again every 10 seconds (asking also starts GitHub's check), at least once and until 10 minutes after that pull request last changed. A fresh push usually settles in seconds. Once GitHub knows, the queue treats it like any other: merging, testing, behind or in conflict. Still `UNKNOWN` after that: skipped this pass, and the queue moves on to the ones behind it. Nothing is kept between passes, so the next pass reads it fresh and takes it up once GitHub knows. One pass waits about 10 minutes at most, however many are `UNKNOWN`.
- **Testing means a Click tests check is still running.** Click tests runs in shares on several runners, and the required **Click tests** check only appears once every share is done. So while any PR click tests check on the newest commit is still running, the pull request is testing and the queue waits. Asking for the required check alone read a pull request in the middle of its run as failed, and the queue then brought the next one up to date beside it (4 Nov 2026, #520).
- **No Click tests on the newest commit:** just after a push the checks may not be there yet, so the queue asks again every 10 seconds until 10 minutes after the change, sharing the pass's one wait with `UNKNOWN`. Still none after that means Click tests never started on that commit (as on #516 on 4 Nov 2026): skipped until its session pushes again.
- **Forks never merge automatically.**
- **No event is lost.** Each pull request's switch runs in its own concurrency group; only the queue shares one. A waiting run in a shared group is replaced by the next, which on 4 Nov 2026 dropped the ready events of three pull requests marked ready together. If a ready pull request still has no auto-merge, run the workflow by hand: in a window it switches every ready one on, and outside one tick Release now.
- **GitHub errors are retried.** Switching auto-merge on, listing the ready pull requests and Update branch are each tried three times, 10 and 20 seconds apart. On 4 Nov 2026 a short GitHub outage left #518 without auto-merge until it was switched on by hand. If Update branch still fails, the run shows a warning and the next pass tries again.
- **Stuck in `UNKNOWN` for good.** After an outage GitHub can miss a push: the branch has the new commit, but the pull request still shows the one before (#516 and #520 on 4 Nov 2026). It then stays `UNKNOWN` and the queue skips it every pass. Its session fixes it by pushing once more (merge `main` in and push).
- **The schedule is only the fallback.** GitHub delays or drops scheduled runs when it is busy, most at the start of an hour, so the schedule runs off the hour. The end of every Click tests run moves the queue on as well (a `workflow_run` trigger; `check_suite` is not sent for Actions runs, so it cannot do this).

### 4 November 2026: one `UNKNOWN` pull request held up the queue

Until this change the queue stopped at the first `UNKNOWN` pull request and said "wait". #516 stayed `UNKNOWN` from about 20:00 to at least 20:52 Queensland time; its newest commit never got a Click tests run. #517 and #520 were green and only behind `main`, and waited the whole time. The schedule ran once that evening (18:12), and a run by hand at 20:28 stopped at #516 again. Now #516 would have been asked about once and skipped, and #517 brought up to date. `tests/auto-merge-queue.test.js` runs the queue step with a stand-in for `gh` and checks these cases.

## Setting it up (once, by the owner)

1. Repository Settings, General, Pull Requests: tick **Allow auto-merge**.
2. Create a fine-grained personal access token: this repository only; Contents read and write; Pull requests read and write. Add it as the Actions secret `AUTOMERGE_TOKEN`.
3. Actions, Auto-merge, Run workflow: switches auto-merge on for the pull requests that are already ready.

Until the secret exists the workflow prints a notice and does nothing; merging works as before.

The merge is made in the owner's name with that token. A merge made with the built-in `GITHUB_TOKEN` would not start Publish site, the Live click tests or Publish rules, which all follow the push to `main` ([site publishing](site-publishing.md)).

## For sessions

- Open a pull request as a draft. Mark it ready only when the work is finished, the tests for what changed pass and `README.md` is in step. Ready is the merge decision.
- Do not merge `main` into a ready branch yourself and do not merge it yourself: the queue does both. Fix a conflict or a failed check; the queue skips it until then.
- Something that needs the head chef first (a recipe amount, a choice between two behaviours) stays a draft or gets `hold`.
- Rules changes keep their publish order (`CLAUDE.md`, How changes ship, step 3): publish before marking the client ready when the rules must lead.
- After the merge, read the Live click tests as before.

## Turning it off

Delete the `AUTOMERGE_TOKEN` secret, or untick Allow auto-merge. Pull requests already set to auto-merge keep it until they are marked draft or labelled `hold`.
