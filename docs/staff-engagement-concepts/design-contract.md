# Quiet encouragement: prototype contract

Requested 1 November 2026. Design stage only. The current workshop focuses on quick shared-screen prep attribution. The earlier three ideas per goal and three comparable encouragement concepts remain available for reference. No production scripts, styles, data, permissions, telemetry or Firestore writes change.

## Current focused demo

`prep-attribution.html`, `.css` and `.js` show the normal prep sheet with an inline name picker. The hosted homepage opens this same demo. The earlier comparison has moved to `encouragement.html`.

- Default shared screen: tap a normal task tick, then choose the reported doer. Only then complete the task.
- Show people signed in on this exact device during the same kitchen day first, most recent first. Others opens the remaining active staff as chips.
- Selecting a doer is not a sign-in and must not reorder or add to device-login priority. Keep the recorder session unchanged and separate from the reported doer.
- Cancel or Escape leaves the task incomplete. Each task asks afresh. Retain permitted Undo.
- Own phone: the normal one-tap tick credits the signed-in person.
- Keep Prep, Wastage, quantities, dates, section controls, add and navigation visible. Sample sheets demonstrate placement; all current production functionality remains mandatory.
- Use synthetic names and records, held in memory only. No PIN, operational API, persistence, telemetry, points, streaks or extra habit layers. A prototype name selection grants no actual session or access.
- Keep the current role boundaries. Any production reported-doer fields, recorder fields and rules changes need their own agreed contract and verification.

## Shared design language

Use the existing Kitchen Book paper (#FBFAF7), white, ink (#1C1D1F), charcoal shell (#2B2A27), orange (#E2602A; text #C2451A), beige (#F2EFE8) and thin rules (#E0DBCF). Fonts: Barlow 400/600/700; Barlow Condensed 700; restrained Caveat 700. Rectangular actions, pill choices, 44 px targets. No confetti, sound, flashing, points pop-ups, public individual ranking, daily streak loss or repeated reminders. Current prep work stays more prominent than encouragement. Normal phone 390 by 844; enlarged text, tablet 768 and desktop 1440 must fit.

## Earlier three layouts

- **A. Shift Card, recommended.** One small personal next-step strip beside the current name and section. Expand on request. A quiet receipt after a useful save. Default work list remains the main page.
- **B. Section Board.** A cooperative board for checks shared by three example sections. Team-level progress, no names of people who have not contributed. Individual details stay in My contribution. The work list stays accessible and prominent.
- **C. Craft Book.** A private open-on-request journal of good habits and useful follow-through. A small link from prep opens the book. Stamp entries are for recorded app days, not attendance, scheduled shifts or consecutive calendar days.

These vary information placement and interaction, not just colour. All include the same core actions below. Only synthetic examples appear in screenshots and source. Use Example cook, Example chef, Larder/Grill/Dessert, Carrot trimmings and a generic labelled prep follow-up; never actual kitchen people, PINs or operational records. Figures are clearly illustrative, not measured results.

## Preserve the existing app

All normal Prep and Wastage functionality is mandatory. Reduced prototype rows only illustrate the new layer. Keep existing sheets, tools, weekly badges, routes and role boundaries. Encouragement is optional, never replaces a sheet and cannot gate normal prep or waste actions. Clearly separate sample controls from links to the live sheets.

## Common core for comparable previews

1. Show the current example name and section; offer Change person. A demo device control switches My phone and Shared screen. A named PIN session on either device receives exactly the same recognition. Do not infer physical actor, ownership or attendance from a saved name.
2. Offer Log waste directly. Item, positive amount, unit and reason are required; section is encouraged when known. Recognise useful details once per example context, not the number/weight/value of entries. Staff have no delete/Undo permission invented here.
3. Support a separate **my section check**: Log something to add or Checked; nothing to add. This is a proposed self-declaration, not an existing field, a zero-waste record, a chef's daily review or proof all waste was captured. A single saved waste entry does not automatically mark the whole section checked. After logging, the person can explicitly finish their check. B labels aggregates Checks shared, not all waste complete.
4. Show one example chef follow-up in the existing prep list and let the user tick it. Quiet acknowledgement once; raw tick counts earn no escalating points. Chef instruction is synthetic, no claimed saving or prevented waste.
5. Optional Pocket book setup can show how to add the existing app to the home screen and use their own name. Provide Not now. A local installation mark does not prove phone ownership. Simulated setup must say Example only.
6. Save simulations have pending, acknowledged success and failure/retry states. Recognition only follows success. Saving repeatedly cannot stack the same progress. Input values survive failed saves. Do not use Firebase, network writes, localStorage, analytics or real PIN entry. All state lives in the tab's memory.
7. Offer Hide encouragement without removing the operational task list, Log waste or Change person. An obvious preview reset can restore it. No push notifications or countdowns. Keyboard focus and Escape work for dialogs; reduced motion is honoured.

A useful private progress pattern is Your name / My section check / Follow-up done, each recognised at most once in this example. A does not need a large progress bar; B uses section-level checks; C uses a private page. Do not claim a named sign-in proves identity beyond the app's normal personal PIN session. If a preview offers a sign-in state, label it simulated, collect no PIN, and hide operational content until the example name is selected.

## Files and utilities

Each concept owns a.html/a.css/a.js, b.html/b.css/b.js or c.html/c.css/c.js, using shared.css and shared.js before its own assets. Root owns the comparison and common files. The common script exposes window.Study.esc(value) and Study.icon(name, size=20). Icons: check, user, waste, book, prep, bell, arrow, chevron, phone, team, close, plus, leaf. Root CSS supplies tokens and generic .btn/.quiet/.pill/.field/.eyebrow/.hand/.sr-only/.preview-note/.book-header/.book-brand/.book-nav. Each concept owns its state, UI and event handlers; no shared app engine or real app imports are needed. Bottom navigation remains Recipes / Prep / Orders / Wastage / Transfers; only Prep and Wastage need real example views. Other sample destinations must be labelled as preview-only if interactive.

Use concise Australian English, metric example amounts and 24-hour time. No em dashes. Ensure decorative elements never cover work controls. The comparison must be usable on a phone, link full-size concepts, and label examples clearly. Production implementation waits for the user's selected design and behavioural scope.
