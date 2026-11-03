# Ping sound

3 November 2026, head chef: "When a ping is sent out, play a sound that matches the app, so staff do not miss it. As the admin I want to choose between about five sounds that get attention without being annoying."

## What staff hear

When the pings sheet pops up by itself with a new ping, the phone or tablet plays the kitchen's ping sound once. That is:

- the start of a shift, when the sheet comes up with an unread ping (straight after the PIN, or the first open of the day);
- a ping popping up at 10:30, at its own time, or as soon as a ping for today is saved on another phone.

Nothing plays when the sheet is opened from the bell, when it only shows minutes to sign, or after Got it or Close (those pings never pop up again by themselves, so they never ring again). On a shared tablet, someone signed in only to tick gets only Safety, Allergen alert and Off today pings popping up, so only those ring there. The sound follows the pop-up, so every existing rule about when a ping pops up (one sheet at a time, not while typing, not over Who are you?) also decides when it rings.

**Preview the popup** in the ping editor plays the sound too, so the head chef and sous chefs hear what staff hear.

## The five sounds

All short, in the bright 800 to 1500 Hz range that cuts through extraction fans, and soft at the edges so none of them clicks.

| Id | Name | What it is | Length |
| --- | --- | --- | --- |
| `bell` | Pass bell (the default) | One ring of a counter bell on the pass: E6 with a real bell's out-of-tune partials and a slow shimmer | 1.5 s |
| `order` | Order up | Two quick rings of the same bell | 1.7 s |
| `chime` | Soft chime | Two gentle bell notes going up, G5 to C6 | 1.4 s |
| `marimba` | Marimba | Three warm wooden notes, G5, B5 and D6 | 0.8 s |
| `timer` | Oven timer | Three short soft-edged beeps at 1480 Hz, the sharpest of the five | 0.6 s |
| `off` | Off | No sound. Pings still pop up | |

Ids are saved in Firestore: never rename one. A new sound adds a line to `SOUNDS` and `SHAPES` in `js/chime.js` and a check to `tests/ping-sound.test.js`.

## One sound for the whole kitchen

Head chef, 3 November 2026: only the head chef (the admin) sets the ring tone for pings. Nobody else can pick another sound, and it is the same sound for everyone, on every device.

- There is one setting, `config/main.pingSound`, and every device reads it. There is no per-phone, per-person or per-device sound, nothing kept on the phone, and no sound in Settings. Do not add one.
- Only the verified admin writes it: the head chef's own Google device with their head chef PIN and its grant. The rules refuse it from sous chefs, staff, leads, view only, functions only, the shared tablet, signed-out phones and the head chef's PIN on any other phone, including inside a sous chef's staff save or ping stamp (`tests/rules/rules.test.mjs`, `tests/rules/client-shapes.test.mjs`).
- A new pick reaches every phone through its config listener, with no reload. A phone can still be quieter (on silent, volume down, not tapped since the book opened), but it never plays a different sound.

## Choosing the sound

Admin panel, Operations, **Shift pings**: the **Ping sound** block under the pings (its own chip under On this page). Each sound has **Play** to listen without changing anything. Tapping a sound plays it and saves it at once for every phone, with "Saved. Every phone plays Marimba when a ping pops up." The block shows only on the head chef's own Google device with their PIN and its grant (`pingSoundOK()`). Sous chefs write pings but do not see or change the sound.

## Data, reads and rules

- `config/main.pingSound`: one of the ids above. Nothing set is the Pass bell.
- Written only by the verified admin, as one merge through `W()` (`pingSoundSet()`). The rules already let `isAdmin()` change `config/main`; the sous chef's narrow `config/main` writes cannot include it. No rules change, no index. `tests/rules/client-shapes.test.mjs` has the row.
- The head chef's People save rewrites the whole of `config/main`, so `saveConfig()` carries `pingSound` over, like `sousMail` and `cutoffs`. If `js/chime.js` did not load, the People save keeps the stored value as it was.
- Read from the `config/main` listener every phone already has. No reads of its own, nothing saved on the phone, nothing in the read budget.
- It comes from Firestore, so `pingSound()` checks it against the fixed list in `js/chime.js`. Anything else plays the Pass bell.
- Backups and the kitchen PIN move copy `config/main` whole, so the choice goes with them.

## How the sound is made

`js/chime.js` (`LK_CHIME`) makes each sound on the phone with Web Audio oscillators. There are no sound files, nothing downloaded or saved, and nothing for the security header. It is a startup file: in `index.html` before `js/prep.js`, in `SHELL` in `sw.js` and in both `js/upkeep.js` lists, so a phone with no signal still rings for the pings it already has. `js/prep.js` decides when (`noteChime()`, called from `noteOpen()`); `js/chime.js` only knows how each sound goes.

Browsers let a page make a sound only after someone has touched it. The first tap or key on the page wakes the sound with one silent sample (Safari needs it inside the tap), then lets it sleep. A phone that had a call or locked its screen can come back interrupted, and the next tap wakes it again. Between sounds the audio is put to sleep, so a tablet on the pass does not hold its speaker open all shift. A sound still waiting to start when someone taps the page, or once the screen is off, is dropped, so a sound the browser held back for a tap never rings late. There is no time limit: a slow phone still rings (a 1.5 second limit, timed by the phone's clock, dropped sounds on a busy test runner, 4 Nov 2026). On Safari the audio session is set to `transient`, so music on the phone keeps playing (lowered for a moment) and a phone on silent stays silent.

Known limits, by design of the browsers:

- A phone nobody has touched since the book opened (say a tablet that reloaded itself at 04:00 and was not touched before 10:30) pops the sheet up silently. Chrome may allow the sound anyway where the book is installed as an app.
- A phone with its screen off, or the book in the background, does not ring: the sheet waits for the book to be on screen, as before. Ringing a locked phone would need push notifications for pings, which the book does not send.
- A phone on silent or with its volume down stays quiet.

## Tests

`tests/ping-sound.test.js` counts the notes the real browser is asked to play (each oscillator's pitch): the admin block and its Play and pick, the save and the People save keeping it, Off, a staff phone at a ping's own time, no sound after Got it or from the bell, the start of a shift, an unknown value from Firestore, a sous chef seeing no block, and `js/chime.js` failing to load. It also checks the one-sound decision: no block for the head chef's PIN on another phone, no sound in Settings for staff or a sous chef, and a sous chef's phone switching from Marimba to Oven timer when the head chef picks it, with no reload, even when waking the sound is slow. A sound held back until a tap is checked not to ring late. `tests/rules/rules.test.mjs` refuses the sound from every other sign-in and inside the saves they may make. `tests/seasonal-shell.test.js` checks the new startup file is in the saved shell and both update lists.

## Rollback

Revert the pull request. Old code ignores `config/main.pingSound`, and the field can stay. Keep the saved-shell rule: the revert ships `index.html`, `SHELL` and both update lists together as a new complete generation (`docs/saved-shell-generations.md`).
