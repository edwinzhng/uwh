- Updated November 2, 2026. Edwin's current real-data workspace uses the isolated local backend; the browser and Metro connect to the same database. Outbound email and native/browser push delivery remain disabled. Integration fixtures use separate fictional accounts. Local capture and compiled bundles do not establish real delivery; see [the local data record](LOCAL-REAL-DATA.md).

- The [cleanup audit](CLEANUP-AUDIT.md) adds atomic resend limits, normalized verification-attempt counters, focused account dialogs and concurrent preference updates.

- Google and Apple sign-in, connected-account management and identity-verified deletion for password-free accounts are covered in [Social sign-in](SOCIAL-AUTH.md). Provider credentials and real-device verification remain pending.

- Admins can also issue club-specific signup invitations for new or existing profiles. Verified recipients join directly through the invitation; expiry, resend, revocation and local delivery capture are covered in [Club invitations](INVITATIONS.md).

- Sign up → 6-digit email code → join/create club → admin approval. Password reset uses an email code and a new password. Codes expire after 10 minutes; sends have a one-minute cooldown and Convex Auth rate-limits verification/password failures. Email and code must match. Authenticated access checks the live session and verified user in addition to the JWT, so revoked sessions cannot keep reading through an unexpired token.

- Account includes name editing, password change, sign out, sign out other devices and deletion confirmed by a password or a fresh provider verification. Pending requests can be cancelled or declined; revoked/expired access does not become a sample admin account. Builds without a backend show an unavailable state. Sample mode requires `EXPO_PUBLIC_DEMO_MODE=true` and no backend URL; never enable it for a release. The design-system route remains independent.

- Deletion removes credentials, sessions, refresh tokens, owned photos, private calendar links, device registrations, the personal profile and exclusively managed child profiles, financial/registration/tracker records and private coaching notes. Authored messages become empty anonymous tombstones. Published coaching feedback to other people remains with an anonymous author. Past attendance is retained by former profile ID; future unrecorded RSVPs are removed. Child profiles linked to another account remain. Deleting the last owner also deletes the club and its records. Reports have identifying account links removed and expire after 90 days; evidence of the deleted user's own message is cleared immediately. Other people's prose may still mention a former member and requires a separate review if removal is requested. The club should confirm this policy before launch.

- An owner must transfer to another existing admin before deleting when other accounts belong to the club. If the owner is its only account, deletion also removes the club and its records. The web route `/delete-account` provides the same authenticated deletion flow outside the native app; publish its hosted URL in the store listing.

- Message menu: report with a reason, optionally block, or block directly. A report explicitly shares that message and its attached photos with club admins.
- Messages exposes block management only when the account has blocked someone; it is not an empty Settings section. Unblocking remains explicit. Blocking hides the other account's messages/reactions, denies its image downloads, stops direct messaging in both directions and suppresses notifications between the accounts. Shared club channels remain usable for other participants.
- Admin → Moderation: open/reviewed reports, dismiss/remove, pause a sender's chat access and restore it. Moderators see report evidence, not unrelated private conversations. Removing a message also deletes its stored photos.
- Admin → Moderation → Message filter: up to 100 blocked phrases. Matching text or edits are rejected on the server, including case/compatibility-character variations. A per-account message rate limit and existing attachment limits reduce spam. This is a configurable text filter, not automatic image classification.
- Membership, ownership and role checks run on the server for every action. Privacy checks are repeated for notification delivery and image downloads.

- Publish the club's community rules and support contact before release, and establish who monitors reports. The app does not invent a club email address or age-specific parent/coach communication policy.

- The Expo Notifications adapter requests permission only from Account → Notifications. Android creates a Club updates channel. The installation identifier is stored securely; registration follows the current account/session and is refreshed on app activation and token changes. Permission loss, disable, logout, account deletion, revoked sessions and `DeviceNotRegistered` prevent further delivery. Preferences cover messages, announcements, feedback and registration reminders.

- Token callbacks exchange the supplied native token instead of reacquiring it, which would emit another callback on iOS. Refreshes are single-flight and coalesce token changes; route navigation does not reinstall the listener. Exact installation/user/session/token/platform registrations make no database writes. Rotated tokens, ownership/session changes and duplicate records still reconcile under the existing authorization checks. Regression tests and both actual Metro bundles verify these code paths; sustained phone navigation and delivery still require hardware checks. See [performance](PERFORMANCE.md).

- Convex schedules jobs after new messages, announcements and newly published feedback. Registration reminders run at opening and 30 minutes before closing, for eligible players/linked children who have not responded. Cancelled events, revised opening/closing timestamps, removed guardian links and existing responses suppress obsolete reminders. Lock-screen text is generic; it does not include chat or feedback content. Taps can open only approved routes and the destination still checks account access.

- Signup controls wake at opening and closing boundaries rather than waiting for a rounded minute. New events that are already open receive a creation alert without a second retroactive opening alert. The club's Session reminders switch controls opening/closing reminders; recipient event preferences separately control new, changed and cancelled event alerts.

- Jobs have stable deduplication keys. The sender uses Expo's server SDK, bounded retries and receipt checks after 15 minutes. Invalid device tokens are removed. Delivery records expire after 7 days; future registration jobs remain until their event window has passed. Like other push services, uncertain network failures can still cause a duplicate or a missed notification. Receipts confirm handoff to APNs/FCM, not that a person read a notification. [Expo delivery guide](https://docs.expo.dev/push-notifications/sending-notifications/)

- The activity inbox is durable and independent of transport: disabling push, having no device or disabling a delivery topic does not delete authorized inbox activity. Topic settings extend the four coarse compatibility groups with group/direct/staff messages, coaching feedback, shoutouts, announcements, events, videos, documents, published lineups/plans, RSVP declines, goal requests and progress. Staff-only topics are hidden from ordinary accounts, and every destination rechecks its current audience.

- Browser push uses a typed service worker, standard browser subscriptions and server-held VAPID credentials. The app requests permission only after Enable and offers Disable. Subscription delivery is bound to a current verified session, current club access and the current public key. Logout/revocation, account erasure and expired provider endpoints prevent continued delivery. Existing opted-in subscriptions can rebind after sign-in without prompting again. Installation uses the browser’s supported prompt or platform instructions; iPhone installation and permission behavior still require device testing.

- Set these **on the target Convex deployment**, not in public Expo variables:

- Variable: `SITE_URL`; Value: Hosted web app origin
- Variable: `AUTH_EMAIL_MODE`; Value: `resend` (never `local` in production)
- Variable: `AUTH_RESEND_KEY`; Value: Resend API key stored as a backend secret
- Variable: `AUTH_EMAIL_FROM`; Value: Verified club sender
- Variable: `PUSH_DELIVERY_ENABLED`; Value: `true`, only after configuring the Expo project and credentials
- Variable: `EXPO_ACCESS_TOKEN`; Value: Expo push access token when push security is enabled
- Variable: `WEB_PUSH_DELIVERY_ENABLED`; Value: `true`, only after configuring and testing browser delivery
- Variable: `WEB_PUSH_VAPID_PUBLIC_KEY`; Value: Uncompressed P-256 public key, base64url encoded
- Variable: `WEB_PUSH_VAPID_PRIVATE_KEY`; Value: Matching private key, backend secret only
- Variable: `WEB_PUSH_VAPID_SUBJECT`; Value: Approved `mailto:` support address or HTTPS contact URL

- Keep the existing production Convex Auth JWT/JWKS configuration. Add `EXPO_PUBLIC_EAS_PROJECT_ID` to the app environment, select the final bundle/package identifiers, and configure APNs and FCM V1 credentials in EAS. `eas.json` includes development, preview and production profiles. Rebuild the native app to include `expo-notifications` and `expo-crypto`. Use hosted Convex endpoints for devices; `127.0.0.1` on a phone points to the phone. No signing keys, project ownership or store identity were guessed. [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [Convex password flows](https://labs.convex.dev/auth/config/passwords)

- Browser delivery requires a secure hosted app origin and a supported push provider. Missing configuration leaves Enable/Test unavailable with an explicit reason; the inbox and installation guidance still work. Never add private VAPID or Expo access tokens to public environment variables. The public product-flow site is isolated fictional review state and never registers or sends push.

- The current real-data workspace is already configured; do not reset it to run a fixture. For a new isolated fixture backend, `bun run setup:auth` configures local email capture. Capture is limited to fictional `@example.test` addresses and the explicit approved real-account allowlist; it never sends mail. Capture functions are internal/admin-only, enforce a localhost backend and expire codes after 10 minutes. They are unavailable from the app API and refuse cloud deployments. Push sends remain disabled.

- To test the UI, create a fictional address, then retrieve its code with:

```sh
bun scripts/local-convex.ts run local_email:latest '{"email":"your-name@example.test"}'
```

- `bun run verify:security` exercises verification, recovery, old-session denial, approval/decline, moderation isolation, blocking, text filters, ownership transfer, account/club deletion and push eligibility/token cleanup. It never sends to an external transport. The local helper pins the backend URL to port 3210 and does not print the admin key.

- Before release, test actual mail delivery and a new native build on iOS and Android: denied/granted permissions, re-enabling, foreground/background/terminated delivery, tapping after sign-out, switching accounts, event rescheduling, feedback privacy and receipt errors. JavaScript bundle exports cannot establish these outcomes.

- November 3, 2026 verification: the full app check passed, including 950 unit tests, TypeScript, Biome, design boundaries, toast copy and motion checks; site motion checks also passed. Generated PDF.js assets are excluded from source lint. Browser clock testing verified signup opening without reload and current announcement/goal destinations. Web and iOS exports passed. Local Convex on port 3210 was unreachable; no live scheduler run or external push delivery was verified, and no delivery flags or production data were changed.
