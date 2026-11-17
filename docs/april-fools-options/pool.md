# April Fools on Home: the pool of 24 jokes, 35 seconds each

17 November 2026. After seeing A, B and C (`designs.md`), the head chef said: "i like all of them, can we make more so each of the staff members gets a random one but no two ever get the same", for a team of 13 to 20, "same day and every year", and "1 minute to fool them should be fine for them to realise what's going on". This file is that pool. Play every joke in `preview/index.html` (Version 1 or 2, real time or a quick 15-second run, any name). Frames of each at 390 px: `evidence/pool/`.

## Length: 35 seconds (head chef, 17 November 2026)

After playing the pool, the head chef said: "i think one minute might be too long", tried the jokes at 15, 20, 30, 45 and 60 seconds on the live page, and chose: "i think i go with 35 seconds". Every joke is written as one minute and plays in 35 seconds, everything scaled together (`LENGTH` in `preview/fools.js`); pressing and holding to stop still takes 1.2 s. The times below are written for the minute: multiply by 0.58 for the real second (the break starts at about 7 s, the clue at about 29 s, the reveal at 33.5 s, "Press and hold to stop" shows at about 9 s or after three taps).

## Darker (head chef, 17 November 2026)

"I think we could've gone a bit darker", then "And definitely go darker". The 24 were turned up rather than adding a third set, so the deal still gives everyone a different joke.

- **On every joke except B and F** (which go black anyway): the edges close in with a dark vignette from about 7 s (opacity only).
- **Red eyes:** the mascot's eyes glow red in A, C, E (as he fills the screen), I2 (inside him) and K ("Forever."). Red here is art; the book's own error red is never used.
- **Static** over the dark parts of A, G, I and J; **glitch bursts** in A, D and K; B's terminal turns red before HELLO.
- **The softening undone:** B1 is a real-looking hacker log again ("remote session OPEN", "encrypting prep list", "your book belongs to us now"); C1 has "A chef has seen what you did", "Coming for you", "The head chef is watching" and "don't touch anything." again; D1 ends "TELL NO ONE."; K1 says "Don't touch anything."
- **Personal:** A1 "the book is gone. and it was you."; A2 "you pushed it."; B2 "feeding ann to the mascot: 40%"; D2 "PANS IS NEXT. THEN YOU."; E1 "sam and bo: eaten." and "you were a snack."; E2 "still hungry."; F1 "THEY KNOW YOU ARE ON PANS"; G1 and J2 and L1 "you're next."; H2 "hold on. nobody is coming."; I1 "you can't get out."; I2 "sam and bo are still outside. they can't hear you."; J1 "and now you."; L2 "you left it on pans."

Kept whatever the darkness: no coworker blamed for doing something (they are eaten, watching, gone or outside), nothing that looks like a real failed save on a work page, no claim of stolen personal details, a camera or a report to IT or police, press and hold always stops it, mornings and personal phones only, and the reveal still says "You did nothing wrong." The reviewers' advice to soften (new starter, skeptic) is recorded above; the head chef chose darker.

## Their own day (head chef, 17 November 2026)

Asked whether the jokes should use each person's real day: "Oh yeah use their data please!" Every joke now reads what that person's own Home already shows, from the copy, before anything moves: their **section**, **shift and hours**, **break**, the **people on with them** (the "On with you" rows only, each once, never themselves) and the **prep count**. No reads, nothing new fetched, nothing saved; a missing fact leaves its line out, and one person on with them reads "Bo has", not "Bo have".

| | Version 1 | Version 2 |
| --- | --- | --- |
| A | The clock runs backwards and stops on their start time; in the dark: "pans. lunch. 10:00 to 21:00." | "your break: not set. it never will be now." |
| B | The log finds them: "locating ann: PANS", "shift: LUNCH 10:00", "on with ann: SAM, BO", "prep: 0 OF 6 DONE", "break: CANCELLED"; then "you start on pans at 10:00. we will be watching." | "ann moved to DISHES", "break moved to 2028", "the mascot is on pans now." |
| C | Their coworkers' jobs all read "Watching"; their shift reads "Lunch · 10:00 to forever" | (everything is their name already) |
| D | "LEAVE 1 KG OF BUTTER AT THE PASS BY 10:00." | "PANS IS NEXT." |
| E | Bites in their words: "pans: crunchy.", "sam and bo: spicy.", "6 jobs. needs salt.", "tuesday: stale."; "you're next. 10:00." | "your break: not set. tasty.", "sam and bo: gone." |
| F | "PANS · 10:00" under their name in the rain | "SAM AND BO DON'T KNOW EITHER." |
| G | Their section orbits the hole with their name; "even pans." | "6 jobs. 0 done. forever." |
| H | "no? lunch starts at 10:00. hang on." | "gravity has been switched off on pans", "sam and bo are floating too." |
| I | The smaller Homes say "pans. pans. pans." and "10:00. 10:00. 10:00."; "lunch started without you." | "sam and bo are still outside." |
| J | "sam and bo left already." | "pans went with it." |
| K | "Ann, you're on Pans today.", "The prep list has 6 jobs. It does not want you on any of them.", "Your break is not set. It never will be.", "Sam and Bo have gone home." | "Lunch starts at 10:00. You're not on it.", "Your break? Not set. Not ever.", "Sam and Bo are not coming back." |
| L | "pans is melting." | "it was on pans." |

The examples are the preview's made-up Ann (Lunch, 10:00 to 21:00, on Pans with Sam and Bo, break not set, 6 prep jobs). Coworkers are named as watching, gone or floating, never as having done something; the line "they saw what you did" was offered and left out for that reason. In the build the facts come from the same day data Home is drawn from, not from the page's words.

## How each joke runs

Every joke has the same shape over one minute, so people have time to doubt themselves, then to realise:

1. **0 to about 12 s, something is off.** Small things go wrong on the real-looking Home: two letters swap in a heading, a card tilts a degree, the clock shows the wrong minute, a card flickers, the mascot looks away. Nothing obvious.
2. **12 to about 40 s, it breaks.** The design's own break plays out, on the book's own pieces, with the person's name.
3. **40 to about 52 s, the message.** Usually dark, with their name and a line about the book.
4. **About 49 to 55 s, the clue.** A code or word that turns into **1 APRIL** in orange.
5. **57.5 s, the reveal.** Everything goes back, the copy fades, and the mascot's card says "April Fools, [name]! A joke for 1 April. You did nothing wrong, and nothing is broken. Your prep list, orders and recipes are all safe." and "April Fools' Day: on 1 April people in Australia play tricks on each other. This one was from the head chef." (as dark as the rest; "until midday" went when the head chef chose the whole day), then **Back to my day**.

**Taps.** With a minute to fill, a tap cannot end it (people tap at once). Instead the piece under the finger breaks a little more (it slips, falls, runs away, gets eaten, blows away, turns its back, according to the design). At most one break every 0.25 s, however fast the taps.

**Stopping.** Pressing and holding anywhere for 1.2 s stops it at once (a ring fills under the finger), and so does Escape on a keyboard. "Press and hold to stop" shows after three taps or at 15 s (the new starter's follow-up: the most frightened person taps least, so it must not wait for taps). A hidden screen also ends it; the reveal waits for them.

## The twelve designs and their two versions

| | Design | What happens | Version 1 | Version 2 |
| --- | --- | --- | --- | --- |
| A | Collapse | His welcome turns to "hello ann.", the clock runs backwards, every card swings off its pin and falls, the tabs drop off; dark, typed words; ERROR 0x0401 becomes 1 APRIL; everything flies back | The screen cracks like glass. "what did you press? the book is gone." | The pins pop off the cards (no crack). "the book fell over. all of it." |
| B | Takeover | The page tears and switches off like an old telly; a terminal works through the book line by line; HELLO ANN; a progress bar to 99%, then 1% ("oops."); FATAL ERROR 0x0401 becomes 1 APRIL | Green hacker terminal: a login "from the walk-in fridge", recipes deleted section by section, the prep list "translated to pig latin", "blaming the fryer", "renaming ann to banana", "your book belongs to the fridge now" | Amber "MASCOT-OS", the mascot has taken over: "hiding the good knife", "teaching the mascot to cook: FAILED", "salt replaced with sugar", "installing more mascots" (not a fake book update, so staff keep trusting the book's real update prompts) |
| C | Possessed | The page stays; one by one every word turns. Then a colour split, the mascot breaks loose and grows, letters melt, strips tear, a colour wheel, one slow inversion (after six taps or at 43 s), upside down | Puns: "Your sentence: Pants", "Your breakdown: Never", "Prep by sedation", tabs Regrets, Perp, Disorders, Wasted, Trespass, Screaming | Every word becomes their name: sections, coworkers, tabs, the date ("Annday 1 Ann") and the clock |
| D | Ransom note | Letters go missing from words; a paper note slides in and letters fly out of the page into it, cut-out style, in five papers; signed THE KITCHEN GANG, which becomes 1 APRIL | "WE HAVE YOUR SAUCES, ANN. LEAVE 1 KG OF BUTTER AT THE PASS. OR NO GRAVY." | "WE TOOK YOUR VOWELS, ANN. SAY CHEESE TO GET THEM BACK." |
| E | Hungry mascot | He looks away twice, says he is hungry, climbs out of his bubble and eats Home one card at a time, growing with each bite (a tapped card is a snack; his own bubble is not); "you're next."; he fills the screen; burp; gives it all back | "nom.", "crunchy.", "needs salt."; "it was a snack." | "the prep list: chewy.", "your break: too short."; "only joking." |
| F | Code rain | A letter drips out of a word now and then; then whole words drain down as falling characters, the page goes dark and the rain fills the screen; their name lights up in it | Pale blue rain; the name, then "WAKE UP, ANN" becomes 1 APRIL | Amber rain: "WHERE IS THE BOOK, ANN?", then "IT IS IN THE RAIN" |
| G | Black hole | A dot on Your day grows into a black hole with a burning ring; it pulls in the tabs, the top bar, every card, the welcome and the mascot while their name orbits; it swallows the screen, then spits it all back | "everything is in here now, ann." NO SIGNAL | "the prep list is past the event horizon." NO WAY BACK |
| H | Gravity | Everything drifts up; then the cards, the welcome and the tabs fall up and pile under the top bar; a note talks to them; the page turns upside down; everything floats | "turn your phone over, ann." "better?" UP IS DOWN | "gravity has been switched off." "please hold on to the bench." ZERO G |
| I | Endless Home | "hello ann." Then the page zooms into a smaller Home inside itself, and again, faster and faster; taps speed it up; dark; LEVEL 401 | Into the KB logo: "you went too deep, ann." | Into the mascot: "you are inside the mascot now, ann." |
| J | Dust | A corner of the top bar crumbles; then the top bar, welcome, cards and tabs blow away like dust, letters first; a black screen and a cursor; WINDY DAY; the dust blows back | "ann? are you still there? the wind took the book." | "ann, the book blew away. it is somewhere near the bins." |
| K | Talks back | Nothing falls. The mascot keeps talking, more and more unhinged, and the cards turn their backs one by one; every tap gets a reply ("Rude.", "Wet hands!"). The gentlest | "Don't look at me like that." "I know what you did to the jus." "It's just you and me now. Forever." | "Can I tell you a secret?" "The fridge told me everything." "The tabs have gone on strike." |
| L | Melt | One card sags; then the whole page melts like wax in strips, heat rises, and it drips into a puddle; taps make a strip melt faster | "too hot, ann." 401 DEGREES | "who left the book on the stove?" MEDIUM WELL |

Words that name a person use only their first name. No coworker is blamed, no real company or product is copied, nothing claims a real security breach or a real failed save, and the book's failure red is not used.

## Who gets which: different for everyone, every year

`FOOLS.deal(staff ids, year)` in the preview, worked out on every phone from the staff list the book already reads. No read, no write, nothing saved, no server.

- Each person's place in the order comes from a hash of their staff id, so it mostly stays put when others join or leave.
- Their slot is place + 5 per year, out of 24. While the team is 24 or fewer, no two people share a slot on the day. Each year everyone moves 5 slots along, which is always another design (5 is not a multiple of 12).
- Checked in Node with the preview's own `deal()`: teams of 13, 16 and 20 made-up ids, every year from 2027 to 2036, give a different joke to every person and nobody gets last year's design. With one person leaving and two joining between years, nobody repeats either. The preview's "Who gets which" table shows the same for 16 names.
- Limits: more than 24 people would need more jokes (add versions). If five people ahead of someone in the order leave in one year, that person could land on last year's slot; it is rare and only repeats a design they saw a year earlier.

## What changed from the round 2 designs, and why

Kept from the council's round 2 findings: no coworker named in a blame line (B now blames "the fryer"), no "call the head chef" countdown, no "access HEAD CHEF", no "04/01" step (1 APRIL directly), "You did nothing wrong." in the reveal, the 1 April line at 17 px, focus back to the Home heading after the reveal, the phone frame exactly 390 x 844.

Fixed from the skeptic's reproduced faults: the press that ends the joke can no longer close its own reveal (the backdrop ignores taps for 1.5 s and the button needs a fresh press after 0.6 s); the copy's self-hide now works (both keyframes hidden, checked with a layer whose script never runs); the real Home is inert while the joke plays, so a keyboard cannot reach it; frantic taps give one break per 0.25 s and there is only ever one inversion, ramped over 0.9 s.

The head chef's choices that go against the council's advice, for the record: one minute instead of 5 to 9 seconds; taps that make it worse with hold to stop instead of any tap skips; C's colour wheel and inversion; A1's glass crack and "what did you press?" (A2 is the gentler version of both).

## The focused follow-up (17 November 2026)

The head chef's new direction (one minute, taps that make it worse, 24 jokes) was not covered by rounds 1 and 2, so two reviewers looked at the pool itself.

**New starter** (from the frames and the code; not played, no staff asked): the way out showed too late for the person who freezes; "don't touch anything" in C and K fought it; B1 and B2 and K are the likeliest to scare; E, J2 and H1 read most plainly as jokes; "Fools" can sound like "you are a fool". Taken: "Press and hold to stop" at 15 s or after three taps; both "don't touch anything" lines gone; B2 rewritten as the mascot taking over instead of a fake book update; "do not panic." instead of "do not turn off your phone."; "OR NO GRAVY."; "Can I tell you a secret?"; the reveal names April Fools' Day and its last line is full ink. Not taken, as the head chef asked for dark and hacker style: cutting B1 ("it claims a hack") and C1 (puns), and softening A1 and B1's words. Those are the head chef's call; the deal has 24 slots for a team of up to 20, so up to four jokes can be left out without changing the rule.

## Main thread cost (Preview)

Busy time of the main thread per second, with the CPU slowed 4 times, over a quick run (the whole minute in 15 s, so everything moves 4 times faster than on the day; a harsh test). Headless Chromium, 390 x 844, the frozen Home, commit `4eca7f4`.

| A1 | A2 | B1 | B2 | C1 | C2 | D1 | D2 | E1 | E2 | F1 | F2 | G1 | G2 | H1 | H2 | I1 | I2 | J1 | J2 | K1 | K2 | L1 | L2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 275 | 291 | 109 | 106 | 373 | 399 | 200 | 162 | 133 | 134 | 522 | 579 | 115 | 127 | 141 | 133 | 63 | 69 | 464 | 465 | 91 | 87 | 87 | 103 |

The rain (F) and the dust (J) were the heaviest; F now keeps at most 110 drops and J at most 22 grains a piece, measured before those caps. The seasonal motion note's failing case was 769 ms a second on Home. Not evidenced: a real slow phone in real time.

**Skeptic** (played all 24 in the preview, 12 taps each; scripts kept outside the repo): a hold from the first frame, a hold let go over Back to my day, a second Escape and 12 taps per joke all behave, with no copy or moved piece left and no failure red. Fixed after it:

- If the script stopped part way, the copy hid itself at 65 s but the real Home stayed inert (Reproduced). The real page is now hidden by a CSS animation with no fill, which ends by itself; checked by clearing every timer mid-joke with both lifetimes shortened to 1 s: Home comes back and its Recipes tab takes the tap.
- In C a burst of taps could invert and flip the page in the first seconds (Reproduced: 14 taps in 0.6 s). Only taps that pass the 0.25 s limit count now, and C cannot invert before 30 s or flip before 40 s; checked with the same burst.
- E ate his own speech bubble when it was tapped; H's note lost its centring as it faded in; a very long name ran off D's note and H's note; a decomposed "José" showed a loose accent in F. All fixed (names are normalised, D uses at most 12 letters of the first name).
- B1 read like a real breach ("remote session OPEN", "encrypting prep list", "your book belongs to us now"), against this file's own rule. It now logs in "from the walk-in fridge", translates the prep list "to pig latin" and says "your book belongs to the fridge now".

Left for the build and the head chef:

- **Same design, other version.** No two people share a joke, but with 12 designs and 13 to 20 people, some pairs get the two versions of one design (8 of 16 people, 16 of 20). If "no two the same" should mean a different design for everyone, the pool needs up to eight more designs.
- **A hire on the morning of 1 April.** Phones still holding the old staff list would deal differently, and two people could get the same joke (77% of 5,000 trials with one hire and half the phones on the old list). Deal from the staff as they stood before 1 April; anyone added on the day gets the mascot's words only.
- **Home repaints itself every 30 s** (`js/prep.js`, `cutTick`). The joke plays on a copy, so a repaint underneath must not end it: end only on a route change, a lock, a hidden screen or a full `render()`, and test a whole minute in the click test.
