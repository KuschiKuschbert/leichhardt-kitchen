# Chef panel: the Kitchen room's one-button tabs

Requested 15 November 2026, after the whole-app audit of that day. **Not chosen yet. Nothing in the app has changed.** The council advises; the head chef decides.

This is role-based analysis by independent agent reviewers, not research with real staff. Source: `main` at a7947a2. Every number is labelled **Implemented app** (the real panel in the click-test stand-in) or **Preview** (the real panel with the page changed in place by `previews.js`-style edits, never the live book). Both use mocked Firebase, the synthetic sous chef Sam, 390 and 1280 px, and the tests' stand-in font, not the real Barlow fonts.

## What the audit found

The Head chef / Sous chef panel (`#/chef`, [chosen 8 November 2026](../chef-panel-options/brief.md)) has three things that repeat each other.

1. **Kitchen room: five tabs that each hold one button.** Overview shows five tiles. A tile reads "Open guides" but only switches to the Guides tab, where a second "Open guides" button waits. The chef hat already lists all five tools. Guides from the chef hat: 2 taps. Through the panel: 5 taps (chef hat, panel, Kitchen, tile or tab, Open). Implemented app, counted from the page structure.
2. **Today, Dashboard: "Run the shift"** has Chef to-do, Write a shift ping and Kitchen mail buttons that switch to the tabs of the same name above them. Only Functions service view goes somewhere new.
3. **The head chef has two panels with the same room names** (Today, Reports, Team, Kitchen, Prep): the Head chef panel and the Admin panel. The difference is real: Admin needs the owner's Google sign-in and holds owner reports, permissions, PIN resets, backups and settings. Nothing says so in words. On a phone the panel's one-line purpose ("Run the shift with the team.") is hidden; it shows from tablet width.

## What the council must respect

On 8 November the council recommended tools in the chef hat (C, 23 points) over a dedicated panel (A, 19). **The owner chose the dedicated panel**, "a similar thing" to the admin panel, with "working subpages, rather than the earlier link-only example". The chosen Kitchen room is "Overview and the existing recipe, supplier, function, delivery and guide workspaces", whose tools "keep their current routes". The direct chef hat links stay. So the two panels are the owner's choice, and removing the tool tabs is a **proposed change to an approved design**, not a fix.

## Round 1: should we build it?

Proposal: (1) remove the five one-button tabs so each Overview tile opens its tool; (2) remove the "Run the shift" buttons that repeat tabs; (3) keep both panels and say in one line what each is for.

**Verdict: Build smaller, 4 of 5.** Cut part 2. Build part 1 only with the head chef's OK, since it changes the 8 November choice. Build part 3 as one sentence worded for the role and shown on a phone.

| Reviewer | Verdict | Main point |
| --- | --- | --- |
| Cook mid-service | Build smaller | The tile misleads: it says Open and does not open. "Run the shift" is below the fold, so removing it frees nothing a cook reads, and it is the page's only orange button. |
| Head chef | Build smaller | Nobody reported this, 2 to 4 people use the panel, and doing nothing breaks nothing. Part 1 has the best evidence. Leave "Run the shift" alone. |
| Skeptic | Build smaller | A tidy-up that still costs every phone an update. Part 3 half exists already. |
| New starter | Build | A new sous chef cannot tell what the first tap did. "Write a shift ping" is the only action-worded door to pings, so keep it. Do not point a sous chef at an Admin panel they cannot open. |
| Keeper of the book | Build smaller | No reads, rules or saved data. Part 1 is more than three small functions: tiles are built from the tab names and filtered by `chefTabAllowed()`, which holds the Guides `featOn()` gate. |

Disagreement: the new starter said Build. The keeper would also build part 2 (cheapest); three reviewers called it the weakest part.

### Break-it findings (round 1)

| Scenario | Evidence | Smallest check |
| --- | --- | --- |
| Tab names are removed with the tabs, so no tile draws, a tile reads "undefined ›", or Guides loses its held-back gate | Checked in `js/prep.js` (`chefTile()`, `chefKitchenHTML()`, `chefTabAllowed()`): the tiles depend on those names | Count the tiles and check each address as each role, with Guides held back |
| The new purpose line names the Admin panel to someone who cannot open it (a sous chef, or a head chef without Google on this device) | Checked in `js/prep.js`: the Admin link draws only when `adminTabs()` is true | Wording test per role |
| The panel remembers a Kitchen tab that no longer exists | Risk / Not evidenced. The existing fallback to Dashboard covers it by source | Set the old tab, redraw, expect Overview |
| Find still offers a removed page, or "Guides" finds nothing | Risk / Not evidenced | Search Guides in Find, expect a result that opens it |
| A tile now leaves the panel: does Back return to the Kitchen room? | Risk / Not evidenced | Tap a tile, press Back, expect `#/chef` on Kitchen |

## Three designs

Part 3's sentence is the same in all three previews: the purpose line shows on a phone and is worded for the role. "Run the shift" stays as it is (round 1).

| | Central idea | Phone | Laptop |
| --- | --- | --- | --- |
| Today | Six tabs; a tile switches tab; the tab holds one button | [now-390](now-390.png) | [now-1280](now-1280.png) |
| **A. Tiles that open** | Kitchen is one page. Each tile opens its tool and says what your role can do there. No tab row. | [A-390](A-390.png) | [A-1280](A-1280.png) |
| **B. No Kitchen room** | The panel is Today, Reports, Team and Prep. The tools stay where they already are, in the chef hat. One line on the Dashboard says so. | [B-390](B-390.png) | [B-1280](B-1280.png) |
| **C. Tools on the Dashboard** | No Kitchen room. The five tools are a short list at the foot of Today's Dashboard, each with its permission sentence. | [C-390](C-390.png) | [C-1280](C-1280.png) |

How they differ in structure:

| | A | B | C |
| --- | --- | --- | --- |
| Rooms in the panel | 5 | 4 | 4 |
| Where the tools are | Their own room, as tiles | Only the chef hat | A list on the Dashboard |
| Navigation levels to a tool from the panel | Room, tile | None in the panel | Dashboard row |
| Permission sentences | On each tile | Gone from the panel | On each row |
| Closest to the 8 November choice | Yes: the room and its Overview stay | No: the room goes | Partly: tools stay in the panel, the room goes |

## Comparison and measurements

Preview, Sam (sous chef), stand-in font. Today's column is Implemented app. No sideways scroll in any preview.

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Taps to Guides through the panel (chef hat, panel, ...) | 5 | 4 | not in the panel | 3, after a scroll |
| Taps to Guides from the chef hat | 2 | 2 | 2 | 2 |
| Tabs in the Kitchen row | 6 | 0 | no room | no room |
| Controls that lead to a tool, on the page | 10 (5 tiles, 5 tabs) | 5 | 0 | 5 |
| First tool control, px from the top, 390 px phone | 299 | 459 | none | 1,183 (below the first screen of 844) |
| Smallest tool target height, phone | 44 | 145 | none | 59 |
| Page height, phone | 1,156 (Kitchen) | 1,125 (Kitchen) | 1,289 (Dashboard) | 1,639 (Dashboard) |
| Page height, laptop | 800 | 800 | 987 | 1,329 |
| Build size | | 1 pull request | 1 pull request | 1 pull request |
| Tests to change (`tests/chef-panel.test.js`) | | the Kitchen room map, 6 checks | the room list and Kitchen checks | the room list, Kitchen checks, new Dashboard checks |
| New reads or rules | | none | none | none |
| Relearning | | a tile opens the tool | Kitchen is gone from the panel | Kitchen is gone; tools are under Today |
| Changes the 8 November choice | | a little | the most | a lot |

Not measured: real fonts, the head chef's view of each design, Back after a tile, Find, a held-back Guides page, keyboard focus and contrast of the changed tiles. Those are Not evidenced.

## Round 2: ranking and recommendation

Six fresh independent reviewers saw the same brief and all eight screenshots. Each scored 1 (poor) to 5 (excellent). All six said the designs differ in structure.

| Reviewer | A | B | C | First choice |
| --- | --- | --- | --- | --- |
| Cook mid-service | 4 | 3 | 2 | A |
| Head chef | 4 | 2 | 2 | A |
| Skeptic | 4 | 3 | 2 | A |
| New starter | 4 | 2 | 3 | A |
| Keeper of the book | 4 | 3 | 2 | A |
| Kitchen screen designer | 4 | 2 | 3 | A |
| Total | 24 | 15 | 14 | A, first for 6 of 6 |

**Recommend A, tiles that open, with one purpose line worded for the role.** It fixes the one fault with real evidence (a tile that says Open and does not open), halves the controls that lead to a tool (10 to 5), takes a tap off the panel route (5 to 4) and keeps the room the owner chose on 8 November. Its main downside: the gain is small. The panel route is still 4 taps against 2 from the chef hat, the first tool sits 160 px lower on a phone (299 to 459 px, Preview), and the merge costs every phone an update for 2 to 4 users. Keeping the panel as it is breaks nothing; the skeptic and the head chef reviewer both said so.

Why not B: it undoes the 8 November choice the most, drops the permission sentences, and its only pointer to the tools is small grey text at the foot of the page. Why not C: the tools start 1,183 px down a phone, below the first screen, on a Dashboard 350 px longer, and static tools dilute Today (Things 3, Flighty).

### Reference fit

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: the work ahead of navigation | Works: no tab row that leads only to a button | Works: nothing to navigate | Needs work: navigation at the foot of today's page |
| Headspace: words on actions are true | Works: "Open" opens | Needs work: a footnote, not a control | Works: rows with a chevron |
| Airbnb: requirements with the next action | Works: the permission sentence on the tile | Needs work: sentences gone | Works: sentence on each row |
| Things 3: today distinct from occasional tools | Works | Works | Needs work |
| Duolingo: each tap answers truthfully | Works in the preview; Back after a tile Not evidenced | Not relevant | Not evidenced |

Todoist and Flighty's live status are not relevant: nothing is added or saved here.

### Mix considered

| Part | Take or reject | Why |
| --- | --- | --- |
| A: tiles that open, with the permission sentence | Take | The fault and its fix, 6 of 6 |
| B: remove the room | Reject | Biggest change to the owner's choice; sentences lost |
| B: one line pointing to the chef hat | Reject once the room stays | It would repeat the tools in a third place |
| C: tools on the Dashboard | Reject | Buries them below the first screen and lengthens Today |
| C: the row form (title, sentence, chevron) inside A's room on a phone | Not taken, not ruled out | Three reviewers (cook, new starter, designer) thought it might fit all five tools on the first phone screen. Not evidenced: no preview was made. It adds a second layout to test and moves away from the approved Overview tile |

No blend of all three beats A: B and C both remove the room A keeps, so a blend puts the tools in two or three places again, which is the repetition the audit found. The recommendation is a single design, so no combined preview was needed.

### Contract fit

- **Proposed change to an approved design.** A changes the 8 November choice a little: the room and its Overview stay, the five link tabs go. This is the head chef's call, not a fix.
- **Needs work in the previews:** all three show Sam, a sous chef, a purpose line that names the Admin panel, which a sous chef cannot open. Round 1 already said so. The built line must be worded for the role: no Admin mention unless the Admin link is drawn.
- **Works:** no new colour, state, read, rule or saved data. Tap targets pass (145 px tiles, Preview). The tiles reuse the Overview tile; a tile that is a link rather than a button is a small pattern change to record in `docs/design-patterns.md`.
- **Not evidenced:** real fonts, the head chef's view, contrast of the grey sentences, keyboard focus, uneven tile heights when sentences wrap at 390 px (the fourth tile sits under the tab bar in the preview).

### Break-it findings (round 2) and what to check before ready

| Finding | Evidence | Disposition |
| --- | --- | --- |
| Guides gate: once tiles are links, the `chefTabAllowed()` filter that holds `featOn('guides')` must be kept on purpose | Checked in `js/prep.js` | Required check: Guides held back, four tools, per role |
| Find builds its pages from the room list, so "Guides" would drop out of Find | Checked in `js/prep.js` | Keep Find entries for the five tools as direct links; test it |
| A remembered Kitchen tab that no longer exists falls to Dashboard, not Kitchen | Checked in source | Test: set the old tab, redraw, expect Kitchen's Overview |
| Back after a tile returns to the Kitchen room | Risk / Not evidenced | Click test: tile, Back, expect `#/chef` on Kitchen |
| C only: "On this page" would not list the new block | Checked in the C preview | Not applicable if A is chosen |

After building, remeasure the complete app at 390, 768 and 1280 px as both chef roles with real data shapes, and record any difference from the preview here.

## Question for the head chef

Do you want to change your 8 November choice this far: the Kitchen room keeps its Overview, each tile opens its tool, and the five one-button tabs go? If yes, A is built in one pull request with the role-worded purpose line. If no, nothing changes and this brief records why.
