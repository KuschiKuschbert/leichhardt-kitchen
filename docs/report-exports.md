# Report exports

All Download CSV actions use the shared `csvCell()` and `downloadCSV()` boundary in `js/prep.js`: Insights, Team, Transfers, the minutes register and Wastage history.

## Cell contract

- Text beginning with `=`, `+`, `-` or `@`, including after whitespace or control characters, gets one leading apostrophe so spreadsheet readers treat it as text. A leading tab, carriage return or line feed also receives that literal-text marker.
- Actual numeric values retain their type and meaning, including zero and signed legacy values. A string that looks numeric remains text when the literal-text rule applies.
- Commas, quotes, carriage returns and line feeds stay within their cell using CSV quoting and doubled quotes. Ordinary words, Unicode and multiline notes otherwise round-trip unchanged.
- Keep the existing UTF-8 BOM, report filenames, dates, filters, column order and record order.
- Export changes no saved record, role, read query or data value. Wastage uses the shared boundary rather than a second report-specific text pass.

Spreadsheet programs differ in CSV import behaviour. The apostrophe is an export-only literal marker, not a change to stored kitchen text. Keep the generated file as data when importing it elsewhere.

## Verification

`tests/csv-text.test.js` downloads all five reports through their actual controls with synthetic text. It parses the files independently to check cell boundaries, literal markers, multiline values, numeric zero and a signed legacy number, and confirms zero new reads or writes from export. Existing Wastage history checks retain filter/date/totals parity.

## Release and rollback

Client-only change. No rules publication, index, migration or dependency change. Revert the client change through a normal PR if a compatible correction is needed. Previously downloaded files remain unchanged.
