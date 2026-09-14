import type { Account, Member } from "./app-types";
export const personRecipientId = (personId: string): string =>
	`person:${personId}`;
export const recipientPersonId = (recipientId: string): string | undefined =>
	recipientId.startsWith("person:") ? recipientId.slice(7) : undefined;
export const accountForRecipient = (
	accounts: Account[],
	personId: string,
	actorId?: string,
): Account | undefined =>
	accounts.find((account) => account.personId === personId) ??
	accounts.find(
		(account) => account.id !== actorId && account.children.includes(personId),
	);
export type RecipientDirectory = {
	recipients: { id: string; name: string; playerNames: string[] }[];
	paused: boolean;
};
export const recipientDirectory = (
	accounts: Account[],
	players: Pick<Member, "id" | "name">[],
	actorId: string,
	unavailableIds: string[],
	paused: boolean,
): RecipientDirectory => ({
	recipients: paused
		? []
		: [
				...players
					.filter((player) => {
						const account = accountForRecipient(accounts, player.id, actorId);
						return (
							!account ||
							(account.id !== actorId && !unavailableIds.includes(account.id))
						);
					})
					.map((player) => ({
						id: personRecipientId(player.id),
						name: player.name,
						playerNames: [],
					})),
				...accounts
					.filter(
						(account) =>
							account.id !== actorId &&
							!unavailableIds.includes(account.id) &&
							!players.some((player) => player.id === account.personId),
					)
					.map((account) => ({
						id: account.id,
						name: account.name,
						playerNames: [],
					})),
			].toSorted((a, b) => a.name.localeCompare(b.name)),
	paused,
});
