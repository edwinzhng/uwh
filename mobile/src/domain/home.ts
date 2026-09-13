import { Temporal } from "@js-temporal/polyfill";
import { canManagePerson, canRegister } from "./app-rules";
import type { Account, AppData, ClubEvent, Member } from "./app-types";
import { clubDate, clubTimestamp } from "./event-time";

export const householdMembers = (data: AppData, account: Account): Member[] =>
	data.members.filter((member) => canManagePerson(account, member.id));

export const relevantHouseholdEvent = (
	event: ClubEvent,
	people: Member[],
): boolean =>
	people.some(
		(person) =>
			canRegister(person, event) &&
			(event.program === "all" || person.programs.includes(event.program)),
	);

export const homeSchedule = (
	events: ClubEvent[],
	now: number,
	timeZone?: string,
): { events: ClubEvent[]; nextTournament?: ClubEvent; thisWeek: boolean } => {
	const today = Temporal.PlainDate.from(clubDate(now, timeZone));
	const endOfWeek = today.add({ days: 7 - today.dayOfWeek }).toString();
	const upcoming = events
		.filter(
			(event) =>
				!event.cancelled &&
				clubTimestamp(
					event.endDate ?? event.date,
					event.end,
					event.timeZone ?? timeZone,
				) > now,
		)
		.toSorted((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
	const sessions = upcoming.filter((event) => event.kind !== "tournament");
	const week = sessions.filter((event) => event.date <= endOfWeek);
	return {
		events: week.length ? week : sessions.slice(0, 1),
		nextTournament: upcoming.find((event) => event.kind === "tournament"),
		thisWeek: week.length > 0,
	};
};
