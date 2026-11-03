- The November 1 source capture was imported into Edwin's private local workspace on November 2, 2026. Source files, before/after destination backups, media, identity approvals and audit reports remain in the git-ignored repository `data/migration-2026-11-01` directory. Do not commit these private artifacts or their signed links.

- Sources include Base44 entity CSVs, 29 copied uploaded videos with SHA-256 hashes, two preserved YouTube references, the SportEasy roster and attendance workbooks, a 186-event calendar feed, selected legacy Convex tables without authentication/session tables, and minimized registration responses. The registration app input excludes health-card numbers, medical answers and addresses. RSVP intent is not observed attendance. Registration answers are not proof of received payment or acceptance of this app's terms.

- `scripts/prepare-migration.ts` validates source IDs and writes the private preflight. `scripts/migration-identities.ts` proposes identity mappings, never grants accounts access, and retains both histories for explicitly approved duplicate source IDs. The private approvals file records the destination and confirmed duplicates. New ambiguities require review rather than fuzzy merging.

- The destination is Edwin's private `Calgary Crocs` club on the isolated local backend. The verified owner account has an owner membership and does not need a demo-club invite. `local_workspace:initializeOwner` is an idempotent internal setup operation restricted to the allowlisted owner on the loopback backend with outbound delivery disabled. It creates no sample content or source-derived access grants. The display name has no environment suffix. Edwin explicitly approved coaching access to all six imported programs; no other source roles, login credentials or membership grants were imported. Historical authors are inert attribution records, not accounts with club access.

- These are actual destination records at the reconciled import baseline, not counts of import-reference entries. Subsequent use can add records; runtime checks preserve those additions rather than resetting the workspace to these totals:

- Content: Members; Records: 74
- Content: Events; Records: 349
- Content: RSVP and attendance responses; Records: 3,737
- Content: Shoutouts; Records: 41
- Content: Coach reviews; Records: 191
- Content: Fitness results; Records: 276
- Content: Coaching-hour records; Records: 196
- Content: Videos; Records: 31
- Content: Messages; Records: 58
- Content: Profile photos; Records: 20
- Content: Current-season registration records; Records: 47

- The videos include 29 copied uploads and two preserved external references. Stored-file references and byte sizes were checked against the after-import export. Registration records do not establish payment, household permissions or acceptance of this app's terms.

- A subsequent real-account playback check found that the original import omitted the reverse `resourceFiles.resourceId` binding required by protected reads. Counts and stored bytes alone had not caught this defect. The importer now binds files in the same resource transaction. A guarded, loopback-only reconciliation repaired exactly 69 missing links across 40 imported resources, with no other resource-file fields changed; a repeat dry run reported zero pending links. The export audit now rejects missing or incorrect reverse bindings. The private before/after repair snapshots and `post-media-link-audit.json` retain the evidence. The existing full-media export supplies the immutable binary evidence; the incremental repair snapshots contain database metadata only. A protected imported clip loaded and decoded at 1920×1080 with ready state 4. Authorization was not relaxed.

- Ten overlapping Monday event pairs were reconciled instead of creating duplicate practices. Nine attendance records without a supported event match remain privately archived. Seven self-ratings without a linked practice are preserved as recorded-date history, not assigned invented practice dates. Eight undated lineups are available as coach-only reference documents rather than fabricated event lineups. Stable source references and approved identity merges retain provenance; reruns must not silently replace later edits.

- The before/after export audit found zero domain-integrity issues and zero unapproved changes to preexisting outside-club documents. It separately records Edwin's approved coaching assignment. The existing demo club, content, user document, credential record and membership remain unchanged. Hosted deployments were not modified.

- The raw audit remains `review_required` for authentication/runtime metadata. One unexpired demo session and its 13 refresh tokens closed between exports; the initiating action is unproven. Do not describe this as expiry cleanup or claim that the entire authentication lifecycle was untouched. New owner-session/refresh activity, a reset of the owner's sign-in rate limit and an iOS push registration resolve to Edwin. The private metadata review records that evidence without publishing tokens or credential values. No closed session or token was restored.

- Current verification includes both-platform Metro compilation and export-based data checks. It does not establish real-device frame rate, memory stability, complete native interaction acceptance, hosted release readiness or notification delivery.

- Edwin confirmed the iPhone is signed in as Edwin and that repeated Home → Schedule → Club → Members → player → Back → Messages navigation now continues working after the token-loop fix. Browser checks also rendered last-season fitness sessions/results, player reviews, coaching-hour totals and protected video playback under the real account. Historical records remain in their actual seasons rather than being retimed to fill the current season.

- The local backend remains at `http://127.0.0.1:3210`. The browser at port 4180 and the phone use this same database: the phone connects to the Mac's LAN address on port 3210, not its own localhost. Protected HTTP routes use port 3211. This is not a production cloud deployment. Do not point development builds at production to avoid verification setup.

- `AUTH_EMAIL_MODE=local` stores codes in the admin-only internal `local_email` inbox. Fictional `@example.test` addresses remain supported. A real email must be explicitly listed in the server-only `AUTH_LOCAL_EMAIL_ALLOWLIST`; the allowlist cannot enable this inbox on a cloud backend. Local passwords and verification are independent of production credentials. Do not reset or replace the owner's password without their participation.

- `OUTBOUND_DELIVERY_DISABLED=true`, `PUSH_DELIVERY_ENABLED=false`, and `WEB_PUSH_DELIVERY_ENABLED=false` are set on the local deployment. The master switch guards authentication email, invitation email, native pushes and web pushes, including notification-test actions. In-app activity remains testable. No production environment variable was changed.

- Use `scripts/local-convex.ts` for local administrative commands; it pins the local URL and reads the local admin key without printing it. Verification/reset codes must not be exposed in a public API or browser bundle. Never import authentication records, grant source app roles automatically, or bypass email verification to complete a data migration.
