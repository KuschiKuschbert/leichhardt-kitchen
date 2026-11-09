# Visual and accessibility review

This is an independent role-based review of the isolated proposals, not research with kitchen staff. Source: `29258e6`. The app files are unchanged. The [comparison](index.html), [three-phone contact sheet](previews/comparison-phones.png) and [measurements](measurements.json) use synthetic records and the actual app in Chromium with its existing Barlow, Barlow Condensed and Caveat fonts.

## Verdict

Build smaller: one welcome on Home, with existing identity and attribution elsewhere. Do not put another name strip above the work lists or make staff dismiss a welcome.

**Visual/accessibility recommendation: C, Quiet recognition.** It gives the complete staff name a place in the existing date line and preserves the weekday and personal board. It is less expressive than A, but handles the longest supported name with enlarged text much better. A remains the strongest warm welcome for ordinary names and is a reasonable owner choice if its measured long-name cost is accepted or a compact, readable treatment is validated before release.

Scores are judgement on a 1 to 5 scale, with 5 best. They incorporate the final phone, tablet, desktop, Unicode, 40-character and enlarged-text captures.

| Design | Score | Evidence and trade-off |
| --- | ---: | --- |
| A, Named welcome | 4 | Clear and warm. For Ann, exact baseline card geometry at every captured width. A 40-character name with the existing 125% text setting moves the team card below the fold and leaves only one complete coworker visible. |
| B, On your board | 3.5 | Groups identity with the shift and retains Your day as a small label. Saves only about 9 px by the end of the team card on a standard phone. A long enlarged name still leaves only one complete coworker visible and makes the board header much larger. |
| C, Quiet recognition | 4.5 | Names the person without competing with the work. Same normal-name geometry as current Home. All three coworkers remain visible in the 40-character enlarged-text case, though the full-team link needs scrolling. Less noticeable as a welcome. |

## Measurements

390 × 844, three fictional coworkers. The fixed tab bar begins at 776 px for normal text. Full-team visibility means its entire disclosure control is above the tab bar, not merely that it exists in the DOM.

| Case | Current | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Standard name, team card bottom | 650.80 px | 650.80 px | 641.69 px | 650.80 px |
| Standard name, complete coworkers | 3 | 3 | 3 | 3 |
| Standard name, full-team control visible | Yes | Yes | Yes | Yes |
| 40-character name, complete coworkers | Not separately captured | 3 | 3 | 3 |
| Ann at enlarged text, complete coworkers | 3 | 3 | 3 | 3 |
| 40-character name at enlarged text, complete coworkers | 3 | 1 | 1 | 3 |
| 40-character name at enlarged text, full-team control visible | Yes | No | No | No |
| Any captured horizontal overflow | No | No | No | No |

All 26 app captures have no recorded browser errors. Each normal-name baseline/option capture at 390, 768 and 1280 also exercised opening the full-team disclosure in one tap. The long and enlarged-text captures measured visibility only; they did not repeat the disclosure click. Seeing one's section and break adds no interaction in any proposal. Work pages are unchanged, so this preview does not claim a new work-list row-count result.

The long synthetic display name is exactly 40 characters: Alexandria Catherine Montgomery-Smythe J. It stays whole. The Devanagari example is अदिति शर्मा. The existing hat still renders its question-mark fallback for that name; this is an existing identity issue, not an effect introduced by the preview.

## Contracts and references

All designs preserve the approved charcoal personal board, sage team card, steel Prep card, warm paper, native icons and current navigation. They reuse the existing heading/date/board space. No state colour, completion claim, access rule, data read or save flow is introduced. Existing action and loading feedback are unchanged. Contrast and screen-reader behaviour have not been comprehensively tested by these captures; do not call this a full accessibility pass.

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: familiar frame and stable actions | Works, except long names add substantial height | Needs work, board hierarchy changes for modest space benefit | Works, existing hierarchy preserved |
| Airbnb: person, shift and next action together | Works, name directly above shift | Works, name and shift share the board | Works, small name immediately before personal context |
| Flighty and Things 3: now before later | Needs work in long enlarged case | Needs work in long enlarged case | Works best in the measured edge case |
| Headspace: calm and clear language | Works, strongest welcome | Works, but more heading content inside the work board | Works, intentionally understated |
| Todoist and Duolingo: defaults and truthful feedback | Not changed by this presentation | Not changed by this presentation | Not changed by this presentation |

These are constrained alternatives for one heading area. A and C differ in hierarchy and placement, but not in task flow or navigation. Creating different flows simply to make the options look more different would add unnecessary service friction. B tests a different grouping by bringing the greeting into the personal board and collapsing the outer header. None requires a new popup, tab or button.

An all-three mix was considered: A's prominent welcome, B's board grouping and C's quiet identity would duplicate the name or expand the board without another useful task. Do not combine all three. Keep one welcome, preserve the section and break, and reuse the existing menu identity across other pages. A compact full-name treatment would be a new refinement needing its own measured preview, not an automatically approved blend.

## Break-it findings and limits

- **Checked in synthetic Chromium:** all 40 characters remain visible, Unicode text renders, and there is no horizontal overflow. Enlarged text remains at the user's selected 125%; no name is clipped or silently reduced in size.
- **Reproduced in preview:** A and B substantially reduce the visible coworker list for a 40-character name with enlarged text. C keeps three complete coworkers but pushes the full-team link just below the initial viewport. The remedy is choosing C or validating a readable compact full-name treatment, not shortening someone's name without consent.
- **Risk / not evidenced here:** roster rename propagation, switching staff, shared-device identity, daily lock, missing names, role restrictions and failed reads require implementation checks. A greeting must not read a remembered Google name, survive sign-out as stale identity or imply a shift exists when the team plan has not loaded.

The captured app has Firebase stand-ins and no production record access. These are transient DOM proposals, not implemented rendering or session code. Gallery checks cover local assets, size-switch controls and phone reflow only. No emulator, production, real-device, screen-reader or save/recovery verification is claimed.
