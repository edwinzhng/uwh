import type { ClubEvent, EventResponse, TeamPlan } from "./app-types";
import { publishedEventLineups } from "./event-lineups";
import { lineupSlotLabel } from "./lineup";
import { positionLabel } from "./player-coaching";

export type HomeLineupAssignment = {
	personId: string;
	partId?: string;
	partName?: string;
	team: "Black" | "White";
	position?: string;
	reserve: boolean;
};

export const homeLineupLabel = (assignment: HomeLineupAssignment): string => {
	const position = assignment.position
		?.replaceAll(" · ", " - ")
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
	return `${assignment.team} Team${position ? ` Position: ${position}` : " · Position not set"}${assignment.reserve ? " · Reserve" : ""}`;
};

export const homeLineupAssignments = (
	event: ClubEvent,
	plans: readonly TeamPlan[],
	personId: string,
	response: EventResponse | undefined,
): HomeLineupAssignment[] =>
	publishedEventLineups(event, plans, personId, response).flatMap((plan) => {
		const location = (
			["black", "white", "blackBench", "whiteBench"] as const
		).find((side) => plan[side]?.includes(personId));
		if (!location) return [];
		const black = location.startsWith("black");
		const reserve = location.endsWith("Bench");
		const formation = black ? plan.blackFormation : plan.whiteFormation;
		const slot = plan.fieldSlots?.find((entry) => entry.personId === personId);
		const assignment = plan.assignments?.find(
			(entry) => entry.personId === personId,
		);
		const position =
			!reserve && formation && slot
				? lineupSlotLabel(formation, slot.slot)
				: assignment
					? positionLabel(assignment.position, formation)
					: undefined;
		return [
			{
				personId,
				partId: plan.partId,
				partName: event.parts?.find((part) => part.id === plan.partId)?.title,
				team: black ? "Black" : "White",
				position,
				reserve,
			},
		];
	});
