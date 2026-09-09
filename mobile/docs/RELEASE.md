# Apple and Google release readiness

September 8, 2026. The app has shared Expo/React Native implementations for iOS, Android and web. It is not yet ready for store submission. JavaScript bundle exports are not signed native application builds.

## Recommended route

Use EAS Build to create signed iOS and Android builds, test with TestFlight and Google Play testing, then use EAS Submit to upload them. iOS upload goes to App Store Connect/TestFlight; completing metadata and requesting App Review is a separate step. Android upload targets a chosen testing/release track. [Expo submission guide](https://docs.expo.dev/deploy/submit-to-app-stores/)

This laptop currently has Apple Command Line Tools, not full Xcode, and no Android SDK at the standard location. EAS cloud builds avoid installing those large toolchains; they still require Expo and developer accounts, signing setup and real device tests. No cloud build or store upload has been started.

Native configuration was inspected on September 8, 2026. The iOS microphone/speech descriptions, automatic appearance and development push entitlement are generated, and Android includes the speech permission. The Expo-compatible `expo-system-ui` module is installed for Android automatic appearance. Configuration introspection and all-platform bundle exports pass; this does not verify a signed binary or push delivery. Offline dependency validation matches Expo's bundled version map, without an online version check.

## What remains

| Item | Current state / next action |
| --- | --- |
| Developer ownership | Establish the club’s Apple Developer and Google Play developer accounts and Expo project ownership. Choose durable identifiers; current IDs are `club.crocs.preview`. |
| Build configuration | Development/preview/production profiles and remote auto-increment are in `eas.json`. Link the Expo project and configure signing credentials. Use Bun and retain `bun.lock`. [EAS configuration](https://docs.expo.dev/build/eas-json/) |
| Hosted service | Deploy the separate mobile Convex backend with production auth configuration. Replace localhost endpoints in the release environment. The current local database and auth keys are development-only. |
| Production entry | Verified sign-in, pending/declined requests, expired sessions and missing-backend states are implemented. Live users never fall back to sample admin data. Test offline/reconnect on devices and leave explicit demo mode disabled. |
| Account lifecycle | Email verification/recovery, name editing, deletion with ownership transfer and immediate session revocation are implemented and locally tested. Configure a verified Resend sender and confirm the documented record-retention policy. [Implementation](ACCOUNT-SAFETY-PUSH.md), [Apple guideline 5.1.1](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) |
| Google deletion link | `/delete-account` provides authenticated deletion outside the native app. Publish that route on the hosted domain and list its URL; confirm retained-data disclosures. [Google user-data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en) |
| Chat safety | Reporting, blocking, admin review/removal, chat suspension/restoration, phrase filtering and rate limits are implemented. Publish support contact/community rules, staff the moderation queue and decide parent/coach contact rules for younger players. [Apple guideline 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content) |
| Privacy/store forms | Publish a real privacy policy and support URL. Complete Apple privacy information, Google Data safety, age ratings, review access and any required compliance answers using the actual hosted services and SDK behavior. |
| Dictation | A new native development build must include the speech module. Test real iOS/Android permissions, denial/re-enable, interruptions and backgrounding. The app does not persist audio recordings; platform/browser speech services may process audio remotely. Do not describe all dictation as on-device. [Speech module](https://github.com/jamsch/expo-speech-recognition) |
| Notifications | Expo native registration, preferences, event/message/feedback/announcement jobs, receipt handling, token cleanup and constrained deep links are implemented. Configure EAS/APNs/FCM, enable delivery and verify foreground/background/terminated behavior on physical iOS and Android devices. Local tests do not send real push. |
| Assets/listing | Add the approved app icon, launch assets, phone/tablet screenshots, description, support contact and a reviewer account/club with representative data. |
| Platform compliance | Confirm supported device versions, current store SDK requirements, permission declarations and any SDK privacy manifests against the signed native builds. |
| Acceptance testing | Test one iPhone and one Android device: login → approval → profile switch → RSVP → attendance → feedback → image/reaction/dictation → sign-out/revocation. Include keyboard, safe area, larger text, screen readers and poor connectivity. |

For qualifying new personal Google Play accounts, production access requires a closed test with at least 12 opted-in testers for 14 continuous days, followed by an application for production access. Check the actual account’s requirements before scheduling launch. [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)

## Release order

1. Finish production account/privacy/moderation work and deploy the backend.
2. Configure Expo, signing and the final app identity; create native development builds.
3. Complete device acceptance tests and push delivery verification.
4. Produce signed store builds, prepare listings and distribute to testers.
5. Review the concrete binaries, listing and privacy answers, then submit for review.

No payment processing is implemented: the payment UI records money already received. Do not describe it as taking payments in the store listing. Google calendar subscriptions also require a hosted endpoint; the localhost preview is not externally reachable.
