"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Player } from "@/components/players/edit-player-modal";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Assignment, Role, TeamColor } from "./types";

export const CARD_H = "h-[64px]";

function CardContent({
	player,
	role,
	team,
}: {
	player: Player;
	role?: Role | null;
	team: TeamColor;
}) {
	const isBlack = team === "BLACK";
	const nameParts = player.fullName.split(" ");
	const first = nameParts[0];
	const lastInitial = `${nameParts
		.slice(1)
		.map((n) => n[0])
		.join("")}.`;

	return (
		<div className="flex flex-col justify-between h-full min-w-0">
			<p
				className={cn(
					"text-xs font-semibold leading-tight truncate",
					isBlack ? "text-[#eef4f1]" : "text-[#021e00]",
				)}
			>
				{first}{" "}
				<span className="text-[#4a8a40] font-normal">{lastInitial}</span>
			</p>
			<div className="flex items-center justify-between gap-1">
				<div className="flex gap-0.5 flex-wrap">
					{player.positions.map((pos) => (
						<PositionBadge key={pos} position={pos} />
					))}
					{role && (
						<Badge variant={role === "REF" ? "ref" : "capt"}>
							{role === "CAPTAIN" ? "CAPT" : "REF"}
						</Badge>
					)}
				</div>
				<span
					className={cn(
						"font-bold text-sm shrink-0",
						isBlack ? "text-[#4a8a40]" : "text-[#021e00]",
					)}
				>
					{player.rating}
				</span>
			</div>
		</div>
	);
}

// ─── Draggable-only assigned card ────────────────────────────────────

export function PlayerCard({
	assignment,
	player,
	onClick,
	isAssigned = true,
}: {
	assignment: Assignment | { playerId: string };
	player: Player;
	onClick: () => void;
	isAssigned?: boolean;
}) {
	const team = (assignment as Assignment).team;
	const role = (assignment as Assignment).role;
	const dndId = isAssigned
		? `card-${team}-${assignment.playerId}`
		: `card-unassigned-${assignment.playerId}`;

	const { attributes, listeners, setNodeRef, isDragging, transform } =
		useDraggable({ id: dndId });
	const isBlack = team === "BLACK";

	const bgClass = !isAssigned
		? "bg-white"
		: isBlack
			? "bg-[#0a2a00]"
			: "bg-white";

	return (
		// biome-ignore lint/a11y/useSemanticElements: dndkit uses div for draggable ref and styling properly
		<div
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
			role="button"
			tabIndex={0}
			style={{
				transform: transform
					? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
					: undefined,
				zIndex: isDragging ? 50 : undefined,
				opacity: isDragging ? 0.75 : 1,
			}}
			className={cn(
				CARD_H,
				"min-w-[120px] max-w-[200px] border-2 border-[#298a29] p-[10px] flex-shrink-0 cursor-grab active:cursor-grabbing select-none hover:border-[#4a8a40]",
				bgClass,
			)}
		>
			<CardContent player={player} role={role} team={team || "WHITE"} />
		</div>
	);
}
