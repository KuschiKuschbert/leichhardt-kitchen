# Round 2: three designs for a mascot a little more present

17 November 2026. Every picture and number here is a **Preview**: review-only styles and a script (`preview/candidate.css`, `preview/candidate.js`) laid over the real book (`main` at c9649ab) with the click tests' Firebase stand-in, made-up people and lines, the stand-in fonts (not Barlow). Nothing was measured in the kitchen. Run with `preview/capture.mjs`.

## The same evening for every design

A shared section screen, signed in as Ann (a cook, section Pans), Tuesday 20:00. Today's list: 15 lines in Grill, Pans, Fryers and Hot larder, 11 ticked; Fryers already finished at 16:00. From 19:30 Sam wrote 6 lines for tomorrow (a batch of 6, so today's own lines clock tonight's list), which sit under "Tonight, for tomorrow". 14 regulars fill Quick add, as on a real day; Handy also shows the book's own "Closing soon" box. Every tick asks Who did this? (the shared screen), answered Ann.

Steps: (1) All list at 20:00; (2) Ann ticks the last two Pans lines; (3) the slip has gone; (4) the last Grill and Hot larder lines are ticked, so every line for today is ticked and tomorrow's 6 are open; (4b) the signal drops; (5) the Pans tab; (6) Home.

Today's book at step 4 ([2-today-today-done-1920.png](evidence/2-today-today-done-1920.png)): "15 of 21 done", nothing of the mascot, because tomorrow's 6 lines are open. The book's own Closing soon box already says "6 lines are still open and will roll to tomorrow."

## A. Today finishes today (round 1's direction 1, done whole)

**Central idea:** the cheer exists already; the list just cannot reach it. Make "today" mean today's lines, in every count, and the existing finish happens most nights. No new place for him.

- **One cut for every count.** Lines under "Tonight, for tomorrow" leave today's count in the header, on Home and in the card, but only when today's own lines clocked tonight's list (a batch of 6 or more from 15:00, `listStart()`). With only the usual-time guess, nothing changes (checked: a single 20:10 line with no batch keeps "15 of 16 done" and no card, `walk-A-fallback.json`).
- **Header:** "15 of 15 done", and "· 6 for tomorrow" joins the shift line under it ("Dinner: Pans · 6 for tomorrow"), so the header keeps its height ([3-A-evening-1920.png](evidence/3-A-evening-1920.png)).
- **Home:** "11 of 15 done · 6 for tomorrow" in Prep by section ([6-A-home-1920.png](evidence/6-A-home-1920.png)). Section bars on Home not drawn in the preview: a build leaves tomorrow's lines out of them too.
- **The finish:** when every line for today is ticked and sent, the card shows above tomorrow's lines, one compact row: him 64 x 85 px beside 28 px words "Every line for today ticked. 15 of 15." and "Tomorrow's 6 lines are below." ([4-A-today-done-1920.png](evidence/4-A-today-done-1920.png)). On a phone the book's small card, 48 x 64 px ([5-A-today-done-390.png](evidence/5-A-today-done-390.png)). Serve plays once on the screen whose tick finished today's lines, as today.
- **Not drawn, for a build:** a section's own tab still holds tomorrow's lines of that section as open lines (the tab has no Tonight group), so a section's finished words on its tab stay blocked by tomorrow's lines. The build would apply the same cut there.

## B. A done line on the All list (round 1's direction 2)

**Central idea:** the list rarely finishes, but sections do, several times a day, and today they vanish from All with 9 seconds of slip words. Say what is finished, in the list, where the cook already looks, and keep saying it while it is true.

- From 900 px wide, on the All list, today: one line at the foot of today's lines (above "Tonight, for tomorrow"), "Pans and Fryers are done." in the done green on its tint, him 48 x 64 px beside it as a still ([8-B-pans-done-1920.png](evidence/8-B-pans-done-1920.png)).
- **Truth:** the slip's own rule per section (`secSaid()`): 2 lines or more, every one ticked and on the server, nothing waiting to be sent, the names the slip does not say. A new line in a section takes it off the line at once.
- **One line only,** however many sections: "Grill, Pans, Fryers and Hot larder are done." ([9-B-today-done-1920.png](evidence/9-B-today-done-1920.png)). At the foot, so no open line of today moves when it appears; only tomorrow's lines under it move down a line.
- One short play (not Serve) on the screen whose tick finished the section, once per section per kitchen day per device. Serve stays with the whole list.
- Not on a section's own tab (it has its own finished words), not on phones, not on the wall board.

## C. He keeps the Prep page company (round 1's direction 3, as a still with no words)

**Central idea:** the owner asked for him to be seen more. Give him one small, fixed place on the wide Prep page all shift, away from the list, and let finishes be his only movement.

- From 900 px wide, on Prep, today, with the signal up: a still in the Handy page's header corner, 64 x 85 px, standing on the header's line, like Home's corner ([10-C-evening-1920.png](evidence/10-C-evening-1920.png), [12-C-evening-1280.png](evidence/12-C-evening-1280.png)). On every tab ([11-C-pans-tab-1920.png](evidence/11-C-pans-tab-1920.png)). The Welcome pose; no words, no count, not a control.
- **Why the header corner:** on a real evening the Handy page below is full (Closing soon, Done today up to 280 px, Quick add). The header is the same height all day, so he never moves and never pushes anything.
- **His only movement:** one play at a real finish, on the screen whose tick made it, once per finish per kitchen day per device (a section: a short action; the list: Serve, which still also plays in the card). Never while a tick is waiting to be sent.
- Gone with no signal, on another day, on the wall board and the Prep room view; nothing on the PIN or lock screen.

## Measured (Preview, stand-in fonts, `evidence/walk-ABC.json`, `walk-A-inline.json`)

Taps to tick a line: 1 in every design (the shared screen's Who did this? tap is unchanged).

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Steps (of 6, at 1920 x 1080) where he is seen on Prep | 0 | 1 (today's lines finished) | 4 (from 20:00: Fryers was done at 16:00) | 5 (every step with signal) |
| List rows in view at 20:00, 1920 x 1080 | 9 | 9 | 8 | 9 |
| List rows in view at 20:00, 1280 x 900 | 5 | 5 | 4 | 5 |
| List rows in view at 20:00, 390 x 844 | 4 | 4 | 4 | 4 |
| Rectangles moved against today, open lines of today | | 0 | 0 | 0 |
| Rectangles moved, tomorrow's lines | | 7 when the card shows (1920), 11 (390) | 7 while the line shows | 0 |
| Header, tabs, Add a line, Handy, Quick add moved | | 0 | 0 | 0 |
| Home rectangles moved | | 0 at 1920; 5 at 390 (the count wraps to a second line) | 0 | 0 |
| Changes under 900 px | counts and the card | none | none |
| Sideways scroll, browser errors | 0, 0 | 0, 0 | 0, 0 | 0, 0 |
| No signal (step 4b) | | card goes, counts stay split | line goes | he goes |

## Costs

| | A | B | C |
| --- | --- | --- | --- |
| Reads, writes, listeners, rules | None | None | None |
| Files | `js/prep.js` (one cut for the header, Home, `finOk()`, the card, the tab), `css/app.css` | `js/prep.js` (a state on All from `secSaid()`), `css/app.css` | `js/prep.js` (a still in the Handy header, a play at a finish), `css/app.css`; `js/mascot.js` (14 KB) and one still (45 KB) now load on every wide Prep view, once per device |
| Tests | `mascot-finished-list`, `mascot-wide-finish`, `mascot-section-done`, Home's Prep count, `learn` (the cut), new: the three counts agree, no batch, a batch after 15:00 | new file at 900, 1280, 1920 px; the slip's silences; another screen's line; lock; reduced motion | new file at 900, 1280, 1920 px; Who did this?, lock and PIN, offline, reduced motion, another day |
| Approved rule changed (the owner's call) | The finish rule: "Every line ticked" now means today's lines, when today's own batch set the cut | Wide-screen round 1 rule 2: something shows on the All list while lines are left (only about what is finished) | Wide-screen round 1 rule 2, by design: a resting face on the work page all shift |
| Build size | 1 pull request | 1 pull request | 1 pull request |

## How the three differ

| | A | B | C |
| --- | --- | --- | --- |
| What changes | What "finished" means and what the counts say | A new line of state in the list | A new fixed place for him beside the book |
| Where he stands | Where he stands today (the card) | In the list, at the foot of today's lines | The Handy header corner |
| When he is seen | When today's lines are all ticked | Whenever a section is finished | All shift |
| Words | Changed counts, and the card | One sentence | None |
| Lifetime | A state | A state | Always, with one play per finish |
| Widths | All widths (counts), card as today | From 900 px | From 900 px |

## Not evidenced

Reading from 1.5 m on a real section screen; Barlow (the kitchen's font) and Extra large text; a real day's number of lines and sections; how often a section or the list is finished; the plays (no picture shows motion); reduced motion; a screen reader; the 10 minute lock and PIN with each design standing; Queensland midnight and 04:00; touch; rendered contrast (the done ink on the done tint is the book's existing pair, 4.5:1 or better in `tests/mascot-wide-finish.test.js`, not re-measured here).
