/* Public celebration dates only. No Firestore reads, staff data or phone-clock assumptions.
   Call resolve(LK_TIME.day()) after the book's corrected Queensland clock is ready.
   Annual records expire with their year. A missing year is never guessed or copied forward. */
(function (root) {
  'use strict';
  var REVIEWED = '2026-11-03';
  var sources = {
    qld: { title: 'Queensland Government public holidays', url: 'https://www.qld.gov.au/recreation/travel/holidays/public' },
    easter: { title: 'Gregorian Easter calculation, US Naval Observatory', url: 'https://aa.usno.navy.mil/faq/easter' },
    mothers: { title: 'Mother\u2019s Day in Australia, ABC', url: 'https://www.abc.net.au/news/2017-05-13/history-of-mothers-day-from-civil-war-to-family-reunions/8517898' },
    fathers: { title: 'Father\u2019s Day in Australia, ABS', url: 'https://www.abs.gov.au/ausstats/abs@.nsf/Previousproducts/1350.0Feature%20Article121996?issue=1996&num=&opendocument=&prodno=1350.0&tabname=Summary&view=' },
    cup: { title: 'Victoria Racing Club, Cup Week history', url: 'https://www.vrc.com.au/about-vrc/the-history-of-the-vrc/history-of-cup-week/' },
    valentines: { title: 'Valentine\u2019s Day, Study Australia', url: 'https://www.studyaustralia.gov.au/en/tools-and-resources/tips-and-advice-for-students/celebrating-valentine-s-day-in-australia' },
    patricks: { title: 'Ireland public holidays', url: 'https://www.ireland.com/en/help-and-advice/practical-information/public-holidays/' },
    starwars: { title: 'Star Wars Day, Lucasfilm', url: 'https://www.starwars.com/star-wars-day' },
    coffee: { title: 'International Coffee Organization', url: 'https://ico.org/international-coffee-day/' },
    food: { title: 'World Food Day, FAO', url: 'https://www.fao.org/world-food-day/en/' },
    chefs: { title: 'International Chefs Day, Worldchefs', url: 'https://worldchefs.org/internationalchefsday/' },
    halloween: { title: 'Halloween, Encyclopaedia Britannica', url: 'https://www.britannica.com/topic/Halloween' },
    india26: { title: 'Government of India 2026 holiday list', url: 'https://cgca.gov.in/ccadl/list-of-holiday' },
    pongal26: { title: 'Chennai Central Government holiday order 2026', url: 'https://gstchennai.gov.in/wp-content/uploads/2025/12/CGEWCC-letter-dated-05.12.2025-regarding-List-of-Holiday-2026.pdf' },
    india27: { title: 'PFRDA signed Government of India holiday order 2027', url: 'https://www.pfrda.org.in/documents/33652/0/list_holidays_2027.pdf' },
    navratri26: { title: 'Navratri 2026, Ministry of Tourism India', url: 'https://www.incredibleindia.gov.in/en/festivals-and-events/navratri' },
    durga26: { title: 'West Bengal Durga Puja permission portal 2026', url: 'https://sahaj.wb.gov.in/' },
    navratri27: { title: 'BAPS annual festival calendar 2027', url: 'https://www.baps.org/Calendar/2027/FestivalList.aspx' },
    ph26: { title: 'Philippines Proclamation 1006, holidays 2026', url: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/99678' },
    ph27: { title: 'Philippines Proclamation 1427, holidays 2027', url: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/102791' },
    fitr26: { title: 'Philippines Proclamation 1189, Eid al-Fitr 2026', url: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/101036' },
    adha26: { title: 'Philippines Proclamation 1264, Eid al-Adha 2026', url: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/101531' },
    sinulog: { title: 'Sinulog Foundation, third Sunday of January', url: 'https://www.sinulogfoundationinc.com/' },
    pahiyas: { title: 'Pahiyas every 15 May, PhilHealth', url: 'https://www.philhealth.gov.ph/news/2017/joins_festival.html' },
    panagbenga26: { title: 'Panagbenga official 2026 dates, Philippine Information Agency', url: 'https://pia.gov.ph/news/baguio-city-bfffi-all-set-for-30th-staging-of-panagbenga-festival/' },
    kadayawan26: { title: 'Davao City Tourism Office, Kadayawan 2026', url: 'https://davaocity.gov.ph/tourism/ctoo-kadayawan-festival-2026-celebrates-unity-of-cultural-communities-settlers-guests/' },
    kadayawanFinale26: { title: 'Philippine Information Agency, Kadayawan main parade 16 August 2026', url: 'https://pia.gov.ph/news/mindanao/dr/thousands-witness-kadayawans-indak-indak-and-pamulak-festivities' },
    nepal26: { title: 'Nepal Embassy public holiday calendar 2083', url: 'https://br.nepalembassy.gov.np/pages/public-holidays-7/' },
    kathmandu26: { title: 'Kathmandu official BS/AD calendar, Kartik 2083', url: 'https://kathmandu.gov.np/en/calendar' },
    nyepi26: { title: 'Indonesia Ministry of Religious Affairs, Nyepi 2026', url: 'https://kemenag.go.id/nasional/menag-takbiran-di-bali-tetap-berjalan-dengan-penyesuaian-saat-nyepi-6cB27' },
    nyepi27: { title: 'Indonesia Cabinet Secretariat, national holidays 2027', url: 'https://setkab.go.id/en/govt-annnounces-2027-national-holidays-and-collective-leave-days/' },
    pawukon: { title: 'Badung Government, Galungan every 210 days and Kuningan ten days later', url: 'https://sita.badungkab.go.id/en/events/galungan-and-kuningan-day-meaning-traditions-and-celebrations-in-bali' },
    pawukonAnchor: { title: 'Bali Government, Galungan 17 June and Kuningan 27 June 2026', url: 'https://www.baliprov.go.id/web/hadiri-high-level-meeting-tpid-provinsi-bali-sekda-dewa-indra-pastikan-ketersediaan-pangan-dan-kebutuhan-masyarakat-tetap-aman/' }
  };
  var mainIds = ['au-christmas-day', 'au-easter-sunday', 'au-new-years-day', 'fun-valentines-day', 'au-mothers-day', 'au-fathers-day', 'au-melbourne-cup', 'fun-halloween', 'fun-star-wars-day', 'fun-coffee-day', 'fun-chefs-day', 'fun-st-patricks-day', 'fun-world-food-day', 'in-diwali', 'in-holi', 'in-pongal', 'in-onam', 'in-ganesh-chaturthi', 'in-navaratri', 'in-durga-puja', 'in-dussehra', 'np-dashain', 'np-tihar', 'np-nepali-new-year', 'np-buddha-jayanti', 'bali-nyepi', 'bali-galungan', 'bali-kuningan', 'ph-lunar-new-year', 'ph-eid-al-fitr', 'ph-eid-al-adha', 'ph-sinulog', 'ph-pahiyas', 'ph-panagbenga', 'ph-kadayawan', 'ph-independence-day'];
  var rules = [], annual = [];
  function fixed(id, month, day, sourceId, priority) { rules.push({ id: id, month: month, day: day, sourceId: sourceId, priority: priority || 20, kind: 'fixed-date' }); }
  function weekday(id, month, dow, occurrence, sourceId) { rules.push({ id: id, month: month, dow: dow, occurrence: occurrence, sourceId: sourceId, priority: 20, kind: 'weekday-rule' }); }
  function add(id, start, end, sourceId, region, priority, endSourceId) {
    var row = { id: id, start: start, end: end || start, sourceId: sourceId, region: region, priority: priority || 20, kind: 'annual-record' };
    if (endSourceId) row.endSourceId = endSourceId;
    annual.push(row);
  }
  fixed('au-new-years-day', 1, 1, 'qld');
  fixed('fun-valentines-day', 2, 14, 'valentines');
  fixed('fun-st-patricks-day', 3, 17, 'patricks');
  fixed('fun-star-wars-day', 5, 4, 'starwars');
  fixed('ph-pahiyas', 5, 15, 'pahiyas');
  fixed('ph-independence-day', 6, 12, 'ph26');
  fixed('fun-coffee-day', 10, 1, 'coffee');
  fixed('fun-world-food-day', 10, 16, 'food');
  fixed('fun-chefs-day', 10, 20, 'chefs', 30);
  fixed('fun-halloween', 10, 31, 'halloween', 30);
  fixed('au-christmas-eve', 12, 24, 'qld');
  fixed('au-christmas-day', 12, 25, 'qld');
  fixed('au-boxing-day', 12, 26, 'qld');
  fixed('au-new-years-eve', 12, 31, 'qld');
  weekday('ph-sinulog', 1, 0, 3, 'sinulog');
  weekday('au-mothers-day', 5, 0, 2, 'mothers');
  weekday('au-fathers-day', 9, 0, 1, 'fathers');
  weekday('au-melbourne-cup', 11, 2, 1, 'cup');
  rules.push({ id: 'au-easter-sunday', kind: 'gregorian-easter', sourceId: 'easter', priority: 20 });
  // The Pawukon cycle fixes festival dates, not public office closures. Keep both occurrences when a year has two.
  rules.push({ id: 'bali-galungan', kind: 'pawukon-cycle', sourceId: 'pawukon', anchor: '2026-06-17', priority: 20 });
  rules.push({ id: 'bali-kuningan', kind: 'pawukon-cycle', sourceId: 'pawukon', anchor: '2026-06-27', priority: 20 });
  // India: Tamil Pongal, Kerala Thiruvonam, Sharad Navaratri and Bengal Durga Puja retain their own dates.
  add('in-pongal', '2026-01-15', null, 'pongal26', 'Tamil Nadu');
  add('in-holi', '2026-03-04', null, 'india26', 'India, published central holiday');
  add('in-onam', '2026-08-26', null, 'india26', 'Kerala, Thiruvonam');
  add('in-ganesh-chaturthi', '2026-09-14', null, 'india26', 'India');
  add('in-navaratri', '2026-10-11', '2026-10-19', 'navratri26', 'Sharad Navaratri', 80);
  add('in-durga-puja', '2026-10-17', '2026-10-21', 'durga26', 'West Bengal', 70);
  add('in-dussehra', '2026-10-20', null, 'india26', 'India, Vijay Dashmi', 10);
  add('in-diwali', '2026-11-08', null, 'india26', 'India, Deepavali', 10);
  add('in-pongal', '2027-01-15', null, 'india27', 'Tamil Nadu');
  add('in-holi', '2027-03-23', null, 'india27', 'India, published central holiday');
  add('in-ganesh-chaturthi', '2027-09-04', null, 'india27', 'India');
  add('in-onam', '2027-09-12', null, 'india27', 'Kerala, Thiruvonam');
  add('in-navaratri', '2027-09-30', '2027-10-08', 'navratri27', 'Sharad Navaratri', 80);
  add('in-durga-puja', '2027-10-06', '2027-10-08', 'india27', 'Bengal Saptami through Mahanavmi', 70);
  add('in-dussehra', '2027-10-09', null, 'india27', 'India, Vijay Dashmi', 10);
  add('in-diwali', '2027-10-29', null, 'india27', 'India, Deepavali', 10);
  add('ph-lunar-new-year', '2026-02-17', null, 'ph26', 'Philippines');
  add('ph-lunar-new-year', '2027-02-06', null, 'ph27', 'Philippines');
  add('ph-eid-al-fitr', '2026-03-20', null, 'fitr26', 'Philippines, proclaimed date');
  add('ph-eid-al-adha', '2026-05-27', null, 'adha26', 'Philippines, proclaimed date');
  add('ph-panagbenga', '2026-02-01', '2026-03-08', 'panagbenga26', 'Baguio, announced festival window', 90);
  add('ph-kadayawan', '2026-08-07', '2026-08-16', 'kadayawan26', 'Davao, opening through main parade', 90, 'kadayawanFinale26');
  add('np-nepali-new-year', '2026-04-14', null, 'nepal26', 'Nepal, 1 Baisakh 2083');
  add('np-buddha-jayanti', '2026-05-01', null, 'nepal26', 'Nepal');
  add('np-dashain', '2026-10-21', null, 'kathmandu26', 'Nepal, Vijaya Dashami', 10);
  add('np-tihar', '2026-11-07', '2026-11-11', 'kathmandu26', 'Nepal, Kaag Tihar through Bhai Tika', 70);
  add('bali-nyepi', '2026-03-19', null, 'nyepi26', 'Bali, Saka New Year');
  add('bali-nyepi', '2027-03-08', null, 'nyepi27', 'Bali, Saka New Year');

  function leap(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
  function parse(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    var a = value.split('-').map(Number), days = [31, leap(a[0]) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return a[0] >= 1583 && a[1] >= 1 && a[1] <= 12 && a[2] >= 1 && a[2] <= days[a[1] - 1] ? { year: a[0], month: a[1], day: a[2] } : null;
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function ymd(year, month, day) { return year + '-' + pad(month) + '-' + pad(day); }
  function nthWeekday(year, month, target, occurrence) {
    // Date is constructed from an explicit calendar date, never the phone's current clock or zone.
    return 1 + (target - new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 7) % 7 + 7 * (occurrence - 1);
  }
  function easter(year) {
    // Meeus/Jones/Butcher Gregorian computus. The astronomical full moon is not substituted for the ecclesiastical rule.
    var a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return ymd(year, Math.floor((h + l - 7 * m + 114) / 31), (h + l - 7 * m + 114) % 31 + 1);
  }
  function publicRecord(row) {
    var result = Object.assign({}, row, { source: sources[row.sourceId].url, sourceTitle: sources[row.sourceId].title, reviewedOn: REVIEWED });
    if (row.kind === 'pawukon-cycle') result.anchorSource = sources.pawukonAnchor.url;
    if (row.endSourceId) result.endSource = sources[row.endSourceId].url;
    return result;
  }
  function candidates(value) {
    var date = parse(value);
    if (!date) return [];
    var matches = annual.filter(function (row) { return value >= row.start && value <= row.end; });
    rules.forEach(function (rule) {
      var day;
      if (rule.kind === 'pawukon-cycle') {
        var anchor = rule.anchor.split('-').map(Number);
        var elapsedDays = (Date.UTC(date.year, date.month - 1, date.day) - Date.UTC(anchor[0], anchor[1] - 1, anchor[2])) / 86400000;
        if (elapsedDays % 210 === 0) matches.push(Object.assign({}, rule, { start: value, end: value, region: 'Bali, Pawukon festival date' }));
        return;
      }
      day = rule.kind === 'gregorian-easter' ? easter(date.year) : ymd(date.year, rule.month, rule.kind === 'weekday-rule' ? nthWeekday(date.year, rule.month, rule.dow, rule.occurrence) : rule.day);
      if (day === value) matches.push(Object.assign({}, rule, { start: day, end: day }));
    });
    return matches.sort(function (a, b) {
      // Exact days take precedence over festival windows, then explicit priority, then a stable id tie-break.
      return Number(a.start !== a.end) - Number(b.start !== b.end) || a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    }).map(publicRecord);
  }
  function forYear(year) {
    var ids = rules.map(function (row) { return row.id; }).concat(annual.filter(function (row) { return +row.start.slice(0, 4) === +year; }).map(function (row) { return row.id; }));
    return { year: +year, automaticIds: mainIds.filter(function (id) { return ids.indexOf(id) >= 0; }), manualOnlyIds: mainIds.filter(function (id) { return ids.indexOf(id) < 0; }) };
  }
  var api = {
    resolve: function (value) { return candidates(value)[0] || null; }, candidates: candidates, forYear: forYear,
    coverage: { reviewedOn: REVIEWED, timeZone: 'Australia/Brisbane', annualYears: [2026, 2027], mainFamilyCount: 36,
      perpetualIds: rules.map(function (rule) { return rule.id; }),
      note: 'Only published dates activate automatically. Unannounced local events and future moon-sighting dates remain available through Choose a theme. Annual dates need review before their next year.' },
    records: function () { return annual.map(publicRecord); },
    sources: Object.keys(sources).map(function (id) { return Object.assign({ id: id, reviewedOn: REVIEWED }, sources[id]); })
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KB_SEASONAL_CALENDAR = api;
})(typeof window !== 'undefined' ? window : null);
