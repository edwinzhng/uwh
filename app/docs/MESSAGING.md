- Messages uses a compact inbox with All, DMs, Groups and Channels filters. Program/event rooms remain channels rather than arbitrary group chats. A phone conversation uses the full available height with a small toolbar and fixed composer; pins and polls share one short strip and open their full content in separate dialogs.
- Conversations show the latest message, a one-line preview and unread count. The Messages tab counts conversations with unread messages. Large counts display as `99+`.
- Opening a conversation loads its latest 40 messages. Scrolling toward older history requests another page. A virtualized list keeps rendered rows bounded; the composer stays pinned and a Latest messages button returns to the bottom.
- Read state belongs to the signed-in account, across devices. Switching between self and linked children preserves it. The client marks through the latest message only after that message is visible in the focused, foreground conversation. Reading older history does not automatically mark a new arrival read.
- Own messages, deleted messages and blocked authors do not count as unread. History from before an account joined the club starts as read. Read state is private to the account; this does not expose read receipts to other members.
- Starting a direct conversation reopens the existing conversation. Simultaneous requests from both participants resolve to one ID. Existing conversations retain their IDs and history.
- Replies resolve their original message even when it is outside the loaded pages. Edits, deletion and blocking update the quote. Reactions, protected photos, moderation, dictation and retry-safe sending remain available.
- Message, notice and banner acknowledgement workflows are deliberately removed, not required or deferred. No confirmation prompt, recipient checklist or acknowledgement report belongs in Messages. Club notices retain ordinary dismissal on Home; legal terms acceptance is a separate requirement.

- `messaging.inbox` supplies conversation summaries to one shared provider. `messaging.list` uses the thread index and Convex pagination cursors; the client uses `usePaginatedQuery`. `messaging.message` is a permission-checked single-message lookup. Chat history no longer travels inside `club.current` or unrelated club mutations.

- Message commands share domain validation with the preview reducer. Live sends, edits and reactions operate on the relevant thread/message records instead of loading and rewriting the club working set. A send attaches authorized uploads and queues its notification in the same transaction. Sender rate limits use an author/time index.

- `conversationReads` stores a server-validated read-through timestamp. The mutation accepts a message ID, rechecks thread access and takes the maximum of the previous and requested position. A stale device cannot reset read state or mark a concurrent later message as read. Account and club deletion remove these records.

- Direct conversations use a normalized pair key scoped to the club. The first open also recognizes legacy conversations without a key. Existing duplicate legacy histories are not merged or deleted.

- The preview uses the same UI and account-based read behavior with in-memory demo state. Live reads persist in Convex. The paginated API follows [Convex pagination](https://docs.convex.dev/database/pagination).

- Historical acknowledgement fields/tables are retained only for old-record compatibility, privacy filtering and erasure. Their presence does not authorize a current command, query, notification or user-facing workflow.

- `bun run verify:message-readiness` uses fictional accounts on the isolated local backend. It checks a 350-message history across page boundaries, unique ordering, no duplicate messages, concurrent/legacy direct reuse, per-account unread state, stale read protection, separate sessions, reactive inbox/history updates, reconnect, replies outside the loaded page, edits/deletion, blocked authors and revoked access. It waits one sender rate-limit window after seeding history; the application limit stays enforced.

- The existing photo/reaction suite now reads the scoped messaging API. Security checks verify that account deletion removes read state. Club and calendar regressions confirm that removing messages from the shared working set preserves unrelated workflows. TypeScript, Biome, design boundaries and iOS/Android/web exports also pass.

- Native scrolling, keyboard resizing, large text, screen-reader order and foreground/background read tracking still need interaction testing on an iPhone and Android phone. Backend reconnect checks are not an offline UI acceptance test.

- Message rows are paginated and virtualized. The schedule/member working set is now scoped with separately paged history; see [performance](PERFORMANCE.md). The conversation list itself is still a club-sized query. Inbox counts are capped at 100, but filtered unread queries can still scan a large history dominated by the reader or blocked authors. Before a much larger club rollout, profile representative traffic and introduce indexed inbox membership/aggregated counts as needed. Account erasure also still loads club history in one transaction and needs batched processing for very large histories.

- There is no persistent offline message cache, delivery/read receipts shared with senders, message search or legacy-duplicate merge in this pass. Real push delivery still needs provider configuration and physical-device checks.

- Program channels show a compact next-practice link with time, venue name and live attendance count. The indexed `chat_practice.next` query rechecks canonical program-room membership, skips cancelled and ended practices, and returns no banner for general, direct or custom group chats. The minute refresh retains the current result while the replacement query loads.

- Message bubbles keep avatars beside incoming content, timestamps inside the bubble, photo attachments in a two-column grid, and reaction counts underneath. Quick reactions open beside their message, with a plus button for the searchable full emoji browser. Web uses a collision-aware Base UI popover; native uses an anchored overlay and the existing picker sheet for all emoji. Saves prevent duplicate requests and dismissal while pending; failures retain the picker for retry. Web hover lifts only the glyph with shared motion tokens and respects reduced motion. The interaction reference is [Rare UI](https://www.rareui.com/components/emojireaction).

- `EXPO_PUBLIC_CONVEX_URL=http://127.0.0.1:3210 bun scripts/verify-chat-practice.ts` checks practice selection, live attendance and club isolation using temporary fictional accounts, then deletes them. Browser verification covers phone and desktop picker placement, search, selection and practice navigation. Native bundle compilation does not establish physical-device interaction behavior.

- Group headers show their saved name on one line, without a participant-name subtitle. The diagonal avatar cluster or saved chat picture sits beside it; the information action opens the full member list on demand. Native conversations put that row in their transparent native header, and desktop keeps the chat sidebar.

- The composer’s smiley opens a searchable, virtualized emoji picker. Selection inserts at the current caret without sending, preserving rich formatting and undo. Attachment, poll, dictation and formatting commands remain in the plus menu; active dictation exposes a Stop action. Tapping the embedded input does not draw a focus outline; web keyboard navigation still does. Scrolling away from the bottom shows a centered circular down-arrow with an accessible jump-to-newest label.
