# Work pages design options: Prep, Orders, Wastage, Transfers and the chef hat

Requested 3 November 2026. The head chef asked for two designs and improvement ideas for each work page and the chef hat menu, with fewer repeats and easier use, then a recommendation, before choosing what to build. **Chosen on 3 November 2026: the recommendation below** (the head chef's words: "go with your recommendation"). Shared fixes, then A on every page with four pieces of B. The pre-change baseline is main at `87b378d`.

`options.html` in this folder is the working comparison: today's phone screen next to Option A and Option B for each page, what each removes and adds, its cost, and the recommendation. Open it in a browser. All names and amounts are the click tests' synthetic data. Nothing in it saves.

## Current Orders choice, 9 November 2026

The owner selected [C, one shared request list with a compact cut-off fold](../order-list-options/brief.md#chosen-c). It replaces the chef supplier grouping from R2 below, keeps staff's existing list and the independent supplier-confirmation path, and removes the Orders catalogue read. The earlier comparisons remain historical evidence.

## What repeats today

Measured on 3 November 2026 at commit `87b378d`, 390 by 844 px, a sous chef signed in, the test stand-in for Firebase.

- "Writing as Sam / Not you?" tops all four pages, and the chef hat says "Signed in as Sam" with Sign out (README, 23 Oct 2026: they do the same thing).
- Prep has five ways to set a section, four ways to add a line (Write a line, the foot form 1,456 px down, Add from the recipes, Quick add) and four places that count what is done.
- Wastage has 16 controls before the first entry. Today's entries start at 803 px, under the tab bar at 776 px.
- Transfers puts Log it at 874 px, below the first screen. Today's lines start at 1,101 px. Each item of a pick-up is logged on its own.
- Four add forms for item, amount, unit and section. Prep and Orders take typed amounts; Wastage and Transfers take a number and unit chips. A usual chip adds in one tap on Prep but only fills the amount on Orders.
- Prep and Orders have no way to change a line's amount or section: Remove, then write it again.
- A sous chef's chef hat menu has 13 rows: 621 px of menu in a 506 px box, so Settings and Sign out need a scroll.
- The tick is on the right on Transfers only. Leads can remove prep lines but not order lines. Lines written after the night batch look like today's.

## Shared fixes (in both options)

S1 one place for who is signed in (the Writing as row goes, Not you? moves to the chef hat menu); S2 one section control (chips, today's section picked, Other to type); S3 one amount control (a box that reads "2 tubs" or "2", unit chips under it); S4 one line layout on all four lists; S5 Change amount and Move section in the line menu, with Undo (the rules already let people with Add change both; prove it on the emulator first); S6 one meaning for usual chips. Client only.

## Options

| Page | A, Clean notebook | B, Service rail |
| --- | --- | --- |
| Prep | List first, numbered Start here in place, one urgent control, one Add sheet above the tab bar (usual lines, recipes, section, amount), Done today behind the count, Tonight for tomorrow heading. Client only. | Opens on your section, Next up docket with Tick it and I'm on it, other sections folded, one-line add, wall board on a tablet. I'm on it needs a new field and rules. |
| Orders | One list: today, then Waiting from earlier days (replaces Everything to order), Ordered today folded, the same Add sheet, a date chip for chefs. Client only. | Requests under each supplier cut-off with a countdown, Open supplier order (fills a draft only), Delivery arrived, No supplier yet, Low and Out marks for staff. New field, rules and catalogue reads. |
| Wastage | Today's total, a reason split bar and the entries first. Log waste opens a sheet with the five reasons as big chips. Review as its own sheet for chefs. Client only. | One sentence with tappable words, entries under it, Make it again (add to prep), a Tomorrow card from the nightly summary for chefs. Client only, smaller targets. |
| Transfers | Still out first (earlier days with their age, then today), ticks on the left. Log a transfer takes a whole pick-up: several items in one save, each still its own line. Client only. | Venue tabs with a balance, age tags after 7 days, one-line log with the venue set, an overdue count on the chef hat for chefs. Client only. |
| Chef hat | The bottom sheet the head chef picked on 24 Oct 2026 (declutter review, design B): person card with Not you? and Sign out, Kitchen and Chef tiles that fit one phone screen, the initial on the hat. | A name chip, Needs you first (minutes to sign, a function today, a cut-off), Go to list, Not you?, Settings and Sign out pinned. A dropdown; the name does not fit at 1280 px. |

## Recommendation

Shared fixes first, then A on every page, with four pieces of B: counts on the chef hat tiles, Make it again on Wastage, the age tag on Transfers and Delivery arrived on Orders for chefs. A removes the most repeats with the least to relearn and needs no rules change. Second round, if wanted: I'm on it, supplier groups, Low and Out, the wall board.

Proposed build order, one pull request each: chef hat sheet with S1; S2 to S4; S5 and S6; Wastage A; Transfers A; Prep A; Orders A. Every step keeps permissions, rules, the read budget, Undo, Not sent marks, shared-screen attribution, today-only staff pages, the notebook look and the six-tab bar, and is checked at 390, 768 and 1280 px.

## Build record

Recorded in `docs/head-chef-decisions.md` (3 Nov 2026); it was open item 3 in `docs/open-work.md` until the last step. Each step ships under the normal rules in `CLAUDE.md` and is listed here with its pull request when it is live.

| Step | What | Pull request | State |
| --- | --- | --- | --- |
| 1 | Chef hat bottom sheet, the Writing as row goes (S1) | #464, with this record | Live 4 Nov 2026 |
| 2 | One section control (S2): section chips on Prep and Wastage | #473 | Live 4 Nov 2026. The Section box stays beside the chips (head chef, 4 Nov 2026) |
| 2 | One amount control (S3): unit chips under the amount on Prep and Orders | #519 | Live 4 Nov 2026 |
| 2 | One line layout (S4): the ⋯ on Wastage and Transfers, with Change amount and Remove | #525 | Live 4 Nov 2026. Change amount for the writer, the head chef or a sous chef, today (head chef, 4 Nov 2026) |
| 2 | One line layout (S4): the shared second line (who and when; the section on Wastage, the venue on Transfers) on all four lists | this pull request | The last step |
| 3 | Change amount and Move section (S5) | #479 | Live 4 Nov 2026 |
| 3 | One meaning for usual chips (S6): Add 4 L on Orders | #480 | Live 4 Nov 2026 |
| 4 | Wastage A, with Make it again | #481, merged inside #482 | Live 4 Nov 2026 |
| 5 | Transfers A, with the pick-up basket and the age tag | #482 | Live 4 Nov 2026 |
| 6 | Prep A, with Tonight, for tomorrow | #504 | Live 4 Nov 2026 |
| 7 | Orders A, with Delivery arrived for chefs | #505 | Live 4 Nov 2026 |
| B piece | Counts on the chef hat tiles ("Today 18:00" on Functions, "PFD 14:00" on Supplier order) | #517 | Live 4 Nov 2026 |
| Check | The add button docked above the tab bar on all four pages as drawn, the review at the foot of Wastage, Delivery arrived as a chip | #515 | Live 4 Nov 2026 |

Also on 4 Nov 2026: cooking words like sear and poach are no longer spell-corrected (#472), found while building step 2.

### Round 2 (head chef, 5 Nov 2026)

The four pieces of B left for later, one pull request each, smallest first. The choices are in `docs/head-chef-decisions.md`.

| Step | What | Pull request | State |
| --- | --- | --- | --- |
| R1 | Low and Out on order requests, Out first for chefs | #536 | No rules change: the order line rules already take the field (a client shapes row proves it) |
| R2 | Supplier confirmation on Orders | #538 (ticks), #543 (former groups) | Confirmation retained. Groups replaced by chosen C on 9 Nov 2026; no Pick supplier step is part of the shared request list. See the current Orders choice above. |
| R3 | I'm on it: its own On it button; the box ticks in one tap | #541, then this pull request | #541 stamped on the first tap and ticked on the second; the head chef moved it to its own button the same evening (one tap = done stays). No rules change |
| R4 | Wall board for all Prep accounts on personal or shared devices (expanded 8 Nov 2026), with existing line permissions | this pull request | Client only: no reads, rules or saved data change. Built on R3's ticks |

## Wall board account availability, 8 November 2026

The head chef asked for the existing Wall board on all admin, head-chef, chef and sous-chef accounts. Every account already authorised for Prep can now choose the board on a personal or shared device. This supersedes R4's original shared-device restriction; the existing design and entry location stay.

**Verdict: Build smaller (quick check).** Remove the two device-mode checks, retain the private Prep gate and existing line capabilities, and use the same tab and saved browser preference. No new navigation, step, data authority, read, listener, rule or stored field. The entry remains on today's Prep when at least two named sections occur in the list. Personal actions name the signed-in person; shared attribution retains the person picker. View-only accounts stay read-only. Functions-only, signed-out and expired sessions remain outside Prep.

With the same synthetic personal-admin fixture, actual project fonts and 390 x 844 normal text, the header remains 90.3 px, the first row remains at 323 px and five complete Prep rows remain visible before and after. No row is lost and no page overflow occurs. Shared screens still open the board in one tap; personal devices gain that same one-tap choice. Back is one tap and the view choice survives a reload. View toggles add no reads.

The updated wall-board test failed three personal-device checks out of 23 against the old app; both wall-board and new account tests pass with the change. The role matrix covers personal admin, head, sous, staff, lead and view-only accounts, plus signed-out, Functions-only, expired-session and Google-without-head-PIN exclusions. Personal tick/On it attribution, shared pickers, reload/Back, past-day exclusion and read reuse pass. Existing On it, read-budget and design-pattern checks pass locally. CI and release verification are recorded in the pull request.

Synthetic screenshots: [personal account's Wall board entry](wall-accounts-entry-1280.png), [the board open on that account](wall-accounts-board-1280.png).
