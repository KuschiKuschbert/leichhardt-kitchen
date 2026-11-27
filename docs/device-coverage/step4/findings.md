# Step 4 findings: the admin panel and the chef panel

27 November 2026. Step 4 of the [device coverage plan](../../device-coverage.md). **Implemented app on the click-test stand-in, synthetic data, role-based review.** Nobody has watched the head chef use these pages at these sizes. Three UX and interaction reviewers (Opus) each judged one group of pages from [the packet](packet.md), its 31 pictures and [metrics.json](metrics.json): the Inbox and Reports; Team and Kitchen; the chef panel and Prep standards. **Nothing here is built. Every change is the head chef's choice.**

Evidence words: **Measured** is a number from metrics.json or the pictures' pixels; **Seen** is read off a picture; **Source** is read in the code, not run (the lead checked the mail row's colour in `js/admin-dashboard.js`); **Opinion** is a reviewer's judgement. Nothing was Reproduced by tapping in this step.

## What works (keep)

- **The Inbox leads with what needs him**, urgent mail barred, one filled button (Set today's team) (Seen).
- **Records is a quiet list** where the one miss, "Cleaning: 1 missed", is the only flagged word (Seen).
- **People:** one row a person with role and rights in words; search, Add a person and the filters on one line; 5 of 5 rows in view at 1920, 4 at 1280 (Measured, the 19 Nov choice).
- **The chef panel's Dashboard, Kitchen and Chef to-do each fit one 1920 screen**; the whole Kitchen tool row is the link (Measured, Source).
- **Save is off with nothing to save and names its day** (Seen). A sous chef on a shared touch screen meets only Skip to content under 44 px (Measured).
- Page errors 0 and no sideways scroll in every picture (Measured).

## 1. The top of every admin page pushes the work down (Measured; two reviewers)

Above the work on every admin page: the Google account line (91 px), the room's large title and its sentence, the tabs, then a heading that repeats the tab ("People" under People; a second "Inbox" bar under Inbox; "Insights" under Insights). The Inbox's first row starts at 545 of 1008 px at 1920 and 503 of 800 at 1280 (620 on a functions afternoon, the band added); People's first person at 597 of 800 at 1280; Reports' first numbers at 791 of 800 at 1280 (Insights' at 988 of 1008 at 1920). At 1920 the extra width only stretches one column (a 1,136 px date box on Today's team).

- **Quick fix:** drop the heading or bar that repeats the tab, and put a page's own count or time on its intro line ("2 to look at", "Updated 14:00"): about 65 px on the Inbox, about 120 on Reports (Opinion).
- **Your OK:** the Google account line beside the rail's Find instead of across the page (about 90 px more on every page; the line itself is from 23 Oct), or a slimmer room title (changes the 4 Nov page kit).

## 2. Open kitchen mail is always red (Source, Measured)

The Inbox's mail row is always drawn as due (`needRow('due', ...)` in `js/admin-dashboard.js`): its Open tag in the failure red and an orange bar, even when every mail is read and none is urgent ("All read, not done yet."). Cost, fiftieth use: red every day stops meaning anything, and a failed nightly run is the same red. **Your OK** (the colour contract): red only while a mail is new or urgent; read and open is quiet.

## 3. Today's team opens with no name to tick (Measured, Seen, Source)

At 14:00 with no team saved, the Who's working? ticks sit under the Save bar (0 of 5 names in view at either size). Above them: "Today's team" twice, the dark On break now board saying "No saved plan" (the third way of saying "No team saved yet", under the words "Saved plan"), and Add staff and Find a person, which do nothing on an empty day (Source). **Quick fix:** the board's words. **Your OK:** with nothing saved, hide the board and the toolbar until a team is saved (about 170 px; it extends the 9 Nov rule that hides an empty break board). Depends on how you usually start (question 2).

## 4. Reports and Records leave the numbers below the fold (Measured)

- **Reports:** see 1. On the laptop no report number is on the first screen.
- **Records** from 1100 px: the list of nights is 380 px wide, each night on two lines (4 in view at 1920, 1 at 1280), and the 844 px pane beside it says only "Pick a day to read its records." A 57-word note, read once, sits above the nights. **Your OK** (the chosen empty state): the note goes into the empty pane; "Counted to Thu 26. Read 14:00." stays above the list: about 5 nights in view at 1920, 3 at 1280 (Opinion).

## 5. Two counts for one Inbox (Seen, Source)

The rail says "Inbox 2" and "Today (3)"; the page says "2 to look at" and "Kitchen mail (3)". Today counts mail, the badge counts rows. **Quick fix:** Today carries no count where the Inbox shows its own.

## 6. The Kitchen pages (Seen, Measured, Source)

- **Kitchen Overview repeats its tabs:** 8 of its 15 rows go to the 7 tabs just above it; at 1280, 2 of the 3 rows in view are repeats. Labels sit 700 to 1,050 px from their values, yet Shifts is cut to "Dinner 16:00 ...". **Quick fix:** rows at the chef Kitchen's 768 px, values wrapping. **Your OK:** Overview keeps only its own 5 rows, as the chef panel did on 15 Nov.
- **Order cut-offs opens on Order days**, set once, and the cut-offs editor starts below the first screen at both sizes (the test data has no suppliers, so its real length is not pictured). **Your OK:** cut-offs first, or the two side by side from 1100 px (changes the 24 Nov order day choice).
- **Suppliers & pars is a doorway:** one sentence and two buttons; the catalogue is three clicks away, one on the chef panel. **Your OK:** the tab opens the catalogue.

## 7. Prep standards start below the first screen (Measured, Seen)

No standard row shows at either size: at 1920 Add standard sits at 952 to 996 px of 1008; at 1280 it is below the first screen. The Smart prep par levels switch, set once, takes about 200 px above the work on every visit, with 920 px empty beside the Section picker. Real standards start lower still, under the list's search (Source; the test data has none). **Quick fix:** Section, the time and Add standard on one row (about 160 px up).

## 8. The chef panel (Seen, Source)

- **The Dashboard is loud about a shortcut:** the filled orange button is Chef to-do, also a tab 458 px higher; "Set the team" (nothing saved) has the same weight as "0 of 6 done", while the admin Inbox shows the same fact with an orange button. **Quick fix:** the orange goes to Set the team when no team is saved.
- **One frame, two vocabularies:** the rail, Find and tabs match, so it reads as one book; the words do not. "Dashboard" is 90 days of numbers in admin and three tiles here, titled "Today"; Kitchen is setup rows in admin and tool rows here; Shift pings sit under Kitchen in admin and Today here; dates read "27 November 2026", "Fri, 27 Nov" and "2026-11-27 14:00". **Quick fix:** the chef panel's heading uses the page's own name, and one date style. The rest is your call.
- **Adding a job on the laptop:** Add to the list is below the first screen at 1280, and Enter starts a new line (Shift pings save on Ctrl+Enter). **Quick fix:** Ctrl+Enter (Cmd+Enter on a Mac) adds the job.
- On your computer the Orders tile will read "Not read yet" most days: it counts from that device's own lists (Source; a cost of the 8 Nov choice of no extra read).

## Questions only the head chef can answer

1. At your computer, is the admin panel mostly for clearing the Inbox or for reading the numbers? If the numbers, Today's numbers could sit beside the Inbox rows, which leave 780 to 950 px empty at 1920 (a new layout).
2. Most days, do you set Today's team from an empty day, as pictured, or after the roster file fills it?
3. Do you cross into the chef panel only for Chef to-do and the Kitchen tools? The admin panel has no Chef to-do and only some of those tools.
4. Do sous chefs use the chef panel on the section screens? (One picture each way; nothing found that needs changing if they do.)

## Limits

The test data had no prep standards, no to-do jobs, no suppliers or cut-offs and no team saved, so how many rows show on a real day is not pictured. Ann was signed in to the chef panel by PIN without Google (with Google the intro changes and an Admin panel link shows). The cleaning results row of 26 Nov was not judged (the test data lacks its start date). Positions were read off the pictures; the date box reads mm/dd/yyyy only because the test browser is set to US English.

## Chosen (head chef, 27 November 2026)

- **Build, admin quick fixes:** slimmer page tops (the heading or bar that repeats the tab goes; a page's count or time sits on its intro line) (1); one Inbox count (5); Prep standards on one row (7); Kitchen Overview narrower, values wrapping (6).
- **Build, chef panel and Today's team quick fixes:** the orange on Set the team when no team is saved; the chef panel's headings use the page's own name and one date style; Ctrl+Enter (Cmd+Enter) adds a job on Chef to-do (8); the board's "no team saved" words said once (3).
- **Build, with his OK (each changes an earlier choice):** open kitchen mail red only while a mail is new or urgent (2, the colour contract); the Google account line beside the rail's Find (1, from 23 Oct); with no team saved, Today's team hides the On break now board and the toolbar until it is saved (3, extends 9 Nov); Order cut-offs before the once-set Order days (6, changes 24 Nov).
- **His use:** at his computer the admin panel is mostly for setting things up (People, Today's team, the Kitchen pages), so the Inbox keeps its single column (question 1: no numbers beside it).
- **Not asked yet:** the Records pane (4), Kitchen Overview with only its own rows and Suppliers & pars opening the catalogue (6); questions 2 to 4.

## Built (27 November 2026)

All twelve, in one pull request (`js/prep.js`, `js/admin-dashboard.js`, `js/prep-standards.js`, `css/app.css`; no reads, writes, listeners or rules). Measured on the implemented app with [`shots.cjs`](shots.cjs) (`OUT=.../built`, pictures in [`built/`](built/); the step 4 pictures above stay as they were), and in `tests/admin-step4.test.js` (41 checks; 19 of the first 39 fail on the code before the build, and every fix has at least one):

| Where the work starts | 1920, before | 1920, after | 1280, before | 1280, after |
| --- | --- | --- | --- | --- |
| Inbox: the first row | 545 | 435 | 503 | 392 |
| People: the first person | | 535 | 597 | 492 |
| Insights: the first numbers | 988 | about 690 | 791 | about 650 |
| Prep standards: Add standard | 952 | about 720 | below the first screen | about 680 |
| Today's team, no team saved: the first name to tick (Save bar at 941 and 733) | under the Save bar | 725 | under the Save bar | 682 |

- **How each one was built.** The Google account line moves level with the rail's Find from 1000 px (the chef panel's name line too, as both panels share the frame); a phone keeps it at the top. The repeated heading is kept for screen readers and the jump chips (`.a-tab-echo`); the Inbox's own row hides from 720 px, where the intro shows its count, and a phone keeps it. "Urgent" mail is one marked Today or Food safety (Kitchen mail has no other urgent field): with none open and nothing new, the row is the quiet waiting row. Today's team hides its board only after a fresh server read says no team is saved (a failed read shows "Could not load the team" with Try again, as before), and its toolbar while the day has nobody on it; "Who's working?" is said once on screen (the list's own name kept for screen readers). Order days sit under the cut-offs (the order day brief says so too). The chef Dashboard's date and Prep standards' read time use the book's `dayShort()` ("Fri, 27 Nov", "Read 14:00.").
- **Phones and the tablet** (390 and 768, every admin page pictured and the chef Dashboard, compared pixel for pixel with the code before): the repeated headings stay drawn there (the rule is from 1000 px, where it was studied), so Insights, Records, Reports Team, People, Suppliers, Kitchen mail and Guides are the same pixels as before. What differs is what was chosen: the Inbox mail row's words, Today's team on an empty day, Prep standards' one row, Order days under the cut-offs, the chef Dashboard's name, date and orange button, and Kitchen Overview, whose values now show whole on a phone too instead of being cut short.
- **The Inbox count follows the rows:** ticking the last open mail Done drops the intro, the rows and the rail from 2 to 1 together (checked).
- **Tests changed with a reason:** `tests/chef-panel.test.js` (Today opens on its Dashboard, now named Dashboard), `tests/team-notebook.test.js` (with no team saved the board waits; the page is ready when its staff chooser shows), `tests/admin-find-keyboard.test.js` (Tab lands on Run the shift's first button, Set today's team while no team is saved).
- **Still not tested:** a long Google address beside Find at 1000 to 1100 px, a real day's prep standards and to-do jobs, and Tab order with a keyboard on the laptop.

