import type { ClubEvent, Member } from "./app-types";
export const canRegister = (
	member: Pick<Member, "id" | "programs" | "archived" | "mergedInto">,
	event: ClubEvent,
): boolean =>
	!member.archived &&
	!member.mergedInto &&
	member.programs.length > 0 &&
	(event.eligiblePersonIds
		? event.eligiblePersonIds.includes(member.id)
		: !event.programRsvp ||
			event.program === "all" ||
			member.programs.includes(event.program));
