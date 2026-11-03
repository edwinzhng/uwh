import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { previewGroupPolicyAtom } from "../demo/group-conversation-state";
import {
	previewPollAvailable,
	previewToolsAtom,
} from "../demo/preview-polls-state";
import { Text } from "../design-system";
import { summarizePoll } from "../domain/chat-polls";
import { ChatPollCard } from "./chat-poll-card";

export const ChatPollPreview = ({
	pollId,
	threadId,
}: {
	pollId: string;
	threadId: string;
}): ReactElement => {
	const { data, account } = useApp();
	const state = useAtomValue(previewToolsAtom);
	const policy = useAtomValue(previewGroupPolicyAtom);
	const poll = state.polls.find(
		(poll) => poll.id === pollId && poll.threadId === threadId,
	);
	const blocked =
		poll &&
		policy.blockedPairs.some(
			(pair) =>
				(pair.userId === account.id && pair.targetId === poll.createdBy) ||
				(pair.targetId === account.id && pair.userId === poll.createdBy),
		);
	return poll && !blocked && previewPollAvailable(data, poll) ? (
		<ChatPollCard
			poll={summarizePoll(
				poll,
				account.id,
				account.admin || account.coachPrograms.length > 0,
			)}
			inline
		/>
	) : (
		<Text variant="small" tone="secondary">
			Poll unavailable
		</Text>
	);
};
