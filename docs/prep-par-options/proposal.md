# Section prep pars: proposal for design review

8 November 2026. Design exploration only, based on main `20c9472`. Nothing is chosen or implemented. All pictures use synthetic test data, not approved kitchen quantities.

The requested problem is that staff need a target for every individual prep item in their section and a clear amount to prepare. How often the kitchen runs short, how targets are kept today and the number of items per section have not been observed. Existing daily prep lines describe work requested, with text, a section, a free-text amount, recipe link, completion and attribution. They do not represent a complete section catalogue or a current stock balance.

Current evidence:
- `AGENTS.md` delegates to `CLAUDE.md`. Its service rules require one-tap access to add/tick, no new navigation or service overlays without a design choice, and measured density costs.
- `js/prep.js` uses text-based matching across sections. `openTwin()` and `mergeDups()` may combine matching work and retain other sections in `also`. `onList()` includes completed lines. Neither behaviour proves a section has enough stock.
- `usualQty()` derives frequently entered quantities from learned history. This is a suggestion, not an approved target and not stock on hand. Recipe yields are also not section pars.
- Supplier items already have pars, confirmed units and optional current-run counts. Their catalogue is private and chef-only. Prep must not reuse that data as prepared stock or expose it to staff.
- The new `#/chef` panel has a Kitchen room, but current reference/settings access remains restricted. A prep-par editor there would need an explicit new role contract.

Proposed scope to assess: a stable per-section prep-item catalogue with an optional recipe link, an explicitly set non-negative target and confirmed unit; staff can read targets and optionally enter a physical count to calculate `max(target - counted amount, 0)`. Show unknown when the count or target is missing. Each count is a draft for this preparation session, not a live inventory balance. Existing outstanding prep must be shown and reviewed before adding more, without automatically subtracting it from stock. Standard add, tick, Urgent and On it stay available. No automatic replenishment, invented target, daily demand forecasting, cross-unit guessing or new service tab is proposed.

Targets must cover configured items absent from today's list too. Item identity must survive renaming, work across non-recipe prep, and distinguish section-specific targets. A shared batch across sections needs deliberate allocation. Start with owner/head-chef target editing and staff read/count/add according to their current capabilities, subject to a final role decision; do not grant sous-chef target editing implicitly.

Potential cost: a new private target catalogue and permissions, a bounded read on opening the section catalogue with explicit refresh, normal existing work writes through W(), and no new listeners or polling. Counts can stay in the current draft to avoid a new stock-history system. Later implementation would touch prep rendering and identity/duplicate logic, amount validation, rules and fake rules, role/read-budget/offline/duplicate/accessible-layout checks, backup coverage and feature notes. A shared pure calculation belongs in the existing amounts module. Exact schema, read limits, migration and release sequence remain design work.

Baseline captured from the current application with tests/lib.js and synthetic Firebase. Phone 390 x 844, default font stand-in (fallback fonts), top of list, no scroll: staff 5 fully visible prep rows, sous chef 4 above Add a line. Different data/fonts give different counts; these are not the separate 14-item real-font regression's 6/5 claim. Add editor opens in 1 tap; existing visible tick takes 1 tap. An ordinary typed add takes 2 action taps (open, Add), excluding keyboard input and optional field choices.

Screenshots: `previews/current-ann-390.png`, `previews/current-sam-390.png`, `previews/current-add-390.png`, `previews/current-chef-1280.png`. Raw geometry: `baseline.json`.

Council is independent role-based analysis, not staff research. Round 1 should judge whether to Build, Build smaller, Don't build or leave a real trade-off as Your call. Round 2 will compare three layouts, following the user's request. No live changes are authorised by this design review.
