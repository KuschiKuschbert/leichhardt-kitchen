# Neutral round 2 review packet

You are one independent reviewer for the Kitchen Book, a kitchen web app used on phones, tablets and laptops during service. Be critical. Judge only the evidence and state where it is insufficient. This is simulated role-based review, not research with real staff.

The owner wants Orders to remain the list where staff request items. The chef then prepares a separate supplier order and orders through an external system. The owner requested a smaller supplier cut-off treatment, a design council and previews before implementation. Five first-round reviewers independently chose Build smaller. No design has been selected.

## Read and inspect

- `proposal.md`: job, scope and service rules.
- `brief.md`: three concepts, measured comparison, costs and preservation requirements. No recommendation is included yet.
- `concept-spec.md`: preview behaviour and limitations.
- View all three `previews/a-390.png`, `b-390.png`, `c-390.png` and the original `current-chef-390.png` with an image viewer. Also inspect `b-1280.png` to see its different desktop organisation, plus the relevant many/overdue examples (`a-many-390.png`, `b-many-390.png`, `c-many-390.png`, `c-overdue-390.png`). Other tablet/laptop screenshots are available.
- `index.html` is interactive; the standalone download is `orders-designs.html`. These drawings make no API calls and save nothing. The original baseline is actual runtime with synthetic Firebase.

## The alternatives

A, Compact rows: a separate compact deadline block above the single request list. All supplier controls visible, one tap to confirm. Grows with the number of suppliers.

B, Requests first: a small next-deadline strip with View, full deadline block after requests on phones and beside them on laptops. Phone confirmation takes View then Order placed, or scrolling then one tap. Requests lead and the deadline work has its own place.

C, One-line fold: a small native disclosure retains the next supplier, absolute time, total due and any overdue count. Open it to see all deadlines and their confirmation buttons. Two taps when closed, no jump to another part of the page.

All concepts keep requests independent from supplier confirmations, mark old and Out items, retain recipe context, keep Add entry at one tap and item ticking at one tap, and show supplier preparation links. No new page, tab-bar button or automatic overlay. At 390 x 844, current/A/B/C show 2/3/5/5 complete request rows. Current banner is 124.5 px plus its additional group controls; A replaces both with a 200.2 px full block, while B/C initially show a 69 px summary. Staff have no supplier controls.

## Service rules

The main job is one tap from the page tab. No new tab, top-bar button, tab-bar button or pop-up before the owner's choice. Nothing appears over a service list unless it prevents a mistake, except the existing user-opened Add form. Explain and measure added taps or lost rows. Retain 44 px principal controls, readable type, the book's existing surfaces, offline/failed states and Undo. The owner chooses before an app change.

## Return

Use your assigned role from `.claude/skills/service-council/reviewers.md`. In under 220 words, plain Australian English without em dashes:

1. Rank A/B/C best first and give points: first 3, second 2, third 1.
2. The main strength and weakness of each.
3. What, if anything, to take from the other designs into your first choice.
4. Any blocking issue in the evidence or prototype. Distinguish design criticism from an unverified production requirement.

Do not assume real saves, access enforcement, clock updates or notification delivery have been tested. Do not edit any file. No suggested favourite has been supplied.
