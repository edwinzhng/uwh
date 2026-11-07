import type { ClubEvent, Member, Season } from "./app-types";
import type { CoachingAssignment } from "./coaching-hours";
import { clubTimestamp } from "./event-time";
import { practiceEvent } from "./event-types";
import {
	ageAtSeasonYearEnd,
	fitnessDivision,
	fitnessDivisions,
} from "./fitness-division";
import type { CoachingGender } from "./player-coaching";
import { defaultSeasonId } from "./seasons";

export type CoachHomePlayers = {
	players: number;
	youth: number;
	women: number;
	unknownDivisions: number;
	divisions: { label: string; count: number }[];
};
export const coachHomePlayers = (
	members: readonly Member[],
	details: readonly {
		personId: string;
		birthDate?: string;
		gender?: CoachingGender;
	}[],
	season: Season,
): CoachHomePlayers => {
	const players = members.filter(
		(member) =>
			!member.archived && !member.mergedInto && member.programs.length > 0,
	);
	const byPerson = new Map(details.map((detail) => [detail.personId, detail]));
	const divisionOf = (member: Member): string | undefined => {
		const detail = byPerson.get(member.id);
		return fitnessDivision(detail?.birthDate, detail?.gender, season.start);
	};
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
	};
};
export const coachHomePracticeEnds = (
	events: readonly ClubEvent[],
	season: Season,
	timeZone?: string,
): number[] =>
	events
		.filter(
			(event) =>
				!event.cancelled &&
				practiceEvent(event) &&
				event.date >= season.start &&
				event.date <= season.end &&
				(event.seasonId ?? defaultSeasonId) === season.id,
		)
		.map((event) =>
			clubTimestamp(
				event.endDate ?? event.date,
				event.end,
				event.timeZone ?? timeZone,
			),
		);

export const coachingPracticeEnd = (
	event: ClubEvent,
	assignments: readonly CoachingAssignment[],
	coachId: string,
	timeZone?: string,
): number | undefined => {
	const assigned = assignments.filter((entry) => entry.coachId === coachId);
	if (!assigned.length) return undefined;
	const zone = event.timeZone ?? timeZone;
	if (!event.parts?.length)
		return clubTimestamp(event.endDate ?? event.date, event.end, zone);
	const ends = event.parts
		.filter((part) =>
			assigned.some(
				(entry) => !entry.partIds || entry.partIds.includes(part.id),
			),
		)
		.map((part) => clubTimestamp(event.date, part.end, zone));
	return ends.length ? Math.max(...ends) : undefined;
};
