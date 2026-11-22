# Supplier order context and History

Chosen in the 22 November space audit, with the head chef's delegated design choice. Baseline was `f29eb5660be4`. The head chef saw the three real-app comparisons using synthetic Northside orders and the enabled Leichhardt sales pilot. This choice covers the supplier order workspace.

**Verdict: Build smaller.** Five independent Round 1 reviewers supported bringing the quantities and History forward. They kept the exact cut-off and delivery wording, confirmed or unconfirmed units, typed quantities, On hand, weekly sales assistance and separate Review and Record steps. Their main checks were deadline and unit accuracy, history scope, acknowledgement and draft return.

## Round 2

| Design | Layout and interaction | Trade-off in the matched fixture |
| --- | --- | --- |
| A · Supplier rail | Group the original heading controls. At 900 px and above with suppliers shown, use the rail for the original cut-off and Last order. Smaller widths and a hidden rail use the existing More disclosure. Order history opens inline from the first screen. | First desktop quantity y523–569, with exact timing in sight. A long supplier list can push the rail context down. |
| B · Order first | Keep the compact More disclosure in the order column at every width. Group the controls and open the history inline from the first screen, as in A. | First desktop quantity y574–620. Desktop timings require More. |
| C · Focused History | Keep a compact status strip in the order column. The same opening action launches a separate history view with Back to draft. | First desktop quantity y574–620. The focused results were clearer to the Cook, with an additional presentation state to preserve. |

| Reviewer | Rank |
| --- | --- |
| Cook | A > C > B |
| Head chef perspective | A > B > C |
| Skeptic | A > B > C |
| New starter | A > B > C |
| Keeper | A > B > C |
| Screen designer | A > B > C |

A ranked first with all six reviewers. Assigning three, two and one points to their first, second and third places gives A 18, B 11 and C 7. Linear’s adjacent context and Todoist’s direct entry support A. Things 3’s disclosure fits the narrow layout and hidden rail, as it did in B. Airbnb and Flighty point to keeping the named supplier, deadline, delivery and next action together. Duolingo’s immediate feedback and Headspace’s plain language support keeping the original failed-read, draft and recording words. The mix keeps B's established compact fallback and C’s labelled return in the inline flow. Reviewers rejected combining the separate history view with the inline list because it would duplicate ways to reach the same records.

## Built

Order history opens the existing inline section from the opening toolbar or beside More. The heading receives focus. Both Back to draft and the shared Back return to the initial scroll position and History button. The date chooser, saved sheets, search, reuse, copy and Older orders retain their existing behavior. Order history opens the already issued recent-order read, including a pending or failed result. Retry and Older orders keep the original bounded queries.

A single cut-off, Last order and History control move between their live positions when the layout crosses 900 px. A hidden rail uses the same compact state, with More and automatic expansion for a failed history read or a placed order. Manage catalogue, the standalone cut-off card, the Review and Record flow and the supplier module API retain their existing contracts. The lazy workspace address is now `js/suppliers.js?v=31`.

### Matched app geometry

Six synthetic products, two previous orders, a current cut-off and the original weekly sales actions were rendered with Barlow in the full app. Coordinates are measured from the top of the opening viewport in CSS pixels.

| View | First To order before → built | Complete products before → built | Order history before → built |
| --- | --- | --- | --- |
| 1280 × 800 | y932–978 → y523–569, Review y732 | 0 → 1 | y2046 → y290 |
| 768 × 900 | y661–707 → y635–681, Review y832 | 1 → 1 | y1851 → y454 |
| 390 × 844 | y634–680 → y621–667, Review y708 | 0 → 0 | y2287 → y390 |

On a phone the original On hand and sales suggestion still sit below the opening Review bar. At Extra large the phone quantity takes scrolling, moving from y879–936 to y863–920 in the matched fixture. History fits on the opening screen with a 60 px target. At all six normal and Extra large viewport combinations, the date picker selected the older order and Back kept the typed quantity, stock and return position.

The synthetic browser checks cover the exact supplier, rail toggle and responsive focus, the failed read and retry, no extra query on opening History, the separate Review and Record path, and long names at Extra large. The prior Older orders coverage verifies one bounded extra page and the existing sales tests cover Use, Keep and Replace. Deployment and venue smokes are separate release checks. [Supplier data and recording contract](../supplier-workspace.md) · [Sales pilot](../supplier-sales.md)
