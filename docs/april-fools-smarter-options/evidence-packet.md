# Evidence packet: April Fools that people cannot see coming

Source commit `9ff257b` (main, 18 November 2026). Synthetic people only (`tests/fake/`). No real staff, PIN or kitchen data. The earlier study's packet still applies: `docs/april-fools-options/evidence-packet.md`.

## April Fools as built (`docs/april-fools.md`, Contract)

- **When:** 1 April (kitchen day, Queensland, from the 04:00 PIN day, all day), each named person's first Home view that day. Everyone who signs in, on their own phone or the shared display (head chef, 17 Nov 2026). Once per person a year on any device: when it starts, the server keeps `fools/<YYYY-04-01>_<staff id>` = `{ day, at, by }`; another device that day plays nothing and the mascot's bubble says "Got you, Ann."
- **Which:** `deal()` from the staff list: each person's place from a hash of their staff id, joke = place + 5 a year out of 24. Nobody shares a joke while the team is 24 or fewer; nobody gets last year's design.
- **How:** a copy of `#app` in a fixed layer on `document.body`; the real `#app` only hidden by a CSS animation with no fill (65 s), so a stopped script cannot leave Home dead. 35 seconds, then the mascot owns up: "April Fools, Ann! A joke for 1 April. You did nothing wrong, and nothing is broken. Your prep list, orders and recipes are all safe." Back to my day.
- **Taps** break the tapped piece a little more; **press and hold** 1.2 s or Escape ends it; "Press and hold to stop" after three taps or about 9 s.
- **Not:** celebrations Off on that device (nothing). Reduced motion or Still: the words only.
- **Waits** (nothing kept, next Home view tries again): no signal (`lkServerUp()`), unsent work (`LK_PREP.unsaved()`), a sheet open, Home not drawn. First sign-in rules keep a person on their page for unsent work or a tap waiting on a shared screen; the joke comes on their next Home view.
- **Ends:** leaving Home ends it with the reveal; a lock or sign out ends it quietly (reveal on the next Home view); a hidden screen ends it with the reveal waiting.
- **Reads:** on 1 April one read per person per device (`foolsSeen()`), one write per person (`foolsMark()`). Every other day none. No listener.
- **Rules:** `fools/{sid}` read by that person (any `YYYY-04-01_<own id>`, so last year's own record is readable) and the verified admin; created once by that person on their own PIN session; day must match `YYYY-04-01`; never changed or deleted.
- **Words:** coworkers named as watching, gone, eaten or outside, never as having done something. No real failed save, no claim of stolen details, a camera, IT or police. Red is art only.

## The earlier council and the head chef's choices (`docs/april-fools-options/brief.md`)

- Round 1 (5 of 5 Build smaller) wanted: mornings only, before the person's shift, never on a shared screen, under 10 s, a copy over Home, the reveal recovered after a reload, nothing offline or with work waiting.
- The head chef chose against the advice: 35 s, all day, the shared display too, darker words, taps that make it worse with press and hold to stop.
- Kept from the council: the copy over Home, the reveal after a reload, no coworker blamed, no fake failed save, no claim of a real breach, "You did nothing wrong."
- Rejected in round 2: a fake book update (B2 became the mascot taking over) "so real updates stay trusted".

## Other current contracts that apply

- **Service rules** (head chef, 5 Nov 2026): the main job of each work page is one tap from its tab; no new pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; added taps or lost lines must be justified.
- **First sign-in of the day** (`docs/home-staff-first.md`): the first PIN of a person's day (from 04:00) opens Home, unless unsent work, a tap waiting on a shared screen, a Functions-only account, the head chef on Admin or a new starter's first PIN on Prep. Later PINs that day go back to the person's last page.
- **Your day on Home** (`docs/home-staff-first.md`): Home shows the person's section, shift hours and break window from Today's team (`tm.rec`, read once a day and kept with the day's cache; `tmNextBreak()` gives the next break). Typical day: Lunch 10:00 to 15:00, Dinner 15:00 to 21:00, a two-hour break between for doubles. Service rush: about 12:00 to 14:00 and 18:00 to 20:30 (not measured; from the team plan's busy-time setting, `docs/team-minimum-options/brief.md`).
- **The mascot** (`docs/kitchen-mascot.md`): his speech bubble is the page heading `#rtitle` (read by a screen reader, focus target). He says the named welcome.
- **Action feedback** (`docs/action-feedback.md`): every tap answers in words; a failure is red, stays and keeps the work.
- **Reads** (`CLAUDE.md`): free plan stops at 50,000 reads a day; every read says when it runs and what it costs; no reads in a loop; no new listeners or polling.
- **One clock** (`CLAUDE.md`): today's date and hours use `dayNow()` and `T.*` (Queensland).
- **Writing style:** Australian English, no em dashes, plain short sentences, 24-hour time.
- **Accessibility:** WCAG 2.2 AA; 2.2.2 Pause, Stop, Hide (motion over 5 s needs a way to stop it); 2.3.1 Three Flashes.

## Measurements (Implemented app, from the merged click test)

- On 1 April as built: Home's main jobs (see your section and break: 0 taps; open Prep: 1 tap) wait up to 35 s once a year per person, or 1 press and hold to stop, then 1 tap to close the reveal. Every other Home view and day: unchanged. Lines on a 390 px phone: unchanged once it ends.
- Reads on 1 April: about one per person per device (20 people, 1 to 2 devices each: about 20 to 40 reads). Budget: 50,000 a day.
- `tests/april-fools.test.js`: 54 checks pass (1 April 2027 faked).
- Not measured: how many staff return a year later; how people react to the first joke (it has not played).
