# Chef panel: the Kitchen room's one-button tabs

Requested 15 November 2026, after the whole-app audit of that day. **Chosen 15 November 2026: the mix, as recommended after the follow-up** (A's one-page Kitchen room with C's rows, "Open" in words on each row, the block capped on wide screens, and a purpose line worded for the role). Built the same day; see Chosen and built at the end. The council advises; the head chef decides.

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



## The mix: A's room with C's rows (previewed 15 November 2026)

The head chef asked for the one mix round 2 left open. The Kitchen room stays as one page with no tab row (A). The five tools are full-width rows: the tool's name, the sentence about what your role can do, a chevron (C's row form). Each row opens its tool. On wide screens the list is capped at 44rem, so there is one layout at every width. Nothing from B.

| Phone | Tablet | Laptop |
| --- | --- | --- |
| [mix-390](mix-390.png), head chef [mix-head-390](mix-head-390.png) | [mix-768](mix-768.png) | [mix-1280](mix-1280.png), head chef [mix-head-1280](mix-head-1280.png) |

**Preview**, Sam (sous chef) unless stated, stand-in font, a fixture with no function band showing. A and Today are from the same fixture.

| | Today | A | Mix |
| --- | --- | --- | --- |
| Taps to Guides through the panel | 5 | 4 | 4 |
| Controls that lead to a tool | 10 | 5 | 5 |
| First tool, px from the top, 390 px phone | 299 | 459 | 378 (head chef 405) |
| Last tool ends, px, 390 px phone (tab bar starts at 776) | 1,025 | 993 | 727 (head chef 753) |
| All five tools on the first phone screen | no | no | yes, by 49 px (head chef by 23 px) |
| All five on the first screen at 768 and 1280 px | yes | yes | yes |
| Tool target height, phone | 44 | 145 | 62 to 81 |
| Page height, phone | 1,156 | 1,125 | 850 |
| Sentence contrast on the page (rendered) | | not measured | 6.73 to 1 (needs 4.5) |
| Sideways scroll | none | none | none |

Limits: the function band was not showing. With two functions on, the band is about 190 px tall, so on a phone the last one or two rows would sit under the tab bar, as A's lower tiles already do. Real fonts, keyboard focus, Back after a row, Find and a held-back Guides page are Not evidenced, as for A. The row is the same shape as a Settings row (name, value, chevron), not the approved Overview tile, so it moves a little further from the 8 November look than A does.

### Focused follow-up on the mix

The three reviewers who raised the mix in round 2 saw its own preview and measurements beside A. Fresh agents, same 1 to 5 scale. This is not a full council round: the head chef, skeptic and keeper reviewers did not score the mix.

| Reviewer | A | Mix | Recommends |
| --- | --- | --- | --- |
| Cook mid-service | 4 | 4 | The Mix, if remeasured with real fonts and the function band showing |
| New starter | 4 | 4 | The Mix, only if the whole row is tappable and that is click tested |
| Kitchen screen designer | 3 | 4 | The Mix, with the block capped to the list width |

What they found:

- **Better on a phone, about equal elsewhere.** All five tools above the tab bar on a 390 px phone; in A the fourth tile is cut by the tab bar and Guides needs a scroll.
- **The word "Open" is gone.** A bare chevron is the only cue that a row opens something. The fault round 1 found was a tile whose words did not match what it did, and A's fix said "Open" in words. All three raised this. Repair: end each row with "Open ›" in words.
- **The margin is thin:** 49 px for a sous chef, 23 px for the head chef, with a stand-in font and no function band. Real fonts, a sentence that wraps to three lines or a band on a function day can push the last rows under the tab bar. Not evidenced.
- **A row may read as a setting or a line of information, not a door.** Whether the whole row is the tap target is Not evidenced in a preview. Required check: a click test on the name, the sentence and the chevron.
- **On a laptop it looks unfinished:** the rows stop at 44rem but the cream block runs full width, leaving about 310 px empty. Repair: cap the block, not only the list.
- **Pattern:** `docs/design-patterns.md` has an entry for the dashboard tile but none for this row. The row must be recorded there with its names in `tests/design-patterns.test.js`.
- The Guides gate, Find, remembered tab and Back risks are the same as A's.

**Recommendation after the follow-up: the mix, with "Open ›" in words on each row and the block capped on wide screens.** It beats A where the panel is used most, on a phone, and keeps one layout at every width. Its main downside: it moves further from the 8 November tile look than A, for a first-screen gain that may not hold on a function day until it is remeasured in the built app. A stays the fully reviewed fallback.

Review status: the mix is endorsed by the three reviewers who saw it, each with a condition. It was not scored by the full council.

Before ready, for either A or the mix: the four checks listed under round 2, plus for the mix a whole-row click test, the remeasure at 390, 768 and 1280 px with a function band showing, and keyboard focus on a row.

## Chosen and built (15 November 2026)

The head chef chose the recommendation after the follow-up: the mix. This changes the 8 November choice a little: the Kitchen room and the direct chef hat links stay; the five one-button tabs and the Overview tiles go.

What was built, in `js/prep.js` and `css/app.css`:

- **Kitchen is one page.** `C_GROUPS` gives the room only its Overview; its tab row is not shown. `chefKitchenHTML()` draws one row per tool (`a.c-tool`): the name, what this role can do there, and "Open ›" in words. The whole row is the link to the tool's own page.
- **The tools keep their gate.** `C_TOOLS` and `chefToolAllowed()` hold the Guides `featOn()` switch. A chef always sees Guides today, so the row cannot be hidden in practice; the check stays for the day that changes.
- **Find still lists the five tools**, under Kitchen, and opens the tool's page.
- **A remembered tool tab lands on Kitchen**, any other unknown tab on Dashboard, as before.
- **The purpose line shows on a phone** for the chef panel and is worded for the role on Today: the Admin panel is named only when its link is drawn; a head chef without Google on the device reads that it needs the Admin panel's Google sign-in; a sous chef reads that owner reports, permissions and settings are the head chef's.
- **Wide screens:** the Kitchen pane is capped at 48rem, so the rows reach the edge of their block.
- "Run the shift" is unchanged (round 1).

### Implemented app measurements

The real panel in the click-test stand-in, stand-in font, 15 November 2026. `built-390.png`, `built-768.png`, `built-1280.png`, `built-head-390.png`, `built-head-768.png` and `built-head-1280.png` are beside this brief.

| | Sous chef | Head chef (with the Admin link) |
| --- | --- | --- |
| Taps to Guides through the panel | 4 (was 5) | 4 (was 5) |
| Controls that lead to a tool | 5 (was 10) | 5 (was 10) |
| 390 px phone, no function on: first row, last row ends (tab bar at 776) | 376, 739: all five fit by 37 px | 403, 765: all five fit by 11 px |
| 390 px phone, function band showing (one today, one tomorrow) | 548, 911: two of five above the tab bar | 575, 937: two of five |
| 768 px, band showing | all five on the first screen | all five |
| 1280 x 800 px, band showing | three of five on the first screen | three of five |
| Row height | 57 to 76 px | 57 to 76 px |
| Sideways scroll | none | none |

Differences from the preview:

- **The rows are a little lower and tighter than previewed.** The preview had no "Open" word and shorter sentences. With "Open ›" beside the name and the real sentences, the first build ended 43 px under the tab bar. The sentence now runs the row's full width under the name and Open, and the row padding is 0.4rem, so all five fit again with no function on. The head chef's margin is 11 px, not the preview's 23 px.
- **On a function day the first-screen gain is gone on a phone.** The reviewers named this risk; it is now measured: two of five rows show before a scroll. Folding the band with its − button brings them back. Today's page showed one tile before a scroll in the same state, so it is no worse than before, but the mix's main advantage over A holds only when no function is on.
- The Guides row cannot be held back from a chef, so that check could not be exercised.

### Checks, in `tests/chef-panel.test.js`

For both chef roles at 390, 768 and 1280 px: five rows with their own addresses, Open in words, at least 56 px tall, no tab row and no tiles, rows reaching their block's edge, the role wording, the purpose line per role, all five above the tab bar on a phone with no function on. Also: a tap on the name, the sentence and Open each opens the tool; Back returns to the Kitchen room; an old tool tab lands on Kitchen; Find offers Guides under Kitchen and opens it.

Not evidenced: real Barlow fonts (the stand-in font is wider, so the real fit may be better or worse), a live device, and screen reader use. Keyboard focus is styled (`.c-tool:focus-visible`) but its contrast was not measured.
