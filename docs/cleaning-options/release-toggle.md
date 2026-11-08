# Prepare Cleaning before turning it on

8 November 2026. The head chef requested an admin switch to turn Cleaning on after setup. This refines the approved daily list and chef week view; it adds no new service-page layout.

## Using it

Open **Admin → Kitchen → Overview → Pages staff see**. **Set up cleaning** opens the existing workspace. Head and sous chefs can prepare tasks and repeat days while Cleaning is off. When ready, tick **Turn on Cleaning for the team** and press the existing **Save** button. The switch starts off, including when it has never been saved.

Switching it off hides Cleaning from staff, leads and view-only accounts and closes an open staff view. A direct link explains that it is not open yet. Existing tasks and completion records remain. Head and sous chefs retain the real workspace, including their current permissions; this is not a sandbox or a reset of the schedule's effective dates. Guides stays in the chef-hat menu under its own existing visibility setting.

Only the verified owner admin can change the switch. A head PIN without the admin grant or a sous chef can prepare Cleaning but cannot publish it. Functions-only and Google-only accounts keep their existing restrictions. When Cleaning is on, existing Tick permissions, dated completion rules and history boundaries still apply.

## Implementation

The flag is `config/main.staffSee.cleaning`, with only boolean `true` enabling it. The existing Pages staff see row, admin draft, stale-draft merge and Save flow carry it; the other three flags retain their previous defaults and lead access. Cleaning's setup access uses canonical `headId`/`sousIds`, never an editable role label. Normal People saves retain the saved switch, including a concurrent admin change to it.

`cleaningOK()` uses the same gate for the tab, hat, home link, loader and data bridge. A disabled direct route performs no cleaning reads or module download. Existing configuration events remove an open view and picker, invalidate its private in-memory cache and ignore late replies. The same recorder's chef draft remains protected while private settings reload after unlocking. Unsent writes remain tracked by the existing writer and device-work guard.

The rules apply the switch to task reads, completion reads and completion writes, with canonical chef setup access. Existing admin config rules protect the flag; no new bootstrap, public roster field, timer, listener or read is added. The one existing config listener carries the switch. The saved `lk.feat` hint cannot grant access without current private settings.

## Quick council check

**Verdict: Build (quick check).** An empty or unfinished schedule should not appear in the team's navigation. This uses one existing admin row and its Save flow, with an explicit route to setup. It adds no service-page control, popup or completion step. Ticking an enabled personal-phone cleaning task remains one tap; shared screens retain their worker choice. Turning the switch on is one checkbox tap and Save after opening the row. At 390 × 844, seven complete daily rows fit before and after, measured against main `014a855` with eight synthetic tasks and the app’s existing fonts. The smallest task target stays 44 × 44 px, with no horizontal overflow. The daily cleaning layout is unchanged. No additional council round or new design choice is needed for this requested extension of the approved design.

The checkbox changes the draft immediately; Save shows Saving, then Saved only after acknowledgement. A failure retains the draft and offers Try again in the same place. Reversing the switch is another saved choice and never deletes cleaning records. The setup link opens the existing page, with normal Back navigation.

## Verification and release

Eight related browser suites passed, including the new release-switch coverage: default-off, every role, setup before release, admin Save/failure/concurrent changes, live disable/re-enable, late read cancellation, pending writes and unchanged cleaning workflows. Read-budget, settings, control-feedback, save-states, six device/session recovery suites and design-pattern checks also passed. Shared-device passed on isolated retry after one 04:00 reload-timing error. After merging the cooling-timer feature to resolve a documentation conflict, Cleaning toggle/navigation, Cooling access, read-budget and page settings passed together. The full merged real-emulator suite passed all 17 files, including 652 Cleaning checks and the 235-row client matrix (2,115 calls across nine sign-ins). These are local stand-in and emulator results, not a claim that the stricter rules are live. The PR tracks full required CI.

[Phone admin screenshot](release-toggle/admin-390.png), [wide admin screenshot](release-toggle/admin-1280.png) and [before/after measurements](release-toggle/measurements.json) use synthetic people and tasks. Both admin widths retain the existing fonts and 44 px checkbox rows with no horizontal overflow; the unsaved switch is off.

These rules are **stricter for existing cleaning reads and completion writes**. Release the compatible client first. The existing Publish rules workflow runs after its successful main-branch Pages deployment, then verifies the foundation and runs the live Lock probe. Do not publish these stricter rules ahead of the client. No production flag is enabled by the release, and no records are seeded, rewritten or removed.

Keep the stricter rules and saved flag if correcting or reverting the client. A compatible client must continue to honour default-off and allow chef setup. Do not revert to client-only hiding or remove the saved schedule/history.
