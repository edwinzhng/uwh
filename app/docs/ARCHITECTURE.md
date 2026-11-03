- This is the original target architecture and migration plan, with current communication scope clarified October 25, 2026. The [parity audit](MONDAY-HUB-PARITY.md) records subsequent implementation and verification; architecture proposals below are not a current missing-feature list. Historical club data migration and native/provider verification remain separate from implementation.

- Layer: Native application; Choice: Expo SDK 57, React Native, TypeScript; Why: Shared iOS/Android implementation, native APIs, supported dependency versions, documented agent workflows
- Layer: Navigation; Choice: Expo Router; Why: Addressable routes, native navigation for detail/sheet flows, web route support
- Layer: Backend; Choice: Convex, carried forward in a new scoped API; Why: Existing project investment; reactive queries; typed generated functions; transactional writes and durable scheduling
- Layer: Local interface state; Choice: Jotai; Why: Existing repository preference; small transient atoms for drafts/context; server data remains in Convex
- Layer: Native UI; Choice: React Native controls and navigation; native sheets/menus or maintained headless native packages for advanced controls; Why: Native behavior behind the club’s own small, semantic public component API
- Layer: Motion; Choice: Reanimated/worklets; Why: Native digit motion and gesture support; reduced-motion handling at the system boundary
- Layer: Laptop UI; Choice: Expo web; Why: Reuse domain policy, shared controls and contextual workflows across viewports
- Layer: Toolchain; Choice: Bun, TypeScript, Biome; Why: Matches repository rules and keeps the app toolchain explicit
- Layer: Testing; Choice: Bun behavior/contract tests, native Maestro journeys, device checks; Why: Cheap checks first; native interaction and notification coverage where it actually runs

- Expo explicitly documents [Bun usage](https://docs.expo.dev/guides/using-bun/) and publishes [agent skills](https://github.com/expo/skills). That makes it a good fit for agent-assisted development; it does not remove the need for native testing. Bun manages packages and commands; Expo/Metro still uses the platform toolchain for native builds, and the app itself runs React Native’s runtime.

- [Convex has a React Native client](https://docs.convex.dev/client/react-native). The app uses generated `api`/`Doc`/`Id` types and a provider wrapping authenticated queries and mutations. Convex derives permissions from the signed-in membership and sanitizes data before returning it. The preview account selector has no authority over server access. The legacy and production databases remain untouched.

- Base UI is a [React web component library](https://base-ui.com/react/overview/quick-start), not a native component kit. It is appropriate behind web adapters for complex desktop controls. Native components should keep the same semantic API where practical, with platform implementations as needed. NumberFlow’s web implementation is not assumed to run natively; the initial native counter uses digit transforms with Reanimated. Avoid installing several overlapping design systems.

```text
app/
  app/                           Expo routes; thin re-exports
  src/design-system/             only place for visual/native primitives and tokens
  src/features/                  screens composed from the public design API
  src/demo/                      explicitly fictional, memory-only sample data/state
  src/domain/                    shared policy, validation and transformations
  convex/                        authenticated backend and scheduling
  scripts/                       build, verification and architecture checks
  tests/                         behavior, boundary and contrast checks
  docs/                          scope, architecture, design and testing contract
```

- Keep domain policy independent of platform rendering. Features use the public design-system API; shared domain code must not import native modules. The app owns its dependencies and configuration without introducing a broader workspace migration.

- Use these bounded concepts instead of a generic object/attribute system. They remain flexible without making permissions, validation and querying opaque.

- Aggregate: Club; Records and key relationships: Club, program, season, group/team, venue, sport configuration
- Aggregate: Identity; Records and key relationships: Account → person; person → club/program memberships; account/person → verified guardian links
- Aggregate: Events; Records and key relationships: EventSeries → EventOccurrence; event → audience, venue, registration policy and optional session plan
- Aggregate: Participation; Records and key relationships: One RSVP per event/person; observed attendance and revision records; waitlist entry; optional wellbeing check-in with separate visibility
- Aggregate: Coaching; Records and key relationships: SessionPlan → timed blocks/templates; event → generation run → lineup revisions → assignments
- Aggregate: Development; Records and key relationships: DevelopmentPlan → goals → milestones; observations/reflections link to goal/person/event; feedback publication is explicit
- Aggregate: Communication; Records and key relationships: Channel/thread → memberships/messages and private read state; notice → audience/expiry and account-specific dismissal
- Aggregate: Assessments; Records and key relationships: QuestionnaireTemplateVersion → assignment → response; interview slots/bookings; fitness protocol/session/result
- Aggregate: Resources; Records and key relationships: Resource/document/video metadata → access-controlled attachment, tags, versions, references
- Aggregate: Operations; Records and key relationships: Notification → delivery attempts/device tokens; audit record; import batch/source mapping

- Every club-owned record has `clubId`. Cross-record writes validate that related objects belong to the same club. Scope is part of every query, index and permission check. A player may be in multiple programs; a lineup belongs to an event and holds an array of groups, not `black_assignments`/`white_assignments` columns. Underwater hockey positions/formations are sport configuration. Session numbers are presentation labels, not globally unique foreign keys.

- Private observations, published feedback and public event projections have separate query contracts. Never send a whole record with sensitive fields to a device and rely on hidden UI. Identity used for authorization comes from the authenticated server context; clients cannot supply their own trusted author/guardian role. Administrator, moderator and coach capabilities are distinct.

- Message, notice and banner acknowledgement workflows are deliberately removed, not deferred. Historical acknowledgement fields/tables remain only for old-record compatibility, privacy filtering and erasure; do not expose them through current commands, queries or UI. Ordinary dismissal and private read/unread state remain. Legal terms acceptance and provider delivery receipts are unrelated contracts.

- Event/series creation requires an admin capability on the server; coach membership cannot grant it. A guardian’s selected child is local viewing context, not authorization. Capture the child ID on every submission, scope query/draft keys by child, and recheck the verified guardian relationship server-side. The preview stores selected child context above route screens so switching never navigates and returning to a page keeps the chosen child.

- Suggested indexes include `(clubId, startsAt)`, `(seriesId, originalLocalDateTime)`, `(eventId, personId)`, `(clubId, accountId)`, `(guardianAccountId, childPersonId)`, `(threadId, sentAt)`, `(personId, visibility, publishedAt)`, and `(recipientId, readAt, createdAt)`. Logical uniqueness is enforced transactionally in mutations, with idempotency keys where retries are possible. Indexes alone should not be assumed to be uniqueness constraints.

- Store UTC instants for scheduling, plus the IANA zone and wall-clock recurrence rule. Series expansion yields stable occurrence IDs and preserves an original occurrence key when dates move. Materialize a rolling horizon, extend it idempotently, and store exceptions. Changing “this and future” splits/version-controls the series without changing attendance history. The initial recurrence implementation must have DST and monthly-edge fixtures before use with real people.

- An RSVP mutation checks current server time, membership, delegation, event state, response window and capacity in one transaction. It writes the response and notification intent together. Offline UI can queue an intent but cannot reserve a spot until confirmed by the server. Last-write versions and clear conflict feedback prevent a parent/player from unknowingly overwriting each other.

- Use an outbox record with dedupe key `(eventId, scheduleVersion, notificationType, recipientId)`. Schedule internal work when the event transaction commits. Recheck the version and audience when executing. On a time/cancellation edit, cancel pending jobs where possible and invalidate old versions. A periodic reconciliation job detects missed/failed work. This prevents stale reminders even when cancellation races with delivery.

- Convex provides [durable scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions). External network sends run as actions and need explicit retries; do not assume an action is retried automatically or that an external provider delivers exactly once. Record attempts, bounded backoff, provider receipt status, and dead-token cleanup. Exactly-once in-app notification creation is feasible; exactly-once external push delivery should not be promised.

- Device tokens attach to an authenticated account/device/environment; logout and account changes detach appropriately. Tokens are not identity. Notification payloads contain destination IDs, event/version and neutral text. Deep-link resolution after authentication fetches current authorized state. Badge counts derive from inbox records.

- R1 provides cached recent schedule and clear connectivity state, plus pending RSVP/message drafts with explicit retry. It does not promise complete offline collaboration. Cached sensitive data must be cleared on sign-out/revocation as far as the client can enforce; avoid caching private notes unnecessarily. Offline roster marking is a later deliberate queue with event/person/version/actor and a reviewable conflict policy. Convex reactivity alone is not a complete offline synchronization design.

- Use page-sized reactive queries for messages, roster and history. Virtualize long lists; keep private ratings/notes out of broad subscriptions. Media uses separately authorized storage. Defer video transcoding, AI providers and payments until those modules enter scope.

- Existing source: `players`, Base44 `Player`; New concept: Person + membership + athlete profile; Treatment: Preserve both source IDs; manually review ambiguous duplicates/account links
- Existing source: `youth`, `parentEmail`; New concept: Age-group eligibility + verified guardian link; Treatment: Email alone is not proof of guardianship
- Existing source: `coaches`, `practiceCoaches`; New concept: Scoped coach membership + event assignment/time; Treatment: Preserve recorded hours and seasonal reports
- Existing source: `practices`, Base44 `Session` and `Event`; New concept: EventOccurrence + optional SessionPlan; Treatment: Resolve double representations explicitly; never merge solely by date
- Existing source: SportEasy RSVP and Base44 `AttendanceRSVP`; New concept: RSVP; Treatment: Keep intent separate from observed presence; preserve respondent/override provenance
- Existing source: `practiceAttendance`, status flags; New concept: Attendance + amendment history; Treatment: Preserve manual entries and late/addition/cancellation facts
- Existing source: Existing generator, Base44 `Lineup`; New concept: Generation constraints + lineup revisions; Treatment: Reuse understanding/fixtures; remove hard-coded two-team/schema assumptions
- Existing source: `fitnessTests`/sessions/results, `FitnessScore`; New concept: Protocol/session/result; Treatment: Map unit/direction/version; distinguish missing values from zero
- Existing source: Player focus fields, `GoalChangeRequest`; New concept: DevelopmentPlan, Goal, GoalRevision; Treatment: Convert history to individual records; preserve review decisions
- Existing source: `PlayerSessionFeedback`, `CoachDebrief`, `SessionCheckin`; New concept: Published feedback, private observation/debrief, wellbeing; Treatment: Explicit audience mapping; quarantine ambiguous privacy rather than exposing it
- Existing source: `Questionnaire`, responses, interviews, availability; New concept: Versioned forms/assignments, interview bookings; Treatment: Preserve the question text/version that was answered
- Existing source: Chat/DM/thread; New concept: Channels, memberships, messages; Treatment: Import only data that can be exported with correct membership/access provenance
- Existing source: TeamDoc, VideoClip, ShoutOut; New concept: Resource versions, clip metadata, recognition; Treatment: Validate links/storage ownership and audience
- Existing source: Web push subscriptions; New concept: Native device enrollment; Treatment: Do not reuse browser push subscriptions as native tokens
- Existing source: Reports/blocks/terms acceptance; New concept: Moderation records, user preferences, policy acceptance; Treatment: Retain relevant history; new policy version may require fresh acceptance

- Migration steps: inventory exports → stage originals securely → dry-run mappings → compare counts/spot-check history → resolve conflicts → test in a separate backend → invite a pilot cohort → designate cutover event/date → freeze source writes → final incremental import → verify → retain read-only legacy access → retire integrations after the agreed retention window. Never overwrite manual attendance during reconciliation.

- The prototype contains permissive-looking read declarations on several entities and source-embedded notification authentication material. This is not a security audit, but those patterns are not suitable migration templates. Design explicit server authorization and managed credentials; review and rotate any source-embedded secrets if they were used in a live deployment. Do not copy secret values into migration logs or documents.

- The local development backend and password login exist. Still provision cloud development/staging/production environments, verified login and account recovery, Apple/Google signing and push credentials, domain/universal links, operational email, crash reporting, retention/export/deletion, backup/restore and store distribution. No cloud service has been deployed or real club data imported.
