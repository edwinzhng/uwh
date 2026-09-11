# Performance pass — September 11, 2026

- Public landing content and HTML use a five-minute cache. The authenticated content update endpoint invalidates both after a successful save. Private app responses remain uncached.
- Landing signup forms mount and load only after opening a dialog. Verified zero forms initially and one form after opening registration.
- App workspace data, account directory, and join requests load concurrently after authorization.
- Signup pool image converted from 912,236-byte JPEG to 220,282-byte WebP (76% smaller).
- Video poster extracted from the first frame of https://www.youtube.com/watch?v=SAukrpTEvZA and encoded as a 98,772-byte WebP; Next Image supplies responsive, lazy-loaded variants. Embedded source watermark retained.
- Cursor lens skips WebGL initialization on touch pointers and reduced-motion devices, and no longer retains its drawing buffer.

## Verification

- Site production build: passed; landing route prerendered with five-minute revalidation.
- Production local warm responses: landing 2–3 ms, coaches 2 ms, cache HIT. These are local server measurements, not real-user network or browser speed claims.
- App typecheck, Biome, toast copy and design boundary checks: passed.
- App web export: passed.
- Local API stress checks: passed with 400 events, 2,000 attendance records, 400 feedback entries, and 120-item histories. Existing compact schedule payload: 25,909 bytes versus 508,516 bytes for the full workspace. Paging, permissions, totals, concurrent payment handling and unrelated history preserved.
- Unit suite: 126 pass; 3 existing date-dependent RSVP tests fail because fixture signup windows have closed. These also failed before this pass.
- Browser: inspected thumbnail and verified registration loads on demand with the expected fields.
