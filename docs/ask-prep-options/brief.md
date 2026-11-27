# Ask Prep case study

Verdict: Build smaller. Five independent role reviews supported a personal-phone study with proposed ticks. No shift observations have been collected. Source baseline 08fc022. This first experiment uses invented prep lines and a real model adapter. It has no Kitchen Book session and makes zero Firestore calls.

## Design choice

| Option | What the chef does | Benefit | Trade-off |
| --- | --- | --- | --- |
| A. Inline Prep microphone | Open Prep, tap Talk alongside the list | Current section and lines in view | Another control near working tick targets. An earlier Prep bar covered a tick. Measure full-shell density before adoption. |
| B. Personal study page | Open the study once, tap Talk, then ask a follow-up | Stop and scored outcomes are visible. Existing Prep task costs are unchanged. | Switching pages takes attention. Foreground, unlocked phone required. |
| C. Headset shortcut | Press a headset control from the pass | Potential use with occupied hands | Activation, visible recording feedback and locked-phone behaviour need actual device evidence. |

Recommend B for the first service. All five reviewers preferred B. Normalised scores out of ten for A/B/C: Keeper 7/8/3, Skeptic 6/10/4, service chef 6/8/4, new starter 7/8/3, operator 6/10/4. These are judgements, not shift data. An A+B+C mix would make it harder to tell which interaction succeeded. A later inline version could reuse the existing tick path in js/prep.js. Shared-screen attribution, capability, day, section renames, active session, cache freshness and server acknowledgement must all be exercised before operational writes.

## Run the pilot

From this directory, use Node 22+ and run `node --test trial.test.mjs`. Supply a server-side `OPENAI_API_KEY` through your secret manager, then run `node server.mjs` and open http://localhost:8787. Optional `TRIAL_MODEL` selects a Chat Completions model supporting JSON objects. Without a key the UI and timed touch comparison work and model requests report unavailable. For a phone, use a private authenticated HTTPS reverse proxy to the loopback server. The server is intended for one supervised participant. Do not expose it directly to the public internet. The trial is independent of GitHub Pages. Pages alone cannot run the model adapter.

Talk uses the browser's speech recognition (where supported), then the server sends the command text to OpenAI. Spoken replies use the device's speech synthesis when available. Stop cancels listening and playback and discards late replies. Switching away clears the current section. This preview measures a foreground, tap-to-talk interaction. Continuous background speech and locked-phone use need separate device trials.

## One-station service protocol

Use one willing chef and one observer. Agree on a quiet pre-service check and a short service window at the pass. Check the chosen phone, microphone permission, speaker volume and the venue's agreement to speech processing. Use only the sample board and scripted food names. Anyone can stop the run. Run the same trial on the same device pre-service and during service. Keep participant labels anonymous.

1. Warm up with one unscored command. Then use a fresh page. Read a prompt before starting the timer. Alternate touch-first and voice-first. Switch the order for the second block. For touch, Start timed touch lookup opens the board and Found it stops its timer. For voice, Talk starts timing and the displayed answer stops it. Time until the chef can act separately with a stopwatch to include hearing the reply.
2. Use both stations. Ask what remains on Grill today and how tomorrow differs. Ask for a Sauce item. Follow a Grill lookup with “tick the onions”. After Stop, ask “tick the onions” with no section. Expect clarification. Repeat specifying Sauce. Try a correction, stop during a reply, and interrupt one request by switching away. Record any wrong section, day, or item even when the transcription sounds plausible.
3. Score each response before starting the next. Export the JSON before closing or reloading. It records sequence, input mode, result and elapsed milliseconds. On a private observer sheet add block, prompt, target, whether hands were occupied, retries, interruption and time until the chef could act. Exclude the warm-up. Count all unsuccessful attempts. Keep typed fallback separate from voice.
4. Report sample sizes, correct-first-attempt counts, median time by task and mode, wrong proposals, clarifications, abandonments and device/browser. Pair comparable prompts within each block. This is a small feasibility study. Compare the sample touch list with real Prep separately before drawing conclusions about time saved.
5. Stop if a wrong tick is proposed or a participant needs to return to service. Review every wrong proposal before connecting operational records. Progress to live read-only data only after the head chef chooses the interface and provider, staff accept the audio workflow and the phone performs under service noise. Verify pending/refused writes and repeated commands against a controlled backend before enabling real ticks.

## Results

Pending a participating chef, device, model credential and service window. Record observed results privately. Publish anonymised findings only with venue approval.

## Evidence limits

The study uses the operational distinctions in [Prep attribution](../shared-prep-attribution.md), [design misses](../design-misses.md) and [service feedback](../action-feedback.md). The production interface has zero added controls or rows in this study. In-app screen density, accessibility at production widths, actual provider latency, recognition accuracy, locked-phone activation and server write acknowledgement remain unmeasured.
