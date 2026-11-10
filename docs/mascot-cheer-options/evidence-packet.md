# Evidence packet: the mascot cheers real finished work

10 November 2026, Queensland. The same packet for every reviewer in both rounds. Source: branch `ccr-cdd67156-ujemkx` on top of the mascot studies (`71cbf84`); the app files match `main` at `7f85629`. Screens are **Preview**: the real app with the click tests' Firebase stand-in, made-up people (Ann, staff, Lunch on Larder; Sam, sous chef) and local Barlow, Barlow Condensed and Caveat fonts. Nothing was measured in the live kitchen. This is role-based analysis, not research with staff.

**Note added after the council.** This page is kept as the reviewers saw it. It was written against this branch (`main` at `7f85629`). On `main` since then: the daily mascot on Home is built (`docs/kitchen-mascot.md`), its player and art ship in `js/mascot.js` and `art/mascot/`, and the tick keeps the On it stamp for the head chef's Time on it card (#664). See the brief, "What main has now".

## Today's book (see `evidence/sheet-today-390.png`)

- **Home:** "Welcome, Ann", the date, Your day (charcoal), On with you (sage), Prep by section (steel) with "0 of 6 done" and one bar per section ("Larder ... 3 left").
- **Prep:** notebook header "Today" with "0 of 6 done" (90 px high at 390 px). Each section has a heading row with a thin bar and "0/3". The fixed **Add a line** dock sits above the tab bar.
- **A tick:** the line is struck through, the section bar fills green, the header count goes up, and the docket slip shows across the bottom above the Add dock: "Ticked Portion rump" with **Undo** for 9 seconds. The slip is 60 px high.
- **A finished section or list:** nothing of its own. A ticked line stays 3.5 seconds, then moves to Done today, and a finished section's heading leaves with it. A finished list shows "Everything on this list is ticked off. See Done today under Handy." in grey handwriting.
- **A tick shows before the server answers** on a personal phone. A change that has not reached the server is marked **Not sent** once it has waited 3 seconds or there is no signal. A refused save shows a red slip that stays.
- **Already there:** "Top tickers, last 7 days", a medal strip ranking people by ticks (the owner can switch it off; at the bottom of the page on a phone), and a Pace box for chefs only.
- **The mascot:** the Smashed Burger star robot, 11 eight-frame pixel clips of 2.5 to 3.9 seconds. Chosen on 9 November, not built: on the first Home view of each kitchen day one clip plays once in the corner of the Welcome heading (64 x 85 px), then rests on the Welcome still. No control, no reads.

## Rules the book already has

**Service rules** (head chef, 5 November 2026): (1) the main job of each work page is one tap from its tab; (2) no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; (3) nothing appears over a list during service unless it stops a mistake; (4) a change that adds taps or takes away visible lines says why it is worth it.

**After the tap** (`docs/action-feedback.md`): 1. Answer in the tap's own frame; a list line answers at once on the slip; Saved, Sent or a green tick only once the write resolved. 2. Confirm where the eye is, in words that name what changed. 4. Nothing scrolls by itself; what was saved wears a small stamp. 5. A failure stays, red, and keeps the work. 6. Undo says Undone. 8. Colour carries meaning, never alone: orange is the accent and urgent, green (`--done-ink`) is saved and done, red is a failure. Reduce motion removes fades and slides, never the words.

**Motion** (`docs/loading-motion.md`, `docs/seasonal-celebrations.md`): motion arrives, then settles; no permanent movement beside lists; a prep checkmark never suggests an unconfirmed completion; motion never delays an action or moves a live target; reduced motion removes movement.

**Patterns** (`docs/design-patterns.md`): a tap on a list line answers on the slip with the line's name and Undo. A sheet opens on a tap, never by itself over a list. A line above a live list keeps the list header's height. The top bar takes no new button without the head chef.

**Colour** (`docs/surface-colours.md`, `docs/colour-coding.md`): work books use steel, people use sage, live boards charcoal, reading and writing stay quiet paper. State cues beat surface decoration. Status must be understandable without colour. Normal text 4.5:1, large text 3:1. Art keeps its own colours and never becomes a status colour.

**Cost** (`CLAUDE.md`): 50,000 Firestore reads a day on the free plan; no new listeners or polling; staff pages show today; anything staff must not see is locked in the rules; everything typed goes through `esc()`; pages work at 390, 768 and 1280 px.

**Design references** (service council skill): Duolingo: "Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery?" Avoid "points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement". Flighty: what matters now and next; avoid "new listeners or polling just for the look, distracting movement or stale status presented as live". Headspace: calm, short labels; avoid "vague reassurance, unexplained icons or onboarding interruptions during service". Things 3: frequent actions visible, occasional details tucked away. Linear: the work more prominent than navigation. Approved celebrations, Saved and New stamps and useful motion remain.

**Earlier council records:** the mascot "must not become a second status system, obscure staff's work, demonstrate an unverified method or imply that food is cooked safely". "Serve: never a queued/successful-save indicator." A held Serve or Ready to cook pose beside the board reads as "order up" or "station ready". No button in the named Home heading. Staff personalisation: "no personal waste scores or praise". Whole-book redesign: "Streaks, points, stamps, animations: no value in service, more motion code." All written before the owner asked for a motivating mascot.

## Research

Four researchers, 78 findings, each marked fetched at source, search result or from memory. Thin on kitchens: most workplace evidence comes from offices, warehouses, call centres and sales.

- **Duolingo** (16 of 20 findings fetched from its own blog and papers): its published wins are small cheers at real moments. A streak-extension animation lifted new learners' 7 day return 1.7%; lowering the daily bar to one lesson lifted day 14 return 3.3%; wording and a cap on volume mattered as much as art. Characters react to checked answers and take the full screen only at the end of a lesson. Critics and one study show people chase the number over the substance.
- **Other apps** (15 of 20 fetched): the cheer follows finished, confirmed work (Mailchimp's high five after send, Apple's rings), is occasional (Asana: "don't appear every time"), sits at the edges of work (Slack, Trello), and can be turned down. One study suggests novelty fades in about four weeks.
- **Work evidence** (14 of 20 at source, some as abstracts): helps: visible progress and the finish line (progress principle, goal gradient), shared team goals (d = 0.56), specific unexpected recognition (surprise thank-you cards, about +7% output). Praise that informs helps (d = 0.66); praise that controls or rates the person backfires (d = -0.44). Backfires: expected rewards scaled to performance (d = -0.36 to -0.88), rankings (removing rank feedback raised sales 11%), games nobody agreed to, feeling monitored, any reward for pace. Time pressure is a known food safety risk.
- **Bubble craft:** a speech bubble is a toast with a face. One at a time, 4 to 10 seconds, above the bottom bar, nothing that exists only in the bubble, announced once politely. All 11 clips are under 5 seconds, so played once they sit inside WCAG 2.2.2. Under about 32 px only the star and face read. Whole-number scaling keeps pixels crisp.

## The app map (from the code)

- 80 job-done moments were mapped. Honest cheer candidates: section done, list done, a line ticked after On it by the same person, an Urgent or rolled line cleared, every request ordered, all supplier orders placed, deliveries recorded, nothing still out, cleaning group or day done, all rounds of a function sent, minutes signed, the last step of a guide.
- Leave alone: the cooling clock, recipe steps, the PIN and Who are you? screens, failures, Not sent, wastage amounts.
- Everything needed is on the phone already: section counts, who ticked, the team plan. No idea in scope needs a read.
- The tick clears the On it time, so how long a line took is never stored.
- The slip is rebuilt on every redraw of the page, so a cheer on it must survive redraws and must not replay.
- The art sits under `docs/` today, which the book must not load. `sw.js` keeps any same-origin file it fetches, so mascot files need to stay out of, or bounded in, the runtime cache.

## Try to break it: families to test

Confusion and accidental action; repetition and delayed answers; failed reads and writes; interruption and handover; time boundaries; access and conflicting state; misleading presentation. For this proposal the leading cases are: a cheer shown before the server has the tick; a cheer that survives Undo; another phone's tick cheered on this screen; a cheer that covers or moves a list line or the Undo button; motion under reduced motion; missing art; long names and Extra large text; a shared tablet where the person ticking is not the cook; a cheer that reads as a status or as food safety.
