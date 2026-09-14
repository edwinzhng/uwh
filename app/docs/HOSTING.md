# Hosting and release setup

The Vercel projects are `edwinzhang/uwh-club` (root `app`) and `edwinzhang/calgary-crocs` (root `site`). Both need access to `packages/design-system` outside their root directory. Use Bun 1.3.14-compatible lockfiles and the per-project `vercel.json` files. The repository root is the legacy coaching app; do not deploy it as either new project.

## App domain

On September 13, 2026, Namecheap DNS was connected to Vercel: `@` uses A record `216.198.79.1`, `www` uses CNAME `c89c35d3d7becdde.vercel-dns-017.com`, and `app` uses CNAME `e6c5c6b36725b997.vercel-dns-017.com`. Existing email and verification records were preserved. The main site project now includes `calgaryuwh.com` and `www.calgaryuwh.com`.

The coaches page and navigation are temporarily disabled by `site/lib/features.ts`. Set `coachesEnabled` to `true` when the profiles are ready. The site deployment passed its checks and `/coaches` returns HTTP 404.

The September 13 production deployments are `dpl_E4MSgJNDYzn8wVCWfTWuuJXVuPJJ` (site) and `dpl_8RG1oxJmUcDjH98TJGa27KX8pL9r` (app). Both are ready; the main site and app sign-in screen were verified over HTTPS on their custom domains. Site checks passed with 6 tests, and app checks passed with 171 tests. The site project still has no production environment variables, so enquiry submissions and editor configuration remain outstanding.

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

The legacy and mobile backends are incompatible: their `fitnessTests` schemas and authentication callbacks differ. Publishing `app/convex` to the legacy production deployment would replace its functions and may fail schema validation. Use a separate cloud deployment in the existing Convex account for testing, or complete a backed-up data migration and coordinated cutover first. Do not use the legacy deployment key to publish the new backend without that migration.

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

Resend is configured in the club-owned `hello@calgaryuwh.com` account. These variables are configured on production `brainy-albatross-874`:

- `AUTH_EMAIL_MODE=resend`
- `AUTH_RESEND_KEY`: the Resend sending API key
- `AUTH_EMAIL_FROM`: the verified sender address

These enable verification codes, password recovery and invitations. Keep the API key out of browser variables and Git. Google login may be configured separately with `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`; register the actual backend callback URL. Resend is still required for email signup and invitations.

On September 13, 2026, the domain was released from the personal Resend account and verified in the club account (domain ID `1149e803-351c-48e6-b267-7ce6ee42cde4`). The configured sender is `UWH Club <notifications@calgaryuwh.com>`. The `UWH Club production` key is restricted to sending from `calgaryuwh.com` and replaces the old `AUTH_RESEND_KEY` on production. Resend verified these DNS records:

| Type | Host | Value |
| --- | --- | --- |
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUpejxYdKehxSx/WS/MC4qejW13pW8GoYcwk7ewbXgoAlfk67cRXyvdIEFxfq0EIuOvMRVGD00F5pJqilhgG4NTvV1id3so9kvddNKJ30IbbnnE5IZCamcVu/w4CrnQvW188aldi/SdzjX/BdlsWxFnyInCMxoiFSAZoC14LPWAQIDAQAB |
| CNAME | rsend | rsend.forge.rmta.net |
| CNAME | send | send.forge.rmta.net |

Use automatic TTL. Receiving is disabled; preserve existing mail records. Verify these values against the Resend dashboard before adding them if the domain has been recreated.

The obsolete `_webflow` TXT record was removed. The former Webflow apex and `www` targets were already replaced with Vercel during the site cutover. Google mail, SPF, DKIM, DMARC and Google verification records remain unchanged.

## Landing page

The landing page displays bundled content. Website inquiries are separate from app accounts: the Vercel `/api/interest` endpoint validates the form and sends a plain-text email through Resend to `hello@calgaryuwh.com`, from `Calgary Crocs <notifications@calgaryuwh.com>`, with the visitor's email as Reply-To.

The only production variable needed for inquiry delivery is the server-only `RESEND_API_KEY`. Production uses the existing calgaryuwh.com-scoped sending key, also used by the app. No inquiry is written to Convex and no Cloudflare widget is loaded.

Vercel Firewall limits POST requests to `/api/interest` to five attempts per IP per hour. The route retains same-origin validation, request-size limits, a honeypot, and the Calgary trial-date cutoff. Resend idempotency keys deduplicate identical email payloads for 24 hours. Failed sends preserve the form for retry.

The legacy content editor still uses `CONVEX_URL`, `WEBSITE_SERVER_KEY`, and `WEBSITE_ADMIN_PASSWORD`; it is independent of the inquiry email path and is not configured on the production site.

## App Store

See [release readiness](RELEASE.md) and [social authentication](SOCIAL-AUTH.md). Remaining work includes Apple Developer and Expo ownership, a permanent bundle identifier, signing and APNs credentials, icons and screenshots, published privacy/support pages, store privacy answers, and TestFlight testing. Apple sign-in token revocation on account deletion remains implementation work. The existing identifier `club.crocs.preview` is provisional. A web deployment does not submit an iOS binary to the App Store.
