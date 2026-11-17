# Evidence packet: the mascot a little more present on the shared screens

Source commit: `main` at c9649ab (17 November 2026). Every picture is a **Preview** of the live code with the click tests' Firebase stand-in (`tests/fake/`), made-up people and lines, the stand-in fonts (not Barlow), a shared kitchen screen, signed in as a cook (Ann, section Pans). Nothing was measured in the kitchen.

## Pictures (today's book)

| Picture | What it shows |
| --- | --- |
| [0-all-1920.png](evidence/0-all-1920.png) | All list at 1920 x 1080, 7 of 14 done, four sections. No mascot on Prep. Top tickers strip above the book. The Handy page has Done today, then about 400 px of empty paper. The list page has 167 px of empty paper under its last row. 340 px of gutter each side of the book |
| [0-pans-1920.png](evidence/0-pans-1920.png) | The Pans tab with one line left. Nothing of the mascot. |
| [0-home-1920.png](evidence/0-home-1920.png) | Home at 1920 x 1080: the mascot 64 x 85 px top right of the welcome, the cards, about 400 px empty below |
| [0-all-390.png](evidence/0-all-390.png) | All list on a 390 px phone: 7 rows in view, 9 px under the last |

Measured (Preview, `tests/lib` stand-in, this fixture): taps to tick a line 1; list rows visible at 1920 x 1080 on All 7 of 7 open lines; at 390 x 844, 7 rows.

## What is live now (`docs/kitchen-mascot.md`)

1. **Home:** one shuffled action a day per person (all 11), played once on the first Home view, then the Welcome pose. Tap replays. 64 x 85 px in the welcome corner at every width (48 x 64 when words reach it); on the Your day card when the words fill the corner. Home only, never on a work page. On a shared screen the first sign-in of the day opens Home; later sign-ins that day go back to the person's page.
2. **Under a finished prep list** (All list only): when every line of today's own list is ticked and the server has every tick (`finOk()`), the page's "ticked off" sentence becomes a card: "Every line ticked. 6 of 6." in a green speech shape, the mascot beside it. Serve plays once on the phone whose tick finished the list, once a kitchen day; every other screen and a reload show a still. A state, not an event: a new line, Undo or another screen corrects it.
3. **On the slip:** the tick that finishes a section (2 or more lines, server has it) adds one line: "Pans are done. Grill has 1 left." Words only, 9 seconds, once a kitchen day per section per device. Silent where All, the tab and Home would count differently, and for names that read wrongly.
4. **Wide screens (from 900 px):** a finished section on its own tab says the slip's sentence at 40 px with him under it as a still, 96 x 128 px. The finished list says "Every line ticked. 14 of 14." at 40 px with him at his drawn 192 x 256 px and the one Serve play. Words first; never taller than his words; nothing while a line is left; quiet with no signal; nothing on the PIN screen.
5. **Tonight, for tomorrow:** on today's All list, open lines written after tonight's list was started sit last under "Tonight, for tomorrow" (`tonightLine()`, `cutFor()`), because they go on tomorrow's list. `finOk()` counts them as open; the slip's next-section words pass them over.

## Rules the earlier councils set (still in force unless the owner changes them)

From the wide-screen study's round 1 (`docs/mascot-desktop-options/brief.md`, 11 November 2026, 5 of 5), the rules every design followed:
1. A state, worked out on every draw from lines the screen holds, with the list's state ok and nothing waiting to be sent. Never from a cached, empty or refused read. No timing of its own.
2. **Nothing shows, moves or plays on a work page while a line is left on the view in front of the cook. No resting face, loop, blink or idle.** (cook, head chef, skeptic, new starter)
3. The section's sentence stays on the slip at every width, word for word. One sentence, one home, one set of rules.
4. Same truth rule as the slip sentence (2 lines or more; All, the tab and Home count the same; names it does not say).
5. No rectangle that exists today moves. Decide by measured free room, not width alone. Nothing changes under 900 px.
6. What is left reads at least as large as what is done.
7. Not a control on a work page.
8. At most one play per finish per kitchen day per device, on a guard that survives the shared screen's 10 minute lock. Never hold Serve.
9. Words never wait for the art. With no art or reduced motion the words stand alone.
10. No read, listener, write, rules line, setting, sound, top bar or tab button. No art in the saved shell.
11. Quiet zones stay quiet: PIN and lock screens, Who are you?, Who did this?, Not sent, No signal, failures, cooling, temperatures, recipe methods.
12. A placement is opened by a click test at the width it exists.

From the cheer study (`docs/mascot-cheer-options/ideas.md`, 10 November 2026), the rules every idea follows: only real, confirmed work; say what was finished and what is next; never the clock or speed; the section and the kitchen, not the person (above all on a shared screen); rare beats constant (a cheer on each tick is noise by the tenth); never in the way (no pop-up, nothing over a list line, no moved tap target, no sound); two moods only, resting and pleased; quiet zones; a way out. Rejected then: heads on progress bars (a second status system, movement on every tick), a head on the slip beside Undo, a host on an empty list (a cached read also looks empty). Research summarised there: novelty fades in about four weeks; praise that informs ("Larder is done. Grill has 2 left.") helps, praise that rates the person backfires; ranks, points, streaks and speed rewards backfire.

Owner choices that overrode councils: all 11 actions kept on Home (council wanted fewer); the slip sentence built at once (council split 3 to 3, recommended waiting four weeks); both lines of the wide finished words in green.

## Service rules (head chef, 5 November 2026)

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

## Colour and surface contracts (excerpts)

- `docs/surface-colours.md`, Selected design: steel for work books (Prep), sage for people, charcoal for current live boards, quiet paper inside for reading and writing. Local state meaning wins over surface decoration.
- `docs/colour-coding.md`, Shared meanings: green (`--done`, `--done-ink`, `--done-tint`) confirms complete, saved, included or assigned; orange is action, attention and brand (not every orange word is overdue); charcoal is Prep Urgent; amber/neutral orange with words is pending/not sent; red is failure. Status must read without colour too.
- `docs/design-patterns.md`: Home mascot (decorative button, Home only), Finished-list card (`.nb-fin`, in the page, never over it, not a control, a state), Finished words wide (`.nb-scene`), Slip sentence (nothing else may add a line to a slip without the head chef's OK).
- `docs/loading-motion.md`, Behaviour: reduced motion removes entrances and transitions; motion never implies completion that is not confirmed; a prep checkmark never suggests an unconfirmed completion.

## Design references (`.claude/skills/service-council/SKILL.md`)

| Reference | Check | Avoid |
| --- | --- | --- |
| Linear | Consistent frame, work more prominent than navigation | A second navigation system |
| Things 3 | Today's and upcoming work distinct; occasional details tucked away | Hiding chosen one-tap controls |
| Airbnb | Time, place, status and next action together | Decorative cards that displace useful lines |
| Todoist | Quick adding with known defaults | Guessing from ambiguous text |
| Flighty | Now and next from data already held | New listeners for the look, distracting movement, stale status as live |
| Duolingo | Each tap answers truthfully; progress shows real completed work and a next step | Decorative rewards without a kitchen job; Saved before acknowledgement |
| Headspace | Calm, short words, one name for each thing | Vague reassurance, interruptions during service |

## Try to break it (families to consider)

Confusion and accidental action; repetition and delayed answers; failed reads and writes (cached answer read as empty, pending read as Saved); interruption and handover (the 10 minute lock, Who did this?, the PIN); time boundaries (Queensland midnight, the tonight cut, the 04:00 unlock); access and conflicting state (two screens ticking); misleading presentation (colour or motion implying success not established). Report up to three concrete scenarios each, labelled Reproduced, Checked in a named fixture, Risk / Not evidenced, or Not applicable.

## Not known

Which page each shared screen sits on most of the shift (All list, a section's tab, the wall board); how many lines and sections a normal day has; how often a section or the whole list is finished; whether tomorrow's lines are written on these screens during the day; touch or mouse; zoom and text size.
