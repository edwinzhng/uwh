import { canRegister } from "./app-rules";
import type { Account, AppData, Conversation } from "./app-types";
import {
	accountForRecipient,
	recipientDirectory,
	recipientPersonId,
} from "./message-recipients";
import { conversationKind } from "./messaging";

export type ThreadParticipantState = {
	members: { id: string; name: string }[];
	candidates: { id: string; name: string }[];
	kind: "general" | "event" | "direct" | "group";
	canAdd: boolean;
};
export const previewThreadParticipants = (
	data: AppData,
	accounts: Account[],
	actor: Account,
	thread: Conversation,
): ThreadParticipantState => {
	const kind = conversationKind(thread);
	const accountIds =
		kind === "general"
			? accounts.map((account) => account.id)
			: thread.accountIds;
	const event = data.events.find((entry) => entry.id === thread.eventId);
	const included = new Set([
		...(kind === "general" ? data.members.map((person) => person.id) : []),
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
	].toSorted((a, b) => a.name.localeCompare(b.name));
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
	const thread = data.conversations.find((entry) => entry.id === threadId);
	if (!thread) throw new Error("Conversation unavailable.");
	const state = previewThreadParticipants(data, accounts, actor, thread);
	if (
		!state.canAdd ||
		!recipientIds.length ||
		recipientIds.some(
			(id) => !state.candidates.some((candidate) => candidate.id === id),
		)
	)
		throw new Error("Choose people who are not already in this conversation.");
	const personIds = recipientIds.flatMap((id) => {
		const personId = recipientPersonId(id);
		return personId ? [personId] : [];
	});
	const accountIds = [
		...new Set([
			...thread.accountIds,
			...recipientIds.map((id) => {
				const personId = recipientPersonId(id);
				return personId
					? (accountForRecipient(accounts, personId, actor.id)?.id ?? id)
					: id;
			}),
		]),
	];
	const id = state.kind === "direct" ? groupId : thread.id;
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
		participantPersonIds: [
			...new Set([...(thread.participantPersonIds ?? []), ...personIds]),
		],
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
