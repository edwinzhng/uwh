# Workflow audit · September 8, 2026

Reviewed the screen hierarchy, shared controls, permission checks, data mutations and native platform implementations. This was a source and backend audit; browser, simulator and device interaction were not exercised.

## Applied

| Workflow | Result |
| --- | --- |
| Personal schedule | Schedule remains the default. Compact event details put the title and complete time range together, with the venue below. Long text can wrap on small phones. Attendance count sits with the attendance action. |
| RSVP | One Status dropdown in a stable position. Opening/closing and restricted registration have explicit disabled labels. Actual attendance remains separate from RSVP. |
| Family context | The top-left menu offers Switch profile for families and Account for a single profile. Account settings always remains available. The active person’s name stays visible; switching does not change the signed-in account, message author or an explicitly opened member. |
| Staff hierarchy | Purple Coach and amber Admin scales exist in both themes. Staff-only areas have banners; contextual buttons contain compact role labels and dialogs place them beside titles. These labels describe available controls, not a mode switch. |
| Club | Resources and duplicate mobile navigation are removed. Admin links and Coach links are grouped. Personal membership stays separate. Account settings opens from the top-left profile menu. |
| Event administration | Admins create and edit events. Daily, weekdays, weekly, fortnightly and monthly repetition support 1–52 instances. Save applies to one occurrence, this and following, or the whole series; cadence/count edits and preserved exceptions are supported. Existing IDs, RSVPs and attendance survive edits. |
| Event eligibility | Registration can be restricted to selected players. Both self and guardian writes enforce eligibility. Removing eligibility withdraws the affected registration; recorded attendance is retained. |
| Seasons | Events are assigned to a season; legacy events resolve to 2026–2027. Admins can add seasons. Schedule and attendance offer season filters. Registration, CUGA, dues, payments and refunds have separate season records and a change history. |
| Attendance | Staff reach attendance from the event card. Here, Late and No-show are one-tap controls with tap-again undo. Member charts summarize completed eligible practices: attended / recorded; on time / attended. Unmarked records are explicit and excluded from percentages. |
| Teams and plans | Staff planning lives in Coaching. Event overview shows published teams. Cancelled sessions disable editing controls. |
| Feedback | New feedback can publish immediately. Drafts can be edited, published or deleted by their author. Private notes remain private. Shared feedback and private work are visually separated. Goal editing remains beside the goal. |
| Directory and trackers | Top-level members show combined roles, without positions or programs. CUGA membership is a Yes/No toggle. Account badges now reflect actual player membership. |
| Chat | Five quick emoji reactions plus the full picker. Reply, copy, edit and delete actions; protected photos are removed with their message. Dictation produces an editable draft and never sends automatically. |
| Mobile composing | Composer stays below the message scroll area. New messages follow the bottom only when already near it. Native tabs hide for the keyboard. Inputs use email/numeric/decimal keyboards where appropriate; long text stays bounded. |
| Dialogs | Shared radius, 15% backdrop, shadow, close icon, outside dismissal and keyboard avoidance. Staff dialogs retain their role badge. |
| Visual consistency | Shared corners and inset sliding selection/hover frames; 220 ms motion; stronger selected contrast. Only floating navigation uses glass. Content surfaces are solid. RSVP status dropdowns use green, red and amber semantic tones with visible labels. |
| Failure handling | Permission errors, unavailable dictation, denied microphone access and stopped speech preserve editable text. Signup edits preserve registration windows. UI actions use the backend’s success result before closing relevant editors. |

## Verification

TypeScript, Biome, the design boundary and 56 tests pass. The four live Convex suites pass for core workflows, messaging and calendar subscriptions. They use fictional local clubs. Contrast checks include the new role colors in light and dark themes. Native microphone/speech permission descriptions and Android RECORD_AUDIO were verified in resolved Expo configuration.

## Remaining product and release work

- Production hosting and real email delivery: account verification/recovery/deletion and the signed-out/approval states are now implemented. Configure the verified sender and confirm retention policy.
- Push delivery, deep-link behavior and real device testing. Saving a reminders preference does not send notifications.
- Messaging read state and a defined youth-contact policy; moderation/reporting/blocking, text filtering and chat suspension are now implemented; paginated message/history loading; direct-conversation reuse.
- Actual reviewed migration from club exports; [season records and import tools](PRODUCT-WORK.md) are now implemented.
- Broader coaching modules remain beyond the completed scheduling, records and migration workflows.
- Manual phone review for keyboard, accessibility, gestures, long labels, family changes, weak networks and glass performance.

See [release requirements](RELEASE.md) and [manual journeys](TESTING.md).

The follow-up [cleanup audit](CLEANUP-AUDIT.md) records account, moderation and notification fixes plus the recommended pilot and scaling work.
