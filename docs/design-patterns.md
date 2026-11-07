# Design and behaviour patterns

The pieces the Kitchen Book is built from, so a new screen looks and behaves like the rest (head chef, 8 Nov 2026: "maintain consistency"). Before drawing anything new, use one of these. If nothing fits, add the new pattern here in the same pull request, with its class and helper names, and get the head chef's OK for a new look (the service council, `.claude/skills/service-council/SKILL.md`).

Every class, helper and colour named on this page is also listed in `tests/design-patterns.test.js`, which fails when one of them is gone from the code (a test may not read `docs/`, see `CLAUDE.md`). Change the two together. The same test fails when a file declares one top-level name twice.

The rules behind them are in `CLAUDE.md` (Service rules, Coding rules, Things that are easy to break). The longer notes: [after the tap](action-feedback.md), [adaptive controls](adaptive-controls.md), [loading and motion](loading-motion.md), [work pages](work-pages-design-options/brief.md), [admin pages](admin-pages-options/brief.md).

## The look

- **Colours** are tokens in `:root` in `css/app.css`, never a new hex in a rule: `--ink` (text, rules), `--paper` and `--bg` (surfaces), `--muted` and `--faint` (quiet text), `--line` (dividers), `--accent` and `--accent-ink` (the book's orange), `--tag` (needs attention: a filled chip, a due line), `--done` and `--done-ink` (saved, ticked), `--bar` and `--bar-text` (the dark top bar and tab bar).
- **A fill is for something that needs attention**, nothing else: the top bar chip until today's team is saved, a filled tag. Groups are made with space and headings first.
- **Type:** `--display` (Barlow Condensed) for headings and labels, `--body` (Barlow) for the rest, Caveat for the handwritten done count (`.nb-prog`).
- **Corners:** `--r-act` (8 px) on buttons that do something (Save, Add), `--r-pick` (round) on chips and filters that choose.
- **Tap targets** are at least 44 px; a quiet secondary link may be smaller when a 44 px way to the same place is on screen.
- **Icons** are inline SVG with `currentColor` and `aria-hidden="true"`, from `ICON` in `js/app.js`; an icon drawn more than once with a mask gets its own mask id each time (`tmIcon()`).

## A page

- **The card:** `section.p-card` with `h2.p-h` (id `rtitle`, so the page's Back and focus land on it), a `.hint` line for what the page is for and when it was read, then the work. Buttons sit in a `.btn-row`: `.btn` for most, `.btn.dark` for the one main action. A quiet action in a sentence is a `.p-link` (Refresh, Try again).
- **A failed read** never shows "nothing", "nobody" or "0": a `.p-err` line with role status says it could not load, a Try again, and the book tries once more after 5 minutes by itself (`retrySoon()`, `waiting()`). An answer from the phone's own copy with no signal is not "none" (`cacheOnly()`).
- **Waiting** uses the Ink helpers, never a spinner: `inkLabel()` in a line, `inkWait()` for a block (`docs/loading-motion.md`).
- **Home's board** (redesign step 2, 8 Nov 2026): a dark `.hm-board` with only what is still to come, one `.hm-a` row each (a drawing, the words with a small second line, the time and a short note on the right, `is-hot` when it is close), every row a tap to where it is done. Under it, `.hm-paper` cards hang from a pin (Prep by section with its `.hm-sec` rows and bars, Coming up). Worked out from what the phone holds, never a read of its own; `homeSlot()` draws it and `homePaint()` keeps it right. Nothing to come says so in one line.
- **Words** follow `CLAUDE.md`, Writing style: short, 24-hour times, no em dashes. A person's name comes from the staff list (`mnName()`), never typed into code.

## Choosing

- **Two to about six fixed choices:** chips in a row (`.chip` with `aria-pressed`), one tap. A count on a chip goes in a `small` inside it (Today's team's shift chips).
- **More, or a list from the kitchen's settings:** a `<select>` that the shared controls dress as a picker (`LK_UX.enhance`, `.ux-picker`): a bottom sheet on a phone, a centred box from 768 px.
- **More than about 12:** the picker gets a type-to-find box with the likely few first (`AdaptivePicker` in `js/controls.js`).
- **Fill in what the book knows** and keep it easy to change: the usual section, the unit, last week's team (Use it), a long shift's split. A suggestion fills every field it knows. Nothing is saved by itself.
- **Suggestions while typing** sit right under the box as rows (`.nb-sgr`), the likely few first, each saying what the book knows on a small second line. A tap on the words fills the form; a one-tap **Add** beside them (`.nb-sgadd`) only when every field it needs is known, never guessed (Add a line, redesign step 1, 8 Nov 2026).

## Saving and after the tap

- **A form's Save:** `svButton()` draws it (off while nothing changed: `save()` refuses then too), `svStart()` when it goes, `svDone()` only when the server answers, `svFail()` on a refusal, `svLine()` for the line under it. Red failure words come from `errMsg()`; an unknown refusal goes through `failed()`.
- **A tap on a list line** answers on the slip with the line's name and Undo: `toast()`, `slipName()`. Answer the six questions in `docs/action-feedback.md` for every new button.
- **Destroying something typed** asks a second tap in place: `arm()` and `armed()` turn the button into "Tap again to remove". No pop-up.
- **Every write** goes through `W()`; ask `canW()` first.

## Over the page

- **A bottom sheet** (Your day, the pings sheet): `.nt-wrap` holding the dimmed `.nt-bg` (a tap closes) and `section.nt` (role dialog) with `.nt-grip`, `.nt-in`, a header `.nt-head` (`.nt-eb` eyebrow, `.nt-h` title, `.nt-date` line), `.nt-body` and `.nt-foot` with its `.nt-got` button. It goes on `document.body`, closes on the backdrop, the button, Escape and Back (`ovPush()`, `ovDone()`), keeps Tab inside (`trapTab()`), and takes its turn with the other sheets (`sheetOpen()`, `sheetBusy()`, `sheetNext()`). It opens on a tap, never by itself over a list, unless it stops a mistake.
- **The top bar** holds the round chips only, each 44 px with the bell's ring (`.tm-chip` in `.wtop-icons`): no words, as words wrap the page tabs on a laptop and cut "Kitchen Book" on a phone. Filled (`is-due`) only when it needs attention. A new one is a head chef decision.

## Inside a list

- **A line in a list's header** (Set today's team, a person's day under the done count) keeps the header's height, or a tick lands on the wrong row: wrap the count in `.nb-pw`, borrow the header's spare room (`.nb-tmset`) or the date's line (`.nb-tmday`, with an ellipsis when long), and measure the header with and without it in the test.
- **A line's own buttons** say what they do in a word (Urgent, On it, Recipe, Remove), never a lone mark like !, and fill when on. On a phone, where they sit beside the words (redesign step 1, 8 Nov 2026), each is 44 px with a small drawing over its word (`.nb-ai` drawing, `.nb-aw` word). A ticked line keeps the room of the button it loses (`.nb-onslot`), so a tick never changes a row's height under the finger.
- **A section heading's bar** (`.nb-hbar`) fills as its lines are ticked, drawn from the lines on the page with no read of its own.
- **The way back from a full-screen view** (the wall board) is the first thing in its heading, in words, at least 44 px, and takes focus when the view opens (`.wb-list`, Back to the prep list).
- **A group headed like a departure board** (Orders by supplier, redesign step 3, 8 Nov 2026): the name small and spaced, when it closes and how many are done on a small line (`.o-sgs`), the time left large on the right, orange in the last hour, a ruled line below; a group with no time has its heading and count only (`.o-sgh`). The most urgent kind of group first only when it is the one to act on (No supplier yet: ordered by hand).
- **Records of the day as arrivals** (Delivery received): the time first (`.dl-at`), a dot on a line (`.dl-dot`, hollow while it waits for the connection), then the record (`.dl-rb`) with each reading as a stamp. A value not taken is left out, never shown as 0.
- **A long run of rows that are not the point** folds into one line that names them and says Show (`.tm-fold`, with `aria-expanded`), instead of filling the screen.
- **Nothing new over a list during service** unless it stops a mistake (`CLAUDE.md`, Service rules).

## Admin

- **A block** is a `.set-block` with a `.label` or an `h3.a-ch-h` heading (the page's chips read them).
- **A list that grows** goes through `lvHTML()`: search, filters, sort, Show more and phone cards come with it.
- **A table** sits in `.a-tablewrap` (a region that scrolls sideways and fades at its edge) as `.a-table.a-plain`. A colour scale (the skills matrix, shifts on each section) uses cells `.sk-c` with an `.a-legend` key, and counts, never a verdict.

## The chef hat

- **A tile** is a `.wm-tile` in its group (Kitchen or Chef). Its small second line says only what the book already holds, with no read of its own (`.wm-due` when it needs doing: "Not set yet", "1 to sign").
