"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { CARD_H, PlayerCard } from "./player-card";
import type {
	Assignment,
	Player,
	POSITIONS,
	RosterState,
	TeamColor,
} from "./types";

export function PositionSection({
	posConfig,
	roster,
	players,
	team,
	onCardClick,
}: {
	posConfig: (typeof POSITIONS)[number];
	roster: RosterState;
	players: Player[];
	team: TeamColor;
	onCardClick: (a: Assignment, p: Player) => void;
}) {
	const teamAssignments = roster.filter(
		(a) => a.team === team && a.position === posConfig.key,
	);
	const dropId = `section-${team}-${posConfig.key}`;
	const { setNodeRef, isOver } = useDroppable({ id: dropId });
	const isBlack = team === "BLACK";

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex flex-wrap gap-2 content-start w-full h-full p-2 transition-colors",
				isBlack
					? cn("bg-[#021e00]", isOver && "bg-[#0d3200]")
					: cn("bg-white", isOver && "bg-[#edf7ed]"),
			)}
		>
			{teamAssignments.map((a) => {
				const player = players.find((p) => p._id === a.playerId);
				if (!player) return null;
				return (
					<PlayerCard
						key={`${a.team}-${a.playerId}`}
						assignment={a}
						player={player}
						onClick={() => onCardClick(a, player)}
					/>
				);
			})}
			{teamAssignments.length === 0 && (
				<div
					className={cn(
						CARD_H,
						"w-full border-2 border-dashed border-[#298a29] flex items-center justify-center",
						"text-[9px] font-bold tracking-[0.14em] uppercase transition-colors",
						isBlack
							? cn("text-[#298a29]", isOver && "bg-[#0a2a00]")
							: cn("text-[#298a29]", isOver && "bg-[#eef4f1]"),
					)}
				>
					{isOver ? "Drop here" : "No players yet"}
				</div>
			)}
		</div>
	);
}
