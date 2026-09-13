# UWH Club

An Expo / React Native club app beside the existing UWH app. TypeScript, Bun, Biome, Inter and a constrained shared design system.

[Try the app](http://127.0.0.1:4173/schedule) · [Design system](http://127.0.0.1:4173/design-system)

## Try it

The app opens with verified sign-in and club approval. Schedule, Messages, Members and Club share one account with combined permissions. The header switches between **Me, Sam and Mila** without changing pages. Coaching appears on events and member profiles; administration lives in Club.

Create an account, verify your email, then join or create a club. Local email codes for fictional addresses are available through the local test helper; see [account setup](docs/ACCOUNT-SAFETY-PUSH.md). This uses a real, isolated **local Convex backend** with password authentication and reactive database subscriptions. The database lives in `mobile/.convex/`. Signed-out accounts cannot access club data.

For a second account, an admin can add an email in **Members → Add member**, or select **Invite** on an existing unlinked profile. The recipient verifies that email and joins the named club. **Members → Invites** tracks delivery and supports resending or revocation. Local mode captures fictional email only; see [invitation setup](docs/INVITATIONS.md). Club-code requests remain available; an admin approves those in **Club → Club settings → Account access**, assigns a profile, verifies child links, and grants coaching/admin permissions. Sample mode is explicit and never used as a fallback for a live account.

Google and Apple sign-in and account linking are implemented. Provider credentials are still needed to enable them; see [social sign-in setup](docs/SOCIAL-AUTH.md). Connected accounts share the existing club profile and permissions.

## Run locally

```sh
cd /Users/edwin/repo/uwh/mobile
bun install --frozen-lockfile
bun run backend
```

Leave that terminal running. For the first local setup, in another terminal:

```sh
bun run setup:auth
bun expo export --platform web --max-workers 2
bun run preview
```

The backend uses port **3210** and authentication and protected image HTTP routes use **3211**. The exported web preview uses **4173**. Export again after UI changes; the preview serves `dist/`. Local backend functions update while the backend command runs. Signing keys and local data are ignored by Git. Do not delete `.convex/` if you want to retain accounts and club records.

## Implemented in this pass

- Admin event creation/editing, cadence/count changes, individual exceptions, series splitting, seasons, selected-player registration, signup windows, capacity and waitlisting.
- Opt-in public agenda/calendar and ICS subscriptions, with private member data excluded.
- Reviewed CSV imports for members, events, attendance, registration/dues and payments.
- Independent self/child RSVPs; staff attendance and lateness, with corrections.
- Personal calendar subscription feeds and .ics snapshots, including separate children’s calendars, optional waitlists, cancellations and revocable links.
- Group chats and direct messages, full emoji reactions, protected photos, replies, editing/deletion, voice dictation, notices and acknowledgement.
- Searchable members, coaching plans, balanced Black/White teams, manual moves, explicit publication and stale-lineup detection.
- Shared goals/check-ins, private notes, editable/deletable feedback drafts, direct publication and attendance charts.
- Coach hours and season totals, fitness sessions/results/trends, private player settings, position-aware teams and club attendance reports. See [coaching workflows](docs/COACHING.md).
- Season-specific registration, CUGA status, dues, payments, refunds and change history; equipment inventory, loans and custom trackers.
- Authenticated club access and verified guardian linking, with permissions enforced in Convex.
- Solid content surfaces, glass floating navigation, responsive sliding mobile tabs, club branding on the left and notifications/profile switching on the right. The profile menu includes Settings. Coach and Admin areas use continuous cards with purple/amber headers. RSVP status uses green, red and amber semantic colors.

This is a working first implementation. Cloud hosting, email sender and Expo push credentials, and real device delivery testing remain. Legacy integrations and historical data migration are out of scope for the current replacement. Public scheduling, import tools and season records are implemented; see [product workflows](docs/PRODUCT-WORK.md). Account recovery/deletion, moderation and native push integration are implemented; see [configuration and verification](docs/ACCOUNT-SAFETY-PUSH.md). Payments track money received; they do not charge a card. See [implementation status](docs/IMPLEMENTATION.md).

## Calendar export

Open **Schedule → Sync calendar** or **Account → Calendar**. Going practices appear in the selected person’s feed; withdrawing or cancelling the event publishes a cancellation. Waitlisted practices can be included as tentative. Each child has an independent feed.

Downloads work now and are snapshots. A live account can create, replace or disable its secret subscription links. Google Calendar must reach the hosted Convex HTTP endpoint; **localhost cannot sync to Google**. On a computer, use **Google Calendar → Other calendars → From URL** with the feed link. Changes appear when Google fetches the feed; this is one-way subscription sync, not instant OAuth sync. See [calendar behavior](docs/CALENDARS.md).

## Check and build

```sh
bun run check
bun run verify:live
bun run verify:messages
bun run verify:calendars
bun run verify:invites
bun run verify:product
bun expo export --platform all --max-workers 2
```

The live suite requires the local backend and creates fictional verification clubs/accounts. It checks auth, club approval, privacy, family isolation, concurrent capacity, goal/feedback publication, equipment, payments, realtime updates and access revocation.

Native bundles can be exported on this laptop. Launching an iOS/Android development build additionally requires Xcode or Android tooling. The coaching pages have been checked in the mobile web preview; native interaction and push delivery still require device verification. See [testing](docs/TESTING.md).

## Design and scope

- [Workflow audit](docs/UX-AUDIT.md)
- [Apple and Google release requirements](docs/RELEASE.md)
- [Mobile hierarchy](docs/MOBILE-HIERARCHY.md)
- [Full product scope](docs/PRODUCT-SPEC.md)
- [Architecture and migration](docs/ARCHITECTURE.md)
- [Design-system contract](docs/DESIGN-SYSTEM.md)

The legacy app and its Convex backend remain separate. The root TypeScript configuration only excludes this mobile project.
