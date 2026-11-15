# Evidence packet: sections in Today's team

Source commit: `main` at `d865d9e` (15 November 2026). Read with [the proposal](proposal.md). Every excerpt below is copied from the named file and heading so a reviewer does not need to open them.

## Baseline screenshots and measurements (Implemented app, stand-in)

Files in this folder (open them as images): `baseline-admin-390.png` (head chef, admin panel, Team, Today's team, 390 x 844), `baseline-team-390.png` (sous chef on `#/team`, 390 x 844), `baseline-admin-1280.png` (admin 1280 x 844), `baseline-admin-390-after.png` (after the task). Raw numbers `baseline.json`, script `baseline.cjs`.

- Made-up day as the roster import leaves it: 8 staff, 17 person-service memberships over Lunch (10:00 to 15:00), All day dining (15:00 to 17:00) and Dinner (17:00 to 22:00), six sections, no sections set.
- Giving every person their section on every service, then Save: **53 tap-equivalents** (17 sections x 2, 9 Service to edit switches x 2, Save 1). A picker is open plus choose: 2.
- Complete person rows above Save on opening: admin 390 px **0**, `#/team` 390 px **2**, admin 1280 px **1**. Each row is 135 px tall.
- A row shows the name, Service to edit, Section, the break summary and Edit breaks. It does not say which services the person works. Roster hours show only on the head chef's admin session while the import is in memory ("Roster 10:00 to 21:30").

## Current Today's team contract (C, Roster and focus, chosen 10 Nov 2026)

From `docs/team-page-options/implementation.md`, Changed contract:

> Each person has a labelled **Service to edit** and **Section** pair. A row starts on a service that person actually works; its later view choice is private memory state, separate for each person/date. Viewing another service cannot add/remove membership, alter another service's section/breaks or save anything. No section keeps membership. Adding or removing a service is an explicit named draft action. Keep known editable usual-section defaults through existing helpers.

> The complete existing week is revealed from the selected date ... Preserve independent protected drafts, read-only past dates and one version-protected dated Save. The current saved break board stays on today and uses acknowledged records even while editing another date.

> Break details name the person, service and date. Use one real editor, beside the roster on a laptop and inline with its person on a phone ... One notebook-scoped Save remains reachable above the real phone navigation.

> Retain Add staff for every eligible person, deliberate multi-service group selection, unfinished selections protected with their date, Whole day review of actual memberships, copy last weekday, Spread ... meal breaks, long splits and complete saved references ... Flag a meal/split overlap for the same person for review without silently correcting the plan.

> No new data source, listener, poll, saved field, schema, role, rule, read loop, persistent private cache or application dependency.

Known integration faults found and fixed in C (`implementation.md`): a stale shared-picker choice could reach a changed service (context-specific field IDs now prevent it); overlap review missed another active service; keyboard Close details lost focus. `tests/team-picker-context.test.js` guards them.

Measured C task costs (`implementation.md`): section and Save 3, another service plus section and Save 5, break correction and Save 4.

## Roster import (chosen combined, 14 Nov 2026; `docs/roster-import-options/brief.md`)

> Only on the admin account, in the admin panel. Each day that was read, has no saved plan, no draft and is not past is filled through `tmAddShift()` (usual sections, never a guessed one) ... puts each shift on every kitchen shift it touches ... Each row says "Roster 10:00 to 21:30". Save the N filled days saves every filled day at once without breaks; the sous chefs then open the day and set breaks. Name links let a nickname match a roster name.

Roster hours are memory only on the admin session; showing them to sous chefs needs a saved field and a rules change (offered 14 Nov 2026, deferred: "roster times later if the sous chefs need them").

## Design patterns (`docs/design-patterns.md`)

Choosing:
> **Two to about six fixed choices:** chips in a row (`.chip` with `aria-pressed`), one tap. **More, or a list from the kitchen's settings:** a `<select>` that the shared controls dress as a picker (`LK_UX.enhance`, `.ux-picker`): a bottom sheet on a phone, a centred box from 768 px. **More than about 12:** the picker gets a type-to-find box.
> **Fill in what the book knows** and keep it easy to change: the usual section, the unit, last week's team (Use it), a long shift's split. A suggestion fills every field it knows. Nothing is saved by itself.
> **Filled for you:** when the book fills a box from what it knows, the box carries a word tag (LAST TIME or USUAL, a neutral word in a box, never green or orange) ... It fills only empty boxes, never over what was typed or picked.

The look:
> **Tap targets** are at least 44 px. **Corners:** `--r-act` (8 px) on buttons that do something, `--r-pick` (round) on chips and filters that choose.

Saving:
> **A form's Save:** `svButton()` draws it (off while nothing changed), `svStart()`, `svDone()` only when the server answers, `svFail()` on a refusal.

## Surface and operational colours (`docs/surface-colours.md` Selected design, `docs/colour-coding.md` Shared meanings)

> Colour identifies an existing book or block through its cover, header, spine or quiet edge. Warm paper remains inside for reading and writing ... steel for work, sage for people, charcoal for current live boards and bands ... A sage people book never means that the whole plan is Saved.
> Amber belongs to named attention or pending work; green confirms the stated success; red identifies errors, invalid entries and existing destructive or adverse actions.
> Complete, saved, included or assigned: `--done`, `--done-ink`, `--done-tint` ... Assigned in a Team draft does not mean Saved.
> Action, active choice and attention: orange ... Do not interpret every orange word as overdue.
> Preserve ... roster timeline segments ... No broad surface selector may recolour those meanings.

## After the tap (`docs/action-feedback.md`, The rule)

> 1. Answer in the tap's own frame ... A form's Save button says Saving... and shows Saved only once the write resolved.
> 2. Confirm where the eye is, in words ... Never "Added", "Done" or "Saved" alone when the thing has a name.
> 5. A failure stays and keeps the work.
> 8. Colour carries meaning, never alone.

## Service rules (head chef, 5 Nov 2026)

1. The main job of each work page is one tap from its tab. 2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK. 3. Nothing appears over a list during service unless it stops a mistake. 4. A change that adds taps or takes away visible lines says why it is worth it.

Today's team is a planning page for chefs, not a service list, but the sous chefs open it during service to change breaks.

## Design references (`.claude/skills/service-council/SKILL.md`)

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Are the page frame, action placement and names consistent, with the work more prominent than navigation? | Tiny dense controls, keyboard-only paths or a second navigation system |
| Things 3 | Are today's work and upcoming work distinct? Are occasional details tucked away while frequent actions stay visible? | Drag-only actions or hiding the chosen one-tap Urgent, Recipe and On it controls |
| Airbnb | Can the person see a job's time, place, requirements, status and next action together, without hunting through screens? | Decorative cards, photos or duplicated information that displaces useful lines |
| Todoist | Is adding quick, with known defaults visible and editable, usual items easy to find, and extra fields shown when needed? | Guessing a section, unit or quantity from ambiguous text, or hiding required inputs |
| Flighty | Is what matters now and next clear, with real times, deadlines and status from data the person may already read? | New listeners or polling just for the look, distracting movement or stale status presented as live |
| Duolingo | Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery? | Points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement |
| Headspace | Are labels calm, short and understandable to a new starter, with one name for each thing and words on actions? | Vague reassurance, unexplained icons or onboarding interruptions during service |

The service rules, current feature contracts and the head chef's later choices take priority over the research. Keep the book's approved colours, notebook style, handwritten line words and functionality.

## Try to break it (`.claude/skills/service-council/SKILL.md`)

Failure families to consider, up to three leading scenarios per review: confusion and accidental action (wrong day, person or service; long labels); repetition and delayed answers (double taps, repeated Save); failed reads and writes (no signal, held write, refusal; a pending write must not look Saved); interruption and handover (Back, reload, daily lock with unsent work); time boundaries (midnight, 04:00 unlock); access and conflicting state (wrong role, two writers); misleading presentation (colour implying success). Label evidence Reproduced, Checked in [fixture], Risk / Not evidenced, or Not applicable. Record scenario and role/state, expected result, observed result or hypothesis, impact, smallest repair or check.

## Limits

This packet measures one made-up day in the stand-in with fallback fonts. It does not know how often the head chef and sous chefs plan, how many staff work split sections (different sections at lunch and dinner) in the real kitchen, or how often the usual section is already right.
