import type { Account, Conversation, Member } from "./app-types";
import { reservedRoomId } from "./managed-rooms";
import {
	accountForRecipient,
	type RecipientDirectory,
	recipientDirectory,
	recipientPersonId,
} from "./message-recipients";

export type GroupDraft = {
	groupId: string;
	name: string;
	recipientIds: string[];
};
export type GroupCreation = Pick<GroupDraft, "name" | "recipientIds">;
export type GroupPolicy = {
	pausedIds: string[];
	blockedPairs: { userId: string; targetId: string }[];
};
export const groupLimits = {
	recipients: 50,
	name: 80,
	rows: 2000,
	perMinute: 20,
} as const;

export const normalizeGroup = (draft: GroupDraft): GroupDraft => {
	const name = draft.name.trim().replace(/\s+/gu, " ");
	const recipientIds = [...new Set(draft.recipientIds)].slice().sort();
	if (
		!draft.groupId.startsWith("group-") ||
		draft.groupId.length <= "group-".length ||
		draft.groupId.length > 160 ||
		reservedRoomId(draft.groupId)
	)
		throw new Error("Choose a valid new group identifier.");
	if (!name) throw new Error("Add a group name");
	if (name.length > groupLimits.name)
		throw new Error(`Use ${groupLimits.name} characters or fewer`);
	if (
		draft.recipientIds.length > groupLimits.recipients ||
		recipientIds.length < 2 ||
		recipientIds.some((id) => !id || id.length > 200)
	)
		throw new Error(
			`Choose 2–${groupLimits.recipients} different people for a group.`,
		);
	return { groupId: draft.groupId, name, recipientIds };
};

export const sameGroupCreation = (
	first: GroupCreation,
	second: GroupCreation,
): boolean =>
	first.name === second.name &&
	JSON.stringify(first.recipientIds) === JSON.stringify(second.recipientIds);

export const conversationDraftError = (
	recipientIds: string[],
	name: string,
	directory?: RecipientDirectory,
): string | undefined => {
	if (!directory) return "Wait for the member list to load.";
	if (directory.paused)
		return "Your chat access is paused. Contact a club admin.";
	if (
		!recipientIds.length ||
		recipientIds.some(
			(id) => !directory.recipients.some((recipient) => recipient.id === id),
		)
	)
		return "Choose available recipients.";
	if (recipientIds.length > groupLimits.recipients)
		return `Choose up to ${groupLimits.recipients} people.`;
	if (recipientIds.length > 1 && !name.trim()) return "Add a group name";
	if (recipientIds.length > 1 && name.trim().length > groupLimits.name)
		return `Use ${groupLimits.name} characters or fewer`;
	return undefined;
};

export const planGroupConversation = (
	draft: GroupDraft,
	actor: Account,
	accounts: Account[],
	people: Member[],
	policy: GroupPolicy,
): {
	draft: GroupDraft;
	conversation: Conversation;
	pendingPersonIds: string[];
} => {
	const normalized = normalizeGroup(draft);
	if (!accounts.some((account) => account.id === actor.id))
		throw new Error("Club membership unavailable.");
	const blocked = policy.blockedPairs.flatMap((pair) =>
		pair.userId === actor.id
			? [pair.targetId]
			: pair.targetId === actor.id
				? [pair.userId]
				: [],
	);
	const directory = recipientDirectory(
		accounts,
		people,
		actor.id,
		[...blocked, ...policy.pausedIds],
		policy.pausedIds.includes(actor.id),
	);
	const error = conversationDraftError(
		normalized.recipientIds,
		normalized.name,
		directory,
	);
	if (error) throw new Error(error);
	const recipients = normalized.recipientIds.map((id) => {
		const personId = recipientPersonId(id);
		const person = personId
			? people.find(
					(person) =>
						person.id === personId && !person.archived && !person.mergedInto,
				)
			: undefined;
		const account = personId
			? accountForRecipient(accounts, personId, actor.id)
			: accounts.find((account) => account.id === id);
		if ((!person && !account) || account?.id === actor.id)
			throw new Error("Choose other members of this club.");
		return {
			personId: person?.id ?? account?.personId,
			accountId: account?.id,
		};
	});
	const accountIds = [
		...new Set([
			actor.id,
			...recipients.flatMap((recipient) =>
				recipient.accountId ? [recipient.accountId] : [],
			),
		]),
	];
	if (
		policy.pausedIds.some((id) => accountIds.includes(id)) ||
		policy.blockedPairs.some(
			(pair) =>
				accountIds.includes(pair.userId) && accountIds.includes(pair.targetId),
		)
	)
		throw new Error("Messaging is unavailable between selected members.");
	return {
		draft: normalized,
		pendingPersonIds: recipients.flatMap((recipient) =>
			recipient.personId && !recipient.accountId ? [recipient.personId] : [],
		),
		conversation: {
			id: normalized.groupId,
			title: normalized.name,
			subtitle: "Group chat",
			kind: "group",
			accountIds,
			participantPersonIds: [
				...new Set([
					actor.personId,
					...recipients.flatMap((recipient) =>
						recipient.personId ? [recipient.personId] : [],
					),
				]),
			],
		},
	};
};
