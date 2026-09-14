# Calendar export and subscriptions

Open **Schedule → Sync calendar** or **Account → Calendar**. Select yourself or a linked child. Downloading an `.ics` file creates a snapshot; importing it does not subscribe or receive future RSVP changes.

Signed-in members can create one secret subscription link per personal profile or linked child. In [Google Calendar on a computer](https://support.google.com/calendar/answer/37100?hl=en), use **Other calendars → From URL**. The app opens that settings page and copies the URL in separate direct user actions. Subscription changes appear when Google refreshes the feed; there is no promised refresh interval. Changes made in Google do not change RSVPs in this app.

The local API serves `/calendar.ics?token=…` on port 3211. Google cannot fetch `localhost` or `127.0.0.1`. Deploy the mobile Convex backend to a public HTTPS origin and configure `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CONVEX_SITE_URL` for that deployment. Existing local accounts and tokens are separate from a cloud deployment. No cloud account, OAuth client or external calendar was connected by this implementation.

| App state | Calendar behavior |
| --- | --- |
| Going | Confirmed practice, blocks time |
| Not going / unanswered | Omitted; a previously exported event becomes cancelled |
| Waitlisted | Omitted by default; optionally tentative and does not block time |
| Promoted from waitlist | Same event becomes confirmed |
| Event cancelled / no longer eligible | Previously exported event becomes cancelled |
| Late / no-show marked by staff | Does not change the player’s RSVP or calendar selection |
| Practice time, venue or details change | Same UID, higher revision on the next fetch |

The feed reads the latest events and responses transactionally. `calendarEntries` preserves UIDs, modification timestamps, revision numbers and cancellation records. Returning to Going restores the same event. Stable output between changes prevents unnecessary calendar churn. Downloads use the same projection and serializer, without historical cancellation records.

Only practice details and that person’s RSVP are exported. Coaching notes, ratings, rosters, messages and finances are excluded. Each fetch checks the feed owner’s current club membership, profile and guardian links. Administrator and coaching roles cannot create subscriptions for arbitrary players.

Tokens are generated server-side using 32 cryptographically random bytes. Authenticated queries return tokens only to their owner; the feed itself is accessible to anyone holding the full link, which is necessary for calendar clients. The UI identifies the link as private. Replace link invalidates the old URL; Disable link removes the feed and its revision records. Revocation blocks future fetches, but cannot erase data already downloaded by Google or another client. Remove the calendar from that client too.

The serializer follows [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545): UTC start/end times derived from the app’s club-time adapter, escaped text, UTF-8-aware 75-octet line folding, stable UID, SEQUENCE, LAST-MODIFIED and STATUS. It sends no attendee invitations or alarms. HTTP responses prohibit caching and indexing.

`bun run check` includes independent ICAL.js parsing, timezone conversion, Unicode and injection cases, filtering, stable revisions and family isolation. `bun run verify:calendars` exercises real local HTTP feeds, signed-in ownership, withdrawal/rejoining, waitlist promotion, cancellation, token rotation, revocation and disabling. All passed. Google subscription UI/refresh and native sharing still require testing on the hosted app and real devices.
