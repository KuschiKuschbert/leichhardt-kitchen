# Staff-first Home

9 November 2026, Queensland. The owner approved the refreshed staff-first Home and explicitly asked to implement and send it live. [Approved illustration and latest-main check](https://github.com/KuschiKuschbert/leichhardt-kitchen/blob/5e02250/docs/service-work-options/latest-main-check.md). Implemented with the existing renderer and CSS. The release pull request records CI, merge and deployed-client evidence.

Home answers the staff questions first: **what section and shift, when is my break and when do I return, who is on with me?** Kitchen work follows. Preserve Barlow, Barlow Condensed and Caveat, the pinned dark board and warm paper, current clock, logo and navigation. There is no global section/service picker.

## Contract

- `#hm-day` shows the existing personal section precedence, configured shift hours and full break window, length and return. On-break, split, completed-break, no-break, changed, unassigned, loading and failed-plan states stay distinct. Your day retains additional breaks, later shifts and save metadata.
- `#hm-with` shows scheduled coworkers by selected shift or overlapping configured shift hours, excluding the signed-in person. This is a saved plan, not a claim that somebody is physically present. Names stay visible. Without a usable personal assignment, use the full saved day and label it On today.
- The native full-team disclosure retains every saved shift, person, section and break. Staff get read-only records; chef planner links retain `teamOK()`.
- Work reminders, order cut-offs, functions, pings, minutes and Prep by section follow the personal/team group. A confirmed empty work board is hidden; loading/error information is retained.
- Reuse `tm.rec`, the existing team stamp/read, `tmNow`, `tmNextBreak`, `tmSecWords` and personal section precedence. Never use the unsaved `tmf` planner draft or a stale/failed roster as current truth. Existing paint paths update times and changed plans without a new query.
- Signed-out and Functions-only users retain their existing Home. Clock, Cleaning rollout, Guides, prep standards and their permissions retain their shipped implementations. This change creates no independent timer, stock ledger or cleaning system.

## Council and service cost

Verdict: Build smaller, implementing the already approved staff-first direction from design PR #606. Reuse its role-based council and the owner's subsequent correction and approval; this is not a new design round or research with kitchen staff. The decisive reason is keeping the staff's own shift and break legible before service work. Full-day roster remains one disclosure away, and the compact current team stays visible without a tap.

Checking the personal section, break and coworkers takes zero taps. Your day and Prep remain one tap away; work tabs and ordinary Prep actions are unchanged. No new top-bar button, work-page overlay or work-page list line is introduced. At 390 × 844, the section/break card ends around 365 px and the three example coworkers around 651 px, before the bottom navigation at 776 px. In the same synthetic Prep fixture, six complete rows remain visible before and after, with the Add region starting at 716 px. Checking section/break/coworkers requires zero taps; full-day roster remains one tap away.

## Data and rollback

No new Firestore read, listener, field, write, index, database rule or persistent private cache. Rendering uses the already-loaded saved team, configuration and current work. No production record or rollout switch is changed by release. Revert the implementation pull request to restore the previous renderer and CSS; saved data needs no rollback.

## Verification

The focused Home and supporting browser checks, source parse and whitespace checks run before publication. The new contract failed on old main; exact counts and final CI/deployed results are recorded in the release pull request. Coverage includes fixed order on busy days, coworkers by shift/overlap, manual section picks independent of a plan, break start/return boundaries, splits, later shifts, changed plans, full-roster disclosure repaint, loading/error/unset states, escaped text and restricted roles. Supporting tests cover Today's team, read budget, Cleaning navigation, clock behaviour and design patterns.

Actual runtime captures: [phone](home-staff-first/390.png), [tablet](home-staff-first/768.png), [desktop](home-staff-first/1280.png). These use synthetic Firebase records and example people/times, not a modified screenshot or private kitchen records. Baseline: main `5f604bd`; the matching previous layout is retained under ignored `tests/shots-baseline/staff-first-home` and tag `staff-first-home-baseline-2026-11-09`. Font-sensitive local captures use official files from the existing cache without disabling TLS verification. No new font or dependency is shipped.


## Desktop spacing and alignment, 9 November 2026

The owner asked to clean up and reorganise desktop Home after the staff-first release. This is a small refinement of the accepted layout: no new page, control, workflow or design system. Keep the native typography, colours, header and navigation, with section/break and visible coworkers first.

**Quick council check: simplify.** Unequal nested column widths and older forced-column/row-span rules make the cards look scattered and reserve an empty left cell when the work board is hidden. Use one equal-width desktop grid with consistent spacing. Work reminders and Prep share the next row; Coming up occupies the following quiet row. If no work reminders are present, Prep uses the available full width. Keep every section and reminder visible. The existing phone/tablet layouts below 1100 px are preserved.

Acceptance: card edges align on a busy desktop; quiet-day Prep starts at the content's left edge; upcoming content stays after current work; expanded team details and dynamic reminders reflow without overlap. Preserve section/break order, full-team disclosure, one-tap destinations and all data/read contracts. Checking staff context remains zero taps and opening full team one tap. Runtime screenshots and focused checks are recorded in this change's pull request. No renderer, data access or navigation changes are needed.


Desktop examples use the actual runtime with synthetic records and the existing fonts: [quiet day](home-staff-first/desktop-quiet.png), [busy chef day](home-staff-first/desktop-busy.png). Compare the same fixtures before cleanup: [quiet](home-staff-first/desktop-before-quiet.png), [busy](home-staff-first/desktop-before-busy.png). The smaller day heading and top spacing use the same Caveat font. Upcoming supplier and function groups share the final paper card rather than competing for separate grid positions. Clock, header, mobile and tablet layouts retain their existing styles.

The regression check records physical card alignment, quiet-day packing, visible content and reflow at 1100, 1280 and 1440 px, including expanded team detail and a function arriving after the first render. Full release and deployed-client evidence belongs to the pull request. Revert this CSS change to restore the earlier desktop arrangement; no saved data needs changing.


Local evidence: the new desktop contract failed 25 of 45 checks on the original `7586670` layout. The final expanded suite passes 63/63, including cut-offs only, functions only, paired upcoming groups and empty states. Staff-first Home (82/82), work board (58/58), staff roster (24/24) and design-pattern checks also passed. At 1280 px, quiet Prep moves from x≈718, width≈494 to x=68, width=1144; busy top/work cards share x=68/652 and width=560. Eight real-font quiet/busy staff/chef captures at 1280/1440 have no errors or overflow. Phone 390 px and tablet 768 px captures are byte-identical before and after. The header retains its existing size and controls.


## Work colour and celebration strip, 9 November 2026

The owner requested a different colour for Now and next and a celebration that spans desktop width to take less height. This is a small visual refinement of the current Home, with no new controls, data reads or workflow. Quick council check: simplify using the existing palette and available space. Staff context remains zero taps and full-team detail one tap.

Now and next uses the existing warm `--hit` surface, dark `--ink` text and orange `--small-ink` labels/urgent badges, with an orange edge. Your day retains charcoal. Secondary text, separators and focus outlines adapt to the light surface; reminders retain their words and times.

From 1100 px, the existing celebration note spans the Home content width, with its icon/title/language beside the complete explanation. No text is truncated. Six language sizing copies, cycling, reduced motion and the calendar remain unchanged. Phone/tablet celebration layout and work-page explanation dialogs retain their current arrangement.

Actual runtime example images use synthetic records and a transient Diwali test fixture: [desktop](home-staff-first/colour-celebration-desktop.png), [phone](home-staff-first/colour-celebration-phone.png), [before](home-staff-first/colour-celebration-before.png). At 1280/1440 px, this note grows from 760 to 1144 px wide and drops from 120 to 70 px tall. At 390/768 px, its dimensions remain 358×168 / 672×120. Baseline screenshots use the prior Home styles at1392565; the implementation starts from37aba0f, retaining the newer mouse-close controls.

Focused contrast, responsive and seasonal behaviour checks, plus release/live evidence, are recorded in this change's pull request. Revert the two stylesheet changes to restore the earlier presentation; no saved data changes are needed.

Local verification: the new colour/banner suite passes 117/117 and failed 21/117 on the earlier Home. Existing desktop 63/63, staff-first 82/82 and seasonal suites also pass. Checks cover all six language strings, stable uncut sizing, three desktop widths, normal/hot/focus contrast, keyboard menu access and preserved Home order. Release CI and deployed results are recorded in the pull request.


## Team and prep card colours, 9 November 2026

The owner asked for On with you and Prep by section to be colour coded differently from the rest. Both cards are used when scanning Home during the shift. Their matching pale paper previously made their purpose harder to pick out beside the newly amber work board.

**Verdict: Build (quick check).** This is a small colour refinement of two existing cards, using the native palette and fonts. On with you uses the sage `--done-tint` surface and a `--done-ink` title/inset edge; Prep by section mixes existing steel with paper and uses dark titles with a slate inset edge. Your day stays charcoal, Now and next amber and Coming up plain paper. No new card, control, navigation step or read is introduced.

The scheduled-team wording stays visible; colour is not a claim that someone is physically present or that a roster is complete. The expanded full-team list remains part of its parent card. Prep's orange and green progress bars retain their existing meaning. Body and secondary text remain dark, and Prep receives a dark keyboard focus outline with sufficient contrast against steel. Fonts, spacing, pins, targets and responsive layout are unchanged.

Checking the current team takes zero taps, expanding the full roster one tap, and opening a prep section one tap, before and after. The inset edges do not consume content width. Runtime captures and measured geometry use synthetic people and work, with the app's existing fonts, at phone, tablet and desktop sizes. Verification results are recorded below and in the release PR.

Only Home's stylesheet and documentation change. There are no JavaScript, Firestore, role, rollout, saved-data or read-budget changes. Revert the CSS change to restore the paper backgrounds; data needs no rollback.


Measured against `877e946` with synthetic records: all card rectangles, font metrics, tap targets and visible row counts stay identical at 390, 768 and 1280 px, plus enlarged phone text and the expanded team. At 390 × 844, all three example coworkers remain visible; the team card stays 358 × 262.30 px and Prep by section 358 × 180.92 px. The separate Prep fixture keeps five complete rows above Add at y=716 px, before and after. There is no horizontal overflow.

Rendered contrast is 5.20:1 for the sage heading and 6.38:1 for its secondary text; the steel heading/count is 13.01:1 and secondary text 5.50:1. Keyboard outlines are 5.20:1 on the team card and 13.01:1 on Prep. The five focused Home/layout/colour/design-pattern suites passed. These are focused visual and interaction checks, not a full accessibility audit. Final release checks belong to the PR.


[Desktop before](home-staff-first/card-colours/before-1280.png), [desktop after](home-staff-first/card-colours/after-1280.png), [phone](home-staff-first/card-colours/after-390.png), [lower phone cards](home-staff-first/card-colours/after-390-lower.png), [tablet](home-staff-first/card-colours/after-768.png) and [all measurements](home-staff-first/card-colours/measurements.json) record 91 passing capture checks. Settled full-team hover text is 13.68:1. The inherited wrap of a long section label at extra-large phone text is identical before and after, with no clipped text.
