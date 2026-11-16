# Evidence packet: a louder Too few warning and OK short

For every council reviewer, round 1 and round 2. Source: `main` at `a67f126` (16 Nov 2026, after #713 Too few, #718 roster flag and Clear, #721 the day on one clock). Role-based analysis, not research with staff.

## 1. What exists today (Implemented app)

From `js/prep.js` (`tmShortOf()`, `tmShortNow()`, `tmShortLineHTML()`, `tmShortMarkHTML()`, `tmShortPaint()`) and `docs/team-minimum-options/brief.md` (Chosen and Built, 15 Nov 2026):

- The head chef sets, per shift in Admin, Kitchen, Shifts: Busy time from, to, and People needed then (1 to 30). Stored on each `config/main.kitShifts` entry as `busy: { from, to, n }`. Only the verified admin writes it.
- Today's team (the admin panel's Team room, `#/admin`, and the chefs' `#/team`) counts, per busy time, the people on that shift, inside their roster hours where the day has them, and not on a break. Today counts from the kitchen clock's minute; a planned day counts the whole day.
- When too few: **one line in the Save dock**, `role="status"`, 13 px: "**Saved plan: too few now until 19:00.** 4 now, 5 from 18:45, 6 needed. Move a marked break." After an edit it starts "Unsaved plan". A short roster says "Only 3 on Dinner (0 now with breaks), 6 needed. Add people or move a marked break." A second short time adds "Next: 19:45 to 20:15." A shift with no hours says it cannot check.
- **Marks:** "break when too few" in orange bold beside the name of each person away in the short time the line names.
- **A warning only.** Save is never stopped. Nothing once the short time is over, nothing when the plan has enough, never an all-clear "Covered".
- It repaints on the existing minute, focus and clock paint, never while a picker is open or a box is typed in. No read, listener or timer of its own.
- Cut in round 1 of that study (all five agreed): no Home card, no day strip, no change to On break now or Spread them, no sous-chef editing of the busy time, no per-weekday need yet.
- `team/<day>` today: `{ day, on: [{ id, sh, sec, from?, to? }], br: [{ id, sh, at, len }], v, at, upd, by }`. Rules (`firestore.rules`, `match /kitchens/KITCHEN_PIN/team/{day}`): `keys().hasOnly(['day','on','br','v','at','upd','by'])`, `v` must be the stored `v + 1` (a chef never writes over another chef's newer save unread), writers: the verified admin, or a staff session whose `by` is a chef (head or sous chef, own PIN).
- The Save is `svButton()`: off while nothing changed, Saving..., Saved with a tick only once the server answered, Try again with a red line on failure.

### Baseline measurements (Implemented app, click-test stand-in, fallback fonts)

The study's made-up day (`docs/team-minimum-options/data.js`): Lunch 10:00 to 15:00, Dinner 15:00 to 21:00, a sous chef and 8 staff. Busy times: Lunch 12:00 to 14:00, 3 needed; Dinner 17:30 to 20:30, 6 needed. Four meal breaks overlap from 18:15. Script `baseline.cjs`, raw `baseline.json`.

| Measure | admin 390 | sous chef `#/team` 390 | admin 1280 |
| --- | ---: | ---: | ---: |
| Save dock height with the line | 114 px | 116 px | 67 px (line beside Save from 1100 px) |
| Save dock without a line (15 Nov measure) | 96 px | 98 px | 67 px |
| Person rows fully in view, working screen (list head at top) | 1 (2 partly) | 1 (2 partly) | 3 (4 partly) |
| Line font, first words | 13 px bold `--small-ink` on `--surface-paper`, 5.27:1 | same | same |
| Taps to move one marked break (open the time picker, choose) | 2 | 2 | 2 |
| Taps to Save | 1 | 1 | 1 |
| Taps to accept a deliberate short time | not possible | not possible | not possible |
| Sideways scroll, page errors | none | none | none |

Line at 14:00 (planning ahead): "Saved plan: too few 18:30 to 19:00. 4 from 18:30, 5 from 18:45, 6 needed. Move a marked break." At 18:30: "Saved plan: too few now until 19:00. 4 now, 5 from 18:45, 6 needed. Move a marked break." Marks on Sam K, Dev, Fen, Hal.

Screenshots in this folder: `baseline-admin-390-1830.png` (first screen), `baseline-team-390-1830-working.png` (sous chef, working screen), `baseline-admin-390-1400.png`, `baseline-team-390-1400.png`, `baseline-admin-1280-1830.png`.

Each person row is now tall on a phone (#721): name and marks, a read-only day bar, a sentence of hours and breaks, then one line per service with its section picker, Take off, break pickers and + Break. The page is long; the Save dock is sticky at the bottom above the tab bar.

## 2. Current design contracts (excerpts)

**Service rules** (CLAUDE.md, head chef 5 Nov 2026): (1) the main job of each work page is one tap from its tab; (2) no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; (3) nothing appears over a list during service unless it stops a mistake; (4) a change that adds taps or takes away visible lines says why it is worth it.

**Operational colours** (`docs/design-patterns.md`, Operational colours; `docs/colour-coding.md`, Shared meanings):
- Orange (`--accent`, `--accent-ink`, `--small-ink`, `--tag`, `--hit`; `--bar-accent` on charcoal): action, active choice and attention. Orange is also the brand and heading colour; do not read every orange word as overdue.
- Green (`--done`, `--done-ink`, `--done-tint`; `--done-on-dark`): complete, saved, included or assigned. Assigned in a Team draft does not mean Saved.
- Red (`--bad-ink #9B2716`, `--bad-tint #FBE9E5`; `--bad-on-dark #FF9C8A`): failure, invalid input, destructive action or an explicitly adverse state. Red does not replace the second tap or existing confirmation behaviour.
- Waiting or not sent: neutral/orange pending treatment plus words.
- "Attention and outcome fills remain local: the top bar chip until today's team is saved, an attention banner, a filled tag or an acknowledged result. Amber means attention or pending, green confirms the stated success and red marks errors or existing adverse/destructive actions."
- Colour always comes with words, ticks, pressed states or outlines.

**Surface colours** (`docs/surface-colours.md`, Selected design): people books (Today's team) use the sage people cover, header and spine with warm paper inside; live boards use charcoal; writing areas stay quiet paper.

**Today's team patterns** (`docs/design-patterns.md`):
- The day on one clock (16 Nov 2026): one `.tm-tlrow` per person: the name with `.tm-short-mark` and `.tm-roster-flag`, the read-only `.tm-rowbar`, one sentence of hours and breaks, one line per service.
- Off the roster (16 Nov 2026): `.tm-roster-flag` under the name in the Too few mark's orange words. "A flag only: nothing is blocked or changed by itself."
- A form's Save: `svButton()`, `svStart()`, `svDone()` only when the server answers, `svFail()`, `svLine()`.
- Destroying something typed asks a second tap in place (`arm()`), no pop-up.

**Action feedback** (`docs/action-feedback.md`, The rule): answer in the tap's own frame; confirm where the eye is, in words, by name; clear the old words once Saved; a small green "Saved 14:02" stamp; a failure stays red with the work kept; colour never alone.

**Head chef decisions** (`docs/head-chef-decisions.md`): 15 Nov 2026, Too few chosen as the council's mix, one busy time for every day, per-weekday need waits "until the warning nags on quiet nights". 16 Nov 2026: the roster file is the source of truth; flag, never block.

## 3. Service council skill sections (verbatim in the reviewer prompt)

The reviewers also receive the skill's Current design contracts (colour and state checks), Design references (Linear, Things 3, Airbnb, Todoist, Flighty, Duolingo, Headspace) and Try to break it sections.

## 4. Open facts the study cannot see

- Whether the head chef has set a busy time in the real book. With none set, nothing shows today.
- How often the real kitchen plans short, and how often on purpose.
- Contrast of any new bar: not measured until a preview exists.
