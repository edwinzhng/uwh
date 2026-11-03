import type { AppData, Message } from "../domain/app-types";
import {
	type PreviewPoll,
	pollMessageId,
	pollMessageTime,
} from "../domain/chat-polls";

export const initialPreviewPoll: PreviewPoll = {
	id: "poolside-poll",
	threadId: "club",
	question: "Which skill should we focus on next?",
	options: ["Passing under pressure", "Support positioning", "Puck control"],
	multiple: false,
	createdBy: "casey",
	author: "Casey Morgan",
	messageId: pollMessageId("poolside-poll"),
	createdAt: Date.parse("2026-10-25T15:30:00Z"),
	votes: { casey: [1], taylor: [0] },
};
export const initialPollMessage: Message = {
	id: pollMessageId(initialPreviewPoll.id),
	pollId: initialPreviewPoll.id,
	threadId: initialPreviewPoll.threadId,
	accountId: initialPreviewPoll.createdBy,
	author: initialPreviewPoll.author,
	body: initialPreviewPoll.question,
	createdAt: initialPreviewPoll.createdAt,
	time: pollMessageTime(initialPreviewPoll.createdAt ?? 0),
};
export const withInitialPoll = (data: AppData): AppData => ({
	...data,
	messages: data.messages.some(
		(message) => message.id === initialPollMessage.id,
	)
		? data.messages
		: [...data.messages, initialPollMessage],
});
