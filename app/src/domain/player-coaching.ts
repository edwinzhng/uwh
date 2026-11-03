import type { Member, TeamFormation, TeamPlan } from "./app-types";

export const positionOptions = [
	{ value: "FORWARD", label: "Forward" },
	{ value: "WING", label: "Wing" },
	{ value: "CENTER", label: "Center" },
	{ value: "FULL_BACK", label: "Full back" },
] as const;
export type Position = (typeof positionOptions)[number]["value"];
export type AgeGroup = "adult" | "youth";
export const coachingGenderOptions = [
	{ value: "unspecified", label: "Not recorded" },
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
	{ value: "other", label: "Other" },
] as const;
export type CoachingGender = "male" | "female" | "other";
export type PlayerCoaching = {
	scores?: CoachScore[];
	gender?: CoachingGender;
	personId: string;
	rating: number;
	ratingKnown?: boolean;
	positions: Position[];
	ageGroup: AgeGroup;
	revision: number;
};
export type CoachScore = { coachId: string; score: number; revision: number };
export const coachScoreAverage = (
	scores: readonly CoachScore[],
): number | undefined =>
	scores.length
		? Math.round(
				(scores.reduce((total, entry) => total + entry.score, 0) /
					scores.length) *
					10,
			) / 10
		: undefined;
export const validCoachScore = (value: string): boolean =>
	value.trim().length > 0 &&
	Number.isFinite(Number(value)) &&
	Number(value) >= 0 &&
	Number(value) <= 100;
export const positionLabel = (
	position: Position,
	formation?: TeamFormation,
): string =>
	position === "FULL_BACK" && formation !== undefined && formation !== "2-3-1"
		? "Back"
		: (positionOptions.find((entry) => entry.value === position)?.label ??
			position);
export const defaultPlayerCoaching = (member: Member): PlayerCoaching => ({
	personId: member.id,
	rating: member.rating,
	ratingKnown: member.ratingKnown,
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
	if (
		value.gender &&
		!coachingGenderOptions.some((option) => option.value === value.gender)
	)
		throw new Error("Choose a listed gender or leave it unrecorded.");
	if (!Number.isFinite(value.rating) || value.rating < 0 || value.rating > 100)
		throw new Error("Use a rating from 0–100");
	if (value.ratingKnown === false && value.rating !== 0)
		throw new Error("Unknown player ratings must retain their zero sentinel.");
	if (
		value.positions.length > 4 ||
		new Set(value.positions).size !== value.positions.length
	)
		throw new Error("Choose each position once.");
};
export const balancingProfileChanged = (
	left: PlayerCoaching,
	right: PlayerCoaching,
): boolean =>
	left.rating !== right.rating ||
	left.ratingKnown !== right.ratingKnown ||
	left.ageGroup !== right.ageGroup ||
	JSON.stringify(left.positions.slice().sort()) !==
		JSON.stringify(right.positions.slice().sort());

export const playerRatingLabel = (
	profile: Pick<PlayerCoaching, "rating" | "ratingKnown">,
): string =>
	profile.ratingKnown === false ? "Not rated" : String(profile.rating);
export const formatTeams = (plan: TeamPlan, members: Member[]): string => {
	const groups: (AgeGroup | "combined")[] = plan.separateYouth
		? ["adult", "youth"]
		: ["combined"];
	return groups
		.flatMap((group) =>
			(["black", "white"] as const).map((side) => {
				const inGroup = (id: string): boolean =>
					group === "combined" ||
					(plan.assignments?.find((entry) => entry.personId === id)?.ageGroup ??
						"adult") === group;
				const players = plan[side].filter(inGroup);
				const bench = (
					side === "black" ? (plan.blackBench ?? []) : (plan.whiteBench ?? [])
				).filter(inGroup);
				if (!players.length && !bench.length) return "";
				const formation =
					(side === "black" ? plan.blackFormation : plan.whiteFormation) ??
					"2-3-1";
				return [
					`${group === "combined" ? "" : group === "adult" ? "Adults · " : "Youth · "}${side === "black" ? "Black" : "White"}`,
					...players.map((id) => {
						const position = plan.assignments?.find(
							(entry) => entry.personId === id,
						)?.position;
						return `${position ? `${positionLabel(position, formation)} · ` : ""}${members.find((entry) => entry.id === id)?.name ?? "Member"}${plan.captains?.some((entry) => entry.side === side && entry.personId === id) ? " · Captain" : ""}`;
					}),
					...bench.map(
						(id) =>
							`${positionLabel(plan.assignments?.find((entry) => entry.personId === id)?.position ?? "FORWARD", formation)} · ${members.find((entry) => entry.id === id)?.name ?? "Member"}${plan.captains?.some((entry) => entry.side === side && entry.personId === id) ? " · Captain" : ""}`,
					),
					...(plan.referees ?? [])
						.filter((referee) => referee.side === side)
						.map(
							(referee) =>
								`Referee · ${members.find((member) => member.id === referee.personId)?.name ?? "Member"}`,
						),
				].join("\n");
			}),
		)
		.filter(Boolean)
		.join("\n\n");
};
