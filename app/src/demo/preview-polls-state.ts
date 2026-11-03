import { atom } from "jotai";
import { canReadThread } from "../domain/app-rules";
import type { Account, AppData, Conversation } from "../domain/app-types";
import {
	normalizePollDraft,
	type PollDraft,
	type PreviewPoll,
	pollMessageId,
	pollMessageTime,
	samePollDraft,
	validatePoll,
	validateVote,
} from "../domain/chat-polls";
import type { GroupPolicy } from "../domain/group-conversation";
import { withManagedRooms } from "../domain/managed-rooms";
import { reduceMessages } from "../domain/message-reducer";
import { conversationKind } from "../domain/messaging";
import {
	previewAccountAtom,
	previewAccountsAtom,
	previewDataAtom,
} from "./app-state";
import { initialPreviewPoll } from "./chat-poll-fixture";
import { previewGroupPolicyAtom } from "./group-conversation-state";

export const previewToolsAtom = atom<{
	polls: PreviewPoll[];
	pins: Record<string, string[]>;
}>({ polls: [initialPreviewPoll], pins: { club: ["m1"] } });
export const previewPollAvailable = (
	data: AppData,
	poll: PreviewPoll,
): boolean =>
	!poll.messageId ||
	data.messages.some(
		(message) =>
			message.id === poll.messageId &&
			message.pollId === poll.id &&
			!message.deleted &&
			message.threadId === poll.threadId,
	);
const requireThread = (
	data: AppData,
	account: Account,
	threadId: string,
	policy: GroupPolicy,
): Conversation => {
	const thread = data.conversations.find((thread) => thread.id === threadId);
	if (!thread || !canReadThread(account, thread))
		throw new Error("Conversation unavailable");
	if (policy.pausedIds.includes(account.id)) throw new Error("Chat paused");
	if (
		["direct", "group"].includes(conversationKind(thread)) &&
		policy.blockedPairs.some(
			(pair) =>
				(pair.userId === account.id &&
					thread.accountIds.includes(pair.targetId)) ||
				(pair.targetId === account.id &&
					thread.accountIds.includes(pair.userId)),
		)
	)
		throw new Error("Messaging unavailable");
	return thread;
};
const requirePoll = (
	data: AppData,
	account: Account,
	polls: PreviewPoll[],
	threadId: string,
	pollId: string,
	policy: GroupPolicy,
): PreviewPoll => {
	requireThread(data, account, threadId, policy);
	const poll = polls.find(
		(poll) => poll.id === pollId && poll.threadId === threadId,
	);
	if (
		!poll ||
		!previewPollAvailable(data, poll) ||
		policy.blockedPairs.some(
			(pair) =>
				(pair.userId === account.id && pair.targetId === poll.createdBy) ||
				(pair.targetId === account.id && pair.userId === poll.createdBy),
		)
	)
		throw new Error("Poll unavailable");
	return poll;
};
export const createPreviewPollAtom = atom(
	undefined,
	(
		get,
		set,
		input: { threadId: string; key: string; draft: PollDraft },
	): void => {
		const account = get(previewAccountAtom);
		const data = withManagedRooms(
			get(previewDataAtom),
			get(previewAccountsAtom),
		);
		const policy = get(previewGroupPolicyAtom);
		requireThread(data, account, input.threadId, policy);
		if (!input.key || input.key.length > 120)
			throw new Error("Invalid request key");
		const state = get(previewToolsAtom);
		const previous = state.polls.find((poll) => poll.id === input.key);
		if (previous) {
			if (
				previous.createdBy !== account.id ||
				previous.threadId !== input.threadId ||
				!samePollDraft(previous, input.draft) ||
				!previewPollAvailable(data, previous)
			)
				throw new Error("Invalid request key");
			return;
		}
		const error = validatePoll(input.draft);
		if (error) throw new Error(error);
		const draft = normalizePollDraft(input.draft);
		const createdAt = Date.now();
		const messageId = pollMessageId(input.key);
		if (data.messages.some((message) => message.id === messageId))
			throw new Error("Invalid request key");
		if (
			data.messages.filter(
				(message) =>
					message.accountId === account.id &&
					(message.createdAt ?? 0) > createdAt - 60000,
			).length >= 30
		)
			throw new Error("Sending too quickly");
		const next = reduceMessages(data, account, {
			type: "send-message",
			id: messageId,
			threadId: input.threadId,
			body: draft.question,
			time: pollMessageTime(createdAt, data.timeZone),
		});
		set(previewDataAtom, {
			...get(previewDataAtom),
			messages: next.messages.map((message) =>
				message.id === messageId
					? { ...message, pollId: input.key, createdAt }
					: message,
			),
		});
		set(previewToolsAtom, {
			...state,
			polls: [
				{
					...draft,
					id: input.key,
					threadId: input.threadId,
					createdBy: account.id,
					author: account.name,
					messageId,
					createdAt,
					votes: {},
				},
				...state.polls,
			],
		});
	},
);
export const votePreviewPollAtom = atom(
	undefined,
	(
		get,
		set,
		input: { threadId: string; pollId: string; choices: number[] },
	): void => {
		const account = get(previewAccountAtom);
		const state = get(previewToolsAtom);
		const data = withManagedRooms(
			get(previewDataAtom),
			get(previewAccountsAtom),
		);
		const poll = requirePoll(
			data,
			account,
			state.polls,
			input.threadId,
			input.pollId,
			get(previewGroupPolicyAtom),
		);
		const error = validateVote(poll, input.choices);
		if (error) throw new Error(error);
		set(previewToolsAtom, {
			...state,
			polls: state.polls.map((poll) =>
				poll.id === input.pollId
					? { ...poll, votes: { ...poll.votes, [account.id]: input.choices } }
					: poll,
			),
		});
	},
);
export const closePreviewPollAtom = atom(
	undefined,
	(get, set, input: { threadId: string; pollId: string }): void => {
		const account = get(previewAccountAtom);
		const state = get(previewToolsAtom);
		const data = withManagedRooms(
			get(previewDataAtom),
			get(previewAccountsAtom),
		);
		const poll = requirePoll(
			data,
			account,
			state.polls,
			input.threadId,
			input.pollId,
			get(previewGroupPolicyAtom),
		);
		if (
			!account.admin &&
			!account.coachPrograms.length &&
			poll.createdBy !== account.id
		)
			throw new Error("Only the author or club staff can close polls");
		if (!poll.closedAt)
			set(previewToolsAtom, {
				...state,
				polls: state.polls.map((poll) =>
					poll.id === input.pollId ? { ...poll, closedAt: Date.now() } : poll,
				),
			});
	},
);
