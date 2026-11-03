- Goal: Inspect each route owner and its query/render boundaries; Result: All 39 route entries reviewed, including aliases, authentication, and diagnostic routes; inventory below
- Goal: Remove work from closed sheets; Result: A small retained shell mounts gesture/animation/viewport/stack hooks only while opening, open, or exiting
- Goal: Respond promptly to actions; Result: Actions remain synchronous; sheet transitions use shared standard (200 ms), down from extended (500 ms)
- Goal: Stop avoidable cross-screen rerenders; Result: Command busy/error state has a separate context; stable app data no longer changes solely because a save starts/finishes
- Goal: Keep decorative motion away from web interaction work; Result: Shared CSS transform/opacity animation replaces the web Reanimated clock; native retains its UI-runtime clock
- Goal: Reduce idle and duplicate requests/work; Result: One unread pagination owner; event-driven native pagination on regular scroll pages; preview series sync uses the shared minute clock
- Goal: Remove practice energy check-in; Result: Player collection, coach review, and their unused frontend subscription/forms removed; historical backend data and migration protections retained
- Goal: Verify controls and regressions; Result: Automated checks, optimized web interaction recordings, local backend stress fixtures, and native bundle compilation; hardware limits below

- The source pass followed route owners into their feature/query modules and inspected shared controls, dialogs, material rendering, loading, pagination, avatars, chat rows, lineup gestures, and provider state. Design and motion scanners cover the wider component tree. An import dependency is not proof that a component or subscription is mounted. This is not a claim that every administrative write or external account flow was executed.

- Before: Every mounted Dialog registered stack listeners, shared animation values and gesture/viewport hooks, even when closed; After: `dialog.tsx` is a cheap retained shell; `dialog-content.tsx` owns active work; Why: Opening another dialog no longer notifies dormant dialog implementations
- Before: Sheet transitions lasted 500 ms; After: 200 ms using the existing motion token; interrupted close/reopen retains the existing revision guard; Why: Reduces visible waiting while preserving exit cleanup and gesture dismissal
- Before: Busy/error changes invalidated the same context used for app data; After: `AppStatusContext` is separate, with migrated status consumers; Why: Mutation lifecycle changes no longer invalidate data-only consumers
- Before: Each notification menu owned its unread pagination/scanning; After: One root `InboxProvider`; unopened menus skip their separate All query; Why: Prevents repeated unread pagination as navigation stacks accumulate
- Before: Web material textures ran from a shared JavaScript animation clock; After: One static CSS keyframe owner, local static parameters and compositor transforms/opacity; Why: No application JavaScript runs per texture frame; reduced-motion and inactive states pause motion
- Before: Keyframe text included generated React IDs; After: Stable CSS classes/keyframes; instance parameters live in inline styles; Why: Avoids a server/client text mismatch during hydration; the readable diagnostic build identified the exact ID mismatch
- Before: Server/client font readiness could choose different loading trees; After: A server-stable client-ready snapshot and permanently reserved wordmark structure; Why: Aligns the initial loading tree without replacing native first-frame behavior
- Before: Native pagination measured regular page sentinels every 250 ms while idle; After: Scroll/layout/content events coalesce one check per frame; Why: Removes regular-page idle polling; independent nested ScrollArea viewports retain their bounded fallback
- Before: Preview series responses were recomputed and serialized each second; After: Shared foreground minute subscription plus immediate reconciliation; Why: Removes repeated background preview work while retaining minute-level session boundaries
- Before: Selecting a reply rebuilt unchanged message row content; After: Memoized MessageItem with a stable reply callback; Why: Avoids rebuilding rich message controls for unchanged rows
- Before: Lineup opening remeasured every bubble on animation frames, and each bubble layout could request another full measurement pass; After: Measurements coalesce per frame on layout/drag start; the draw loop no longer remeasures; Why: Reduces bridge/layout work while retaining animated positions and drag behavior
- Before: Missing public links in a backend-free preview crashed on Convex hooks; After: Lightweight invitation/calendar guards before mounting live query owners; Why: Keeps public entry points recoverable without starting invalid subscriptions

- Separate optimized web exports used the same repository and fictional review data, without connecting to production. A test-only HTTP wrapper installed Event Timing/long-task observers and click-to-two-animation-frame measurements. The harness is outside the production bundle. Browser interaction used the actual controls. Saved samples are in [the evidence directory](audits/performance-2026-11-03/).

- Five warm account-sheet openings had median click-to-next-painted-frame times of **15.8 ms before and 15.2 ms after**. This difference is within normal variation and is not evidence of a significant rendering speedup. The baseline selected Sam and the optimized sample selected Alex; both use the same three-profile sheet. The defensible deterministic change is the configured transition reduction from 500 to 200 ms and the removal of dormant work.

- Three additional 650 ms sheet-opening frame windows contained 237 animation-frame intervals: median 8.3 ms, p95 9.2 ms, maximum 10.2 ms; none exceeded 16.7 ms on this desktop. This is a short browser recording, not a physical-phone FPS or GPU measurement. Startup long tasks are separate from these warm interaction windows.

- The existing local-only backend verification created and cleaned its own isolated fixture. It passed with **400 events, 2,000 attendance records, 400 feedback entries, and 120-item directories/payment/return/report/notice histories**. The scoped schedule payload was 26,540 bytes versus 509,308 bytes for the full workspace, and the scoped request took 16 ms in this run. The scoped architecture already existed; this confirms its behavior rather than claiming a new 95% network improvement. Permissions, paging, totals, concurrent payments, and unrelated history were checked.

- Metro already uses two workers, watches only the app and shared packages, and excludes the 3.4 GB local Convex directory. Those settings were retained. No production deploy, OTA publication, native signing, or App Store package update was performed.

- UI render checks use isolated review data. Live-only reports and account services are explicitly identified; a rendered guard is not an end-to-end backend check. Legacy aliases were checked for their destination. Native gesture/keyboard timing requires hardware.

- Route: `/`; Owner / individual inspection: HomeScreen; next practice, household responses, feedback, fitness, notifications/profile; Result: Shared sheet/context changes; repeated account-sheet measurements
- Route: `/schedule`; Owner / individual inspection: AgendaScreen/SchedulePage; program filters, paginated upcoming sessions, one past session, event form; Result: Bounded pages; closed event form sleeps; filter controls checked
- Route: `/club`; Owner / individual inspection: ClubHomeScreen; local search and grouped links; Result: Administration remains expanded; compact grouped rows
- Route: `/messages`; Owner / individual inspection: MessagesScreen; filtering/search, chronological inbox, create-chat dialog; Result: Inbox owner retained once; hidden creation dialogs sleep
- Route: `/conversation`; Owner / individual inspection: ConversationScreen/ThreadContent; virtualized timeline, composer, reactions, attachments, info sheet; Result: 40-message query pages, FlatList window, memoized rows; info opened/dismissed three times and Photos/Files/Polls verified
- Route: `/session`; Owner / individual inspection: EventScreen; overview, attendance, private shoutouts, coaching, plan and lineup; Result: Energy collection/review removed; tab branches remain conditional; lineup drag moved Jordan from left to right forward and marked a local unsaved draft
- Route: `/members`; Owner / individual inspection: MembersScreen; roster, rankings, invitations and member forms; Result: Debounced request term and 30-row data pages retained
- Route: `/member`; Owner / individual inspection: MemberScreen; profile, feedback, goals, attendance, administration and coaching branches; Result: Only selected branch mounts; shared dormant-dialog/query improvements
- Route: `/progress`; Owner / individual inspection: MemberScreen alias; Result: Same bounded branch ownership as member detail
- Route: `/account`; Owner / individual inspection: AccountScreen; own profile/membership/progress and household; Result: Shared context separation; selected section only
- Route: `/account-settings`; Owner / individual inspection: AccountPreferencesScreen; preferences/security/notifications/household; Result: Shared sheet lifecycle; System default and watercolor retained
- Route: `/programs`; Owner / individual inspection: ProgramsScreen; active/archive list, editor, roster and coaching settings; Result: Editors are conditional; stable data independent of mutation status
- Route: `/registration`; Owner / individual inspection: MembershipRecordsScreen; Result: 30-row paginated member records and debounced search
- Route: `/payments`; Owner / individual inspection: MembershipRecordsScreen; Result: Same pagination owner, season-scoped record hooks, guarded submission
- Route: `/equipment`; Owner / individual inspection: EquipmentScreen; items/loans/returns and editors; Result: Local paging retained; dormant editor/loan dialogs sleep
- Route: `/resources`; Owner / individual inspection: ResourcesScreen; filters, list, detail/editor, uploads/media; Result: Paginated list; detail/editor queries mount for the selected task; uploads remain deliberate
- Route: `/fitness`; Owner / individual inspection: FitnessScreen/FitnessData; definitions, sessions, results, progress; Result: Request-discriminated skip guards and paginated rosters retained; no eager hidden form lifecycle
- Route: `/attendance-report`; Owner / individual inspection: AttendanceReportScreen/AttendanceDashboard; Result: Scoped complete-report query, local sorting and 30 visible rows; live-only data verified through backend fixtures, not preview
- Route: `/coaching-hours`; Owner / individual inspection: CoachingHoursScreen; assignments/hours; Result: Selected branch only; live service guard retained
- Route: `/development`; Owner / individual inspection: DevelopmentScreen; player ratings/reviewer policy; Result: Coach-gated branch; review forms benefit from shared lifecycle
- Route: `/shoutouts`; Owner / individual inspection: ShoutoutsScreen/FeedbackList; Result: Private audience and bounded history retained; editor sleeps until opened
- Route: `/announcements`; Owner / individual inspection: AnnouncementsScreen; Result: Active-notice query and conditional editor retained; forms no longer subscribe while closed
- Route: `/moderation`; Owner / individual inspection: ModerationScreen; Result: Queue remains route-scoped; report/settings dialogs sleep
- Route: `/settings`; Owner / individual inspection: SettingsScreen; Result: Explicit status consumers; other data consumers avoid busy-only updates
- Route: `/import`; Owner / individual inspection: ImportScreen/ImportWorkspace; Result: Admin gate and staged file parsing retained; no file imported during UI smoke check
- Route: `/terms`; Owner / individual inspection: TermsScreen; Result: Legal document render checked; no acceptance submitted
- Route: `/join`; Owner / individual inspection: JoinInviteScreen; Result: Missing/unavailable service guarded before live hooks; no invitation accepted
- Route: `/calendar`; Owner / individual inspection: PublicScheduleScreen; Result: Missing link/service guarded before live hooks; actual public queries remain backend-owned
- Route: `/connect-account`; Owner / individual inspection: ConnectAccountScreen; Result: Service/connection entry render checked; no account linked
- Route: `/auth-callback`; Owner / individual inspection: AuthCallbackScreen; Result: Callback status/return UI checked; no external sign-in attempted
- Route: `/email-sign-in`; Owner / individual inspection: EmailSignInScreen; Result: Missing-code path checked; no email sent
- Route: `/delete-account`; Owner / individual inspection: DeleteAccountScreen; Result: Render/availability guard checked; no account deleted
- Route: `/membership`; Owner / individual inspection: Redirect to Account membership; Result: Destination checked
- Route: `/my-progress`; Owner / individual inspection: Redirect to Account progress/attendance; Result: Destination checked
- Route: `/administration`; Owner / individual inspection: Registration/payments/Club redirects; Result: Default destination checked; source selection branches reviewed
- Route: `/club-information`; Owner / individual inspection: Redirect to Club; Result: Destination checked
- Route: `/glass-preview`; Owner / individual inspection: Isolated comparison page; Result: Preview stays scoped; no global glass/grid rollout in this performance pass
- Route: `/review-auth`; Owner / individual inspection: Isolated auth/loading preview; Result: Render checked; startup uses consistent wordmark structure
- Route: `/otp-test`; Owner / individual inspection: Isolated OTP control test; Result: Render checked; no real authentication transaction

- The full Bun suite passed 884 tests across 201 files with 22,424 assertions. TypeScript, targeted Biome, design boundaries, and app/site motion checks passed. Optimized web and iOS JavaScript exports compiled. Phone-width UI navigation from Home to practice and Coaching, then opening and closing the session-plan sheet, was checked. No practice energy control remained.

- The standalone narrow iframe harness intermittently returned to Home after direct deep-link entry. Navigation through the actual Home card remained stable. This harness observation is unresolved and is not evidence that native deep links passed.

- Browser checks found no document-level horizontal overflow on inspected desktop routes and no idle canvas contexts after startup on routine pages. The lineup intentionally mounts its liquid renderers only when opened. A successful iOS JavaScript export verifies resolution/compilation, not installed-device behavior.

- A physical iPhone/Android trace is still needed to establish touch latency, native GPU frame pacing, keyboard performance, and long-session memory. Test rapid sheet open/close, nested pickers, a large live roster, lineup dragging, background/resume, and spotty networking on hardware. Short desktop samples do not establish those results.

- React’s [hydration error reference](https://react.dev/errors/418) documents why a mismatched initial tree is regenerated; the diagnosis here came from the local readable export’s component diff.
