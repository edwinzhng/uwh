- Account → Membership shows the selected household person's profile. Members → Profile and Settings → Household → Edit info use the same editor and controller contract. The existing Account tabs remain unchanged.

- Name, cap number and saved photo are visible only to signed-in members of the same club. Contact email and phone are returned only to the person and their currently linked guardians. Administrator or coach status alone does not grant contact access or editing permission. Archived profiles remain readable but cannot be edited.

- The contact email is separate from the verified sign-in email. Changing a profile name updates its linked membership/user display names without changing login identifiers, household links, roles, programs, registration or coaching data. Cap numbers are optional integers from 1–99; contacts can be cleared. Phone and email validation runs on submission and again on the server.

- Choose a photo, reposition by dragging or using the direction controls, adjust zoom, and choose Use photo. The same crop mathematics feed the preview and Expo's platform-specific image manipulator. Saving produces a square 512 × 512 JPEG; the circular preview represents the avatar mask. Existing saved photos can be adjusted again or removed. Choosing another image is always available.

- Photo changes are staged until Save profile. Failed crop/upload/save attempts retain the editor and draft. A pending photo is readable only by its uploader while they still have household edit access. Only that uploader can attach it to its intended person. After attachment, authenticated club members can read the image bytes; storage URLs are never exposed. The byte endpoint rechecks authentication and club membership on every request, with private/no-store and nosniff responses.

- Uploads are limited to 5 MB with byte-signature and MIME validation. Actor-scoped upload keys include a content digest, preventing edited-payload replay. Pending drafts are bounded to four and expire after a day. Cancel removes staged uploads; replacing or removing a saved photo deletes the previous stored bytes atomically with the profile update.

- Saving checks both the profile revision and captured member name, protecting against edits made through another profile or account-name editor. Immediate exact retries return the prior successful outcome; edited payloads or stale snapshots are rejected. Opening the editor captures a person and revision so a household switch cannot retarget an in-flight save.

- Profile tables belong to their club and person. Account erasure removes profiles/photos for erased people, deletes the departing account's pending uploads, and removes its author/owner references from retained household photos. Club erasure removes every profile and stored photo. Archiving preserves existing history and photo identity.

- `tests/member-profile.test.ts` covers field validation, privacy projections, crop bounds, preview authorization, replay, stale edits and pending-photo limits. `scripts/verify-member-profiles.ts` checks the real local backend, authenticated photo bytes, signed-out/cross-club/staff denial, guardian revocation, optimistic revisions, account-name sync, replacement/removal, archive protection and account erasure using disposable fictional fixtures.

- The iOS production bundle with the SDK-compatible image manipulator exports successfully. A bundle is not a native runtime test. This host has Command Line Tools but no Xcode application, simulator runtime, simctl or devicectl; simulator/device interaction cannot be verified here until the native toolchain or a test device is available.
