import type { Account, Member } from "./app-types";
import { mergeCollision } from "./core-member-merge";
import type { MemberMergeConflict, MemberMergePair } from "./member-merge";
import { replaceMergedPerson } from "./member-merge";

export const memberIdentityConflicts = (
	accounts: readonly Account[],
	pair: MemberMergePair,
): MemberMergeConflict[] => {
	const self = [
		...new Set(
			accounts
				.filter((account) =>
					[pair.source.id, pair.target.id].includes(account.personId),
				)
				.map((account) => account.id),
		),
	];
	const audience = (personId: string): string[] =>
		[
			...new Set(
				accounts
					.filter(
						(account) =>
							account.personId === personId ||
							account.children.includes(personId),
					)
					.map((account) => account.id),
			),
		].sort();
	const sourceAudience = audience(pair.source.id);
	const targetAudience = audience(pair.target.id);
	return [
		...(self.length > 1
			? [
					mergeCollision(
						"Account identity",
						`${pair.source.name} → ${pair.target.name}`,
						"The two profiles are linked to different self-login accounts.",
						"Resolve the duplicate login identity with the account holders before merging; roles and credentials will not be combined.",
					),
				]
			: []),
		...(sourceAudience.length &&
		targetAudience.length &&
		JSON.stringify(sourceAudience) !== JSON.stringify(targetAudience)
			? [
					mergeCollision(
						"Household access",
						`${pair.source.name} → ${pair.target.name}`,
						"The two profiles have different self-login or guardian audiences.",
						"Review and align all self and guardian account access before merging these private histories.",
					),
				]
			: []),
	];
};
export const mergedAccount = (
	account: Account,
	pair: MemberMergePair,
): Account => {
	const personId =
		account.personId === pair.source.id ? pair.target.id : account.personId;
	return {
		...account,
		defaultPersonId:
			account.defaultPersonId === pair.source.id
				? pair.target.id
				: account.defaultPersonId,
		personId,
		name: account.personId === pair.source.id ? pair.target.name : account.name,
		children: replaceMergedPerson(
			account.children,
			pair.source.id,
			pair.target.id,
		).filter((id) => id !== personId),
	};
};

export const canonicalMemberId = (
	members: readonly Member[],
	id: string,
	visited: readonly string[] = [],
): string => {
	const next = members.find((member) => member.id === id)?.mergedInto;
	return next && !visited.includes(next)
		? canonicalMemberId(members, next, [...visited, id])
		: id;
};
export const canonicalMemberAccount = (
	account: Account,
	members: readonly Member[],
): Account => {
	const personId = canonicalMemberId(members, account.personId);
	return {
		...account,
		defaultPersonId: account.defaultPersonId
			? canonicalMemberId(members, account.defaultPersonId)
			: undefined,
		personId,
		name:
			members.find((member) => member.id === personId)?.name ?? account.name,
		children: [
			...new Set(account.children.map((id) => canonicalMemberId(members, id))),
		].filter((id) => id !== personId),
	};
};
