# Order day nudge: evidence packet

Source commit `8f0e83c` (main, 24 November 2026). Excerpts from the current contracts, with file and heading. Measurements here are from source reading unless marked Preview or Implemented app. No screenshots were taken for round 1 (the change touches no page yet); round 2 previews add them.

## 1. What already reminds chefs to order (docs/cutoff-options/brief.md, Chosen and Build; scripts/cutoff-push.mjs header)

- Each supplier has delivery days and, per delivery day, an order-by weekday and time (`config/main.cutoffs`, `js/cutoffs.js`). Set on the admin Order cut-offs page (head chef's Google account only).
- The phones show today's cut-offs as a bar and a **Supplier orders today** tick list on the Order list, at the top of Chef to-do, and as lines on Home's **Now and next** board; **Coming up** on Home lists the next 7 days' cut-offs. A chef ticks a supplier as ordered in 1 tap (`cutdone/<day>_<supplier id>`), shared by every chef.
- **Tomorrow, heads-up** line with **Ordered already** the day before a cut-off 2 or more days ahead.
- **Phone pushes** (24 Oct 2026, head chef decision): a server job every 10 minutes (`scripts/cutoff-push.mjs`, Cloud Scheduler since 20 Nov 2026) sends, per supplier, a push when the reminder starts (4, 6, 8 hours before or all day), 1 hour before ("Order now"), and a heads-up at 15:00 the day before a long-lead cut-off. **Every chef phone that turned pushes on gets every push**: phones whose `push/<id>.by` is in `config/main.sousIds`, is `headId`, or is `'owner'` (the head chef's Google device). A ticked supplier gets no more pushes. About 150 to 200 reads a day.
- Pushes are turned on per phone in Settings, Notifications ("Cut-off pushes on this phone") or on the Order list.

## 2. Roles (docs/staff-capabilities.md; firestore.rules config/main)

- `config/main.headId` is the head chef's staff id; `sousIds` lists the sous chefs **and always includes the head chef** (`ownerBootstrap()` requires `headId in sousIds`). `config/main` is private (staff phones get a minimal roster).
- `config/main` is written only by the owner's verified Google identity (the admin) and, for staff-list fields, a sous chef's staff page. A new kitchen-wide field a sous chef can change needs either a rules change on `config/main` or a new record.
- At Leichhardt the admin and the head chef are the same person. At a second venue the platform owner is a second admin with his own profile (`docs/venues.md`).

## 3. The roster (docs/roster-import-options/brief.md, steps 2 to 5; docs/team-week-options/brief.md)

- The Humanforce roster CSV is imported **only on the admin account** in the admin panel. It fills each day of the week as a planner **draft**; the head chef then saves them ("Save the N filled days") as `team/<day>` records. Unsaved drafts live in that device's memory only.
- A saved day: `team/<day>.on[] = { id, sh, sec, from, to }` (staff id, shift, section, roster hours). Chefs can also plan a day by hand in Today's team (`#/team`), up to a week ahead.
- Names are matched to book people by given name or the head chef's saved name links; unmatched roster names are never guessed. Whether the head chef appears on the Food department roster is not evidenced.
- Home already reads today's saved plan once a day (`teamLoad()`, `tm.rec`) for On with you and the On today board; no extra read for today's team. A future day's plan is read only when the planner opens that week.

## 4. Individual shift pings (docs/ping-recipients.md)

- A chef can already write a ping to one person (`directnotes`, `to` = staff id) with a date, weekday, optional time and **weekly repeat**. It shows in that person's bell with Got it, during a 30-minute lifetime. It is not a phone push and does not look at the roster.

## 5. Home and Chef to-do (docs/home-staff-first.md; js/prep.js homeBoardHTML, chef to-do)

- Home's **Now and next** board (warm `--hit` surface, orange edge) lists today's work reminders including cut-offs, and says "Checking the day..." until the kitchen's settings are in (never "Nothing due" before then). Chefs see **Coming up** with the next cut-offs.
- Chef to-do opens with **Supplier orders today** (the same tick list).
- Home contract: checking your section, break and coworkers takes zero taps; no new top-bar button, work-page overlay or work-page list line was introduced by staff-first Home.

## 6. Settings (docs/settings-options/brief.md, design A built 3 Nov 2026)

- One sorted page: You, This phone, Notifications, Team (sous chef), The kitchen (head chef), About and help. Kitchen rows open the admin page that already saves them. Find a setting searches it. Heights at 390 px with every row folded: 1,808 px for a sous chef, 2,691 px for the head chef.

## 7. Colour and state (docs/surface-colours.md Selected design; docs/colour-coding.md Shared meanings)

- Steel for work books including Orders; sage for people; charcoal for current live boards; warm paper inside.
- Orange: action, active choice and attention (also the brand). Amber belongs to named attention or pending work. Green (`--done`) confirms the stated success. Red for failure. Status must read without colour (words, ticks).

## 8. Action feedback and loading (docs/action-feedback.md The rule; docs/loading-motion.md)

- Every tap answers in its own frame and says what it did by name ("Saved 14:02. The sous chefs see the new cut-offs now."). Save uses `svButton()`: Saving..., Saved with a tick after the server answers, Try again with a red line.
- An answer from the cache is not "nothing there"; a failed read says so, never "Nothing due".

## 9. Time (CLAUDE.md, One clock)

- Queensland time (UTC+10, no daylight saving). The book's day changes at midnight; personal devices unlock daily after 04:00. Server jobs compute Queensland time themselves (`ZONE` in `scripts/cutoff-push.mjs`).

## 10. Reads (docs/firestore-usage.md; head chef decisions 13 and 20 Nov 2026)

- Plan C: the project is on pay as you go since 13 Nov 2026, but the book still keeps its read budget (`tests/read-budget.test.js`). No new listeners or polling; listeners only for today's live data.

## 11. Service rules (CLAUDE.md, Service council)

1. The main job of each work page is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.
