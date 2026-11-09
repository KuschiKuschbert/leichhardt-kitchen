# Today's team: service and section beside each person

10 November 2026, Queensland. Council proposal only. No new layout has been selected and no application code is changed by this review.

## Request and decision to support

The head chef asked whether each staff member on the day could have a picker in line with their name, followed by another section picker, and asked the council to assess whether improving the whole Today's team page again makes sense and is in the kitchen's best interest. A clarification settled the row requirement: **service/shift and section pickers together beside each person**.

The decision is whether to make that focused change, redesign more of the planning page, or retain the present workflow. The review should challenge unnecessary work. The new request does not choose a new whole-page layout or authorise an automatic live release of a proposed design.

## Current behaviour

Source: `29258e6420714209616fdcd1fe3ff2c2dfec0299`, including the released C worksheet and selected-day filter. The current page already puts one section picker beside each selected person's name. Its service context comes from one global set of shift tabs. To change Ann's Dinner section while Lunch is selected, select Dinner globally, open Ann's section picker, choose the section and Save: four taps. Correcting the currently selected service takes three taps including Save. These counts exclude scrolling and typing.

Only people selected on at least one active configured service for the selected date appear in the worksheet. Someone working Dinner remains visible in the Lunch view as Not on Lunch, so that service can be added deliberately. Add staff offers the eligible full staff list. It first adds checked people and services into the local draft; one dated Save publishes the accumulated plan.

The notebook also includes a week strip, per-person break details, overlapping break spacing, Whole day review, copy-last-weekday, draft/save state, a saved current-break board and folded saved references. Direct Today's team and chef-panel Team share the same editor. The surrounding chef-panel navigation and the active break board consume phone space before the first person. Current screenshots and measured geometry are in `baseline.md` and `baseline-measurements.json` and `baseline-task-paths.json`; do not substitute old preview counts.

## People, job and proposed boundary

Head and sous chefs and permitted admin entry points set or correct a dated service plan. Actual frequency of cross-service corrections, error rates and time saved by a new arrangement have not been measured. Staff's Home and Your day consume today's saved plan and must retain their existing behaviour.

Explore visible service/shift and section controls on each selected person's row, with clear person, service and date context. A person can have different sections and breaks on Lunch, Dinner and another configured service. Merely choosing which service to inspect must not remove an existing assignment, overwrite another service or save the day automatically. Membership changes must remain explicit. The council should decide which surrounding date, people, breaks, status and Save arrangement needs improvement, if any.

## Preserved capabilities and constraints

- One selected-day roster, with unselected staff available through Add staff. Keep configured services, multi-service membership and section assignment, no-section distinct from not-working, and meal breaks and long splits.
- Keep weekly date navigation, Today, independent date drafts, read-only past days, Whole day review, selected-weekday copy and overlapping Spread them, one explicit version-protected dated Save and conflict recovery.
- Keep the published current-break board separate from draft changes. Unknown, failed, checking and confirmed-empty remain different states. Future plans must never replace today's live state.
- Preserve current canonical roles, privacy locks and same-person work recovery. No new data source, roster, listener, polling, permanent private cache or production operational write is proposed for the previews.
- Use the approved sage people surfaces, quiet paper, charcoal live board and existing action/state colours, with words and accessible controls. Do not import another palette or replace the existing top-level app navigation.

## Cost, evidence and risks

Likely implementation touches the shared team renderer and view state in `js/prep.js`, scoped rules in `css/app.css`, focused team tests and existing feature notes. It should reuse the existing dated membership and break records. A row-level service context would need memory-only state separate from membership and a defined interaction with global shift views, search, date changes and open break controls.

A native row service picker may take two taps to open and choose, compared with one global service-tab tap. The comparison must measure real controls and make this cost clear. No speed or error-reduction claim is established by the request alone. Principal risks are editing the wrong service or date, treating a view change as removal, confusing a draft with the saved break board, losing hidden-date work and crowding phone rows or Save. Exercise supported cases with fictional data; unsupported failure paths remain Not evidenced.

## Requested council work

Round 1: determine Build, Build smaller, Don't build or Your call from the current evidence. If supported, round 2 compares three structurally different credible designs with the same capabilities, considers an all-three mix explicitly, checks current colour/state contracts and realistic failure paths, and recommends one direction with its downside. This is role-based analysis, not research with actual kitchen staff. The head chef chooses the final visual direction before application changes.
