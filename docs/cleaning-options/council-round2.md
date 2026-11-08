# Round 2 evidence packet

Independent role-based design review, 8 November 2026. No preferred answer is supplied. The user asked for exactly three designs and a council, and confirmed coldroom, freezer, dry store, oven, fryers, behind equipment, pass and shelves, with a tick recording who and when.

Read the A/B/C descriptions and proposed scope in `brief.md`. Inspect all three phone screenshots and the wide chef views:

- A: `previews/a-390.png`, `previews/a-chef-1280.png`, optional `a-chef-390.png`.
- B: `previews/b-390.png`, `previews/b-1280.png`, `previews/b-chef-1280.png`.
- C: `previews/c-390.png`, `previews/c-chef-1280.png`.
- Tablet variants `a-768.png`, `b-768.png`, `c-768.png` are available.

`previews/measurements.json` records browser measurements at 390 x 844, 768 x 1024 and 1280 x 900, with real Barlow/Caveat fonts. No horizontal overflow and all measured buttons/selects at least 44 x 44 px. This is not full WCAG certification. Preview control-toolbar space is included in row counts.

| Measure | A | B | C |
| --- | --- | --- | --- |
| Complete staff task rows visible at 390 x 844 | 5 of 6 due | 3 of 4 relevant (2 own + 2 shared) | 5 of 6 due |
| Complete chef phone rows, week's Wednesday where present | 4 | 4 | 5 |
| Primary completion | Cleaning tab, then tick: 2 taps total, 1 once open | Same for own/shared visible task; another section needs a section choice | Same |
| Guides from work page | 2 taps via hat, previously 1 | Same | Same |
| Cleaning page hierarchy | Direct page; chef day selector | Direct page; chef Today/Week | Direct page; repeat schedule fold for chef |
| Estimated implementation PRs | 3 | 3 | 2 |
| Relearning | Familiar sheet; phone day adaptation | Section scope plus shared group; chef view switch | One grouped daily list |
| New data/rules | All need validated recurring templates, dated completions and access rules | Same plus shared identity across views | Same daily foundation; no weekly completion matrix |

All eight areas exist in each chef schedule. Example Wednesday has six due jobs; freezer and kitchen shelves fall on other example weekdays. No confirmed cleaning procedure, owner assignment or repeat schedule is asserted. Every How to opens an explicit Method to come placeholder. Repeating rules are shown for review but editing, backend writes, conflicts, offline save and real role enforcement are not implemented in these prototypes.

The current app baseline has six complete Prep rows above its fixed Add bar in the synthetic font-loaded fixture. It has no cleaning schedule. This change has not altered the app.

Respond in under 200 words. Rank all three best first. Give 3 points to first, 2 to second and 1 to third. Name each design's strength and weakness, then any useful combination. Say what cannot be judged. Do not infer real staff research, production save behaviour or safety compliance from a prototype.
