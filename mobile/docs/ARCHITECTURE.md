# Architecture and migration

This is the target architecture and migration plan. The first app and a separate local Convex backend now work; [implementation status](IMPLEMENTATION.md) records the current boundaries. Native push, public calendars and migration remain planned.

## Recommended stack

| Layer | Choice | Why |
| --- | --- | --- |
| Native application | Expo SDK 57, React Native, TypeScript | Shared iOS/Android implementation, native APIs, supported dependency versions, documented agent workflows |
| Navigation | Expo Router | Addressable routes, native navigation for detail/sheet flows, web route support |
| Backend | Convex, carried forward in a new scoped API | Existing project investment; reactive queries; typed generated functions; transactional writes and durable scheduling |
| Local interface state | Jotai | Existing repository preference; small transient atoms for drafts/context; server data remains in Convex |
| Native UI | React Native controls and navigation; native sheets/menus or maintained headless native packages for advanced controls | Native behavior behind the club’s own small, semantic public component API |
| Motion | Reanimated/worklets | Native digit motion and gesture support; reduced-motion handling at the system boundary |
| Public site/laptop UI | Expo web initially; retain existing Next.js admin during migration | Reuse tokens and much of the UI; no requirement to rewrite the current admin before the native pilot |
| Toolchain | Bun, TypeScript, Biome | Matches repository rules; independent mobile lockfile avoids changing legacy dependencies |
| Testing | Bun behavior/contract tests, native Maestro journeys, device checks | Cheap checks first; native interaction and notification coverage where it actually runs |

Expo explicitly documents [Bun usage](https://docs.expo.dev/guides/using-bun/) and publishes [agent skills](https://github.com/expo/skills). That makes it a good fit for agent-assisted development; it does not remove the need for native testing. Bun manages packages and commands; Expo/Metro still uses the platform toolchain for native builds, and the app itself runs React Native’s runtime.

[Convex has a React Native client](https://docs.convex.dev/client/react-native). The app uses generated `api`/`Doc`/`Id` types and a provider wrapping authenticated queries and mutations. Convex derives permissions from the signed-in membership and sanitizes data before returning it. The preview account selector has no authority over server access. The legacy and production databases remain untouched.

Base UI is a [React web component library](https://base-ui.com/react/overview/quick-start), not a native component kit. It is appropriate behind web adapters for complex desktop controls. Native components should keep the same semantic API where practical, with platform implementations as needed. NumberFlow’s web implementation is not assumed to run natively; the initial native counter uses digit transforms with Reanimated. Avoid installing several overlapping design systems.

## Repository boundaries

```text
uwh/
  app/ components/ convex/        existing application, retained
  mobile/
    app/                         Expo routes; thin re-exports
    src/design-system/           only place for visual/native primitives and tokens
    src/features/                screens composed from the public design API
    src/demo/                    explicitly fictional, memory-only sample data/state
    src/domain/                  shared policy, validation and transformations
    convex/                      authenticated local backend and signup scheduling
    scripts/                     architecture check
    tests/                       behavior, boundary and contrast checks
    docs/                        scope, architecture, design and testing contract
```

The root TypeScript project excludes `mobile/`; the new project has its own dependencies/configuration. There is no premature monorepo/workspace conversion. Extract shared domain/types and tokens into packages only when the old web app consumes them. Do not let shared packages import native modules into the existing Next.js server build.

## Domain model: concrete entities with reusable relationships

Use these bounded concepts instead of a generic object/attribute system. They remain flexible without making permissions, validation and querying opaque.

| Aggregate | Records and key relationships |
| --- | --- |
| Club | Club, program, season, group/team, venue, sport configuration |
| Identity | Account → person; person → club/program memberships; account/person → verified guardian links |
| Events | EventSeries → EventOccurrence; event → audience, venue, registration policy and optional session plan |
| Participation | One RSVP per event/person; observed attendance and revision records; waitlist entry; optional wellbeing check-in with separate visibility |
| Coaching | SessionPlan → timed blocks/templates; event → generation run → lineup revisions → assignments |
| Development | DevelopmentPlan → goals → milestones; observations/reflections link to goal/person/event; feedback publication is explicit |
| Communication | Channel/thread → memberships/messages; Announcement → revisions/audience/acknowledgements |
| Assessments | QuestionnaireTemplateVersion → assignment → response; interview slots/bookings; fitness protocol/session/result |
| Resources | Resource/document/video metadata → access-controlled attachment, tags, versions, references |
| Operations | Notification → delivery attempts/device tokens; audit record; import batch/source mapping |

Every club-owned record has `clubId`. Cross-record writes validate that related objects belong to the same club. Scope is part of every query, index and permission check. A player may be in multiple programs; a lineup belongs to an event and holds an array of groups, not `black_assignments`/`white_assignments` columns. Underwater hockey positions/formations are sport configuration. Session numbers are presentation labels, not globally unique foreign keys.

Private observations, published feedback and public event projections have separate query contracts. Never send a whole record with sensitive fields to a device and rely on hidden UI. Identity used for authorization comes from the authenticated server context; clients cannot supply their own trusted author/guardian role. Administrator, moderator and coach capabilities are distinct.

Event/series creation requires an admin capability on the server; coach membership cannot grant it. A guardian’s selected child is local viewing context, not authorization. Capture the child ID on every submission, scope query/draft keys by child, and recheck the verified guardian relationship server-side. The preview stores selected child context above route screens so switching never navigates and returning to a page keeps the chosen child.

Suggested indexes include `(clubId, startsAt)`, `(seriesId, originalLocalDateTime)`, `(eventId, personId)`, `(clubId, accountId)`, `(guardianAccountId, childPersonId)`, `(threadId, sentAt)`, `(personId, visibility, publishedAt)`, and `(recipientId, readAt, createdAt)`. Logical uniqueness is enforced transactionally in mutations, with idempotency keys where retries are possible. Indexes alone should not be assumed to be uniqueness constraints.

## Event and notification correctness

Store UTC instants for scheduling, plus the IANA zone and wall-clock recurrence rule. Series expansion yields stable occurrence IDs and preserves an original occurrence key when dates move. Materialize a rolling horizon, extend it idempotently, and store exceptions. Changing “this and future” splits/version-controls the series without changing attendance history. The initial recurrence implementation must have DST and monthly-edge fixtures before use with real people.

An RSVP mutation checks current server time, membership, delegation, event state, response window and capacity in one transaction. It writes the response and notification intent together. Offline UI can queue an intent but cannot reserve a spot until acknowledged by the server. Last-write versions and clear conflict feedback prevent a parent/player from unknowingly overwriting each other.

Use an outbox record with dedupe key `(eventId, scheduleVersion, notificationType, recipientId)`. Schedule internal work when the event transaction commits. Recheck the version and audience when executing. On a time/cancellation edit, cancel pending jobs where possible and invalidate old versions. A periodic reconciliation job detects missed/failed work. This prevents stale reminders even when cancellation races with delivery.

Convex provides [durable scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions). External network sends run as actions and need explicit retries; do not assume an action is retried automatically or that an external provider delivers exactly once. Record attempts, bounded backoff, provider receipt status, and dead-token cleanup. Exactly-once in-app notification creation is feasible; exactly-once external push delivery should not be promised.

Device tokens attach to an authenticated account/device/environment; logout and account changes detach appropriately. Tokens are not identity. Notification payloads contain destination IDs, event/version and neutral text. Deep-link resolution after authentication fetches current authorized state. Badge counts derive from inbox records.

## Offline behavior

R1 provides cached recent schedule and clear connectivity state, plus pending RSVP/message drafts with explicit retry. It does not promise complete offline collaboration. Cached sensitive data must be cleared on sign-out/revocation as far as the client can enforce; avoid caching private notes unnecessarily. Offline roster marking is a later deliberate queue with event/person/version/actor and a reviewable conflict policy. Convex reactivity alone is not a complete offline synchronization design.

Use page-sized reactive queries for messages, roster and history. Virtualize long lists; keep private ratings/notes out of broad subscriptions. Media uses separately authorized storage. Defer video transcoding, AI providers and payments until those modules enter scope.

## Migration mapping

| Existing source | New concept | Treatment |
| --- | --- | --- |
| `players`, Base44 `Player` | Person + membership + athlete profile | Preserve both source IDs; manually review ambiguous duplicates/account links |
| `youth`, `parentEmail` | Age-group eligibility + verified guardian link | Email alone is not proof of guardianship |
| `coaches`, `practiceCoaches` | Scoped coach membership + event assignment/time | Preserve recorded hours and seasonal reports |
| `practices`, Base44 `Session` and `Event` | EventOccurrence + optional SessionPlan | Resolve double representations explicitly; never merge solely by date |
| SportEasy RSVP and Base44 `AttendanceRSVP` | RSVP | Keep intent separate from observed presence; preserve respondent/override provenance |
| `practiceAttendance`, status flags | Attendance + amendment history | Preserve manual entries and late/addition/cancellation facts |
| Existing generator, Base44 `Lineup` | Generation constraints + lineup revisions | Reuse understanding/fixtures; remove hard-coded two-team/schema assumptions |
| `fitnessTests`/sessions/results, `FitnessScore` | Protocol/session/result | Map unit/direction/version; distinguish missing values from zero |
| Player focus fields, `GoalChangeRequest` | DevelopmentPlan, Goal, GoalRevision | Convert history to individual records; preserve review decisions |
| `PlayerSessionFeedback`, `CoachDebrief`, `SessionCheckin` | Published feedback, private observation/debrief, wellbeing | Explicit audience mapping; quarantine ambiguous privacy rather than exposing it |
| `Questionnaire`, responses, interviews, availability | Versioned forms/assignments, interview bookings | Preserve the question text/version that was answered |
| Chat/DM/thread | Channels, memberships, messages | Import only data that can be exported with correct membership/access provenance |
| TeamDoc, VideoClip, ShoutOut | Resource versions, clip metadata, recognition | Validate links/storage ownership and audience |
| Web push subscriptions | Native device enrollment | Do not reuse browser push subscriptions as native tokens |
| Reports/blocks/terms acceptance | Moderation records, user preferences, policy acceptance | Retain relevant history; new policy version may require fresh acceptance |

Migration steps: inventory exports → stage originals securely → dry-run mappings → compare counts/spot-check history → resolve conflicts → test in a separate backend → invite a pilot cohort → designate cutover event/date → freeze source writes → final incremental import → verify → retain read-only legacy access → retire integrations after the agreed retention window. Never overwrite manual attendance during reconciliation.

The prototype contains permissive-looking read declarations on several entities and source-embedded notification authentication material. This is not a security audit, but those patterns are not suitable migration templates. Design explicit server authorization and managed credentials; review and rotate any source-embedded secrets if they were used in a live deployment. Do not copy secret values into migration logs or documents.

## Production dependencies to provision later

The local development backend and password login exist. Still provision cloud development/staging/production environments, verified login and account recovery, Apple/Google signing and push credentials, domain/universal links, operational email, crash reporting, retention/export/deletion, backup/restore and store distribution. No cloud service has been deployed or real club data imported.
