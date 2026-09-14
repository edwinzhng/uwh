# Code audit — September 8, 2026

## Scope and method

Ran the complete TypeScript, Biome, design-boundary and unit-test checks. Reviewed route/workspace loading, pagination, shared tabs and controls, household calendar export, goal permissions, membership data selection and obsolete feature wiring. Ran the local calendar integration suite and scale regression suite. This is a maintainability and regression audit, not a claim that every application path is defect-free.

## Changes

- Recent workspace and paginated queries retain their live Convex subscription for 30 seconds after leaving. Returning to the same query can reuse a current result instead of briefly collapsing to a loading label. This uses Convex's built-in prewarmQuery; no custom data cache or persisted private data was introduced.
- ClubShell waits for the requested workspace before rendering page content. It no longer displays another screen's partial dataset as if it were the destination's data. Initial loading uses a shared, static placeholder; no shimmer or additional animation.
- Removed unused goal check-in and calendar subscription UI. Removed the obsolete calendar service and its app-wide query from BackendContext/LiveBridge. Existing backend feed endpoints remain for compatibility.
- Fixed household calendar export to query actual saved responses and events instead of relying on the currently loaded page's partial data. Validates every selected person against the authenticated household, deduplicates event reads, and preserves per-person calendar identity.
- Renamed CalendarSyncButton to CalendarExportButton to match its function.
- Removed unreachable membership loading branches for administration routes and simplified the resulting person-scoped data selection.
- Simplified the disabled RSVP condition after removal of the old explanatory text.

## Verification

- Complete check: 123 tests across 30 files, TypeScript, Biome and design boundary pass. Biome retains two informational fragment suggestions unrelated to functional behavior.
- Local calendar suite: household export contains both selected members' events without visiting schedule pages; empty selections and unrelated people are rejected. Existing feed identity, revocation, ownership and update tests pass.
- Local scale suite: passes with 400 events, 2,000 attendance records, 400 feedback entries and 120-item histories. The suite reports the existing bounded schedule workspace at approximately 26 KB versus approximately 508 KB for a full workspace; this audit did not introduce that entire reduction.
- Web, iOS and Android export pass.
- Browser: Club → Equipment → Club → Equipment navigation works after retention changes. Browser-tool round-trip timings include automation overhead and are not presented as application performance benchmarks.

## Limits and follow-up

- A first visit or a return after the retention window can still show a loading placeholder. Thirty-second retention trades a short period of additional live subscriptions for smoother repeat navigation.
- A number of specialized feature queries still use ordinary useQuery. Apply retention to further screens only if measured flashing warrants it, rather than retaining all histories globally.
- The central action reducer and backend data loader are relatively large. Their domain behavior is covered by tests; splitting them wholesale would add risk without addressing the observed navigation issue. Extract cohesive domain handlers when those areas next change.
- Validate cold-start navigation and slow-network transitions on physical iOS/Android devices before release; export success is not device testing.

Convex subscription API reference: https://docs.convex.dev/api/classes/react.ConvexReactClient
