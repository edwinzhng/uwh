- Open **Schedule → Sync** to create a private link and add it to Apple Calendar or Google Calendar. Select profiles when the account manages more than one. **Download a copy** exports a one-time snapshot.

- Signed-in members can create one secret subscription link per personal profile or linked child. If Google does not open the subscription prompt, use **Copy link** and [Google Calendar on a computer](https://support.google.com/calendar/answer/37100?hl=en) under **Other calendars → From URL**. Apple and Google subscriptions refresh on the calendar provider’s schedule. Open the event’s UWH Club link to change an RSVP.

- Production calendar URLs use `app.calgaryuwh.com/calendar.ics` and `app.calgaryuwh.com/public-calendar.ics`. Vercel proxies both paths to the production Convex HTTP API and forwards the query string. Existing subscriptions on the Convex hostname continue to work. Local and preview backends retain their own origins.

- App state: Going; Calendar behavior: Confirmed practice, blocks time
- App state: No; Calendar behavior: Omitted. A previously exported entry is cancelled.
- App state: No response; Calendar behavior: Tentative until practice starts. The title shows whether signup is upcoming, open, or closed. Once signup has closed and the practice starts, an unanswered entry is cancelled and attendance counts as absent unless a coach has recorded a mark.
- App state: Waitlisted; Calendar behavior: Omitted by default; optionally tentative and does not block time
- App state: Promoted from waitlist; Calendar behavior: Same event becomes confirmed
- App state: Event cancelled / no longer eligible; Calendar behavior: Previously exported event becomes cancelled
- App state: Late / no-show marked by staff; Calendar behavior: Does not change the player’s RSVP or calendar selection
- App state: Practice time, venue or details change; Calendar behavior: Same UID, higher revision on the next fetch

- The feed reads the latest events and responses transactionally. `calendarEntries` preserves UIDs, modification timestamps, revision numbers and cancellation records. Returning to Going restores the same event. Stable output between changes prevents unnecessary calendar churn. Downloads use the same projection and serializer, without historical cancellation records.
- Practice parts appear as separate events with their own times and UIDs. Private feeds include selected parts only. Existing combined entries are cancelled on the next refresh and replaced by the individual parts.

- Only practice details and that person’s RSVP are exported. Coaching notes, ratings, rosters, messages and finances are excluded. Each fetch checks the feed owner’s current club membership, profile and guardian links. Administrator and coaching roles cannot create subscriptions for arbitrary players.

- Tokens are generated server-side using 32 cryptographically random bytes. Authenticated queries return tokens only to their owner; the feed itself is accessible to anyone holding the full link, which is necessary for calendar clients. The UI identifies the link as private. Replace link invalidates the old URL; Disable link removes the feed and its revision records. Revocation blocks future fetches, but cannot erase data already downloaded by Google or another client. Remove the calendar from that client too.

- The serializer follows [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545): UTC start/end times derived from the app’s club-time adapter, escaped text, UTF-8-aware 75-octet line folding, stable UID, SEQUENCE, LAST-MODIFIED and STATUS. It sends no attendee invitations or alarms. HTTP responses prohibit caching and indexing.

- `bun run check` includes independent ICAL.js parsing, timezone conversion, Unicode and injection cases, filtering, stable revisions and family isolation. `bun run verify:calendars` exercises real local HTTP feeds, signed-in ownership, withdrawal/rejoining, waitlist promotion, cancellation, token rotation, revocation and disabling. All passed. Google subscription UI/refresh and native sharing still require testing on the hosted app and real devices.
