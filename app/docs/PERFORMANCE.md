# Performance pass · September 8, 2026

The app now loads historical data separately from the shared club context. This pass targets database reads, reactive subscription size, rendered list size and web startup JavaScript. Measurements below are local fixtures and build sizes, not device frame-rate or launch-time benchmarks.

## Data loading

| Area | Current behavior |
| --- | --- |
| Shared context | `club.current` accepts a screen and optional person/event ID. The app always supplies them. Unrelated event, response, feedback, payment and return histories are excluded. The no-screen form remains for compatibility and integration checks. |
| Schedule | Cursor pages of 20 events, with responses only for those events. Upcoming/past/date views use date indexes; named seasons use the season/date index. Legacy 2026–2027 events remain supported. Calendar counts read at most a 42-day window. |
| Members | Cursor pages of 30. Search runs on a club-scoped full-text index after a 200 ms typing delay. Roles and permitted profile fields are resolved only for the returned page. |
| Feedback | Separate published and draft/private pages of 10, scoped to one member. Existing publish, edit and delete actions remain available. |
| Payments | History pages of 20. A transactionally maintained paid total on each charge keeps balances independent of the loaded page, including simultaneous payments and retry protection. Legacy charge rows compute an indexed per-person fallback until the next payment stores their total. |
| Equipment | Only active loans travel with the current working set. Returns use server cursor pages of 30. Return searches match equipment/borrower IDs and scan bounded chunks of history. Inventory and active-loan views render 30 rows per page. |
| Attendance | Fetch one selected season and one person's response records. Percentages include the complete season. The record list renders 30 rows per page; its season data remains in memory. |
| Notices | History pages of 20. The bell shows up to 20 recent notices and links to the full list. It does not claim a total unread count across all history. |
| Moderation | Reports load only on the moderation screen, in pages of 20. Duplicate reports, recent report limits, blocked names and report-photo authorization use scoped indexes/lookups. |
| Calendar subscriptions | Read the selected person's responses and fetch only events relevant to that subscription. Existing calendar cancellations and stable revisions are preserved. |

New page endpoints clamp requests to 40 rows and limit scanned history to 200 rows per request. Selective filters can produce a short or empty page with a continuation cursor; older matching records remain reachable. Next/Previous navigation replaces the current page instead of accumulating every visited page in the UI. Message history retains its existing virtualized scrolling and Convex pagination.

Routine club actions now load the affected records instead of the club's historical working set. Event actions load one event or its edited series and relevant responses. Payments, feedback, goals, trackers and equipment actions use record/person/item keys. Unchanged club metadata is no longer patched during every save, reducing unrelated subscription updates and write conflicts.

## Rendering and bundles

- Recharts and the design showcase load on demand in the web build. The emoji picker remains a separate chunk.
- Closed event/member creation forms no longer mount on their listing screens.
- Payment, loan, attendance and calendar calculations use keyed maps/sets instead of repeated nested scans.
- Photo requests are cancelled when their message component unmounts. Protected download behavior and URL cleanup are retained.
- Screen changes keep the same authenticated app tree mounted while the next scoped query loads. Authentication changes clear that cached result.

| Measurement | Before | After |
| --- | ---: | ---: |
| Schedule shared context, fixture JSON | 496,148 bytes | 25,879 bytes |
| Web startup JavaScript, uncompressed | 5,669,721 bytes | 4,714,072 bytes |
| Same startup JavaScript, gzip measurement | 1,230,177 bytes | 999,305 bytes |

The schedule shared payload is 94.8% smaller. Its event page is a separate request; this figure is not a measurement of all startup traffic. Web startup JavaScript is 16.9% smaller, or 18.8% after gzip. Gzip sizes are comparisons generated from the artifacts; the local preview does not enable HTTP compression. The deferred chart chunk is 956,783 bytes and the showcase chunk is 10,056 bytes. Native exports still bundle code together, so these startup savings apply to web.

## Verification

`bun run verify:performance` creates a fictional local club with 400 historical events, 2,000 attendance records, 400 feedback entries, and 120 entries in each tested directory/payment/return/report/notice history. It verifies complete cursor traversal, unique ordering, calendar bounds, complete season totals, family permissions, financial totals under concurrent writes and retries, and preservation of unrelated history after a scoped update.

TypeScript, Biome, design boundaries and 58 unit/domain tests pass. All-platform exports pass. The existing local club, messaging, calendar, security and message-readiness suites cover the neighboring workflows. These checks use the isolated local backend and fictional accounts; no real email or push is sent.

## Remaining scale limits

- The conversation inbox still reads the club's conversation membership list and calculates per-thread unread summaries. Before a substantially larger rollout, introduce indexed per-account inbox entries and aggregated unread state. Filtered unread queries can scan more than their returned count.
- Current rosters, account-access settings, inventory and admin summary inputs are still club-sized. Rendering them in pages does not make their data queries paginated. Searchable remote pickers and persisted admin summaries are the next step for thousands of members.
- Attendance summaries retain a full selected season. Extremely dense seasons would benefit from maintained attendance aggregates and separately paged records.
- Calendar export still reconciles the person's full feed, including cancellation records. Account erasure still processes club history in a single transaction. Both need background batches for very large histories.
- Legacy payment rows retain a compatibility fallback. A hosted migration should backfill totals before importing a large ledger.
- Device launch time, scrolling, memory, reconnect and foreground/background behavior need measurements on one iPhone and one Android phone. No browser or simulator was launched for this pass.
