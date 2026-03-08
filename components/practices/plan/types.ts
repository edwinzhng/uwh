import type {
	Player as PlayerType,
	Position,
} from "@/components/players/edit-player-modal";
export type Player = PlayerType;

export type GameType = "MAIN" | "YOUTH";
export type TeamColor = "BLACK" | "WHITE";
export type Role = "CAPTAIN" | "REF";

export interface Assignment {
	playerId: string;
	team: TeamColor;
	position: Position;
	role?: Role | null;
}

export type RosterState = Assignment[];

export const POSITIONS: { key: Position; label: string; plural: string }[] = [
	{ key: "FORWARD", label: "Forward", plural: "FORWARDS" },
	{ key: "WING", label: "Wing", plural: "WINGS" },
	{ key: "CENTER", label: "Center", plural: "CENTER" },
	{ key: "FULL_BACK", label: "Full Back", plural: "FULL BACK" },
];

export const POS_ABBR: Record<Position, string> = {
	FORWARD: "F",
	WING: "W",
	CENTER: "C",
	FULL_BACK: "FB",
};
