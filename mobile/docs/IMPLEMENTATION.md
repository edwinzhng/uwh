# Implementation status · September 8, 2026

The app is an Expo / React Native implementation with a shared web preview and a separate local Convex backend. It is a working preview, not a completed SportEasy migration or a store-ready release.

## Working behavior

- Schedule agenda/month calendar, compact event cards, independent family RSVP dropdowns, capacity/waitlist management and enforced registration windows.
- Admin event creation and editing; selected-player eligibility; daily/weekday/weekly/fortnightly/monthly recurrence; single, following or whole-series edits, cadence/count changes and preserved exceptions; event seasons and season creation/filtering.
- Staff attendance, lateness/no-show corrections, coaching plans, generated balanced teams, manual moves, explicit publishing and stale-lineup checks.
- Shared member goals/check-ins, immediate feedback publication, draft editing/deletion, private notes and attendance charts with explicit denominators and unmarked records.
- Coach-only hours/season totals, fitness tests and results with bests/averages/trends, private ratings/positions/age groups, position-aware team generation and bounded attendance reports. [Coaching details](COACHING.md)
- Group chats and reused direct conversations, paginated/virtualized history, unread counts and account-based read state, protected photos, arbitrary emoji reactions, replies, text copying, sender editing/deletion, dictation into an editable draft, separate notices and acknowledgements.
- Season registration, CUGA membership, dues, payments/refunds, audit history, equipment/loans and custom trackers.
- Opt-in public schedule and ICS subscriptions; reviewed CSV import workflows with safe retries. [Product workflow details](PRODUCT-WORK.md)
- Password authentication, admin-approved club/profile access, verified guardian links, reactive updates and server permission checks.
- Club-specific email invitations for new/existing profiles, verified acceptance, delivery states, resend and revocation. [Invitation details](INVITATIONS.md)
- Per-person iCal subscriptions, snapshots, waitlist support and revocable private feed links. [Calendar details](CALENDARS.md)

## UI contract

Feature screens use public components from `src/design-system/`; HTML/native visual imports and free-form styles stay inside that boundary. Inter, neutral semantic surfaces, accent actions and shared radius/spacing/motion tokens are retained.

Coach uses purple and Admin uses amber, with complete light/dark semantic scales. Staff areas use continuous cards with tinted headers. Contextual edit/create controls contain compact role labels inside the same button; dialog labels sit beside the title. Resources and the duplicate mobile drawer are gone. The club name and logo sit at the top left; notifications and the profile menu sit at the right. The profile menu includes a gear icon and Settings, without an account-name subheading. Single-profile accounts retain this menu without profile-switching choices. RSVP dropdowns use green for Going, red for Not going and purple for Not responded and amber for Waitlisted; locked registration remains neutral and disabled.

The mobile tab bar remains mounted and slides over 220 ms, with inset hover and selected states. Glass is confined to floating navigation, with translucent tint, restrained gradient, blur and shared shadows. Pages, cards, menus, messages and dialogs have opaque neutral surfaces. Dialogs retain a 15% contrast backdrop, shadow, close icon, outside dismissal and keyboard avoidance. Chat has a separate footer composer and respects the reader’s scroll position; native keyboard display hides the tab bar.

## Data and permissions

Combined roles live on the account; selected self/child context never changes the authenticated sender or the authorization boundary. Event creation/editing is admin-only. Coaching access applies across the club. Admin status alone does not expose private notes, ratings or unrelated messages. Guardians see linked children’s published feedback and attendance.

Program grouping has been removed from product UI and eligibility logic. Existing `program`/`programs`/`coachPrograms` fields remain as storage compatibility fields so previous local data still loads; nonempty membership/coaching arrays currently represent Player/Coach roles. Existing chat membership lists continue to govern chat access. A future schema migration can remove those legacy fields without silently widening private chat access.

Legacy event seasons and the old federation tracker normalize on load. Single/series edits preserve event identifiers and response history. Restricting eligibility withdraws newly ineligible registrations, retaining observed attendance. Metadata-only edits preserve registration windows.

Photos use Convex storage with authenticated thread-aware downloads, bound ownership and no permanent public storage URLs. Unsent uploads expire; deleting a sent message tombstones its text and deletes its attached storage objects. Replies resolve the original message rather than keeping stale copies of deleted text.

## Verification and limits

TypeScript, Biome, the design boundary and 114 tests pass. Local live suites verify authentication, invitation signup/expiry/revocation, guardian isolation, concurrent capacity, event/season edits, feedback publication/editing/deletion, message ownership/replies/reactions/photo deletion, calendar revision/revocation and reactive changes. Coaching suites additionally cover hours calculations, fitness corrections/statistics, private team settings, attendance denominators and 50-player/520-practice scale boundaries. Verification uses fictional accounts and clubs; it contacts no members.

All platform exports must pass after changes. They verify bundling, not native launch or interaction. Checks in this pass use local backend integration and bundle exports. Device microphone, touch, accessibility, glass appearance and push need device evidence. Dictation needs a fresh native development build with the speech module; unsupported environments show an alternative instead of crashing.

Chat history now uses scoped, paginated reactive queries and a virtualized list. Schedule, member directory, feedback, payments, returns, notices and moderation now use cursor pages; shared screen data and routine writes are scoped. Attendance loads one season at a time. See [performance measurements and remaining limits](PERFORMANCE.md). Indexed inbox summaries, large-history erasure batching and native interaction checks remain before large-scale use. See [messaging readiness](MESSAGING.md). Verified email/recovery/deletion, session revocation, moderation/reporting/blocking, phrase filtering and native Expo push integration are implemented. Live email and APNs/FCM delivery need provider configuration and physical-device verification. Public scheduling, CSV imports and season financial/registration histories are implemented. Broader club audit history remains outside these workflows. See [account, safety and push details](ACCOUNT-SAFETY-PUSH.md). Cadence/count changes and series splitting now preserve identities and individual exceptions. Season ledgers retain prior records and reject stale writes.

See [workflow audit](UX-AUDIT.md), [testing](TESTING.md) and [store release requirements](RELEASE.md).

## Time handling

Events keep a local date and wall time. Recurrences expand calendar dates individually. Historical timestamps use `America/Edmonton`, rejecting ambiguous/nonexistent times. After March 2026 the Calgary adapter uses UTC−06:00 for permanent Alberta Time, avoiding stale device timezone databases. This is club-specific until configurable timezones are added. [Alberta announcement](https://www.alberta.ca/albertas-new-time-system)

## Practice parts

Admins can enable **Training + hockey** in the event editor. Both parts share one practice, capacity, registration window, recurring series, notification and calendar UID. A simple hockey-only or training-only practice keeps the existing controls.

Players choose Both, Training only or Hockey only in Status. Coaches filter All, Training or Hockey for attendance, team generation, private plans and coach assignments. Part attendance is independent: a hockey-only signup is not expected at training. Whole-practice attendance is complete once all selected parts are recorded; any lateness makes it late, otherwise any attended part makes it attended. Part coaching hours use the union of assigned time ranges and update when those times change.

Series edits preserve stable part IDs. Removing a selected part resets affected partial RSVPs to Not responded; the editor warns before saving. Changing parts unpublishes existing lineups for review. Personal calendar subscriptions keep one entry and update its time span to the selected parts, subject to the calendar provider’s refresh interval.

Verification: `bun test tests/practice-*.test.ts`, `bun scripts/verify-practice-calendars.ts`, and `bun run verify:coaching-teams`. Live checks use isolated local fixtures and clean up their accounts.

## Club timezone

Club settings → General has an admin-only searchable IANA timezone setting. Existing Calgary clubs default to America/Edmonton. Times in the app omit timezone suffixes; new events capture the club setting, and edits preserve each event’s saved timezone. Changing the club setting does not shift existing events or their calendar entries. Event timestamps, registration windows, notification scheduling, attendance completion and coaching hours use the event timezone; current-day defaults use the club timezone. Daylight-saving gaps and ambiguous part boundaries are rejected.
