# At a glance on Reports, Team: clearer suggestions for the head chef

**Chosen 12 November 2026: A, the Team page's findings first, in Look 1 (the Dashboard's headline cards).** The owner said "I like your recommendations but can we style that a bit better?", was shown two looks on the real page, and said "Yeah go with look 1 please". Built in pull request #683, after the fix it needed first (#682).

Role-based analysis, not research with staff. Every picture is the real book on the click tests' stand-in, with made-up cooks (Ann, Bo, Sam) and made-up numbers. Source: `main` at 4325bc5.

## What was asked

The owner asked whether the book tracks what the mascot sees for cross-training and improvement suggestions (it does not: the mascot records nothing), then: "Does the admin panel deliver all that in clear easy language for me?" The lead read every Reports page and answered "partly": the facts are there, but nothing turns them into what to do, and some words are system words. The owner said yes to a wording fix (#681, "All person" and "about 1 lines") and to this council on a "Worth a look" box.

## Round 1: should we build it?

Five fresh reviewers (cook, head chef, skeptic, new starter, keeper) read the [evidence packet](evidence-packet.md) and pictures of today's Inbox, Dashboard and Reports.

**Verdict: Build smaller, 5 of 5.** No new "Worth a look" box with a new name: the Inbox, the Dashboard's What changed and Insights' What stands out already summarise, and a fourth would be one more name for one job. The real gap is placement: the Team page's sentences sit under a large table, below the first screen. Word cross-training as time-bound activity ("no Sauce shifts in 30 days"), never "never" or skill (the head chef's 10 November rule: activity never sets competence). A failed, old or partial read says so.

Disagreement, on place only: head chef, cook and new starter said at most one or two cards in the Dashboard's What changed; skeptic and keeper said the Team page's own lines above its table (0 extra reads), the skeptic also allowing one Dashboard card.

Correction to the packet: it quoted Insights as "about 5 lines"; the picture shows "about 1 line" (new starter).

**Break-it findings carried** (source review; reproduced afterwards in `tests/team-report-truth.test.js`, 4 failed of 10 on the old code):
1. A section renamed in the last 30 days read "nobody in 30 days" (the counts keep section names). Fixed in #682: "no shifts under this name", and the old names are listed as not counted.
2. A count from a nightly run that had not finished since showed as the whole 30 days. Fixed in #682: an orange "Old counts" flag with the days missing (`tsClean()` keeps `to`).
3. An order day that failed to load counted as no orders, so a standing order candidate could drop off silently. Fixed in #682: "1 of the last 14 days did not load, so an item may be missing here."

## Round 2: three designs

[designs.md](designs.md) holds the three designs, the same task in each, measurements and costs. Pictures: [A](evidence/1-a-team-words-first.png) and its [old counts state](evidence/2-a-old-counts.png), [B](evidence/3-b-dashboard-cards.png), [C](evidence/4-c-inbox-row.png). Preview source: [preview/designs.js](preview/designs.js).

| | A. Team words first | B. Dashboard cards | C. Inbox row |
| --- | --- | --- | --- |
| Place | Reports, Team | Today, Dashboard, in What changed | Today, Inbox |
| Taps from where admin opens | 2 (Reports, Team) | 1 | 0 |
| New reads on open | 0 | +1, and about 60 or a nightly change for standing orders | +1, and the same |
| New writes or rules | none | none | a Seen flag |
| Pull requests | 1 | 1 or 2 | 2 |

The designs differ in place, form and timing (every reviewer agreed they are structurally different).

**Rankings** (six fresh reviewers; no numeric scores were asked for):

| Reviewer | First | Second | Third |
| --- | --- | --- | --- |
| Head chef | A | B | C |
| Cook | A | C | B |
| Skeptic | A | B | C |
| New starter | A | B | C |
| Keeper | A | C | B |
| Screen designer | A | C | B |

**A first, 6 of 6.** B breaks the Dashboard's three-headline strip chosen on 3 November (four squeezed columns, a fifth card wrapping, two Sauce cards side by side, What changed holds changes while "few cooks" is a lasting state) and its standing-order card needs order lines the Dashboard does not read (about 60 reads on open, +43% on the Dashboard). C puts a weekly note into "What needs you today", needs a Seen record that comes back on the other device, drops the "count, not skill" words, and its buttons squash at 390 px.

Reference fit: Flighty (never show old counts as live) favoured A's status line; Linear (one frame per job, one name for each thing) and Things 3 (today versus later) weighed against B and C; Headspace (calm plain words) shaped the wording.

### Mix considered

| Part | Take or reject | Why |
| --- | --- | --- |
| A, written lines first with a status line | Take | 0 reads, one place for each sentence, the detail beside it |
| A, the stale line in red | Reject | Red means failed; old counts are attention (orange), 5 reviewers |
| B, its failed-read words "This does not mean nobody worked a section" | Take | Clearest words for a failed read (new starter) |
| B, the headline card form | Taken later, as Look 1 (below) | The approved Dashboard form, used in its own place |
| B, cards in the Dashboard strip, the standing-order card | Reject | Breaks the strip, costs reads, two places for one sentence |
| C, Open Team landing on the written lines | Reject for now | A pointer repeats A's words in a second place; worth asking again only if A turns out too far away |
| C, the Seen flag | Reject | A write or a device flag for a weekly note; comes back on the other device |

No reviewer wanted all three; two allowed one later cross-training card on the Dashboard if A proves too hidden. **Recommendation: A**, with orange for old counts, dated words ("Shift counts to Wed, 11 Nov"), B's failed-read words, the On this page chips in the new order and no copies left below. Main downside: the head chef still goes to Reports, Team (two taps and, on a phone, a scroll).

## The look (owner: "can we style that a bit better?")

Two looks were drawn on the real Team page with the book's real fonts ([preview/looks.js](preview/looks.js)):
- **Look 1, cards** ([picture](evidence/5-look-1-cards.png)): the Dashboard's headline form: a small label, a bold one-line headline, one plain sentence, a link to the detail. Four across on a laptop, one under another on a phone. About 260 px tall at 1280 with four cards.
- **Look 2, ledger** ([picture](evidence/6-look-2-ledger.png)): one row each, the name large on the left, the count on the right. About 400 px, a new look the book does not use, cramped on a phone, and its big column mixes sections, a person and an item.

Recommended and chosen: **Look 1**. It reuses an approved look, so there is nothing new to learn or keep.

## Built (pull request #683)

- `js/prep.js`: `tsCount()` works the shift counts out once for At a glance and the table, so they agree; `tsStatus()` says when the counts run to, that they are old, or that they did not load, once, under At a glance; `glanceHTML()` draws the cards; `whoWorkedHTML()` keeps the table; `standingRows()` and `standingLost()` are shared by the card and the Standing order candidates list. The written lists that sat under the table (Sections few people worked lately, Mostly on one section) are gone: each finding has one place.
- Cards, in this order: a section one cook worked ("Only Bo worked Sauce. 20 shifts. Ann and Sam had no Sauce shifts."), a section with no shifts under its name, the sections only two cooks worked (one card), anyone with 80% or more of 5 or more shifts on one section, and the standing order candidates ("Milk was on the order list on 5 days"). Each card's link jumps to its detail (`data-p="jump"` to `#tm-where` or `#tm-standing`). Nothing to say: one quiet line, no empty cards.
- `css/app.css`: `.tm-glance` spacing only; the cards use the Dashboard's `.dsh-head` classes.
- No reads, writes, rules or saved data of its own: the shift counts (1 read a kitchen day) and the order lines were already read by the Team page.

Measured in the built app (Implemented app, stand-in data, admin, Chromium headless): at 1280 x 900 the At a glance heading and status line are on the first screen and the first row of cards starts at about 895 px, just under it ([picture](evidence/7-built-1280.png)); with six findings the cards take two rows. At 390 px the cards stack at the full width of the list ([picture](evidence/8-built-390.png)), below the first screen. Old counts: [picture](evidence/9-built-old-counts.png). Difference from the chosen preview: the stand-in data now has six findings, not four. Not evidenced: rendered contrast measured (existing tokens and classes), keyboard focus on the links, a real month of data.

Tests: `tests/team-glance.test.js` (22 checks: order, chips, status line, each card's words, links that jump, one read of the counts, phone width, the quiet line, a failed read said once, a section name with markup), `tests/team-report-truth.test.js`, `tests/todays-team.test.js` (its Team report check now reads the card).
