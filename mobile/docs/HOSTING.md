# Hosting and release setup

The Vercel projects are `edwinzhang/uwh-club` (root `mobile`) and `edwinzhang/calgary-crocs` (root `site`). Both need access to `packages/design-system` outside their root directory. Use Bun 1.3.14-compatible lockfiles and the per-project `vercel.json` files. The repository root is the legacy coaching app; do not deploy it as either new project.

## App domain

The web app links `/manifest.webmanifest` on every static route, with same-origin `/` scope, `/` start URL and standalone display. Internal navigation uses Expo Router. Home Screen shortcuts installed before this manifest was added may need to be removed and added again from the chosen app domain. Verify navigation on the actual installed device after reinstalling; desktop browser checks cannot reproduce iOS Home Screen behavior fully.

The public testing URL is `https://uwh-club.vercel.app`. The old `calgary-crocs-app.vercel.app` alias remains available. Deployment `dpl_BFPGEivcbq3J6ZbwjuWR9QrMzesF` was published and its UWH Club sign-in screen verified on September 12, 2026. Account creation and email delivery are not yet verified end to end: domain DNS verification remains pending.

`app.calgaryuwh.com` is attached to `uwh-club`. Add this record at the DNS provider for `calgaryuwh.com`:

| Type | Host | Value |
| --- | --- | --- |
| CNAME | app | e6c5c6b36725b997.vercel-dns-017.com |

This target was returned by Vercel on September 11, 2026. Confirm the project domain status after DNS propagation.

## Backend

A separate `uwh-club` project now exists in the `calgary-underwater-hockey-club` Convex team:

- Production: `https://brainy-albatross-874.convex.cloud`
- Production HTTP actions: `https://brainy-albatross-874.convex.site`
- Development: `https://joyous-guineapig-97.convex.cloud`

The production functions, schema and fresh authentication signing keys were deployed on September 12, 2026. Vercel is configured with these production endpoints and demo mode disabled. Push delivery remains disabled pending native setup. Local development configuration is unchanged.

The legacy and mobile backends are incompatible: their `fitnessTests` schemas and authentication callbacks differ. Publishing `mobile/convex` to the legacy production deployment would replace its functions and may fail schema validation. Use a separate cloud deployment in the existing Convex account for testing, or complete a backed-up data migration and coordinated cutover first. Do not use the legacy deployment key to publish the new backend without that migration.

Set these public build variables on the app Vercel project and EAS release environment:

- `EXPO_PUBLIC_CONVEX_URL`: the new cloud deployment's HTTPS URL
- `EXPO_PUBLIC_CONVEX_SITE_URL`: its HTTPS HTTP actions URL
- `EXPO_PUBLIC_DEMO_MODE=false`
- `EXPO_PUBLIC_EAS_PROJECT_ID`: the linked Expo project ID for native builds

Configure Convex Auth signing keys on the cloud deployment and set `SITE_URL=https://app.calgaryuwh.com`. Never copy local auth keys or localhost URLs into production.

## Initial account migration

On September 12, 2026, Edwin Zhang's Google account identity and player profile were copied from the legacy `uwh` production project into the separate UWH Club production backend. The club is Calgary Crocs, with Edwin as its owner, administrator and coach. No other players, authentication sessions, attendance or financial records were copied. At Edwin’s request, an initial password was subsequently added to his existing verified account. Password sign-in and migrated administrator access were verified, and the verification session was signed out. The temporary plaintext file was deleted. Email recovery still requires Resend domain verification.

The legacy production database contains 12 practices on or after September 3, 2026, ending September 28. Practice migration is pending confirmation of section/end times and whether to extend beyond those existing dates. The old database records start times but not section boundaries or end times. Do not regenerate missing dates from a recurrence rule without preserving the user's holiday exclusions.

`legacy_migration:migrate` is an internal, administrator-operated mutation restricted to this account and the 2026–2027 season. It supports dry runs and skips existing event IDs on retries. Never deploy it to the legacy project.

## Email

Create a Resend account, verify a sending domain with its supplied DNS records, and create a sending API key. Configure these secrets on the hosted Convex backend:

- `AUTH_EMAIL_MODE=resend`
- `AUTH_RESEND_KEY`: the Resend sending API key
- `AUTH_EMAIL_FROM`: the verified sender address

These enable verification codes, password recovery and invitations. Keep the API key out of browser variables and Git. Google login may be configured separately with `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`; register the actual backend callback URL. Resend is still required for email signup and invitations.

`calgaryuwh.com` was added to Resend on September 12, 2026. The configured sender is `UWH Club <notifications@calgaryuwh.com>`. The sending-only `UWH Club authentication` key is saved as `AUTH_RESEND_KEY` on the production Convex deployment. Domain verification is still required before it can deliver mail. Resend supplied these records for domain verification and sending:

| Type | Host | Value |
| --- | --- | --- |
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDOwHeUOlOVlCceDGM0PX7JvgMQnOEpSbhQZ2fyIhxRcsB0iMNqQbU5F4Rm1WHK63JXalJV/BnnFQKJnh+8GzVN5/nn+/5vwyYqoeYyTCtFjwtclh8Q59yo3lpOTSAvx+7Aj7y+mJe3nO7Btx6sbD0VWDW4TZH12/4EaRkocxcPwIDAQAB |
| CNAME | rsend | rsend.forge.rmta.net |
| CNAME | send | send.forge.rmta.net |

Use automatic TTL. Receiving is disabled; preserve existing mail records. Verify these values against the Resend dashboard before adding them if the domain has been recreated.

## Landing page

The landing page can display bundled content without a backend. Its editor and enquiry submissions require:

- `CONVEX_URL`: the hosted mobile backend
- `WEBSITE_SERVER_KEY`: a random secret shared between the site server and Convex
- `WEBSITE_ADMIN_PASSWORD`: a new strong editor password
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: Turnstile keys allowing the deployed hostname

Until configured, enquiries fail closed. They are stored in Convex; the current implementation does not email enquiries through Resend.

## App Store

See [release readiness](RELEASE.md) and [social authentication](SOCIAL-AUTH.md). Remaining work includes Apple Developer and Expo ownership, a permanent bundle identifier, signing and APNs credentials, icons and screenshots, published privacy/support pages, store privacy answers, and TestFlight testing. Apple sign-in token revocation on account deletion remains implementation work. The existing identifier `club.crocs.preview` is provisional. A web deployment does not submit an iOS binary to the App Store.
