# Admin analysis, references and training

Approved direction: grouped workspace, existing infrastructure, both data relationships and staff training. No external imports or new service. The app remains plain JavaScript on GitHub Pages, Firebase 10.14.1 in the browser and firebase-admin 12.7.0 in Actions.

## What the admin can do

The six sections are Overview, Analysis, Learning, Training, Operations and Settings. Desktop uses a sidebar; phones use a labelled section picker. Existing page ids and entry links remain valid, including saved last-page choices. A first visit opens Overview. The existing Insights, Wastage and Transfers reports retain their own live date and filter controls.

Overview shows available recipe, guide and supplier infrastructure, source counts, missing data, possible duplicate entries and latest run health. Analysis shows 7, 30 or 90 completed Queensland days, excluding today. Search items, filter explicitly tagged sections, open weekday evidence and compare routine prep with matching waste. A section filter reads that range's daily contributions only on demand. Records without a section are excluded from that filter. Coverage and quality remain for the whole selected period.

Amounts are separate by source, unit and transfer direction. An empty unit means unit not set. Staff order requests are not supplier orders, prep is not consumption and waste is not a measured waste rate. Function-generated prep remains visible but is excluded from routine-prep comparisons. The latest 14 days are compared with up to 14 preceding days, with both sample lengths shown. No prediction or percentage confidence is invented.

The item list contains up to 200 groups, with 40 search matches shown at once. Truncation is labelled. Every source day remains available through Browse daily records, paged 40 at a time. Reference links open the original recipe, guide or private supplier catalogue. The daily evidence includes source document ids, quantities, section and waste reason. Original sources are not rewritten.

Learning holds admin-confirmed aliases. A recipe or supplier/item pair supplies stable identity. Existing recipe ids and supplier/item ids are explicit source references. A supplier item keeps its own identity when linked to a related recipe. Several aliases may point to the same identity; conflicting identities stay unjoined. A spelling coincidence alone never joins different sources. The editor refuses duplicate aliases and requires a recipe or complete supplier/item pair. Supplier units and conversions are never inferred.

Training contains explicit assessments and links to recipes and guides. Status is Not assessed, In training or Confirmed. Person, section or recipe, assessor and assessment day are required. Missing assessments mean Not assessed; zero ticks means no recorded activity in this period. Activity never sets competence. Person selection filters assessments and opens that person's station counts. The existing Team report is retained under Training with corrected activity labels.

## Storage and access

All paths are under `kitchens/<pin>`:

| Path | Contract |
| --- | --- |
| `references/<id>` | alias, label, recipeId, supplierId, itemId, guideId, v, at, by |
| `training/<id>` | personId, section, recipeId, guideId, status, assessorId, day, v, at, by |
| `references/<id>/hist/<v>`, `training/<id>/hist/<v>` | Exact previous records; immutable. A version update must preserve its previous value atomically. |
| `analysisDaily/<generation>_<day>` | v, day, source counts, exclusions, quality and eligible evidence entries. Derived from current sources. |
| `analysis/current`, `range-7`, `range-30`, `range-90`, `health` | Published generation, range, freshness, inventory, source counts, coverage, quality, item patterns and staff activity. |

Only the verified Google admin reads these collections. Staff, sous chefs, function-only sessions, signed-out clients, other Google accounts and unverified email accounts cannot read or write them. No private report goes into the staff-readable `summary` collection. Browser writes to derived data are restricted to creation or identical copies for kitchen PIN migration. Normal publications are server-written. All editable browser records use the existing `W()` writer and pending-write tracking. Conflicting revisions fail and preserve the form. A failed save never displays success.

Private data and drafts stay in module memory, are guarded by the current access context and are discarded on hand-over. Existing unload, update, sign-out and unsaved-change controls include the new forms. The admin module loads only when a new workspace page opens. Staff page entry adds no analysis reads.

Manual backup, nightly encrypted backup and kitchen PIN migration include all new collections and reference/training histories. Existing backup retention remains unchanged. Do not commit backup files, private catalogues, identifying data or production evidence. Public workflow logs print counts only.

## Nightly processing

The existing Nightly learning workflow runs `nightly-analysis.mjs` after learning, even if the preceding learning step fails. Existing `learned` and `ordlearned` totals and staff suggestions remain compatible. New analysis runs in comparison mode (`comparisonOnly: true`) until production evidence supports changing staff ranking. Evidence-based prep review is available to the admin now, without automatic quantity changes or orders.

The analysis job rereads up to 90 completed days of prep, staff orders, waste and transfers, plus dated supplier order snapshots, delivery receipts and functions. It inventories supplier items, current recipe assets and guides. Practice, removed and rolled copies are excluded. Confirmed functions are counted separately. Sources and aliases are re-read on each run, so late corrections and mapping changes are incorporated without duplicate increments.

The source read budget is 15,000 per run, including empty-query charges. The job fails instead of publishing truncated source coverage. Individual daily documents and range summaries are limited to 700 KB. Daily writes use batches of eight to stay below Firestore's request limit. Random generation ids separate retries. All daily reads and calculations must succeed before contribution writes begin. The three range summaries and current pointer publish atomically. Partial generation writes never become current. The last good generation remains readable when any stage fails; health is recorded separately.

Maintenance examines at most 400 daily document ids per run and removes generations older than the published generation and its predecessor. Maintenance failure marks cleanup pending while retaining the successful publication. This is at most 400 extra document reads beyond the source budget. Manual backup and PIN migration can cost more because they intentionally copy all stored evidence.

Anonymous suggestion feedback keeps shown phone-days, taken and dismissed counters and adds edited (`e`) for an applied order quantity changed before Add. The usage summary rebuilds the last seven days from retained phone records, so delayed submissions are incorporated without duplicate counts. Edited appears in the existing Smart features table when present. Counts contain no typed text, staff names or screen recordings. This does not measure causal recommendation quality.

## Verification and release

Run the normal browser suite with `CHROME=/usr/bin/chromium npm --prefix tests test`; rules with `npm --prefix tests/rules test`; and `scripts/analysis-check.mjs` on the Firestore emulator alongside the existing nightly-learning checks. CI includes the new checks. The browser tests cover 390, 768 and 1280 px, references, revision history, explicit training, failed saves, sign-out and staff read isolation. Core checks cover aliases, ambiguous joins, prototype-shaped names, excluded records and incompatible units.

Release additive rules from the feature branch with Publish rules before merging client code. Then require green PR checks, run the pre-merge check, squash merge and verify Pages and live click tests. Run Nightly learning once and confirm the first published analysis in the verified admin session. Existing staff suggestions need no migration. Roll back client defects through a revert PR; preserve records and private access rules. Data already written is not rolled back by reverting code.

## Progress

Implementation is present on `feat/admin-intelligence`. Core and new emulator checks have passed. Existing rules checks have passed. The full browser run and final release checks are in progress. Production data has not been read or modified by this workspace. No claim about actual kitchen data quality or suggestion improvement is made until the first production analysis is inspected.
