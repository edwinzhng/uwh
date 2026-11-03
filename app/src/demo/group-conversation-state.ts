import { atom } from "jotai";
import {
	type GroupCreation,
	type GroupDraft,
	type GroupPolicy,
	groupLimits,
	planGroupConversation,
	sameGroupCreation,
} from "../domain/group-conversation";
import {
	previewAccountAtom,
	previewAccountsAtom,
	previewDataAtom,
} from "./app-state";

export const previewGroupPolicyAtom = atom<GroupPolicy>({
	pausedIds: [],
	blockedPairs: [],
});
const previewGroupCreationsAtom = atom<
	Record<string, GroupCreation & { actorId: string; createdAt: number }>
>({});
export const createPreviewGroupAtom = atom(
	undefined,
	(get, set, input: GroupDraft): string => {
		const data = get(previewDataAtom);
		const actor = get(previewAccountAtom);
		const plan = planGroupConversation(
			input,
			actor,
			get(previewAccountsAtom),
			data.members,
			get(previewGroupPolicyAtom),
		);
		const existing = data.conversations.find(
			(thread) => thread.id === plan.draft.groupId,
		);
		const key = `${actor.id}:${plan.draft.groupId}`;
		const previous = get(previewGroupCreationsAtom)[key];
		if (existing) {
			if (
				previous &&
				existing.accountIds.includes(actor.id) &&
				sameGroupCreation(previous, plan.draft)
			)
				return existing.id;
			throw new Error(
				"That group identifier was already used for a different request.",
			);
		}
		const createdAt = Date.now();
		if (
			Object.values(get(previewGroupCreationsAtom)).filter(
				(receipt) =>
					receipt.actorId === actor.id && receipt.createdAt > createdAt - 60000,
			).length >= groupLimits.perMinute
		)
			throw new Error("You’re creating groups too quickly. Try again shortly.");
		set(previewDataAtom, {
			...data,
			conversations: [...data.conversations, plan.conversation],
		});
		set(previewGroupCreationsAtom, {
			...get(previewGroupCreationsAtom),
			[key]: {
				name: plan.draft.name,
				recipientIds: plan.draft.recipientIds,
				actorId: actor.id,
				createdAt,
			},
		});
		return plan.conversation.id;
	},
);
