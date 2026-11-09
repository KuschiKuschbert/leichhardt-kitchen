# Let the kitchen mascot cycle through all its actions

9 November 2026, Queensland. Owner proposal for the service council, round 1. No app code has changed. Source branch `feat/kitchen-mascot-animations` at `e6cbd61` (pull request #654); application files match `main` at `7f85629`. This is role-based review, not research with real staff.

## Where this starts

The owner has eleven finished pixel-art actions for the kitchen mascot (the Smashed Burger star robot with the navy bandana): Idle, Welcome, Look around, Recipe reading, Ready to cook, Smash, Flip, Build, Serve, Walk and At the smoker. The [placement study](../mascot-placement-options/brief.md) ran both council rounds on 10 November and recommended **A: Welcome plays once (2.7 s) in the spare space beside Home's personal greeting, then a still** (6 of 6 reviewers ranked A first; the head-chef reviewer preferred a still first). The owner has not chosen yet. C, an optional closed fold with all eleven actions below Home's work, ranked second for five reviewers. The full collection already exists outside the app in the [gallery](../kitchen-mascot/index.html).

## The proposal

Having thought about placement and animations, the owner's idea is that the mascot **cycles through all its animations** instead of showing only one. Ten of the eleven are otherwise unused in the recommended design. The owner wants the whole library to be seen, so the character feels alive and the work on it pays off.

The owner has not fixed where or how often it cycles. Reviewers should judge the idea and say which form, if any, is worth building. Credible forms:

1. **Continuous showreel** in A's Home spot: all eleven play in turn, about 36 s a round, looping while Home is open and visible.
2. **One round, then still**: Home arrival plays the eleven in turn once (about 36 s), then rests on a still.
3. **A different action each visit**: each Home arrival plays the next action in the sequence once (2.5 to 3.9 s), then rests. Over a day or two staff see them all.
4. **Cycle only inside an opened collection** (C's fold): Play runs the whole set in turn.

## Facts for the reviewers

| Fact | Value and source |
| --- | --- |
| Clip lengths | Idle 3.80 s, Welcome 2.70, Look around 3.32, Recipe reading 3.65, Ready to cook 3.25, Smash 3.59, Flip 2.68, Build 3.90, Serve 3.18, Walk 2.49, At the smoker 3.80. One round 36.4 s (`docs/kitchen-mascot/assets/manifest.json`) |
| Download | Compact atlases 250 to 326 KB each, 3,136,082 bytes for all eleven. A alone loads one atlas and one still |
| A's spot, 390 px | Sprite 64 x 85 px at x310 y76, between the 64 px top bar and the first card at y169. Omitted when a long name needs the room, on locked Home and when art fails. No change to any card position (`preview-summary.md`) |
| Reads, writes, rules | None in any form. No Firestore, listeners or profile fields |
| Who sees Home | Every staff phone on arrival and on each return. Home is the now and next board, so a shared tablet or laptop may be left on it during service (not measured). Prep's Add/tick and the recipe search are elsewhere and unchanged |
| Taps / lines | Forms 1 to 3 add no taps and no lines. Form 4 keeps C's cost: open + Play after scrolling below Home's work. Prep rows above the dock at 390 px stay 4 |

## Contract excerpts that apply

- **Loading and motion** (`docs/loading-motion.md`, Behaviour): motion must never delay an action or shift a live list; reduced motion removes decorative movement; landing dockets have one small entrance per page session; a known offline event stops decorative traces.
- **Seasonal celebrations** (`docs/seasonal-celebrations.md`): Home motion "arrives, then settles": about 4 s of arrival on the first Home view of the kitchen day, then at most 4 slow pieces (2 on Subtle); returning the same day opens at rest; a hidden tab skips the arrival; Still and reduced motion stop it. Seasonal art may be on Home at the same time as the mascot.
- **Placement study boundaries** (`../mascot-placement-options/brief.md`, What the full library is for): Idle "no permanent movement beside lists"; Look around "no tracking or glancing that implies alerts"; Recipe reading "never a recipe-loading indicator"; Ready to cook "does not assert a station is ready"; Serve "never a queued or successful-save indicator"; Walk "never walks over the app"; At the smoker "not temperature, time or doneness"; Welcome "never replay on clock paints".
- **Service rules**: nothing appears over a list during service unless it stops a mistake; no pop-up or new button on a service page without the head chef's OK.
- **Action feedback** (`docs/action-feedback.md`): Saved only after the server answers; the mascot must not look like feedback.

## Cost

Docs-only preview first, then (if chosen) a small shared sprite player with a sequence, the Home hook from A, stylesheet rules and lifecycle tests (hidden tab, offscreen, reduced motion, offline, missing art, update/reload). Form 1 and 2 download up to 3.1 MB per device; that can be spread out or cached, but it is about ten times A's art. Forms 3 and 4 load one atlas per play.

## Design references to test

Flighty (no distracting movement, nothing stale shown as live), Headspace (calm, no interruption), Things 3 (occasional things tucked away), Duolingo (no decorative rewards that look like progress). Linear's work-first frame applies to the Home spot.

## Questions for round 1

Is cycling worth building, and in which form? Does continuous movement on Home break "arrives, then settles", especially on a shared screen left on Home in service and alongside seasonal art? Could any action (Ready to cook, Serve, Look around, Recipe reading) be read as a status? Which form gives the owner the most of the library for the least distraction, download and maintenance?
