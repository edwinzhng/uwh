import type { TeamPlan } from "./app-types";
import { type LineupSide, lineupSnapshot, lineupTeamPeople } from "./lineup";

export const lineupVisibleSides = (
	plan: TeamPlan,
	personId?: string,
): LineupSide[] => {
	const sides: LineupSide[] = ["black", "white"];
	if (!personId) return sides;
	const snapshot = lineupSnapshot(plan);
	return sides.filter((side) =>
		lineupTeamPeople(snapshot, side).includes(personId),
	);
};
