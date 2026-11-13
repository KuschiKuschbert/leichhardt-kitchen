# Round 2 reviews, as given

Six fresh reviewers, 13 November 2026, each given the same brief (the council's opening, current contract excerpts, the design references, Try to break it, the round 1 result) and [designs.md](designs.md) with its pictures. Kept as written, lightly reformatted. Role-based analysis, not research with staff. No numeric scores were asked for.

## The cook mid-service

**Set 1 (admin page; brief, from my side).** Differ structurally: yes (A a period grouped by kind, B one day in time order, C one food safety month by day). Ranked: A (covers T1 and T2; a long phone page, 2168 px), C (T2 in 3 taps; half an answer to T1), B (tells a day the way service went; T2 about 60 taps). Take A's Period frame (Linear: one frame). Reject B as the only view: its times are when we logged, not when it happened; we log waste at close, so a day reads as everything at 22:10 (misleading presentation). Take C's day line ("Sat 8 · 2 missed") (Things 3). A with C's day lines beats A alone; adding B's timeline makes a third view for little gain. Recommendation: A plus C's day lines; downside a long page on a phone. Nothing in Set 1 adds a tap on the line. Names beside "Missed" may push cooks to use Not possible honestly, or to tick tasks they did not do; no design catches that.

**Set 2 (the sheet I use).** Differ structurally: yes (what gets filled, when, and whether Log it works at once). Ranked:
- C: saves today's number, not last week's. Weakness: the Logged often chip still fills 2 kg, so one item has two rules on one sheet.
- A: least typing with wet hands (2 taps, 1 typed). Weakness: at arm's length the italic "2" reads as typed; only Unit and Reason carry FILLED, Section and Amount do not.
- B: a big thumb target that names every value. Weakness: one more tap; on Orders "Use the usual: 2 tubs" sits on top of the existing "Add 2 tubs" chip, two buttons for one job.

Take A's "Log 2 kg Chips" on the button (Todoist: the value visible at the tap; not pictured, so Not evidenced). Reject B on Orders (duplicates the chip). Take C's orange "Weigh it" box: on the first screen, it warns before I scroll that Log it will be off (Duolingo: truthful). No blend of all three: B's offer and C's "Weigh it" pull opposite ways; B's button on C brings the guess back and adds a control.

Recommendation: C everywhere, plus A's Log it label on the button, a FILLED word on the Section box, and the Logged often chip follows C's rule too. Downside: the chip path goes from 0 to 1 typed box; worth it because the waste number is the record the head chef reads in Set 1. "Honestly, at 19:30 nobody weighs; we type a fresh guess. That still beats last week's copied number." Typed path: today 3 taps, 3 typed and a scroll; C 2 taps, 2 typed and a scroll. Log it stays below the fold in all three. On Orders, C's picture still shows the "Add 2 tubs" chip, so the one-tap usual amount stays; C's Orders cost is smaller than designs.md says.

Contract fit: words carry FILLED and Loaded, None or Could not load. Orange on "Weigh it" means attention, which is correct. C's switched-off Log it must say "Write the amount first".

Not evidenced (check in the complete app): the Log it labels and the words for why it is off; filled values clearing on a mistyped name; the selected Fryer chip half off the right edge at 390 px; Undo fill; "6 of 2 ordered" behind every Orders sheet (the stand-in, or a real count fault?); 0 reads on a slow or offline phone; A's taps to pick one day.

## The keeper of the book

**Set 1.** Structurally different: yes; their reads differ about tenfold. Rank C, B, A.
- C: the calendar is one nightly document (1 to 2 reads); a day about 40 reads, only when tapped; Print about 1,100, only on Print. Weakness: needs the 03:00 job; a skipped run, or a chef's edit after 03:00, leaves a cell that disagrees with the day.
- B: about 70 reads a day and no job. Weakness: a month is about 2,100 reads and 60 taps.
- A: one frame and one print. Weakness: the admin panel reopens on its last page and the admin device reloads 10 to 30 times a day; a 7-day default (about 350 reads) then costs 3,500 to 10,500 reads a day unless past days come from `dayCache`; a month (about 1,000 cleaning records) needs a query beyond the 7-day chef range.

Take or reject: reject A's loading on open (every read says when it runs). Take B's time order for the tapped day (Airbnb); reject its cooling lines: "Batch started: Brisket, beef cheek" is invented, the book stores one batch, named Operandio, with no food. Take C's nightly month document; a missing count must say "Count not ready, open the day", never "Not yet" (Flighty); "Cleaning done" hides "1 not possible", so say "0 missed · 1 not possible". Blend: C's calendar and Print, B's order for the day, A's other kinds only on a tap of Everything (about 30 reads more); no other conflict. Recommend C with B's day list; downside a new server write and a dependency on the job.

Leading risks and checks:
- Reproduced in the previews: "Saturday 8 November" and "Sun 2 Nov" are wrong; 8 Nov 2026 is a Sunday, and C's grid is right. Check: a click test that the day label comes from `T.*` and matches the grid column.
- Reproduced in the previews: A and B show 8 Nov cooling under "Kept from 14 Nov".
- The job runs at 17:00 UTC, so "yesterday" by UTC date is two Queensland days back. Script test with the clock fixed at 17:00Z. Count yesterday plus any missing days up to 7; never sweep 90 days of cleaning (about 3,000 reads).
- Cooling copy: write it in the same batch as Start or Confirm, keyed by `windowAt`, not from the job; the next 10:00 Start replaces the record, so a skipped run would lose the day. Emulator check: staff cannot read it, create only, key matches `windowAt`. Add it to backup, Export and Move PIN.
- Late answer: tap ‹ twice with delayed reads on the stand-in; the heading and the lines must match.
- Print: keep Print off until every part settles; a print-media test that "Transfers could not load" is printed.
- Lazy admin script, not in SHELL; opened offline it must say it could not load.
- `read-budget` rows: the calendar costs 2 or less; reopening the panel on this page reads no past day twice.

**Set 2.** Structurally different: yes (A fills as you type, B on a tap, C never fills the amount). Rank C, B, A.
- C: never saves an amount nobody looked at. Weakness: Log it switched off needs its own words.
- B: nothing filled without a tap. Weakness: Undo fill must restore what was typed, not blank it; Orders then shows two "2 tubs" buttons.
- A: fewest taps. Weakness: the reason is filled below the fold, and a quick tap during a keystroke can save a fill.

Take A for Orders only: that is today's `oqtyAuto`, now named beside the box, no change in behaviour. Reject B on Orders (duplicates the Usual amount chip). Take C for Wastage and Transfers, where the amount is a measurement (Todoist). A blend of all three adds a mode the cook must learn; the blend that works is C on Wastage and Transfers, A on Orders: waste is measured, an order is an estimate. Downside: the cook still types the amount.

Risks: track filled or typed per box (click test: type "Chips", type 1.5, change the name: section and reason clear, 1.5 stays). `summary/waste` is built at 03:00 and lacks today's entries, so "last time" can be false: say "last 2 weeks", or add today's live lines (0 reads). If the summary did not load (offline in the cool room), offer nothing and never claim it was never logged. E1: store the count as a field on the existing daily record, no extra write; that loosens the rules: publish first and add a `client-shapes` row.

Contract fit: Set 1 C fits (admin only, no listener, honest Not kept). Set 2 costs 0 reads. Not evidenced: real Firestore timing, printing on the tablet, offline open, a real 03:00 run across Queensland midnight, late cleaning edits, Barlow fonts.

## The skeptic

**Set 1.** Structurally different in time model and scope. Rank C, A, B.
- C: T2 in 3 taps from a nightly count; the only picture whose cooling status agrees with its rows. Weakness: a new calendar look and a server write; still only part of T1.
- A: answers both tasks. Weakness: mostly the existing Reports tabs stacked on one page, 2168 px at 390; a month about 1,500 reads.
- B: tells T1 in order. Weakness: T2 about 60 taps; the phone's first screen shows no record at all.

Reject A's Prep, Team, Supplier orders and Functions folds: they repeat tabs that already exist (Things 3). Reject B's Team rows at 10:00 and 15:00: they show a plan as if it happened (Flighty). Reject C's calendar grid: use C's own phone list of days at every width, no new pattern (Linear). A blend of all three: no; three time models and nine status chips on one page; a day showing every kind costs about 80 reads instead of about 40. Recommendation: C as a dated list of days; downside "everything for last Saturday" still needs the other tabs.

**Set 2.** Structurally different: yes. Rank C, B, A.
- C: the cook writes the weight. Weakness: the Logged often chip still fills 2 kg, so the same item fills differently by path; "Last time was 2 kg" invites copying it.
- B: nothing filled without a tap. Weakness: on Orders it sits beside today's "Add 2 tubs", two 2-tub buttons on one sheet.
- A: fewest taps. Weakness: a 2 kg nobody weighed can be saved; Log it below the first screen.

Take A's "Log 2 kg Chips" (the button names what it saves). Take B's Undo fill; reject B on Orders (duplicates a control). Reject C on Orders: "2 tubs" three times on one screen, and a chef reviews requests anyway. A blend: yes, cheap: C's filled fields, A's Log it words, B's Undo fill; conflict: B's offer cannot exist alongside filling as you type. Recommendation: that blend on Wastage and Transfers; on Orders, A's change (today's fill, its words moved under the box). Downside: one more typed box, and the chip and typed paths disagree on the amount.

Try to break it:
- S1. Status words contradict the rows. Head chef, 8 Nov. Expected: a part marked "None" or "Kept from 14 Nov" shows no rows for that day. The pictures: B shows "NONE Functions" with an 18:00 Function row, and three cooling rows under "Kept from 14 Nov"; A says "3 stages confirmed" for 2 to 8 Nov. Impact: a print handed to an inspector contradicts itself. **Reproduced (Preview).** Repair: build each chip from the same results that draw the rows; test that a None or Not kept part has zero rows, in the print too.
- S2. Wrong weekdays. 8 Nov 2026 is a Sunday; A ("Sun 2 Nov to Sat 8 Nov"), B, and C's day detail and phone list say Saturday; C's 1280 grid correctly puts 8 under SUN. Impact: "last Saturday" opens the wrong day; a food safety record carries wrong dates. **Reproduced (Preview)**; the app's own labels Not evidenced. Repair: labels from the Queensland date helpers; a test pinning 8 Nov 2026 as Sunday at 390 and 1280 px and in the print.
- S3. A fill that confirms itself. Bo in a rush, A: types Chips, scrolls, Log it; 2 kg saved and E1 counts it as "kept", so the counter reports the guess as right. Risk / Not evidenced. Repair: save which fields were filled and left unchanged, and count those apart from changed ones.

Contract fit: status words, FILLED tags and no-limits wording fit. S1 breaks the "None" rule. C's grid would need a `design-patterns.md` entry. The Section and Amount boxes show the fill only with italic, not with a word.

Not evidenced: the print; Log it's words and switched-off state below 989 px; Undo restoring what the cook typed; changing the name clearing only filled fields; C's failed nightly count saying "Not counted", never "0 deliveries" or "Cleaning done"; a Pass check after Queensland midnight landing on the right day; measured read counts; sous chef and staff refused, on the emulator.

Lead's check: 8 November 2026 is a Sunday (confirmed). The preview's day labels and status chips were the lead's synthetic fixture, not the book's code; both faults are corrected in the combined preview.

## The kitchen screen designer

**Set 1.** Structurally different: yes. Ranked:
- A: the Wastage frame, covers both tasks. But the first record is at 858 px on a 390 phone, and the folds show nothing that says they open.
- C: T2 in 3 taps. But a new look with 12 px text in the cells, and "Cooling not kept" in 13 of 14 cells hides the misses.
- B: one day in order. But no range, and the phone's first screen is all status chips.

Take A's frame and range print (Linear). Take B's one day in time order (Airbnb); reject its orange DELIVERY, COOLING and CLEANING labels: orange is for action, not for a kind. Reject C's grid; keep a "days with a miss" line (Things 3). A blend: yes, if the period decides the body: one day shows time order, a range shows folds; Print stays in one place and says "Print this day" or "Print food safety". Cost: two renderers; C's nightly count adds a server field and a rule. Recommendation: A, with B's time order as the One day period and C's miss line in the Cleaning fold. Downside: a month costs about 1,500 reads unless it is counted nightly.

**Set 2.** Only B differs in structure (an offer); A and C share one layout and differ in the fill rule and Log it's state. Ranked:
- C: the orange "Weigh it" box draws the eye, and typed "1.5" looks unlike italic "Fryer". But Log it is off at 1009 px, so the reason it is off must sit by it.
- B: nothing filled without a tap. But it repeats the Logged often chip, Orders shows "Use the usual" beside "Add 2 tubs", and Undo fill is a link about 20 px tall.
- A: fewest taps. But on a wet phone the italic "2" reads as the cook's own entry.

Take A's "Log 2 kg Chips". Take B's Undo fill, made a 44 px button. Take C's fill rule: no amount guessed (Todoist, Duolingo). No blend of all three: B's offer conflicts with C's quiet fill. Recommendation: C with a 44 px Undo fill; on Orders, "Add 2 tubs" stays the one way to use the usual amount. Downside: the cook types the amount every time.

Fixes whichever is chosen: at 390 the filled Fryer chip hides behind the fade at the end of its row; the FILLED tag sits on Unit even though kg was already the default; Orders A fills "2 tubs" with no unit chosen.

Contract fit: the Chef's Desk frame is kept, and FILLED is a neutral stamp, not green, so it does not read as Saved. Faults: "Kept from 14 Nov" in orange beside the red Could not load reads as a fault: say "Not kept before 14 Nov" in muted ink. Evidence fault: A's "3 stages confirmed" and B's 8 Nov cooling lines contradict "not kept": redraw them. C must never show "0 deliveries" for a day that was not counted.

Not evidenced: rendered contrast, keyboard focus, reduced motion, line lengths in Barlow, row heights on a phone, print output, Try again, and the words shown when Log it is off.
