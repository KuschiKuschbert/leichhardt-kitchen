# Head-chef prep standards: clarified proposal

8 November 2026, following the user's clarification. Design work only. This replaces the assumption that pars are primarily an optional catalogue inside Add or a Kitchen subpage.

The user wants the head chef to set the section's permanent prep items and minimums in a separate area/room in the head-chef, admin and sous-chef panels. A normal typed prep entry that matches a section item should show its minimum. Staff must also be able to see everything they need to check before service, including items absent from today's tasks. The operational goal is explicit standards that do not depend on staff remembering unwritten expectations. No individual staff identity or judgement is part of this proposal.

Fixed requirements from the user:
- A separate **Prep** room in the existing owner/head/sous panel shell. Head chef sets items, units, minimums and recognised aliases; owner access still requires the existing head identity/grant. Sous chefs can see the same standards and service-check view. Sous target editing is not implied.
- A permanent section checklist, using stable section and prep-item IDs. A daily task, recipe yield and learned usual amount are different records.
- Smart guidance in ordinary typed prep. A unique exact name or head-approved alias in the selected section can reveal **Minimum ready before service: [quantity unit]**, alongside the item's canonical name. Suggestions for typos/partial names need explicit selection. Ambiguous, missing and unavailable data are distinct; the app does not pick the first match.
- A complete **Before service** section list, with each item, minimum and optional head-chef instructions/recipe link. Staff can see it whether or not the item was requested or ticked today.

Design interpretation: minimum means usable quantity that should be ready before service, not the smallest batch to make. The quantity to make remains the person's entry. An optional physical count can calculate a shortfall, but showing the chef's minimum never requires a count. No mandatory stocktake, inferred stock, automatic quantity replacement or automatic replenishment is proposed.

Proposed check controls distinguish Not checked, Minimum met and Needs prep. These are an explicit service check, separate from completing a prep task. A saved state must name the checker/time and be scoped to the date, configured service/shift, section and standard version. It must not imply perpetual stock readiness or competence. Until those records are implemented, previews only demonstrate local sample states. Existing Tick can be the proposed authority to record a check, Add still governs creating prep; final rules must expressly cover the new records.

Three revised layouts share those fixed requirements:
- **A, Smart Add plus a checklist:** the minimum appears beneath the typed-name field in the existing Add form; staff open Before service from a deliberate page-level entry. Daily work rows remain as they are.
- **B, Minimums beside work:** the same matching and full checklist, plus a persistent minimum line on each linked task. More visible after adding, at a density/read cost.
- **C, Section check first:** the Prep page retains Work and adds a Before service mode under the section choice; the full checklist has minimums and short instructions. Ordinary typed Add still shows matches, and Work remains the initial service view so Add/tick stay direct.

Round 1 should assess this clarified proposal. The user has explicitly requested the management room and smart matching, so the review should advise on cost/clarity, not treat the earlier Kitchen placement as selected. The earlier round's scores do not apply automatically. No app implementation is authorised in this design task.

Evidence already captured from main `20c9472`: `previews/current-ann-390.png`, `previews/current-add-390.png`, `previews/current-chef-1280.png`, `baseline.json`. Same synthetic six-task fixture, 390 x 844, fallback fonts: five staff service rows, four sous-chef rows fully above Add. Current Add access and tick each need one tap. Initial B-style inline minimum prototype (`a-ann-390.png`) reduces that to three staff and three chef rows; this is an initial comparison, not a measurement of the refined layout.

Costs to assess: new catalogue identity and protected editor, explicit name/alias matching, minimum hint in Add, complete service-check view and optionally persisted checks. One section document read when a section's matching/checklist is first needed, reused in the permitted session cache; typing matches in memory, not one query per keystroke. No new polling or listener. B needs targets for all displayed sections and risks row reflow. Panel room and service mode must use existing responsive navigation patterns. Future code/rules/tests would cover identities, duplicate merging, section switches, alias ambiguity, missing records, roles, fresh checks, stale revisions and offline/lock/handover. No source files are being changed now.

Service rules: keep the main job one tap from its work tab; no automatic overlay over a service list; measure any added height/taps; use 44 px controls, existing notebook colours and named feedback. All mock values are labelled examples, never approved kitchen quantities.
