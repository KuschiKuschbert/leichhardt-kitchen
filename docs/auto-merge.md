# Auto-merge: ready means merge when green

Head chef decision, 4 November 2026. A pull request that is ready (not a draft) and has no `hold` label merges by itself once Click tests pass and it is up to date with `main`. Nobody has to say "merge when green" and no session has to stay awake for it.

## How it works

`.github/workflows/auto-merge.yml` runs when a pull request opens, changes, is marked ready or draft, or gets a label; when `main` moves; when Click tests finish on any pull request; every 20 minutes (at 7, 27 and 47 past the hour); and by hand.

- **Ready and not held:** it switches on GitHub's auto-merge (squash). GitHub merges the pull request the moment Click tests pass and it is up to date.
- **Draft or `hold`:** auto-merge is switched off. Work in progress stays a draft.
- **One at a time:** the queue reads the ready pull requests oldest first. One that is merging or still testing means wait. One that failed Click tests or has a conflict is skipped until its session fixes it. The first one that is behind `main` is brought up to date (GitHub's Update branch), and the queue stops there. When it merges, `main` moves and the next one is brought up to date. So only one pull request runs Click tests again after each merge, not all of them.
- **Not worked out yet (`UNKNOWN`):** GitHub has not yet said whether the pull request merges cleanly. It never stops the queue. The queue asks GitHub again every 10 seconds (asking also starts GitHub's check), at least once and until 10 minutes after that pull request last changed. A fresh push usually settles in seconds. Once GitHub knows, the queue treats it like any other: merging, testing, behind or in conflict. Still `UNKNOWN` after that: skipped this pass, and the queue moves on to the ones behind it. Nothing is kept between passes, so the next pass reads it fresh and takes it up once GitHub knows. One pass waits about 10 minutes at most, however many are `UNKNOWN`.
- **Forks never merge automatically.**
- **No event is lost.** Each pull request's switch runs in its own concurrency group; only the queue shares one. A waiting run in a shared group is replaced by the next, which on 4 Nov 2026 dropped the ready events of three pull requests marked ready together. If a ready pull request still has no auto-merge, run the workflow by hand: it switches every ready one on.
- **The schedule is only the fallback.** GitHub delays or drops scheduled runs when it is busy, most at the start of an hour, so the schedule runs off the hour. The end of every Click tests run moves the queue on as well (a `workflow_run` trigger; `check_suite` is not sent for Actions runs, so it cannot do this).

### 4 November 2026: one `UNKNOWN` pull request held up the queue

Until this change the queue stopped at the first `UNKNOWN` pull request and said "wait". #516 stayed `UNKNOWN` from about 20:00 to at least 20:52 Queensland time; its newest commit never got a Click tests run. #517 and #520 were green and only behind `main`, and waited the whole time. The schedule ran once that evening (18:12), and a run by hand at 20:28 stopped at #516 again. Now #516 would have been asked about once and skipped, and #517 brought up to date. `tests/auto-merge-queue.test.js` runs the queue step with a stand-in for `gh` and checks these cases.

## Setting it up (once, by the owner)

1. Repository Settings, General, Pull Requests: tick **Allow auto-merge**.
2. Create a fine-grained personal access token: this repository only; Contents read and write; Pull requests read and write. Add it as the Actions secret `AUTOMERGE_TOKEN`.
3. Actions, Auto-merge, Run workflow: switches auto-merge on for the pull requests that are already ready.

Until the secret exists the workflow prints a notice and does nothing; merging works as before.

The merge is made in the owner's name with that token. A merge made with the built-in `GITHUB_TOKEN` would not start the Pages deploy, the Live click tests or Publish rules, which all follow the push to `main`.

## For sessions

- Open a pull request as a draft. Mark it ready only when the work is finished, the tests for what changed pass and `README.md` is in step. Ready is the merge decision.
- Do not merge `main` into a ready branch yourself and do not merge it yourself: the queue does both. Fix a conflict or a failed check; the queue skips it until then.
- Something that needs the head chef first (a recipe amount, a choice between two behaviours) stays a draft or gets `hold`.
- Rules changes keep their publish order (`CLAUDE.md`, How changes ship, step 3): publish before marking the client ready when the rules must lead.
- After the merge, read the Live click tests as before.

## Turning it off

Delete the `AUTOMERGE_TOKEN` secret, or untick Allow auto-merge. Pull requests already set to auto-merge keep it until they are marked draft or labelled `hold`.
