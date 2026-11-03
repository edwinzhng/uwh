import type { Member } from "./app-types";
import { defaultSeasonId } from "./seasons";

export const registeredMemberCount = (
	members: readonly Member[],
	seasonId: string,
	records: readonly {
		personId: string;
		registration: Member["registration"];
	}[],
): number => {
	const registrations = new Map(
		records.map((record) => [record.personId, record.registration]),
	);
	return members.filter(
		(member) =>
			!member.archived &&
			!member.mergedInto &&
			(registrations.get(member.id) ??
				(seasonId === defaultSeasonId ? member.registration : "missing")) ===
				"approved",
	).length;
};
