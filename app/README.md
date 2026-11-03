- **UWH Club**

- The production Calgary Crocs club app for web, iOS, and Android. TypeScript, Bun, Biome, and a shared design system. Start with the [documentation index](docs/README.md) and [production readiness](docs/PRODUCTION-READINESS.md).

- [Try the app](http://127.0.0.1:4180/)

- **Try it**

- The app opens with verified sign-in and club access. Schedule, Messages, Members, and Club share one account with combined permissions. Household switching preserves the current page. Coaching appears on events and member profiles. Administration lives in Club.

- Create an account, verify your email, then join or create a club. Local verification codes use the private internal inbox for fictional addresses and explicitly allowlisted real addresses; see [account setup](docs/ACCOUNT-SAFETY-PUSH.md) and [local data setup](docs/LOCAL-REAL-DATA.md). This uses a real, isolated local Convex backend with password authentication and reactive database subscriptions. The database lives in `app/.convex/`. Signed-out accounts cannot access club data. Edwin's verified account already owns the imported private workspace and does not need a demo invite.

- For a second account, an admin can add an email in **Members → Add member**, or select **Invite** on an existing unlinked profile. The recipient verifies that email and joins the named club. **Members → Invites** tracks delivery and supports resending or revocation. Outbound email is disabled in the current local workspace; see [invitation setup](docs/INVITATIONS.md). Club-code requests remain available; an admin approves those in **Club → Club settings → Account access**, assigns a profile, verifies child links, and grants coaching/admin permissions. Fictional verification data is isolated and never used as a fallback for a live account.

- Google and Apple sign-in and account linking are implemented. Provider credentials are still needed to enable them; see [social sign-in setup](docs/SOCIAL-AUTH.md). Connected accounts share the existing club profile and permissions.

- **Run locally**

```sh
cd /Users/edwin/repo/uwh/app
bun install --frozen-lockfile
bun run backend
```

- Leave that terminal running. For the first local setup, in another terminal:

```sh
bun run setup:auth
bun expo export --platform web --max-workers 2
bun run preview
```

- The backend uses port **3210** and authentication and protected image HTTP routes use **3211**. The current browser app runs on **4180**. The optional exported web preview uses **4173** and serves `dist/`; export again to update that preview. Local backend functions update while the backend command runs. Signing keys and local data are ignored by Git. Do not delete `.convex/` if you want to retain accounts and club records.

- For an installed native development client, run `bun run start --lan --port 8081`. The phone and Mac must share a network, and the development Convex URLs must use the Mac's LAN address rather than localhost. The phone and browser connect to the same backend on port 3210; neither is pointed at a production cloud deployment.

- If host file watching fails, `CI=1 bun run start --lan --port 8081 --clear` serves a fresh snapshot without watching. Restart that command after code changes, especially new or renamed files: reloading the phone alone does not refresh Metro's module index. A successful static export does not verify the running development server; request its iOS bundle before asking someone to reload.

- **Product workflows**

- Admin event creation/editing, cadence/count changes, individual exceptions, series splitting, seasons, selected-player registration, signup windows, capacity and waitlisting.
- Opt-in public agenda/calendar and ICS subscriptions, with private member data excluded.
- Reviewed CSV imports for members, events, attendance, registration/dues and payments.
- Independent self/child RSVPs; staff attendance and lateness, with corrections.
- Personal calendar subscription feeds and .ics snapshots, including separate children’s calendars, optional waitlists, cancellations and revocable links.
- Group chats and direct messages, full emoji reactions, protected photos, replies, editing/deletion, voice dictation, and notices. Message and notice acknowledgements are not a product workflow.
- Searchable members, coaching plans, balanced Black/White teams, manual moves, explicit publication and stale-lineup detection.
- Shared goals/check-ins, private notes, editable/deletable feedback drafts, direct publication and attendance charts.
- Coach hours and season totals, fitness sessions/results/trends, private player settings, position-aware teams and club attendance reports. See [coaching workflows](docs/COACHING.md).
- Season-specific registration, CUGA status, dues, payments, refunds and change history; equipment inventory, loans and custom trackers.
- Authenticated club access and verified guardian linking, with permissions enforced in Convex.
- Neutral content backgrounds, glass floating navigation, responsive mobile tabs, and profile switching. Section headings share one size. Utility icons are monochrome. Pastel feature cards retain small dimensional artwork. RSVP and performance changes retain semantic colors.

- Product code and launch configuration have separate status. The local real-data import is complete: 74 members, 349 events, 3,737 responses, 41 shoutouts, 191 reviews, 276 fitness results, 196 coaching-hour records, 31 videos, 58 messages, 20 photos and 47 registration records. Ten overlapping Monday event pairs were reconciled; unmatched attendance, unlinked ratings and undated lineups retain explicit archival or reference treatment. Edwin explicitly approved coaching access to all six imported programs; no other source roles or login credentials were imported.

- The export audit found zero domain-integrity issues and zero unapproved outside-club document changes. Its raw status remains `review_required`: demo credentials, membership, club and content are unchanged, but one unexpired demo session and its 13 refresh tokens closed for an unproven cause. Private backups and the detailed metadata review are retained outside Git. See [data migration](docs/LOCAL-REAL-DATA.md) for the exact reconciliation and limitations.

- The current local backend has email and native/web push delivery disabled, and neither social provider configured. See [production readiness](docs/PRODUCTION-READINESS.md) for hosted release, authentication, delivery and device-verification gaps. Payments record money received. They do not charge a card.

- **Calendar export**

- Open **Schedule → Sync calendar** or **Account → Calendar**. Going practices appear in the selected person’s feed; withdrawing or cancelling the event publishes a cancellation. Waitlisted practices can be included as tentative. Each child has an independent feed.

- Downloads work now and are snapshots. A live account can create, replace or disable its secret subscription links. Google Calendar must reach the hosted Convex HTTP endpoint; **localhost cannot sync to Google**. On a computer, use **Google Calendar → Other calendars → From URL** with the feed link. Changes appear when Google fetches the feed; this is one-way subscription sync, not instant OAuth sync. See [calendar behavior](docs/CALENDARS.md).

- **Check and build**

```sh
bun run check
bun run verify:live
bun run verify:messages
bun run verify:calendars
bun run verify:invites
bun run verify:product
bun expo export --platform all --max-workers 2
```

- The live suite requires the local backend and creates fictional verification clubs/accounts. It checks auth, club approval, privacy, family isolation, concurrent capacity, goal/feedback publication, equipment, payments, realtime updates and access revocation.

- Current Metro verification covers compilation for both iOS and Android. Launching a signed iOS/Android build additionally requires the relevant native tooling and configuration. Compilation does not establish hardware frame rate, memory stability, complete native interaction acceptance or push delivery; those require device verification. See [testing](docs/TESTING.md).

- **Design and scope**

- [Engineering guides and review checklists](docs/engineering/README.md)

- [Workflow audit](docs/UX-AUDIT.md)
- [Apple and Google release requirements](docs/RELEASE.md)
- [Mobile hierarchy](docs/MOBILE-HIERARCHY.md)
- [Full product scope](docs/PRODUCT-SPEC.md)
- [Architecture and migration](docs/ARCHITECTURE.md)

- The legacy app and its Convex backend remain separate. The root TypeScript configuration only excludes this mobile project.

- Chat reaction interaction reference: [Rare UI — Emoji reaction](https://www.rareui.com/components/emojireaction). The app uses its own shared reaction controls and emoji browser.
