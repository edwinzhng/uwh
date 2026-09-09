import { usePaginatedQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { type ConversationSummary, messagePageSize } from "../domain/messaging";
import { ThreadContent } from "./thread-content";

export const LiveConversation = ({
	thread,
}: {
	thread: ConversationSummary;
}): ReactElement => {
	const { results, status, loadMore } = usePaginatedQuery(
		api.messaging.list,
		{ threadId: thread.id },
		{ initialNumItems: messagePageSize },
	);
	return (
		<ThreadContent
			thread={thread}
			messages={results}
			loading={status === "LoadingFirstPage"}
			loadingMore={status === "LoadingMore"}
			canLoadMore={status === "CanLoadMore"}
			onLoadMore={(): void => loadMore(messagePageSize)}
		/>
	);
};
