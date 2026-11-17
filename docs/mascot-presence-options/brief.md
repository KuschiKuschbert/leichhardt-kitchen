# The mascot a little more present on the shared kitchen screens

17 November 2026, Queensland. **Round 1: Build smaller, 5 of 5. Round 2: A first for all six. Recommended: A built whole (today finishes today, one count everywhere), repaired as the reviewers asked and drawn again as R. Waiting for the owner's choice.** The study changes no app code.

[Proposal](proposal.md) · [Evidence packet](evidence-packet.md) · [Designs and measurements](designs.md) · Preview source: `preview/`

This is role-based council analysis, not research with staff. Every measurement is a **Preview** on the real book with the click tests' stand-in and made-up lines, in the stand-in fonts.

## What the owner asked

17 November 2026: "ive ben checking our mascot and the motivation on the shared kitchen screens and since constantly put new things on the preplists and tick things off the prep list barley ever finishes completely, id like the mascot be a tiny bit more dominant."

What was found first (read in code): on Prep he shows only when every line of a view is ticked and sent. Lines written tonight for tomorrow sit on today's list under "Tonight, for tomorrow" and count as open, so once tomorrow's list is started today's list cannot finish. Open lines also roll to the next day.

## Round 1: should it be built?

Five fresh reviewers saw [the proposal](proposal.md) (five directions: 1 let today's list finish without tomorrow's lines; 2 a finished section on the All list with him; 3 he stays on Prep on wide screens in the Handy page; 4 bigger on Home; 5 a halfway cheer), [the packet](evidence-packet.md) and four pictures of today's book.

| Reviewer | Verdict | Draw | Not | Most useful change |
| --- | --- | --- | --- | --- |
| Cook mid-service | Build smaller | 1, 4; 3 only as a still with no words, after a real measurement | 2 (notes push open rows below the fold), 5 | One split count everywhere: "14 of 14 today, 3 for tomorrow" |
| Head chef | Build smaller | 1 with 2; 3 only as the bolder option, a still with no line | 4 (a shared screen shows Home once a shift), 5 | Give "today" one meaning in the header, Home and the card |
| Skeptic | Build smaller | 2, at the list's foot; 1 only whole, with one cut and only a cut clocked from today's own lines | 3, 5; 4 only as a free add-on | Count section and list finishes per day from real data, before and four weeks after |
| New starter | Build smaller | 2 (keep a finished section said, with him small); 1 only if every count agrees | 3, 4, 5 | Keep the finished section's heading on All with a full bar and him small beside it |
| Keeper of the book | Build smaller | 1 properly first, then 4; 3 as a still with no count | 2, 5 | Run 30 real days through `finOk()` with and without tomorrow's lines before choosing |

**Verdict: Build smaller, 5 of 5.**

**Agreement.** Direction 1 fixes the cause and is worth drawing (5 of 5), but only whole: one cut for the header, Home and the card, or the screen shows "14 of 14" under "14 of 20 done" (all five read this in code). The cut must not be a guess (skeptic, keeper): only a night list clocked from today's own lines may set lines aside. A halfway cheer is out (5 of 5): it names nothing finished and flips as lines arrive. Every picture of free room in the proposal was an artefact of thin data: a real day fills the Handy page with Done today (up to 280 px), Quick add and Closing soon (cook, skeptic, keeper, new starter).

**Disagreement.** Direction 2: draw (head chef, skeptic, new starter) or not (cook: notes push open rows down; keeper: takes rows). Direction 3: draw only as a still with no words or count (head chef, cook, keeper) or not at all (skeptic: decoration, a resting face round 1 refused; new starter: a third count). Direction 4: draw (cook, keeper), add-on (skeptic) or not (head chef, new starter: each person sees Home once a day).

**Leading Break-it findings (round 1).**

| Finding | Evidence | Carried into |
| --- | --- | --- |
| Direction 1 alone: the card says "14 of 14" under the header's "14 of 20 done" (all five) | Read in code: the header and `homeLines()` count tomorrow's lines | A counts once, everywhere |
| A dinner line written in the evening with no batch falls under the usual-time cut and would read as tomorrow's, so today shows as finished (cook, skeptic, new starter) | Read in code: `cutFor()` falls back to the usual time; the false finish is Risk | A sets lines aside only with an own-clocked batch; checked in the preview (`walk-A-fallback.json`) |
| An afternoon batch of 6 dinner lines after 15:00 is taken for tomorrow's list (keeper, skeptic) | Read in code (`listStart()`); Risk | Already where the page files them today; A makes it decide the finish too. Open, for the owner |
| Tomorrow's lines stay as rows on All, so the existing guards for Serve and the wide scene never fire (keeper, skeptic) | Read in code (`finPaint()`, `finFit()`) | A's card is drawn above tomorrow's lines; a build needs its own gate and test |
| A note between open sections shifts tick boxes when another screen finishes a section (skeptic) | Risk | B puts its line at the foot of today's lines |
| The room for a mascot on the Handy page runs out as Done today grows (cook, skeptic, keeper) | Measured in the preview with Quick add and Closing soon | C uses the Handy header corner, which does not change height |
| He sits beside a Not sent tick and reads as Saved (new starter) | Risk | C: no words, no change of pose on a tick; plays only after the server's answer |

## Round 2: ranking and disagreement

The three designs, the same evening walked through each, and every measurement: [designs.md](designs.md). Six fresh reviewers (the five roles and the kitchen screen designer) saw every design, the measurements and twelve pictures. Scores from 1 (would do harm) to 5 (strong), as each reviewer gave them.

| Reviewer | Ranks | A | B | C | Would build |
| --- | --- | --- | --- | --- | --- |
| Cook mid-service | A, C, B | 4 | 2 | 3 | A whole: the header, Home's bars, the card, the tab and Closing soon |
| Head chef | A, C, B | 4 | 2 | 3 | A, plus C's still with no plays, hidden while a card shows; A first |
| Skeptic | A, B, C | 4 (3 as drawn) | 2 (3 on A's cut) | 2 | A whole, then B on A's cut |
| New starter | A, B, C | 4 | 3 | 2 | A whole; B later, only if the owner still wants more |
| Keeper of the book | A, C, B | 4 | 2 | 3 | A whole; C's still later, if finishes stay rare |
| Screen designer | A, B, C | 4 | 2 | 2 | A whole, with Closing soon and the tab in the cut, at the wide scene's measured sizes |
| **Total of 30** | | **24** | **13** | **15** | |

**A first for all six.** B and C split for second place.

**The preview flattered B (found by all six, read in code).** The preview worked out B's finished sections with A's cut. The book's own rule (`secSaid()`, `secLines()`) counts a section's lines for tomorrow as open, so on this evening B by itself says nothing at all: every section has a line for tomorrow. B's "4 of 6 steps" in [designs.md](designs.md) is withdrawn: by its own stated rule it is 0 of 6 after 19:30. B is true only on A's cut.

**What A as drawn left out (five of six).** Closing soon still said "6 lines are still open" beside a green "Every line for today ticked" (pictures 4 and 5). Home's bars still counted tomorrow's lines (4 left beside "11 of 15"). The Pans tab still showed tomorrow's Pans lines as open, so a section's finished words never came. The waiting marks moved onto tomorrow's lines. And on wide screens its card was smaller than the approved scene, so he was less present than today (designer, skeptic).

**Disagreement.** Whether anything should follow A: C's still (head chef now; keeper later), B on A's cut (skeptic, new starter, later), or nothing until real finishes are counted (cook, designer). The skeptic offered a different place for an always-on mascot: instead of the Top tickers strip, which ranks people and is still an open owner item, not as a second always-on piece.

### Reference comparison

| App | Principle | A | B | C |
| --- | --- | --- | --- | --- |
| Things 3 | Today's and upcoming work kept apart | Works: "15 of 15 done · 6 for tomorrow" | Not relevant | Not relevant |
| Duolingo | Progress shows real finished work; no decorative reward | Works: the existing cheer for a true finish | Works only on A's cut; on its own rule it is silent | Needs work: a resting face with no kitchen job |
| Headspace | One name for each thing, calm words | Needs work as drawn (three counts disagreed); works repaired | Needs work: a second home for the slip's sentence | Works: no words |
| Flighty | Now and next from data already held | Works: no read, the cut already exists | Works | Works |
| Linear | The work above decoration; one frame | Works | Works | Needs work: a figure all shift; two of him at a finish |
| Airbnb | Nothing that displaces useful lines | Needs work: the scene pushes tomorrow's lines down | Needs work: one row fewer at 1280 and 1920 px | Works: nothing moves |
| Todoist | Quick adding | Not relevant | Not relevant | Not relevant |

### Contract fit

| Design | Keeps | Changes (the owner's call) | Breaks | Not evidenced |
| --- | --- | --- | --- | --- |
| A, repaired (R) | Service rules 1 to 4 (1 tap to tick; every row of today's lines where it was); green only for a finish the server has; Closing soon keeps its attention colour and words | The finish rule: "Every line ticked" means today's lines, when today's own lines clocked tonight's list. Wide rule 5: tomorrow's lines move down when the scene shows | Nothing found | Barlow, Extra large text, rendered contrast, 1.5 m, plays, the lock and PIN, midnight, 04:00 |
| B | The slip's words | Wide rule 2 (something shows on All while lines are left) | As drawn: the slip's one-truth rule (the line said what `secSaid()` refuses) | As A |
| C | Every rectangle | Wide rule 2, by design: a resting face all shift | Nothing found | As A, and the 900 px width |

### Break-it findings and disposition

| Finding | Evidence | Disposition |
| --- | --- | --- |
| B's line says "Pans and Fryers are done." above open Pans and Fryers lines for tomorrow, which the slip and the tab do not say (all six) | Read in code; the preview's own rule shown in `preview/candidate.js` | B not recommended. Only ever on A's cut, as a later step |
| A as drawn: three counts disagree (Closing soon, Home's bars, the tab) and the waiting marks point at tomorrow's lines (five of six) | Checked in the preview (pictures 4, 5, 6) | Repaired in R and checked in the preview: [13](evidence/13-R-today-done-1920.png), [14](evidence/14-R-pans-tab-1920.png), [15](evidence/15-R-today-done-390.png), [16](evidence/16-R-home-1920.png), `walk-R.json`. A build adds one test that every count agrees |
| An afternoon batch of 6 or more dinner lines after 15:00 is taken for tomorrow's list (`listStart()` takes the biggest batch), so the card and Serve come at 16:00 with dinner prep open (head chef, cook, skeptic, keeper) | Risk, read in code. Today's page already files such lines under "Tonight, for tomorrow"; A would make that decide the finish too. The preview's no-batch fixture does not cover it (skeptic) | Repair for the build: set lines aside only when the batch starts near the kitchen's usual night-list time, as the book already learns it from past nights (`summary/learned`, no new read); otherwise nothing changes. A test with 7 lines at 15:20 and 6 at 19:30. Before release, look at the clocked nights the book already keeps |
| The scene drops in above tomorrow's lines and pushes their tick boxes down; at 1280 x 900 tomorrow's lines in view go from 6 to 2 (cook, designer) | Measured in the preview (`walk-R.json`) | The build measures: the largest scene that keeps tomorrow's heading and two of its lines in view, else the compact row (A as drawn kept 6 of 6). Decision 3 |
| A held 6th line of the night list moves the cut on that screen only (keeper) | Risk | A build test with the write held: the count waits for the server, like today's finish |
| A + C puts two of him on one page at a finish (head chef, designer, keeper, skeptic) | Read from the designs | C is not recommended now |
| Nothing on screen says why a line sits under "Tonight, for tomorrow" (new starter) | Risk; older than this study | Left as it is; the heading's own sentence says it is on tomorrow's list |

## All-three mix and recommendation

| From | Part | Take or reject | Principle | Why |
| --- | --- | --- | --- | --- |
| A | One cut for every count: header, Home's total and bars, Closing soon, the card, the tab, the waiting marks | Take (6 of 6) | Things 3, Headspace | It fixes the cause, and a cook never sees two numbers for one list |
| A | "· 6 for tomorrow" on the shift line | Take | Things 3 | Tomorrow's lines are still on the page; this says why they do not count |
| A | The compact card everywhere on wide screens | Reject (designer, skeptic) | Duolingo | Smaller than today's approved scene: he would be less present, not more |
| A | The cut on a section's own tab | Take (skeptic, designer, cook) | Flighty | It unblocks the large finished words built on 11 November on the screens each section stands at |
| B | A line naming finished sections | Reject now (6 of 6 against B as drawn); later only on A's cut (skeptic, new starter) | Duolingo, Airbnb | Silent on its own rule; costs a row; a second home for the slip's sentence |
| C | A still in the Handy header all shift | Reject now (cook, skeptic, new starter, designer); later as an add-on (head chef, keeper) | Linear | Decoration with no kitchen job; two of him at a finish |
| C | Only after the server's answer, nothing while a tick is waiting | Take, as a rule | Duolingo | Already the book's rule for the finish |

**The all-three blend loses (6 of 6):** up to three figures on one page, three rule changes, and "a tiny bit" turns into a lot. A + C and A + B each have two supporters, but only as later steps: B is true only on A's cut, and C puts a second mascot beside A's finish.

### Recommend A, built whole (drawn as R)

**Today finishes today.** When today's own lines clocked tonight's list, the lines written for tomorrow leave today's counts everywhere a cook reads them, and the existing finish happens most nights.

- The header: "15 of 15 done", with "· 6 for tomorrow" on the shift line.
- Home: "11 of 15 done", and each section's bar and "left" count today's lines only.
- Closing soon: counts today's open lines only; with none left it says "Log any waste before you go."
- The waiting marks ("Waiting longest", the start-here numbers) stay on today's lines.
- **The finished list:** when every line for today is ticked and sent, the approved finished scene shows above "Tonight, for tomorrow": "Every line for today ticked. 15 of 15." and "Tomorrow's 6 lines are below.", him at the largest size that keeps tomorrow's heading and two of its lines in view, with the one Serve play as today. Phones keep the small card.
- **A section's own tab:** tomorrow's lines of that section sit last under their own "Tonight, for tomorrow" heading, so a finished section says its large finished words ("Pans are done.") with him under them, as built on 11 November. This is what puts him in front of each section's own screen far more often.
- **Only with a real night list:** lines are set aside only when the batch starts near the kitchen's usual night-list time. A single late dinner line, or an afternoon batch, leaves everything as it is today.

**Why it beats the others.** It is the only design that makes the cheer the book already has reachable, with no new place, no resting face and no new truth rule for sections. Every reviewer put it first. It answers the owner's own reason ("the prep list barely ever finishes") at the cause.

**Main downside.** He still shows only when work is finished: a night with today's lines still open shows nothing new. It changes what "done" counts in every place a cook reads, which the team has to get used to, and it rests on the book telling tomorrow's list from a dinner batch, which nobody has checked over real nights.

**Review status.** R is the lead's drawing of the six reviewers' repairs to A. It was not shown to the reviewers again. Measured: [walk-R.json](evidence/walk-R.json).

### The recommended preview, measured (Preview, stand-in fonts)

Taps to tick a line: 1 before, 1 after. Today's lines: every row where it was, at every step and width.

| Screen | Rows in view at 20:00 | Rectangles of today's lines moved | Tomorrow's lines in view when today's finish shows | The finish | A section's tab, finished | Sideways scroll, errors |
| --- | --- | --- | --- | --- | --- | --- |
| 1920 x 1080 | 9, as today | 0 | 5 of 6 (today: 6) | 40 px words, him 128 px tall | "Pans are done." 40 px, him 96 x 128 | 0, 0 |
| 1280 x 900 | 5, as today | 0 | 2 of 6 (today: 6) | 40 px words, him 128 px tall | the same | 0, 0 |
| 390 x 844 | 4, as today | 0 | as today | the small card, 48 x 64 | not on phones | 0, 0 |

With no signal the scene goes and the counts stay as they were. Home at 1920 x 1080: no card moves.

## Decisions for the head chef

1. **The design.** Recommended: A built whole, as R. Or A as first drawn (compact card everywhere), or nothing.
2. **The rule it changes, by name.** "Every line ticked" and every count a cook reads mean today's lines. Lines written tonight for tomorrow, in a real night list, do not count against today. They still show under "Tonight, for tomorrow" and can still be ticked tonight.
3. **Size when tomorrow's lines are below.** Recommended: the large scene where it keeps tomorrow's heading and two of its lines in view, else the compact row. Or always the compact row (nothing of tomorrow's moves far).
4. **A later step, if he is still rarely seen after two to four weeks:** C's still in the Handy header (head chef, keeper reviewers) or B's done line on A's cut (skeptic, new starter reviewers). Each would be its own small proposal.
5. **Still open:** the Top tickers strip (keep, switch off, or the mascot in its place, the skeptic's idea), and how often the list and sections finish, which the book does not count today.

## Before release (implementation, not this preview)

- One cut function used by the page, the header, Home, Closing soon, the waiting marks, `finOk()`, `finNote()`, `secLines()`/`secNext()`/`secSaid()` and a section's tab, so every count agrees; one test that they agree.
- The night-list guard and its tests: 7 lines at 15:20 and 6 at 19:30; one late line with no batch; the usual time unknown.
- The scene above tomorrow's lines: Serve once, words first, the size rule from decision 3, nothing under a row of today's, quiet with no signal; tests at 1280 and 1920 px and on a phone.
- A held write, another screen's tick, Undo, a new line for today after the finish, the 10 minute lock and PIN, Queensland midnight and 04:00, reduced motion, Extra large text, Barlow.
- `docs/kitchen-mascot.md`, `docs/prep-book.md` (Tonight, for tomorrow; the count), `docs/design-patterns.md` and the mascot tests change in the same pull request.
- Before it is called done: read it from 1.5 m on one section screen, and look at the clocked nights the book already keeps to see how often the batch rule would have been wrong.

## Home: the mascot says hello (asked 17 November 2026)

The owner, after hearing that the Home mascot is personal to each person (their own shuffled action each day) and the prep pages never are: "can we at least on the home screen have the mascot welcome them now? With a speech bubble or something as well?"

**Quick check, not a full council** (`.claude/skills/service-council/SKILL.md`, "When it runs": a change on an existing page that adds no tab, bar button, pop-up or step). Home is not a service page. Same theme as this study, so it is recorded here. Every measurement is a **Preview** (`preview/home-bubble.js`, `home-bubble.css`, `home-capture.mjs`; `evidence/walk-home.json`), stand-in fonts, a shared screen, Ann on Pans at 14:00.

**Three options drawn, one placement** ([20-home-bubbles-1920.png](evidence/20-home-bubbles-1920.png)): a paper-and-ink bubble on the welcome row, left of him, its tail pointing at him, never over a word of the name, the date or a seasonal ornament (measured the way `js/mascot.js` measures his corner). Where it does not fit there is no bubble: the heading already greets.

| | H1 He says the greeting | H2 A line of his own for today's action | H3 Your section today |
| --- | --- | --- | --- |
| Words (Ann, Smash day) | "Good afternoon, Ann!" | "Let's smash it." | "Pans today. 1 left on the list." |
| Personal because | the heading's own varied greeting | each person's own shuffled action (11 lines, one per action) | the person's section from Your day and Prep by section |
| Bubble at 1920, 1280, 768 px | 206, 206, 121 px wide | 148 px | 256 px |
| At 390 px | none (no room beside him) | none | none |
| Rectangles moved, taps added, reads | 0, 0, 0 | 0, 0, 0 | 0, 0, 0 |
| Headspace: one name for each thing | Needs work: two greetings side by side | Works: his own words, nothing to keep true | Needs work: repeats Your day and Prep by section |
| Flighty: no stale status shown as live | Works | Works | Needs work: "1 left" must follow the list while it shows |
| Earlier council rules (`docs/mascot-cheer-options/ideas.md`) | Fine | Fine: two moods, no clock, no person rated | A second status voice, which the cheer study turned down |

**Lifetime, the same for all three:** the bubble comes with his first play of the day and stays a few seconds after he rests, then goes; a tap on him replays both. Returning to Home the same day: no bubble, as he opens at rest. Reduced motion: the bubble shows with his still for a few seconds, with no fade. Hidden from screen readers (the heading already greets). Not a control. On a lock or handover it goes with him.

**Try to break it.** Long names and seasonal ornaments: the bubble is left out when the room beside him is under 120 px, or the words would wrap (checked at four widths with a short name; a 40-character name and Christmas snow not exercised). A shared screen: Home shows on a person's first sign-in of the day, so the bubble is seen once a day per person per screen, and a cook who goes straight to Prep may miss it (accepted). H2's words were chosen so none reads as status ("order up" is not used for Serve). Phones mostly get no bubble: at 390 px the greeting reaches him.

**Recommended: H2**, his own line for today's action, because it is the one that is his and personal without repeating the heading or stating a fact that can go stale. The owner chooses; H1 is the most literal "welcome".

### The owner's answer: he says the welcome (17 November 2026)

Shown H1, H2 and H3, the owner answered: "I was wondering if we can replace the welcome text with the mascot and keep the randomisetmr, so instead of the big welcome home message, we just have the mascot talk to you." No preference on how long it stays. So the welcome itself is his speech bubble and it stays all visit, since it is the page's heading.

**Drawn** (`preview/home-say.js`, `home-say.css`, `home-say-capture.mjs`; `evidence/walk-home-say.json`), in the book's own fonts (Barlow, Barlow Condensed and Caveat supplied locally), against today's Home, with "Ann" and "Maximiliana Featherstonehaugh-Ramírez" at four widths ([23](evidence/23-home-say-1920.png), [24](evidence/24-home-say-390.png), [25](evidence/25-home-say-768.png)):

- The heading keeps its element (`#rtitle`, the page's focus target and heading for a screen reader), its words and its randomiser (celebration, shift, time of day). It is drawn as his speech bubble: paper and ink, its tail pointing at him, in the same Caveat handwriting, smaller than the big welcome (34 px on a wide screen, 26 px on a phone, the long-name sizes kept).
- He stands on its left, his feet on the date line: 72 x 96 px on a wide screen (64 x 85 today), 48 x 64 px on a phone. The date sits under the bubble.
- His daily action plays once and he rests, as today; a tap replays it. Long names wrap inside the bubble.

| Measured (Preview) | Today | He says it |
| --- | --- | --- |
| Heading font, 1920 / 390 px | Caveat 48 / 42 px | Caveat 34 / 26 px |
| Him, 1920 / 390 px | 64 x 85 corner / 64 x 85 corner | 72 x 96 / 48 x 64, left of his words |
| Your day card moves down, 1920 / 390 px (Ann) | | 15 / 8 px |
| The same with the long name, 390 px | | 21 px |
| Sideways scroll, errors | 0, 0 | 0, 0 |

**Quick check.** No tab, button, pop-up, step, read or write. Taps to see your section and break: 0, as today. Rows on a phone: the cards start 8 px lower. Headspace: one greeting, said once, by him. It changes the chosen heading design of 10 November (the named welcome, staff personalisation A) and the mascot's corner, card and room places, which is the owner's call, made here.

**For the build.** The heading's bubble look and his room come with the page's first draw, so nothing jumps when his art arrives; if his art fails, or an older saved copy of `js/mascot.js` answers, the heading goes back to today's plain welcome. Signed out keeps its plain day heading, with no mascot. `js/app.js` (the heading's class), `js/mascot.js` (his place beside the words, a new `api`), `css/app.css`; `tests/mascot.test.js` (his place), the welcome and Home layout tests; `docs/kitchen-mascot.md`, `docs/design-patterns.md` (Home mascot), `docs/head-chef-decisions.md`. Not evidenced yet: seasonal ornaments beside the bubble, Extra large text, reduced motion, the Functions-only Home.

## Chosen, 17 November 2026

The owner answered three questions the same afternoon:

- **The Home welcome said by the mascot: "Ship it now".** Built in pull request #741 (`docs/kitchen-mascot.md`, He says the welcome).
- **Design A: "Build A".** As recommended: A built whole, drawn as R. Decision 2 (the rule it changes) and decision 3 (the large scene where it keeps tomorrow's heading and two of its lines in view, else the compact row) go with it. Built in its own pull request after #741, with the "Before release" list above.
- **The other core pages: Orders, Functions and Cleaning** get a short council each before they are built: the mascot at that page's own finish line, in the page's empty space, with the finished card's pattern ("Every line ordered. 8 of 8.", "Every round is out.", "Kitchen is packed down. Good night, team."). Transfers was not chosen. Record: `docs/mascot-voice-options/brief.md` (Across the core).
