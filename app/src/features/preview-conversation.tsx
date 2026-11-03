import { type ReactElement, useMemo, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	type ConversationSummary,
	messagePageSize,
	previewMessageTimestamp,
} from "../domain/messaging";
import { ThreadContent } from "./thread-content";

export const PreviewConversation = ({
	thread,
}: {
	thread: ConversationSummary;
}): ReactElement => {
	const { data } = useApp();
	const [count, setCount] = useState(messagePageSize);

	const messages = useMemo(() => {
		const source = data.messages.filter(
			(message) => message.threadId === thread.id,
		);
		const byId = new Map(source.map((message) => [message.id, message]));
		return source
			.map((message) => ({
				...message,
				createdAt: previewMessageTimestamp(message),
				reply: message.replyToId ? byId.get(message.replyToId) : undefined,
			}))
			.reverse()
			.sort((first, second) => second.createdAt - first.createdAt);
	}, [data.messages, thread.id]);

	return (
		<ThreadContent
			thread={thread}
			messages={messages.slice(0, count)}
			loading={false}
			loadingMore={false}
			canLoadMore={messages.length > count}
			onLoadMore={(): void => setCount((value) => value + messagePageSize)}
		/>
	);
};
