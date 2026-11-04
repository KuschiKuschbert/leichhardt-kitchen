# Auto-merge: ready means merge when green

Head chef decision, 4 November 2026. A pull request that is ready (not a draft) and has no `hold` label merges by itself once Click tests pass and it is up to date with `main`. Nobody has to say "merge when green" and no session has to stay awake for it.

## How it works

`.github/workflows/auto-merge.yml` runs when a pull request opens, changes, is marked ready or draft, or gets a label; when `main` moves; every 20 minutes; and by hand.

- **Ready and not held:** it switches on GitHub's auto-merge (squash). GitHub merges the pull request the moment Click tests pass and it is up to date.
- **Draft or `hold`:** auto-merge is switched off. Work in progress stays a draft.
- **One at a time:** the queue reads the ready pull requests oldest first. One that is merging or still testing means wait. One that failed Click tests or has a conflict is skipped until its session fixes it. The first one that is behind `main` is brought up to date (GitHub's Update branch), and the queue stops there. When it merges, `main` moves and the next one is brought up to date. So only one pull request runs Click tests again after each merge, not all of them.
- **One stuck pull request does not stop the line.** When GitHub cannot yet say whether a pull request merges (after an outage this can last hours), the queue waits only if it is testing, and otherwise skips it this time. Every GitHub call it makes is tried three times, 10 and 20 seconds apart (4 Nov 2026).
- **Forks never merge automatically.**
- **No event is lost.** Each pull request's switch runs in its own concurrency group; only the queue shares one. A waiting run in a shared group is replaced by the next, which on 4 Nov 2026 dropped the ready events of three pull requests marked ready together. If a ready pull request still has no auto-merge, run the workflow by hand: it switches every ready one on.

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
