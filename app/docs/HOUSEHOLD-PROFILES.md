- Settings → Linked profiles lists the signed-in person and their linked dependents. A member can create a new dependent, edit authorized profile details, choose an active default, unlink a dependent without deleting the profile or history, and accept or dismiss a previously authorized link. The self-login identity cannot be unlinked through this workflow.

- New dependent creation accepts only a name and an idempotency key. It creates a fresh roster identity with no program enrollment, login, coaching permissions, or administrator role. An administrator can subsequently enroll the dependent in programs. Matching an editable contact email or finding a name never establishes household ownership.

- For an existing profile, an administrator opens the member’s Admin panel and selects “Invite guardian.” Invitations target an existing verified account in the same club. The account holder must explicitly accept the recipient-bound proof in Settings before private household access is granted. Another account, club, or signed-out caller cannot claim that proof. The administrator’s confirmation explains the private access being granted.

- Unlinking removes only the caller’s current child link. It preserves the roster member, all historical records, other guardians, and staff permissions. A previously authorized link is offered for relinking until dismissed or administratively revoked. Saving administrator account access revokes outstanding proofs for every omitted dependent, so an old invitation or successful creation retry cannot restore removed access.

- The default person is saved on the current membership and must be an active, unmerged member of that account’s authorized household. Cold-start selection uses the saved default when no valid current selection exists. Unlinking or archiving a default safely falls back to the login profile. Merges canonicalize default references and guardian proof references; pending guardian links must be resolved before merging private audiences.

- Proof queries and creation are bounded. Account and club erasure remove appropriate proof records and clear retained administrator attribution. The preview uses isolated Jotai identity overrides and the same domain rules, including immediate room/private-data access changes after unlinking.

- `bun test tests/household.test.ts` checks default eligibility, exact dependent-creation replay, preserved roles, non-destructive unlink, identity-bound relinking, and explicit guardian proofs.

- `bun scripts/verify-household.ts` uses fictional accounts on the isolated local backend. It verifies simultaneous creation replay, no email-based claiming, persistent defaults, private-contact redaction, recipient and club boundaries, administrator invitations, unlink/relink, stale-proof revocation, dismissed invitations, and archived defaults. Fixture accounts and clubs are cleaned up afterward.
