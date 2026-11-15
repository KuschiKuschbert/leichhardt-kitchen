# Evidence packet: Today's team order and Clear this day

Source `main` at `9697fd8` (16 Nov 2026). Every reviewer gets this packet, the proposal and the service council's Current design contracts, Design references and Try to break it sections.

## Current contracts (excerpts)

**Service rules (head chef, 5 Nov 2026):** the main job of each work page is one tap from its tab; no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; a change that adds taps or takes away visible lines says why.

**Shift order (head chef, 9 Nov 2026, `docs/head-chef-decisions.md`):** "only the shift tabs should show Lunch first, then Dinner; keep other configured shifts in their saved order." Code: `tmServiceChoices()` in `js/prep.js` ranks Lunch 0, Dinner 1, others 2 over `kitShifts()` (saved order). `kitShifts()` itself is the saved order and feeds Home, Your day, the break board, the Saved shift overview, the 03:00 summary text, roster fill and conflict checks (25 call sites).

**Day grid (15 Nov 2026, `docs/team-sections-options/brief.md`):** people down, services across with their hours; one section picker per service a person works, "Off" where they do not. "A service nobody works has no column." The heads count who has no section.

**Hidden shift (15 Nov 2026, `docs/occasional-shifts-options/brief.md`, B repaired):** a tick box per shift in Admin, Kitchen, Shifts, "Hide Smoker on Today's team until someone is on it". Hidden means: Add staff shows "+ Smoker" not a box; a person's details show "+ Smoker" not "Smoker (off)". "It shows as usual when someone on this date's draft works it." The grid, Home and Your day do not change. The roster file never fills a hidden shift (from 22:01, 15 Nov).

**Admin, Kitchen, Shifts (`shAdminHTML()`):** name, From, To, Remove or Put back, the hide tick box, a busy time. No move up or down. A new shift is added at the end.

**Planner tools fold:** "Copy a day or spread breaks" holds Copy last <weekday> ("Fills this empty day with last week's shifts, sections and breaks. Check, then Save." Off otherwise: "Available when nobody is on this day's draft."), the service picker for break tools and Spread them. Fill from roster file (admin only) sits under it: "Fills empty days ... Check, then Save each day." The roster fill fills only days read from the server with no saved plan, no draft and not past (`docs/roster-import-options/brief.md`, rule 1; rule 3: "No new button. Put Fill from roster file inside the existing fold").

**Draft and Save (`teamSave()`):** the date's draft lives in memory until Save. Save writes `team/<day>` `{ day, on, br, v, at, upd, by }`, `v` one more than stored, so an older save cannot overwrite a newer one. Rules: `on` and `br` are lists of up to 120; an empty list is allowed; create and update by the admin or a chef (own PIN); **delete by the admin only**. Status words: "Unsaved changes", "Saving...", "Not saved. Changes kept.", "Saved 13:00 · Gus". Refresh with unsaved changes asks a second tap ("Tap again to refresh"). A save for today also stamps `config/main.pastEdit` so staff phones read the day again.

**Action feedback (`docs/action-feedback.md`, The rule):** answer in the tap's own frame; confirm in words where the eye is, by name; Saved only after the write resolved; a failure stays and keeps the work; Undo says Undone; a tap that cannot act says why; colour never alone.

**Destroying something (`docs/design-patterns.md`):** "Destroying something typed asks a second tap in place: `arm()` and `armed()` turn the button into 'Tap again to remove'. No pop-up."

**Colours (`docs/surface-colours.md`, `docs/colour-coding.md`):** Team and people blocks use sage (`--surface-people: #EAF5EE`, edge `#8AA391`). Orange is action, selected and attention; green confirms a stated success or an explicit assignment, never a whole draft as Saved; red (`--bad-ink`, `--bad-tint`) for failures and destructive actions. Colour always with words.

**Access (`docs/private-kitchen-access.md`):** admin = owner's verified Google identity plus this device's live head-chef PIN session. The admin panel's Today's team and the chef panel's Today's team are the same page; Fill from roster file is admin only (`tmRsOK()`).

## Measurements (Implemented app, stand-in, fallback fonts, admin session, fixture in `baseline-run.cjs`)

Fixture: Lunch 10:00 to 15:00, Dinner 17:00 to 21:00, Smoker 06:00 to 15:00 (hidden), All day 10:00 to 21:00, added in that order. Ari, Bea, Cal and Dev on Lunch and Smoker, Gus (head chef) on Lunch, Dinner and Smoker, Sam, Eli and Fen on Dinner, Mo on All day. All no section.

| Measure | 390 px | 1280 px |
| --- | --- | --- |
| Grid columns | Lunch, Dinner, Smoker, All day | same |
| Ari's service chips | Lunch, Dinner (off), Smoker, All day (off) | same |
| Add staff service boxes | Lunch, Dinner, Smoker, All day | same |
| Clear the whole day by hand (9 people, 15 person-services) | 30 taps, then Save | not measured |
| Browser errors | none | none |

Screenshots: `baseline-plan-390.png` (full page), `baseline-plan-1280.png` (full page, Ari's details open), `baseline-cleared-390.png` (after clearing by hand, before Save).

Not evidenced: real fonts and a real phone; how often a day needs clearing; how many days this week carry the roster's Smoker cooks.
