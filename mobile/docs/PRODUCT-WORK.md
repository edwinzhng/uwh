# SportEasy replacement workflows

Implemented September 8, 2026. These workflows use the live Convex backend; the design showcase remains a separate preview. No real club data has been imported or published automatically.

## Public schedule

In **Club → Club settings → Public schedule**, choose an address and turn on publishing. Mark individual events **Show on public schedule** in the event editor. Existing events start private. Series edits can publish multiple events together; existing individual exceptions remain unchanged.

The public `/calendar?club=<address>` page works signed out, offers an agenda and calendar, and exposes only event title, date, time, venue and cancellation state. Member identities, rosters, restrictions, responses, descriptions and coaching information are excluded. Turning publishing off disables the page and its subscription endpoint. Addresses are unique across clubs.

**Copy calendar subscription** supplies a standard ICS feed. The feed covers the previous month and next 18 months, up to 1,000 public events. Existing subscriptions keep stable event IDs and publish updated revisions or cancellation tombstones. This is subscription polling; Google must be able to reach a hosted HTTPS endpoint. Localhost works for laptop testing, not remote Google sync. Personal Going/Waitlisted calendar feeds remain separate.

## Season records

**Club → Registration / Payments**, or a member’s **Admin** tab, provides a season selector. Players and linked guardians see their own records from Club; only admins can change them.

Each season stores registration status, CUGA membership, total dues and payments received. Admins can set dues, record payments and record refunds with dates and notes. Amounts are CAD cents. Payments cannot exceed the outstanding balance; refunds cannot exceed payments received. Adjusting dues below payments produces a visible credit.

Every change keeps its author, date and before/after record. Histories and member lists are paginated. Concurrent edits require a fresh review rather than silently overwriting another admin’s change. Existing registration, CUGA and payment records are retained as the 2026–2027 baseline; earlier individual payments remain visible. A new season starts empty. Nonseason custom trackers and active equipment loans stay on the member profile.

This records payments received elsewhere; it does not collect card payments. Refund actions record a refund that has already occurred.

## Import data

Open **Club → Import data**. Supported CSV imports:

| Import | Record identifiers | Values |
| --- | --- | --- |
| Members | Source ID; optional existing member ID | Full name |
| Events | Source ID | Date, start/end, title, venue, capacity, type; chosen season |
| Attendance | Source ID, member ID, event ID | RSVP and recorded attendance |
| Registration & dues | Source ID, member ID; chosen season | Registration, CUGA Yes/No, total dues |
| Payments | Source ID, member ID; chosen season | CAD amount, date, note/reference |

Download a template, choose a CSV, map columns, then preview. The review identifies new, linked, duplicate and invalid rows. Existing app IDs can be exported from the directory in the same screen. References can use IDs from previous imports under the same source. Import members and events before attendance, and registration/dues before payments.

The importer supports column-mapped CSV exports. It does not assume an undocumented SportEasy export layout, scrape SportEasy or ingest its messages. Dates use YYYY-MM-DD and times HH:mm; templates specify status values. Convert other date/status formats before import. It does not send invitations, create login accounts, assign coach/admin permissions or infer guardian relationships.

Files are limited to 2 MB and 500 rows, committed in batches of 25. Each batch is atomic and checked again against the preview. Previously committed batches remain if a later batch fails. Preview the same file again to resume: matching source IDs are skipped, preventing duplicate payments. Changed values for an already imported ID produce a conflict; edit the live record explicitly instead. Registration source IDs are scoped by season. Existing attendance and nonempty season records are never silently overwritten. Review reports and import history remain available.

Actual cutover still requires real exports, a reviewed import, and member invitation delivery from a configured email sender.

## Recurring events

Admins can edit **This event**, **This and following**, or the **Whole series**. The editor exposes cadence and occurrence count for series changes. Supported rules are daily, weekdays, weekly, every two weeks and monthly, with 1–52 occurrences per edit.

A following edit creates a separate series. Existing occurrences keep their identifiers, RSVPs, attendance, plans and links. Shortening cancels excess occurrences; extending creates fresh IDs and does not resurrect cancelled events. Single-event edits become exceptions that later series edits preserve. Shortening across an exception requires resolving that event explicitly. Rescheduling or removing past occurrences is blocked during a rebuild. The confirmation reports the range and registration consequences.

Schedule updates/cancellations enqueue grouped notifications for affected registered players and guardians, subject to preferences and configured native push delivery. Calendar feeds update when next fetched.

## Verification

`bun run verify:product` creates temporary local clubs and verified fictional accounts, checks the complete workflows and removes its fixtures. It covers permissions, family and season isolation, duplicate payments, refunds, stale edits, source mapping, repeated imports, existing-data conflicts, public projections, ICS revisions and series splitting.

`bun run check` verifies TypeScript, Biome, the design-system boundary and domain tests. `bun expo export --platform all --max-workers 2` checks web/iOS/Android bundling. These do not substitute for phone interaction, real email delivery or APNs/FCM tests.
