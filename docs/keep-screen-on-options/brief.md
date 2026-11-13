# Keep the screen on with a recipe open

Requested by the head chef on 13 November 2026: "In my app when on a mobile device can we have the option in the recipes for a leave screen on toggle? ... It's annoying having the recipes open and the screen turns off." **Not chosen yet.** Recommended: the combined design (A's chip on the card + B's Settings row), off until a cook taps it. This brief holds the council's two rounds, three designs, the mix and the recommendation. The previews are screenshots of the real recipe page in the click-test stand-in, with each design drawn into it; nothing in the book has changed.

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

Six fresh reviewers (the five from round 1 and the kitchen screen designer) saw all three designs, the same contract excerpts, the previews and the measurements. Scores out of 10 (10 = best for the kitchen), as each reviewer gave them. All six said the designs differ in structure (default, where the control lives, and what it covers), not just in looks.

| Reviewer | A | B | C | Recommends |
| --- | --- | --- | --- | --- |
| Cook mid-service | 7 | 6 | 3 | A + B: on by itself, the chip as the one-tap off |
| Head chef | 8 | 6 | 3 | A, off until tapped; a Settings row is optional |
| Skeptic | 7 | 5 | 3 | A, off until tapped, no Settings row |
| New starter | 7 | 6 | 4 | A + B: on by itself, Settings holds the same choice |
| Keeper | 8 | 6 | 4 | A with B's Settings row on one helper, off until tapped |
| Kitchen screen designer | 7 | 5 | 3 | A's chip + B's default + B's Settings row |
| **Total** | **44** | **34** | **20** | |

**Every reviewer ranked A first and nobody kept C.** Four of six want B's Settings row as well. The **default** is a 3 to 3 split: on by itself (cook, new starter, screen designer: a new starter gets it with no taps) against off until tapped (head chef, Skeptic, Keeper: it is what was asked, personal phones are their owners' choice, and every untested failure would land on phones nobody switched on).

What the reviewers found, and what the combined design does about it:

| Finding | Who | Combined design |
| --- | --- | --- |
| "Chicken Bur..." reads as broken. Measured after: 47 of 128 names would be cut on The Pass at 390 px, most on Tiles; wrapping instead costs 28 to 49 px | Screen designer, head chef | On phones the trail drops the recipe's own name, which is the heading right under it. Parent links stay. Nothing is cut and no line is lost |
| The dark "on" pill is the darkest shape under the top bar; a chosen control should be orange | Screen designer, cook, Skeptic | On is an orange edge and orange words (`--small-ink`) on plain paper, with a tick. Not the `--hit` tint, which the follow-up found looks like the may-contain allergen tag |
| After the 15-minute release the chip shows off; does the next tap ask again or switch it off? | Keeper, Skeptic, cook, head chef, new starter | The chip follows the real hold, and a tap always does what its words say. The chip is left out of the page-wide touch that asks again |
| "This phone said no." does not say what was refused | New starter | "This phone will not keep the screen on. Battery saver may be on." |
| B's "Not on this phone" beside a pressed On contradicts itself and goes stale | Screen designer, new starter, Keeper, Skeptic | The Settings row shows only the choice; no remembered refusal |
| An iPad home-screen app may not show its iOS version | Keeper | Not offered in a home-screen app on an Apple touch screen whose version cannot be read |
| C's bar covers a method line, replaces the pinned jump row and fights a remembered choice; Text size already makes steps bigger | All six | C left out |

### How the designs fit the seven-app principles

| Principle | A | B | C |
| --- | --- | --- | --- |
| Things 3: frequent action visible, details tucked away | Works: the chip is on every recipe | Needs work: the only control is 4 taps away | Needs work: a mode to start every time |
| Todoist: known defaults | Needs work: off until found | Works: on by itself | Needs work: off every time |
| Flighty: real status, never stale | Works if the chip follows the hold (Not evidenced until built) | Needs work: no status on the recipe; the refusal goes stale | Needs work: "the screen stays on" in large words where the browser can be wrong |
| Duolingo: each tap answers truthfully | Works: the words change in place | Not evidenced: a Settings tap far from the recipe | Works: the bar appears |
| Headspace: plain words, no interruptions | Works: words on the chip | Works: nothing on the page | Needs work: a dark bar over the method during service |
| Linear: one way to do a job | Works | Works | Needs work: a second mode beside Text size |
| Airbnb: status and action together | Works | Needs work | Works |

### Contract fit

| Check | A | B | C | Combined |
| --- | --- | --- | --- | --- |
| Service rules 1 to 4 | Works: finding a recipe unchanged, no pop-up, no line lost | Works | Needs work: rule 3 (a bar over the method), rule 4 (2 taps every time) | Works: 0 lines lost in every case measured |
| Phone's first screen (name, yield, allergens before the drawing) | Works | Works | Works | Works |
| Sticky jump row (`docs/design-patterns.md`, A long card) | Works | Works | Fails: the bar replaces it | Works |
| Choosing chip, 44 px | Works | Works | Works | Works: 44 px, measured |
| Operational colour: chosen controls orange | Needs work: ink fill | Works | Needs work: charcoal live-board surface | Works: orange edge, words and tick |
| Action feedback: answer in place, failure stays | Works | Needs work: refusal only in Settings | Works | Works: refusal line until the next tap or leaving |
| Rendered contrast | Not evidenced (calculated: ink on paper 16.9:1, `--bad-ink` on the page 7.5:1) | Not evidenced | Not evidenced | Not evidenced (calculated: `--small-ink` words and edge on the page 5.4:1, above 4.5:1 for text and 3:1 for the edge) |
| Recipe hierarchy links stay as quiet breadcrumbs (`docs/navigation.md`) | Works, name trimmed | Works | Works | Works: parent links kept; the page's own name hidden on screen on phones only, kept for screen readers |
| Reads, writes, listeners, rules, security header | None | None | None | None |

## A mix of all three

| From | Part | Take or reject | Why | Principle |
| --- | --- | --- | --- | --- |
| A | The worded chip on the trail line, remembered on this phone | Take (6 of 6) | The state and the off switch where the cook looks | Things 3, Airbnb |
| A | Trimming the recipe's own name | Reject | Reads as broken; 47 of 128 names cut at 390 px | Headspace |
| A | Dark ink fill when on | Reject | A chosen control is orange | Contract |
| B | The Settings row on the same saved choice | Take (4 of 6) | Explains the 15-minute rule and gives a second way to find it | Things 3 |
| B | On by itself | Head chef's call (3 to 3) | Zero taps against owner's choice and untested failures | Todoist |
| B | Remembered refusal in Settings | Reject | Stale status | Flighty |
| B | Not drawing the control where the phone cannot do it | Take | No promise the phone cannot keep | Flighty |
| C | The cooking mode, bar and bigger steps | Reject (6 of 6) | Covers the method, replaces the jump row, a second way beside the remembered choice and Text size, two pull requests | Headspace, Linear |
| C | The words "the screen stays on" | Take in the Settings explanation | Plain words | Headspace |

**All three together loses:** C's one-session mode next to a remembered choice gives two controls for one lock, doubles the build and breaks rule 3. **A + B beats A alone** for four of six reviewers, because the Settings row explains the rule at no cost on the recipe page. The combined design below is that A + B, with the round 2 fixes.

### The combined design

Previews: `previews/mix-off.png`, `previews/mix-on.png`, `previews/mix-refused.png`, `previews/mix-tiles.png`, `previews/mix-nested.png` (a linked part), `previews/mix-long-on.png` (the longest name), `previews/mix-320-large-burger.png` (320 px, Large text), `previews/mix-768-normal-tiles-burger.png` (tablet, Tiles), `previews/mix-settings.png`.

| State | Chip | A tap |
| --- | --- | --- |
| Off, or chosen but not held right now (15 minutes without a touch, the page hidden and back, the phone refused by itself) | Outline, "Keep screen on", not pressed | Saves on and asks the phone |
| Held | Orange edge and words on plain paper, a tick, "Screen on", pressed | Lets go and saves off |
| Refused after a tap | "Keep screen on" with a red line under the trail: "This phone will not keep the screen on. Battery saver may be on." | Asks again |

With the choice saved on, the book asks by itself on every recipe page, when the book comes back on screen, and on the next touch after the 15 minutes. On phones the trail shows the parent links only ("The pass", or "The pass / Chicken Burger" on Ranch).

Measured (Preview, name and allergens in px from the top, today then combined):

| Case | Today | Combined |
| --- | --- | --- |
| The Pass 390, Chicken Burger, chip off or on | 301, 408 | 301, 408 |
| The Pass 390, Calamari (longest name) | 301, 611 | 301, 611 |
| The Pass 390, Large text, Calamari | 347, 722 | 315, 691 |
| The Pass 390, Extra large, Calamari | 369, 785 | 334, 750 |
| 320 px, Calamari | 325, 659 | 297, 631 |
| 320 px, Large text, Chicken Burger | 311, 500 | 311, 500 |
| Tiles 390, Chicken Burger | 188, 410 | 188, 410 |
| Tiles 390, Calamari | 211, 600 | 188, 576 |
| Tiles 768, Chicken Burger | 237, 434 | 237, 434 |
| Linked part, Chicken Burger / Ranch | 301, 432 | 301, 432 |
| After a refused tap, Chicken Burger | | 362, 470 |

The chip is 44 px tall and keeps one width in both states, 133 px (149 to 165 px at Large and Extra large), so it does not jump when the phone wakes. No sideways scroll at any width tested. Taps to keep the screen on: 1, once per phone (or 0 if the head chef chooses on by itself); to stop: 1.

Today's tab bar labels already run together at 320 px with Large text (seen in the follow-up, and in today's page with nothing drawn in). That is not part of this design; it is noted for its own fix.

**Review status:** lead synthesis from the six round 2 reviews, then a focused follow-up on the combined preview by the three reviewers whose findings it changed most. It is not a new full round.

| Reviewer | Their A | Combined | What they said |
| --- | --- | --- | --- |
| Kitchen screen designer | 7 | 8 | One layout and flow. Both findings fixed. New: the peach tint looked like the "Soy?" tag (now plain paper with an orange edge); the chip changed width on waking (now one width); the Settings row's ink chips differ from the card's orange; a refusal pushes the name down 61 px; the trail change needs `docs/navigation.md` and the phone-first tests updated. |
| New starter | 7 | 8 | On, off and refused are clear without colour; refusal words fixed. "Screen on" reads more as a status than a button. After the 15 minutes nothing says why it changed. Off and paused look the same. |
| Keeper | 8 | 8.5 | Break-it 1 (a tap after the 15-minute release) closed, if only one request is in flight and the chip acts on the words shown when the finger went down. New risks: a refusal loop if every touch asks again; the hidden name must use `.visually-hidden`; one width query and its opposite at 600 px; an iPad home-screen app with no readable version. |

### Break-it findings after round 2

| Scenario | Expected | Observed or hypothesis | Status | Repair or check |
| --- | --- | --- | --- | --- |
| Choice on, 15 minutes without a touch, the cook taps the chip | One tap holds the screen again | The tap could ask and switch off at once | Risk / Not evidenced | The chip follows the hold; a tap does what its words say; the chip is left out of the page-wide touch; one request in flight. Stub test: lock granted late, two quick taps, one live lock |
| Battery saver refuses, choice on | One request, then quiet | Every touch on the page asks again | Risk / Not evidenced | After a refusal, ask again only on a chip tap or when the book comes back on screen. Stub: refuse, tap the page 20 times, one request |
| iPhone or iPad home-screen app before iOS 18.4 | Not offered | Offered, says on, screen sleeps | Risk / Not evidenced | Not offered when the version is below 18.4 or cannot be read on an Apple touch screen. Stub the user agent, touch points and home-screen mode; then a real device |
| Screen reader on a phone | The current page is still read out | The hidden name is not read | Risk / Not evidenced | `.visually-hidden`, never `display: none` or `aria-hidden`; a check in the trail test |
| Phone in a pocket, choice on | Sleeps within 15 minutes | Stays lit | Risk / Not evidenced | The 15-minute release; stub with the test clock |
| Shared tablet idle or 04:00 lock | Lets go | Stays lit behind the PIN screen | Risk / Not evidenced | Let go on both locks; shared-screen fixture with the stub |
| Recipe to recipe, back to Recipes, hidden and shown | 1, 0, 0 then 1 live locks | Leaks or misses a lock | Risk / Not evidenced | Stub counts live locks on each path |
| A refused tap | The words stay until the next tap or leaving | | Checked in the preview (the words and their place only) | Name moves down 61 px, two lines, only after a refused tap |

## Recommendation

**Recommend the combined design: A's chip on the card + B's Settings row, off until a cook taps it.** Leave C out.

- **Why it beats the alternatives.** Every reviewer ranked A first (44 points against B's 34 and C's 20), and the three focused follow-ups scored the combined design above their A (8, 8 and 8.5). The cook sees the state in words where they look, turns it on with one tap once per phone, and turns it off with one tap. Settings explains the 15-minute rule without adding anything to the recipe. No recipe loses a line at any width or text size measured, and long names gain room because the trail no longer repeats the heading on phones. No reads, writes, rules or new files.
- **App principles that help:** Things 3 (the frequent action stays visible), Flighty and Duolingo (the chip says "Screen on" only while the screen really is held, and a tap answers in place), Headspace (plain words, no icon to learn, no pop-up), Linear (one way to do it: C's second mode is out).
- **Main downside:** off until someone taps it, so a new starter may not find it on their own phone. "Keep screen on" in words at the top of every recipe makes that likely to be noticed, and switching the default to on later is a one-line change once real phones pass.
- **The question for the head chef: on by itself, or off until tapped?** The council split 3 to 3. The recommendation is off until tapped for the first release because it is what was asked, a personal phone is its owner's choice, and the untested failures (old iPhone home-screen app, battery saver, pocket) would otherwise reach phones nobody switched on.
- **Also the head chef's call:** the trail on phones drops the recipe's own name ("The pass" instead of "The pass / Chicken Burger"). It is the heading right under it, so nothing is lost, but it changes every recipe page on a phone. The alternative is trimming it ("Chicken Bur...") on about 47 of 128 recipes.
- **Disagreement kept:** the Skeptic wanted no Settings row; the head chef reviewer called it optional. The cook, new starter and screen designer preferred on by itself. The screen designer would prefer the Settings row's Off and On chips in the same orange as the card; they stay like Text size beside them.
- **Unresolved until built:** rendered contrast, reduced motion, every Break-it row above, and the real-device checks below.

## Build and verification plan

One pull request once the head chef chooses, so every phone reloads once.

- `js/app.js`: one helper owns one lock. It holds only on a recipe page (`#/r/...`, The Pass or Tiles), when the saved choice is on (or after a chip tap), the book is on screen, it is a touch screen with a wake lock, it is not an Apple home-screen app below iOS 18.4 or with no readable version, a shared screen is not locked, and there was a touch in the last 15 minutes (`LK_TIME.now()`). One request in flight. The chip shows "Screen on" only after the browser grants the lock and goes back on its `release` event. After a refusal it asks again only on a chip tap or when the book comes back on screen. The chip acts on the words shown when the finger went down. Lets go on leaving recipe pages and on the shared idle and 04:00 locks.
- The chip in the trail on both layouts (`.wk`, the choosing chip's corners and 44 px, an orange edge and words when on, one width for both labels). On phones the recipe's own name in the trail uses `.visually-hidden`, with one width query and its opposite.
- Settings, This phone: "Keep the screen on with a recipe open", Off and On, the same saved key (`wake` in `lk.settings.v1`).
- `css/app.css`: the chip and the trail rule, from existing tokens.
- `docs/design-patterns.md` and `tests/design-patterns.test.js`: the new trail chip pattern. `docs/navigation.md`: the trail on phones. `README.md`, `docs/session-map.md`, `docs/head-chef-decisions.md`.
- Tests, a new `tests/keep-screen-on.test.js` with a stub `navigator.wakeLock` that counts live locks, can refuse, can grant late, and a forced visibility state with the test clock: off by default; one tap holds and is remembered after a reload; tap again lets go; recipe to recipe 1 lock; back to Recipes 0; hidden 0, shown 1; 15 minutes without a touch 0, then 1 after a touch; a refusal shows the words and one request after 20 page taps; two quick taps with a late grant give 1; shared screen idle lock 0; no wake lock or an old Apple home-screen app shows no chip; the hidden trail name is still the current page for a screen reader. Update `tests/phone-first.test.js` and any trail test, and run `tests/roles.test.js` (signed out included) and the 390, 768 and 1280 px page checks.
- Real devices after merge: Android Chrome, Samsung with battery saver on, iPhone Safari, an iPhone home-screen app on 18.4 or later (and one older, which should show no chip), the shared tablet through an idle lock and the 04:00 reload.
