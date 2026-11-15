# Opening the installed app again (16 Nov 2026)

When the installed app is opened again with an address (the kitchen tablet's Home button, a link to a page), the open book moves to that page instead of loading again.

- `manifest.webmanifest`: `"launch_handler": { "client_mode": ["focus-existing", "auto"] }`. Chrome keeps the open book and hands the address to `window.launchQueue`. Browsers without it ignore the line.
- `js/app.js`, after the first `render()`: the `launchQueue` consumer. `#/kiosk-home` means Home (`#/`). Another page of the book: the book goes there (same page load, a normal history step). A plain launch of the start page (`#/`, an icon tap) leaves the book where it is. An address outside `index.html` loads in full. A cold start on `#/kiosk-home` is replaced by `#/` with no extra Back step.
- Why: the kitchen tablet (Kitchen Book OS, a separate private project) has a Back/Home pill. Its Home opens the installed app at `#/kiosk-home`. Before this, Chrome loaded the whole book again on every tap: about two seconds, fresh reads, and a sign-in check.
- Installed copies pick up the manifest line when Chrome next updates the app (it checks the manifest from time to time, usually within a few days). Until then a launch with an address loads the book again, as before.
- Test: `tests/launch-home.test.js` (Chrome's `launchQueue` is stood in for).
