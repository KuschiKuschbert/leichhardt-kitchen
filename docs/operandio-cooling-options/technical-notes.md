# Operandio shared timer: current technical direction

Updated 8 November 2026 after the head chef clarified: "doesn't have to notify when the app is closed it just needs to notify the logged in devices". This replaces the earlier closed-app delivery proposal. The approved compact dropdown and manual 2-hour then 4-hour sequence remain unchanged.

The implementation contract lives in [Operandio cooling](../operandio-cooling.md). It uses one Firestore document, server-issued start timestamps, strict revision and stage rules, and one live subscription per authorised app. Each open screen calculates the fixed deadline and queues its own shift-style ping. Got it remains personal. The 4-hour stage requires a separate Start after the first deadline.

No third-party timer package or scheduler is required. Saving timestamps keeps elapsed time correct across reloads and closure. Closed or suspended apps need no delivery service; they reconcile when reopened and unlocked. This fits the existing free-plan decision without new billing or notification permission.

The earlier Functions/Cloud Tasks implementation was never deployed and has been removed from the branch, along with device-token registration, worker push handling and the proposed Settings opt-in. Existing supplier reminders are unchanged. The earlier personal timer in draft PR #610 remains unshipped.

Implementation checks cover exact timestamp handling, simultaneous starts, current-session authority for every kitchen role, manual stage transition, personal dismissal, multiple open screens, reconnect and reload, and pending work across a lock. Publish the additive rules before the dependent client, using the normal rules workflow and live Lock probe.
