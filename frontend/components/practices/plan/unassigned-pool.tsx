"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { PlayerCard } from "./player-card";
import type { Player, RosterState } from "./types";

export function UnassignedPool({
	players,
	roster,
	excludedIds,
	onCardClick,
}: {
	players: Player[];
	roster: RosterState;
	excludedIds: Set<string>;
	onCardClick: (p: Player) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: "section-unassigned" });
	const assignedIds = new Set(roster.map((a) => a.playerId));

	const unassignedPlayers = players
		.filter((p) => !assignedIds.has(p._id) && !excludedIds.has(p._id))
		.sort((a, b) => b.rating - a.rating);

	return (
		<div className="flex flex-col h-full bg-[#eef4f1] overflow-hidden">
			{/* Header */}
			<div className="bg-[#8aab8a] px-5 py-3 border-b-2 border-[#021e00] flex justify-between items-baseline shrink-0">
				<h2 className="text-[#021e00] font-bold tracking-tight">Unassigned</h2>
				<span className="text-[#021e00] font-medium text-sm">
					{unassignedPlayers.length}
				</span>
			</div>
			{/* Droppable Area */}
			<div
				ref={setNodeRef}
				className={cn(
					"flex-1 overflow-y-auto p-4 flex flex-wrap gap-2 content-start transition-colors",
					isOver && "bg-[#d3e4d8]",
				)}
			>
				{unassignedPlayers.length === 0 ? (
					<div className="w-full text-center text-[#8aab8a] text-xs py-8 px-4">
						All eligible players assigned
					</div>
				) : (
					unassignedPlayers.map((player) => (
						<PlayerCard
							key={`unassigned-${player._id}`}
							assignment={{ playerId: player._id }}
							player={player}
							onClick={() => onCardClick(player)}
							isAssigned={false}
						/>
					))
				)}
			</div>
		</div>
	);
}
