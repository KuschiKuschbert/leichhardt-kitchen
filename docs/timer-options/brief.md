# Kitchen timer

## Request and implementation

8 November 2026: the head chef asked for a little clock icon in the normal app style that starts a timer they can set. That directly authorises the timer and its clock button. The request did not select a lettered design.

The implementation uses A's existing sheet pattern, clear Minutes and Seconds fields, and B's large countdown once running. This is the session's implementation choice within the request, not a recorded user choice of A. It keeps one timer on this device, with Start, Pause, Resume, Cancel, Start again and New timer. The clock stays the same size as the other top bar controls.

## Problem and cost

A cook can set a countdown without leaving the book, then return to Prep or a recipe while it runs. The request establishes demand; frequency of use and time saved have not been measured. A phone's own timer or a separate kitchen timer remains more dependable when a screen is locked.

The feature uses the existing app script, CSS, sheet coordination and generated alarm sound. It adds no database reads, writes, listeners, rules, server jobs, downloaded sound or dependency. A small device record holds the timer state. Main risks are crowded phone controls, background browser suspension, blocked audio and unavailable local storage.

## Council

This is role-based analysis, not research with staff.

**Verdict: Build (3 of 5).** The head chef, new starter and keeper supported a single local timer. The cook and skeptic said Build smaller: keep the header footprint, make the running state readable at a glance and consider leaving Pause/Resume out. All required honest wording about sleeping phones and a finished state that does not depend on sound.

Round 2 ranked the three concepts with 3 points for first, 2 for second and 1 for third:

| Reviewer | Ranking | Main concern |
| --- | --- | --- |
| Cook | C, A, B | Fewer fields during service; readable time; unobstructed buttons |
| Head chef | C, A, B | Small utility, little to learn |
| Skeptic | C, A, B | A phone already has a timer with better background alarms |
| New starter | A, C, B | Explicit units and large numbers prevent mistakes |
| Keeper | C, A, B | Least state and validation; prove lifecycle reliability |
| Screen designer | A, C, B | Standard sheet, readable fields and a large running countdown |
| Total | C: 16, A: 14, B: 6 | |

The first three rankings were provisional: early screenshots had rendering faults, obscured actions and no timer page in B. The last three used corrected styled previews. The totals therefore compare concepts with uneven visual evidence and are not a clean usability result. The designer and new starter preferred A; the overall points favoured C. The implementation retains A's seconds for short timers and standard sheet, without adding B's route. Final layout and behaviour require the checks below.

## Designs

| Design | Benefit | Cost | Navigation | Build size | Relearning | Reads and rules |
| --- | --- | --- | --- | --- | --- | --- |
| [A: standard sheet](a-390.png) | Clear minutes and seconds; familiar controls | Two fields when seconds are needed | One sheet, same page underneath | One pull request | Low | None |
| [B: timer page](b-390.png) | Large countdown and room for controls | Leaves the working list; another route | One page, then Back | One pull request | Medium | None |
| [C: minutes picker](c-390.png) | One duration field | Cannot set a timer shorter than a minute | One sheet, same page underneath | One pull request | Low | None |

From a work page, setting a minute duration takes four taps in these concepts: clock, duration field, Start and Close or Back, plus typing. A adds one field tap when entering seconds. A prep tick remains one tap before and after; no new navigation step is added to existing list actions. The timer sheet covers part of the list only while the person has opened it.

### Layout measurements

The baseline and implementation use the local Firebase stand-in, sous chef fixture and normal text. Each viewport is 844 px high. The first row and top bar were measured in the browser. Fully visible rows are counted only when the top and bottom of the row are on screen and hit testing confirms neither is covered by a dock or clipped by a scroll container. Font-dependent widths need the app font or an explicit before/after comparison.

| Width | Top bar, before and after | First row top, before and after | Document width after | Fully visible rows |
| --- | --- | --- | --- | --- |
| 390 px | 64 px | 323 px | 390 px | 4 before, 4 after |
| 768 px | 96 px | 385.90625 px | 768 px | 6 before, 6 after |
| 1280 px | 96 px | 327.109375 px | 1280 px | 4 before, 4 after |

The header and first-row positions are unchanged, with no sideways document overflow at these widths. The timer sheet was inspected at all three widths; its controls fit, and tighter icon spacing keeps Kitchen Book readable on the phone. These checks reported no JavaScript errors.

## Behaviour and storage contract

- One timer belongs to this browser on this device, independent of staff identity. Other tabs on the same origin receive its changes through the browser's storage event. Nothing syncs to other devices.
- Enter whole minutes from 0 to 999 and whole seconds from 0 to 59, with at least one second in total. Empty fields count as zero. The default is a five-minute editable starting value, not a cooking recommendation.
- Running time comes from an end timestamp, never by subtracting one second for each callback. `LK_TIME.now()` supplies the saved deadline; its clock gap is stored too so a kitchen-clock correction does not shorten a timer already running. Pausing stores the remaining milliseconds. Navigation and reload preserve a valid saved timer.
- `lk.timer` holds version 1, a checked `running`, `paused` or `done` state, duration, remaining time, end timestamp and clock gap. It contains no names or kitchen data. Every action replaces it; Cancel and New timer remove it. Invalid records are ignored. A failed write leaves the timer in memory and shows that reloading may lose changes.
- A running clock shows a small rounded-up hours, minutes or seconds badge. Paused has a pause mark. Finished shows Done and the sheet says Timer finished until New timer or Start again.
- Expiry updates the state and announces Timer finished. It asks the existing `LK_CHIME` to play its timer sound once for that transition. There is no automatic sheet. Browser suspension, muted devices and audio restrictions can delay or prevent sound. The sheet says to keep the app open and screen awake.
- The sheet uses the existing body overlay, history handling, focus trap and sheet coordination. Close, backdrop, Escape and Back dismiss it without cancelling a running timer. Timer fields and actions are labelled for keyboard and screen-reader use; the countdown is not announced every second.
- No startup file is added. `js/app.js`, `js/prep.js`, `css/app.css` and `js/chime.js` already belong to the saved shell, so its file lists do not change.

## After the tap

There is no server acknowledgement for these local actions. The visible response is immediate; a storage failure is reported separately and never presented as a successful durable save.

| Action | Immediate answer and old words | Where the person remains | Failure and recovery | Reversal |
| --- | --- | --- | --- | --- |
| Clock | Opens Set a timer or the current timer | Existing page under the sheet | Other sheets keep their turn | Close returns to the clock |
| Start / Start again | Timer running and the countdown replace the fields or finished state | Same sheet | Invalid input stays with its error; storage failure says to keep this page open | Pause or Cancel timer |
| Pause / Resume | Timer paused or Timer running; button changes to the opposite action | Same sheet | Storage warning stays visible when the device cannot keep the change | The opposite button |
| Cancel / New timer | Set a timer and the previous duration return; timer state is cleared | Same sheet, minutes field | A storage failure says a reload may lose changes | Start creates a new countdown; elapsed time is not restored |
| Close / backdrop / Escape / Back | Sheet closes; clock keeps the current state | Same page and clock | No saved timer change | Open the clock again |

## Verification and release

`tests/kitchen-timer.test.js` covers the timer lifecycle and controls. `tests/design-patterns.test.js` registers the added UI names. The design-pattern check passes: 130 classes, 19 colour and type tokens, 43 helpers, and no duplicate top-level names in 57 scripts. All 72 focused timer checks pass, including validation, pause/reload/resume, navigation, delayed callbacks, a single completion sound, cross-tab cancellation, storage failure, keyboard focus, clock corrections and a short phone screen. Existing screen, clock, ping-sound, read-budget, chef-menu and navigation checks pass. The final narrow-phone regression run also passes, including the existing Today's team checks at 360 and 375 px. Pull request checks are pending; this has not been released. The original previews are design evidence. [Implemented setup](implemented-390.png), [running timer](running-390.png), and [before](before-390.png)/[after](after-390.png) captures come from the local Firebase stand-in.

## Rollback

Revert this pull request. No rules, server records or migration need reversing. Older app code ignores `lk.timer`; leaving that local record does not affect other work. Do not reset saved-shell generation metadata when reverting the existing app files.
