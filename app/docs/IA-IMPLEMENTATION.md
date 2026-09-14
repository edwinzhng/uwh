# Club participation IA

Implemented September 13, 2026 in the mobile app and its Convex backend.

## Navigation

Home · Schedule · Messages · Account · Club. The same destinations appear in the desktop sidebar. Five phone controls retain the shared typography and touch targets.

- Home shows relevant household sessions remaining this week, falling back to the next session; next tournament; membership/payment attention; and the next coaching session for coaches.
- Schedule defaults to My household with named response controls. All club remains available. Calendar and list use the same audience.
- Messages shows persistent notices above conversations. Session discussion opens the same conversation from events and the inbox.
- Account contains commitments, tournaments, personal membership/payment/equipment records, progress, household access, calendar export, and account settings.
- Club contains people, program/venue information, coaching tools and administration.

## Notices

Home and Messages share account-specific dismissal. View all notices includes dismissed and expired records. Staff can publish for club/program audiences and set a Hide starting date in the club timezone. Dismissal is separate from acknowledgment. Staff can expire a notice immediately.

## Tournaments

Create through Schedule → New event → Tournament. Enter first/last dates, host timezone, venue/city, optional response deadline, and details for fees, travel and accommodation. Administrators assign the confirmed roster independently of availability. Multi-day events appear on each covered calendar date and remain upcoming until the final end time. Calendar feeds are tentative until the player is assigned to a team.

This is event and roster management; it does not generate a tournament bracket or process travel bookings/payments.

## Committed series

Create a recurring event, enable Committed roster, set dates/capacity/waitlist, and deselect excluded dates in the preview. Open any occurrence → View session series to manage commitments.

Players or guardians enroll once. Administrators can add or invite eligible players and promote a waitlisted player. Joining and ending use effective dates. Expected responses are separate from actual attendance. Absence applies only to that session; restoring attendance does not alter the rest of the term. Recurrence edits synchronize new/split dates while preserving completed-session records.

Series waitlists are distinct from session guests. Administrators can add/remove guests for one session only. Committed places remain reserved even during an absence; adding guests must fit capacity, so an organizer may need to explicitly change that session’s capacity first.

## Existing membership behavior

Membership and payment records remain managed by administrators. The personal page explains contacting an administrator for registration changes or payment arrangements. No payment collection or new self-service registration form was added.

## Verification

- [x] Mobile TypeScript, Biome, design boundary, toast copy and motion checks.
- [x] Site motion check.
- [x] 170 tests passing across 42 files.
- [x] Local live tournament tests: multi-day dates, host timezone, deadline, independent roster, permissions, calendar state and end time.
- [x] Local live series tests: concurrent capacity, waitlists, invitations, join/end, absence/restore, eligibility, completed history, recurrence edits, admin guests and unauthorized rejection.
- [x] Local live discussion/household tests: thread reuse, program and household eligibility, cross-club denial, household record isolation and Schedule/calendar agreement. No messages sent during verification.
- [x] Browser at desktop and 390 × 844: five tabs, notice dismissal/archive, Home, Account, tournament creation/availability, committed-series creation/excluded date/enrollment/absence. No browser errors observed.
- [x] Existing scale suite: 400 events, 2,000 attendance records and 120-item histories; permissions/pagination/concurrent payments preserved.
- [x] Local demo query samples: Home 22 ms / 3,677 bytes; Account 9 ms / 2,846 bytes. These are local measurements, not mobile-network guarantees.
- [x] Web production export.
- [x] iOS and Android production bundle exports.

The local demo includes clearly named IA preview tournament/Monday training fixtures for inspection. No hosted production deployment was performed. Physical-device interaction/push delivery remains outside the browser and bundle checks.

Restricted-player schedule eligibility is applied after pagination, so a restricted roster can produce a short or empty page with a Next control.
