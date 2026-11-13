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

`scripts/site-changed.sh` leaves out only what people and GitHub read: `docs/`, every `*.md`, `scripts/`, `.github/`, `.claude/`, `firestore.rules`, `.gitignore`, and the tests run by node (`*.test.js`, `*.test.mjs`, `tests/lib.js`, `tests/run.js`, `tests/package*.json`, `tests/rules/`, `tests/fake/`). Anything else counts as needed, so a new folder the book loads is never missed. `tests/contact.html` and the files it loads count as needed because the live click tests open them from the site.

When nothing needs publishing, the live site keeps the earlier copy of the notes too. They go out with the next app change, or straight away with **Run workflow** on Publish site, which always publishes.

## What follows it

- **Live click tests** run after the Deploy job publishes, and not after a merge that published nothing.
- **Publish rules** runs after the Published job, so a change to `firestore.rules` alone still publishes the rules. It does not run when publishing the site failed, so stricter rules never go ahead of the code.
- Both still follow GitHub's own `pages-build-deployment` while Pages publishes from the branch. Publish site then only warns and publishes nothing, so nothing runs twice.

## The one setting

In GitHub: Settings, Pages, Build and deployment, Source: **GitHub Actions**. Until then the branch publish carries on as before. The change keeps the live site up; it only changes who publishes the next version. Make it after this change merges, so no merge in between waits to go live.

To go back: set Source to Deploy from a branch (`main`, root). GitHub's own publish then runs on every push again and the two followers still answer it.

## Silent updates (13 Nov 2026)

After the switch the owner still saw the offer for the last branch publish and asked: "can't we just silently update?" A version the book finds by itself now shows no band (`js/upkeep.js`). It updates when it is safe, by the same rules as before: nobody has touched it for 2 minutes and nothing is typed, unsaved or waiting to send; or it is brought back after 5 minutes away; or 04:00. The band shows only for an update someone asked for (Update now in Settings, which says Update now once a new version is known; the Reload buttons), with its usual words, and for a saved book that cannot be used. Trade-off: a screen used without a 2-minute break runs the older version until it rests or until 04:00.

## What does not change

The book's update check, the service worker, the 10-minute and 1-hour reload limits and the 04:00 refresh are unchanged. A merge that does change a file the book loads still offers the update, so grouping app changes into fewer merges still means fewer updates (the release windows in `docs/auto-merge.md`).

## Tests

`tests/site-publish.test.js` (no browser): the file list, then the Check, Live click tests and Publish rules steps run as bash against a made-up repository with a stand-in `gh`. It covers #684 (README alone: no publish), a note after a failed publish, a live commit the copy does not know, GitHub not answering, the branch publish still on, and rules alone.
