import type { AppData, TeamPlan } from "./app-types";
import { type LineupSide, lineupTeamPeople } from "./lineup";
import type { AgeGroup } from "./player-coaching";

export type LineupGroup = AgeGroup | "combined";
type Roster = Pick<AppData, "members" | "playerCoaching">;
const sides: readonly LineupSide[] = ["black", "white"];

export const lineupVisibleSides = (
	plan: TeamPlan,
	personId?: string,
): LineupSide[] =>
	sides.filter(
		(side) =>
			!personId ||
			lineupTeamPeople(plan, side).includes(personId) ||
			plan.referees?.some(
				(referee) => referee.side === side && referee.personId === personId,
			),
	);

export const lineupPlayerGroup = (
	plan: TeamPlan,
	roster: Roster,
	id: string,
): AgeGroup =>
	plan.assignments?.find((entry) => entry.personId === id)?.ageGroup ??
	roster.playerCoaching?.find((entry) => entry.personId === id)?.ageGroup ??
	(roster.members.find((member) => member.id === id)?.programs.includes("youth")
		? "youth"
		: "adult");

export const lineupVisibleGroups = (
	plan: TeamPlan,
	roster: Roster,
	personId?: string,
): LineupGroup[] => {
	const visibleSides = lineupVisibleSides(plan, personId);
	if (!visibleSides.length) return [];
	if (!plan.separateYouth) return ["combined"];
	if (personId) return [lineupPlayerGroup(plan, roster, personId)];
	const groups = new Set(
		[
			...sides.flatMap((side) => lineupTeamPeople(plan, side)),
			...(plan.referees ?? []).map((entry) => entry.personId),
		].map((id) => lineupPlayerGroup(plan, roster, id)),
	);
	const available: AgeGroup[] = ["adult", "youth"];
	return available.filter((group) => groups.has(group));
};
