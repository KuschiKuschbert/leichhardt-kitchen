# April Fools on Home: proposal (round 1)

17 November 2026, Queensland. Asked by the head chef: "For the 1st of April I'd like to trick everyone with a completely weird home page animation, like a hacker has hacked into the page and broken all elements. A super weird animation that also says their name on the day and completely breaks the visual design. Something dark and cruel so they think they broke something when they first log in. Hacker style, psychedelic, elements of the real design move around weird and break."

## The problem in the kitchen

Not a work problem. It is team culture: one joke, once a year, from the head chef to the whole brigade. The book already does small warm things on Home (the mascot's daily action, celebration arrivals, the varied welcome with the person's name). This is the opposite tone for one day: a short scare, then the laugh.

Who: every named person who signs in on 1 April. How often: once per person per year, a few seconds. What people do today on 1 April: nothing in the book.

## The change

On 1 April (Queensland date), the first time each person reaches Home that day after their PIN, Home plays a fake "the book is broken / hacked" animation of up to about 10 seconds. It uses the real Home's own pieces (the welcome bubble, the mascot, Your day, On with you, Prep by section, the top bar and tab bar) and says the person's name. Then it reveals the joke: the page snaps back, the mascot says "April Fools, [name]! Nothing is broken", and the person carries on.

Proposed limits, for the council to test:

- Only on 1 April, only on Home, only on the first Home view of that person's day on that device, once a year. The first-sign-in exceptions stay: unsent work, a tap waiting on a shared screen and the head chef unlocking on Admin keep their page, so no prank there.
- A tap anywhere (or Escape) skips straight to the reveal. Nothing underneath can be tapped while it plays, so no real link, tick or button fires.
- Nothing real happens: no read, no write, no ping, no saved data beyond "played this year" on the device. It never touches drafts or the prep list.
- Respects Seasonal celebrations Off, and reduced motion (a still version, then the reveal).
- No strobe: no more than three flashes in any second (WCAG 2.3.1), no full-screen red flashing.
- Threatens the book, never the person: no fake "your data was stolen", no fake police, no fake firing.

## Cost

- Reads: none. Writes: none. Rules: none. Listeners: none.
- Files: one lazy script (about 10 to 15 KB with its styles), loaded only on 1 April from Home, never in the saved shell. Offline with no copy: no prank, Home as usual.
- Tests: one click-test file (date gate, once only, skip, reduced motion, Off, no taps reach the page, page restored, no sideways scroll, no JS errors).
- Risk: a person on the line thinks the book is really broken mid-service and stops work or reloads; a cook new to Australia does not know April Fools; a low-end phone stutters; a bug leaves Home broken for real.

## Design references

Mostly not relevant: this is a one-day joke, not a work task. Duolingo (honest feedback: the reveal must say plainly that nothing was lost) and Headspace (calm, short labels a new starter understands: the reveal explains what 1 April is) apply to the reveal. Flighty's "no distracting movement" rule is deliberately broken for a few seconds on Home only, never on a work page.
