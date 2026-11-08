# Operandio cooling pings: proposal

Design work only, 8 November 2026. The owner asks for design ideas before changing the app.

## Confirmed request

Everyone in the kitchen can start the named Operandio batch cooling timer with a tick. It has a 2-hour stage, then a further 4-hour stage. Each stage ending produces a ping on everyone's screen, using the existing shift-ping style and kitchen sound. Operandio is always the name. This replaces the single-device interpretation in draft PR #610. The existing draft stays unshipped while this shared design is considered.

The owner confirmed that someone must tick to start the second, 4-hour stage after the first ping. Its 4 hours are measured from that second tick, never automatically from the first deadline. These are sequential durations, not alerts at 2 and 4 hours after the first start.

## Need and smallest scope

A shared batch can outlast the person or device that started it. One kitchen-wide record keeps the first start and stage deadlines, and everyone sees the same state. The start must be acknowledged by the server before saying everyone has it. A second person's tick cannot reset it. Begin with one active Operandio batch; restarting is explicit after completion. No editable title or general-purpose ping editor is required.

Candidate placements are a small clock with a shared timer sheet, a dedicated cooling line on Prep, or a cooling section inside the existing Pings sheet. No change to ordinary Prep completion semantics should happen silently. Other list tasks keep their existing tap counts.

## Relevant existing behaviour

Shift pings already have the desired sheet, sound, per-person Got it, and coordination with typing, login, other sheets and live Undo. They are read once a day, after 30 minutes away or a config stamp; they are not a live countdown listener. Current pings expire after 30 minutes, and are written only by chefs. A general permission grant to write pings would be broader than this request.

Propose a narrow shared cooling action for active kitchen staff, retaining sign-in and session checks. Reuse the presentation and sound, but store shared cooling state independently or as a tightly validated dedicated subtype. This needs server rules and race testing before implementation. Exact read costs require measurement; this is not a zero-read feature.

Each person's Got it closes their ping only. It does not acknowledge for the kitchen, stop another person's alert or claim the batch passed a temperature check. Late arrivals must still see relevant stage state; do not blindly inherit the normal 30-minute expiry for an unresolved stage. On-screen delivery means the signed-in app when visible and able to run; closed/sleeping phones need a separate push capability and are not promised by these mockups.

## Service rules and evidence

Use the existing cream, charcoal and orange, Barlow headings, 44 px targets and standard bottom sheet. No extra tabs. User explicitly requests the alarm pop-up. It must still queue behind active input and login. Do not hide or move existing Prep actions.

Baseline screenshot: baseline-390.png, captured from the current main synthetic fixture. Main baseline at 390 x 844 has a 64 px header and first prep row at 323 px in the synthetic sous-chef fixture. Prior clipping-aware count found 4 full rows. Proposed designs require their own measurements and 390, 768 and 1280 px previews.

## Cost and risk

Design files only now. A future implementation touches shared timer state, app/ping UI, Firestore rules, tests and operational notes. Main risks: duplicated starts, wrong stage start, someone hiding a ping for others, misleading offline confirmation, daily lock/midnight handling, and assuming browser timers ring closed phones. Test multi-device state, immutable first start, role boundaries, recovery, both stage pings and saved-shell compatibility.
