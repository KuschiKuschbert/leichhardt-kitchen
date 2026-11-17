# Home's team board and the roster hours

17 November 2026. The head chef asked: "With the new roster data and today's team should we upgrade the today's team view on home page?" Proposal: [proposal.md](proposal.md). Evidence: [evidence-packet.md](evidence-packet.md) (source `547a1b3`, stand-in, fallback fonts, synthetic roster day at 14:00). Role-based analysis, not research with kitchen staff.

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5).** Fix the hours on Home as a repair of the 15 November contract; do not regroup the board or add now/next/finished status.

| Reviewer | Verdict | In one line |
| --- | --- | --- |
| Cook mid-service | Build smaller | The hours are wrong, a repair; "On now" headings cost lines, push Prep by section down and move rows under a hand. |
| Head chef | Build smaller | The problem is a wrong time on every roster double, not the layout; the board was chosen 7 days ago and Team changed three times since, so no relearning. |
| Skeptic | Build smaller | A regression since the 16 November cut, and `tmHoursWords()` already joins touching parts; "finished" claims presence the saved plan cannot know. |
| New starter | Build smaller | Mo's own card says 10:00 to 15:00 while their break is 15:00 to 15:30: a new cook could leave at 15:00. Now and next only ever as words. |
| Keeper | Build smaller | No new read, listener, rule, field or file; now/next would add a second clock that disagrees with Your day and the welcome. |

**Agreed cuts:** no "On now", "Coming in" or "Finished" groups or words; no one-row-per-person board (that changes the chosen board C, 10 November, where a chef on a double is in both columns); no change to how On with you picks its service.

**Disagreement, one line each:**
- New starter: would show each person once with words ("Mo until 21:00", "Eli starts 17:00"), and the head chef could choose that later.
- Keeper: one shared helper for "a person's day" should also feed `tmNow()` and the welcome (`homeGreet()`), so Home never runs two clocks. The others limit the fix to the hours shown.

**Reference fit:** Flighty: real times from data the phone already holds (Works for the fix). Things 3: now versus later is the useful idea for a later choice, not needed for the fix. Airbnb: the person, their time and place together (the cell already does this; the fix makes the time true).

**Contract fit:** the fix restores the 15 November contract ("Your day: Lunch · 10:00 to 21:30"; everyone sees who comes in when). No colour or surface change. Not evidenced: real Barlow fonts, 768 px, contrast of the hours line.

### Break-it findings (round 1)

| Scenario | Expected | Observed or hypothesis | Evidence | Smallest repair or check |
| --- | --- | --- | --- | --- |
| A double changes section: Mo on Larder at Lunch, Grill at Dinner, rostered 10:00 to 21:00 (skeptic) | On with you at 14:00 does not read as Larder until 21:00 | Hypothesis: "Larder · Mo 10:00 to 21:00" reads as Larder all day | Risk / Not evidenced | Say the move in the cell ("Grill from 17:00"); a check in `tests/home-rota.test.js` |
| A service added by hand with no roster hours in it (skeptic, keeper) | Its hours still count in the person's day | Joining only saved hours would show 10:00 to 15:00 again | Checked in source, not run | Fall back to the service's own hours, as Today's team does; a check |
| A split: Gus 08:00 to 15:00 and 17:00 to 21:00 (cook, head chef, keeper) | The gap stays | Joining every part would read 08:00 to 21:00 | Risk | Join only parts that touch (`tmHoursWords()` does); a check |
| Clock edges: Dev rostered to 20:00, Cal to 14:30 (keeper, skeptic) | Times stay true at 14:29, 14:30, 15:00, 17:00, 19:59, 20:00 | `tmNow()` and the welcome use service hours, so Cal reads on shift until 15:00 | Checked in source | Out of scope for the fix (the welcome and service choice are unchanged); listed below |
| The fold and Prep jump on the minute paint | Nothing moves | The fix changes words only, no regrouping | Not evidenced | The existing paint test keeps the fold open |

### Open for the head chef

1. **Build the fix?** The recommendation below.
2. **The head chef on the plan:** in the evidence, Gus (head chef, on Lunch) gets On with you and the full-team fold, not the whole day. The 10 November note says "Head chef, or anyone not on today's plan: On today holds the whole saved day". The code applies the whole day only when the person is not on a shift now. Which is right?
3. **Later, not now:** the welcome and the service picked for On with you follow the service's hours, not the roster's (Cal, rostered to 14:30, reads on shift until 15:00).

## Recommendation

Recommend the fix only, as a repair:
- Each person on the board shows their whole rostered day: back-to-back services joined (Mo "10:00 to 21:00"), a split keeping its gap (Gus "08:00 to 15:00, 17:00 to 21:00"), a service added by hand counting with its own hours.
- A double that moves section later says so in its cell ("Grill from 17:00").
- Your day says the person's whole roster time ("Lunch · 10:00 to 21:00").
- No status words, no regrouping, no new read, listener, rule or field.
- Tests: `tests/home-rota.test.js` at 14:00, 15:00, 17:00, 19:59 and 20:00 with a section change, a split and a service added by hand, failing on the old code first.

Main downside: the full-day fold still shows a double in each column it works (board C as chosen), now with the whole day each time.
