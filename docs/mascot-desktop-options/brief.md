# The mascot on the kitchen's wide screens

11 November 2026, Queensland. **Round 1: Build smaller, 5 of 5. Round 2: B first for four of six, C last for all six. Recommended: a blend of A and B that four of six reviewers named. The finished states are said large in the page and the mascot stands under his words: half size on a finished section's own tab, his full drawn size only when the whole list is finished. Not chosen yet: the owner picks. Nothing in the app has changed.**

[Proposal](proposal.md) · [Evidence packet](evidence-packet.md) · [Designs and measurements](designs.md) · [Pictures](#pictures) · Preview source: `preview/`

This is role-based council analysis, not research with staff. Every measurement is a **Preview**: review-only styles and a script switched on over the real book (`main` at 925d985) with the click tests' Firebase stand-in, made-up people and prep lines, and the book's real fonts. Nothing was measured in the kitchen or on a real section screen, and no app code changed.

## What the owner asked

After the mascot's first two cheers went live (the card under a finished prep list, #671, and the sentence on the slip, #673), the owner asked: "can we enhance the mascot system, at least on desktops?" The owner then said: "i believe the 5 screens in the kitchen we use are 21 to 24 inch wide screens, they are in every section, all the staff is using them for the work."

So the wide screen is not an office computer. It is each cook's main work screen, one in every section, all shift. The first study measured a 390 px phone first, and what it built is small and rare on purpose: on a 1920 x 1080 screen the mascot is 64 x 85 px, a third of his drawn size, and the section's sentence is 16 px words for up to 9 seconds.

## What was looked at first

- **Today's book on wide screens**, measured at 1280 x 900, 1440 x 900 and 1920 x 1080 ([the packet](evidence-packet.md)): the page stops at 1240 px, so a 1920 px screen has 340 px of empty gutter each side; a finished list leaves 430 to 610 px of empty list page; a section's own tab, finished, leaves about 600 px.
- **The gap nobody had seen.** The mascot's card shows on the All list only (`finOk()` in `js/prep.js`). A screen kept on its section's own tab shows the mascot on Prep 0 times a day, however much is finished.
- **Two idea runs** (one for delight, one for the kitchen's work), ten ideas each, before any design. Both put the same two first: a finished section said on its own screen, and the finished list at a size read from the bench. Both listed the same things not to do: a mascot who lives beside the list all shift, a walk across the foot of the screen, a full-screen finish, anything on the PIN screen, heads on tabs or bars, a named or timed cheer, any sound from five screens in one room.

## Round 1: should it be built?

Five fresh reviewers saw [the proposal](proposal.md) (four directions: bigger where he is; a place of his own beside the book; the team's wall board; more moments), [the packet](evidence-packet.md) and today's screens. No design existed yet.

| Reviewer | Verdict | Main reason | Worth drawing | Most useful change |
| --- | --- | --- | --- | --- |
| Cook mid-service | Build smaller | Nothing makes a tick faster. What a wide screen can fix is the finish said in 16 px words for 9 seconds, too small from the stove | Bigger at a finish: yes. The rest: no | Words grow first. Finished states only. Include a section's own tab. Not by width alone |
| Head chef | Build smaller | The gap is that the finish and what is left cannot be read from where the cook stands, not that the mascot is small. It is the owner's wish, not a measured fault | Bigger at a finish: yes. Beside the book: once, as the comparison. The rest: no | Draw a words-only version as the cheap baseline. Decide Top tickers first |
| Skeptic | Build smaller | Words too small for the distance is not evidence that a bigger character gets more prep done. Both cheers are a day old and every number is from a 9-line stand-in | Bigger at a finish, Prep only: yes. The rest: no | Decide by measured free room. If a third design is needed, he appears only at a true finish |
| New starter | Build smaller | The finish words are the smallest thing on the page: a real reading gap, bigger in a second language. A resident, or a sentence with two homes, is one more thing to learn | Bigger at a finish: yes. The rest: no | What is left reads as large as what is done. Never look like a control |
| Keeper of the book | Build smaller | The cheap part is real: no reads, and a page state drawn larger. But "bigger where he is" misses the screens it is for | Bigger at a finish: yes. The rest: no | One small state beside `finOk()`. A test at every width it exists. A play guard that survives the lock |

**Verdict: Build smaller, 5 of 5.**

**Agreement.** Make the finished states larger, in the page, where the page is empty anyway, and include a finished section on its own tab. Words first: he is never bigger than his words. The sentence stays on the slip at every width. No wall board host (the board already says it, and no screen is known to show it). No new moments (each is its own council). Nothing under 900 px changes.

**Disagreement.** A mascot beside the book: four said no; the head chef reviewer asked to see it once as a comparison. Home: the cook allowed a bigger mascot only if no card moves; the head chef, skeptic and keeper cut it.

**Rules round 1 set**, all carried into the designs: a state worked out on every draw from lines the server has; nothing shows or plays on a work page while a line is left on that view; one sentence, one home; the slip sentence's own truth rules (`secLines()`, `secNext()`); no rectangle moves, by measured room; what is left as large as what is done; not a control; one play at most, on a guard that survives the lock; words never wait for the art; no read, listener, setting or sound; the quiet zones stay quiet; a test at every width a placement exists. The full list is in [the packet](evidence-packet.md).

## The three designs

Drawn on the real book and walked through the same task: a cook on the Pans screen ticks an ordinary line, then the last Pans line; another screen ticks a Grill line and writes a new Pans line; the rest of the list is ticked on the All list; then Home. Full description, the costs table and every measurement: [the designs](designs.md).

| | A. Words first | B. The finished page is his | C. Beside the page |
| --- | --- | --- | --- |
| Central idea | The gap is reading distance, so fix the words. No new art | At a finished state the list page is empty anyway, so that is where he gets his drawn size | The page stays as it is. He has a place in the empty gutter, only while there is a finish to say |
| A section finished on its own tab | The built sentence at 40 px in the page | The same words, and he stands under them at 192 x 256 px | Today's grey words; he stands in the gutter with the sentence |
| The whole list finished | The card's words at 40 px; he keeps 64 x 85 px | The card as the same scene, 192 x 256 px, Serve once as today | The card's words; he says it from the gutter |
| A section finished on the All list | The slip, as today | The slip, as today | He appears beside the book for the slip's 9 seconds |
| Lifetime | A state in the page | A state in the page | An event on All, a state on a finished view |
| Widths | From 900 px, by measured room | From 900 px, by measured room | From 1600 px only |
| Approved rule it changes | A section's tab keeps its plain words | The same | Nothing shows on a work page while a line is left |

Also drawn: **B with C's arrival** (one combined preview: B in the page, and from 1600 px he appears in the gutter for 9 seconds when a section is finished on the All list). And, apart from the designs, for the owner only: Home under the cards, and the resident beside the book that round 1 turned down ([`6-apart.png`](evidence/6-apart.png)).

In every design: 1 tap to tick before and after, every list row where it is today, no new control, read, write or rules line, the slip untouched, and nothing under 900 px changed. Measured at eight screen sizes: 0 work rectangles moved, 0 new scroll, 0 browser errors in every run.

## Round 2: ranking and disagreement

Six fresh reviewers (the five roles and the kitchen screen designer) saw the designs, the measurements and seven picture sheets. Scores are whole numbers from 1 (would do harm) to 5 (strong), as each reviewer gave them.

| Reviewer | Ranks | A | B | C | B with C's arrival | Would build |
| --- | --- | --- | --- | --- | --- | --- |
| Cook mid-service | B, A, C | 4 | 4 | 2 | 3 | B with A's proportion: 40 px words and a 96 x 128 px still on a section's tab; full size and Serve only for the whole list |
| Head chef | B, A, C | 3 | 4 | 2 | 3 | B alone, a still, no gutter, after eight fixes. If the two finishes are confused, cap him at 96 x 128 px on a tab |
| Skeptic | A, B, C | 4 | 3 | 2 | 2 | A's large words with B's still under them, sized by what is true: 96 x 128 px on a tab, 192 x 256 px only at the finished list |
| New starter | A, B, C | 4 | 3 | 2 | 2 | B's scene with A's order of sizes. If only the drawn designs are on offer, A |
| Keeper of the book | B, A, C | 3 | 4 | 2 | 2 | B, repaired: one function for the slip and the page, words alone as the fallback |
| Screen designer | B, A, C | 3 | 4 | 2 | 2 | B in the page with A's proportion, after a combined preview |
| **Total of 30** | | **21** | **22** | **12** | **14** | |

**B first for four of six. A first for two. C last for all six.**

**All six agreed** on the four questions the designs left open: a still on a section's tab, not a play; the large size wherever it fits, not half everywhere; the sentence standing twice for up to 9 seconds (slip and page) is acceptable, because they are the same words doing two jobs; and Home stays as it is.

**Disagreement.** A or B first: the skeptic and the new starter put A first because in B the picture is bigger than its words. Four reviewers (cook, skeptic, new starter, designer) said a blend of A and B would beat their own first choice, and named the same one. The head chef and the keeper said no blend beats B repaired; the head chef named the blend's cap as the repair if a section's finish and the list's finish are confused, and the keeper's repairs are all in it. Nobody wanted any structural part of C.

**Why C lost, in the reviewers' words.** It shows a 192 x 256 px figure beside a list with five lines left, which four round 1 reviewers ruled out. He comes and goes about 1,000 px from the tick boxes as the cook reaches for the next line, and flicks off when the next tick replaces the slip. It exists only from 1600 px, so a zoomed 1920 px screen gets nothing. On a finished view one fact stands in two wordings. It is a layer outside the page with its own lock, PIN and test questions.

### Reference comparison

| App | Principle | What it decided |
| --- | --- | --- |
| Flighty | Now and next from data already held; no distracting movement; no stale status shown as live | For A and B: a state worked out on every draw, measured following the list. Against C's arrival beside open lines, and against a scene left standing with no signal |
| Duolingo | Progress shows real finished work with a clear next step; no decorative reward | For the server gate and the equal-size next line. Against the same full-size reward for one section as for the whole list, and against a play at every section |
| Linear | One page frame and one placement; no second system | For B's single pattern for both finished states, in the page. Against C's place outside the frame |
| Things 3 | Today's work stays in front; occasional things stay out of the way | For A and B: the finish is said only on a page with no line left, and goes the moment a line is written. Against the resident |
| Airbnb | Status and next action together; no duplicated or decorative block | For A and B: done and what is left together where the list was, nothing displaced. Against C: one finish in two places |
| Headspace | Calm, short words; one name for each thing | For the built sentence, word for word. Against "Pans are done." alone while lines are left, and against two sentences for one finish |
| Todoist | Quick entry with known defaults | Not relevant: nothing touches adding a line |

### Contract fit

| Design | Keeps | Changes or breaks | Not evidenced |
| --- | --- | --- | --- |
| A | Service rules 1 to 4 (Preview: 1 tap, every row where it is). Round 1 rules on work in progress, the slip, measured room, equal sizes, no control, no reads | Proposed departure: a section's own tab keeps its plain words (`docs/kitchen-mascot.md`), and the Finished-list card's word size | No signal, rendered contrast, reading at 1.5 m |
| B | As A. One pattern for both finished states | As A, and the card's art grows from 64 x 85 to 192 x 256 px. "Never bigger than his words": needs work as drawn | As A, and missing art, reduced motion, the lock and PIN |
| C | Leaves every word in the page | Breaks round 1's "nothing shows while a line is left" on the All list, by design. Switched by width, not measured room. Appears by itself beside a service page (service rule 2 needs the head chef's OK). Breaks "the finish is said once" on finished views | The lock and PIN beside a fixed layer; any test at 1920 px |
| The blend (below) | As B, and "never bigger than his words" on a section's tab. Measured: words stand with no art; quiet with no signal | The same proposed departure as A and B. What is left drawn in the page's ink is new (the head chef's call) | Reading at 1.5 m, rendered contrast, reduced motion, a screen reader, the lock and PIN, midnight and 04:00 |

Colour and state: no new surface; the done green is used only for a finish the server has; the large words are the done ink on the done tint, 5.2 to 1 worked out from the two colours (not measured on a screen). The page's pointer was drawn smaller in A and B than the book's own size, which the designer marked Needs work; the blend keeps it at the book's size.

### Break-it findings and disposition

| Finding | Evidence | Disposition |
| --- | --- | --- |
| "Pans are done." alone at 40 px while lines are left that no section can be named for. The slip is silent there by rule, so the page would read as nothing left (head chef, skeptic, new starter, keeper) | Read in code | Rule changed in the blend: lines left and no section to name, today's plain words stay. Not exercised by a fixture. Build: one function for the slip and the page, and a click test for each silent case |
| The preview's large words waited for the mascot's file (all six) | Read in code | Repaired and measured in the blend: with his file and art blocked the words stand alone, with no tail and no empty room |
| At 1280 x 720 with Extra large text B gave a section 192 x 256 px and the list 96 x 128 px on one screen (five reviewers) | Reproduced | Repaired in the blend: words first, one size of words per screen from the room in view above the slip, then the largest mascot that fits |
| The signal drops with a scene standing; another screen writes a line; the scene still says done, large (cook, skeptic, keeper) | Risk, read in code | Repaired and measured in the blend's preview: the scene gives way to today's words when the signal drops and returns when it is back. Build: gate on the book's own no-signal state |
| A section's finish and the list's finish are the same scene at the same size: "Pans are done" read from the bench as "prep is done" (all six) | Risk | The blend: 96 x 128 px on a section's tab, his drawn size only for the whole list. Reading at 1.5 m is not evidenced: look at one real screen before release |
| On a slow connection the scene does not come with the server's answer on a tab: it turns up at a later, unrelated draw (keeper) | Read in code | Build: a twin of `finDue()` in the listener's path, with a held-write test that fails first |
| Midnight and the 04:00 refresh with a scene standing (keeper) | Risk | Build: the gate includes today's date; two click tests |
| The last tick of the whole list made on a section's tab could play Serve where the design says a still (keeper) | Read in code | Build: decided on purpose. Recommended: the tab shows the section's still; Serve stays with the All list's card |
| He looks tappable at size, and is a button on Home (new starter) | Read in code | The blend keeps him small on a tab. Build: no pointer or pressed look; a touch check that a tap does nothing |
| What is left stands in the done green at 40 px (cook, new starter, designer) | Seen in the pictures | The blend draws what is left in the page's ink. The head chef's call: decision 3 |
| Long section names at 40 px and at Extra large text (new starter, designer) | Not evidenced in round 2 | Measured in the blend with "Salads and dessert" and "Hot larder and pass": the words wrap inside the page and nothing moves |
| C and the mix: the gutter figure flicks on and off in a run of ticks; a narrow column from 1600 to 1799 px; a fixed layer beside the PIN screen | Reproduced, read in code, risk | Not built |
| A shared screen locks 10 minutes after the last touch, so a scene is seen for at most 10 minutes; the lock and PIN were not exercised with a scene standing | Read in code | Stands. Build: a click test that locks with the scene standing and finds nothing of it on the PIN screen. Never repaired by showing him on the lock screen |
| The Top tickers strip names and ranks a person above a cheer worded for the section | Seen in every Prep picture | Open since 10 November: decision 6 |

## All-three mix and recommendation

| From | Part | Take or reject | Principle | Why |
| --- | --- | --- | --- | --- |
| A | The built sentence at 40 px in the page, done and left at one size | Take (6 of 6) | Flighty, Headspace | It is the whole of the reading gap round 1 found |
| A | Words lead: sized first, he is the smaller thing | Take (4 of 6 named it) | Duolingo | Keeps round 1's "never bigger than his words" |
| A | Words alone as the state when the art is missing, motion is reduced or the room is short | Take | Flighty | The words never wait for the art |
| A | No mascot on a section's own tab as the end state | Reject (6 of 6) | | It leaves him at 0 showings a day on the screen the owner asked about |
| B | The scene in the empty list page, as a state that follows the list | Take (6 of 6) | Things 3, Linear | Nothing beside a live list; one pattern for both finished states |
| B | A still on a section's tab; the one Serve play kept for the whole list | Take (6 of 6) | Duolingo | Motion then means one thing: the whole list is done |
| B | Size by measured room | Take, repaired | Flighty | It is what reaches a zoomed screen |
| B | 192 x 256 px on a section's own tab | Reject (cook, skeptic, new starter, designer; the head chef as a repair) | Duolingo | The biggest picture should mean the biggest finish |
| C | One mascot at a time; on screen only while there is a finish to say | Take, as rules | Linear | B already keeps both |
| C | The gutter place outside the page | Reject (6 of 6) | Linear, Airbnb | A second frame, 1,000 px from the tick boxes, only from 1600 px |
| C | The 9 second arrival on the All list while lines are left | Reject (6 of 6) | Things 3, Flighty | Breaks round 1's rule where the list is longest |

**The all-three blend loses to a two-way blend.** C adds a second place to look and a rule break for a case nobody has confirmed (a screen kept on the All list). If the owner says the screens sit on the All list, the smaller answer is the slip's own sentence in larger type on wide screens, as its own small proposal.

### Recommend: B's finished page with A's proportion

**The finished states are said large, in the page, and he stands under his words: half size on a finished section's own tab, his full drawn size only when the whole list is finished.**

- **A finished section on its own tab** (new, from 900 px wide). Where the page says "Nothing left to do in Pans." it says the built sentence at 40 px: "Pans are done." and under it "Grill has 2 left." He stands under the words as a still, 96 x 128 px, never taller than they are. The page's pointer, "See Done today under Handy.", stays under him at the book's own size.
- **The whole list finished, on the All list.** The card that is live becomes the same scene: "Every line ticked. 9 of 9." at 40 px, and he stands under it at 192 x 256 px, his drawn size, with the one Serve play he has today.
- **A state, not an event.** Two lines or more, every one ticked and on the server, nothing waiting to be sent, signal up, the slip sentence's own silences. It follows the list on every draw. Where the slip would be silent, the page keeps today's plain words.
- **Words first.** The words are sized first, one size for both states on a screen: 40 px from 1280 px wide where the room in view holds them, 28 px otherwise, today's book if neither fits. Then the largest mascot that still fits, then none. With no art the words stand alone.
- **Nothing else changes.** The slip keeps its sentence at every width. No play on a tab. Nothing beside a list with lines left. Home stays as it is. Nothing under 900 px.

**Why it beats the others.** It is the only version that puts him on a section's own screen (A does not) without making one section's finish look like the kitchen's (B does) or showing anything beside open work (C does). Size carries meaning: the bigger finish gets the bigger picture. It answers the owner's ask and round 1's reading gap in one pull request with no reads.

**Main downside.** It changes an approved rule (a section's own tab keeps its plain words), and a finished section's scene can stand for a long time on a personal screen, or for only 10 minutes on a shared one. A screen kept on the All list sees nothing new until the whole list is finished.

**Review status.** The blend is the reviewers' own: four of six named it and the other two named its parts as repairs. The combined preview was drawn and measured by the lead after round 2 and has not been seen by the reviewers. Three details in it are the lead's reading of their notes and are not reviewed: what is left drawn in the page's ink, the pointer under the scene, and the exact size rule. A short follow-up look by the screen designer and the skeptic belongs at the start of the build.

### The recommended preview, measured

Taps to tick a line: 1 before, 1 after. List rows: every row where it is today.

| Screen | Setting | Work rectangles moved | Steps with a new scroll | Browser errors | A finished section (own tab) | The finished list |
| --- | --- | --- | --- | --- | --- | --- |
| 1920 x 1080 | Ordinary | 0 | 0 | 0 | 96 x 128, 40 px words | 192 x 256 |
| 1920 x 1080 | Long section names | 0 | 0 | 0 | 96 x 128, 40 px words | 192 x 256 |
| 1920 x 1080 | His art fails to load | 0 | 0 | 0 | words alone, 40 px | words alone |
| 1920 x 1080 | Sous chef | 0 | 0 | 0 | 96 x 128, 40 px words | 192 x 256 |
| 1920 x 1080 | Extra large text | 0 | 0 | 0 | 96 x 128, 50 px words | 192 x 256 |
| 1920 x 1080 | Extra large text, long section names | 0 | 0 | 0 | 96 x 128, 50 px words | 192 x 256 |
| 1440 x 900 | Ordinary | 0 | 0 | 0 | 96 x 128, 40 px words | 192 x 256 |
| 1280 x 900 | Ordinary | 0 | 0 | 0 | 96 x 128, 40 px words | 192 x 256 |
| 1280 x 720 | Ordinary | 0 | 0 | 0 | 96 x 128, 40 px words | 64 x 85 |
| 1280 x 720 | Extra large text | 0 | 0 | 0 | words alone, 50 px | words alone |
| 1366 x 768 | Ordinary | 0 | 0 | 0 | 96 x 128, 40 px words | 96 x 128 |
| 1024 x 768 | Ordinary | 0 | 0 | 0 | 96 x 128, 28 px words | 96 x 128 |
| 768 x 1024 | Ordinary | 0 | 0 | 0 | today's book | today's card, 48 x 64 |
| 390 x 844 | Ordinary | 0 | 0 | 0 | today's book | today's card, 48 x 64 |

- **It follows the list** (1920 x 1080): another screen ticks a Grill line and the page says "Grill has 1 left."; another screen writes a Pans line and the scene is gone; that line is ticked and the scene is back, while the slip stays plain.
- **No signal:** with the scene standing the signal was cut. The scene gave way to today's plain words; it came back with the signal.
- **His art fails to load:** the words stand alone at their size, with no tail and no empty room, at both finished states.
- **Long names** ("Salads and dessert are done. Hot larder and pass have 2 left."): the words wrap inside the page, at ordinary and Extra large text.
- **A shared screen:** nothing of the scene is on screen while Who did this? is up.
- Not evidenced: reading at 1.5 m on a real section screen, rendered contrast, reduced motion, a screen reader, a touch screen, the idle lock and PIN with a scene standing, midnight and 04:00, a list of real length, and whether it changes how much prep is done. Every number is a Preview.

## Decisions for the head chef

1. **The design.** Recommended: the blend above. Or B as drawn (full size on a section's tab too), A (words only), or nothing.
2. **The rule it changes, by name.** From 900 px wide a finished section's own tab no longer keeps its plain words, and the finished-list card grows. Phones and tablets under 900 px stay exactly as they are.
3. **What is left: ink or green.** As drawn, "Grill has 2 left." is in the page's ink and "Pans are done." in the done green. The other way keeps both lines green, as on the slip ([picture](evidence/8-blend-1920.png)).
4. **Four facts about the five screens**, asked by every reviewer: which page each keeps open through the shift (its section's own tab, the All list or the wall board); shared kitchen screens or one person's sign-in; touch or mouse; resolution, zoom and text size. A photo of one screen with Prep open answers most of it. If they sit on the All list, this shows only when the whole list is finished, and the slip's sentence in larger type is the next small proposal.
5. **Home.** All six said leave it. Drawn apart if the owner wants it anyway: under the cards at 192 x 256 px (1920 x 1080) or 96 x 128 px (1280 x 900), no card moves, and it changes the choice of 9 November.
6. **Still open from 10 November:** the Top tickers strip (keep, switch off, or a no-names kitchen line), and the one measure to look at after four weeks.

## Before release (implementation, not this preview)

- One function builds the sentence for the slip and the page (`secLines()`, `secNext()`, `secName()`, `secSent()`, `tonightLine()`): today only, never on the wall board, the Prep room view, the Functions tab or another day. Never hung on the "Nothing left to do in" sentence.
- The words are the page's own HTML in `draw()` and never wait for `js/mascot.js` or the art. A failed load shows the words alone with his room closed.
- The scene comes at the server's answer on a section's tab (a twin of `finDue()`), with a held-write test that fails first.
- The gate includes the book's no-signal state and today's date.
- Serve stays with the All list's card, decided on purpose for a last tick made on a section's tab.
- Not a control: no pointer, no pressed look, cannot take focus. The finish is read out once.
- Click tests at the widths it exists (1920 x 1080 is in no test file today), in Barlow where text width decides the size: full, half and neither; Extra large text; the kitchen's longest section names; another screen's tick, a new line, Undo; missing art; reduced motion; Not sent and a refused tick; the shared screen's sheet, lock and PIN; midnight and 04:00.
- `docs/kitchen-mascot.md` ("Where it does not show", Size), the Finished-list card in `docs/design-patterns.md` and `tests/design-patterns.test.js`, and the sizes in `tests/mascot-finished-list.test.js` change in the same pull request.
- Before it is called done: read it from 1.5 m on one real section screen, measure the rendered contrast of the large words, and ask three staff what the screen says from the pass.

## Chosen

Not chosen yet. The owner picks; nothing in the app changes until then.

## Pictures

Every one is a Preview, with made-up people and prep lines, not the built book.

| Picture | What it shows |
| --- | --- |
| [`8-blend-1920.png`](evidence/8-blend-1920.png) | **The recommended blend** at 1920 x 1080: a finished section, the finished list, a long section name, and the other colour for what is left |
| [`9-blend-smaller.png`](evidence/9-blend-smaller.png) | The blend at 1280 x 900, on a 1920 x 1080 screen zoomed to 150%, at Extra large text, and with his art failing to load |
| [`1-section-1920.png`](evidence/1-section-1920.png) | Round 2: a section finished on its own tab, today and in A, B, C |
| [`2-list-1920.png`](evidence/2-list-1920.png) | Round 2: the whole list finished, today and in A, B, C |
| [`3-all-section-1920.png`](evidence/3-all-section-1920.png) | Round 2: a section finished on the All list while lines are left |
| [`4-states-1920.png`](evidence/4-states-1920.png) | Round 2: B following the list, and Extra large text |
| [`5-smaller.png`](evidence/5-smaller.png) | Round 2: B on smaller and zoomed screens |
| [`6-apart.png`](evidence/6-apart.png) | Apart from the designs: Home under the cards, and the resident round 1 turned down |
| [`7-shared.png`](evidence/7-shared.png) | Round 2: a shared kitchen screen with Who did this? up |
