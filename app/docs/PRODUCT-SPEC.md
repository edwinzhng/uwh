- Status: original product planning inventory, September 7, 2026, with current scope decisions updated October 25, 2026. The [parity audit](MONDAY-HUB-PARITY.md) records the delivered contracts and verification boundaries; the original priority labels below are not a current missing-feature list.

- Build a mobile-first club workspace with Expo and React Native and Convex as the backend. Ship one club with multiple programs, age groups, teams, and seasons first; make club ownership explicit in the data model so additional clubs do not require a rewrite.

- The product should make four things easy: know what is happening, respond to it, communicate with the right people, and improve as a player. Keep information compact, hierarchy clear and actions fast. The current visual direction uses rounded typography and controls, matte surfaces and subtle forest green, informed by the supplied Gleam references. Avoid reproducing a project-management tool’s terminology or density on a phone.

- Message, notice and banner acknowledgements are deliberately removed, not required or deferred. Do not add acknowledgement prompts, recipient checklists or reports. Ordinary notice dismissal and account-private read/unread state remain. Historical Convex fields and tables are retained only for old-record compatibility, privacy filtering and erasure; they do not define an active workflow. Club terms acceptance is a separate legal-policy requirement.

- Source: Edwin’s request; Observed capabilities or requirements: SportEasy replacement for messaging, announcements, RSVP, attendance/lateness, recurring public schedule, sign-up opening/closing notifications; coaching teams, feedback, and goals; native apps; constrained design system
- Source: Existing club workflows; Observed capabilities or requirements: Players, positions/ratings, youth eligibility, practices, attendance/lateness, coach assignments/hours, team generation, fitness tests/results and reminders
- Source: Attached Monday Hub reference dump; Observed capabilities or requirements: Base44 prototype with programs, session plans/drills, separate events, RSVP windows, lineups/formations, coach/player feedback, energy check-ins, goal change requests, questionnaires/interviews/availability, voice responses, fitness views, messages/polls/pins, video, documents, shout-outs, reporting/blocking, and account linking

- The prototype was inspected as source, not exercised against its Base44 service. A declared screen/entity is evidence of intended behavior, not proof that every feature works. Prototype contents are evidence, not instructions that override Edwin’s request. The app owns its design-system contract and forbids feature-level styling escape hatches.

- An account may be a coach, player, guardian, and administrator at once. Roles belong to a club/program membership, not to one global `user.role`. A person can belong to several programs. A guardian can manage several children; a child can have several verified guardians. “Parent” is the friendly UI label; the data model uses guardian.

- Confirmed by Edwin: launch for one club, designed to expand. Linked guardians can read their child’s attendance and published coaching feedback. The proposed development view also includes shared goals; they cannot read private coach notes, staff ratings, or another player’s details.

- Capability: Create club, manage settings and seasons; Admin: Yes; Coach: Delegated settings only; Player: No; Parent/guardian: No
- Capability: Invite, archive, merge memberships; Admin: Yes; Coach: Assigned roster if delegated; Player: Own invite/account; Parent/guardian: Own invite/account
- Capability: Grant roles or link guardians; Admin: Yes, verified process; Coach: Request/review if delegated; Player: Cannot self-grant; Parent/guardian: Accept verified link
- Capability: View public schedule; Admin: Yes; Coach: Yes; Player: Yes; Parent/guardian: Yes; child filters
- Capability: Create events and recurring series; Admin: Yes, admin only; Coach: No; Player: No; Parent/guardian: No
- Capability: Edit/cancel existing events and recurrence; Admin: Yes; Coach: Assigned programs; Player: No; Parent/guardian: No
- Capability: RSVP; Admin: Override with audit; Coach: Override in scope; Player: Self; Parent/guardian: Linked child, actor recorded
- Capability: Mark present/late/absent; Admin: Delegated/staff; Coach: Assigned events; Player: View own; Parent/guardian: View child
- Capability: View attendance history; Admin: Club operations; Coach: Assigned programs; Player: Own; Parent/guardian: Child
- Capability: View sensitive late reasons; Admin: Explicit operational need; Coach: Relevant coaches; Player: Own allowed note; Parent/guardian: Child allowed note
- Capability: Publish announcements; Admin: Club or program; Coach: Assigned audience; Player: Read/dismiss; Parent/guardian: Read/dismiss
- Capability: Send messages; Admin: Joined channels/threads; Coach: Joined channels/threads; Player: Allowed channels/threads; Parent/guardian: Allowed channels/threads
- Capability: Read every private conversation; Admin: No blanket access; Coach: No; Player: No; Parent/guardian: No
- Capability: Moderate reported content; Admin: Designated moderator, audited; Coach: If designated; Player: Report/block; Parent/guardian: Report/block
- Capability: Generate/edit/publish lineups; Admin: If coaching permission; Coach: Assigned events; Player: Published lineup; Parent/guardian: Published child lineup
- Capability: Read balancing ratings; Admin: Explicit coaching permission; Coach: Assigned roster; Player: No by default; Parent/guardian: No
- Capability: Write private coaching notes; Admin: If assigned as coach; Coach: Assigned players/program; Player: No; Parent/guardian: No
- Capability: Read published feedback; Admin: Explicit staff scope; Coach: Assigned players; Player: Own; Parent/guardian: Child if enabled
- Capability: Goals and reflections; Admin: If assigned; Coach: Set goals; Player: Save own goals directly and write own reflections; Parent/guardian: Read/support; no impersonation
- Capability: Log fitness results; Admin: Assigned staff; Coach: Assigned group; Player: Own if allowed; Parent/guardian: Read child if allowed
- Capability: View comparisons; Admin: Scoped and consent-aware; Coach: Scoped; Player: Own/private by default; Parent/guardian: Child/private by default
- Capability: Complete questionnaire/interview; Admin: Excluded from current scope; Coach: Excluded; Player: Excluded; Parent/guardian: Excluded
- Capability: Manage resources; Admin: Club scope; Coach: Program scope; Player: Read allowed items; Parent/guardian: Read allowed items
- Capability: Export data; Admin: Audited club operations; Coach: Scoped reports; Player: Own data request; Parent/guardian: Child where authorized

- Club-owner privileges govern administrators; prevent removing the last owner. Administrative access alone does not imply permission to read personal coaching notes. Sensitive reads and writes enforce membership, scope, relationship, and visibility on the server. Permissions combine without a global role switch; only the fictional preview offers an account chooser.

- Implemented navigation: **Home · Schedule · Messages · Account · Club**. Coaching lives inside event details and member profiles; members and club operations live in Club. Conversations use the available full height on phones instead of retaining the surrounding tab bar. Permissions add contextual tools without a role switch. See [participation IA](IA-IMPLEMENTATION.md) for the destination model.

- Schedule puts upcoming sessions and responses first, with compact links to urgent notices or relevant changes. Goals and check-ins live in member Progress; coaching tasks live in their session. Program filters and personal context remain independent. Always show whom a parent is acting for.

- Parents switch child profiles directly in the persistent header, without navigation or losing their place on the current page. Use avatar/name choices for small families; introduce a searchable popover/sheet only when the list needs it. The selected child updates attendance, development, feedback and membership in place and remains selected when navigating. Keep each child’s responses, drafts and progress separate. A pending submission keeps the person ID captured when it started; switching profiles never retargets an in-flight action. If a child is not eligible for the currently viewed event, keep the event page and explain eligibility instead of showing another child’s controls. Switching profiles does not change the guardian’s account or permissions.

- Messages is a compact inbox with All, DMs, Groups and Channels filters. Recurring program and event rooms remain channels; opening one leads directly into its conversation. Pins and polls share one compact tool strip and open their full content separately. Club announcements remain distinct notices on Home, with ordinary dismissal and no acknowledgement state exposed as a task. Notification activity opens from the bell and links to the relevant event, notice, feedback or other record.

- Public web schedule is readable without an account. It exposes only approved event details: title, date/time/zone, location and public description, plus join/contact instructions. It never exposes player names, youth rosters, coaching plans marked private, or attendance details.

- Priority **R1** means required before replacing the current SportEasy workflows. **R2** means coaching consolidation after reliable club operations. **R3** means later expansion, not a blocker for the first club.

- Invite by email/link, expiry, resend/revoke, existing-account acceptance, account recovery, sign out, session/device revocation, and account deletion/export requests.
- Maintain person records separately from login accounts. Players without their own login are represented by verified guardians. Invite acceptance claims an existing person record; matching names or emails must not silently merge identities.
- Multiple memberships and capability sets; club/program/season switcher; active, invited, paused, archived states. Archive membership without erasing history.
- Guardian relationship invitation, verification, acceptance, revocation, and a record of who approved it. Separate household notification preferences. A parent may also play.
- First-run explanation of notifications followed by a contextual permission prompt. Ask after an action whose benefit is clear, such as joining a program.
- Profiles: preferred/display name, optional photo, cap number, contact visibility, positions, program memberships, emergency contact if needed. Restrict sensitive fields by purpose.

- **Acceptance:** an invite cannot grant a role beyond the inviter’s scope; expired and reused links fail safely; two accepted invites for one person do not create duplicates; revoking a guardian link immediately removes access; selecting a child does not change the account’s actual permissions.

- Only club admins create events and recurring series. Coaching permissions alone cannot grant creation access, including through duplicate/template actions. The server’s scheduled series expansion must originate from an admin-created series. Existing-event edits remain scoped to assigned coaches as specified in the role matrix; coaching plans and attendance are separate from event creation.
- Event types: practice, match/scrimmage, tournament, social, meeting; venue, time zone, start/end, arrival time, instructions, audience, capacity, optional attached plan/resources.
- Weekly and every-two-weeks recurrence, selected weekdays, end date/count, holiday skips; monthly/custom recurrence can follow unless needed immediately.
- Explicit edit choices: this occurrence; this and future; entire series. Preserve event identities, responses, and history. Cancellations are recorded, not destructive deletes.
- Draft/published/cancelled/completed lifecycle; event change history; preview affected dates and notification audience before committing a series change.
- Public schedule projection and subscription via calendar feed (ICS); authenticated calendar feed may include only the subscriber’s allowed events. Feed revocation and stable calendar UIDs.
- Separate registration opens-at, reminder-before-close, closes-at and event-start times. Defaults live on program/series; individual events may override them.

- **Acceptance:** a weekly 8 PM Calgary practice remains at 8 PM through daylight-saving changes. Changing one date does not shift the series. Changing future dates does not lose existing RSVPs. A cancelled event remains intelligible from an old link or calendar entry. Invalid date order is rejected. Multiple events on one date are not deduplicated by calendar date.

- Response states: no response, going, unavailable; tentative optional per club policy. RSVP is distinct from actual attendance: unmarked, present, late, absent/excused.
- Quick response from event/Today, edit before close, parent responding for a child, coach override after close with reason and audit trail.
- Deadline countdown in the event time zone; late cancellation/addition classification computed from the configured policy, with explicit exceptions.
- Capacity and waitlist where enabled; atomic last-place reservation; queue order, promotion, notification, and expiry/confirmation policy. Do not promise a place before the server confirms the reservation.
- Coach attendance view optimized for poolside use: roster/search, mark all present then exceptions, minutes late or arrival timestamp, late reason visibility, undo, guest/addition flow.
- Season totals: attended, eligible events, lateness, cancellations, unanswered responses. Show denominators and exclusions; avoid misleading percentages from cancelled events or pre-membership sessions.
- Reports/export and correction history. Coaching hours/assignments from the current app must remain available until their replacement exists.

- **Acceptance:** repeating the same request never creates a second RSVP. Two people competing for one place cannot both reserve it. A parent/player conflict returns the authoritative response. Changing an RSVP does not rewrite observed attendance. Offline changes show pending status and cannot bypass a closed deadline when reconnected.

- Sign-up opened; reminder before closing; sign-up closed/roster finalized to appropriate staff; cancellation/time/location change; waitlist promotion; direct reply/mention; announcement published; lineup/feedback/questionnaire published in R2.
- Durable in-app notification records plus push delivery. Push is a prompt to retrieve authorized state, not the database or a guaranteed delivery channel.
- Per-account/device tokens, channels/categories, quiet hours, timezone-aware preferences, badge/read state, muted threads, household deduplication choice, revoked devices, notification permission settings/help.
- Deep links survive app cold-start and authentication. After login, recheck membership and destination state. Cancelled, deleted, or inaccessible destinations produce an explanatory screen.
- Server scheduling owns deadlines; editing/cancelling an event invalidates old jobs. Deduplicate recipient/event/version/type. Retry transient delivery failures and inspect provider receipts; disable expired tokens.
- Notify only relevant recipients. Opening: eligible participants; closing reminder: unanswered participants by default; cancellation: affected participants; staff operational summary: coaches. Do not send private coaching text on a lock screen.

- **Acceptance:** rescheduling an event sends no obsolete reminder; retrying a worker creates no duplicate in-app activity; permission denial still leaves a usable schedule/inbox; opening a push for another child clearly selects the correct child; rate-limit/provider failure is visible to operations. Never equate “push accepted” with “member read it.”

- Club/program channels, event conversations, direct/group threads, coach-only channel. Membership determines channel access; thread membership is explicit.
- Text, replies, reactions, attachments, mentions, unread state, timestamps, edit/delete policy, pinning, search, pagination, offline drafts and retryable sends with idempotent client IDs.
- Announcements: title/body, authorized audience, publication, expiry and ordinary account-specific dismissal. Reading or dismissing one must not request a response or expose a recipient-completion report.
- Polls from the prototype: basic single/multiple choice, deadline, eligible audience, result visibility, one vote per person; R2 unless currently essential to SportEasy usage.
- Report/block with designated moderator workflow; attachment limits and safe handling; visibility changes when someone leaves. Decide youth communication rules before enabling direct adult/minor messaging; model guardian or second-adult inclusion where required by club policy.
- Notification controls distinguish all messages, mentions/replies only, and muted. Announcements needing action remain discoverable in Today.

- **Acceptance:** a client cannot read an unrelated thread by guessing its ID; failed sends keep their draft; retries do not duplicate a message; editing an announcement preserves audience and version safety without creating a reader task; a departing member loses access as defined by retention policy. Administrator metadata access does not silently expose private DMs.

- A session plan attaches to an event: theme, outcomes, timed blocks, warm-up, drills, equipment, diagrams/video links, coaching assignments, public player summary and private staff notes.
- Reusable drill and plan templates; duplicate/adapt by program; total planned duration; actual coach minutes and debrief.
- Generate two or more groups from a captured attendee set. Configurable sport/formation/position labels rather than hard-coded black/white columns and Monday-only sessions.
- Inputs: confirmed/checked-in attendees, position preferences, rating/skill dimensions, team sizes, coach placements, youth/adult eligibility, locked assignments, keep-together/separate constraints when explicitly needed.
- Deterministic generation with seed, explanation of tradeoffs, infeasible-constraint warnings, manual move/swap, undo, bench/rotation handling, and save revisions. Coach judgement remains final.
- Draft and published lineups are separate. Publication snapshots assignments and audience; later changes create revisions. Late attendee changes flag a stale draft and offer targeted regeneration while honoring locks.
- Players see published assignments and instructions, never hidden balancing ratings. Export/share within authorized destinations; copying text is available before any optional Discord integration.

- **Acceptance:** every eligible attendee is assigned at most once; no excluded player appears; hard locks survive regeneration; insufficient position coverage is explained; private draft lineups remain inaccessible; publication of a revised lineup notifies only affected people where practical. The current preview generator balances sample headcount/ratings only and is not the production constraint engine.

- Reusable development plans span a season or custom period. Goals have owner, category, title, measurable or qualitative success criteria, review date, status, milestones and visibility.
- Feedback observations link to player, event and optionally goal/skill. Separate coach-private observation, draft feedback, published feedback, player reflection, guardian-facing summary.
- Coach can draft after practice, review the exact recipient/audience, then publish. Players can read feedback and add their own reflections or self-ratings; no acknowledgement step is required. Goal revisions/change requests carry reasons and coach review where enabled.
- Progress comes from explicit evidence/check-ins; avoid treating every coaching outcome as an arbitrary percentage. Show quantitative progress only when a defined numerator/target exists.
- Private coach debrief is separate from player feedback. Club administrators do not receive implicit access to all private coaching content.
- Archive completed plans, retain revision history, allow season-to-season continuity. Notifications link to the item and respect its audience.

- **Acceptance:** published and private versions cannot be confused; edits after publication are versioned; a guardian can see only the approved child-facing scope; removing a coach’s assignment removes access; player self-report is distinguishable from coach evaluation.

- Questionnaires, interviews and interview availability are explicitly excluded from the current request. Their original inventory below is context, not a required or deferred implementation commitment. Private session energy and resource voice annotations are implemented independently of those excluded workflows.

- Form templates with stable question IDs and versioned schemas; rating, choice, text, optional voice answer. Assign by program/person, open/close, save draft, submit, completion tracking, reminder, scoped review.
- Coach/player interview booking: coach availability, timezone, slot duration/buffer, reserve/cancel/reschedule, prevent double booking, and retain notes within the appropriate audience.
- Optional pre-session energy/wellbeing check-in. Make its purpose clear and keep it private to the player and designated staff; do not display it in a general roster/feed.
- Audio: explicit record/upload action, playback, retention/deletion, optional transcription separately approved. AI summaries are drafts for coach review, never automatic assessments or published facts.

- **Acceptance:** changing a template does not rewrite submitted answers; completed assignments are not reminded again; booking races are atomic; a player cannot retrieve another player’s answers; the app remains usable when microphone permission is denied.

- Retain customizable time/count/pass-fail tests and sessions from the existing app; add units, higher/lower-is-better direction, protocol/version, result validation, personal bests, trends, notes, corrections and archive.
- Coach rapid-entry flow; optional self-entry requiring review; player/guardian history where authorized; comparisons over compatible protocols only.
- Private individual results by default. Named or anonymous leaderboards require a club policy and appropriate participant visibility. A player display preference cannot grant access to other players’ private data.
- Export results, preserve imported units and provenance, distinguish missing result from zero/fail. No automated medical interpretation.

- **Acceptance:** slower times are not ranked as better; protocol changes do not silently merge incompatible results; ties are deterministic; corrections preserve history and authorship; permissions apply to aggregate queries too.

- Team documents, playbook, equipment/venue instructions, video library and clips with tags, audience, owner, version, archive, search and event/goal links.
- Video metadata and access-controlled storage/links; avoid duplicating video binaries in messages. Optional uploads need size/duration limits and a processing plan.
- Shout-outs/recognition with consent and moderation; keep private feedback out of recognition posts. Notifications follow membership and preferences.
- Historical players and seasons remain searchable for staff without reactivating accounts.

- **Acceptance:** private attachments cannot be fetched through a public link; an archived resource is handled gracefully from old messages; replacing a document preserves its identity, revision safety and current access controls without a reader-confirmation workflow.

- Club profile, brand defaults, venues, program/season setup, permission grants, invitation queue, archived people, duplicate review, guardian verification, account linking and audit log.
- Import staging, source IDs, field mapping, dry-run reconciliation, conflicts and rollback plan. Export club-owned data; source-specific identifiers are optional integration fields, not primary identity.
- Notification delivery diagnostics, failed-job retry queue, support contact, crash/error reporting, backup/restore runbook and release history.
- Accessibility and reliability: offline-aware states, recoverable errors, large text, VoiceOver/TalkBack, keyboard use on laptop, reduced motion, contrast, low bandwidth, time-zone handling and attachment loading.

- **Acceptance:** permissions cannot be escalated by editing a client payload; source imports are repeatable; counts and history reconcile; a restore drill succeeds in a separate environment; operational logs contain IDs/diagnostics rather than private message/feedback contents by default.

- Edwin has now requested registration/payment status tracking, equipment management and configurable member trackers. These are part of the proposed app scope; their records, visibility and mobile placement are detailed in the [mobile hierarchy proposal](MOBILE-HIERARCHY.md). Initial payment tracking assumes manual records; equipment assumes inventory and issue/return workflows. Their delivery priority is proposed there rather than making them blockers for the initial schedule slice.

- Online dues collection and registration checkout, electronic waiver signing, expense accounting, tournament brackets, travel/carpools, multi-club self-service, federation integrations, advanced video annotation, AI-generated training recommendations, fully offline collaborative coaching, and public marketing/CMS remain candidate later modules.

- Stage: 0 · Foundation; Deliverable: Tokens, components, showcase, sample navigation and role views; Exit gate: Code checks pass; native/visual checks explicitly recorded; bundled Inter typography reviewed
- Stage: 1 · Club core; Deliverable: Identity, scopes, guardian links, event recurrence/public calendar, RSVP/attendance; Exit gate: Permission tests and recurrence/concurrency scenarios pass against a nonproduction backend
- Stage: 2 · SportEasy parity; Deliverable: Channels/DMs, announcements, native push, inbox, basic import/export; Exit gate: Pilot families complete real weekly workflows; no unresolved attendance/notification/data-access defects
- Stage: 3 · Club administration; Deliverable: Registration trackers, manual payment records, equipment inventory and loans; Exit gate: Admins reconcile member statuses, issue/return equipment and verify private details stay scoped
- Stage: 4 · Coaching; Deliverable: Plans, generation/publishing, development plans, private/published feedback; Exit gate: Coaches complete an event from attendee selection to feedback without needing the old app
- Stage: 5 · Prototype consolidation; Deliverable: Fitness/resources/recognition and coach hours parity; interviews/forms excluded; Exit gate: Historical data reconciles and staff accept the in-scope workflows before cutover
- Stage: 6 · Expansion; Deliverable: Additional clubs and optional modules; Exit gate: Real demand and operational/support capacity justify each module

- A practical planning range for one experienced engineer with agent assistance is roughly 1–2 weeks for foundation/native setup, 3–5 weeks for club core, 2–4 weeks for communications/push and a pilot, then 4–8 weeks for coaching/prototype consolidation. These are estimates, not a delivery commitment; account setup, data export quality, feedback and app-store review can change the schedule. Prefer gated releases over one large rewrite.

- Do not retire SportEasy until scheduling, response windows, attendance/lateness, member messaging, announcements, and native notification journeys pass a real club pilot. Run a small cohort first, then at least two normal weekly cycles with a named system of record for each event. Freeze old writes at cutover; avoid ambiguous bidirectional sync.

- Adult/minor messaging policy, youth age range and guardian consent process. Guardian attendance and published-feedback access are confirmed.
- Expected membership and events per week. One initial club with later expansion is confirmed.
- Actual program/team structure, attendance capacity/waitlist rules, response deadlines, late tolerance and coach override rules.
- Required historical SportEasy message retention and available exports; Base44 export access and actual data volume.
- Login method, Apple/Google developer accounts, Expo project ownership, operational email delivery, privacy/retention policy and support owner.
- Whether all prototype capabilities are actively used or some can stay in the legacy app until later stages.

- These decisions do not block the isolated design foundation. They do block specific production features or launch sign-off; a preview’s working defaults are not approval for those policies.
