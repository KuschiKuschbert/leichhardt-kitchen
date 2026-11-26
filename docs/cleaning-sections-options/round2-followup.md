# Section cleaning: follow-up packet on design D and station screens

25 November 2026. Source commit `27ae8275`. A focused follow-up for the skeptic, the keeper of the book and the cook. It holds no recommendation. Read `round2-packet.md` first: its contracts, design references and Try to break it apply here unchanged.

## What changed since round 2

Six reviewers scored A, B and C. Their own words are the record; in short:

| Reviewer | Ranking | Recommended |
| --- | --- | --- |
| Cook | A, C, B | A's words, Shared kitchen first as today, each section's clean above its Pack down, everything open |
| Head chef | A, C, B | Answer the questions, type the weekday jobs in, run two weeks, then a trimmed A |
| Skeptic | A, C, B | Type the weekday jobs in; build A's headings, rhythm words and monthly setup only |
| New starter | C, A, B | A blend: A's words, C's order, B's nightly jobs after the numbered steps, only other sections folded |
| Keeper | A, C, B | A with the cook's own section moved first and no folds |
| Screen designer | A, C, B | Draw a blend: A's frame, my section first, non-nightly jobs first, no fold; build A if it fails |

All six rejected C's closed rows (corrected after the follow-up: five of six; the new starter would fold other sections, but not Shared kitchen or Floors). All six took the rhythm words. Several noted that general tasks naming "Grill chef" stay under Shared kitchen, so a "10 jobs" count for a section is untrue; D carries no such count.

After seeing A, B and C, the head chef asked for two things in his own words: a section set per device, so a screen at Hot larder, Grill or Pans shows that section's cleaning; and on every other device, the cleaning list for the section the person is rostered on.

## Design D (lead's draft, not yet reviewed)

**Your section first, nothing hidden.** The page opens on one section: a title with its name, then "Section clean" (that section's weekly and monthly jobs due today, each saying how often), then "Pack down" (its numbered steps, then its new nightly jobs), with today's overhead-before-floors reminder kept under Pack down. Then Shared kitchen. Then a "Rest of the kitchen" title and every other section, each as "Name: section clean" and "Name: pack down". Floors after shelving stays last. Nothing is folded. New nightly rows carry no rhythm words.

Which section leads:

- On a person's own device: their section today. The book already holds it: `mySec()` in `js/prep.js` gives a staff member's or lead's section from the Today's team plan (`tmPlanSec()`), or from their own pick in Your section today, kept on the phone in `lk.sec.<id>` and read at most once a day from `shifts/<day>_<id>`. Today's Cleaning page does not use it.
- On a shared kitchen screen that has been given a section: that section, whoever signs in. The page says so: "This screen is set to Grill. You are on Pans today."
- With no section (a head or sous chef, whose section is their role; a cook on Pass or Prep, which have no cleaning list; a screen with none set): the page keeps today's order with A's headings and words.

The new setting, "This screen's section":

- A row in Settings, on a shared kitchen screen only, changed by the head chef only, as the shared screen choice is today (`docs/device-sessions.md`).
- Kept on the device beside `lk.device.v2`. No Firestore read, write or rule. Clearing site data or Forget this device forgets it.
- It changes the order of the Cleaning page only. It does not change `mySec()`, where prep and wastage lines go, or the who-worked-where record.
- A shared screen still needs a PIN before it shows Cleaning, and still locks after 10 idle minutes and at 04:00.

Not designed yet, and open:

- How a kitchen section is tied to its cleaning groups. Sections are ids in `config/main` `kitSecs`. Pack down groups are template prefixes with a name string (`packSection()` in `js/cleaning.js`). The previews match by name; the cleaning contract bars fuzzy matching, so the build needs an explicit link set by a chef.
- Fryers and Salads and dessert are two kitchen sections; the head chef's list has one cleaning list for both. Fryer shutdown is a Hot larder Pack down step.
- Go to Pack down would land on the leading section's Pack down. Not exercised.

## Evidence

Under `docs/cleaning-sections-options/previews/`: `d-390.png` and `d-390-full.png` (a Grill cook's own phone, Monday), `d-screen-390.png` and `-full.png` (a shared screen drawn as set to Grill, a Pans cook signed in), `d-tue-390.png` and `-full.png` (a Pans cook, Tuesday 1 December), `d-settings-390.png` (the Settings row, a copy of the real "How this device is used" row with new words), the `-1280.png` of each, `measurements.json` and `build.cjs`.

Preview, not Implemented app, made the same way as A, B and C. The screen's section is not implemented: the station screen preview is the same layout with different words, on a stand-in device in shared mode. Not exercised: ticking, Undo, saving, no signal, the lock, a handover between two cooks, setting or clearing the screen's section, a cook with no section, Extra large text, dark mode, 768 px.

| 390 x 844, Monday, Preview | Today | A | C | D |
| --- | --- | --- | --- | --- |
| Jobs on the page | 46 | 54 | 54 (10 open) | 54 |
| Whole jobs on the first screen | 5 | 4 | 4 | 3 |
| Page length in phone screens | 4.9 | 5.7 | 2.2 | 5.9 |
| Screens down to "Clean the drawers" | not in the book | 0.7 | 0.6 | 0.5 |
| Screens down to the first Grill pack down step | 2.9 | 3.8 | 0.7 | 0.8 |
| Small lines cut off | 4 | 4 | 0 on the open rows | 4 |
| Buttons under 44 px, sideways scroll | none | none | none | none |

D on Tuesday for Pans: 2 whole jobs on the first screen (the first job's words take two lines), 5.8 screens long, Pans pack down 0.8 screens down.

Two corrections to `round2-packet.md`, already made there: today's first screen holds 5 whole jobs, not 6; and Your section today is asked once a day after the PIN whenever kitchen sections exist, not because of cleaning tasks.

## After the follow-up

The cook asked for D trimmed: the reason a section leads on the title line, the floor reminder cut to one line, and Go to Pack down naming the signed-in cook's section. Done in `previews/build.cjs` and remeasured (Preview): 4 whole jobs on the first screen on Monday and 3 on Tuesday, the leading Pack down 0.7 screens down, the page 5.8 screens long. The one-line reminder is proposed wording, not the head chef's. The reviewers saw D before the trim.
