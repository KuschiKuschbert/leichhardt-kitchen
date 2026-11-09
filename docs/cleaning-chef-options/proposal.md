# Make chef cleaning manageable

9 November 2026. Design exploration only. Baseline: `2cb62ba`.

The owner asks for three different designs to clean up the endless Cleaning list on the admin, head chef and sous chef side. The current programme contains 26 general templates and 25 ordered pack-down steps. The chef Today view renders all due tasks; Week renders all tasks; Set repeat tasks appends every active template and places Add and the editor after them. Scrolling is the only way to reach many jobs and setup actions.

Compare management layouts that keep today's action, weekly review and schedule setup available with fewer rows on first open. Retain the existing notebook, Barlow and Caveat typography, shared work surfaces, 44 px controls and responsive layouts. Show all three at 390, 768 and 1280 px using the same illustrative data. No production programme or records are changed.

Preserve required inline checks, explicit prep/service/use events, blocked reasons, mapped Pass verification, worker/time attribution, unsent drafts and immutable history. Pack down stays Hot larder, Grill, Pans, numeric steps, then the existing final floor reminder. Do not turn a blocked job into done, infer missing service events, bulk-complete a section or make role text grant verification permission. An area is not necessarily a staff section. Keep shared tasks discoverable.

Existing baseline screenshots: `docs/cleaning-options/schedule/native-packdown-390.png` and `native-packdown-1280.png`. These use synthetic data and show the current programme. Additional baseline measurements will use the current app with the same 51 synthetic templates.

Scope: chef management only. The team daily flow and release switch retain their contracts. No new main navigation destination, service popup, listener, timer polling, database collection or rules change is proposed. Navigation, filtering and grouping should operate on the existing bounded loaded range. Import remains explicit. All three must offer weekly review, task search, template editing and today's existing completion flow.

Expected cost: one focused client layout change after the owner selects a design, plus browser coverage and the feature note. Highest risks are hidden shared work or exceptions, loss of task order, discarding an unsaved check when changing scope, and confusing task counts with event coverage. Count taps and complete rows using the browser; distinguish task rows from group summaries. Larger task batches must not become an endless list in a new container.

Service rules: the work page is one tap from its tab; no extra main tab, top-bar button or service popup; nothing overlays a service list unless it prevents a mistake; explain and measure additional taps or fewer visible lines. This council is role-based analysis, not research with kitchen staff.
