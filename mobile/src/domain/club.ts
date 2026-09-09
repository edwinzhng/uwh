import {
	type AgeGroup,
	type Position,
	positionOptions,
} from "./player-coaching";

export type Response = "going" | "unavailable" | "unanswered";
export type Attendance = "unmarked" | "present" | "late" | "absent";
export type Player = {
	id: string;
	name: string;
	position: string;
	positions?: Position[];
	ageGroup?: AgeGroup;
	rating: number;
	response: Response;
	attendance: Attendance;
};
export type AssignedPlayer = Player & {
	assignedPosition: Position;
	ageGroup: AgeGroup;
};
type Teams = { black: AssignedPlayer[]; white: AssignedPlayer[] };
const slots: Record<Position, number> = {
	FORWARD: 2,
	WING: 2,
	CENTER: 1,
	FULL_BACK: 1,
};
const preferences = (player: Player): Position[] => {
	if (player.positions?.length) return player.positions;
	const matched = positionOptions.find(
		(option) =>
			option.value === player.position.toUpperCase().replaceAll(" ", "_"),
	);
	return matched
		? [matched.value]
		: positionOptions.map((option) => option.value);
};
const distribute = (players: Player[]): Teams =>
	players
		.toSorted(
			(a, b) =>
				preferences(a).length - preferences(b).length ||
				b.rating - a.rating ||
				a.id.localeCompare(b.id),
		)
		.reduce<Teams>(
			(teams, player) => {
				const choices = (["black", "white"] as const)
					.filter(
						(side) =>
							teams[side].length <=
							teams[side === "black" ? "white" : "black"].length,
					)
					.flatMap((side) =>
						preferences(player).map((position, preference) => {
							const team = teams[side];
							const other = teams[side === "black" ? "white" : "black"];
							const positionCount = team.filter(
								(entry) => entry.assignedPosition === position,
							).length;
							const otherCount = other.filter(
								(entry) => entry.assignedPosition === position,
							).length;
							const rating = team.reduce((sum, entry) => sum + entry.rating, 0);
							return {
								side,
								position,
								score:
									team.length * 10000 +
									(positionCount - otherCount) * 1000 +
									(positionCount / slots[position]) * 300 +
									rating +
									preference,
							};
						}),
					)
					.toSorted((a, b) => a.score - b.score);
				const choice = choices.at(0);
				if (!choice) return teams;
				teams[choice.side].push({
					...player,
					assignedPosition: choice.position,
					ageGroup: player.ageGroup ?? "adult",
				});
				return teams;
			},
			{ black: [], white: [] },
		);
export const generatePreviewTeams = (
	players: Player[],
	options: { separateYouth?: boolean; excludedPersonIds?: string[] } = {},
): Teams => {
	const eligible = players.filter(
		(player) =>
			player.response === "going" &&
			player.attendance !== "absent" &&
			!options.excludedPersonIds?.includes(player.id),
	);
	if (!options.separateYouth) return distribute(eligible);
	const adults = distribute(
		eligible.filter((player) => player.ageGroup !== "youth"),
	);
	const youth = distribute(
		eligible.filter((player) => player.ageGroup === "youth"),
	);
	return {
		black: [...adults.black, ...youth.black],
		white: [...adults.white, ...youth.white],
	};
};
