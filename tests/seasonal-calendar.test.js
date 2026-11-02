// Pure public-calendar checks. Never reads or writes Firebase, and never reads the machine's current date.
const calendar = require('../js/seasonal/calendar.js');
const results = [], ok = (condition, message) => results.push((condition ? 'PASS ' : 'FAIL ') + message);
const active = day => (calendar.resolve(day) || {}).id;
const cases = {
  '2026-11-03': 'au-melbourne-cup', '2027-11-02': 'au-melbourne-cup', '2028-11-07': 'au-melbourne-cup',
  '2026-05-10': 'au-mothers-day', '2027-05-09': 'au-mothers-day', '2026-09-06': 'au-fathers-day', '2027-09-05': 'au-fathers-day',
  '2026-04-05': 'au-easter-sunday', '2027-03-28': 'au-easter-sunday', '2028-04-16': 'au-easter-sunday',
  '2008-03-23': 'au-easter-sunday', '2038-04-25': 'au-easter-sunday',
  '2026-12-24': 'au-christmas-eve', '2026-12-25': 'au-christmas-day', '2026-12-26': 'au-boxing-day',
  '2026-12-31': 'au-new-years-eve', '2027-01-01': 'au-new-years-day',
  '2027-02-14': 'fun-valentines-day', '2027-03-17': 'fun-st-patricks-day', '2027-05-04': 'fun-star-wars-day',
  '2027-10-01': 'fun-coffee-day', '2027-10-16': 'fun-world-food-day', '2027-10-20': 'fun-chefs-day', '2027-10-31': 'fun-halloween',
  '2026-01-15': 'in-pongal', '2026-03-04': 'in-holi', '2026-08-26': 'in-onam', '2026-09-14': 'in-ganesh-chaturthi',
  '2026-10-11': 'in-navaratri', '2026-10-17': 'in-durga-puja', '2026-10-20': 'in-dussehra', '2026-11-08': 'in-diwali',
  '2027-01-15': 'in-pongal', '2027-03-23': 'in-holi', '2027-09-04': 'in-ganesh-chaturthi', '2027-09-12': 'in-onam',
  '2027-09-30': 'in-navaratri', '2027-10-06': 'in-durga-puja', '2027-10-09': 'in-dussehra', '2027-10-29': 'in-diwali',
  '2026-04-14': 'np-nepali-new-year', '2026-05-01': 'np-buddha-jayanti', '2026-10-21': 'np-dashain',
  '2026-11-07': 'np-tihar', '2026-11-09': 'np-tihar', '2026-11-11': 'np-tihar',
  '2026-03-19': 'bali-nyepi', '2027-03-08': 'bali-nyepi',
  '2026-06-17': 'bali-galungan', '2026-06-27': 'bali-kuningan',
  '2027-01-13': 'bali-galungan', '2027-01-23': 'bali-kuningan', '2027-08-11': 'bali-galungan', '2027-08-21': 'bali-kuningan',
  '2026-02-17': 'ph-lunar-new-year', '2027-02-06': 'ph-lunar-new-year',
  '2026-03-20': 'ph-eid-al-fitr', '2026-05-27': 'ph-eid-al-adha',
  '2026-01-18': 'ph-sinulog', '2027-01-17': 'ph-sinulog', '2027-05-15': 'ph-pahiyas', '2027-06-12': 'ph-independence-day',
  '2026-02-01': 'ph-panagbenga', '2026-03-08': 'ph-panagbenga', '2026-08-07': 'ph-kadayawan', '2026-08-16': 'ph-kadayawan'
};
Object.entries(cases).forEach(([day, expected]) => ok(active(day) === expected, day + ' selects ' + expected + ' (got ' + active(day) + ')'));

['', null, undefined, 20261103, '2026-2-03', '2026-02-30', '2026-13-01', '2026-00-01', '2026-01-00', '2026-11-03T00:00:00Z', '2026-11-03<script>', '0000-01-01', '2100-02-29'].forEach(day => {
  ok(calendar.resolve(day) === null && calendar.candidates(day).length === 0, 'invalid input has no theme: ' + JSON.stringify(day));
});
ok(calendar.resolve('2028-02-29') === null, 'valid leap day works without a fabricated occasion');
ok(active('2026-11-02') !== 'au-melbourne-cup' && active('2026-11-04') !== 'au-melbourne-cup', 'Cup uses its Queensland calendar day only');
ok(active('2026-12-28') !== 'au-boxing-day', 'substitute office holiday does not move Boxing Day');
ok(active('2026-03-09') !== 'ph-panagbenga', 'announced Panagbenga window ends after 8 March');
ok(active('2026-08-17') !== 'ph-kadayawan', 'announced Kadayawan core window ends after 16 August');
ok(active('2026-11-06') !== 'np-tihar' && active('2026-11-12') !== 'np-tihar', 'Tihar uses festival days, not extra government leave');
const diwaliOverlap = calendar.candidates('2026-11-08');
ok(diwaliOverlap.map(row => row.id).join(',') === 'in-diwali,np-tihar', 'exact Diwali day precedes Tihar window without losing either candidate');
ok(calendar.candidates('2026-10-20').map(row => row.id).join(',') === 'in-dussehra,fun-chefs-day,in-durga-puja', 'exact cultural day beats fun day and longer overlapping window in stable order');
ok(calendar.candidates('2026-02-14').map(row => row.id).join(',') === 'fun-valentines-day,ph-panagbenga', 'Valentine\u2019s exact day takes priority over month-long festival');
ok(calendar.candidates('2027-10-01').map(row => row.id).join(',') === 'fun-coffee-day,in-navaratri', 'exact food occasion wins during the Navaratri window');
ok(active('2026-10-21') === 'np-dashain' && active('2026-10-20') === 'in-dussehra', 'Nepal Dashami is not copied from India\u2019s Dussehra date');
ok(active('2026-06-18') !== 'bali-galungan' && active('2026-06-26') !== 'bali-kuningan', 'Pawukon cycle activates on its exact festival days');
ok(calendar.forYear(2026).automaticIds.length === 36 && calendar.forYear(2026).manualOnlyIds.length === 0, 'all main 36 families have sourced 2026 dates');
ok(calendar.forYear(2027).automaticIds.length === 28 && calendar.forYear(2027).manualOnlyIds.length === 8, '2027 coverage reports eight pending annual records honestly');
['np-dashain', 'np-tihar', 'np-nepali-new-year', 'np-buddha-jayanti', 'ph-eid-al-fitr', 'ph-eid-al-adha', 'ph-panagbenga', 'ph-kadayawan'].forEach(id => {
  ok(calendar.forYear(2027).manualOnlyIds.includes(id), id + ' is not inferred for 2027');
});
ok(calendar.forYear(2028).manualOnlyIds.includes('in-diwali') && active('2028-11-08') !== 'in-diwali', 'annual Hindu dates expire rather than repeating last year\u2019s Gregorian date');
ok(active('2027-03-20') !== 'ph-eid-al-fitr', 'Eid al-Fitr 2026 proclamation does not leak into 2027');
ok(!calendar.coverage.perpetualIds.includes('au-australia-day') && !calendar.coverage.perpetualIds.includes('au-summer'), 'automatic mode excludes optional civic and seasonal designs');
ok(calendar.coverage.timeZone === 'Australia/Brisbane', 'calendar documents the corrected kitchen date boundary');
const records = calendar.records();
ok(records.every(row => /^https:\/\//.test(row.source) && row.sourceTitle && row.reviewedOn === '2026-11-03'), 'every annual record carries a review date and source');
const changed = calendar.resolve('2026-11-03'); changed.id = 'not-a-theme';
ok(active('2026-11-03') === 'au-melbourne-cup', 'consumer changes cannot mutate calendar rules');
const zone = process.env.TZ;
process.env.TZ = 'Pacific/Honolulu'; const west = active('2027-01-13');
process.env.TZ = 'Pacific/Kiritimati'; const east = active('2027-01-13');
if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone;
ok(west === 'bali-galungan' && east === west, 'device timezone does not shift Pawukon dates');

results.forEach(line => console.log(line));
const failed = results.filter(line => line.startsWith('FAIL')).length;
console.log(failed + ' failed of ' + results.length);
process.exit(failed ? 1 : 0);
