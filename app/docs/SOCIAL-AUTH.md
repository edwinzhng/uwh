# Google, Apple and connected accounts

Implemented September 8, 2026. Provider credentials are not configured in the local backend. The buttons stay disabled until their provider is configured. The existing test account still uses its password.

## In the app

- Sign in or create an account with Google, Apple, or email and password.
- Open **Profile menu → Account settings → Account & security → Connected accounts** to connect or disconnect Google or Apple.
- A provider with the same verified email uses the existing account. To connect a different address, including Apple’s private relay address, sign in to your existing account and use **Connect**.
- Connections preserve the account’s name, primary email, club membership, roles, player profile and children. Provider names never overwrite a name you edited in the app.
- Accounts that already have separate club records or other sign-in methods cannot be merged through this screen. That requires a deliberate data migration.
- The last working sign-in method cannot be disconnected. Disconnecting signs out other devices. A provider proving the same verified primary email can reconnect on a later sign-in; disconnecting is not a ban on that provider or a revocation of its external consent.
- Password-free accounts verify a connected provider before deleting the account. Verification lasts five minutes and is bound to the current session. Owner-transfer requirements still apply.
- Invitation links survive sign-in. An invitation accepts either the primary verified email or a currently connected provider’s verified email. Apple relay users invited at a different address should first join with the invited email, then connect Apple.

## Configure providers

Set credentials on the **Convex backend**, never in `EXPO_PUBLIC_*` variables. Set `SITE_URL` to the app’s web origin and keep `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CONVEX_SITE_URL` pointed at the same deployment.

| Provider | Backend variables | Authorized callback |
| --- | --- | --- |
| Google | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | `https://<deployment>.convex.site/api/auth/callback/google` |
| Apple | `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET` | `https://<deployment>.convex.site/api/auth/callback/apple` |

Use the deployment’s actual HTTP Actions URL. For this local instance that is `http://127.0.0.1:3211`. The frontend callback is separate from the provider callback.

Google uses a Web application OAuth client for this shared server flow. Configure its consent screen, callback and test users using the [Convex Google setup guide](https://labs.convex.dev/auth/config/oauth/google).

Apple needs an App ID with Sign in with Apple, a linked Services ID, and a signing key. `AUTH_APPLE_ID` is the Services ID; `AUTH_APPLE_SECRET` is its signed client-secret JWT. Apple requires a public HTTPS deployment and does not support this localhost setup. Its client secret must be rotated before expiry, at most six months. Follow the [Convex Apple setup guide](https://labs.convex.dev/auth/config/oauth/apple). Register the email sender with Apple if sending to private relay addresses; see [Apple’s relay setup](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/).

The native apps use Expo’s system authentication browser and return through `uwh-club://auth-callback` or `uwh-club://connect-account`. Build a development client with the registered scheme; Expo Go is not the test target. Only these native destinations and the configured web origin are accepted. See [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/).

## Security and maintenance

Convex Auth and Auth.js handle the provider handshake and code exchange. Provider subject IDs identify external accounts. Both providers explicitly require verified email; automatic linking never trusts an unverified address. The custom user callback retains existing profile fields and the email/password verification and rate-limit behavior.

Explicit connection requests are short-lived and bound to the original user and live session. The second sign-in uses an unauthenticated HTTP client so Convex Auth cannot replace or revoke the original session. Its temporary JWT is verified on the server for signature, issuer, audience and age, then checked against its live, freshly created session. The final transfer is atomic. Temporary sessions are revoked and a completed callback can be reopened safely. The verifier stays in tab-local session storage on web or SecureStore on native; it is cleared after completion. Application sign-in tokens never go in callback URLs.

This adds provider sign-in methods, not Google Calendar permissions or external account deletion. Convex Auth does not retain Apple refresh tokens in this implementation. Apple consent/token revocation on account deletion and provider notification handling remain release work; review [Apple’s revocation API](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens) before an App Store submission. Provider-approved button branding and real-device sign-in checks also remain part of that release pass.

## Verification

`bun run verify:social-auth` uses fictional accounts and locally signed test sessions. It checks verified-email reuse, different-email linking, preserved club data, aliases on invitations, original-session binding, forged/stale/expired proof rejection, cross-account conflicts, disconnect access checks, last-method protection and password-free deletion. Fixtures are removed afterward. The fixture endpoints are internal and guarded to the local backend and `@example.test` addresses.

Also run `bun run check`, `bun run verify:security`, `bun run verify:invites`, and `bun expo export --platform all --max-workers 2`.

With configured providers, test on web, iOS and Android: new and returning sign-in, cancellation, callback reload, an invitation during signup, Apple Hide My Email, connecting both providers, disconnecting one, last-method protection, expired identity verification, and deletion after transferring club ownership. These real provider/browser/device checks have not been performed locally.
