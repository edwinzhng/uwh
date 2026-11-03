- Prepared November 2, 2026 for real tester accounts and shared saved data. This is separate from the production club and the local imported database.

- Convex project: `calgary-underwater-hockey-club/uwh-club-beta`
- Beta deployment reference: `calgary-underwater-hockey-club:uwh-club-beta:beta`
- Backend: `https://healthy-kangaroo-237.convex.cloud`
- HTTP actions: `https://healthy-kangaroo-237.convex.site`
- Intended web project/domain: `uwh-club-beta` / `https://uwh-club-beta.vercel.app` (not published or verified yet).

- Use the explicit beta reference when operating this deployment. The CLI's implicit production selection provisions/uses the project's default deployment, `unique-seal-647`, rather than the named beta. That default deployment has not received app code or club data.

- Fresh beta-only JWT signing keys are configured. Email uses `AUTH_EMAIL_MODE=resend` and `UWH Club Beta <notifications@calgaryuwh.com>`. A separate sending-only Resend key restricted to `calgaryuwh.com` must be added as `AUTH_RESEND_KEY` before signup, recovery and passwordless email can work. Production email credentials were not copied. Push delivery is disabled. No production/local club records or accounts were imported.

- Keep local environment files unchanged. Export with explicit public cloud URLs, demo/review mode off and the Metro cache cleared; an export using the prior demo cache omitted the backend endpoint, so verify the finished bundle contains `healthy-kangaroo-237` and excludes local/production endpoints.

```sh
EXPO_NO_DOTENV=1 \
EXPO_PUBLIC_CONVEX_URL=https://healthy-kangaroo-237.convex.cloud \
EXPO_PUBLIC_CONVEX_SITE_URL=https://healthy-kangaroo-237.convex.site \
EXPO_PUBLIC_DEMO_MODE=false \
EXPO_PUBLIC_REVIEW_MODE=false \
bunx expo export --platform web --max-workers 2 --clear --output-dir /tmp/uwh-beta-live
```

- The exported directory is static and can be published independently of the source checkout, with clean URLs enabled. Do not upload `.env` files, local database contents or source backups. The current export is `/tmp/uwh-beta-live`.

- The installed Convex CLI 1.45.0 stalled bundling Node actions. The ephemeral official CLI 1.49.0 passed that stage without modifying app dependencies, but the first cloud code push subsequently failed with HTTP 408 at `/api/deploy2/start_push`. The beta project/database exists but backend code deployment remains unverified. Vercel device login expired without completion; a new login is required before web publication. Publish credentials are deployment-scoped, kept only in process memory, and revoked after each attempt. Do not print keys or place them in shell arguments.

- Finish the Vercel login refresh and publish the static beta project. Set `SITE_URL` to its final HTTPS origin if different from the intended domain. Verify public routes, the auth JWKS endpoint, signup email delivery, login, persistent changes and a second tester joining the same beta club. Testers need new beta accounts; production passwords/accounts are separate. An empty beta does not automatically grant a tester access to any real club data.
