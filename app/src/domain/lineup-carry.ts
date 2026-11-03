import type { ClubEvent, Member, TeamPlan } from "./app-types";
import { clubTimestamp } from "./event-time";
import {
	lineupSlots,
	lineupSnapshot,
	normalizeLineup,
	planWithSnapshot,
	validateLineup,
	writeTeamPlan,
} from "./lineup";
import { defaultPlayerCoaching, type PlayerCoaching } from "./player-coaching";

export type CarryLineupSource = {
	eventId: string;
	partId?: string;
	title: string;
	date: string;
	revision: number;
};
export const compatibleCarrySource = (
	source: ClubEvent,
	target: ClubEvent,
	sourcePartId?: string,
	partId?: string,
): boolean => {
	const sourcePart = source.parts?.find((entry) => entry.id === sourcePartId);
	const targetPart = target.parts?.find((entry) => entry.id === partId);
	return (
		source.id !== target.id &&
		!source.cancelled &&
		!target.cancelled &&
		source.program === target.program &&
		(!sourcePartId || sourcePart !== undefined) &&
		(!partId || targetPart !== undefined) &&
		(sourcePart?.kind ?? source.kind) === (targetPart?.kind ?? target.kind) &&
		!["social", "meeting"].includes(target.kind) &&
		clubTimestamp(
			source.endDate ?? source.date,
			sourcePart?.end ?? source.end,
			source.timeZone,
		) <=
			clubTimestamp(
				target.date,
				targetPart?.start ?? target.start,
				target.timeZone,
			)
	);
};
export const carryForwardLineup = ({
	source,
	sourceEvent,
	targetEvent,
	partId,
	previous,
	attendees,
	profiles,
	members,
	expectedSourceRevision,
	expectedRevision,
}: {
	source: TeamPlan;
	sourceEvent: ClubEvent;
	targetEvent: ClubEvent;
	partId?: string;
	previous?: TeamPlan;
	attendees: Member[];
	profiles: readonly PlayerCoaching[];
	members: readonly Member[];
	expectedSourceRevision: number;
	expectedRevision: number;
}): TeamPlan => {
	if (previous || expectedRevision !== 0)
		throw new Error(
			"This session already has a lineup. Edit it instead of replacing it.",
		);
	if (
		!source.published ||
		source.coachingStale ||
		!compatibleCarrySource(sourceEvent, targetEvent, source.partId, partId)
	)
		throw new Error(
			"Choose an earlier published lineup for the same practice type and program.",
		);
	if ((source.revision ?? 0) !== expectedSourceRevision)
		throw new Error(
			"The source lineup changed. Choose it again before copying.",
		);
	const players = attendees.filter(
		(member) => !member.archived && !member.mergedInto,
	);
	if (players.length < 2)
		throw new Error("At least two current attendees are needed.");
	const included = new Set(players.map((member) => member.id));
	const original = lineupSnapshot(source);
	const retained = {
		black: original.black.filter((id) => included.has(id)),
		white: original.white.filter((id) => included.has(id)),
	};
	const blackBench = original.blackBench.filter((id) => included.has(id));
	const whiteBench = original.whiteBench.filter((id) => included.has(id));
	const previouslyAssigned = new Set([
		...retained.black,
		...retained.white,
		...blackBench,
		...whiteBench,
	]);
	for (const player of players.filter(
		(member) => !previouslyAssigned.has(member.id),
	)) {
		const side =
			retained.black.length + blackBench.length <=
			retained.white.length + whiteBench.length
				? "black"
				: "white";
		retained[side].push(player.id);
	}
	const draft: TeamPlan = {
		eventId: targetEvent.id,
		partId,
		published: false,
		separateYouth: source.separateYouth,
		blackFormation: source.blackFormation,
		whiteFormation: source.whiteFormation,
		black: retained.black,
		white: retained.white,
		blackBench,
		whiteBench,
		rotationSlots: original.rotationSlots?.filter((entry) =>
			included.has(entry.personId),
		),
		attendees: players.map((member) => member.id),
		excludedPersonIds: [],
		referees: source.referees?.filter((referee) =>
			members.some(
				(member) =>
					member.id === referee.personId &&
					!member.archived &&
					!member.mergedInto &&
					member.programs.length > 0,
			),
		),
		assignments: players.map((member) => {
			const profile =
				profiles.find((entry) => entry.personId === member.id) ??
				defaultPlayerCoaching(member);
			return {
				personId: member.id,
				position:
					source.assignments?.find((entry) => entry.personId === member.id)
						?.position ??
					profile.positions.at(0) ??
					"FORWARD",
				ageGroup: profile.ageGroup,
			};
		}),
	};
	const normalized = normalizeLineup(draft);
	const snapshot = lineupSnapshot(normalized);
	const carried = planWithSnapshot(normalized, {
		...snapshot,
		fieldSlots: lineupSlots(normalized, {
			...snapshot,
			fieldSlots: original.fieldSlots,
		}),
	});
	const issue = validateLineup(carried, lineupSnapshot(carried));
	if (issue) throw new Error(issue);
	return writeTeamPlan(undefined, carried, expectedRevision);
};
