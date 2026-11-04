import type { Account } from "./app-types";
export const feedbackAudienceNames = (
	accounts: readonly Pick<Account, "name" | "personId" | "children">[],
	personId: string,
	playerName: string,
): string[] => [
	...new Set([
		playerName,
		...accounts
			.filter(
				(account) =>
					account.personId !== personId && account.children.includes(personId),
			)
			.map((account) => account.name)
			.sort((a, b) => a.localeCompare(b)),
	]),
];
export const feedbackAudienceLabel = (names: readonly string[]): string =>
	names.length < 3
		? names.join(" and ")
		: `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
