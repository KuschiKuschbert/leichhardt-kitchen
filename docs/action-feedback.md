# After the tap

The rule every action in the book follows once someone taps it: a Save, Add, Tick, Remove, Send, Record, Undo or Refresh. Asked for by the head chef on 5 November 2026 ("the button got greyed out, nothing was scrolled or confirmed"); built from a source audit of all 307 actions and the service council. Evidence, designs and scores: [the options brief](action-feedback-options/brief.md). This note wins over older wording in feature notes about how a single page confirms a save.

## The rule

1. **Answer in the tap's own frame.** Something changes before the server is asked. A list line (add, tick, remove on Prep, Orders, Wastage, Transfers) shows at once with its slip, as since 4 Nov 2026; while the write waits, the line says Not sent and the floating band says Not sent yet. A form's Save button says Saving... at its own width (`svButton()`) and shows Saved, Sent or a green tick only once the write resolved: an answer from the cache, or a listener hearing this phone's own pending write, is not Saved (CLAUDE.md, Changes that went wrong before).
2. **Confirm where the eye is, in words.** Words say what changed and where: "Added Slice tomatoes to Sauce", "Saved 14:02. The sous chefs see the new cut-offs now.", "Undone: Slice tomatoes". Never "Added", "Done" or "Saved" alone when the thing has a name. A confirmation is never only a small grey line, never only at the top of a page whose button is lower down, and never behind an open sheet.
   - **A form's Save, Publish, Record or Send button** uses `svButton()` with `svStart()`, `svDone()` and `svFail()` (`js/prep.js`): Saved with a tick for 1.2 s once the write resolved, one waiting line after 4 s, Try again with a red line that stays. Lazy pages that cannot reach it keep their own button but follow the same four states, words and classes (`saveBtnHTML()` in `js/manage.js`).
   - **A button that changes while someone types** is changed in place with `btnPatch()` (`js/prep.js`, also `LK_PREP.btnPatch`), never replaced: leaving a box by tapping the button fires change between finger down and finger up, and a new element there loses the tap.
   - **An add, tick, remove or change on a list line** uses the docket slip (`toast()`), with Undo where the change can be undone.
3. **Clear the old words.** Once Saved shows, anything that belonged to the unsaved form goes or turns off: Undo unsaved changes, "Save to make the change", a Tap again still armed.
4. **Then leave the person where they are, with a stamp on what changed.** Chosen by the head chef on 5 November 2026 (the mix of A and C in [the options brief](action-feedback-options/brief.md)). Nothing scrolls by itself. What was saved wears a small green stamp, "Saved 14:02" (`.lk-stamp` in `css/app.css`), on the card or bar that changed and beside the Save button, until the page is left or it changes again. An add sheet stays ready for the next line and lists what it added ("Added just now", the last two, each with Undo); after Close the slip names the last line. Lines this phone just added wear "New 14:02" for 2 minutes.
5. **A failure stays and keeps the work.** Red, read out at once (`errMsg()`, `toast(..., 'bad')`, `role="alert"`), until the next try, an edit or OK. Never on a timer. Typed text goes back in its box (`failed(e, restore)`). A failed save takes its Undo with it (`dropUndo()`).
6. **Undo says Undone.** An Undo on the slip says "Undone: ..." with what it undid, unless what it ran says so itself ("Put back Milk on the order list", "Unticked Laksa. It is open again."). Untick, un-order and Put back name the line. A slip names the line through `slipName()` (cut after 40 letters, so the section always shows).
7. **A tap that cannot act says why.** An empty Add puts the cursor in the box and says what is missing; Refresh says when it last read ("Up to date, read 14:02") or why it could not.
8. **Colour carries meaning, never alone.** Orange is the accent, urgent, rolled and the counts; green (`--done-ink`) is saved and done; red is a failure. A switched-off button looks off (faint words, light edge), so it is never mistaken for one still waiting. Stamps are words in a box, never a fill. Reduce motion removes fades and slides, never the words.

## For a new action

Before the pull request, answer these for every new button or tap, the same questions the audit asked:

| Question | Where it goes |
| --- | --- |
| What changes in the tap's own frame? | Rule 1 |
| What confirms it after the server answers, in which words, and where is the person looking then? | Rule 2 |
| What do the old words do once it is saved? | Rule 3 |
| Where is the person afterwards: same place, the next line, the thing just saved? | Rule 4 |
| What does a failure show, how long, and is the typed work kept? | Rule 5 |
| Can it be undone, and what does Undo say? | Rule 6 |

## Tests

Check words and states, not animation or timing. In the click tests' stand-in, `window.__fake.mode = 'hold'` shows Saving..., `__fake.release()` gives the server's answer, `mode = 'fail'` the failure; `p.clock` holds the 1.2 s of Saved still (`tests/save-states.test.js` shows the pattern). A fix adds the check that fails on the old code first.

## Audit, 5 November 2026

Source only, every action traced from its button to what shows after it. 230 of 307 actions were clear, 71 easy to miss and 5 showed nothing. The patterns, the worst cases and the round 1 verdict are in [the options brief](action-feedback-options/brief.md). Built so far: step 1 (cut-offs and the recipe editor, off looks off) step 2a (slips name the line, Undone, New on new lines) step 2b (Added just now in the add sheets) and step 3a (the function editor and the functions band). Steps 3b and 3c are in the brief. Actions not covered by the build steps are brought in line when someone next works on that page; they are listed in `docs/open-work.md`, Bringing the code in line.
