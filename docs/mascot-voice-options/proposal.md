# Proposal: a smarter mascot who speaks on the pages, with time-sensitive and page-related messages

17 November 2026, Queensland. Round 1 of the service council. No code, no design yet.

## What the owner asked

After choosing to have the mascot say Home's welcome in a speech bubble (`docs/mascot-presence-options/brief.md`, "The owner's answer"): "maybe make the mascot smarter now that he's more dominant. Time sensitive messages, page related messages on all pages or something?"

## What the book already says, and where (read in code and notes, not measured in the kitchen)

Time-sensitive things the book already shows, each with its own approved place and words:

| What | Where today | Note |
| --- | --- | --- |
| Supplier order cut-offs | The cut-off band on every page (`cutBand()` in `js/app.js`), Coming up on Home, compact cut-offs on Orders; a push 10 minutes before (`cutoff-push.yml`) | `docs/cutoff-options/brief.md`, `docs/order-list-options/brief.md` |
| Functions today and soon | The function band on every page (`LK_FN.bandSlot()`), Function this week card, Next function line, Orders tag | `docs/function-ahead-options/brief.md` |
| Your shift, your break, back from break | Home's Your day card; the welcome already changes with the shift ("Enjoy your break", "Welcome back", "Last stretch") | `docs/home-staff-first.md`, `docs/staff-personalisation-options/brief.md` |
| Closing soon (lines that will roll, log waste) | Prep and Orders, an hour before close | `js/prep.js` `closeFlag` |
| Cooling stages | Operandio cooling reminders, quiet, 10:00 to 21:00 | `docs/operandio-cooling.md` (a quiet zone for the mascot) |
| Pings, Kitchen mail, minutes to sign, the chef to-do | Pings in the top bar, their own pages | `docs/ping-recipients.md` |
| Start of shift, drinks run | The start of shift sheet, the drinks run page | |
| Prep progress | "7 of 14 done", section bars, Home's Prep by section, the slip's "Pans are done. Grill has 1 left." | `docs/kitchen-mascot.md` |

The mascot today: Home (soon saying the welcome in a speech bubble, 72 x 96 px on a wide screen), under a finished prep list, on a finished section's tab on wide screens. Never on any other page.

## Rules the earlier councils set for him (`docs/mascot-cheer-options/ideas.md`, `docs/mascot-desktop-options/brief.md`)

Only real, confirmed work; say what was finished and what is next; never the clock or speed as praise; the section and the kitchen, not the person, above all on a shared screen; rare beats constant; never in the way (no pop-up, nothing over a list line, no moved tap target, no sound); two moods only (resting and pleased); quiet zones (cooling records, temperatures, recipe methods, PIN and Who are you? screens, red failures, Not sent and No signal: a face there looks like a second status or a blessing on food safety); nothing shows, moves or plays on a work page while a line is left (wide-screen rule 2, the owner may change it); no read, listener, write, setting, sound, top bar or tab button for him. Rejected before: heads on progress bars (a second status system), a head beside Undo, "Not sent yet, I am holding 3 lines" beside No signal (a second status voice), a host on an empty list (a cached read also looks empty). Still open ideas: idea 12 a hello that knows your section, idea 13 a knock-off card, idea 18 "Chef sorted your walk-in door message", idea 24 "show me once" pointers for new starters, idea 26 a buddy for the first week.

## The change, as directions to judge (not designs)

1. **Time-sensitive words on Home, in his bubble.** The welcome bubble gains one more line, chosen from what Home already holds, most urgent first: "Bidfood closes at 14:00." "Your break is at 18:30." "A function for 40 tonight." Home only; the bands and cards stay as they are.
2. **One line from him on each page.** A small still mascot with one line of page-related words at the top of each page, from data the page already holds: Orders "Bidfood closes in 40 minutes."; Prep "Pans has 3 lines. 2 urgent."; Wastage "Nothing logged today yet."; Recipes "Tap a recipe for the method." Gone in the quiet zones.
3. **He carries the time-sensitive alerts on every page.** The cut-off band and function band are said by him instead: the same words in his bubble, the bands' places taken. One voice for what is coming up.
4. **Show me once (idea 24).** At most five pointers, each once per person, inside a page someone opened: "Starting a line? Tap On it." Never over a list, never during service hours.
5. **A knock-off word (idea 13).** After the person's last shift ends: "Pans finished its list. 2 lines roll to tomorrow. Thanks for today." Home only.

The owner said "or something": any one, a small mix, or none may be the answer.

## Cost (rough)

- Directions 1, 2, 3 and 5 read nothing new if they use what each page already holds; any new read must be named. A listener or timer just to update his words is against the coding rules unless the page already ticks (Home has a 30 second tick).
- Files: `js/app.js` (top of each page), `js/prep.js` (the words for Prep, Orders, Wastage, Home), `js/mascot.js` (a still on every page means it loads on every page: 18 KB once, and a 45 KB still), `css/app.css`; tests for every page and role at 390, 768 and 1280 px.
- Direction 3 changes approved bands (function band, cut-off band) on every page. Direction 2 adds a line at the top of every service page (fewer list lines on a phone). Both are rule changes for the head chef.

## Design references to test

Flighty (now and next from data already held; no stale status shown as live), Things 3 (today's work in front; occasional things tucked away), Headspace (calm, short words; one name for each thing; no interruptions in service), Duolingo (truthful, a clear next step; no decorative reward), Linear (work above decoration; one frame, no second system), Airbnb (time, place, status and next action together; no block that displaces useful lines).
