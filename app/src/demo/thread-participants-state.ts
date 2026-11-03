import { atom } from "jotai";
import { activeMessageRecipient } from "../domain/message-recipients";
import { conversationKind } from "../domain/messaging";
import {
	addPreviewParticipants,
	normalizeParticipantIds,
	sameParticipantIds,
} from "../domain/thread-participants";
import {
	previewAccountAtom,
	previewAccountsAtom,
	previewDataAtom,
} from "./app-state";
import { previewGroupPolicyAtom } from "./group-conversation-state";

const conversionsAtom = atom<Record<string, string[]>>({});
export const addPreviewParticipantsAtom = atom(
	undefined,
	(
		get,
		set,
		input: { threadId: string; recipientIds: string[]; groupId: string },
	): string => {
		const data = get(previewDataAtom);
		const actor = get(previewAccountAtom);
		const accounts = get(previewAccountsAtom);
		const policy = get(previewGroupPolicyAtom);
		const source = data.conversations.find(
			(thread) => thread.id === input.threadId,
		);
		const recipientIds = normalizeParticipantIds(input.recipientIds);
		if (!source?.accountIds.includes(actor.id))
			throw new Error("Conversation unavailable.");
		if (
			recipientIds.some(
				(id) => !activeMessageRecipient(id, accounts, data.members),
			)
		)
			throw new Error("Choose an active member");
		const key = JSON.stringify([actor.id, source.id, input.groupId]);
		const existing = data.conversations.find(
			(thread) => thread.id === input.groupId,
		);
		const replay = conversationKind(source) === "direct" && existing;
		const result = replay
			? sameParticipantIds(get(conversionsAtom)[key], recipientIds) &&
				existing.accountIds.includes(actor.id)
				? { data, threadId: existing.id }
				: undefined
			: addPreviewParticipants(
					data,
					accounts,
					actor,
					source.id,
					recipientIds,
					input.groupId,
				);
		if (!result) throw new Error("That group identifier is already in use.");
		const updated = result.data.conversations.find(
			(thread) => thread.id === result.threadId,
		);
		if (
			!updated ||
			policy.pausedIds.some((id) => updated.accountIds.includes(id)) ||
			policy.blockedPairs.some(
				(pair) =>
					updated.accountIds.includes(pair.userId) &&
					updated.accountIds.includes(pair.targetId),
			)
		)
			throw new Error("Messaging is unavailable between these members.");
		set(previewDataAtom, result.data);
		if (!replay && conversationKind(source) === "direct")
			set(conversionsAtom, { ...get(conversionsAtom), [key]: recipientIds });
		return result.threadId;
	},
);
