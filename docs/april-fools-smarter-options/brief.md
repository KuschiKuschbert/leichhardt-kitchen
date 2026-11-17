# April Fools that people cannot see coming: brief

18 November 2026, Queensland. The head chef asked: "Can we make that even smarter. For example if the user has had one April Fools day in one year they might expect it the next year as well. Maybe a bit more unpredictable?"

Files: `proposal.md` (round 1), `evidence-packet.md` (contracts and measurements given to every reviewer). The joke as built: `docs/april-fools.md`; the first study: `docs/april-fools-options/brief.md`. This is role-based analysis by five fresh reviewers, not research with real staff.

**Status: the head chef chose "Wait, get ready now" (18 November 2026). Built in the same pull request: the joke starts at 04:00, and each person's record keeps which joke they got. The timing is looked at again after 1 April 2027.**

## Round 1: should we build it?

**Verdict: Don't build yet, 3 of 5** (head chef, skeptic, keeper). Look again after 1 April 2027. The other two say Build smaller, and one of them (new starter) also says wait until after 1 April 2027.

| Reviewer | Verdict | Main reason | The one change |
| --- | --- | --- | --- |
| Cook mid-service | Build smaller | A 2nd to 4th Home view lands in my shift; back from break at 17:00 is the worst moment | Pick the later Home view outside the person's own shift hours; no plan, play as built |
| Head chef | Don't build yet | The problem does not exist until 1 April 2028; the joke already changes every year (never last year's design), only the moment repeats | Ask the team after 1 April 2027, then decide |
| Skeptic | Don't build (not before 1 April 2027) | Every timing lever gives up the safest moment, the first view at sign-in, before service; a known date is how April Fools works | Wait; if now, only the words ("Year 2, Ann.") on the same first view |
| New starter | Build smaller, after 1 April 2027 | The date is my only clue; on 2 April or as a slow start it looks really broken; the decoy is the book lying | Every joke stays on 1 April, on the copy, and ends with the reveal |
| Keeper | Don't build now | No evidence, nothing needed before 1 April 2028; later views on the shared screen often never come (later PINs go back to the last page) | Before 1 April 2027, keep which joke each person got in their record, so later years can avoid any joke they have seen |

**What all five agree on.** Cut lever 2 (a day other than 1 April), the decoy ("Nothing today, Ann. Promise.") and the slow start. Keep lever 3's words ("Year 2, Ann.") if anything is built. Four of five would keep lever 1 only in a narrow form: on the person's own phone, before or outside their own shift (cook, head chef, keeper) or the 2nd to 4th Home view on 1 April (new starter); the skeptic would cut it.

Disagreement: build now in a smaller form (cook, new starter) versus wait for real reactions after the first joke (head chef, skeptic, keeper). The new starter sides with waiting on timing.

Reference fit: Headspace (plain words, no reassurance that is not true) rejects the decoy and the slow start; Flighty (real times from data already read) supports lever 1 only when the person's shift is on Today's team, which can be Not set; Duolingo (an honest answer after the joke) is kept by the reveal in every lever except the slow start, where a cook can leave Home before any reveal.

Contract fit: Needs work. Levers 1 and 2 propose changing the approved When rule (the head chef's call, not a violation); lever 2 also needs a looser rule for the record's day. The decoy and the slow start conflict with the kept honesty rule ("You did nothing wrong", no fake failure) and with "a copy, never the real page". Lever 3's words: Works. Every measurement in the packet is Implemented app, for the joke as built; no lever has a Preview.

### Round 1 Break-it findings

| Scenario | Role and state | Expected | Status | Repair or check |
| --- | --- | --- | --- | --- |
| The joke starts at midnight, not 04:00 | A closer still signed in at 00:40 on 1 April, during pack down | Nothing before 04:00 (contract: "from the 04:00 PIN day") | Reproduced in `tests/april-fools.test.js` on the old code: the joke loaded and played at 00:30 and 03:59 on 1 April (`foolsDay()` used `LK_TIME.day()`, which turns at Queensland midnight) | Fixed: `foolsDay()` also needs the hour to be 4 or later. Checked: 00:30 and 03:59 load nothing, 08:00 plays (59 of 59) |
| The same joke as last year | A returning cook after five people ranked ahead of them left | Never last year's joke | Checked in a Node simulation of the built `deal()` (4 years, 2,000 teams each): 0.0% of returning people at 13 or 16 staff with 25 to 30% leaving a year, 0.2% at 40%, 0.8% at 20 staff with 50% leaving. The contract's "nobody gets last year's design" is true in practice but not guaranteed | Contract worded as measured. Each person's record now keeps their joke (`joke`), so a later year can make it a guarantee |
| It plays twice (lever 1) | A returning cook: calm first view on their phone and on the shared display; the phone plays at the 3rd view; the display reaches its 2nd view at 18:00 | Once a year on any device | Risk / Not evidenced (skeptic, keeper): `foolsSeen()` reads only at the first view (`js/app.js`) | Read the record again at the chosen view; a client test with two pages on one stand-in store |
| The chosen moment never comes (lever 1) | A cook signs in at 09:00 (calm), later PINs open Prep (first sign-in rules) | Played or knowingly skipped | Risk / Not evidenced (keeper): no joke and no record, so in 2028 they look like a first-timer and get the same first-view pattern | Count a skipped year, or play at the first view when no later moment comes |
| No plan in the dinner rush (lever 1) | A returning cook with no row on Today's team, 2nd Home view at 18:40 on the shared display | Never in busy time | Risk / Not evidenced (skeptic) | A kitchen-wide busy window as the floor; with no plan, the first view only |
| The slow start misleads work (lever 3) | A cook sees a glitched section or break on a Home that looks normal, then leaves Home before the takeover | Real Home stays true; every joke ends with the reveal | Risk / Not evidenced (new starter, skeptic) | Cut the slow start (all five) |

## Recommendation for the head chef

**Recommend: wait for the bigger change, but get ready now.** Follow the council on timing and keep the joke on each person's first Home view of 1 April. Before 1 April 2027, do the two small things that the redesign will need and that are cheap now:

1. **Fix the midnight start.** The joke plays from 04:00 on 1 April, as the contract says, never during a closer's pack down. It is a fault, so it needs no council.
2. **Remember which joke each person got.** One more field in their 1 April record (`joke: 'A1'`), a looser rule and an emulator row. In 2028 the book can then say "Year 2, Ann. Last year it was the melt." and make sure nobody ever sees a joke twice. This data cannot be recovered later if it is not kept in 2027.

After 1 April 2027, read who came back and how the first joke went, then run round 2 for the timing.

Main downside: returning staff on 1 April 2028 still meet the joke at the same moment; only the words and the joke itself change. If the head chef wants the moment to move as well, round 2 can draw three designs inside the council's cuts (1 April only, own phone, outside the person's shift, no decoy, no slow start, no other day).

## The head chef's decision, 18 November 2026

Asked to choose between waiting and getting ready now (recommended), building smaller now, or building every lever against the advice, the head chef chose **"Wait, get ready now"**.

## Built

- **04:00 start.** `foolsDay()` in `js/app.js` needs 1 April and the hour 4 or later (Queensland). A closer still signed in after midnight packs down in peace.
- **Which joke they got.** `js/fools.js` passes the joke (`A1` to `L2`) to `done('play', joke)`; `LK_PREP.foolsMark()` keeps it in `fools/<YYYY-04-01>_<staff id>` as `joke`. `firestore.rules`: `joke` allowed and optional, one of the 24 (looser; it publishes by itself after the merge, and nothing writes before 1 April 2027).
- **Tests.** `tests/april-fools.test.js` (59 checks): the record keeps the joke dealt to her; nothing at 00:30 or 03:59 on 1 April. All four new checks failed on the old code. `tests/rules/client-shapes.test.mjs`: own create with its joke allowed, a joke not one of the 24 refused (301 rows pass on the emulator).
- **Not built (after 1 April 2027):** "Year 2, Ann." and naming last year's joke, a deal that rules out any joke a person has seen, and any change to when the joke plays.
