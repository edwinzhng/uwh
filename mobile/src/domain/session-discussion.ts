import { canRegister } from "./app-rules";
import type { Account, ClubEvent, Member } from "./app-types";

export const sessionThreadId = (eventId: string): string =>
	`session:${eventId}`;
export const canDiscussSession = (
	account: Account,
	event: ClubEvent,
	people: Member[],
): boolean =>
	account.admin ||
	account.coachPrograms.length > 0 ||
	people.some(
		(person) =>
			[account.personId, ...account.children].includes(person.id) &&
			canRegister(person, event) &&
			(event.program === "all" || person.programs.includes(event.program)),
	);
