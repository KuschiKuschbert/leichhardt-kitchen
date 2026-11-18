# Proposal: April Fools that people cannot see coming (round 1)

18 November 2026, Queensland. Source commit `9ff257b` (main, April Fools merged as #745). No code.

## The problem

The head chef: "if the user has had one April Fools day in one year they might expect it the next year as well. Maybe a bit more unpredictable?"

As built (`docs/april-fools.md`), the joke always plays at the same moment: each person's **first Home view on 1 April**, on any device, once a year. Someone who was here last year knows the pattern: 1 April, open Home, the screen goes mad. They brace for it, warn new starters ("it's just the April Fools thing"), and by the second year the surprise is mostly gone for them.

- **Who:** returning staff. Team 13 to 20. How many stay a full year is not measured.
- **How often:** once a year. The first joke plays on 1 April 2027; the first returning people are on 1 April 2028.
- **Evidence:** none yet. The problem is predicted, not seen. Nobody has had the joke.
- **Today:** nothing to do; the joke has not played.

## The change (levers the council can keep or cut)

For people the book knows were fooled before (their own record from an earlier 1 April exists on the server), the joke stops following one pattern. First-timers keep today's behaviour.

1. **When on the day.** Their first Home view on 1 April is calm. The joke plays on a later Home view that day, at a moment picked per person: the 2nd to 4th Home view, or the first Home view after their break (their break is on Today's team), never in their own shift's busy time. Optional decoy: on the calm first view the mascot says something like "Nothing today, Ann. Promise."
2. **Which day.** Some years, for some returning people, a day near 1 April instead (the next day, "a late one"), or no joke that year, so nobody can be sure.
3. **What it says.** The joke remembers: "Year 2, Ann." or names last year's joke. Some returning people get a slow start: Home looks normal, small things go wrong over two or three Home views, then the takeover.

Kept as built: 35 seconds, 24 jokes dealt so nobody shares one, press and hold or Escape stops it, the reveal ("You did nothing wrong, and nothing is broken"), once a year per person on any device, nothing offline, with unsent work or a sheet open, Still gives the words only, celebrations Off gives nothing, the admin preview.

## Cost

| Lever | Reads | Writes | Rules | Code | Tests |
| --- | --- | --- | --- | --- | --- |
| 1 When on the day | One more read per returning person per device on 1 April (last year's own record; the rules already allow a person to read their own record from any 1 April). Break times come from Today's team, already read | none new | none | `js/app.js` `foolsSync()` waits for a chosen Home view, a few lines in `js/fools.js` for the decoy | `tests/april-fools.test.js`: a second year, the calm first view, the later view, the break return |
| 2 Which day | Same read, also on 2 April | the record's day could be 2 April | stricter pattern changes (`04-01` only today); rules emulator rows | the day rule in `foolsDay()`, the reveal's words | boundary days |
| 3 What it says | none (the record says which year) | none | none | words in `js/fools.js`; slow start is new motion code in a lazy file | words and the slow start |

Every other day of the year: unchanged (no read, no file loaded). The 24 jokes stay lazy (`js/fools.js`, about 77 KB).

## Risks to test

- A joke later in the day lands in service, on the shared display at the pass, or on a cook coming back from break who needs their section.
- A joke on a day nobody connects with April Fools looks like a real fault for longer.
- A decoy line from the mascot is a lie from the book's own voice.
- Two devices: the calm first view on the phone, then the joke on the shared screen at 18:00.
- A person who leaves Home and never comes back that day never gets it (fine, or lost).
- The once-a-year record is written when the joke starts; a chosen later moment may never come.

## Design references to test

- **Flighty:** real times from data already read (Today's team), never a new listener or polling just for the joke.
- **Headspace:** plain words in the reveal, no vague reassurance; a decoy fights this.
- **Duolingo:** an honest answer after the joke (the reveal) and a clear way out (press and hold).
- **Things 3:** today's work stays visible; the joke never hides a live list during service.

## Screens

Today's Home at 390 px: `docs/april-fools-options/evidence/0-home-today-390.png`. The 24 jokes: `docs/april-fools-options/evidence/pool/`. Nothing new to show before round 2.
