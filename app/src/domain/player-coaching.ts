import type { Member, TeamPlan } from "./app-types";

export const positionOptions = [
	{ value: "FORWARD", label: "Forward" },
	{ value: "WING", label: "Wing" },
	{ value: "CENTER", label: "Center" },
	{ value: "FULL_BACK", label: "Full back" },
] as const;
export type Position = (typeof positionOptions)[number]["value"];
export type AgeGroup = "adult" | "youth";
export type PlayerCoaching = {
	personId: string;
	rating: number;
	positions: Position[];
	ageGroup: AgeGroup;
	revision: number;
};
export const positionLabel = (position: Position): string =>
	positionOptions.find((entry) => entry.value === position)?.label ?? position;
export const defaultPlayerCoaching = (member: Member): PlayerCoaching => ({
	personId: member.id,
	rating: member.rating || 50,
	positions: positionOptions
		.filter(
			(entry) =>
				entry.value === member.position.toUpperCase().replaceAll(" ", "_"),
		)
		.map((entry) => entry.value),
	ageGroup: member.programs.includes("youth") ? "youth" : "adult",
	revision: 0,
});
export const validatePlayerCoaching = (value: PlayerCoaching): void => {
	if (!Number.isFinite(value.rating) || value.rating < 1 || value.rating > 100)
		throw new Error("Rating must be between 1 and 100.");
	if (
		value.positions.length > 4 ||
		new Set(value.positions).size !== value.positions.length
	)
		throw new Error("Choose each position once.");
};
export const formatTeams = (plan: TeamPlan, members: Member[]): string => {
	const groups: (AgeGroup | "combined")[] = plan.separateYouth
		? ["adult", "youth"]
		: ["combined"];
	return groups
		.flatMap((group) =>
			(["black", "white"] as const).map((side) => {
				const players = plan[side].filter(
					(id) =>
						group === "combined" ||
						plan.assignments?.find((entry) => entry.personId === id)
							?.ageGroup === group,
				);
				if (!players.length) return "";
				return [
					`${group === "combined" ? "" : group === "adult" ? "Adults · " : "Youth · "}${side === "black" ? "Black" : "White"}`,
					...players.map((id) => {
						const position = plan.assignments?.find(
							(entry) => entry.personId === id,
						)?.position;
						return `${position ? `${positionLabel(position)} · ` : ""}${members.find((entry) => entry.id === id)?.name ?? "Member"}`;
					}),
				].join("\n");
			}),
		)
		.filter(Boolean)
		.join("\n\n");
};
