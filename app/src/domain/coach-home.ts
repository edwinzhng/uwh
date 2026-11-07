import type { ClubEvent, Member, Season } from "./app-types";
import { clubTimestamp } from "./event-time";
import { practiceEvent } from "./event-types";
import {
	ageAtSeasonYearEnd,
	fitnessDivision,
	fitnessDivisions,
} from "./fitness-division";
import type { CoachingGender } from "./player-coaching";
import { defaultSeasonId } from "./seasons";

export type CoachHomeStats = {
	players: number;
	youth: number;
	women: number;
	unknownDivisions: number;
	divisions: { label: string; count: number }[];
	practicesDone: number;
	practicesTotal: number;
};
export const coachHomeStats = (
	members: readonly Member[],
	details: readonly {
		personId: string;
		birthDate?: string;
		gender?: CoachingGender;
	}[],
	events: readonly ClubEvent[],
	season: Season,
	now: number,
	timeZone?: string,
): CoachHomeStats => {
	const players = members.filter(
		(member) =>
			!member.archived && !member.mergedInto && member.programs.length > 0,
	);
	const byPerson = new Map(details.map((detail) => [detail.personId, detail]));
	const divisionOf = (member: Member): string | undefined => {
		const detail = byPerson.get(member.id);
		return fitnessDivision(detail?.birthDate, detail?.gender, season.start);
	};
	const practices = events.filter(
		(event) =>
			!event.cancelled &&
			practiceEvent(event) &&
			event.date >= season.start &&
			event.date <= season.end &&
			(event.seasonId ?? defaultSeasonId) === season.id,
	);
	return {
		players: players.length,
		youth: players.filter((player) => {
			const age = ageAtSeasonYearEnd(
				byPerson.get(player.id)?.birthDate,
				season.start,
			);
			return age !== undefined && age < 19;
		}).length,
		women: players.filter(
			(player) => byPerson.get(player.id)?.gender === "female",
		).length,
		unknownDivisions: players.filter((player) => !divisionOf(player)).length,
		divisions: fitnessDivisions.map((label) => ({
			label,
			count: players.filter((player) => divisionOf(player) === label).length,
		})),
		practicesDone: practices.filter(
			(event) =>
				clubTimestamp(
					event.endDate ?? event.date,
					event.end,
					event.timeZone ?? timeZone,
				) <= now,
		).length,
		practicesTotal: practices.length,
	};
};
