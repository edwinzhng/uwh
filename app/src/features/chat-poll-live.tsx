import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { Text } from "../design-system";
import { ChatPollCard } from "./chat-poll-card";

export const ChatPollLive = ({
	pollId,
	threadId,
}: {
	pollId: string;
	threadId: string;
}): ReactElement => {
	const poll = useQuery(api.thread_tools.poll, { pollId, threadId });
	return poll ? (
		<ChatPollCard poll={poll} inline />
	) : (
		<Text variant="small" tone="secondary">
			{poll === undefined ? "Loading poll…" : "Poll unavailable"}
		</Text>
	);
};
