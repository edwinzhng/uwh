import { canManagePerson } from "./app-rules";
import type { Account, AppData } from "./app-types";
import { type ClubProgram, clubPrograms } from "./programs";

export const accessiblePrograms = (
	data: Pick<AppData, "programs" | "members">,
	account: Account,
): ClubProgram[] => {
	const programIds = new Set([
		...account.coachPrograms,
		...data.members
			.filter(
				(member) =>
					!member.archived &&
					!member.mergedInto &&
					canManagePerson(account, member.id),
			)
			.flatMap((member) => member.programs),
	]);
	return clubPrograms(data).filter(
		(program) =>
			!program.archived && (account.admin || programIds.has(program.id)),
	);
};
