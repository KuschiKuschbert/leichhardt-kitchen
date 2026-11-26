# Proposal: the service pages use the kitchen's 1920 x 1080 screens (round 1)

26 November 2026. The head chef: "Yes all recommendations and I think we need to run a full council on the new 1920". **Round 1 only: should we build it?** No code. Evidence: implemented app on the click-test stand-in, synthetic data, role-based review; nobody has watched a cook use these screens.

## The problem in the kitchen

- **Who and how often.** The five section screens are everyone's main work screen, one in every section, all shift (owner, 11 Nov 2026). They are 1920 x 1080 at 100 %, touch and a mouse; the book's window is 1920 x 1008 as the installed app (read 26 Nov 2026). The front of house screen for Functions and the head chef's own computer are 1920 x 1080 too.
- **What the book does there today.** The service pages are the tablet's layout in a column that stops at 1240 px, with 340 px empty either side (Measured). The dark top bar is 132 px tall at 1920 against 64 px on a phone. Prep's notebook has a fixed height: 9 complete lines of 18 at 1920, the same 9 as the 768 tablet, with 65 to 109 px blank under it. Orders' ⋯ sits about 1,020 px from its tick, Cleaning's ▾ about 1,130 px from its box. Cleaning shows 6 of 46 jobs at 1920 and at 768. ([Step 2 findings](../device-coverage/step2/findings.md), [pictures and numbers](../device-coverage/step2/).)
- **What people do today.** Scroll, and reach across the screen. The head chef says the screens read "nice and clean" from where the cook stands: **text size is not part of this.**
- **Tap areas (C, measured 26 Nov 2026, [taps.json](taps.json)).** Tick box, On it, Urgent and ⋯ are at least 44 px tall at 1920, 768 and 390. On it and Urgent touch (0 to 2 px apart), as on the phone where the head chef chose them (5 Nov 2026). The one small target is Orders' orange Used in recipe link: 16 px tall at every size.

## Already decided (not for this council; the numbers they move)

- **A. The functions band** on Wastage, Transfers, Cleaning, Today's team and the recipe card becomes Orders' fold (50 px, opens by itself for notices and a round due within the hour), from 218 px on a busy day: about 168 px back on each page.
- **Quick wins:** Prep's notebook runs to the bottom of the window (1 to 2 more lines at 1920); Transfers draws its In and Out pill; Today's team's break pickers sit after the sentence from 1100 px; the recipe card shows its section chips at 1920.
- **D:** your own section first on Prep; "Ann's day" on shared screens on Home.

## The change to judge

Use the room a 1920 x 1008 touch screen has, on the service pages (Prep, Orders, Wastage, Transfers, Cleaning, Home, Today's team, the recipe card), from a wide breakpoint only, so the phone, the tablet and the 1280 laptop stay as they are. In scope: more of each page's work in view (for example Prep's sections running on, Cleaning's groups side by side), controls nearer their row, the 340 px either side, and the 132 px top bar at 1920. Out of scope: text size (settled), the front of house Functions pages (step 3), the admin panel and chef panel (step 4), Cleaning's results work in another session (mark Cleaning findings as against today's `main`).

## Cost

- Files: `css/app.css` (rules from a wide breakpoint), some page drawing in `js/prep.js` and `js/app.js` where a layout needs it. No reads, writes, rules or saved data.
- Tests: `tests/pages-wide.test.js` already opens every page at 1920 with touch and with a mouse; each layout adds its own checks, with 390, 768 and 1280 kept as they are.
- Risk: the laptop at 1280 and the tablet at 768 drifting; cooks relearning where things sit on their screen; a second layout to keep in step with the first on every later change.

## Design references to test

Linear (work more prominent than navigation, controls in consistent places), Things 3 (today's work visible), Flighty (now and next clear). Not Airbnb's decorative cards.

## Evidence for reviewers

[Step 2 packet](../device-coverage/step2/packet.md) (the screens, rules, decisions and metrics), [step 2 findings](../device-coverage/step2/findings.md), the 40 pictures in `docs/device-coverage/step2/`, [taps.json](taps.json). Gaps to fill before round 2: a chef on a section screen, a full roster, a long order day, Cleaning with a screen section set, Wastage with the book's own reasons.
