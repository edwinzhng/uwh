- Historical September 8 screen/control/backend audit, not the current missing-feature list or visual specification. The [October parity audit](MONDAY-HUB-PARITY.md) records later completed work. Current scope removes decorative role tags while preserving authorization; this note supersedes earlier tag-based hierarchy. Simulator/device interaction remains unverified by this record.

- Workflow: Personal schedule; Result: Schedule remains the default. Compact event details put the title and complete time range together, with the venue below. Long text can wrap on small phones. Attendance count sits with the attendance action.
- Workflow: RSVP; Result: One Status dropdown in a stable position. Opening/closing and restricted registration have explicit disabled labels. Actual attendance remains separate from RSVP.
- Workflow: Family context; Result: The top-left menu offers Switch profile for families and Account for a single profile. Account settings always remains available. The active person’s name stays visible; switching does not change the signed-in account, message author or an explicitly opened member.
- Workflow: Permission hierarchy; Result: Available actions remain permission-filtered without decorative role tags on buttons, tabs, dialogs or headings. Explicit access-management choices remain.
- Workflow: Club; Result: Resources and duplicate mobile navigation are removed. Admin links and Coach links are grouped. Personal membership stays separate. Account settings opens from the top-left profile menu.
- Workflow: Event administration; Result: Admins create and edit events. Daily, weekdays, weekly, fortnightly and monthly repetition support 1–52 instances. Save applies to one occurrence, this and following, or the whole series; cadence/count edits and preserved exceptions are supported. Existing IDs, RSVPs and attendance survive edits.
- Workflow: Event eligibility; Result: Registration can be restricted to selected players. Both self and guardian writes enforce eligibility. Removing eligibility withdraws the affected registration; recorded attendance is retained.
- Workflow: Seasons; Result: Events are assigned to a season; legacy events resolve to 2026–2027. Admins can add seasons. Schedule and attendance offer season filters. Registration, CUGA, dues, payments and refunds have separate season records and a change history.
- Workflow: Attendance; Result: Staff reach attendance from the event card. Here, Late and No-show are one-tap controls with tap-again undo. Member charts summarize completed eligible practices: attended / recorded; on time / attended. Unmarked records are explicit and excluded from percentages.
- Workflow: Teams and plans; Result: Staff planning lives in Coaching. Event overview shows published teams. Cancelled sessions disable editing controls.
- Workflow: Feedback; Result: New feedback can publish immediately. Drafts can be edited, published or deleted by their author. Private notes remain private. Shared feedback and private work are visually separated. Goal editing remains beside the goal.
- Workflow: Directory and trackers; Result: Names identify members without decorative role summaries; account status retains Signed in/Sample data rather than role chips. CUGA membership remains a Yes/No toggle.
- Workflow: Chat; Result: Five quick emoji reactions plus the full picker. Reply, copy, edit and delete actions; protected photos are removed with their message. Dictation produces an editable draft and never sends automatically.
- Workflow: Mobile composing; Result: Composer stays below the message scroll area. New messages follow the bottom only when already near it. Native tabs hide for the keyboard. Inputs use email/numeric/decimal keyboards where appropriate; long text stays bounded.
- Workflow: Dialogs; Result: Shared presentation, accessible dismissal and keyboard avoidance; no role badge beside the title.
- Workflow: Visual consistency; Result: Shared corners and inset sliding selection/hover frames; 220 ms motion; stronger selected contrast. Only floating navigation uses glass. Content surfaces are solid. RSVP status dropdowns use green, red and amber semantic tones with visible labels.
- Workflow: Failure handling; Result: Permission errors, unavailable dictation, denied microphone access and stopped speech preserve editable text. Signup edits preserve registration windows. UI actions use the backend’s success result before closing relevant editors.

- At the time of this earlier audit, TypeScript, Biome, the design boundary and 56 tests passed, along with four local live Convex suites for core workflows, messaging and calendar subscriptions. They used fictional clubs. Native microphone/speech permission descriptions and Android RECORD_AUDIO were checked in resolved Expo configuration. These are not fresh checks of the current visual pass.

- Production hosting and real email delivery: account verification/recovery/deletion and the signed-out/approval states are now implemented. Configure the verified sender and confirm retention policy.
- Push delivery, deep-link behavior and real device testing. Saving a reminders preference does not send notifications.
- Messaging read state and a defined youth-contact policy; moderation/reporting/blocking, text filtering and chat suspension are now implemented; paginated message/history loading; direct-conversation reuse.
- Actual reviewed migration from club exports; [season records and import tools](PRODUCT-WORK.md) are now implemented.
- Broader coaching modules remain beyond the completed scheduling, records and migration workflows.
- Manual phone review for keyboard, accessibility, gestures, long labels, family changes, weak networks and glass performance.

- See [release requirements](RELEASE.md) and [manual journeys](TESTING.md).

- The follow-up [cleanup audit](CLEANUP-AUDIT.md) records account, moderation and notification fixes plus the recommended pilot and scaling work.
