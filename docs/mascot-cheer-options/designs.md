# The designs for round 2

10 November 2026, Queensland. Written for the six round 2 reviewers, with no recommendation in it. Read with the [evidence packet](evidence-packet.md). Every screen is a **Preview**: a review-only injection (`candidate.js`, `candidate.css`, `cheer-core.js`, all in pull request #670) into the real app, with the click tests' Firebase stand-in, made-up people (Ann, staff, Lunch on Larder; Sam, sous chef) and local Barlow, Barlow Condensed and Caveat fonts. Nothing is built into the book.

**Note added after the council.** This page is kept as the reviewers saw it on 10 November. Since then the daily mascot on Home is built, and two parts of these designs are built and live on `main`: B's card under a finished list, cut down (#671), and A's sentence on the slip, as words only (#673). The built versions differ from these drawings, and nothing else here is built. The Not evidenced list at the end is as it stood that day. The current contract is `docs/kitchen-mascot.md`; the recommendation and what was chosen are in [the brief](brief.md).

## Round 1, in short

Build smaller, 5 of 5. The reviewers judged the proposal from today's screens only, before any design existed. All five: the words are the feature ("Larder is done. Grill has 2 left."); Prep and Home only; no clips on a work page; no other pages and no Settings row yet. All five accepted the edges of the work. Two accepted the slip as words only at its 60 px height with Undo unmoved (cook, new starter); three rejected the slip (head chef, skeptic, keeper). All five rejected art on the progress bars from the description. The skeptic would cheer the finished list only. Their leading failure cases were built into the checks below.

## What every design shares

- **Finish lines only.** A section of two or more lines fully ticked, and the whole list ticked. An ordinary tick is exactly today's: "Ticked Make gravy" with Undo. A section of one line is an ordinary tick (skeptic, round 1).
- **Only after the server has the tick.** A tick waiting to be sent, or refused, is never cheered. Undo takes the cheer back. Another phone's tick changes the count and cheers nothing on this screen.
- **Once per finish line per kitchen day on a device.** A line added to a finished section and ticked again does not cheer a second time.
- **Words that name the thing.** The section, the count, or what is next. Never a person, never the clock. The variant comes from the kitchen day and the section, not chance.
- **Art.** The pixel sprite at whole-number scale. One clip only, the Serve wink (3.2 seconds), played once, then a still. Reduced motion, or art that did not load, leaves the words.
- **No reads, no new control, no added tap, nothing on any other page.** Orders was exercised once as a sous chef only to show the same rule holds there.
- **Home's heading corner** shows the mascot at rest in every design: that is the daily action chosen on 9 November, drawn for place.

## A: The slip speaks

**Central idea.** No new surface. The docket slip that already answers the tick carries the mascot's head (48 px) and one more sentence, in the green that already means done.

**The same task.** Ann ticks Laksa, the last Sauce line. As today the line is struck through and the bar turns green. The slip reads "Ticked Laksa" and under it "Sauce is done. 3 to go today.", with the head at its left winking once and Undo where it was. On the last line of the day: "Ticked Wash bok choy" and "Prep is done. 6 of 6." Nine seconds later the slip goes, as it does today. Home is unchanged.

**Words only.** The same slip without the head is what shows when the art does not load.

## B: He waits at the edges

**Central idea.** Never during the work. He stands in the page's own paper where no lines are left: under a finished list, on an empty list, and in Home's prep card.

**The same task.** Ann ticks Laksa: nothing new, today's slip. She ticks the last line of the day: once the server has every tick, a card shows under the list, the mascot at 96 px with a bubble "Prep is done. 6 of 6.", above the book's own sentence. When the ticked lines leave (3.5 seconds) he plays Serve once and holds the burger. On Home, a note at the top of Prep by section: his head and a bubble, "You are on Larder. 3 to go.", then "Larder is done. Grill has 1 left.", then "Prep is done. 6 of 6." On an empty list he looks around beside the book's own sentence and adds no words.

## C: The star on the bar

**Central idea.** He is the progress. His head (24 px) rides each section's bar at its fill point, on Prep and on Home's prep card, and slides along as lines are ticked.

**The same task.** Ann ticks Laksa: the head on Sauce's bar slides to the end and winks, and a small flag beside it says "Sauce done" for the 3.5 seconds the heading stays. She ticks the last line of the day: that section's head does the same, and a 48 px head stands beside "6 of 6 done" in the notebook header, in spare space only, and stays while the list is done. No sentence anywhere.

## M: the lead's draft mix

Not a fourth design to rank. Drafted after round 1 so a blend could be judged on one screen and not as a montage.

- **From A:** the sentence on the slip when a section is finished, with no art, at the slip's own height.
- **From B:** the card under a finished list (the slip stays plain there, so each finish line has one voice), the note in Home's prep card, the host on an empty list.
- **From C:** nothing.

## How they differ

| | A: The slip speaks | B: He waits at the edges | C: The star on the bar |
| --- | --- | --- | --- |
| Where he lives | The existing slip, over the bottom of the list, for 9 seconds | The page's own content where no lines are left, and Home | The section bars and the notebook header |
| What starts it | The finishing tick, as an event | The state of the list, whenever it is looked at | Every tick moves him; a full bar winks |
| Words | A sentence on the slip | A bubble in the page | A two-word flag, otherwise none |
| A finished section on Prep | Slip sentence and head | Nothing | Flag and wink in the heading, 3.5 seconds |
| A finished list | Slip sentence and head | Card under the list | Head beside the count |
| Art on a work page while lines are left | A 48 px head in the slip, 9 seconds | None | 24 px heads, always |
| Home | Unchanged | A note with a bubble in the prep card | Heads on the prep card's bars |

## Measured (Preview)

| Measure | Today | A | B | C | M |
| --- | --- | --- | --- | --- | --- |
| Taps to tick a line | 1 | 1 | 1 | 1 | 1 |
| New controls, tap targets or navigation levels | | 0 | 0 | 0 | 0 |
| Lines in view at the tick that finishes Sauce, 390 px | 4 | 4 | 4 | 4 | 4 |
| Lines in view before any tick, 390 px | 6 | 6 | 6 | 6 | 6 |
| Slip height at the tick that finishes Sauce, px, at 390 / 768 / 1280 | 60 / 60 / 60 | 60 / 60 / 60 | 60 / 60 / 60 | 60 / 60 / 60 | 60 / 60 / 60 |
| Slip height at the tick that finishes the list, px, at 390 / 768 / 1280 | 60 / 60 / 60 | 60 / 60 / 60 | 60 / 60 / 60 | 60 / 60 / 60 | 60 / 60 / 60 |
| Work rectangles moved on Prep (header, section headings, lines, Add dock, tab bar), 5 steps at 3 widths | | 0 | 0 | 0 | 0 |
| Page length when the list is done, 390 px | 1129 px | same | 1129 to 1257 | same | 1129 to 1257 |
| Home at 390 px | | nothing moves | prep card rows down 56 px | nothing moves | prep card rows down 56 px |
| Extra Firestore calls, every step and width | | 0 | 0 | 0 | 0 |
| Art fetched in the walk | | burger-sheet-compact.webp, manifest.json, welcome-still.png (332 KB) | burger-sheet-compact.webp, burger-still.png, manifest.json (336 KB) | burger-sheet-compact.webp, manifest.json, welcome-still.png (332 KB) | burger-sheet-compact.webp, burger-still.png, manifest.json (336 KB) |
| Slip height with a 47 letter line in a 23 letter section, 390 px, normal / Extra large text | 67 / 80 | 98 / 120 | 67 / 80 | 67 / 80 | 98 / 120 |
| Rendered contrast of the new words, 390 px | | slip sentence 5.76:1 at 16px | bubble 16.72:1 at 16px | bubble 16.72:1 at 13px; flag 16.72:1 at 13px | slip sentence 5.76:1 at 16px; bubble 16.72:1 at 16px |
| Preview checks passed | | 130 of 130 | 131 of 131 | 128 of 129 | 132 of 132 |

Source `71cbf84`, role staff (Ann), Lunch on Larder; sous chef (Sam) for Orders, fonts local Barlow, Barlow Condensed and Caveat. `verification.json` (pull request #670) holds 656 checks, 134 screens and 8 short films. Failed: C Orders: only the last line ordered cheers.

## Checked in the preview

| Check | A | B | C | M |
| --- | --- | --- | --- | --- |
| Undo takes the cheer back | Pass | Pass | Pass | Pass |
| A tick waiting to be sent is not cheered | Pass | Pass | Pass | Pass |
| The cheer comes once the server has answered | Pass | Pass | Pass | Pass |
| A refused tick is not cheered | Pass | Pass | Pass | Pass |
| Another phone's tick is counted but not cheered here | Pass | Pass | Pass | Pass |
| Reduced motion keeps the words and plays nothing | Pass | Pass | Pass | Pass |
| Missing art keeps the words and moves no work | Pass | Pass | Pass | Pass |
| Long names: no sideways scroll, cheer stays on the page | Pass | Pass | Pass | Pass |
| Long names: Undo keeps a 44 px target | Pass | Pass | Pass | Pass |
| Long names, Extra large text: no sideways scroll, cheer stays on the page | Pass | Pass | Pass | Pass |
| Long names, Extra large text: Undo keeps a 44 px target | Pass | Pass | Pass | Pass |
| Quick ticks: each finished section said once, no stacked sprites | Pass | Pass | Pass | Pass |
| A section finished a second time the same day is not cheered again | Pass | n/a | Pass | Pass |
| Leaving the page stops every sprite | Pass | Pass | Pass | Pass |
| (later step) started then finished: one line of words, no clip | Pass | n/a | n/a | n/a |
| Orders: only the last line ordered cheers | Pass | Pass | **Fail** | Pass |
| Home note with a long section name: stays on the page | n/a | Pass | n/a | Pass |
| Home note with a long section name, Extra large text: stays on the page | n/a | Pass | n/a | Pass |
| An empty list gets the mascot beside the book's own sentence, no new words | n/a | Pass | n/a | Pass |
| An ordinary tick does not cheer (every step, 3 widths) | 3 of 3 | 3 of 3 | 3 of 3 | 3 of 3 |
| Cheers the finished section once, by name (every step, 3 widths) | 3 of 3 | n/a | 3 of 3 | 3 of 3 |
| Every sprite has settled, no timers left (every step, 3 widths) | 3 of 3 | 3 of 3 | 3 of 3 | 3 of 3 |
| A section of one line is an ordinary tick: no cheer (every step, 3 widths) | 3 of 3 | 3 of 3 | 3 of 3 | 3 of 3 |
| Cheers the finished list (every step, 3 widths) | 3 of 3 | 3 of 3 | 3 of 3 | 3 of 3 |
| No redraw loop (every step, 3 widths) | 3 of 3 | 3 of 3 | 3 of 3 | 3 of 3 |
| Every work rectangle stays put (every step, 3 widths) | 21 of 21 | 21 of 21 | 21 of 21 | 21 of 21 |
| No sideways scroll (every step, 3 widths) | 21 of 21 | 21 of 21 | 21 of 21 | 21 of 21 |
| No extra Firestore calls (every step, 3 widths) | 21 of 21 | 21 of 21 | 21 of 21 | 21 of 21 |
| The same lines in view (every step, 3 widths) | 21 of 21 | 21 of 21 | 21 of 21 | 21 of 21 |
| Undo keeps a 44 px target (every step, 3 widths) | 12 of 12 | 12 of 12 | 12 of 12 | 12 of 12 |
| Says nothing on the work page while lines are left (every step, 3 widths) | n/a | 3 of 3 | n/a | n/a |

**One reproduced limit.** C on Orders at 390 px: the notebook header has no spare space beside "2 of 2 ordered" and Orders has no section bars, so C shows nothing there when every line is ordered. Recorded as a limit of C, not patched.

**Long names.** With a 47 letter line in a 23 letter section, the sentence on the slip (A and M) wraps and the slip grows from today's 67 px to 98 px at normal text, and from 80 px to 120 px at Extra large text. Undo keeps its place and its 44 px. Sections in the kitchen's own setup are one word (Larder, Grill, Sauce).

## Not evidenced

- The implemented app: the preview follows the page's redraws from outside. An implementation hooks the tick and the write's own answer.
- The saved shell, the service worker's cache and a real phone with no signal. The stand-in models hold, refuse and release only.
- The shared tablet's "Who did this?" sheet, a screen reader in use, keyboard focus (no design adds a control), dark variants (the book has none for these surfaces).
- Staff reading the words: "is done" against "is ticked off" (new starter, round 1), and whether anyone wants it. No staff were asked.
- Whether any of it changes how much prep is done.
