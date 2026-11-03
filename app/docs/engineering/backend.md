- Each capability owns a focused schema, server module, portable domain rules and typed client contract. Import table groups into `schema.ts`. Keep persistence details outside the domain and avoid expanding the general app action union when a separate bounded module is clearer. Reuse an existing write helper when two workflows change the same authoritative value so validation, revisions and downstream invalidation stay consistent.

- Use generated Convex types and API references. Translate external `null` to app-owned `undefined` in adapters. Validate untrusted IDs, URLs, file signatures and lengths on the server. Never use a client field to decide the actor or their permissions.

- Every public query and write authenticates the account, establishes club membership, then authorizes the object and action. An account ID, person ID, club ID or thread ID supplied by a client is not proof of access. Recheck thread participation and blocks for chat tools; verify guardian links for child records; require coaching scope for private evaluations.

- Use a single domain predicate for each audience rule in mutations, queries, projections, notifications and sample controllers. Public shout-outs are explicitly distinguished from family-only coaching feedback. Treat ambiguous legacy data as private. Administrative privileges do not automatically grant access to all coaching notes or direct conversations.

- Redact restricted fields before returning data. Hiding a UI control is insufficient. File bytes require the same authorization as metadata; do not return an unprotected storage URL for a private file. Keep private text and filenames out of lock-screen notifications and diagnostic logs.

- Use mutations for atomic domain transitions. Read the authoritative state and validate the expected revision in the same transaction. Capacity reservations, votes, publication and assignment changes must be race-safe. Scope indexed idempotency keys to club and actor. Repeating the same normalized request returns its prior outcome; the same actor cannot reuse that key for a different destination or payload. A different actor cannot replay the original actor's receipt. Check current authorization before returning a receipt.

- Preserve historical identity. Archive roster profiles instead of deleting them to remove them from active work; account access remains a separate decision. Keep draft and published versions distinct, retain a meaningful audit trail, and invalidate derived lineups or reports when their inputs change. Do not invent observed attendance or coaching hours from expected schedules.

- Use explicit draft constructors at persistence boundaries. A queried record is not an input DTO: revisions, storage metadata and database fields must not leak into a narrower validator through object spreading. For example, `programDraft` selects the program editor's allowed fields, and `programCommandPayload` defines retry identity independently of transport ordering.

- Treat related revisions separately. Approved goals and pending proposals have different edit lifetimes; clearing or declining a proposal invalidates old proposal editors. Reflections retain the approved goal and category snapshot they were written against. Rating rounds retain the reviewer policy they started with rather than silently changing a denominator.

- Program roster changes affect future session eligibility, defaults and commitments. Preserve already-started sessions, attendance marks and explicit exceptions. A deadline job may change an unanswered RSVP, not overwrite recorded attendance. A rename must not unpublish an unrelated historical lineup.

- Choose indexes from the user query: club, parent object, person, date, status or operation key. Bound lists and paginate large collections. Avoid fetching every club document to render one screen. Ensure pagination cannot skip visible records because access filtering happens after an arbitrary limit.

- Use actions only for external I/O. Keep secrets in server configuration, not client bundles, files or command output. Durable scheduled work rechecks eligibility at execution, uses recipient/event/version deduplication and invalidates obsolete jobs after edits. Push acceptance is not proof of receipt or reading.

- Keep activity delivery separate from push transport. An authorized account can receive an inbox item without a registered device or enabled push preference. Recheck source visibility when listing or opening an item; a stored notification is never a durable access grant.

- Managed program rooms derive their audience from current roles, rosters and verified household links at read/write time. Stored participant lists are not permanent grants. Automatic Staff rooms are retired; legacy history stays private and inaccessible through current chat endpoints. Messages and notices have no acknowledgement workflow. Historical acknowledgement fields/tables remain private and covered by erasure cleanup, but there are no current read or write endpoints for that retired feature.

- Publish club terms only from explicit administrator-supplied approved text. Versions are immutable and acceptance is explicit, account-bound and version-bound. Protected writes enforce the requirement server-side. Sign-out, account deletion, capability revocation and an administrator’s explicit stop-requiring recovery stay reachable without accepting a policy. Never manufacture acceptance or reuse an old version’s assent.

- Self-service household links require a recipient-bound invitation or the original dependent-creation proof. Knowing a person’s email is not authority to claim their profile. Unlinking preserves the person and history; defaults must belong to the current household and fall back safely after revocation or archival.

- Bound media streams before buffering. Validate declared and observed size, file signatures, MIME and attachment purpose. Large uploaded files use a server-only storage path and a dedicated ingest action; private downloads stream through authenticated routes and honor byte ranges. Never expose a reusable private storage URL to the client.

- Every new table and file store defines ownership, archive behavior, account erasure and club erasure. Add cleanup integration with the feature, including uploaded bytes, comments, votes, pending files and derived records. Test that old links remain intelligible and cannot reveal removed/private content.

- Database migrations are explicit and backward-compatible. Do not silently reclassify old private content as public or delete identities during a merge. Verify new indexes and generated contracts against an isolated backend before release.

- Member merging is an explicit administrator workflow, not a generic JSON rewrite. Preview typed per-domain changes and collisions, bind confirmation to a fresh fingerprint, retain the archived source alias and audit, and reject stale source writes. Never combine distinct login identities or grant household access as a side effect. Preserve target-owned current settings, original history IDs and private content; ambiguous collisions block the entire transaction. Referenced programs are archived instead of deleted.
