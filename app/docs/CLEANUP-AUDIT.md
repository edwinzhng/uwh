# Cleanup audit · September 8, 2026

This pass reviewed the account lifecycle, moderation, notification preferences and their shared UI dependencies. Existing schedule, family, attendance, coaching, equipment, payments, messaging and calendar behavior is covered by the regression suites. This is a source and local-backend audit, not a physical-device acceptance test.

## Fixes and refactoring

| Area | Change |
| --- | --- |
| Email resend | Reproduced a rejected resend invalidating the original code. The cooldown now runs in the code-creation transaction; a rejection rolls back without replacing the valid code. Both verification and password recovery have regressions. |
| Auth input | Reproduced bypassing the verification-attempt counter with capitalized/padded email input. Normalize the provider parameters before Convex Auth consumes them, keeping account lookup, delivery and rate limits on the same identifier. |
| Account erasure | Normalize legacy email metadata lookups and remove account/email sign-in counters along with local mail and cooldown records. Ownership transfer and linked-child preservation remain enforced. |
| Sign out | Push-registration cleanup is best effort and no longer gates sign-out. Server delivery still checks the live session before sending. |
| Notification preferences | Save only the changed preference. Concurrent changes to separate toggles survive instead of replacing a stale snapshot of all preferences. |
| Moderated uploads | Reuse one chat-access decision for mutations and upload authorization. Paused/blocked uploads return access denial instead of an unexpected server error. Paused accounts also cannot start conversations. |
| Account components | Separate backend context and error formatting from the provider that renders account screens, removing that import cycle. Split name, password and deletion dialogs into focused components. Add resend inside the password dialog and disable sensitive fields while saving. |
| Shared tasks | A synchronous ref guards duplicate submissions before React renders the busy state. Remove the unused sign-in wrapper and unused local fanout helper. |

The email cooldown uses the documented [Convex Auth user callback](https://labs.convex.dev/auth/api_reference/server#callbacksafterusercreatedorupdated). Password profile normalization intentionally updates the incoming email parameter: this library version passes the original parameters into OTP verification even when the returned profile contains a normalized email. The mixed-case regression protects this integration when upgrading Convex Auth.

## Verification

- TypeScript, Biome, design-system boundary and all 56 unit/domain tests.
- Four local Convex suites: security/account lifecycle, club workflows, messaging and calendar subscriptions. Added rejected-resend preservation, case-insensitive attempt limits, concurrent preferences, paused uploads/thread creation and email-metadata erasure checks.
- iOS, Android and web exports. These check bundling; they are not signed native builds.
- Preview routes and current JavaScript asset checked over HTTP.

No real email, push delivery, browser interaction or native device interaction was exercised. Those are release gates, not implied by the passing local suites.

## Recommended next work

1. **Run a hosted native pilot.** Configure the separate hosted Convex backend, verified email sender, club-owned Expo project and signing. Produce development builds for one iPhone and one Android device. Verify sign-up/recovery, approval, parent switching, RSVP, coach attendance, moderation and deletion. Exercise push with the app open, backgrounded and terminated, and confirm sign-out/revocation stops delivery. Setup: [account and push](ACCOUNT-SAFETY-PUSH.md), [release](RELEASE.md).
2. **Finish scale and device checks.** Message pagination/virtualization, account-based unread state and direct-conversation reuse are implemented and covered by local integration checks; see [messaging readiness](MESSAGING.md). The subsequent [performance pass](PERFORMANCE.md) scopes screen data and writes, pages growing histories, and defers charts/showcase code. The web startup bundle is now about 4.7 MB uncompressed. Next, profile the remaining club-sized inbox/roster inputs and test native scrolling/reconnect behavior.
3. **Define the club cutover.** Confirm youth-contact/moderation responsibilities and retained-data disclosures. Add season-specific registration/payment history, an admin change log, and validated imports/exports. Trial with a small group, reconcile records, then plan the SportEasy cutover.

Changing an existing series cadence/count, splitting a series, public schedule sharing and removing legacy program fields remain separate product work. Occurrence edits already support one event or its existing series.
