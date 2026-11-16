# Proposal: a louder Too few warning on Today's team, and OK short for the day

16 November 2026, Queensland. Round 1 proposal for the service council. No code yet.

## The head chef's words

- "When there is less than the minimum members on during shift for certain periods, I wanna be able to warn myself or skip and approve or something."
- Asked what he wants when the plan is short, he chose **OK it for the day**, and wrote: "maybe add live warning before I save like a red bar or something until the problem is resolved? what do other fancy apps do for a warning?"
- Who may OK a short busy time: **head chef and sous chefs**.
- Not chosen: a question at Save ("Save anyway?") and a ping before the busy time.

## The problem in the kitchen

The Too few warning was built yesterday (15 Nov 2026, #713, `docs/team-minimum-options/brief.md`). The head chef sets a busy time and People needed then on each shift (Admin, Kitchen, Shifts). Today's team then shows one line in its Save dock when the plan leaves too few on that shift and not on a break, and marks "break when too few" beside each person away then.

Three gaps:

1. **It is quiet.** One 13 px line in the Save dock: the first words bold orange (`--small-ink`, 5.27:1), the rest in ink. It reads like the dock's other status words. The head chef asks for something louder "until the problem is resolved".
2. **It cannot be accepted.** On a quiet night the head chef may plan short on purpose. Today the line and the marks stay until the busy time is over, on every phone that opens the page, all day. A warning that cannot be answered gets ignored, including on the day it matters.
3. **Nobody can tell seen from missed.** A sous chef opening the page cannot tell whether the head chef saw the short time and accepted it, or never noticed.

**Who has it:** the head chef and the sous chefs, when they plan Today's team (the admin's Team room, `#/admin`, and `#/team`). **How often:** not evidenced. The warning is one day old. It shows only when a busy time is set, and this study cannot see whether the head chef has set one in the real book.

## What people do today

Read the line, move a marked break or add someone, Save. If the short is on purpose, there is nothing to do: the line stays.

## The change

1. **A louder live warning while the plan is too few.** The existing dock line becomes a clear bar that changes as the plan is edited (it already recounts on every edit and every minute), and goes when the plan has enough. The head chef suggested red. The colour contract says red is for failure, invalid input and destructive or explicitly adverse states; amber/orange is attention. Which one fits is a question for the council and, if it departs from the contract, for the head chef.
2. **OK short, for that busy time, that day.** A head chef or sous chef taps OK on the warning. The book saves with the day's plan who OK'd which short time and when. The loud warning steps back to one quiet line ("Too few 18:30 to 19:00, OK'd by Sam K at 14:05") and the "break when too few" marks go, on every phone. If the plan later gets worse than what was OK'd (fewer people, or a longer or new short time), the OK no longer covers it and the warning comes back.
3. **Who:** the head chef, the sous chefs (own PIN) and the verified admin: the people who can already save Today's team.

## Cost

- **Reads:** none new. `team/<day>` is already read by the page; the busy time is already in `config/main`.
- **Listeners and timers:** none new. The warning repaints on the existing minute, focus and clock paint (`tmShortPaint()` from `tmAwayPaint()`).
- **Writes:** one new optional field on `team/<day>` (for example `ok: [{ sh, from, to, n, low, by, at }]`), sent with the existing versioned Save (or its own write: a design question).
- **Rules:** `teamOk()` allows only `day, on, br, v, at, upd, by` today. A new field is a looser rule: publish before the client. Rules emulator checks for size, shape and who may write it.
- **Files:** `js/prep.js`, `css/app.css`, `firestore.rules`, `tests/team-minimum.test.js`, `tests/rules/`, `docs/design-patterns.md` and its test, `README.md`, `docs/head-chef-decisions.md`.
- **Risk:** an older phone's Save rewrites the whole `team/<day>` record and would drop an OK it does not know (the warning comes back: fails loud, not silent). A louder bar costs room in the dock on a 390 px phone, where today 1 full person row shows in the working screen.

## Design references to test

- **Flighty:** a true status from data already on the phone, changing live, with real times.
- **Duolingo:** a bottom feedback bar that answers each change at once, and an honest next step.
- **Linear:** one place for the message; consistent action placement.
- **Airbnb:** what is wrong, when, and the next action together.
- **Headspace:** calm, plain words, one name for each thing.
- **Todoist:** nothing accepted or changed by itself.
- Outside the seven, for the head chef's question: rostering apps usually colour a coverage strip on the day's timeline where it is under-staffed and ask for an acknowledgement before publishing a roster with warnings; GitHub's merge box shows a coloured status at the action with an explicit bypass; Gmail asks once at Send when something looks missed. The head chef did not choose the ask-at-Save option.
