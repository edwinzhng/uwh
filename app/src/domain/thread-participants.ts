import { canRegister } from "./app-rules";
import type { Account, AppData, Conversation } from "./app-types";
import {
	managedConversation,
	programRoomPersonIds,
	reservedRoomId,
} from "./managed-rooms";
import { canonicalMemberAccount } from "./member-merge-identity";
import {
	accountForRecipient,
	activeMessageRecipient,
	recipientDirectory,
	recipientPersonId,
} from "./message-recipients";
import { type ConversationKind, conversationKind } from "./messaging";

export type ThreadParticipantState = {
	members: { id: string; name: string }[];
	candidates: { id: string; name: string }[];
	kind: ConversationKind;
	canAdd: boolean;
};
export const normalizeParticipantIds = (
	recipientIds: readonly string[],
): string[] => {
	const normalized = [...new Set(recipientIds)].slice().sort();
	if (
		!normalized.length ||
		recipientIds.length > 50 ||
		normalized.some((id) => !id || id.length > 200)
	)
		throw new Error("Choose 1–50 people to add.");
	return normalized;
};
export const sameParticipantIds = (
	previous: readonly string[] | undefined,
	next: readonly string[],
): boolean =>
	previous !== undefined && JSON.stringify(previous) === JSON.stringify(next);
export const participantPersonIds = (
	accountIds: readonly string[],
	explicitPersonIds: readonly string[],
	accounts: readonly Pick<Account, "id" | "personId">[],
	knownPersonIds: readonly string[],
): string[] => {
	const known = new Set(knownPersonIds);
	const peopleByAccount = new Map(
		accounts.map((account) => [account.id, account.personId]),
	);
	return [
		...new Set([
			...explicitPersonIds,
			...accountIds.flatMap((id) => {
				const personId = recipientPersonId(id) ?? peopleByAccount.get(id);
				return personId ? [personId] : [];
			}),
		]),
	].filter((id) => known.has(id));
};
export const previewThreadParticipants = (
	data: AppData,
	accounts: Account[],
	actor: Account,
	initialThread: Conversation,
): ThreadParticipantState => {
	const thread = managedConversation(
		initialThread,
		accounts.map((account) => canonicalMemberAccount(account, data.members)),
		data,
	);
	const kind = conversationKind(thread);
	if (!thread.accountIds.includes(actor.id))
		return { members: [], candidates: [], kind, canAdd: false };
	const accountIds =
		kind === "general"
			? accounts.map((account) => account.id)
			: thread.accountIds;
	const event = data.events.find((entry) => entry.id === thread.eventId);
	const included = new Set([
		...(kind === "general" ? data.members.map((person) => person.id) : []),
		...programRoomPersonIds(thread.id, data),
		...(thread.participantPersonIds ?? []),
		...accountIds.flatMap((id) => {
			const personId = recipientPersonId(id);
			const account = accounts.find((entry) => entry.id === id);
			return personId ? [personId] : account ? [account.personId] : [];
		}),
		...(event
			? data.members
					.filter(
						(person) =>
							canRegister(person, event) &&
							(event.program === "all" ||
								person.programs.includes(event.program)),
					)
					.map((person) => person.id)
			: []),
	]);
	const members = [
		...data.members
			.filter((person) => included.has(person.id))
			.map((person) => ({ id: `person:${person.id}`, name: person.name })),
		...accounts
			.filter(
				(account) =>
					accountIds.includes(account.id) &&
					!data.members.some((person) => person.id === account.personId),
			)
			.map((account) => ({ id: account.id, name: account.name })),
	]
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name));
	const canAdd =
		accountIds.includes(actor.id) && (kind === "direct" || kind === "group");
	const candidates = canAdd
		? recipientDirectory(
				accounts,
				data.members,
				actor.id,
				[],
				false,
			).recipients.filter((recipient) => {
				const personId = recipientPersonId(recipient.id);
				const account = personId
					? accountForRecipient(accounts, personId, actor.id)
					: accounts.find((entry) => entry.id === recipient.id);
				return (
					!members.some((member) => member.id === recipient.id) &&
					(!account || !accountIds.includes(account.id))
				);
			})
		: [];
	return { members, candidates, kind, canAdd };
};
export const addPreviewParticipants = (
	data: AppData,
	accounts: Account[],
	actor: Account,
	threadId: string,
	recipientIds: string[],
	groupId: string,
): { data: AppData; threadId: string } => {
	const normalized = normalizeParticipantIds(recipientIds);
	const thread = data.conversations.find((entry) => entry.id === threadId);
	if (!thread) throw new Error("Conversation unavailable.");
	const state = previewThreadParticipants(data, accounts, actor, thread);
	if (
		!state.canAdd ||
		normalized.some(
			(id) => !state.candidates.some((candidate) => candidate.id === id),
		) ||
		normalized.some((id) => !activeMessageRecipient(id, accounts, data.members))
	)
		throw new Error("Choose people who are not already in this conversation.");
	const personIds = normalized.flatMap((id) => {
		const personId = recipientPersonId(id);
		return personId ? [personId] : [];
	});
	const accountIds = [
		...new Set([
			...thread.accountIds,
			...normalized.map((id) => {
				const personId = recipientPersonId(id);
				return personId
					? (accountForRecipient(accounts, personId, actor.id)?.id ?? id)
					: id;
			}),
		]),
	];
	const id = state.kind === "direct" ? groupId : thread.id;
	if (reservedRoomId(id)) throw new Error("Choose a new group identifier.");
	if (
		state.kind === "direct" &&
		data.conversations.some((entry) => entry.id === id)
	)
		throw new Error("Choose a new group.");
	const group: Conversation = {
		...thread,
		id,
		kind: "group",
		title: state.kind === "direct" ? "Group conversation" : thread.title,
		subtitle: "Group conversation",
		accountIds,
		participantPersonIds: participantPersonIds(
			accountIds,
			[...(thread.participantPersonIds ?? []), ...personIds],
			accounts,
			data.members.map((member) => member.id),
		),
	};
	return {
		threadId: id,
		data: {
			...data,
			conversations:
				state.kind === "direct"
					? [...data.conversations, group]
					: data.conversations.map((entry) =>
							entry.id === id ? group : entry,
						),
		},
	};
};
