# Proposal: the mascot a little more present on the kitchen's shared screens

17 November 2026, Queensland. Round 1 of the service council. No code, no design yet.

## The problem in the kitchen

The owner, 17 November 2026: "ive ben checking our mascot and the motivation on the shared kitchen screens and since constantly put new things on the preplists and tick things off the prep list barley ever finishes completely, id like the mascot be a tiny bit more dominant."

- **Who:** every cook at the five shared section screens (21 to 24 inch, 1920 x 1080, shared kitchen screens that everyone uses for everything, a 10 minute idle lock, a PIN per person; owner, 11 November 2026).
- **How often:** every shift. On Prep the mascot only shows when a whole list is finished (the All list's card) or, from 900 px wide, when a section is finished on its own tab. Both need every line of that view ticked and on the server.
- **What people see today:** on the All list mid-shift, nothing of him on Prep ([0-all-1920.png](evidence/0-all-1920.png)). On a section's own tab with one line left, nothing ([0-pans-1920.png](evidence/0-pans-1920.png)). On Home, 64 x 85 px in the heading corner, once per person per day on the first sign-in ([0-home-1920.png](evidence/0-home-1920.png)). On a finished section, the slip says "Pans are done. Grill has 1 left." in 16 px words for up to 9 seconds.

## Why the finish is rare (read in code, not measured in the kitchen)

1. **Lines keep coming.** Any new line, from any screen, makes the list unfinished again (`finOk()` in `js/prep.js`: every line of today's own list ticked and on the server).
2. **Tomorrow's lines count against today.** Lines written tonight for tomorrow sit on today's list under "Tonight, for tomorrow" (`tonightLine()`, cut by `cutFor()`). They are open, so once tomorrow's list is started, today's list cannot read "Every line ticked" until tomorrow. The slip's section sentence already passes them over (`secNext()`); the finished card does not.
3. **Open lines roll over.** A line still open at the end of the day rolls to the next day, so a day can start unfinished.

How often the whole list or a section actually finishes is not known: no count of it is kept, and the council did not read the kitchen's real data.

## The change, as directions to judge (not designs)

1. **Make today's finish reachable.** Lines under "Tonight, for tomorrow" no longer stop today's finish. The card would say, for example, "Every line for today ticked. 14 of 14." with tomorrow's lines left as they are. No new place for him; the existing card and Serve play happen more often.
2. **A finished section on the All list gets him too.** Today only the slip says it (words, 9 seconds). From 900 px wide the finished section could keep a short, still note in the page where its lines were, with him small beside it, until the section gets a new line.
3. **He stays on Prep on wide screens, away from the list.** The Handy page (right-hand page) has about 400 px of empty paper under Done today at 1920 x 1080. He could stand there as a still, with one line of real progress from lines the screen already holds ("7 of 14 ticked. Pans has 1 left."), and give one short play when a section or the list is finished. Nothing beside the list itself. Phones and tablets unchanged.
4. **Bigger on Home on wide screens.** Home has about 450 px of empty room below its cards at 1920 x 1080; he is 64 x 85 px in the heading corner.
5. **Halfway and other progress moments.** One cheer when today's list crosses half ticked, said once a day.

The owner said "a tiny bit". Any one of these, or a small mix, may be enough.

## Cost

- No Firestore reads, writes, listeners or rules in any direction: every count comes from lines the screen already holds.
- Files: `js/prep.js`, `css/app.css`, `js/mascot.js` (lazy) at most; art already exists (11 actions, stills). Directions 3 and 4 fetch one still per device, as the finished card does.
- Tests: `tests/mascot-wide-finish.test.js`, `tests/mascot-finished-list.test.js`, `tests/mascot.test.js` change; a new placement needs click tests at the widths it exists.
- Risk: direction 1 changes a truth rule; 2, 3 and 5 change round 1's rule of the wide-screen study ("nothing shows, moves or plays on a work page while a line is left on the view in front of the cook"), which is the owner's to change.

## Design references to test

- **Duolingo:** progress shows real completed work with a clear next step; no decorative reward.
- **Flighty:** what matters now and next from data already held; no distracting movement; no stale status shown as live.
- **Things 3:** today's work stays in front; occasional things stay out of the way.
- **Headspace:** calm, short words; one name for each thing.
- **Linear:** the work more prominent than decoration; one frame.
- Airbnb and Todoist: likely not relevant (no booking context, no adding a line changes).
