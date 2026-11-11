# Proposal: the mascot does more on a wide screen

11 November 2026, Queensland. Written for round 1 of the service council, before any design is drawn. No app code has changed.

## The problem

The owner wants the mascot to be a real motivator and finds what is live too small: "can we enhance the mascot system, at least on desktops?" On a phone the council kept him small for two reasons: there is no room, and nothing may sit over the list during service. On a wide screen both reasons are weaker. The page stops at 1240 px, so a 1920 px screen has 340 px of empty space on each side; a finished list leaves 430 to 610 px of empty page under a mascot drawn 64 px wide; the column under the section tabs is empty; Home has 220 to 400 px of empty page under its cards.

## Who has it, and how often

Every cook, every shift. The owner says the kitchen works on five 21 to 24 inch wide screens, one in every section, and all the staff use them for the work. So the wide screen is the main screen, and the first study, which measured a 390 px phone first, designed for the second one. From the code paths, not measured in the kitchen: a section is finished about once per section per day on its own screen, and the whole list at most once a day. Phones stay as they are.

## What people see today on a wide screen

The same three things as on a phone, at the same size: the daily action in Home's corner (64 x 85 px), the card under a finished list (64 x 85 px, at most once a day), and one line of words on the slip at a finished section.

## The change, as a direction (round 2 would draw three designs)

On screens 900 px and wider only. Phones and tablets under 900 px do not change at all.

1. **Bigger where he already is.** The same moments, drawn at 96 x 128 or 192 x 256 px where the page is empty anyway: Home's corner, and the finished list as a real scene on the empty page with a larger speech bubble.
2. **A place of his own beside the book.** A fixed spot in space the book does not use (the column under the section tabs, or the gutter beside the page from 1440 px), where he rests and answers the same true finish lines: a section done, the list done. With him there, the section's sentence could be his speech bubble on a wide screen, and the slip stays plain words.
3. **The team's big screen.** On the wall board, a host line for the whole kitchen: what is done and what is left, in words, with him beside it.
4. **More true moments, where there is room for them.** From the idea list: every line ordered, the pack down card, started and finished, Thanks from Chef. Each is its own decision; this proposal only asks whether a wide screen is the place to try them first.

Every rule from the first study still holds: only work the server has; the section and the kitchen, never a person, the clock or speed; one clip, once, then still; reduced motion keeps the words; nothing over a list line; no sound; no points or streaks.

## Cost

- Reads, writes, rules: none. Every number is already on the page.
- Files: no new art (the 192 x 256 sheets are already in art/mascot). Styles and a little script in js/prep.js, js/app.js or js/mascot.js. A larger still is the same file.
- Risk: he becomes decoration (a face with no job), or noise for the person who works at a desk all day; two looks for one feature (phone and desktop) to keep in step; a station screen is read at arm's length to about a metre and a half, mid-task, where a 64 px mascot and 16 px words are small; and the same screen is the cook's work surface all shift, so anything that moves or repeats is in front of them all day.
- Tests: every wide-screen rectangle that exists today unmoved; nothing changes under 900 px; the same truth rules as the built slip sentence and card.

## The question for round 1

Is a bigger or more present mascot on wide screens worth building, and if so which of the four directions is worth drawing? What must it never do?
