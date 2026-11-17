# A smarter mascot: time-sensitive and page-related messages

17 November 2026, Queensland. **Round 1: Build smaller, 4 of 5 (the skeptic: Don't build). Round 2 not run yet: waiting for the owner.** No app code.

[Proposal](proposal.md). The contracts, design references and pictures given to every reviewer: [`../mascot-presence-options/evidence-packet.md`](../mascot-presence-options/evidence-packet.md), pictures 1, 0-all-390, 23 and 24 in [`../mascot-presence-options/evidence/`](../mascot-presence-options/evidence/).

This is role-based council analysis, not research with staff.

## What the owner asked

After choosing to have the mascot say Home's welcome: "maybe make the mascot smarter now that he's more dominant. Time sensitive messages, pafe related messages on all pages or something?"

## Round 1: should it be built?

Five directions were judged ([proposal](proposal.md)): 1 one more time-sensitive line in his Home bubble; 2 a still mascot with one line at the top of every page; 3 he carries the cut-off and function bands on every page; 4 "show me once" pointers for new starters; 5 a knock-off word after the last shift.

| Reviewer | Verdict | Draw | Not | Most useful change |
| --- | --- | --- | --- | --- |
| Cook mid-service | Build smaller | 1 (Home only), 5 | 2, 3 (a row lost on a phone; the page already says it); 4 not yet | His line says one fact the Your day card does not (a cut-off or a function, never the break), in plain type, gone once the time passes or the signal drops |
| Head chef | Build smaller | 1 and 5 together, as one design | 2, 3; 4 until someone counts new starters | His line only points to a card below it; the card stays the record |
| Skeptic | Don't build | 1 (Home only, narrow); 4 outside service | 2, 3; 5 (already built: the welcome says "Thanks for today") | Home only, one line copied word for word from the board's top row on its own tick, blank unless that row came from the server. Take away the Top tickers strip instead |
| New starter | Build smaller | 4 (in print, inside a sheet), 5 small | 1, 2, 3 | Anything with a deadline or a failure stays in its printed band and never goes in his bubble |
| Keeper of the book | Build smaller | 5, then a narrow 1 | 2, 3; 4 needs its own study | His line is Coming up's first row, taken from it with the same gates; never his own words |

**Verdict: Build smaller, 4 of 5.**

**Agreement (5 of 5).** Not on every page (direction 2) and not instead of the bands (direction 3): each repeats something with an approved place, costs a row on a 390 px phone (Prep shows 7 rows with 9 px spare), brings back the second status voice the cheer study turned down, and would load his file and art on every page. Home is where he talks.

**Already built.** Since 17 November the welcome is his speech bubble, and the welcome already changes with the person's shift ("Good to see you", "Enjoy your break", "Welcome back", "Last stretch", "Thanks for today"; `docs/staff-personalisation-options/brief.md`). So he already says the time-sensitive words about the person's own day. Most of direction 5 is that.

**Disagreement.** Direction 1: four would draw a narrow version, the new starter would not (a deadline in a friendly handwritten bubble stops the face meaning "friendly"). Direction 4: the skeptic and new starter would draw it; the others say it needs its own study ("once per person" needs a store, and a shared screen remembers the wrong person).

**Leading Break-it findings (all Risk, read in code, not reproduced).**

| Finding | Reviewers | Carry into |
| --- | --- | --- |
| A cut-off in his bubble goes stale: the welcome repaints only when the shift moment or the hour changes, while the board ticks every 30 seconds; after another chef ticks the order, or after the 10 minute lock clears the ticks this screen held, he could still say "Bidfood closes at 14:00" | skeptic, keeper, cook | Any line is Coming up's first row, copied on Coming up's own tick and gates, blank when that row is not from the server |
| Cut-offs are for chefs only (`cutWho()`): a cook's bubble cannot say one | keeper, skeptic | A cook's line could only ever be a function, never a cut-off |
| Words that change every 30 seconds inside the heading are read again by a screen reader | keeper | A second line, outside the heading, hidden from screen readers (Coming up already says it) |
| A deadline in Caveat handwriting is slower to read, more so in a second language | cook, new starter | Plain type for any line that is not the greeting |
| "Thanks for today" mid-service when a shift runs late | head chef | Already the welcome's rule; unchanged |

## For the owner

A narrow direction 1 is the only thing most reviewers would draw: one plain-type line under his welcome on Home, copied from Coming up's first row (a function for everyone; a cut-off for chefs), gone when Coming up hides it. Round 2 would draw that against two alternatives. Or stop here: the welcome bubble already speaks to each person's day.
