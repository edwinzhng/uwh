import { canRegister, eventResponse } from "./app-rules";
import type { Account, AppData, ClubEvent, Member } from "./app-types";
import { addDays } from "./calendar-dates";
import { clubDate, clubTimestamp, signupState } from "./event-time";
import { practiceEvent } from "./event-types";
import type { FitnessState } from "./fitness-model";
import { householdMembers, relevantHouseholdEvent } from "./home";
import type { ConversationSummary } from "./messaging";
import {
	type PersonalFitnessRow,
	personalFitnessRows,
} from "./personal-fitness";

export const homeNextPractice = (
	data: AppData,
	account: Account,
	now: number,
): ClubEvent | undefined => {
	const people = householdMembers(data, account);
	return data.events
		.filter(
			(event) =>
				!event.cancelled &&
				practiceEvent(event) &&
				relevantHouseholdEvent(event, people) &&
				clubTimestamp(
					event.endDate ?? event.date,
					event.end,
					event.timeZone ?? data.timeZone,
				) > now,
		)
		.sort((left, right) =>
			(left.date + left.start).localeCompare(right.date + right.start),
		)
		.at(0);
};

export const homePendingResponse = (
	data: AppData,
	account: Account,
	now: number,
): { event: ClubEvent; people: Member[] } | undefined => {
	const event = homeNextPractice(data, account, now);
	if (
		!event ||
		signupState(event, now) !== "open" ||
		event.date > addDays(clubDate(now, data.timeZone), 7)
	)
		return;
	const people = householdMembers(data, account).filter(
		(person) =>
			canRegister(person, event) &&
			eventResponse(data, event.id, person.id).response === "unanswered",
	);
	return people.length ? { event, people } : undefined;
};

export const homeRecentConversations = (
	threads: readonly ConversationSummary[],
): ConversationSummary[] =>
	threads
		.filter((thread) => thread.latest !== undefined)
		.sort(
			(left, right) =>
				right.updatedAt - left.updatedAt || left.id.localeCompare(right.id),
		)
		.slice(0, 3);

export type HomeFitnessSnapshot = { row: PersonalFitnessRow; seasonId: string };

export const homeFitnessSnapshot = (
	state: FitnessState,
	account: Account,
	person: Member,
	today: string,
): HomeFitnessSnapshot | undefined => {
	const recorded = {
		...state,
		results: state.results.filter((result) => result.date <= today),
	};
	const seasons = [
		...new Set(
			recorded.results
				.filter((result) => result.personId === person.id)
				.map((result) => result.seasonId),
		),
	];
	return seasons
		.flatMap((seasonId) =>
			personalFitnessRows(recorded, account, person, seasonId).map((row) => ({
				row,
				seasonId,
			})),
		)
		.sort(
			(left, right) =>
				(right.row.history.at(0)?.date ?? "").localeCompare(
					left.row.history.at(0)?.date ?? "",
				) || left.row.test.name.localeCompare(right.row.test.name),
		)
		.at(0);
};
