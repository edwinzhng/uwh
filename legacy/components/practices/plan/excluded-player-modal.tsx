"use client";

import { X } from "lucide-react";
import type { Position } from "@/components/players/edit-player-modal";
import { PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Player, POSITIONS } from "./types";

export function ExcludedPlayerModal({
	player,
	onClose,
	onReturnToLineup,
}: {
	player: Player;
	onClose: () => void;
	onReturnToLineup: (p: Player) => void;
}) {
	const posLabel =
		POSITIONS.find((pos) => pos.key === (player.positions[0] ?? "FORWARD"))
			?.label ?? "Player";
	const initials = player.fullName
		.split(" ")
		.map((n: string) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
		// biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ background: "rgba(2,30,0,0.85)" }}
			onClick={onClose}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: modal dialog wrapper */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal dialog wrapper */}
			<div
				className="w-full max-w-[390px] bg-[#021e00] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-5 pt-5 pb-4 flex items-start justify-between">
					<div>
						<p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#4a8a40] mb-0.5">
							Excluded · {posLabel}
						</p>
						<h2 className="text-2xl font-bold text-[#eef4f1]">
							Player Assignment
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-[#4a8a40] hover:text-[#eef4f1] cursor-pointer mt-1"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="bg-[#eef4f1]">
					<div className="mx-5 my-5 flex items-center gap-3 p-4 bg-white border border-[#cbdbcc]">
						<div className="w-11 h-11 bg-[#021e00] text-[#eef4f1] flex items-center justify-center text-sm font-bold shrink-0">
							{initials}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[#021e00] font-bold truncate">
								{player.fullName.split(" ")[0]}{" "}
								{player.fullName
									.split(" ")
									.slice(1)
									.map((n: string) => n[0])
									.join("")}
								.
							</p>
							<div className="flex gap-1 mt-0.5 flex-wrap">
								{player.positions.map((pos) => (
									<PositionBadge
										key={pos}
										position={pos as unknown as Position}
									/>
								))}
							</div>
						</div>
						<span className="text-[#021e00] font-bold text-xl shrink-0">
							{player.rating}
							<span className="text-[#8aab8a] text-xs font-normal"> /100</span>
						</span>
					</div>
					<div className="px-5 pb-6 border-t-2 border-[#021e00] pt-4">
						<Button
							size="lg"
							className="w-full"
							onClick={() => {
								onReturnToLineup(player);
								onClose();
							}}
						>
							Return to Line-up
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
