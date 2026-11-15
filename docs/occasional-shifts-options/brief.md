# Today's team: occasional shifts like Smoker stay out of the way until someone is on them

15 November 2026, Queensland. Head chef request: "can we have the option to hide some shifts like smoker in the todays team admin part if needed and then add them when needed?" Clarified: "I would like to have the option to still have the shift in the whole system, but unless I put someone on smoker it is hidden." The pain: Today's team clutter (the Smoker tick box under Add staff, the Smoker chip in a person's details). Not the roster file, not Home.

**Status: round 1 in progress.** Role-based analysis, not research with staff. [Proposal](proposal.md), [evidence packet](evidence-packet.md).

## Round 1

Five fresh agents read the proposal, the evidence packet and the baseline screenshots (source `main` at `da18bf7`).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | Most of it is built: the grid already drops an empty Smoker column. Left: one tick box (+48 px at 390 px, none at 1280 px) and a chip that adds no row. Shape 1 only, with a "+ Smoker" that opens Smoker in one tap. Settle how the roster file treats a hidden shift first: a 10:00 to 15:00 roster time overlaps a 06:00 to 11:00 Smoker. |
| Head chef | Build smaller | Real but small. Hiding the details chip makes the rare job slower (5 taps to 6) and that chip is how a sous chef adds someone. Add staff only: one admin tick per shift, "Only when someone is on it", a "+ Smoker" link in place of the box, details chips as built. Start the saved overview's timeline at the earliest planned shift. |
| Skeptic | (waiting) | |
| New starter | Build smaller | Behind "More services", a new sous chef never learns Smoker exists. "Off" already means three things. Name it: "+ Smoker" in both places; in the details it puts the person straight on Smoker (Breaks, + Smoker, picker, choose: 4 taps, not 5). Add staff pre-ticks a service: it must never be a hidden one. |
| Keeper of the book | (waiting) | |
