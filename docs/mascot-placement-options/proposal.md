# Put the kitchen mascot where it earns its place

10 November 2026, Queensland. Decision proposal, not an approved app change. Source: `69589ff6590d20d4ec5a4ed7f1dfcbf201007b5a`; application files match `origin/main` at `7f85629`. The owner asks how the finished assets should fit the existing app. This review uses synthetic records, not real staff research.

## The need

The owner wants the Kitchen Book to feel like the Leichhardt kitchen: country hospitality, generous burgers and pride in house-smoking on its offset smoker. The finished library supplies eleven consistent pixel-art actions. The app currently has a full-name Home welcome, staff-first shift/break/team cards, quiet recipe cards, native wait/save feedback and seasonal decoration. There is no mascot in the live app. Staff encounter Home on arrival and recipes during preparation and service. Branding is the benefit to test; there is no evidence that a mascot speeds up a kitchen task.

## Proposed scope to assess

Find a small, coherent role for the mascot through three later design alternatives: a brief Home greeting; food-specific illustration within an existing recipe; or a contained, user-invoked home for the animation collection. Keep the canonical gold star, cyan face, navy patterned bandana and apron. Keep the app's paper, charcoal, typography and operational colours. The offset smoker belongs with house-smoked food, not every burger. Show all three credible alternatives before selecting a placement.

The proposal adds no tab, fixed floating pet, speech bubble over work, AI assistant, kitchen write, timer or progress claim. Ingredients, method, portion and verified plating drawings remain authoritative. An animation of cooking is illustrative; it must not imply a recorded cook, safe temperature, timer state or server acknowledgement. Extra actions can remain unused if they have no useful location. The animation gallery remains the complete collection outside the service workflow.

## Cost and constraints

There are 11 compact lossless atlases totalling 3,136,082 bytes, roughly 250–326 KB per clip, plus stills. Master art and exported GIFs do not belong in the app shell. The design must specify which assets load, when playback stops and what still/offline failure shows. A later implementation would need a small shared sprite player, narrow Home/recipe hooks, stylesheet rules and focused lifecycle/layout tests. No animation framework, Firebase reads, listeners, rules, profile fields or operational state machine are required. Any startup-file change must follow the complete saved-shell contract. Optional art must not become a condition for opening a recipe offline.

The main risk is displacement and distraction, especially alongside existing seasonal Home art. Second is implying readiness or success. Third is adding asset/update cost for a decoration. Text and live targets must stay still; reduced motion uses a still, hidden/offscreen playback stops, and missing art leaves the task usable. Baseline measurements in `baseline/baseline.json` and actual-app screenshots establish what the proposals must preserve. Preview evidence will be labelled separately from delivered app evidence.

## Questions for round 1

Is this worth building, and if so how small? Where would it help staff recognise the kitchen without obscuring their job? Which of the proposed locations should be cut? Identify evidence needed for long names, existing celebration art, recipe density, unavailable artwork and truthful pending/failure states. Apply Linear's work-first frame, Things' optional detail, Airbnb's complete task context, Flighty's real state, Duolingo's truthful feedback and Headspace's calm wording. Todoist's quick-add principle matters only as a constraint on unchanged work lists.
