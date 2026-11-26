# Step 3 evidence packet: Functions on the front of house screen (26 Nov 2026)

Label for everything here: **Implemented app on the click-test stand-in, synthetic data, role-based review.** Nobody has watched a functions person use this screen. Pictures and numbers come from `docs/device-coverage/step3/shots.cjs` at commit 496878c of `main` (after #900, #902 and #906).

## The screen and who uses it

- **The front of house screen for Functions:** a 24 inch all-in-one, 1920 x 1080 (head chef: "There's a screen on the foh side for functions I believe it's a 24inch aio screen", and later "so does the function foh scree[n]" run on 1920x1080). Its book window was not read; it is taken as the section screens' 1920 x 1008 (installed app). Whether it is touch is not known, so pictures come with touch and with a mouse.
- **Who:** Fay, a Functions-only person (`fnOnlyIds`: she may open Functions, the service view and Deliveries, nothing of the kitchen's) with the Functions tick (`fnIds`: she books and changes functions), on a shared screen. The head chef's laptop (1280 x 800) and a phone (390 x 844) are shown for comparison.
- The book's page column stops at 1240 px, so a 1920 px screen has 340 px either side. The top bar is 132 px tall from 720 px.

## Read these sections of the step 2 packet

`docs/device-coverage/step2/packet.md`: **The service rules**, **Where it goes, and how loud it is**, and **Design misses** (the record). They hold for this pass too.

## Decisions already made that these pages show (do not re-propose what they rejected)

- **8 Nov 2026, Functions in the redesign (step 5):** `#/fn` is Today then Upcoming on one page, each function one card with its next round today and its notes in short, Cancel at the card's end; days with nothing booked fold into one line. The service view (`#/fn/now`) is a live board: how long until each round goes, the dietaries on every round, both prints at the end. The band is dark like Home's board.
- **22 Oct 2026, the band:** in the book's look, with a label; Hide folds it to one line for the day on that device. Since 23 and 26 Nov 2026 Orders, Wastage, Transfers, Cleaning, Today's team and the recipe card open with it folded; every other page, `#/fn` included, keeps the full band. The service view shows no band.
- **17 Nov 2026:** the mascot on Orders and Functions waits a month (ask again 17 Dec 2026). Do not propose it.
- **10 November 2026, functions show ahead of time: the council's mix.** The head chef could not find a Saturday function on Tuesday: the band shows a function only on its order day, the day before and the day, and Home's Coming up sat below the first screen. After two council rounds (round 1 Build smaller, 5 of 5; round 2 A 39, C 38, B 26) and a combined preview endorsed by all six reviewers, the head chef chose **the mix**: a once-per-person Function this week card under Your day with every fact and Got it, which collapses to a quiet Next function line in the same place; the same line in the band's place on every work page on days the band would be empty (drawn only when a page opens; a function today still draws the full band at once); "Not ordered yet" on the Orders function stock line; `#/fn` Upcoming 7 days and guests on the sheet. The band's Order, Tomorrow and on-the-day lines st
- **14 November 2026, a function's lines come off once it is all sent: the council's mix.** The owner asked that once a function is prepped and sent out, its prep and order tasks are removed. They chose the trigger (the last round ticked Sent) and all three kinds of line (platter prep lines, the Function stock order line with its notices, and lines added from What the platters need). After both council rounds (Build smaller, 4 of 5; A 3.4, C 3.1, B 2.3, the mix 4, 4 and 3.5 in the focused review) the owner chose the recommended mix ("Build the mix"): the open lines leave Prep and Orders on every phone once the server holds every tick, made on the function's day; the phone that ticked names what came off with Undo; a line leaving on another phone holds its place a moment; the Functions tab stays with a sentence; Put back keeps a line; the 03:00 job removes them for good. Ticked and ordere
- **18 November 2026, function times are typed, with a list of times on a laptop: B plus D's list.** The owner said the time picker on the New function form was "a bit shit, like a lot" and, of the device clock, "it looked like it was 1998"; the form is used mostly on a laptop. The council said Build smaller (5 of 5) and ranked B first in round 2 (all six; B 46, C 32, A 30). After the owner asked what the picker itself looks like, D (a list of times under the box) was drawn and the mix was checked by three reviewers (the skeptic preferred pure B). The owner chose "Build B + the list": a typed box that reads 1830, 0630, 18 and 6:30pm, always 24-hour; 1 to 11 with no am or pm asks Morning or evening? and is never guessed; a time it cannot read is named in red; neither saves a draft, confirms or prints. On a laptop (768 px and a mouse) Event start and First round at show a list every 15 min
- **22 November 2026, Manage Functions search and status.** Set the existing controls together where there is width. The booking list, permissions and editor returns use the same flow. [Choosing](design-patterns.md#choosing)
- **22 November 2026, Functions Service spacing and waiting trips.** Bring the live board higher on a phone and place the waiting shelf beside active rounds on wide kitchen screens. Keep the coordinator’s confirmation queue first. [Service board](design-patterns.md#inside-a-list)
- **14 November 2026, a two-way check on function rounds: the kitchen sends trips, Functions confirms each.** The owner asked for the service screen to keep what the kitchen has sent on screen until the functions person confirms it has gone out, and then for ticks on single platters, because an all-at-once function goes out over several runner trips. After both council rounds (Build smaller 5 of 5; C 39, A 37, B 23) and a combined preview scored 7 to 8 by five reviewers, the owner chose the recommended mix as a trial: "Let's try this for now. Might change it later. Needs a trial run." The kitchen taps what goes and presses one button that says what it sends; each send is a trip; every trip waiting for Functions is on one shelf at the end of the board, counted in its top line. The Functions coordinators and the people with the Functions tick confirm each trip, on the service view or their

## The pictures

In `docs/device-coverage/step3/`, named `<page>-<size>.png`, each what shows without scrolling:
- Pages: `home` (`#/`, Fay's Home), `fn` (`#/fn`, today and the next 7 days), `fnnow` (`#/fn/now`, the service view), `fnpage` (`#/fn/b60`, one function's page), `functions` (`#/functions`, the bookings list for people with the Functions tick), `form` (`#/functions/b60`, the booking form).
- Sizes: `1920-touch` and `1920-mouse` (1920 x 1008), `1280` (1280 x 800, mouse), `390` (390 x 844, touch), `1920-quiet` (nothing booked today: tomorrow's wedding and the quiz only; `fnpage-1920-quiet` and `form-1920-quiet` show a function that is not booked that day, so ignore them).
- The day at 14:00: Birthday 60th (event 13:45, rounds 14:10, 14:50 and 15:30, dietary notes), the kitchen sent its first round at 13:55 and it waits for Fay to confirm it out; Club lunch (round 14:30, a kitchen comment); Wedding reception tomorrow; Quiz night in three days.

## The numbers (metrics.json)

For each page and size: the page column, the bars above the page and their heights (`#fn-band` is the functions band), how many screens tall the page is (`screens`), the page's own items (cards on `#/fn`, rounds on the function page, rows on `#/functions`, fields on the form) and how many are wholly in view, the controls in view and those under 44 px. `fnnow`'s item count is 0 because the selector matched nothing: judge the service view from its pictures. Highlights, busy day:

| Page | 1920 | 1280 | 390 |
| --- | --- | --- | --- |
| `#/fn`: band, first card at | band 262 px; first card 694 px; 2 of 4 cards in view; 2.0 screens | band 262; 0 of 4 in view; 2.5 screens | band 319; 0 of 4; 2.8 screens |
| `#/fn/now` | no band; 1.27 screens | 1.56 screens | 1.57 screens |
| `#/fn/b60` | band 262; first round at 939 px, 0 of 3 rounds in view; 1.6 screens | 0 of 3; 2.0 screens | 0 of 3; 2.2 screens |
| `#/functions` | band 262; 3 of 4 rows; 1.16 screens | 2 of 4 | 1 of 4 |
| the form | band 262; 7 of 27 fields; 2.55 screens | 4 of 27; 3.2 screens | 1 of 27; 4.0 screens |
| Home | band 262; 1.22 screens | 1.49 screens | 1.13 screens |

No page scrolls sideways or throws an error at any size.
