- Implemented October 29, 2026. This changes the shared application UI, not the public landing site.

- Light-first Poolside palette with an optional blue-black dark theme, black primary buttons, Inter body type, and locally bundled Roboto Condensed Bold headings.
- Brand-blue gradient progress; semantic RSVP/performance colors unchanged.
- Raised opaque cards with layered shadows and thin borders; subtle surfaces remain flat.
- Floating glass phone navigation, persistent selection animation, safe-area spacing, and reduced-transparency/unsupported-browser fallbacks.
- Soft initials and deterministic simple-symbol avatar fallbacks, selectable in Settings for the current app session. Real photos retain precedence. No generated portraits or scenic images were added.
- Three locally bundled Microsoft Fluent Emoji 3D accents with MIT license/provenance under assets/icons. Small action/navigation icons remain Lucide.
- Home: Shoutouts, Feedback, Upcoming schedule; published coach notes and recent session ratings use the existing authorized player queries. Both Home and Schedule retain the shared event card and lightweight previews.
- Home → Coaching plus a Club shortcut: next club practice, real pending goal requests, only the current coach’s feedback drafts, and shortcuts to existing operational tools. The practice is deliberately not described as assigned to the current coach unless that fact is known; the dashboard does not invent plan readiness or assignment counts.
- Messages: Channels, Direct messages, Groups, search, All/Unread; no new Staff room or conversation membership changes.
- Existing capability-guarded haptics and preference remain intact.

- The coachingHome query is coach-gated and club-scoped. Indexed reads return a bounded preview with overflow flags rather than fabricated totals. Goal previews return only id, name, and pendingGoal, not private registration/payment fields. Draft reads are restricted to the authenticated author and recheck active players. No production data migration or demo-record reset occurred.

- 626 tests pass, 0 fail, 5619 assertions.
- TypeScript and app lint pass. Lint reports one existing informational unnecessary-fragment notice in fitness-log-data.tsx; it was not changed.
- App and site motion checks pass; design boundary and toast checks pass.
- Final web export and iOS export succeed. The iOS bundle is at /private/tmp/uwh-poolside-ios-20261029-final.
- scripts/verify-poolside.ts passes against fictional isolated local clubs: actual goal requests, own drafts, peer isolation, non-coach and signed-out denial, cross-club isolation, and minimal goal payload. Its own fictional accounts are cleaned up afterwards.
- Browser: demo sign-in, Home, Coaching, Messages, avatar-style switching, Progress gradient, past-event cards, and Teams preview. Teams preview has one heading. Checked 320px/390px and desktop; no document-level horizontal overflow in the measured narrow states and no console errors during checked flows.
- Existing demo practices are in the past, so the live Home/Schedule upcoming empty states are expected. No existing club records were changed to manufacture activity.

- Web preview: http://127.0.0.1:4180. Local Convex backend is running. Metro serves port 8081 in CI/non-watch mode because macOS FSEvents/Watchman failed and normal Metro watching hit EMFILE even with a process-local higher file limit. It serves the current build but does not offer file-watch hot reload. No system-wide limits or Watchman configuration were changed.

- The Expo Node-renderer error was resolved by generating the safe-uri-component CommonJS package entry from its TypeScript source; rebuild it with bun run build in that package when modifying the source.

- Physical iPhone haptics, native glass appearance, GPU behavior, and VoiceOver remain device checks. Bundle success and browser inspection do not establish those outcomes.
