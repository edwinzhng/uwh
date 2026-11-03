```sh
cd /Users/edwin/repo/uwh/app
bun run check
bun run verify:live
bun run verify:messages
bun run verify:message-readiness
bun run verify:calendars
bun run verify:security
bun run verify:invites
bun run verify:performance
bun expo export --platform all --max-workers 2
```

- The check command runs TypeScript, Biome, design-system and motion checks, and the Bun test suites. Live suites use the isolated Convex process at port 3210, refuse other backends and create fictional accounts/clubs. Explicitly select the saved local deployment before starting the backend; do not assume the normal `.env.local` is local. On first setup run `bun run setup:auth` in another terminal. Credentials are not printed. Preserve `.convex/` to retain local data. See the [testing guide](engineering/testing.md) for test selection, fixtures and release gates.

- Native exports validate dependency resolution and bundling. They do not prove native launch, keyboard behavior, accessibility, glass appearance, speech recognition or notification delivery. The September 8 surface/status pass checked the earlier web preview and keyboard status selection in both themes, not the current visual design. No simulator or physical-device testing was performed.

- The scale fixture verifies cursor traversal, role isolation, complete attendance totals and concurrent payment balances. See [performance details](PERFORMANCE.md). Manually check Next/Previous and filter changes with more than one page; check opening an older record and returning to its list.

```sh
bun expo export --platform web --max-workers 2
bun run preview
```

- Open [Schedule](http://127.0.0.1:4173/schedule) manually. Port 4173 serves `dist/` with caching disabled; export after UI changes. Verify appearance and interactions on the affected product screens.

- For a ready-made local login, run `bun run seed:dev`. Sign in with `demo@example.test` / `CrocsClub2026!`. This verified fictional account has a sample club, Player/Coach/Admin access and linked Sam/Mila profiles for parent workflows. The script refuses hosted backends and preserves existing demo data when rerun.

- Sign up with a fictional @example.test address and retrieve its local verification code using the helper in [account setup](ACCOUNT-SAFETY-PUSH.md). The local transport never sends email. New clubs start empty. Explicit sample mode is for development only. Another account requests access using its club code; an admin approves it from Club → Club settings → Account access. Assign only verified identities and family links.

- Journey: Schedule; Check: Agenda/calendar/past views, season filtering, date navigation and returning from an event. Compact title/time/venue layout must remain readable with long names and large text.
- Journey: Family; Check: Change self/child in place. Filters remain stable. An explicitly opened member keeps its identity. A single profile shows an Account menu with Account settings and no switching choices.
- Journey: RSVP; Check: Status → Going/Not going. Test full capacity, waitlist promotion, opening/closing boundaries, selected-player restrictions and independent children.
- Journey: Event editing; Check: Admin creates each recurrence type and a season. Edit one occurrence, then all. Verify dates, stable response history, preserved windows and eligibility removal. Coaches cannot edit events.
- Journey: Attendance; Check: Card → Attendance → Here/Late/No-show. Tap again to undo. Check cancelled sessions, non-going players and unmarked records.
- Journey: Coaching; Check: Teams and plans under Coaching. Generate, move and publish; RSVP/attendance changes must invalidate stale lineups. Published teams are readable from Overview.
- Journey: Feedback; Check: Publish new feedback without a draft; edit/delete/publish an existing draft. Private notes stay private. Goal editing stays beside its content.
- Journey: Member charts; Check: Check attended/recorded and on-time/attended percentages, season selection, no data, unmarked records and event-history links.
- Journey: Admin; Check: CUGA toggle, registration, payment limits, exclusive equipment loans, returns, searches and explicit access changes. Removing decorative role tags must not change which records/actions each account can access.
- Journey: Chat; Check: Pinned composer, scrolling older messages, new arrivals, reply/cancel, copy, sender-only edits/deletes, five quick emojis and the full picker, photo-only send and retry. Deleting a message removes its photos.
- Journey: Message readiness; Check: Load several pages, scroll up as another account sends, return to latest, and verify unread badges. Repeat across two sessions, self/child switching, background/foreground and reconnect. Open a DM from either account and confirm it reuses history. Reply to an older message, then edit/delete/block its author.
- Journey: Dictation; Check: Start/stop, real permission prompts, denial/re-enable, unsupported environment, corrected interim speech, interruptions and backgrounding. Text is editable and never sent automatically.
- Journey: Native keyboard; Check: Email/payment numeric keyboards, bounded multiline input, dialog scrolling, safe areas, hidden tabs while typing and restoration after dismissal.
- Journey: Calendar; Check: Self/child feeds, going/withdrawal, optional waitlists, stable IDs, cancellation, rotation, disable and revoked guardians. Google requires the hosted endpoint.
- Journey: Account; Check: Profile menu → Account settings, including when a child is selected. Sign-in, request/approval, reload, sign-out, source/account changes and revoked permissions. The client must not impersonate a selected child.
- Journey: Errors; Check: Offline/slow responses, failed upload, failed save, duplicate taps and denied permissions retain user intent and show actionable errors.

- Review both themes at phone/tablet/laptop widths, with reduced motion and larger text. Decorative Coach/Admin/Parent/Player role tags must be absent from actions, tabs, dialog titles, headers, accounts and directory rows. Keep explicit role choices in access-management forms and verify the same permission denial as before. Use Nunito, matte forest surfaces and opaque bottom navigation. Check green Going, red Not going, amber Not responded/Waitlisted and neutral disabled registration. Check keyboard focus, screen-reader names, 44px native touch targets and long-label wrapping.

- Use shared motion tokens. Verify accessible dismissal, overlay stacking and Escape/Back behavior. Existing visual values and animation treatments may change during redesign.

- Earlier floating-navigation checks are historical, not approval of the current opaque full-width bar. Recheck the current phone shell, keyboard/conversation hiding and wrapped toolbar actions after layout changes. Browser captures are not device approval.

- Full Xcode or Android SDK tooling is required for local native compilation:

```sh
bun run ios
bun run android
```

- Alternatively configure EAS cloud development builds. After installing a development client, use `bun start --dev-client`. Rebuild native binaries when adding native dependencies, including speech recognition. Only command-line Apple tools are currently installed; neither a simulator build nor an Android binary was produced in this pass.

- A physical phone cannot use the laptop’s loopback URL. Use a hosted Convex deployment or explicit LAN/port-forward configuration for both its API and auth HTTP origin. Test one emulator/device at a time to limit laptop load. [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)

- Before replacing SportEasy or submitting to stores, complete the [release work](RELEASE.md). Native push integration is implemented; real delivery needs provider configuration and physical-device checks. See [account and push setup](ACCOUNT-SAFETY-PUSH.md).

- Run `bun run verify:social-auth` for local account-linking, session and deletion checks. These use synthetic provider accounts, not Google or Apple browser handshakes. See [Social sign-in](SOCIAL-AUTH.md) for provider setup and the web/iOS/Android verification matrix.
