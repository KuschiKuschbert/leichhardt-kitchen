# Cleaning page proposal

8 November 2026. Design exploration requested by the head chef. No design selected and no application change authorised by this document.

## Problem and request

The head chef wants Guides moved out of the navigation chips into the chef-hat menu, and a new Kitchen cleaning page with section-specific tasks throughout the week, as a tick list or matrix. They want to brainstorm three designs and run the repository's council before implementation.

Cooks need to know what cleaning is due in their section today. Chefs need to distribute recurring work through the week and see what has been completed. The user confirmed the areas/equipment to include: coldroom, freezer, dry store, oven, fryers, behind equipment, pass and shelves, alongside existing kitchen sections. They chose a tick with who and when, with no second chef sign-off. Exact tasks, frequency and current paper process are not yet known. Do not invent a cleaning procedure or a verified schedule.

## What exists

At source commit c2fae37, six navigation destinations: Recipes, Prep, Orders, Wastage, Transfers and Guides. Guides already has a Cleaning category and how-to instructions, but no recurring schedule or completion log. Chef to-do is chef-only and cannot substitute for a shared staff cleaning list. Prep is for production work. Section configuration exists in config/main.kitSecs; source presets are Grill, Pass, Pans, Fryers, Hot larder, Salads and dessert, Prep. Actual private configuration has not been read. Treat the confirmed areas/equipment as cleaning areas, distinct from staff sections; a coldroom is not necessarily a roster section.

The chef-hat menu has Every day and More groups. Guides links must retain featOn('guides') and existing access. Guides remain reachable from recipes and search. Proposed move costs one extra tap from a work page: Guides 1 now, hat then Guides 2. The freed slot could be Cleaning, so no seventh destination or extra top-bar icon. This is a proposed navigation choice for the head chef, not already approved implementation.

## Proposed scope

A shared cleaning page with named tasks, configured section, repeat weekdays, today's ticks, who completed each and when, and undo. Reuse existing how-to Guides links rather than duplicate instructions. Day and week organisation must be compared, including a small design. All examples are fictional and clearly labelled. No actual chemicals, doses, temperatures or required completion times are prescribed.

Staff default to today and their section. A weekly completion history belongs to chefs under the existing today-only staff contract. Showing a future schedule without past staff history is a separate choice. Kitchen-wide tasks must remain visible alongside section tasks. Do not auto-tick yesterday's unfinished jobs, erase missed jobs on rollover, or silently convert them to today's completion. No notifications, photos, mandatory verification, scoring or new read-heavy dashboard in the initial proposal.

## Cost and uncertainty

Navigation move: js/app.js plus navigation/access checks. Cleaning: routing and page UI, CSS, bounded task templates and dated completion records, Firestore rules and emulator/client-shape checks. Existing section and identity helpers should be reused. Exact collection design is not chosen. Read on page open, reuse within the session, explicit refresh; no history reads on staff startup and no extra listener or polling assumed. Count reads when designing the implementation. Test failed reads, pending and refused writes, undo, day rollover, role restrictions, shared tablet attribution and narrow-screen fit. Likely 2 to 3 staged implementation PRs depending on the selected design, in addition to this design-only draft.

## Evidence

`previews/before-prep-390.png`, `before-hat-390.png`, `before-guides-390.png` are current source at 390 x 844 using tests/lib.js and synthetic Firebase. The actual kitchen and real staff records are untouched. No screen claims are user research. A cleaning before-count is unavailable because no such page exists. Existing Prep line count is measured separately; new previews will report complete visible task rows at the same size.

## Service rules

1. The main job of each work page is one tap from its tab.
2. No new tab, bar button or popup on a service page without the head chef's choice.
3. Nothing appears over a list during service unless it stops a mistake.
4. Added taps or lost visible lines must be counted and justified.
