# What the proposed mix looks like

9 November 2026. The owner asked to see the design after the mix council. This renders **M1, A daily work with B's setup editor**, for review. It does not record a chosen layout or change the application. The council still recommends plain A for the first build.

[Visual overview](previews/mix-presentation.png) · [Interactive preview](mix.html) · [All screens](mix-presentation.html) · [Single-file download](cleaning-mix.html) · [Council advice](mix-council.md).

## Screen behaviour

**Today:** the existing notebook style and five folds. General cleaning stays first, followed by Hot larder, Grill, Pans and Final floor clean. Every group has a remaining count. Cross-kitchen blocked and Pass-check links stay above the list. Opening a group reveals at most six ordered tasks; task checks remain inline.

**Week:** the same groups with Monday-to-Sunday day selection. There is no C-style matrix. Future groups are labelled with tasks due, not today's recorded completions. The header explicitly labels the separate progress count as today.

**Repeat tasks:** replaces daily content. Search and Add sit above a five-group selector. At 1000 px and wider, a short task list sits beside exactly one selected editor. Below that width, the selected editor opens directly in the list. It does not use B's phone group grid or separate task-page navigation. Search spans all 51 templates, including jobs outside the selected group.

Only the placement of the existing editor is illustrated. The real responsible-section picker, recurrence, complete check editor, Pass-checker mapping, confirmed saves and recovery still belong to the existing application contract. The sketch's text, area, responsibility guidance and method fields keep example edits in memory across selection, mode changes and resizing. They do not save a kitchen record or establish real device/session recovery.

## Verification

75 local prototype assertions pass at 390, 768 and 1280 px, with native fonts. They verify A groups and shared-work order, A-style Week, future due labels, inline checks, one editor, desktop/inline resizing, example draft retention, disabled unchanged Save, cross-group search and selection, a fully visible Add button, new-task form, no horizontal page overflow and no JavaScript errors. [Measured states](previews/mix-measurements.json).

At 390 by 844, Today shows five complete group summaries and no task rows before opening a group. Week shows four complete group summaries after its date controls. Repeat tasks shows three complete task rows before its selected inline editor. At 1280 px, Repeat tasks shows five task rows beside one editor. The full Repeat tasks document is 1,640 px high on phone and 1,085 px on desktop, including the synthetic shell. These are schematic dimensions, not actual-app density or speed guarantees.

An independent read-only review checked the actual screenshots and source against M1. It identified a clipped phone Add control and search-selection pagination that could hide the selected inline editor. Both were corrected and covered by the final checks. The original A/B/C checks were rerun after the shared preview changes: all 117 pass. Both generated downloads were exercised over local HTTP with no additional network requests or JavaScript errors.

This verification does not cover real Firestore writes, concurrent devices, offline uncertainty, authentication recovery, full keyboard/screen-reader behaviour or contrast conformance. No app runtime file, permissions, database query, saved record, release switch or operational programme changed.

## Files

`mix.html` uses the existing `preview.js` and `preview.css` under an explicit M1 flag; the original three alternatives retain their layouts. `mix-presentation.html` assembles the captured screens. `cleaning-mix.html` is the generated self-contained version. `previews/mix-*.png` and `mix-measurements.json` hold the local evidence. These are documentation assets, never application dependencies.
