import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { type ConversationSummary, messagePageSize } from "../domain/messaging";
import { ThreadContent } from "./thread-content";

export const PreviewConversation = ({
	thread,
}: {
	thread: ConversationSummary;
}): ReactElement => {
	const { data } = useApp();
	const [count, setCount] = useState(messagePageSize);
	const messages = data.messages
		.map((message, index) => ({
			...message,
			createdAt: index + 1,
			reply: data.messages.find(
				(entry) =>
					entry.id === message.replyToId && entry.threadId === message.threadId,
			),
		}))
		.filter((message) => message.threadId === thread.id)
		.toReversed();
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
