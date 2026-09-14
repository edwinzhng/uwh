# Security review — 2026-09-12

Scope: the new app/Expo application, its separate Convex backend, and the landing page. The legacy coaches deployment was read only for the explicitly requested account migration.

## Changes

- Upgraded Auth.js core to 0.41.3, including Convex Auth's transitive resolution. Addresses the published email-normalization and OAuth/cookie advisories (https://github.com/nextauthjs/next-auth/security/advisories/GHSA-7rqj-j65f-68wh).
- Upgraded the landing page from Next.js 16.1.6 to 16.3.3, which includes the published image-optimization security fixes (https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).
- Replaced the vulnerable transitive URI decoder with `packages/safe-uri-component`. Valid encoded values retain normal decoding; malformed values stay literal without recursive recovery. A regression test exercises the actual query-string dependency with a long malformed value.
- Updated UUID to 11.1.1, preserving the v4 API used by Xcode tooling.
- Website admin sessions are random, signed, expire after eight hours on the server, reject tampering, and become invalid after the server key or administrator password changes. Cookies remain HTTP-only, secure in production, and same-site strict. Previous daily tokens no longer authenticate.
- Website JSON endpoints and authenticated image uploads enforce byte limits while streaming, including requests with missing or misleading Content-Length headers. Existing membership, conversation, MIME-signature, and storage checks remain in place.
- Imported Jordan's verified legacy identity into the existing Calgary club with Coach access and no administrator access. Applied the explicitly requested test password as a Scrypt hash, revoked existing sessions, verified login and administrator denial, then removed the one-off migration function. No password or API key was added to source files.

## Permission verification

Inspected membership/session validation, club queries and mutations, coaching and fitness access, website authentication, protected images, connected accounts, and account deletion. Coaching is deliberately club-wide: `coachPrograms` is a compatibility field representing the Coach role, as documented in IMPLEMENTATION.md. Administrative access does not implicitly grant coaching access or private conversation membership.

The isolated live security suite passed verification gating, account approval/decline, private report isolation, blocking/removal/suspension, push authorization and cleanup, password recovery, immediate session revocation, and account/club deletion. Production checks confirmed Jordan's password login, non-administrator permissions, and immediate rejection of the revoked session.

## Remaining dependency findings

The landing page production audit reports no known vulnerabilities at review time. The mobile dependency audit still reports two high-severity `image-size` 1.2.1 advisories: GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq. No patched package release was available in the registry during this review. This package is pulled in by Metro's build-time asset processing; it does not process uploaded chat photos on the hosted Convex backend. Build only trusted repository assets until the upstream parser is patched. This review does not claim the entire codebase is vulnerability-free.

The requested test password is not automatically expiring. Rotate it before using Jordan's account beyond testing. Email delivery still depends on completing the existing Resend domain setup.
