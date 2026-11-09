# Planning sections ahead

9 November 2026. Proposal only. No application change or design selected.

The head chef asks for head and sous chefs to allocate staff sections a week ahead, with a day picker to move backwards and forwards. Today’s team or the chef panel are possible homes. The request is for a service council and design ideas before coding.

Today the roster notebook supports configured shifts, section-first assignment, breaks and splits, Whole day review, one explicit Save and version conflict protection. It only loads and saves today. Same as last weekday copies one past record into an empty draft for review. Staff use the saved current-day plan for their section defaults, break board and Your day.

The proposed change is chef-only date navigation and dated assignments using the existing team/<date> records. Choose a day, assign sections and optionally retain existing shift/break tools, then explicitly save that date. A week overview, batch actions and a separate planning location are design options, not requirements. No payroll, availability, leave, new staff navigation or automatic pop-up is proposed. Actual staff and shift hours remain private and are not seeded.

Keep staff on today. Browsing tomorrow must not change the live plan, current break board, personal section picks or training totals. Show the full date on the editor and Save. Keep drafts when changing day, explain save failures and newer-version conflicts, and distinguish unread, failed, confirmed-empty and saved dates. Do not silently save on navigation or copy over a saved plan.

Technical evidence: js/prep.js teamLoad, tmFrom, teamPageHTML and teamSave currently use dayNow directly. Current teamOk rules validate dated documents and next-version saves without a today restriction. Future documents are already readable by kitchen sessions at the database layer; keeping staff screens on today is an existing product convention, not a new confidentiality boundary. No rules change is established as necessary. A selected-date planner needs separate state from the live tm record. Use memory-only caching and no new listeners. Read a selected day on open or tap, or up to seven dated documents in a single query for a week view; never one read in a loop. Only current-day saves should send the live-team invalidation stamp. Investigate nightly training date bounds and backup coverage before implementation.

Expected affected parts: js/prep.js, css/app.css, focused team, role, read-budget and rollover tests, and existing documentation. No new package or service is needed. Main risks are editing the wrong date, losing an unsaved draft, concurrent chefs, stale future data, current-day rollover and a mobile planner pushed below extra controls.

Baseline screenshots use synthetic Sam, Ann and Bo, Lunch and Dinner, and existing app styles, through tests/lib.js with stand-in Firebase. At 390 by 844, one complete section-assignment person row is visible above the bottom bar; at 1280 by 844, two are visible. No browser errors. Fonts in this fixture use the existing test fallback, so density is not a real-font claim. Screenshots: baseline-390.png and baseline-1280.png.

Baseline assignment on an already open Lunch view: Grill then Sam is two taps; Save is one more. Switch shift is one tap. Selecting a future date is currently impossible. Prep add/tick remains one tap and its screen is untouched. New concepts will be measured against this baseline and labelled as previews.

Service rules: main work-page job one tap from its tab; no new tab/top bar/tab bar button or service pop-up without the head chef’s OK; nothing over a service list except to stop a mistake; count additional taps and lost visible rows. Council is role-based analysis, not staff research.
