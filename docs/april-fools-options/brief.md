# April Fools on Home: brief

17 November 2026, Queensland. The head chef asked: "For the 1st of April I'd like to trick everyone with a completely weird home page animation, like a hacker has hacked into the page and broken all elements. A super weird animation that also says their name on the day and completely breaks the visual design. Something dark and cruel so they think they broke something when they first log in. Hacker style, psychedelic, elements of the real design move around weird and break."

Files: `proposal.md` (round 1), `evidence-packet.md` (contracts and measurements given to every reviewer), `designs.md` (the shared rules and designs A, B and C, round 2), `ideas.md` (eleven ideas, three built), `preview/index.html` (plays every design on a frozen copy of Home; open it in any browser), `evidence/` (today's Home and frame strips at 390 px). This is role-based analysis by six fresh reviewers, not research with real staff.

**Status: designs shown, waiting for the head chef's choice. Nothing in the book has changed.**

## Round 1: should we build it?

**Verdict: Build smaller, 5 of 5.** It fixes no kitchen problem; it is a once-a-year joke from the head chef, cheap in reads and files, but risky if it plays at the wrong moment or breaks Home for real.

| Reviewer | Verdict | Main reason | The one change |
| --- | --- | --- | --- |
| Cook mid-service | Build smaller | At 17:00 the first thing I look for is my section and break; a swallowed tap on Prep makes the book look really broken | Only before the person's shift; otherwise just the mascot's line |
| Head chef | Build smaller | No kitchen problem; a scare can backfire on a junior and teach people that a broken screen might be a joke | Before 12:00 only (pranks end at noon), never on a shared screen, short, no failure red |
| Skeptic | Build smaller | The mascot, his named bubble and the celebration arrival already do most of the moving parts; Home changes every week | Animate a copy over Home, leave the real Home untouched, a timer that removes it, save "played" at the start |
| New starter | Build smaller | Bali and Nepal may not know April Fools; a scared person reloads or closes the app instead of tapping | The reveal always reaches you, even after a reload, in plain words that explain 1 April |
| Keeper | Build smaller | Cheap (no reads, writes or listeners) if it stays lazy; the danger is the joke becoming a real fault during the redraws after a PIN | A copy in an overlay, transform and opacity only, ending itself by CSS; play only when `lkServerUp()` and no work is waiting |

Disagreement: none on the verdict. On length, the head chef said 5 seconds at most; the Keeper about 6; the designs run about 8 to 9 with a one-tap skip, which is the head chef's call.

Every cut was taken into the designs as a shared rule (`designs.md`, "What every design keeps"): 1 April 04:00 to 11:59 only; personal devices; a copy laid over Home that hides itself after 10 seconds; "played" saved at the start with the reveal recovered after a reload; not offline, with reads used up or with work waiting; no failure red; transform and opacity only; otherwise just the mascot's words.

### Round 1 Break-it findings

| Scenario | Role and state | Expected | Status | Repair |
| --- | --- | --- | --- | --- |
| Home redraws while the joke plays (`lk-access`, `lk-cfg`, `lk-greet`, first data) | Any person, first PIN of the day | The joke never writes into live cards; Home stays usable | Risk / Not evidenced in the app. The preview plays on a copy only and leaves Home untouched (Checked in the preview) | Copy, never the real page; end on redraw; a click test fires a redraw and a thrown error mid-play |
| Panic reload or closing the app | New starter, personal phone | No second scare; the reveal still reaches them | Risk / Not evidenced | Save at the start; the next Home view that day shows only the reveal |
| Midnight versus 04:00, wrong phone clock | A closer at 00:40; a phone before `ready()` | No prank during pack down or on 31 March | Risk / Not evidenced | 04:00 to 11:59 on 1 April, after `LK_TIME.ready()`; test the boundary times |
| A real failure on the day | Offline, reads used up, a write waiting | "Nothing is broken" stays true; real errors are not waved off | Risk / Not evidenced | Do not play unless `lkServerUp()` and no work waiting |
| Shared tablet at the pass | Four people signing in at 17:00 | No one locked out at service | Risk / Not evidenced | Personal devices only, mornings only |

## Round 2: the designs

To be completed with the six reviewers' scores, the mix and the recommendation.
