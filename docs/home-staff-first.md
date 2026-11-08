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
