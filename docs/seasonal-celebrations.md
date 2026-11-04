# Seasonal celebrations

Owner approved implementation and live release on 3 November 2026 after the interactive Kitchen Book preview and independent artwork, cultural-symbol and motion councils.

## What staff see

Celebrations start On. The corrected Queensland clock selects one main festival, including the Christmas Eve, Boxing Day and New Year's Eve companions. An exact day takes precedence over a longer festival window. The 36-family preset avoids separate country variants competing for the same occasion. The [calendar record](seasonal-calendar.md) gives sources, dates and pending announcements.

Home keeps the normal Kitchen Book heading and full ambience. Since 3 November 2026 the motifs move behind the page: the effects layer sits under the Home column, so they show on the kraft between the board and dockets and never over a word or a button. Anchored objects hang from under the top bar (garlands, lanterns, parol) or stand on the date line (diyas, pots) to the right of the heading, and scroll with the page. Diwali, Tihar, Lunar New Year and Eid have their own drifting motifs (diya flames, marigold heads, plum blossom, small crescents) instead of shared stars. The chef hat always stays the chef hat; it opens the person's menu and carries the mail count. One compact chalkboard combines the approved festival icon, name, current language and explanation. Recipes, Prep and every other work page keep Kitchen Book and the chef hat (3 November 2026). A stamp beside the name, a 44 px button, opens the explanation; a still festive edge runs along the bottom of the top bar, repeating one of the festival's own motifs (fairy lights for Christmas, the running rail for Melbourne Cup, marigolds for Diwali and Tihar). The top bar keeps its height and nothing moves behind the name, the pills or the buttons. Nyepi has the stamp and no edge. Existing loading and save feedback uses its own Ink in motion controls. Back keeps its original behaviour. The stamp tucks in once when you leave Home. Its Home link and Close control share the heading row and retain 44 px touch targets. Closing it, Escape, the backdrop, a route change or turning celebrations off removes it. The native dialog manages keyboard focus. PIN, name and device-choice screens keep normal branding and suppress celebration effects.

The explanation cycles English, Filipino, Balinese, Nepali, Hindi and German. There is no language picker or separate language-pause button. The current-language badge shares the festival heading; redundant occasion and cycling-status rows are omitted. Each sentence names the participating country or countries and the celebration's meaning. Body copy remains 16 px at the normal text setting, without truncation. Dwell time follows sentence length, between 8 and 16 seconds, with a 520 ms crossfade. Six inert sizing copies reserve space; only one sentence is exposed to screen readers. The ticker owns and removes its heading badge when cleared or remounted. Still, reduced motion and the existing ambience pause also stop the language sequence. Closing the work explanation releases its timer.

Home motion arrives, then settles (3 November 2026). The first Home view of the kitchen day for a celebration, and Replay, play the full arrival for about 4 seconds. Then Home rests with at most 4 slow pieces (2 on Subtle), counting the hanging ornaments and the horizon; the board drawing holds still. Returning to Home the same day opens at rest. A hidden tab skips the rest of the arrival. `lk.seasonal.arrival` keeps the kitchen day and celebration of the last arrival on this device; it is out of date on the next kitchen day or for another celebration, and Replay clears it so the next Home view arrives.

Home also shows Coming up: the next celebrations in the coming 7 days, with their stamps, above the dockets, whether or not there is one today. Festival windows count their days on the board ("Tihar · day 3 of 5"). Both come from the offline calendar, with no reads. Reflective and civic designs (71 of 204: Nyepi, Buddha Jayanti, Good Friday, Anzac Day and more) stay quiet: drawing and stamp only, no motifs, no arrival and no top bar edge.

Nobody picks a celebration (head chef, 4 November 2026): the kitchen calendar gives every device the same one, from confirmed dates. Settings, reached through the chef hat, has a Seasonal celebrations row under This phone; it says On or Off and opens in place to On and Off, Animated and Still, Subtle and Full, Replay, and the next five celebrations with their dates and stamps. These work on this device only. A celebration chosen by hand on an older book is not kept, so that device goes back to the calendar. The designs outside the calendar are not shown to anyone; `KB_SEASONAL.configure({ selection: id })` still shows one in the current tab for the click tests and design checks, never saved and offered nowhere in the book. Reduced motion disables decoration movement and automatic language transitions; hidden documents pause animation. Off restores the original app branding.

## Approved drawing corrections

The Santa-chef cap, Melbourne Cup horse and jockey, animated lightsabre and green four-leaf clover retain the selected style. Green uses the existing done token alongside the app's orange. National flags keep their identifying colours. The Philippine flag now has its 1:2 geometry, white triangle, three stars and eight-rayed sun. Eid al-Adha uses a prayer arch and shared bowl. Australian and Balinese New Year's Eve clocks point to midnight.

Stamps (`js/seasonal/marks.js`, 3 November 2026) give each main festival and companion one bold glyph and one orange accent on a paper disc, for every place the mark is small: the top bar, Coming up and the Settings dates. Salubong and Philippine Easter keep their own drawing. The same file redraws Navaratri (dandiya side by side), Mother's Day (tulips) and both Holi records (gulal heaps), which read as a red cross or a syringe at small sizes. Penjor, parol, kiping, Diwali lamps, Kuningan ornaments and Tihar garlands remain visible on Home.

## Implementation and storage

`js/seasonal/` contains the static 204-record drawing catalogue, the stamps and approved redraws (`marks.js`), motion policies, source-backed calendar, brand adapter, effect engine, six-language copy, ticker, DOM bridge and production controller. The four seasonal stylesheets reuse the existing design tokens, Caveat and Barlow. Bundled Noto Devanagari supplies Nepali and Hindi glyphs; its licence is in `fonts/`. There is no animation framework or runtime translation service.

`lk.seasonal.v1` stores only `{selection, motion, density}`, where `selection` is `auto` (On) or `off`. It lasts until changed or site data is cleared. Values are checked against fixed options; a design id saved by an older book reads as `auto`. A storage event synchronises other tabs. No staff profile, religion, nationality or kitchen data is inferred or saved. There are zero new Firestore reads, writes, rules or indexes. One local minute timer checks the corrected kitchen date; clock correction and returning to a tab also refresh selection.

All startup scripts, CSS and local fonts are included in the existing immutable public shell and both update lists. The manifest-aware generation protocol remains intact, including complete older-copy recovery. The source baseline is `59575ea`, also tagged locally as `seasonal-baseline-2026-11-03`. The release also preserves the current Ink in motion startup and save feedback from main. The private preview's fake Firebase, sample people, toolbar and disabled service worker are not shipped.

## Editorial status and maintenance

All 204 records have six authored explanation strings, 1,224 sentences. They are draft localisations, not native-speaker-certified translations. The copy registry retains `nativeSpeakerReviewed: false`, particularly relevant for Balinese register and regional terminology. Review or correct strings in `celebration-copy.js` without adding a runtime translator or language selector.

Annual dates are deliberately finite. Before a new year, check the calendar's `forYear(year).manualOnlyIds`, verify official local announcements, add dated records and source URLs, and run the calendar checks. Unannounced moon-sighting and local fiesta dates never inherit a guessed annual recurrence. Manual artwork remains available.

## Verification and rollback

Combined validation reproduced a recipe startup race on the previous live app as well as the themed build. An editor opened before its recipe response could stay on Recipe not found after the data arrived. The editor now recovers that exact missing recipe through the existing sync event or a fresh mount with an accepted cached copy, using its current edit and privacy-lock guards. Real drafts and kept changes retain their normal recovery flow. Stale SDK replies across a privacy lock remain discarded; the existing retry and wake path can fetch a fresh copy after valid unlock. The view recovery adds no reads or writes. The compatible editor keeps API 5 and loads at `manage.js?v=8`. The recipe jump tests wait for their existing target-position criteria so they do not inspect an unfinished native smooth scroll.

Celebration motion moves only `transform` and `opacity` (3 November 2026). The glow used to animate a drop shadow, because `css/seasonal-effects.css` redefined the lighter keyframes from `css/seasonal-brand.css`: on Diwali, with the CPU slowed 4 times, Prep spent 469 ms of every second on it and Home 769 ms. With one opacity-only glow they take 4 and 5 ms. `tests/seasonal.test.js` fails if a celebration animation on Home or in the top bar moves `filter` or `box-shadow`, or runs on an element with a filter.

`tests/seasonal.test.js` exercises the real app with fake Firebase: main and variant header effects, mobile ornaments, Home/work handoff, all six languages, no picker, focus and typing, Settings, Still, Off and reduced motion. `tests/seasonal-calendar.test.js` checks dates, overlaps, boundaries and finite annual coverage. `tests/seasonal-shell.test.js` checks atomic asset membership and nested script syntax. Existing saved-copy and shell-generation browser checks cover the expanded shell. The full click suite and required PR gate precede release; the live click suite follows Pages publication.

Revert this feature through a new PR to remove celebrations. Keep the current saved-shell generation protocol and access/session contract. The unused device preference is harmless and no kitchen records need reverting.

## Stamp review (4 November 2026)

An independent cultural-symbol review of six stamps, rendered at 24, 32, 44 and 200 px. Ganesh Chaturthi keeps its three modak. Five are redrawn in `js/seasonal/marks.js`:

- Nyepi: a lower split gate with three small stars. The crescent in the gap read as an Eid sign, and Nyepi fell the day before Eid al-Fitr in 2026.
- Galungan: a wider penjor sweep with a bell-shaped hanging ornament, no foot; it read as a back arrow.
- Kuningan: the tamiang keeps eight spokes, with a solid orange hub and four short strands; it read as a bullseye or a dreamcatcher.
- Sinulog: three candles at different heights over the river; two candles read as a pause button.
- Durga Puja: a dhak drum lying across, with its fan plume and a beater; the upright drum read as a takeaway cup.

The head chef confirmed all five on 4 November 2026.

## Working rules (moved from CLAUDE.md, 3 Nov 2026)

Preserve Home ambience behind the page, work pages that keep Kitchen Book and the chef hat (a stamp beside the name, a still edge in the top bar), arrive-then-settle motion that moves only transform and opacity, automatic six-language cycling, one celebration for everyone with no picker, On/Off and Still per device, and the immutable offline shell. The redesign record is `docs/celebration-options/brief.md`.
