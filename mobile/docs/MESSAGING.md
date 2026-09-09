# Messaging readiness

## Behavior

- Conversations show the latest message, a one-line preview and unread count. The Messages tab counts conversations with unread messages. Large counts display as `99+`.
- Opening a conversation loads its latest 40 messages. Scrolling toward older history requests another page. A virtualized list keeps rendered rows bounded; the composer stays pinned and a Latest messages button returns to the bottom.
- Read state belongs to the signed-in account, across devices. Switching between self and linked children preserves it. The client marks through the latest message only after that message is visible in the focused, foreground conversation. Reading older history does not automatically acknowledge a new arrival.
- Own messages, deleted messages and blocked authors do not count as unread. History from before an account joined the club starts as read. Read state is private to the account; this does not expose read receipts to other members.
- Starting a direct conversation reopens the existing conversation. Simultaneous requests from both participants resolve to one ID. Existing conversations retain their IDs and history.
- Replies resolve their original message even when it is outside the loaded pages. Edits, deletion and blocking update the quote. Reactions, protected photos, moderation, dictation and retry-safe sending remain available.

## Data flow

`messaging.inbox` supplies conversation summaries to one shared provider. `messaging.list` uses the thread index and Convex pagination cursors; the client uses `usePaginatedQuery`. `messaging.message` is a permission-checked single-message lookup. Chat history no longer travels inside `club.current` or unrelated club mutations.

Message commands share domain validation with the preview reducer. Live sends, edits and reactions operate on the relevant thread/message records instead of loading and rewriting the club working set. A send attaches authorized uploads and queues its notification in the same transaction. Sender rate limits use an author/time index.

`conversationReads` stores a server-validated read-through timestamp. The mutation accepts a message ID, rechecks thread access and takes the maximum of the previous and requested position. A stale device cannot reset read state or mark a concurrent later message as read. Account and club deletion remove these records.

Direct conversations use a normalized pair key scoped to the club. The first open also recognizes legacy conversations without a key. Existing duplicate legacy histories are not merged or deleted.

The preview uses the same UI and account-based read behavior with in-memory demo state. Live reads persist in Convex. The paginated API follows [Convex pagination](https://docs.convex.dev/database/pagination).

## Verification

`bun run verify:message-readiness` uses fictional accounts on the isolated local backend. It checks a 350-message history across page boundaries, unique ordering, no duplicate messages, concurrent/legacy direct reuse, per-account unread state, stale read protection, separate sessions, reactive inbox/history updates, reconnect, replies outside the loaded page, edits/deletion, blocked authors and revoked access. It waits one sender rate-limit window after seeding history; the application limit stays enforced.

The existing photo/reaction suite now reads the scoped messaging API. Security checks verify that account deletion removes read state. Club and calendar regressions confirm that removing messages from the shared working set preserves unrelated workflows. TypeScript, Biome, design boundaries and iOS/Android/web exports also pass.

Native scrolling, keyboard resizing, large text, screen-reader order and foreground/background read tracking still need interaction testing on an iPhone and Android phone. Backend reconnect checks are not an offline UI acceptance test.

## Remaining scale work

Message rows are paginated and virtualized. The schedule/member working set is now scoped with separately paged history; see [performance](PERFORMANCE.md). The conversation list itself is still a club-sized query. Inbox counts are capped at 100, but filtered unread queries can still scan a large history dominated by the reader or blocked authors. Before a much larger club rollout, profile representative traffic and introduce indexed inbox membership/aggregated counts as needed. Account erasure also still loads club history in one transaction and needs batched processing for very large histories.

There is no persistent offline message cache, delivery/read receipts shared with senders, message search or legacy-duplicate merge in this pass. Real push delivery still needs provider configuration and physical-device checks.
