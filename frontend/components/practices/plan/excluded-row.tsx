"use client";

import { cn } from "@/lib/utils";
import type { Player } from "./types";

export function ExcludedRow({
	excludedIds,
	players,
	onExcludedClick,
}: {
	excludedIds: Set<string>;
	players: Player[];
	onExcludedClick: (p: Player) => void;
}) {
	const excluded = players.filter((p) => excludedIds.has(p._id));
	if (excluded.length === 0) return null;
	return (
		<div className="flex border-b border-[#021e00]">
			{/* Vertical label */}
			<div className="w-8 shrink-0 flex items-center justify-center bg-[#021e00] border-r border-[#cbdbcc]">
				<span className="text-[8px] font-bold tracking-[0.18em] uppercase text-[#4a8a40] [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
					EXCLUDED
				</span>
			</div>
			{/* Spans both columns */}
			<div className="flex-1 bg-[#eef4f1] p-3 flex flex-wrap gap-2">
				{excluded.map((p) => (
					<button
						type="button"
						key={p._id}
						onClick={() => onExcludedClick(p)}
						className={cn(
							"border border-[#cbdbcc] px-3 py-2 text-xs text-[#8aab8a] line-through cursor-pointer hover:border-[#021e00] hover:text-[#021e00] transition-colors",
						)}
					>
						{p.fullName.split(" ")[0]}{" "}
						{p.fullName
							.split(" ")
							.slice(1)
							.map((n: string) => n[0])
							.join("")}
						. <span className="text-[10px] not-line-through">(excluded)</span>
					</button>
				))}
			</div>
		</div>
	);
}
