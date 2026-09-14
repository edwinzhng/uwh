# Club invitations

Admins can add an email in **Members → Add member** to create a profile and queue its signup invitation together. Leaving email blank still adds a member without an account. An unlinked existing member has an **Invite** action on their profile.

**Members → Invites** lists invitations in cursor pages, with Sending, Sent, Local preview, Send failed, Joined, Expired or Revoked status. The menu copies the current link, resends it or revokes it. Resending refreshes the seven-day expiry and replaces the previous link revision. It never creates another profile or fee record.

The recipient opens `/join?invite=…&revision=…`, sees the club name, signs up or signs in, verifies their email and selects **Join club**. The verified email must match the invitation. Acceptance binds the account to the stored club and personal profile, preserving attendance and fees. It does not require another join-request approval. Invites grant no coaching, admin or guardian permissions; admins manage those separately in Account access.

The application currently supports one club membership per account. An account already linked to a club cannot use an invite to silently switch clubs or acquire a second profile. Manual club-code requests and admin approval remain available.

## Email setup

Delivery reuses the existing backend email configuration:

- `AUTH_EMAIL_MODE=resend`
- `AUTH_RESEND_KEY` and a verified `AUTH_EMAIL_FROM`
- `SITE_URL` set to the hosted HTTPS web app origin

Keep these on Convex, not in public Expo variables. Local mode only accepts `@example.test` recipients and a localhost signup origin. In local mode no email leaves the machine; the invitation list labels it **Local preview**, and **Copy invite link** opens the real signup flow. Internal local capture expires after ten minutes; the invitation itself lasts seven days.

Delivery is scheduled in the same transaction as the invitation/profile creation, using [Convex’s transactional scheduler](https://docs.convex.dev/scheduling/scheduled-functions). Resend receives a stable idempotency key for each invitation revision, following [its email API](https://resend.com/docs/api-reference/emails/send-email). Sent means the provider accepted the request, not confirmed inbox delivery. Failed or uncertain sends can be resent from the list; automatic delivery retries and bounce webhooks are not implemented.

The email opens the hosted web signup route. The same join screen is included in native builds, but associated domains, universal/app links and physical-device email-to-app handoff still require hosting and device verification.

## Access and verification

Invitation identifiers locate a record; they are not bearer credentials. Only a live, verified session with the addressed email can accept. Club and profile identifiers come from the server record. Admin-only commands verify the current club, linked profiles cannot be claimed twice, concurrent/repeated acceptance is idempotent, and expired, replaced or revoked invitations fail safely. Sending is limited atomically to one per recipient per minute and 50 per club per hour.

Account deletion removes invitations addressed to that account, revokes pending invitations it created, removes sender references and cleans rate limits. Club deletion removes its invitation records and limits. Delayed delivery checks the current revision, state, expiry and sender permissions.

Run `bun run verify:invites` against the local backend. It uses temporary fictional accounts/clubs and local email capture, then deletes its fixtures. It covers creation/acceptance retries, verified signup into the right club/profile, no duplicate fee, public/private query boundaries, role restrictions, expiry, resend, revocation and invalid-input rollback. `bun run check` covers domain rules, TypeScript, Biome and design-system boundaries. Real email transport and native handoff require separate checks after configuration.
