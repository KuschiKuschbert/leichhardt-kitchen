# Evidence packet: too few in the kitchen, and a minimum for a time of day

Source commit: `main` at `da18bf7` (15 November 2026). Read with [the proposal](proposal.md). Each excerpt below is copied from the named file and heading, so a reviewer does not need to open them.

## Baseline screenshots and measurements (Implemented app, stand-in)

Files in this folder (open them as images): `baseline-admin-390.png` (head chef, admin panel, Team, Today's team, 390 px, full page, kitchen clock 18:30), `baseline-team-390.png` (sous chef on `#/team`, 390 px, full page), `baseline-admin-1280.png` (admin, 1280 x 844, first screen), `baseline-whole-390.png` (Whole day review). Raw numbers `baseline.json`, script `baseline.cjs`.

- Made-up day in the head chef's real shape: Lunch 10:00 to 15:00, Dinner 15:00 to 21:00, a sous chef (Sam K) and 8 staff, 8 people on Dinner.
- At 18:30, 4 of the 8 on Dinner are on a meal break (Dev until 18:45, Fen, Hal and Sam K until 19:00). Three more had a split earlier (14:30 or 15:00 for 2.5 hours).
- The charcoal **On break now** board names the 4 away. It shows no count of who is left, no minimum and no warning. It reads the saved plan only, and only for now.
- Checking whether 18:00 to 20:30 is covered: Whole day review (1 tap), then read 14 lines (1,664 px tall at 390 px) and count by hand.
- On a 390 px phone the board starts at 554 px (admin) or 247 px (`#/team`); the grid starts at 772 px or 469 px. The sticky Save dock covers about 96 px above the tab bar.
- The grid head shows each service, its hours and "All have one" (sections). It does not count who is in.

## Today's team, current contracts

From `docs/code-contracts.md` (Today's team):

> `tmAwayHTML()`, `tmNextHTML()` and `tmAwayPaint()` use the loaded saved `tm.rec`, never `tmf`, for all-shift On break now and next-break status in `.tm-away-slot`. Keep Saved plan and the kitchen-clock time visible. Validate day, active membership and times; deduplicate people and flag conflicting overlaps without guessing a return time. Keep meal breaks and long splits distinct. Loading, unset, known nobody scheduled away, unknown, stale and failed reads remain distinct. Repaint from the existing minute, focus and clock-refresh paths without reads or listeners. A successful Save may update saved status; a failed Save must preserve the draft and cannot publish its breaks.

> Empty break board, head chef request 9 November 2026: hide the whole `.tm-away` aside only when `tmAwayData()` is ready, has no active away group and has no invalid intervals ... Loading, unset, stale, wrong-day, clock, read errors and malformed intervals remain visible.

> Keep one `tmf` draft across shifts, sections, Whole day, redraws and resizing, and one global Save for it ... Keep inline multi-break controls, default split logic, usual-section and training hints, Use it, Spread them, off-shift access, saved section overview, conflict recovery and Refresh's discard confirmation.

> Spread start spacing: keep break duration separate from group-start spacing. After previous break is the default ... Preserve one-person, two-person and all-together modes ... Use existing validated kitchen-clock helpers and no extra read or saved configuration field.

From `docs/team-sections-options/brief.md` (Built, 15 Nov 2026): the day grid. Services across with their hours in each column head, people down, a Section picker in every cell the person works and "Off" where they do not. The foot of each column head counts how many still have no section. A tap on Breaks beside a name opens that person's break details (beside the grid from 1100 px, under the row on a phone). No new read, write, field, rule or listener.

Data (`js/prep.js`, Today's team): `team/<day> { day, on: [{ id, sh, sec }], br: [{ id, sh, at, len }], v, at, upd, by }`. `at` and `len` are minutes. Break lengths 30, 45, 60, 90, 120 minutes; 150 to 240 is a split. Services are `config/main.kitShifts { id, name, from, to, off }`, set in Admin, Kitchen, Shifts (the head chef's admin only). Roster hours from the Humanforce import are memory only on the admin session; nothing saved says a person's own start and finish.

## Who can write what (`firestore.rules`, `docs/private-kitchen-access.md`)

- `team/<day>`: read by every signed-in kitchen session; written by the head chef, the sous chefs (own PIN) and the verified admin. Keys are fixed: `day, on, br, v, at, upd, by`. A new key needs a rules change.
- `config/main`: read by every kitchen session (one listener every phone already has). The verified admin may write any field. A sous chef may change only `people`, `staffIds`, `pinOpen` (and the past-edit stamp). A sous-chef-editable minimum in `config/main` needs a rules change.
- Admin, Kitchen holds the kitchen's settings as rows ("Each row says what it is set to. Tap it to change it."): Order cut-offs, Suppliers, Kitchen sections, Shifts, Shift pings. Shifts edits each service's name, From and To with one Save at the bottom.

## Design patterns (`docs/design-patterns.md`)

The look:
> **Current break board** (Today's team, 9 November 2026): reuse `.hm-board` on `.tm-away`, with the existing charcoal surface, light text, orange return times, edge and pin. Label it On break now, with Until beside each return time.

> **Attention and outcome fills** remain local: the top bar chip until today's team is saved, an attention banner, a filled tag or an acknowledged result. Amber means attention or pending, green confirms the stated success and red marks errors or existing adverse/destructive actions.

> **Notebook colour** (Chef to-do and Today's team): keep the approved work or people cover and spine, warm writing paper, orange active choices, green ticks and explicitly completed or assigned states, and quiet neutral dividers ... Local attention and scheduled-away cues retain their words.

Choosing:
> **Two to about six fixed choices:** chips in a row (`.chip` with `aria-pressed`), one tap. **More, or a list from the kitchen's settings:** a `<select>` that the shared controls dress as a picker: a bottom sheet on a phone, a centred box from 768 px.
> **Fill in what the book knows** and keep it easy to change ... Nothing is saved by itself.

Saving:
> **A form's Save:** `svButton()` draws it (off while nothing changed), `svStart()`, `svDone()` only when the server answers, `svFail()` on a refusal.

## Colours (`docs/surface-colours.md` Selected design, `docs/colour-coding.md` Shared meanings)

> Colour identifies an existing book or block through its cover, header, spine or quiet edge. Warm paper remains inside for reading and writing ... steel for work, sage for people, charcoal for current live boards and bands.

| Meaning | Treatment | Boundaries |
| --- | --- | --- |
| Action, active choice and attention | Orange: `--accent`, `--accent-ink`, `--small-ink`, `--tag`; `--bar-accent` on charcoal | Orange is also the brand. Do not read every orange word as overdue. |
| Complete, saved, included or assigned | `--done`, `--done-ink`, `--done-tint`; `--done-on-dark` on charcoal | Assigned in a Team draft does not mean Saved. |
| Failure, invalid input, destructive or adverse | `--bad-ink`, `--bad-tint`; `--bad-on-dark` on charcoal | Preserve Error, Try again words. |
| Waiting or not sent | Neutral/orange pending treatment plus words | Pending is not a confirmed failure or success. |

> Colour does not establish access or food safety. Status remains understandable through words, icons, ticks or pressed state without colour.

## After the tap (`docs/action-feedback.md`, The rule)

> 1. Answer in the tap's own frame ... A form's Save button says Saving... and shows Saved only once the write resolved.
> 2. Confirm where the eye is, in words ... Never "Saved" alone when the thing has a name.
> 5. A failure stays and keeps the work.
> 8. Colour carries meaning, never alone.

## Service rules (head chef, 5 Nov 2026)

1. The main job of each work page is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

Today's team is a planning page for the head chef and sous chefs, not a staff service page, but the sous chefs use it during service to move a break.

## Reads (`docs/firestore-usage.md`, CLAUDE.md coding rules)

The free plan stopped the book at 50,000 reads a day until 13 Nov 2026 (now pay as you go with a US$5 budget alert). No new listeners or polling. Every new read says when it runs and what it costs. `tests/read-budget.test.js` holds the budget.

## Clock (CLAUDE.md, One clock)

Anything compared with a saved time uses `now()`; today's date and minutes use `dayNow()` and `T.*` (Queensland). The planner repaints the board each minute from the existing clock path, without reads.
