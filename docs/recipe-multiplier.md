# Multiply recipe amounts

Requested 1 November 2026. In the existing recipe form, the head chef, sous chefs and verified Google admin can multiply the current ingredient amounts, review them and Save through the existing versioned write path.

## Behaviour and acceptance

- Ingredients has a Multiply amounts by box and Apply multiplier. A positive decimal such as 2 or 0.5 scales the current draft. Typing a factor alone changes no recipe data. Invalid, zero, negative and non-finite factors change nothing and explain the error.
- Clear numbers, decimals, common fractions, metric units, piece counts, kitchen measures and simple ranges multiply. Units and qualifiers such as About and total stay as written. The shared `LK_AMT.scale()` reuses the amount reader's fraction maths without changing `parse()`, order grouping or learning.
- Blank amounts, placeholders, alternatives and unclear text stay as written. The form lists those ingredients under Check by hand. Results use up to six decimal places; amounts outside the representable range stay for the chef to check.
- The portion or batch line and method stay as written. They mix serving sizes, temperatures and timings, so the form explicitly asks the chef to check them before saving. Linked recipes themselves, ingredient notes, allergens and drawings are not multiplied.
- Apply changes the draft only. The factor becomes 1 afterwards to prevent an accidental repeat. Undo multiplier restores the last application, following moved rows and retaining later manual quantity edits.
- Existing kept drafts, sign-out clearing, Save validation, server version checks, immutable history and public mirrors handle persistence. No new database fields, reads, rules, services or dependencies. The multiplier and its Undo state are local to the open form; changed quantities use the existing draft format.
- Access uses `LK_PREP.bookEdit()` at rendering and application. Existing route and server restrictions continue to enforce recipe write permissions for the same three roles. Mixed clients without the new shared helper omit the control until the book updates.

## Verification

`tests/amounts.test.js` covers arithmetic, fractions, ranges, unsupported text and invalid or unrepresentable factors. `tests/recipe-multiplier.test.js` exercises head chef, sous chef and admin, other-role rejection, draft recovery, Undo, invalid input, safe text, real save shapes, history, public mirroring, reload and 390/768/1280 px layouts against the Firebase stand-in.

Rollback: revert this change through a fresh branch and pull request. Saved quantities remain ordinary recipe amounts and work in older clients. Earlier versions remain available through the existing recipe history.
