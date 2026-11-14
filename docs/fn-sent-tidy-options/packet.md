# Function sent, lines off: council evidence packet

Source commit: `6f706fe` (main, 14 Nov 2026). Repo copy for reading: this worktree. All facts below are from source review unless marked otherwise. No screenshots or measured line counts were taken for round 1: those are **Not evidenced** until round 2.

## The head chef's request (14 Nov 2026, in their words)

"Once a function is clearly prepped and sent out, remove all the prep tasks and order tasks for said function."

Asked two follow-ups, the head chef chose:

1. **When:** as soon as the last round of the function is ticked **Sent** (not at the end of the day, not a separate "Function done" button).
2. **Which lines:** the function's platter prep lines, its Function stock order line (and its changed, cancelled and restored notices), **and** the ingredient lines added from "What the platters need". Those are not linked to a function today, so they need a link from now on.

## What happens today (source)

A function is a booking (`js/functions.js`). Confirmed, it makes three kinds of kitchen lines:

| Line | Where and when | What happens after the function went out |
| --- | --- | --- |
| **Platter prep lines** "Pizza Platter: Smith 50th, from 18:30", "5 platters" | Prep list on the function's own day, its own **Functions** tab with an open count (`prepOps()`; id `fn-<function>-<platter>`, field `fn`). Never roll over (`rollSource()`, `js/prep.js`). | Any line nobody ticked stays open on that day, and the Functions tab keeps its count until the day ends. |
| **Function stock order line** "Function stock: Smith 50th, Sat 31 Oct: 3 Antipasto, 4 Aussie", "7 platters" | Order list on the order day (latest Sunday 4+ days before, or today) (`orderOps()`; id `fn-<function>`). Changed / cancelled / restored notices have suffixed ids. | It **rolls over every day until a chef ticks it Ordered or removes it**, also after the function is over. Rolled copies keep `root: fn-<function>` but drop `fn`. The Orders tag ("Order today", "Not ordered yet") stops on the function's day; the line itself does not. |
| **Ingredient lines from "What the platters need"** "Party pies", "50 pieces" | A folded list on Prep, for today's and tomorrow's confirmed functions, adds each platter ingredient summed across platters. **Add** puts it on Prep as a normal line in the cook's section (`fnNeedAdd()`). If an open line for the same thing is already there, it merges into it (`addToTwin()`). | A normal line: rolls over every day in its section until ticked or removed. Nothing links it to the function. One ingredient can serve two functions ("Smith 50th: 5 platters, Jones: 3 platters"). |

What people do today to clear them: tick each line, or remove each line (Remove needs the **Delete** capability; on Orders also a chef). Ticking a line that was never really ticked writes a false "done by" record that the 03:00 learning counts and Reports, Records then use.

**Sent** (`tickSent()`, `js/functions.js`): each round of a function has a Sent button on the function sheet and the service view `#/fn/now`. Record `fnsent/<function>_<round time>`. **Anyone signed in with their own PIN** may tick it. Undo: the same person within 2 minutes, or a sous chef / head chef any time. After a tick the book says "Round 2 ticked as sent." to the screen reader only; a failure shows a red slip.

Reads already running on every kitchen phone: one functions listener (`kq` from 00:00 today; `kq` is the function's end, so yesterday's evening function is **not** in the list after midnight), and one `fnsent` listener (day from yesterday). Prep and Orders already hold today's lines.

Nightly server job at 03:00 (`nightly-learning.yml`, `scripts/nightly-*.mjs`, service account) does learning counts, summaries, Records. The phones roll Prep and Orders over when the first phone opens the new kitchen day.

## The proposal

When **every round** of a confirmed function is ticked Sent, that function's **open** lines come off the lists:

- its platter prep lines (Functions tab);
- its Function stock order line, rolled copies included, and its changed / cancelled / restored notice lines;
- ingredient lines added from What the platters need **for that function**. From now on Add links the line to the function(s) it was added for. A line that serves two functions comes off only when both are sent. A line that merged into a line the kitchen already had is not taken off (the kitchen's own line stays).

Ticked and ordered lines stay as they are (records, learning, Reports). Nothing is deleted: lines are taken off the way Remove does (they show under Removed lines), with "Function sent" as who took them off. If a Sent tick is undone, the lines come back.

Not in scope: cancelled functions (already handled by Cancel), draft functions, lines a person typed by hand that mention the function.

### Technical approaches for the Keeper (not decided)

- **T1, write at the tap.** The phone that ticks the last round also writes the removals in the same batch. Problem: anyone may tick Sent, but Remove needs Delete (and a chef on Orders). Needs a new narrow rules path. Proving "all rounds sent" in rules means one rules read per round (up to 8) per line: expensive, near the rules' access limits. Undo Sent must write the lines back.
- **T2, no writes, worked out on each phone.** A line linked to an all-sent function is shown as taken off on every phone from the listeners it already has. Undo Sent brings it back at once. Gap: after midnight yesterday's function leaves the functions list, so the rollover cannot tell and would copy the line again.
- **T3, T2 during the day + the 03:00 server job writes the removal.** The service account takes off the open lines of every function whose rounds were all sent (on the function's day and any rolled copy since), before the learning counts. No new client rules path for removal. A phone that rolls over between midnight and 03:00 copies a line the job then takes off.

The ingredient link needs a new stored field on prep lines (not `fn`, which triggers the function-line rules), carried by the prep rollover.

Cost estimate (source review): no new listeners or reads on the phones; T3 adds a few reads to the 03:00 job. Files: `js/functions.js`, `js/prep.js`, maybe `firestore.rules`, a nightly script, tests, docs.

## Current contracts (excerpts)

**Service rules (CLAUDE.md, head chef 5 Nov 2026):** (1) the main job of each work page is one tap from its tab; (2) no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; (3) nothing appears over a list during service unless it stops a mistake; (4) a change that adds taps or takes away visible lines says why it is worth it: count taps and lines on a 390 px phone, before and after.

**After the tap (`docs/action-feedback.md`, The rule):** 1. Answer in the tap's own frame; a pending write says Not sent, never Saved before the server answers. 2. Confirm where the eye is, in words that name the thing ("Added Slice tomatoes to Sauce"); never "Done" alone. An add, tick or remove on a list line uses the docket slip (`toast()`), with Undo where it can be undone. 4. Leave the person where they are; nothing scrolls by itself. 5. A failure stays, red, until OK, and keeps the work. 6. Undo says "Undone: ...". 8. Colour never alone: orange is accent, urgent, rolled and counts; green is saved and done; red is failure.

**Function cancellation precedent (`docs/function-cancellation.md`):** Cancel takes a function's lines off Prep and Orders in the same batch as the booking change. Completed prep ticks and order ticks are kept. A past order gets an explicit "Function cancelled, check the order" notice line. Home's card says "Its platters are off the prep and order lists."

**Platter prep lines (`js/functions.js`, comment over `prepOps()`):** a line the kitchen removed stays removed until the booking changes. Ticks are never touched, lines never roll over and never merge with the kitchen's own lines.

**Order reminder (`orderOps()`):** rolls over until someone ticks it ordered, like any order line; ordered is never sent from here. A change or cancel after the order day adds a notice line today.

**Orders tag (`docs/code-contracts.md`, Functions):** the tag matches the line's `root` to `fn-<function>`; a change to `orderBody()` words, the order line ids or the fields the order rollover copies must keep this match.

**Coding rules (CLAUDE.md):** every write through `W()`; no new listeners or polling; an answer from the cache is not "nothing there"; never guess, never save nothing; a merge keeps what is stored (test a second writer); walk every role through the change; staff-visible text through `esc()`.

**Colour (`docs/surface-colours.md`, Selected design):** work books (Prep, Orders) use steel covers; amber is named attention or pending; green confirms the stated success; red is errors. Keep words, ticks and pressed states; local state beats surface decoration.

## Design references (`.claude/skills/service-council/SKILL.md`)

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Consistent frame, action placement, names; work more prominent than navigation | Tiny dense controls, keyboard-only paths, a second navigation |
| Things 3 | Today's work distinct from upcoming; occasional details tucked away, frequent actions visible | Drag-only actions, hiding Urgent, Recipe, On it |
| Airbnb | Time, place, requirements, status and next action together | Decorative cards that displace lines |
| Todoist | Quick add, visible defaults, usual items easy | Guessing section, unit or quantity |
| Flighty | What matters now and next, real times and status from data already read | New listeners or polling for looks; stale status shown as live |
| Duolingo | Each tap answers truthfully; progress shows real completed work | Rewards without a kitchen job; Saved before acknowledgement |
| Headspace | Calm, short labels, one name per thing, words on actions | Vague reassurance, unexplained icons, interruptions in service |

## Try to break it (families to apply)

Confusion and accidental action; repetition and delayed answers (double tap, Undo while an answer is delayed); failed reads and writes (no signal, held write, refusal; a cache answer is not "nothing there"); interruption and handover; **time boundaries** (Queensland midnight, the 03:00 job, the morning rollover, a function running past midnight); access and conflicting state (wrong role, two writers); misleading presentation (could a hidden line look done or ordered when it was not?). Report scenario, role/state, expected vs observed or hypothesis, impact, evidence status (Reproduced, Checked in a fixture, Risk / Not evidenced), smallest repair or check.
