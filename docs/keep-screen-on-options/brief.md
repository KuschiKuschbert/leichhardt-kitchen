# Keep the screen on with a recipe open

Requested by the head chef on 13 November 2026: "In my app when on a mobile device can we have the option in the recipes for a leave screen on toggle? ... It's annoying having the recipes open and the screen turns off." **Not chosen yet.** This brief holds the council's two rounds, three designs, a mix and the recommendation. The previews are screenshots of the real recipe page in the click-test stand-in, with each design drawn into it; nothing in the book has changed.

Evidence: commit `5dff5a6` (main), staff Bo signed in, 390 x 844 px unless stated, normal text, Chicken Burger (`#/r/burger`) and the longest recipe name, Salt and Szechuan Pepper Calamari (`#/r/calamari`). All measurements are **Preview** (the real app and shell with the design drawn in by a script), not an implemented feature. This is role-based analysis, not research with real staff.

## The problem

A cook opens a recipe on a phone or the shared tablet, props it on the bench and works from it. The phone's own screen timeout (often 30 s to 2 minutes) turns the screen off mid-recipe. To read on, the cook wakes the phone with wet or gloved hands, often unlocks it, and finds the place again. Today's ways round it:

- Tap the screen every minute or so. A wet tap on the method ticks a step ("Tap a step to tick it off"), unnoticed.
- Change the phone's screen timeout: about 5 taps in the phone's settings, for the whole phone, and forgotten afterwards.
- Wake and unlock each time.

The browser's Screen Wake Lock (`navigator.wakeLock.request('screen')`) can hold the screen on while the book is on screen. No permission prompt. Supported by Chrome and Samsung Internet on Android, Safari 16.4+ and Firefox 126+. An iPhone **home-screen app** only holds it from iOS 18.4. The browser lets go whenever the page is hidden (side button, app switch) and may refuse, for example in some battery saver modes.

## Round 1: should we build it? (13 Nov 2026)

**Verdict: Build smaller (3 of 5).** Every reviewer agreed the problem is real and cheap to fix: no reads, writes, listeners, rules, new files or security header change.

| Reviewer | Verdict | In one line |
| --- | --- | --- |
| Cook mid-service | Build | Nothing new on the first screen. On by itself; a cue may share the trail line, which has room. |
| Head chef | Build smaller | Worth an hour, not a week. Keep it off the card: on by itself, one row in Settings, This phone. |
| Skeptic | Build smaller | Proof is one report, but the harm is concrete (wake taps tick steps). A switch on each recipe would be the same annoyance again. |
| New starter | Build | "I would never find it in Settings." Show the state in words beside the trail, as the off switch. |
| Keeper | Build smaller | One helper owns one lock, tied to the route, visibility and both shared-screen locks. "On" only while really held. |

**What to cut:** no tap on every recipe (the choice is remembered on the phone), no new line on the first screen, no status that can be wrong, nothing outside recipe pages.

**Disagreement:** where the switch lives. The head chef and the Skeptic want it only in Settings; the new starter wants it on the card in words; the cook accepts a cue on the trail line. Three reviewers (cook, head chef, new starter) want it **on by itself** rather than opt-in. That differs from the request ("an option ... toggle"), so the designs show both.

### Round 1 break-it findings

| Scenario | Expected | Hypothesis | Status | Repair or check |
| --- | --- | --- | --- | --- |
| iPhone home-screen app before iOS 18.4, keep-awake on | Screen stays on, or the book does not offer it | The request succeeds, the control says on, the screen still sleeps | Risk / Not evidenced | Do not offer it in an iPhone home-screen app before 18.4 (version in the user agent); show "on" only while the lock is held (`release` event). Real phone check. |
| Battery saver refuses | The control says the phone said no | The control stays on | Risk / Not evidenced | Words in place after a refused tap; a quiet off state when the automatic request is refused. Stub test. |
| Phone in an apron pocket, screen not switched off | Screen sleeps soon | Screen stays lit; pocket taps tick steps or reach Prep | Risk / Not evidenced | Let go after 15 minutes without a touch; stub test with the clock. |
| Shared tablet left on a recipe, 10-minute idle lock fires | Screen can sleep | The lock keeps the screen lit behind the PIN screen until someone comes | Risk / Not evidenced | Let go when a shared screen locks (idle or 04:00). Shared-screen fixture with a stub lock. |
| Recipe to recipe, then back to Recipes | One lock while on a recipe, none on the list | Two locks, or one left on the list, or none after the phone wakes | Risk / Not evidenced | One helper, one lock; a stub counts live locks on each path. |

## What every design shares

- **One helper** in `js/app.js` (already in the saved shell) holds at most one lock. It holds only when every one of these is true: a recipe page is open (`#/r/...`, The Pass or Tiles), the choice is on (or the cook mode is on, in C), the book is on screen, it is a touch screen, the browser has the wake lock, it is not an iPhone home-screen app before iOS 18.4, a shared screen is not locked, and there was a touch in the last 15 minutes. Otherwise it lets go. It asks again when the book comes back on screen or a touch comes after the 15 minutes.
- **Truthful state.** The control shows on only while the browser holds the lock (the lock's own `release` event, not a guess).
- **Where unsupported** (an old browser, a laptop with a mouse, an iPhone home-screen app before 18.4) the control is not drawn.
- **Saved on this phone** in `lk.settings.v1`, beside Text size. No reads, writes, listeners or rules. No change to the security header.
- **Not elsewhere.** Prep, Orders and every other page sleep as normal.

## The three designs

| Design | Central idea | Main task: keep the screen on while cooking from a recipe |
| --- | --- | --- |
| **A. A switch on the card** (what was asked) | Off until you tap it. A chip on the trail line of every recipe: "Keep screen on". Tapped, it says "Screen on" with a tick. Remembered on this phone. | First time: 1 tap on any recipe. After that: 0 taps. To stop: 1 tap. |
| **B. On by itself, set in Settings** (changes the recipe page least) | On by itself on every phone and tablet. Nothing new on the recipe page. One row in Settings, This phone: "Keep the screen on with a recipe open: On". | 0 taps. To stop: chef hat, Settings, the row, Off (4 taps). |
| **C. Cook from the method** (rethinks the flow) | Reading a recipe is unchanged. A "Cook from this" button above the method starts a cooking state: the screen stays on, the steps get bigger for arm's length, and a dark bar at the top says "Cooking: the screen stays on" with Stop. It ends with Stop or leaving the recipe. | Each time: Method (1) and Cook from this (1) = 2 taps. To stop: 1 tap. |

### A. A switch on the card

Previews: `previews/a-off.png`, `previews/a-on.png`, `previews/a-refused.png`, `previews/a-tiles.png`, `previews/a-long.png` (the longest name), `previews/a-768.png` (tablet).

The chip sits at the right of the trail line ("The pass / Chicken Burger") on The Pass, and of "All recipes / Chicken Burger" on a Tiles card. To make room, the recipe's own name in the trail is trimmed with "..." when it does not fit (the full name is the heading right under it). The chip uses the book's choosing chip: outline when off with a sun icon and "Keep screen on", dark fill with a tick and "Screen on" when on (`aria-pressed`). If the phone says no after a tap: "This phone said no. Battery saver may be on." in red on one line under the trail, and the chip stays off.

- **Pros:** exactly what was asked; visible where the cook is; one tap, once; the state is in words and a tick; no line lost on the first screen (name at 301 px, allergens at 408 px, as today); works for every recipe once on.
- **Cons:** off until someone finds it, so a new starter may never turn it on; adds a control on every recipe card; trims the trail's last name ("Chicken Bur..." while off); scrolls away with the trail, so stopping mid-method needs a scroll up (or the side button).

### B. On by itself, set in Settings

Previews: `previews/now.png` (the recipe page, unchanged), `previews/b-settings.png`, `previews/b-refused.png`.

On by itself on every touch screen that supports it. The recipe page stays exactly as today. Settings, This phone, gets one row after Recipes open with: "Keep the screen on with a recipe open", value On, Off or "Not on this phone". Open, it says: "On a phone or tablet the screen stays on while a recipe is open. It sleeps as normal on every other page, when you press the side button, and after 15 minutes without a touch." with Off and On chips. When the phone refused the last request, the value says "Not on this phone" and a red line says why.

- **Pros:** zero taps for everyone, including new starters; no change to the recipe page or its tests; one quiet setting in the place the head chef chose for phone settings; the fewest moving parts.
- **Cons:** invisible: nobody can see whether it is working on the recipe page; turning it off takes 4 taps through the chef hat; a refusal is only told in Settings, where nobody looks; it changes how every phone behaves without anyone choosing it (battery on personal phones).

### C. Cook from the method

Previews: `previews/c-start.png`, `previews/c-cooking.png`.

A wide "Cook from this" button sits above the method's "Tap a step to tick it off." line, with "Screen stays on, bigger steps" beside it. Tapped, the recipe goes into a cooking state: the jump row gives way to a dark bar at the top, "Cooking: the screen stays on", with Stop; the method steps grow to 1.3 rem for reading at arm's length. Stop, or leaving the recipe, ends it. The choice is not remembered: each cook starts it.

- **Pros:** the screen stays on only when someone is really cooking, so battery and pockets are safest; bigger steps help the 2-second glance from the bench; the state is impossible to miss.
- **Cons:** 2 taps every time; the biggest build (two pull requests) and touches the method's ticks; the dark bar covers a line of the method and bigger steps show about 1 step fewer per screen; something new for the team to learn; weighing ingredients happens above the method, outside the cooking view.

### Comparison (Preview, 390 x 844 px, staff)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Taps to keep it on while cooking | none in the book (about 5 in the phone's settings) | 1, once per phone | 0 | 2, every time |
| Taps to stop it | | 1 | 4 (chef hat, Settings, row, Off) | 1 |
| Name and allergens on the first screen (px from top), The Pass | 301, 408 | 301, 408 | 301, 408 | 301, 408 |
| The same on a Tiles card | 188, 410 | 188, 410 | 188, 410 | 188, 410 |
| Lines lost on the first screen | | 0 (1 line only after a refused tap) | 0 | 0 reading; while cooking the bar covers about 1 line and big steps show about 1 step fewer |
| Visible state on the recipe | | Yes, words and a tick | No | Yes, the dark bar |
| Navigation levels | | 0 | Settings, 2 levels | 0 |
| Build size | | 1 pull request | 1 pull request | 2 pull requests |
| Relearning | | One chip | None | A new cooking state |
| New reads or rules | | None | None | None |
| Risk | | Low | Low; invisible failures | Medium (method ticks, sticky bar) |

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Default | Off | On | Off |
| Where the control is | Recipe card, top | Settings | Recipe method |
| What it covers | Every recipe | Every recipe | One cooking session |
| State shown on the recipe | Chip words | Nothing | Dark bar |
| Remembered | On this phone | On this phone | No |

## Round 2: scores (13 Nov 2026)

[To come: the council and the kitchen screen designer score A, B and C.]

## A mix of all three

[To come.]

## Recommendation

[To come.]

## Build and verification plan

[To come once a design is chosen.]
