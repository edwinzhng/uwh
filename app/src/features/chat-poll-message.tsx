import type { ReactElement } from "react";
import { useThreadTools } from "../backend/thread-tools-context";
import { useApp } from "../demo/app-state";
import { Text } from "../design-system";
import { ChatPollCard } from "./chat-poll-card";
import { ChatPollLive } from "./chat-poll-live";
import { ChatPollPreview } from "./chat-poll-preview";

export const ChatPollMessage = ({
	pollId,
	threadId,
}: {
	pollId: string;
	threadId: string;
}): ReactElement => {
	const tools = useThreadTools();
	const { source } = useApp();
	if (!tools || tools.loading)
		return (
			<Text variant="small" tone="secondary">
				{tools ? "Loading poll…" : "Poll unavailable"}
			</Text>
		);
	const poll = tools?.polls.find(
		(poll) => poll.id === pollId && poll.threadId === threadId,
	);
	return poll ? (
		<ChatPollCard poll={poll} inline />
	) : source === "convex" ? (
		<ChatPollLive pollId={pollId} threadId={threadId} />
	) : (
		<ChatPollPreview pollId={pollId} threadId={threadId} />
	);
};
