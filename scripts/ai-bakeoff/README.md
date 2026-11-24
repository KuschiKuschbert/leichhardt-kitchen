# AI drawing bake-off

The test the council asked for before any AI goes into the drawing studio (`docs/ai-drawing-options/brief.md`). Claude lays out every plated dish from the book's own parts and library pieces. Each plate is scored against Draw it for me's with `tests/plating-check.js`, and the head chef picks blind on 15 dishes. Nothing here is loaded by the book or the click tests, and nothing is written to Firestore.

## What Claude is sent

The recipes as they are in `js/data.js` (already public), the library pieces' names and sizes, the servingware names and the book's house style. No staff, no prices, no Firestore data. The venue is not named.

## Running it

Needs a Claude API key in `LK_BAKEOFF_API_KEY`. The key is read from its own variable, so nothing else on the machine picks it up by itself. Use a key made for this, in a Claude Console workspace with a spend limit, and delete the key afterwards.

```bash
cd scripts/ai-bakeoff && npm install
node run.js --selftest        # no API call: the conversion and the scoring are faithful
node run.js --only chicken-adobo,wedges,caesar   # a 3-dish pilot: real cost and wait
node run.js                   # the rest, stopping before US$15 (--cap to change it)
node report.js                # docs/ai-drawing-options/bakeoff/: summary.md, results.json, blind.html
```

- `run.js` keeps each answer in `results/<dish id>.json` (not in the repo) and skips a dish already done, so a stopped run carries on. It stops before a call once the money spent, counted from each answer's real token counts, would pass the cap.
- Model `claude-opus-5-5`, effort `medium` (`--effort` to change it), the answer held to a JSON schema, the long part of the prompt cached. A declined request is answered by a fallback model, and `report.js` counts those.
- `report.js` puts the blind page's key (which side is Claude) in `results/key.json`, so it stays out of the repo until the head chef has picked.
- `shot.js <page> <png> <width> <height>` takes a picture of a page (`CHROME=` the browser, as for the click tests).

## What it can and cannot show

- A plate is scored with the same measures as Draw it for me's own gate. `--selftest` turns six of the book's own plates into answers and back, and each scores exactly the same.
- Claude places pieces; it cannot reshape them the way Draw it for me does while laying out (a swoosh into a drizzle). It can pick a drizzle piece instead.
- Pans, side views and builds are not in the test: a batch card's pan is drawn from the card itself as one part, so there is nothing to place.
