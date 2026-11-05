---
name: service-council
description: The Kitchen Book's critical council for major decisions. Use before building a new page, tab, button, setting, sheet or workflow, before changing how a service task is done (Prep, Orders, Wastage, Transfers, the recipe card on the line), before removing or merging a feature, and for every design choice. Round 1 asks whether it is needed and adds real value while keeping the book quick to read with few taps in a busy service; round 2 draws three different designs and recommends one or a mix. Not for bug fixes, tests, docs or CI.
---

# Service council

Head chef decision, 5 November 2026 (`docs/head-chef-decisions.md`). The council advises and the head chef decides. Before building anything major, show the head chef the council's verdict in plain words. Before building a design, show the three designs and the recommendation. This is not the recipe council (`kitchen-council`), and a whole-app audit uses `docs/whole-app-audit.md` section 5 instead.

## When it runs

| The change | What runs |
| --- | --- |
| **Major:** a new page, tab, bar button, setting, sheet, pop-up or workflow; a change to how a service task is done; removing or merging a feature; anything the head chef must choose | Round 1. Then round 2 if the verdict is Build or Build smaller and people will see the change |
| **Small:** a change on an existing page that adds no tab, bar button, pop-up or step | Quick check: the session answers the round 1 questions itself, measures taps and lines, and writes the Council section. No extra agents |
| **None:** a bug fix, test fix, docs, CI, a rules change with no new screen | `Verdict: Not needed (bug fix)` in the pull request, with the reason in brackets |

When unsure, it is major. Run each round once per decision, not once per push. Reuse round 1 if the proposal has not changed.

## The service rules

Every proposal and every design is checked against these (head chef, 5 November 2026; also in `CLAUDE.md`):

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

Count, do not guess: the taps for the main task, and the list lines visible on a 390 px phone, before and after. Measure them in the click-test stand-in (`tests/`, `tests/fake/`) or a preview, and say how.

## Round 1: should we build it?

1. **Write the proposal first, no code.** One page: the problem in the kitchen, who has it, how often, what people do today, the change, and its cost (reads, files, tests, risk). Add screenshots of today's page at 390 px (1280 px for admin pages).
2. **Run the five reviewers at the same time**: five Agent calls in one message, fresh agents, not forks. Give each the proposal, the screenshots, the service rules and its brief from [reviewers.md](reviewers.md). Do not give them your own opinion or the answer you hope for.
3. **Reconcile.** The verdict is what most reviewers say. Record any disagreement in one line each. Never invent agreement.

| Verdict | Meaning |
| --- | --- |
| **Build** | Worth it as proposed |
| **Build smaller** | Worth it with less: say exactly what to cut |
| **Don't build** | Not worth it: say what to do instead (often nothing) |
| **Your call** | A real trade-off only the head chef can weigh: name it in one line |

## Round 2: three designs

Only after Build or Build smaller, for a change people will see.

1. **Draw three really different designs**, not three shades of one: one that changes the least, one that rethinks the flow, and one that removes the most. Build them as previews under `docs/<name>-options/`, like `docs/admin-pages-options/`, never on the live book. Screenshots at 390 px for service pages, 1280 px for admin, 768 px when the tablet matters.
2. **Write the brief** in `docs/<name>-options/brief.md`: for each design, its pros and cons, and a table with the taps for the main task, lines visible at 390 px, navigation levels, build size (pull requests), relearning, new reads or rules, and risk.
3. **Score all three with the same council plus the kitchen screen designer** (six fresh agents, briefs in [reviewers.md](reviewers.md)). Each sees all three designs, not your favourite.
4. **Recommend one, or a mix** ("B with A's tabs"), and say why in three lines. The head chef chooses. Record the choice at the top of `docs/head-chef-decisions.md` and in the brief's "chosen" section, then build it in small steps.

## What the head chef sees

In the pull request, a Council section:

```
## Council
Verdict: Build smaller (4 of 5)
Taps to add a prep line: 3 before, 2 after. Lines on a 390 px phone: 11 before, 11 after.
Skeptic disagreed: the ⋯ sheet already shows who wrote the line.
Brief: docs/<name>-options/brief.md (design B chosen, 5 Nov 2026)
```

Or `Verdict: Not needed (bug fix)`. The **Council check** (`.github/workflows/council-check.yml`, `scripts/council-check.mjs`) turns red on a ready pull request that changes the app without a `Verdict:` line. It is not a required check and never stops a merge.

In the chat, before building: the verdict, the one-line reason, the taps and lines before and after, and the question for the head chef.

## Keep it honest and cheap

- This is role-based analysis, not research with real staff. Say so. Do not claim a measurement you did not take. A reviewer that cannot judge from the evidence says so.
- Five or six agents a round. A quick check for small changes. No council for fixes. That keeps it inside "Agents only where they pay" in `CLAUDE.md`.
