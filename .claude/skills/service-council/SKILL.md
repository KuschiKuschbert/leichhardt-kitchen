---
name: service-council
description: The Kitchen Book's critical council for major decisions. Use before building a new page, tab, button, setting, sheet or workflow, before changing how a service task is done (Prep, Orders, Wastage, Transfers, the recipe card on the line), before removing or merging a feature, and for every design choice. Round 1 asks whether it is needed and adds real value while keeping the book quick to read with few taps in a busy service; round 2 draws the requested designs (three by default) and recommends one or a mix. Not for bug fixes, tests, docs or CI.
---

# Service council

Head chef decision, 5 November 2026 (`docs/head-chef-decisions.md`). The council advises and the head chef decides. Before building anything major, show the head chef the council's verdict in plain words. Before building a design, show the requested designs (three by default) and the recommendation. This is not the recipe council (`kitchen-council`), and a whole-app audit uses `docs/whole-app-audit.md` section 5 instead.

## When it runs

| The change | What runs |
| --- | --- |
| **Major:** a new page, tab, bar button, setting, sheet, pop-up or workflow; a change to how a service task is done; removing or merging a feature; anything the head chef must choose | Round 1. Then round 2 if the verdict is Build or Build smaller and people will see the change |
| **Small:** a change on an existing page that adds no tab, bar button, pop-up or step | Quick check: the session reads the current design contracts below, answers the round 1 questions itself, applies the relevant design references, measures taps and lines, and writes the Council section. No extra agents |
| **None:** a bug fix, test fix, docs, CI, a rules change with no new screen | `Verdict: Not needed (bug fix)` in the pull request, with the reason in brackets |

When unsure, it is major. Run each round once per decision, not once per push. Reuse round 1 if the proposal has not changed.

## The service rules

Every proposal and every design is checked against these (head chef, 5 November 2026; also in `CLAUDE.md`):

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

Count, do not guess: the taps for the main task, and the list lines visible on a 390 px phone, before and after. Measure them in the click-test stand-in (`tests/`, `tests/fake/`) or a preview, and say how.

## Current design contracts

Before either round, read the current `CLAUDE.md` reading map and the affected feature's chosen design and later decisions. Prepare one short evidence packet for every reviewer: the source commit, relevant contract excerpts with file and heading references, baseline screenshots and available measurements. Include this section and Design references below. Fresh agents do not inherit the lead's reading: a bare link or "keep the approved colours" is not enough. Reuse the packet between rounds unless the contracts or proposal change; the quick check reads the same sources without spawning reviewers.

Every visual proposal includes the relevant parts of [shared surface colours](../../../docs/surface-colours.md#selected-design), [operational colour meanings](../../../docs/colour-coding.md#shared-meanings) and [design patterns](../../../docs/design-patterns.md). Include the affected category exceptions, plus [action feedback](../../../docs/action-feedback.md#the-rule) and [loading and motion](../../../docs/loading-motion.md#behaviour) when states or interactions are involved. These documents own the tokens and detailed rules; do not create another palette in a feature brief.

### Colour and state checks

| Check | Evidence the council needs |
| --- | --- |
| Surface purpose | Work books, including Orders, use steel; people use sage; current live boards use charcoal; reading and writing stay quiet paper. Check the actual cover, header, edge and interior, not just a palette. |
| State meaning | Local state cues take priority over surface decoration. Attention/pending, confirmed success and failure follow the operational contract. Keep brand/action orange, charcoal Prep Urgent and explicit inclusion/assignment meanings. A sage people surface or green draft assignment is not Saved; neutral upcoming information is not automatically amber. |
| Words and exceptions | Status remains understandable through words, icons, ticks or pressed state without colour. Preserve affected category legends, charts, heat scales, allergen certainty, New/Moved tags, art, celebrations and print. Colour does not establish access or food safety. |
| Real contrast | Measure the rendered foreground and background, including ancestor opacity and light/dark variants: normal text 4.5:1, large text 3:1, meaningful control/state boundaries 3:1 where applicable. Check visible keyboard focus; do not infer a whole-app accessibility pass from token values or screenshots. |
| Relevant states | Show the affected ordinary, selected, disabled, saving/Not sent, Saved, empty and failure states. Distinguish confirmed empty data from a failed read. Exercise acknowledgement, retry and work recovery where affected; list states that do not apply. |
| Service continuity | Measure visible rows, tap targets and main-task tap counts before and after at the relevant 390, 768 and 1280 px widths. Justify lost rows or added taps under the service rules. Keep controls stable through state changes; useful motion respects reduced motion and cannot imply completion or move a live target. |

Round 1 identifies contract risks and the evidence the designs will need. Round 2 records **Contract fit** alongside the reference comparison: **Works**, **Needs work**, **Not evidenced**, or **Not relevant** with a reason, source and evidence for each applicable check. The quick check needs only a short contract-fit note and the relevant evidence. Untested states and contrast remain Not evidenced. Identify the check needed before calling the implementation ready; do not add a review round for missing measurements.

Separate a deliberate proposal to change an approved rule from an accidental violation. Name the exact proposed departure and leave it for the head chef's choice. A high preference score or similarity to another app never makes a contract violation acceptable. Recommend a repair or smaller compliant option where possible; keep unresolved failures and missing evidence visible in the recommendation and handoff.

## Design references

Use these in both rounds and small-change quick checks (head chef, 9 November 2026). They turn the [seven-app research](../../../docs/whole-app-redesign-options/brief.md#what-the-seven-apps-do-well-and-what-fits-a-kitchen) into questions about the kitchen task. Give this section to every reviewer. Select the principles that apply; briefly explain when none do. There is no reward for copying more apps.

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Are the page frame, action placement and names consistent, with the work more prominent than navigation? | Tiny dense controls, keyboard-only paths or a second navigation system |
| Things 3 | Are today's work and upcoming work distinct? Are occasional details tucked away while frequent actions stay visible? | Drag-only actions or hiding the chosen one-tap Urgent, Recipe and On it controls |
| Airbnb | Can the person see a job's time, place, requirements, status and next action together, without hunting through screens? | Decorative cards, photos or duplicated information that displaces useful lines |
| Todoist | Is adding quick, with known defaults visible and editable, usual items easy to find, and extra fields shown when needed? | Guessing a section, unit or quantity from ambiguous text, or hiding required inputs |
| Flighty | Is what matters now and next clear, with real times, deadlines and status from data the person may already read? | New listeners or polling just for the look, distracting movement or stale status presented as live |
| Duolingo | Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery? | Points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement |
| Headspace | Are labels calm, short and understandable to a new starter, with one name for each thing and words on actions? | Vague reassurance, unexplained icons or onboarding interruptions during service |

The service rules, current feature contracts and the head chef's later choices take priority over the research and its early recommendations. Keep the book's approved colours, notebook style, handwritten line words and functionality. Use existing [design patterns](../../../docs/design-patterns.md), [action feedback](../../../docs/action-feedback.md) and [loading and motion](../../../docs/loading-motion.md). Approved celebrations, Saved/New stamps and useful motion remain; motion must respect reduced motion and never delay an action or shift a live list. Keep current access, draft recovery and read-budget rules.

For each relevant principle, record the concrete benefit, evidence and trade-off in the feature brief. Round 2 uses a small comparison table: principle, then one column per design marked **Works**, **Needs work** or **Not evidenced**, with a short reason. Explain rejected ideas or **Not relevant** together where helpful. Cite measured taps/visible lines, screenshots or exercised states; a still image cannot prove speed, save feedback or recovery. The quick check needs only a short reference-fit note, not another review round. Rank kitchen value and the evidence above resemblance to an app.

## Round 1: should we build it?

1. **Write the proposal first, no code.** One page: the problem in the kitchen, who has it, how often, what people do today, the change, and its cost (reads, files, tests, risk). Prepare the current-contract evidence packet above. Name the relevant design-reference principles and the benefit to test, or why none apply. Add screenshots of today's page at 390 px (1280 px for admin pages).
2. **Run the five reviewers at the same time**: five Agent calls in one message, fresh agents, not forks. Give each the proposal, the same evidence packet, the service rules and its brief from [reviewers.md](reviewers.md). Do not give them your own opinion or the answer you hope for.
3. **Reconcile.** The verdict is what most reviewers say. Record any disagreement in one line each. Never invent agreement.

| Verdict | Meaning |
| --- | --- |
| **Build** | Worth it as proposed |
| **Build smaller** | Worth it with less: say exactly what to cut |
| **Don't build** | Not worth it: say what to do instead (often nothing) |
| **Your call** | A real trade-off only the head chef can weigh: name it in one line |

## Round 2: designs (three by default)

Only after Build or Build smaller, for a change people will see. Three designs by default; use the head chef's requested number when specified.

1. **Draw three structurally different, credible designs A, B and C** unless the head chef asks for another number. The default directions are one that changes the least, one that rethinks the flow, and one that removes the most friction. Each pair must differ in at least two meaningful ways: layout, information hierarchy, task sequence, navigation or interaction/disclosure. Name each design's central idea and walk through the same main task. Colour, font, spacing or corner changes alone do not count. Keep the approved visual system and required capabilities; do not make a weak option just to favour another. If constraints prevent credible alternatives, state the limitation rather than relabelling cosmetic variants. Build previews under `docs/<name>-options/`, never on the live book. Screenshots at 390 px for service pages, 1280 px for admin, 768 px when the tablet matters.
2. **Write the brief** in `docs/<name>-options/brief.md`: for each design, its pros and cons, and a table with the taps for the main task, lines visible at 390 px, navigation levels, build size (pull requests), relearning, new reads or rules, and risk. Compare the same task, roles, representative synthetic data, long content, viewports and relevant states. State omissions and capability trade-offs explicitly. Add a short differences table showing how A, B and C differ structurally. Include Contract fit, the reference-principle comparison and their evidence as described above.
3. **Score all designs with the same council plus the kitchen screen designer** (six fresh agents, briefs in [reviewers.md](reviewers.md)). Each sees every design, the same current-contract evidence packet and the service rules, not your favourite. Explain how contract fit, the relevant principles and evidence affect the ranking. If using numeric scores, state the scale and reproduce the reviewers' scores without inventing missing ones.
4. **Explicitly consider a mix of all three**, using the process below. Every reviewer names useful or rejected parts from A, B and C, ties them to the relevant seven-app principles, and says whether a blend could beat their preferred single design. The lead reconciles these independent answers after the original rankings.
5. **Make one clear recommendation**, a named design or an exact mix. Lead with "Recommend B" or "Recommend B's main flow + A's quick entry + C's detail view", then explain why it beats the alternatives, which app principles help and the main downside. State unresolved contract failures, evidence gaps, disagreement and any proposed departure needing the head chef's choice. Do not leave the head chef with an unranked menu or only "your call". The head chef still chooses. Record the choice at the top of `docs/head-chef-decisions.md` and in the brief's "chosen" section, then build it in small steps.

### Compare a mix

For three options, assess **A + B + C** explicitly even if the final recommendation is one design or a two-way mix. With another requested count, consider contributions from every option. Record a compact table: source design and part, take or reject with reason, useful app principle, kitchen benefit, interaction conflict or extra cost, and evidence. Do not force a contribution from every design if it creates clutter, duplicate controls, incompatible save steps or extra taps. Explain why a pure or two-way option beats the all-three blend when that is the conclusion.

A recommended mix needs **one coherent combined preview** before the head chef chooses. Keep the original designs and their rankings beside it. Measure the mix's own taps, visible lines and affected states; apply the same contract and reference checks, including colour rules. Do not average or copy component scores, claim inherited agreement, or call a montage a tested workflow. Mark missing evidence Not evidenced.

Label the combined proposal's review status. A lead synthesis is not automatically a council-endorsed design. If the blend introduces a flow or risk not covered by the original reviews, get a focused follow-up from the relevant existing reviewers on the combined preview and evidence. Record their actual findings and remaining disagreement. This completes round 2; it does not add a new full council round or rerun round 1.

## What the head chef sees

In the pull request, a Council section:

```
## Council
Verdict: Build smaller (4 of 5)
Taps to add a prep line: 3 before, 2 after. Lines on a 390 px phone: 11 before, 11 after.
Skeptic disagreed: the ⋯ sheet already shows who wrote the line.
Reference fit: Things keeps today's work visible; drag-only ordering rejected for wet hands. Evidence and comparison in the brief.
Contract fit: sources, colour/state checks, evidence and unresolved items in the brief.
Recommendation: one named design or an exact mix, why it wins and its main downside.
Mix considered: A + B + C contributions, rejected parts and combined-preview review status in the brief.
Brief: docs/<name>-options/brief.md (design B chosen, 5 Nov 2026)
```

Or `Verdict: Not needed (bug fix)`. The **Council check** (`.github/workflows/council-check.yml`, `scripts/council-check.mjs`) turns red on a ready pull request that changes the app without a `Verdict:` line. It is not a required check and never stops a merge.

In the chat, before building: the verdict, reason and relevant evidence, including taps and lines before and after. When round 2 runs, also show the three distinct designs (or requested count), the clear recommendation, the all-three mix conclusion (or all supplied options), and the question for the head chef. Show the combined preview when recommending a mix. Small changes keep the quick check.

## Keep it honest and cheap

- This is role-based analysis, not research with real staff. Say so. Do not claim a measurement you did not take. A reviewer that cannot judge from the evidence says so.
- Five or six agents a round. A quick check for small changes. No council for fixes. That keeps it inside "Agents only where they pay" in `CLAUDE.md`.
