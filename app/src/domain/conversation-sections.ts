import {
	type ConversationSummary,
	compareConversations,
	conversationCategory,
} from "./messaging";

export type ChatFilter = "all" | "unread" | "group" | "channel";

export const filteredConversations = (
	threads: readonly ConversationSummary[],
	search: string,
	filter: ChatFilter,
): ConversationSummary[] =>
	threads
		.filter(
			(thread) =>
				thread.title.toLowerCase().includes(search.trim().toLowerCase()) &&
				(filter === "all" ||
					(filter === "unread"
						? thread.unread > 0
						: conversationCategory(thread) === filter)),
		)
		.sort(compareConversations);
