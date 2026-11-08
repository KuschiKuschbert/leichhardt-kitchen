# Section prep standards

Chosen 8 November 2026 after the three-design comparison and style alignment. The head chef approved the recommendation with “okay lets go”: one separate Prep room, normal typing guidance and the complete Before service reference. The [design brief](prep-par-options/brief.md) retains the council, alternatives and original measurements. Implementation and release evidence belong to [PR #612](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/612).

## What it does

The head-chef, sous-chef and verified admin panels share a fifth room, **Prep**. It contains one section catalogue and editor. The canonical head chef or matching verified owner device can add, edit, archive and restore standards. Sous chefs can read them. An editable staff role label never grants write access.

Each standard has an item name, minimum ready before service, unit, approved matching names, optional recipe and short check instruction. A blank minimum says **To come**; zero is a real minimum. Units can describe a chef-confirmed container size. No real standards or sample quantities are seeded automatically. Sections must first exist in the kitchen configuration.

On the staff Prep page, **Work** remains the default. **Before service** shows the selected section's complete active reference, including items absent from today's tasks or already ticked. It has instructions, recipe links and an Add to prep action for people with Add permission. Already open matching work is shown for context. There are no stock counts, shortfall calculations, saved readiness ticks or service sign-offs.

In the existing Add sheet, typing an exact canonical name or a unique head-approved matching name reveals **Minimum ready before service**. Matching is scoped to a uniquely resolved configured section ID. Partial words, likely typos and ambiguous names require an explicit choice. Unknown text remains ordinary free entry; unavailable standards are reported separately.

The existing combined free-text **Amount to make** field and unit chips remain. A match or section change never fills or changes that amount. Add from the reference starts with a blank amount. If another line is already being written, its draft is retained and opened first instead of being replaced.

## Existing patterns

The panel uses `panelShellHTML()`, its existing navigation/Find descriptors and one `lvHTML()` catalogue. Staff use the existing notebook and body-mounted Add sheet. Colours, fonts, actions and pickers come from `css/app.css`; the new styles only lay out the added content. The design-pattern registry includes their names.

`js/prep-standards.js` is a lazy module loaded when the panel room, reference or Add guidance is needed. It owns the catalogue cache, matching and one editor draft. The narrow `psAdapter()` bridge in `js/prep.js` provides canonical permissions, sections, existing helpers, current tasks and the normal `W()` write path. It adds no startup dependency, database listener or polling.

Minimums belong to the catalogue. This chosen A+C implementation does not persist a catalogue link or minimum on daily prep tasks. Existing duplicate handling, rollover, task quantities, completion and learning keep their current data contracts. A completed task is never evidence of usable stock.

## Data and permissions

Private records live at `kitchens/{kitchen}/prepStandards/{id}`. `sectionId` and document identity are stable; moving a standard to another section means archiving it and creating a new one. Renaming a configured section does not change its standards' identity.

| Field | Contract |
| --- | --- |
| `sectionId` | Immutable configured section ID, 1 to 80 route-safe characters |
| `name` | Nonblank text, up to 160 characters |
| `aliases` | Up to 12 nonblank matching names, each up to 160 characters |
| `minimum` | `null`, or a finite number from 0 to 1,000,000 |
| `unit` | Nonblank chef-confirmed text, up to 40 characters |
| `instruction` | Up to 500 characters; blank shows To come |
| `recipe` | Empty or a route-safe recipe ID, up to 160 characters |
| `archived` | Boolean; archived items remain manageable and are excluded from staff guidance |
| `v` | Positive integer; creates require 1, updates require the saved version plus 1 |
| `at`, `by` | Save time and current head recorder; the server validates both |

Rules permit kitchen readers, including view-only staff and sous chefs, to read. Signed-out and Functions-only accounts cannot read. Only the canonical head chef or verified matching owner session can write. The server checks every field and alias, author, immutable section, revision and archive shape. Hard deletion is refused. A stale save fails without replacing another chef device's change.

The design initially proposed one document per section. Per-item records allow complete server validation, independent revision checks and bounded pagination. The trade-off is one document read per item rather than one per section.

## Reads and freshness

Records stay in memory for the current kitchen/device/person. There is no persistent private browser cache. Reads occur on first need, explicit Refresh, a new kitchen day or reopening after 30 minutes away. Typing, filtering and normal redraws reuse the current complete data. Another device's changes appear at the next permitted refresh, not instantly.

Queries select a section and order by document ID. Staff queries also select `archived == false`. Each page requests at most 101 records, returning 100 and using the extra record only to detect a following page. Cost is the returned records plus each full page's sentinel, with at least one read for an empty query.

Staff guidance waits for the complete active section, up to 1,000 active standards. It never silently matches against a partial page. A missing page, malformed record or larger active list pauses matching and Add from the reference, with an explicit message. Management loads 100 records initially and provides explicit continuation, including archived items; search applies to loaded records. It remains usable to archive or correct items when staff guidance is incomplete. Archived accumulation does not impose a creation ceiling.

A failed staff refresh retains the last complete copy with its read time and a stale warning. Management retains previously loaded pages and labels search as limited to those items. It cannot become an empty section or a zero minimum. Reads and saves are checked against the original identity. Pending saves cannot race a refresh into replacing acknowledged data with an older cache.

## Drafts and feedback

Save is disabled for invalid or unchanged data and while awaiting acknowledgement. The normal `svButton()` / `svLine()` lifecycle gives the named result only after `W()` resolves. Errors retain the draft. Refresh compares revisions without replacing the draft; a stale editor must be reviewed before another save.

Changing items or sections does not silently discard edits. Cancel and Archive use the shared second-tap safeguard; archive confirmation belongs to that item and revision. Daily privacy locks retain the original person's draft and pending operation behind their PIN. Explicit handover follows the existing discard/unsent-work guards. Revoked head authority hides editing and prevents saving while retaining the original unfinished work.

## Backup and release

Nightly and manual backups include full current and archived standards. The isolated encrypted recovery rehearsal covers aliases, instructions, recipe links, revisions, zero and unset minima. Where the existing kitchen-PIN copy checks allow a move, standards keep their IDs and facts and start their destination revisions at 1 with the current head recorder and copy time. The source remains unchanged. Existing cleaning history blocks the entire PIN copy before any destination write until a reviewed cleaning-copy procedure is available.

The rules change is additive: a new private collection with head-only writes. Publish the reviewed rules before releasing the client that uses the collection, then verify the existing foundation and live Lock probe. No migration or production standards seeding is required. Keep publication, browser/emulator verification and actual live deployment evidence separate in the PR.

Rollback is a normal client revert. Preserve stored standards and their private access rules; an older client ignores the collection. Do not delete catalogue data or relax access to recover from a client problem.

## Verification record

The focused rules suite and full existing real-rules gate pass. Browser checks cover the real panel, matching/reference paths, all three widths, canonical roles, stale saves, escaping, read behaviour and retained work. Final pagination regressions, complete browser regression results and release status are recorded in the PR rather than inferred from source.

With the actual Barlow/Caveat fonts and the existing 14-task density fixture, the local Work / Before service choice uses one 44 px control row. Five staff rows or four chef rows are fully visible above Add at 390 by 844 px, compared with six/five when only that choice is removed. Existing work rows retain their geometry. Add and Tick remain one tap. [Measured evidence](prep-par-options/implemented-density.json). Native phone keyboard behaviour and live staff task time are not established by desktop browser checks.

## Implemented screens

These use synthetic records in the real application, with the actual Barlow/Caveat fonts. They are viewport captures; the management views are scrolled to the editor. [Recorded font, overflow, control-size and scroll checks](prep-par-options/implemented-checks.json) cover all nine views. No horizontal overflow or added control smaller than 44 px was found.

| Surface | Phone | Tablet | Laptop |
| --- | --- | --- | --- |
| Add guidance | [390 px](prep-par-options/implemented-add-390.png) | [768 px](prep-par-options/implemented-add-768.png) | [1280 px](prep-par-options/implemented-add-1280.png) |
| Before service | [390 px](prep-par-options/implemented-reference-390.png) | [768 px](prep-par-options/implemented-reference-768.png) | [1280 px](prep-par-options/implemented-reference-1280.png) |
| Management editor | [390 px](prep-par-options/implemented-management-390.png) | [768 px](prep-par-options/implemented-management-768.png) | [1280 px](prep-par-options/implemented-management-1280.png) |
