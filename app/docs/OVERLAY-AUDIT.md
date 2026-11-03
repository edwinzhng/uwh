- November 1, 2026. The review covers each direct `Dialog` caller and its delegated body, not just the shared frame. Mobile overlays remain bottom sheets. Long editors use retained sections, bounded scrolling and clear actions rather than fullscreen modals. Native device behavior still needs hardware verification.

- The source inventory contains 84 direct JSX call-sites: 74 in features and 10 in the design system. Six are isolated showcase examples, leaving 78 product call-sites. The categories below are mutually exclusive by the caller's primary purpose; message actions also contain a delete-confirmation state. Generic `ConfirmButton` uses share the separately reviewed confirmation adapter.

- Category: Quick choice; Product call-sites: 8
- Category: Detail, history or loading; Product call-sites: 15
- Category: Short form; Product call-sites: 34
- Category: Long editor or manager; Product call-sites: 10
- Category: Consequential confirmation; Product call-sites: 11
- Category: Total; Product call-sites: 78

- The isolated component showcase and its diagnostic dialogs were removed on November 2, 2026.

- Paths without another prefix are under `src/features`; shared adapters are under `src/design-system`.

- Caller: `design-system/action-menu-fallback.tsx`; Individual review: Immediate action list; no invented completion footer.
- Caller: `design-system/context-action-menu.tsx`; Individual review: Context actions preserve their own labels and disabled states.
- Caller: `design-system/native-date-time-picker.tsx`; Individual review: Cancel and Apply distinguish draft selection from commitment.
- Caller: `design-system/native-picker.tsx`; Individual review: Single selection completes directly.
- Caller: `design-system/person-picker-fallback.tsx`; Individual review: Search and selection remain a bounded choice, not a form wizard.
- Caller: `design-system/reaction-dialog.tsx`; Individual review: Reaction choice completes directly.
- Caller: `event-eligibility.tsx`; Individual review: Changes the parent event draft; the parent editor owns final Save.
- Caller: `lineup-rotation-dialog.tsx`; Individual review: Immediate writes retain their own busy/error handling; closing is not a second save.

- Caller: `design-system/message-photo-view.tsx`; Individual review: Image containment and sheet height matter; do not introduce fullscreen mobile presentation.
- Caller: `calendar-export-button.tsx`; Individual review: Subscription and export actions have distinct outcomes; feed privacy and refresh delay are useful context.
- Caller: `event-preview-actions.tsx`; Individual review: Teams and Plan suppress duplicate body headings; previews remain read-only.
- Caller: `fitness-quick-log.tsx`; Individual review: Loading shell has no meaningless Done action.
- Caller: `goal-reflections.tsx`; Individual review: Read-only history and check-in creation remain distinct actions.
- Caller: `member-coach-notes.tsx`; Individual review: History can close directly; opening an editor preserves its own permissions.
- Caller: `member-profile-dialog.tsx`; Individual review: Loading and unavailable states have no redundant Close footer.
- Caller: `messages-screen.tsx` blocked accounts; Individual review: Separate from conversation creation; each unblock action retains its own consequence.
- Caller: `moderation-screen.tsx`; Individual review: Evidence is detail content; remove/dismiss consequences warrant explicit confirmation.
- Caller: `notifications-menu.tsx`; Individual review: Notification rows are the actions; no generic footer is needed.
- Caller: `personal-fitness-summary.tsx`; Individual review: Latest, best and history are meaningful sections, not duplicate titles.
- Caller: `season-membership-content.tsx`; Individual review: Payment records and membership changes retain distinct history headings.
- Caller: `thread-extras.tsx` pinned messages; Individual review: Read-only navigation; no save semantics.
- Caller: `thread-extras.tsx` older polls; Individual review: Poll history is distinct from creating or closing a poll.
- Caller: `thread-participants-header.tsx` members; Individual review: Add people is conditional; read-only viewers do not need Done.

- Caller: `account-name-action.tsx`; Individual review: One-field Save, not a multi-step workflow.
- Caller: `account-password-action.tsx`; Individual review: Request-code and save-password stages retain separate actions and sensitive-field handling.
- Caller: `carry-lineup-dialog.tsx`; Individual review: Source and target choices preserve attendance adjustment and source-preservation context.
- Caller: `chat-filter-settings.tsx`; Individual review: Save commits filter choices.
- Caller: `coaching-hours-editor.tsx`; Individual review: Practice-linked hours retain their selected coach and session context.
- Caller: `development-reviewers.tsx`; Individual review: Reviewer policy and explicit selection are separate choices; copy now describes program assignments and backup-only eligibility.
- Caller: `equipment-editor.tsx`; Individual review: Add versus Save matches create/edit state.
- Caller: `equipment-loan-form.tsx`; Individual review: Borrower, item and return details stay one task; changing options must not drop draft values.
- Caller: `feedback-editor.tsx`; Individual review: Draft Save and irreversible Publish are intentionally different; publication confirmation is justified.
- Caller: `fitness-quick-log-form.tsx`; Individual review: The final player uses Save result and enters an explicit completion state with Log another result.
- Caller: `fitness-session-form.tsx`; Individual review: Practice/session selection and Save remain explicit.
- Caller: `fitness-test-form.tsx`; Individual review: Test definition remains separate from logging a player's result.
- Caller: `goal-editor.tsx`; Individual review: Existing approval rules and goal creation remain intact.
- Caller: `goal-reflection-form.tsx`; Individual review: Player-specific check-in and optional reflection remain one task.
- Caller: `guardian-invite-form.tsx`; Individual review: Private-access explanation stays; Cancel and Send invitation now occupy the sticky footer.
- Caller: `household-profiles.tsx`; Individual review: Dependent creation remains distinct from inviting an account; Cancel and Create profile now occupy the sticky footer.
- Caller: `invite-member-action.tsx`; Individual review: Successful queue closes directly, retaining honest invite status in the toast without a redundant Done stage.
- Caller: `member-editor.tsx`; Individual review: Member invitation retains its specific recipient and action.
- Caller: `message-actions.tsx` report; Individual review: Reporting stays separate from editing or deleting one's own message.
- Caller: `message-actions.tsx` edit/delete; Individual review: Mixed form/confirmation state; action label follows the active operation.
- Caller: `messages-screen.tsx` new message; Individual review: One recipient opens a conversation; multiple recipients create a named group.
- Caller: `notice-composer.tsx`; Individual review: Audience, content and end date stay one announcement task.
- Caller: `player-coaching-form.tsx`; Individual review: Title now identifies the player before editing their balancing profile.
- Caller: `program-coaching-editor.tsx`; Individual review: Local coach removal is now an ordinary action; outer Save remains the commitment point.
- Caller: `season-ledger-form.tsx`; Individual review: Player and season are visible before amount editing; permanent ledger confirmation stays explicit.
- Caller: `season-settings.tsx`; Individual review: Season creation remains distinct from editing a member's season record.
- Caller: `series-response-control.tsx`; Individual review: Absence reason retains coach visibility context and reserved-response semantics.
- Caller: `session-check-in-form.tsx`; Individual review: Energy check-in Save and Remove are distinct operations.
- Caller: `session-performance-editor.tsx`; Individual review: Title identifies player; Save is sticky; validation, revision reload, privacy and idempotency remain intact.
- Caller: `session-performance-report.tsx`; Individual review: Private feedback report retains its exact record/revision context.
- Caller: `settings-screen.tsx`; Individual review: Tracker creation has its own specific action.
- Caller: `shoutout-editor.tsx`; Individual review: Recipient, recognition and optional note stay one social action with audience context.
- Caller: `team-options.tsx`; Individual review: Generation settings precede Generate; generation is not publication.
- Caller: `thread-participants-header.tsx` add people; Individual review: Existing-message access warning is required before adding group members.

- Caller: `account-access-editor.tsx`; Individual review: Shared task guard prevents repeated writes; toggles and dismissal are disabled during save. Long family lists still warrant a searchable selection treatment.
- Caller: `chat-poll-composer.tsx`; Individual review: Multiple answer fields and optional closing controls require progressive sections, not fullscreen.
- Caller: `event-editor.tsx`; Individual review: Registration and optional sections are independent; review changes should be labeled as review before final save.
- Caller: `member-merge-action.tsx`; Individual review: Target, history conflicts and typed-name confirmation remain deliberate stages. Preserve source/target identity and drafts.
- Caller: `member-profile-form.tsx`; Individual review: Photo crop and profile editing are distinct sheet stages; closing must not leak temporary uploads.
- Caller: `program-editor.tsx`; Individual review: Program sections stay navigable without duplicating the dialog title.
- Caller: `resource-editor.tsx`; Individual review: Media, feedback and permissions retain their separate controls; permissions are not a competing primary action.
- Caller: `session-plan-editor.tsx`; Individual review: Repeated drills and private coaching notes require progressive sections with retained values.
- Caller: `session-series-link.tsx`; Individual review: Settings, Commitment, Roster and Sessions now use retained disclosures. Shared task ownership blocks dismissal during mutations.
- Caller: `terms-editor.tsx`; Individual review: Long legal content and version publication remain a deliberate editing task; preserve required acknowledgement.

- Caller: `calendar-subscriptions.tsx`; Individual review: Revoking a private feed affects external calendar access; retain explicit consequence.
- Caller: `confirmation-dialog.tsx`; Individual review: Shared adapter uses caller-specific consequence and confirm label; no generic success stage.
- Caller: `connected-account-row.tsx`; Individual review: Disconnect identifies the provider and preserves remaining access conditions.
- Caller: `delete-account-action.tsx`; Individual review: Reauthentication, transfer requirements and deletion consequences are necessary content, not filler.
- Caller: `development-panel.tsx`; Individual review: Finalize rating versus start a new round have different consequences.
- Caller: `event-screen.tsx`; Individual review: Cancel event versus keep event are explicit.
- Caller: `feedback-delete.tsx`; Individual review: Delete identifies the feedback action and must keep busy dismissal blocked.
- Caller: `fitness-results.tsx`; Individual review: Deleting a result session is distinct from archiving a test definition.
- Caller: `fitness-workspace.tsx`; Individual review: Archive and Restore labels follow current state.
- Caller: `programs-screen.tsx`; Individual review: Deletion remains restricted to unused programs.
- Caller: `session-plan-publication.tsx`; Individual review: Publishing and withdrawing visibility are explicit changes.

- The confirmation adapter is also used by `account-security`, `chat-poll-card`, `event-coach-assignment`, `feedback-card`, `feedback-editor`, `import-workspace-content`, `member-lifecycle-action`, `moderation-screen`, `program-coaching-editor`, `resource-details`, `return-loan-button`, `season-ledger-form` and `terms-gate`. Retain confirmations for security, irreversible deletion, permanent records and public publication. Avoid confirming reversible edits that still require an outer Save.

- Before: Unspecified footer manufactured Done across unrelated workflows.; After: Shared frame renders only caller-owned actions.; Why: Read-only detail and immediate choices do not imply a second save.
- Before: Permission controls stayed active while saving and the overlay could dismiss.; After: Guarded submission, disabled inputs and disabled dismissal.; Why: Retains errors and prevents overlapping writes.
- Before: Session ratings lacked player identity and saved inside the scrolling body.; After: Player-specific title and sticky primary action.; Why: Keeps target and completion visible with the keyboard open.
- Before: Series manager exposed four expanded panels and nested writes could outlive dismissal.; After: Retained Settings, Commitment, Roster and Sessions disclosures; shared task controls dismissal.; Why: Keeps the principal task visible without discarding less frequent functionality or draft state.
- Before: Player balancing and ledger editing lacked initial subject identity.; After: Named titles and visible ledger season.; Why: Prevents wrong-person edits.
- Before: Profile loading offered an extra Close footer.; After: Header close and sheet dismissal suffice.; Why: Removes duplicate completion affordances.

- Guardian/dependent sticky actions, direct invite success dismissal, last-player quick-log completion, ordinary draft-only coach removal and program-based reviewer copy are now implemented. These remain individual workflow decisions, not a universal footer or universal wizard.

- The final independent source review identified three additional cases. Each is now fixed with targeted regression coverage:

- Priority: P1; Before: Returning from Change people directly to Subscribe can select a profile whose private link has never been prepared. Both subscription actions then remain disabled; revoking an existing link produces the same missing-feed state.; After: Return to the chooser after subscription scope changes, and expose explicit link creation after revocation.; Why: Every selected schedule needs a reachable preparation action; never silently recreate a revoked link.
- Priority: P2; Before: A collapsed drill with invalid minutes fails global plan validation without naming or reopening the affected drill.; After: Identify and reveal invalid drill sections after a rejected submission.; Why: Progressive disclosure must not hide the place where the user needs to recover.
- Priority: P2; Before: Disabling the registration disclosure does not disable its retained EventOptions children; ProgramRsvpFields explicitly receives false.; After: Pass saving state through editable registration and eligibility controls.; Why: Changes made after payload capture must not appear accepted and then disappear when save closes.

- Scope changes return to the calendar chooser; missing feeds expose explicit creation, including after revocation. Drill errors reveal and name the affected retained section only after submission. Saving state reaches all registration and eligibility controls. These are source and automated-test findings, not claims about successful native-device reproduction.

- The review found no remaining confirmed duplicate body/title pair in event previews, resource/program section headings or membership/fitness histories. Privacy grants, irreversible-action warnings, bounds and recovery instructions remain useful even when other helper text is shortened.

- The focused checks passed 13 tests with 109 assertions. The new draft selector covers player/session/kind isolation; source-boundary checks cover sticky action ownership, permission busy guards, retained series sections and subject identity. TypeScript, Biome, design-boundary and motion checks passed for the scoped fixes. Browser checks and device checks remain separate evidence; this source audit does not certify native keyboard, detent or gesture behavior.
