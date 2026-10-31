# Function printing

Approved by the head chef on 25 Oct 2026: Layout 2, the timed run sheet. This supersedes the older no-print decision for functions.

## User contract

- Everyone with the kitchen PIN can use **Print function** on the kitchen function sheet, including its popup, and **Print run sheet** in Service View.
- Function managers also have **Print function** in Create Functions, the edit form and the confirmation review. Existing permissions to create and edit are unchanged.
- The form prints its current input, including a time still being typed. It does not save or confirm. New and changed forms say **Draft / not saved**. An incomplete draft shows TBC and the outstanding fields.
- A saved function prints every round, including rounds already sent. The day run sheet includes confirmed functions dated today and overnight functions with a round today, ordered by first food time. Each function starts a new sheet. Every round for each selected function is included. Drafts and cancelled functions are excluded from this day copy.
- An individual cancelled copy is labelled **Cancelled / do not send**. Overnight rounds show their date and next-day label.
- The print layout is A4 portrait with the book's Barlow and Barlow Condensed fonts and system fallbacks. It includes event name, date, event start, guests, area, food service times, booked quantities, each round's quantities and note, sent marks, totals, service and dietary notes, kitchen comment and its saved author, version, last change and Queensland print time.
- A long booking or note continues onto more pages. Never truncate it or reduce all the words to fit one page.
- Booking contacts, app navigation and interactive controls are excluded. Paper ticks do not change the book.
- A cached kitchen copy carries its last-read time and a warning to check the latest changes. Printing does not turn a failed read into an empty schedule.
- The native dialog supports a printer or the browser's Save as PDF option. A missing or failed print API gives a visible message and permits retry. Closing the dialog restores the current screen and unfinished form.

## Implementation boundaries

`js/functions.js` builds a print-only snapshot under `#fn-print`, calls the native print API and cleans it up on `afterprint` or a return to the window. The snapshot stays separate from live screen updates. The function editor flushes pending local input and hands only the kitchen document shape to that printer. It does not pass `fncontact`.

The shared print code is already in the shell through `js/functions.js`. No new runtime dependency, service, Firestore read, listener, write, collection, field or persistent cache is added. `FE_API` and the editor's `API` are both 6 after the cancellation-access change. Print CSS uses a named A4 page so it does not change other browser print views.

## Verification

`tests/function-print.test.js` exercises staff printing, the full service day, overnight dates, offline warnings, current unsaved input, contact exclusion, escaped text, incomplete drafts, retry, empty schedules and large bookings. It renders real Chromium PDFs to check A4 dimensions, page count and complete long notes. The existing Functions journeys, screen widths, permissions and read-budget checks must also pass.

## Rollback

Revert the feature pull request on a fresh branch and redeploy Pages. No saved data or database rules need rolling back. The old editor and app API versions must be restored together.

## Combined daily prep sheet (31 Oct 2026)

Kuschi requested one cheat sheet with all functions at a glance, rather than one sheet per function. **Print prep sheet** sits under Today and each upcoming date on Functions (`#/fn`), and beside Print run sheet in Service View (`#/fn/now`). Each button prints its labelled day, not the whole upcoming fortnight. Empty days have a disabled button.

The A4 landscape copy starts with one table of every confirmed function for that day: name, area, food times, platter counts by type, service and dietary notes, and kitchen comment. It includes completed functions and already-sent rounds so it remains a full daily prep reference. Overnight functions contribute only rounds on the selected day. Undated rounds belong to the booking date and say TBC. Drafts and cancellations are excluded. Totals add the selected day's rounds, not every round of an overnight booking.

The platter references follow in three columns: every Functions platter in the current book, plus any booked recipe no longer in the catalogue. Each appears once with its current drawing, ingredients, per-platter amounts, ingredient notes, yield and total platters to prep. Zero-booked platters stay visible as references. Amounts are not multiplied or inferred. Missing recipes and drawings say so. Square-bracket amounts stay unconfirmed. This is a prep reference; consult the recipe cards and bought-in labels for allergen checks.

The standard six-platter, three-function example fits one A4 landscape page. Exceptionally large schedules or notes continue at the same readable size, without dropping information. There are no forced page breaks between functions. The existing portrait run sheets remain available.

The prep sheet shares the native print lifecycle, offline/source warning, retry and access gate. It reads only already-loaded function, recipe and drawing data. SVG is cleaned again at print time. No reads, writes, rules, caches, contacts or new dependencies are added. `tests/function-prep-print.test.js` verifies real PDFs, daily and overnight totals, upcoming-day buttons, current/missing recipes, drawings, safe text, long notes, screen widths, empty days and the read/write budget.

Example with synthetic bookings:

![Combined daily prep sheet](images/function-prep-sheet.png)
