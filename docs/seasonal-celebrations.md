# Seasonal celebrations

Owner approved implementation and live release on 3 November 2026 after the interactive Kitchen Book preview and independent artwork, cultural-symbol and motion councils.

## What staff see

Celebrations start on Automatic. The corrected Queensland clock selects one main festival, including the Christmas Eve, Boxing Day and New Year's Eve companions. An exact day takes precedence over a longer festival window. The 36-family preset avoids separate country variants competing for the same occasion. The [calendar record](seasonal-calendar.md) gives sources, dates and pending announcements.

Home keeps the normal Kitchen Book heading, festival drawing, full ambience and chalkboard explanation. Recipes, Prep and every other work page keep festive movement inside the top bar. Existing loading and save feedback uses its own Ink in motion controls. A matching animated drawing and chalk celebration name replace the Kitchen Book words in the top bar. Particles are clipped inside that bar. Back keeps its original behaviour. Tapping the celebration name opens an explanation with a Kitchen Book home link. Closing it, Escape, the backdrop, a route change or turning celebrations off removes it. The native dialog manages keyboard focus. PIN, name and device-choice screens keep normal branding and suppress celebration effects.

The explanation cycles English, Filipino, Balinese, Nepali, Hindi and German. There is no language picker. Each sentence names the participating country or countries and the celebration's meaning. Dwell time follows sentence length, between 8 and 16 seconds, with a 520 ms crossfade. Six inert sizing copies reserve space; only one sentence is exposed to screen readers. Pause languages and Resume languages control the sequence. Closing the work explanation releases its timer.

Settings, reached through the chef hat, has Seasonal celebrations. Automatic follows confirmed dates. Choose a celebration searches the main collection, including its regional styles and companion days, with All 204 designs available for manual selection. The result list shows at most eight choices and narrows as a name or country is typed. A manual choice stays until changed to Automatic or Off. Animated, Still, Subtle, Full and Replay work on this device only. Reduced motion disables decoration movement and automatic language transitions; hidden documents pause animation. Off restores the original app branding.

## Approved drawing corrections

The Santa-chef cap, Melbourne Cup horse and jockey, animated lightsabre and green four-leaf clover retain the selected style. Green uses the existing done token alongside the app's orange. National flags keep their identifying colours. The Philippine flag now has its 1:2 geometry, white triangle, three stars and eight-rayed sun. Eid al-Adha uses a prayer arch and shared bowl. Australian and Balinese New Year's Eve clocks point to midnight.

Phone headers retain one identifying anchored ornament plus three floating motifs, or four floating motifs when there is no ornament. Christmas retains eight snow particles. Penjor, parol, kiping, Diwali lamps, Kuningan ornaments and Tihar garlands remain visible.

## Implementation and storage

`js/seasonal/` contains the static 204-record drawing catalogue, motion policies, source-backed calendar, brand adapter, effect engine, six-language copy, ticker, DOM bridge and production controller. The four seasonal stylesheets reuse the existing design tokens, Caveat and Barlow. Bundled Noto Devanagari supplies Nepali and Hindi glyphs; its licence is in `fonts/`. There is no animation framework or runtime translation service.

`lk.seasonal.v1` stores only `{selection, motion, density}`. It lasts until changed or site data is cleared. Values are validated against the static catalogue and fixed options. A storage event synchronises other tabs. No staff profile, religion, nationality or kitchen data is inferred or saved. There are zero new Firestore reads, writes, rules or indexes. One local minute timer checks the corrected kitchen date; clock correction and returning to a tab also refresh selection.

All startup scripts, CSS and local fonts are included in the existing immutable public shell and both update lists. The manifest-aware generation protocol remains intact, including complete older-copy recovery. The source baseline is `59575ea`, also tagged locally as `seasonal-baseline-2026-11-03`. The release also preserves the current Ink in motion startup and save feedback from main. The private preview's fake Firebase, sample people, toolbar and disabled service worker are not shipped.

## Editorial status and maintenance

All 204 records have six authored explanation strings, 1,224 sentences. They are draft localisations, not native-speaker-certified translations. The copy registry retains `nativeSpeakerReviewed: false`, particularly relevant for Balinese register and regional terminology. Review or correct strings in `celebration-copy.js` without adding a runtime translator or language selector.

Annual dates are deliberately finite. Before a new year, check the calendar's `forYear(year).manualOnlyIds`, verify official local announcements, add dated records and source URLs, and run the calendar checks. Unannounced moon-sighting and local fiesta dates never inherit a guessed annual recurrence. Manual artwork remains available.

## Verification and rollback

Combined validation reproduced a recipe startup race on the previous live app as well as the themed build. An editor opened before its recipe response could stay on Recipe not found after the data arrived. The editor now recovers that exact missing recipe through the existing sync event or a fresh mount with an accepted cached copy, using its current edit and privacy-lock guards. Real drafts and kept changes retain their normal recovery flow. Stale SDK replies across a privacy lock remain discarded; the existing retry and wake path can fetch a fresh copy after valid unlock. The view recovery adds no reads or writes. The compatible editor keeps API 5 and loads at `manage.js?v=8`. The recipe jump tests wait for their existing target-position criteria so they do not inspect an unfinished native smooth scroll.

`tests/seasonal.test.js` exercises the real app with fake Firebase: main and variant header effects, mobile ornaments, Home/work handoff, all six languages, no picker, focus and typing, Settings, Still, Off and reduced motion. `tests/seasonal-calendar.test.js` checks dates, overlaps, boundaries and finite annual coverage. `tests/seasonal-shell.test.js` checks atomic asset membership and nested script syntax. Existing saved-copy and shell-generation browser checks cover the expanded shell. The full click suite and required PR gate precede release; the live click suite follows Pages publication.

Revert this feature through a new PR to remove celebrations. Keep the current saved-shell generation protocol and access/session contract. The unused device preference is harmless and no kitchen records need reverting.
