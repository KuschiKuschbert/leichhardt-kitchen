# Publishing the site only when the phones need it

13 November 2026. The owner asked why the app "constantly wants to update" and asked for the fix to run by itself.

## Why the book offered so many updates

The book decides there is a new version from the `Last-Modified` and `ETag` of `index.html` (`js/upkeep.js`, the automatic update), and the service worker decides the same way for every startup file (`sw.js`). Both come from the publish, not from the file: every publish gives every file a new stamp, even a file that did not change.

GitHub Pages published from the `main` branch on every push. So every merge made every phone show "New version available", download all 43 startup files again (the two Devanagari fonts included) and reload when idle. A reload reads the open page's lists again from Firestore.

Measured on the live site, 13 November 2026: `index.html` last changed on 9 November, but it was stamped 12 November 06:19 UTC (16:19 Queensland time) by #684, which changed only `README.md`. From 6 to 12 November, 14 of the 50 merges changed nothing a phone loads. 9 November alone had 27 merges.

## What happens now

`.github/workflows/publish-site.yml` (**Publish site**) runs on every push to `main`:

1. **Check** finds the commit that is live now: the newest `github-pages` deployment whose latest status is success. It lists the files changed between that commit and `main`, and passes them through `scripts/site-changed.sh`.
2. **Deploy** publishes the whole repository only when that script prints a file. Comparing with what is live, not with the previous commit, means a note merged after a failed publish still carries the earlier app change out.
3. **Published** runs when the site is up to date with the commit: after a publish, or when nothing needed one.

The Pages artifact is named for its workflow attempt. Before Deploy reads it, the workflow waits briefly for the exact upload ID to appear in that run. A retry also has its own name, so Deploy can find the new upload alongside earlier attempts.

`scripts/site-changed.sh` leaves out only what people and GitHub read: `docs/`, every `*.md`, `scripts/`, `.github/`, `.claude/`, `firestore.rules`, `.gitignore`, and everything under `tests/`, which runs in node (the click tests, their runner, helpers and fixtures, `tests/rules/`, `tests/fake/`), except `tests/contact.html` and `tests/contact-page.js`. Those two count as needed because the live click tests open them from the site (`tests/library.test.js`); a new page the live click tests open from the site is named beside them. Anything else counts as needed, so a new folder the book loads is never missed. Until 26 Nov 2026 only the `*.test.js` files, `tests/lib.js`, `tests/run.js` and the package files were left out, so a change to a node-only helper such as `tests/plating-check.js` asked every phone to update.

When nothing needs publishing, the live site keeps the earlier copy of the notes too. They go out with the next app change, or straight away with **Run workflow** on Publish site, which always publishes.

## A venue on its own address (19 Nov 2026)

A venue served by its own Firebase project (`venues/<id>.json` with `host: firebase`, [venues.md](venues.md)) gets its own copy of the same publish straight after the Pages Deploy: the Venue site job makes it with `scripts/venue-site.cjs` (its settings, security header, name, an empty book, its QR) and publishes it with `scripts/venue-deploy.sh`, in the venue's GitHub environment, then reads it back (`scripts/venue-live-check.cjs`). Published waits for every venue, so no venue's rules are published ahead of its code. `venues/` itself is left out of a publish: it is read by the workflows only.

## Publish times (24 November 2026)

The head chef chose it after the council ([brief](loading-wait-options/brief.md)). Merges land at any time (the release window is open all day), but the phones get a new version only in the publish windows, `PUBLISH_WINDOWS: '1505-1630 2235-2400'` (Queensland time), or at once for a pull request labelled `urgent`. 16 to 36 new versions a day had reloaded the phones coming back to the book (Mon 23 and Tue 24 Nov 2026); now it is at most two a day plus urgent.

- **Check** compares with what is live, as before. A change the phones load outside a window is held (`deploy=false`, `held=true`). Inside a window, by hand (Run workflow) or for `urgent` it publishes. If GitHub does not say which labels the merge had, it publishes rather than hold a fix unseen.
- **The waiting run** (24 Nov 2026, as in the merge queue): a held change starts a run ("Waiting for the publish window", job Wait for the next window) that sleeps until a minute after the next window opens, at most 5 hours 45 minutes, inside GitHub's 6-hour job limit. It then starts a window run ("Publish window", Run workflow with `timed`), which decides like a timed run: inside a window it publishes what waited; woken early by the cap, it holds again and the next wait starts. The waiting run sleeps in its own concurrency group, so it never holds up a publish; a newer one replaces it. Why: on the windows' first evening GitHub ran none of the timed runs, and 2 of the 144 ten-minute cut-off runs that day, so the 22:35 window passed with four changes held until they were published by hand at 23:14.
- **Timed runs** every 20 minutes inside both windows (UTC cron: 05:05 to 06:25 and 12:35 to 13:55) stay as a fallback. One that GitHub runs late, outside a window, still holds.
- **Published** does not run while a change is held, so Publish rules waits too and no rules go out ahead of their code. When the site goes out, Publish rules compares with the version that was live before it (from the Pages deployments), so rules that waited are published once, after their code. A timed run that published nothing brings no rules. A rules change alone, with nothing held, still publishes at once.
- **Trade-off:** a fix not labelled `urgent` reaches the phones up to 16.5 hours later (22:35 to 15:05), and so does its live check. Label a fix the kitchen needs now `urgent`.

`tests/site-publish.test.js` runs the decision and the rules step at the window edges, with and without `urgent`, for timed runs and for held rules: 15 failed of 66 on the old workflows, 0 now. The waiting run's checks (a held change starts it, its sleep from six times of day, the window run it starts, its own group and job limit): 13 failed of 81 on the workflow before it, 0 of 80 now.

## What follows it

- **Live click tests** run after the Deploy job publishes, and not after a merge that published nothing.
- **After a window publish** (27 Nov 2026). GitHub starts no workflow when a run its bot started ends, and the window run is one: the waiting run starts it. So after the 26 Nov 22:36 and 27 Nov 15:06 window publishes no Live click tests ran (both were started by hand later), and Publish rules did not run either: rules held with their code would have stayed held (none were; the rules then live were `main`'s, published by hand from #901's branch). Now such a run, once Deploy and Published succeeded, starts both itself (the job Start the live tests and rules, `actions: write`). Publish rules is told the run and the commit it published (`site_run`, `site_sha`, leave both empty by hand), checks out that commit, refuses one that is not on `main`, and decides as after any publish: rules that waited go out once, after their code; none when nothing changed; none when the window run published nothing. A run a person or a merge started is followed by GitHub as before, so nothing runs twice. Each start is tried three times; if one cannot be started the run fails and says which one to run by hand. `tests/site-publish.test.js`: 19 failed of 104 on the old workflows, 0 of 103 now. GitHub not answering about the window run's jobs counts as published there, so rules that waited are never dropped silently.
- **A run that skips cancels nothing** (24 Nov 2026). A merge that publishes nothing still starts a Live click tests run, which then skips. The cancelling used to cover the whole workflow, so that run cancelled the live tests of the merge before it: #850's and #849's runs cancelled #851's twice. Now it sits on the test jobs (`live-tests-<share>` and `live-tests-venues`), which a skipping run never starts, so only a newer run that tests replaces an older one. `tests/site-publish.test.js` checks it: 3 failed of 40 on the old workflow, 0 of 40 now.
- **Publish rules** runs after the Published job, so a change to `firestore.rules` alone still publishes the rules. It does not run when publishing the site failed, so stricter rules never go ahead of the code.
- Both still follow GitHub's own `pages-build-deployment` while Pages publishes from the branch. Publish site then only warns and publishes nothing, so nothing runs twice.

## The one setting

In GitHub: Settings, Pages, Build and deployment, Source: **GitHub Actions**. Until then the branch publish carries on as before. The change keeps the live site up; it only changes who publishes the next version. Make it after this change merges, so no merge in between waits to go live.

To go back: set Source to Deploy from a branch (`main`, root). GitHub's own publish then runs on every push again and the two followers still answer it.

## Silent updates (13 Nov 2026)

After the switch the owner still saw the offer for the last branch publish and asked: "can't we just silently update?" A version the book finds by itself now shows no band (`js/upkeep.js`). It updates when it is safe, by the same rules as before: nobody has touched it for 2 minutes and nothing is typed, unsaved or waiting to send; or it is brought back after 5 minutes away; or 04:00; or the next open. Since 24 November 2026 a start is never interrupted: a version the worker saves while the book is opening waits for one of those (it used to reload within 8 s of opening if nobody had touched the screen, so the Loading card showed twice; [brief](loading-wait-options/brief.md)). The band shows only for an update someone asked for (Update now in Settings, which says Update now once a new version is known; the Reload buttons), with its usual words, and for a saved book that cannot be used. Trade-off: a screen used without a 2-minute break runs the older version until it rests or until 04:00.

## What does not change

The book's update check, the service worker, the 10-minute and 1-hour reload limits and the 04:00 refresh are unchanged. A merge that does change a file the book loads still offers the update, so grouping app changes into fewer merges still means fewer updates (the release windows in `docs/auto-merge.md`).

## Tests

`tests/site-publish.test.js` (no browser): the file list, then the Check, artifact wait, Live click tests and Publish rules steps run as bash against a made-up repository with a stand-in `gh`. It covers the window run starting Live click tests and Publish rules (27 Nov 2026), #684 (README alone: no publish), a note after a failed publish, delayed artifact visibility, wrong or expired artifacts, a live commit the copy does not know, GitHub not answering, the branch publish still on, and rules alone.
