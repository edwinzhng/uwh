import type { Account, Member } from "./app-types";

export const householdLimits = { linked: 20, created: 50 } as const;
export type HouseholdOption = {
	id: string;
	name: string;
	self: boolean;
	default: boolean;
	archived: boolean;
};
export type HouseholdInvitation = {
	id: string;
	personId: string;
	name: string;
	origin: "created" | "administrator" | "previous";
};
export type HouseholdState = {
	profiles: HouseholdOption[];
	available: HouseholdInvitation[];
	defaultPersonId: string;
};
export const householdNameError = (name: string): string | undefined =>
	!name.trim() || name.trim().length > 80
		? "Use a name between 1 and 80 characters."
		: undefined;
export const householdDefault = (
	account: Account,
	members: readonly Member[],
): string => {
	const authorized = [account.personId, ...account.children];
	const preferred = members.find(
		(member) =>
			member.id === account.defaultPersonId &&
			authorized.includes(member.id) &&
			!member.archived &&
			!member.mergedInto,
	);
	return preferred?.id ?? account.personId;
};
export const householdProjection = (
	account: Account,
	members: readonly Member[],
	available: HouseholdInvitation[],
): HouseholdState => ({
	defaultPersonId: householdDefault(account, members),
	available,
	profiles: members
		.filter(
			(member) =>
				[account.personId, ...account.children].includes(member.id) &&
				!member.mergedInto,
		)
		.map((member) => ({
			id: member.id,
			name: member.name,
			self: member.id === account.personId,
			archived: Boolean(member.archived),
			default: householdDefault(account, members) === member.id,
		})),
});
