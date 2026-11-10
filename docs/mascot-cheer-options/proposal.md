# Proposal: the mascot cheers real finished work

10 November 2026, Queensland. Written for round 1 of the service council, before any design was scored. No app code has changed.

**Note added after the council.** This page is kept as the reviewers saw it. It was written against the study's own branch (`main` at `7f85629`). On `main` since then: the daily mascot on Home is built (`docs/kitchen-mascot.md`), its player and art ship in `js/mascot.js` and `art/mascot/`, and the tick keeps the On it stamp for the head chef's Time on it card (#664). See the brief, "What main has now".

## The problem in the kitchen

The owner wants the team to get prep done and to use the book more, and wants the mascot to be the cheerful supporter: "if someone started and finished a task give him a cheer", "across the whole board", "maybe some kind of speech bubbles".

Today the book answers every tick with the same plain slip, "Ticked Portion rump" with Undo. Finishing a section or the whole list shows nothing of its own. The section's heading leaves the page 3.5 seconds after its last tick. A finished list shows one grey sentence, "Everything on this list is ticked off. See Done today under Handy." The mascot is not in the live book at all: his daily action in Home's heading corner is chosen but not built.

## Who has it, and how often

Every cook, every shift. From the code paths, not measured in the kitchen: a cook ticks 5 to 30 lines a day; a section is finished about once per section per day, so 3 to 8 times a day across the kitchen; the whole list at most once a day, and on many days never.

## What people do today

They read the header count ("2 of 6 done"), the thin bar and "1/3" on each section heading, and Home's Prep by section card. The Prep page also carries "Top tickers, last 7 days", a medal strip that ranks people by ticks (the owner can switch it off), and a Pace box for chefs only.

## The change

A small system, not one screen.

1. **When.** Only at finish lines the page can count: a section fully ticked, the whole list ticked. Later the same rule on other pages: every line ordered, pack down done, all rounds out, deliveries recorded. Never on an ordinary tick. Only after the server has the tick: a line that is Not sent, or a refused save, is never cheered. Undo takes the cheer back.
2. **What.** The mascot, as a still or one short clip played once, and a speech bubble whose words name the thing and its count: "Larder is done. Grill has 2 left." Never a person, never the clock.
3. **Where.** For round 2 to design. Three structures are on the table: inside the slip the book already shows at the tick; at the edges of the work (Home, a finished list, an empty page); on the progress bars the book already draws.
4. **Control.** One row in Settings per device: Cheers, Words only, Off. Reduced motion acts as Words only.
5. **Not in it.** Points, streaks, ranks, speed praise, sound, pop-ups, and anything on cooling records, PIN screens, failures or Not sent.

## Cost

- **Reads and rules:** none. Every number is already on the page.
- **Files:** a small sprite player and bubble. A still is about 44 KB and a clip sheet about 290 KB, fetched on first use and kept out of the saved shell.
- **Settings:** one new row, a head chef decision.
- **Tests:** no cheer before the server answers, Undo, another phone's tick, reduced motion, missing art, long names, no moved rows, no extra reads.
- **Risk:** it becomes noise, a second status system, or pressure to tick.

## Design references to test

Duolingo: does each tap answer truthfully, does progress show real completed work; avoid decorative rewards without a kitchen job. Flighty: no distracting movement. Headspace: calm, short words; no vague reassurance. Things 3: occasional detail stays tucked away.

## Earlier council lines this meets head on

The placement study said the previews add no "mascot save celebration" and that Serve is "never a queued/successful-save indicator". Staff personalisation said truthful feedback is "not a reason to add points, streaks or praise". The whole-book redesign left out "streaks, points, stamps, animations: no value in service". Those were written before the owner asked for a motivating mascot. The question for round 1 is whether a truthful, rare, team-worded version is worth building, and how small.
