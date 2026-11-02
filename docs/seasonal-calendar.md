# Seasonal calendar

Automatic mode selects one of the 36 approved main festival families, plus Christmas Eve, Boxing Day and New Year’s Eve. Optional designs remain manual choices. These are celebration dates, not a roster or substitute public-holiday calendar.

`js/seasonal/calendar.js` is a public, offline date registry. It reads no kitchen records and makes no network requests. Its caller supplies `LK_TIME.day()` after the corrected Queensland clock is ready. The resolver never reads the phone’s current date or timezone. A changed clock or new kitchen day must ask the resolver again.

`KB_SEASONAL_CALENDAR.resolve(day)` returns the winning record or `null`. `candidates(day)` returns every matching record in order. `forYear(year)` reports automatic and manual-only main IDs. Each annual record includes its region, source URL and review date. `records()` and `sources` expose the review trail.

## Overlaps and windows

An exact day outranks a festival window. Explicit numeric priority then a stable ID ordering breaks ties. Cultural exact days outrank fun days where both coincide. Only the first result is drawn. The other artwork remains available through Choose a theme.

For example, Diwali on 8 November 2026 takes precedence over the 7 to 11 November Tihar window. Nepal’s Vijaya Dashami is 21 October 2026, distinct from India’s Dussehra on 20 October. Navaratri and Bengal Durga Puja retain separate windows and priorities. No nationality or religion is inferred from staff records.

Australian Mother’s Day is the second Sunday in May, Father’s Day the first Sunday in September, and Melbourne Cup the first Tuesday in November. Sinulog’s main day is the third Sunday in January. Christmas, shared food/fun days, Philippine Independence Day and Pahiyas use their Gregorian celebration date. Easter uses Gregorian computus.

Galungan repeats every 210 days in the Pawukon calendar; Kuningan is ten days later. The calculation is anchored to 17 and 27 June 2026, confirmed by the Bali provincial government. It retains both January and August occurrences in 2027. These are calculated religious festival dates, not a claim about annual office closures.

## Coverage reviewed on 3 November 2026

All 36 main families have a sourced date or window for 2026. Twenty-eight have automatic coverage for 2027. Eight are deliberately manual until a matching annual publication is verified:

- Nepal: Dashain, Tihar, Nepali New Year and Buddha Jayanti. The verified 2083 calendar ends in April 2027; a 2084 publication was not available in this review.
- Philippines: Eid al-Fitr and Eid al-Adha. Their 2027 proclamations depend on local confirmation.
- Philippines: Panagbenga and Kadayawan. Their detailed 2027 festival schedules had not been verified. No last-weekend or third-week assumption is used.

Annual records expire at the end of their own year. Dates for later years are not copied forward. Recurring fixed, weekday, Easter and Pawukon rules continue. A missing annual date shows the ordinary book unless another verified occasion matches. All drawings remain selectable manually. This is not a complete automatic calendar for every future year.

Review annual publications before each new year, and Nepal’s 2084 list when published in early 2027. Add records with the exact region and source; update the coverage text and calendar tests together. Do not turn an approximate moon date into an automatic record. No runtime holiday API or extra dependency is required.

## Primary date sources

| Coverage | Source |
| --- | --- |
| Australian fixed dates | [Queensland Government](https://www.qld.gov.au/recreation/travel/holidays/public) |
| Easter rule | [US Naval Observatory](https://aa.usno.navy.mil/faq/easter) |
| India 2026 central dates | [Government of India CCA Delhi](https://cgca.gov.in/ccadl/list-of-holiday) |
| Tamil Pongal 2026 | [Chennai Central Government holiday order](https://gstchennai.gov.in/wp-content/uploads/2025/12/CGEWCC-letter-dated-05.12.2025-regarding-List-of-Holiday-2026.pdf) |
| India 2027 dates | [PFRDA signed holiday order, 13 August 2026](https://www.pfrda.org.in/documents/33652/0/list_holidays_2027.pdf) |
| Sharad Navaratri 2026 | [India Ministry of Tourism](https://www.incredibleindia.gov.in/en/festivals-and-events/navratri) |
| Sharad Navaratri 2027 | [BAPS published annual festival calendar](https://www.baps.org/Calendar/2027/FestivalList.aspx) |
| Bengal Durga Puja 2026 | [West Bengal Government permission portal](https://sahaj.wb.gov.in/) |
| Nepal New Year and Buddha Jayanti 2026 | [Nepal Embassy, Brasilia](https://br.nepalembassy.gov.np/pages/public-holidays-7/) |
| Nepal Dashain and Tihar 2026 | [Kathmandu Metropolitan City calendar, Kartik 2083](https://kathmandu.gov.np/en/calendar) |
| Nyepi 2026 | [Indonesia Ministry of Religious Affairs](https://kemenag.go.id/nasional/menag-takbiran-di-bali-tetap-berjalan-dengan-penyesuaian-saat-nyepi-6cB27) |
| Nyepi 2027 | [Indonesia Cabinet Secretariat](https://setkab.go.id/en/govt-annnounces-2027-national-holidays-and-collective-leave-days/) |
| Pawukon recurrence | [Badung Government tourism](https://sita.badungkab.go.id/en/events/galungan-and-kuningan-day-meaning-traditions-and-celebrations-in-bali) |
| Pawukon anchor | [Bali provincial government, 12 June 2026](https://www.baliprov.go.id/web/hadiri-high-level-meeting-tpid-provinsi-bali-sekda-dewa-indra-pastikan-ketersediaan-pangan-dan-kebutuhan-masyarakat-tetap-aman/) |
| Philippines 2026 and 2027 Lunar New Year | [Proclamation 1006](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/99678), [Proclamation 1427](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/102791) |
| Philippines Eid al-Fitr 2026 | [Proclamation 1189](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/101036) |
| Philippines Eid al-Adha 2026 | [Proclamation 1264](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/101531) |
| Sinulog annual main day | [Sinulog Foundation](https://www.sinulogfoundationinc.com/) |
| Pahiyas annual day | [PhilHealth](https://www.philhealth.gov.ph/news/2017/joins_festival.html) |
| Panagbenga 2026 window | [Philippine Information Agency](https://pia.gov.ph/news/baguio-city-bfffi-all-set-for-30th-staging-of-panagbenga-festival/) |
| Kadayawan 2026 opening through main parade | [Davao City Tourism Office, 7 August opening](https://davaocity.gov.ph/tourism/ctoo-kadayawan-festival-2026-celebrates-unity-of-cultural-communities-settlers-guests/), [Philippine Information Agency, 16 August parade](https://pia.gov.ph/news/mindanao/dr/thousands-witness-kadayawans-indak-indak-and-pamulak-festivities) |

Holi and other lunisolar observances may differ between regional traditions. The India records follow the named published central schedule; they do not silently schedule a Nepal variant. The registry preserves source and region rather than claiming one universal festival date.

`tests/seasonal-calendar.test.js` checks known dates, invalid and leap-day input, inclusive window edges, exact-day priorities, the separate Nepal/India dates, both 2027 Pawukon rounds, timezone independence, record expiry and explicit incomplete-year coverage.
