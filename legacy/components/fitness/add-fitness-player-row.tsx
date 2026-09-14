"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface AddFitnessPlayerRowProps {
	candidates: Array<Doc<"players">>;
	layout: "desktop" | "mobile";
	onAddPlayer: (playerId: Id<"players">) => void;
}

export const AddFitnessPlayerRow = ({
	candidates,
	layout,
	onAddPlayer,
}: AddFitnessPlayerRowProps): React.JSX.Element => {
	const [isOpen, setIsOpen] = useState(false);
	const [menuPosition, setMenuPosition] = useState<{
		left: number;
		top: number;
		width: number;
	}>();
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLDivElement>(null);

	const filteredCandidates = useMemo(
		(): Array<Doc<"players">> =>
			candidates
				.filter((player) =>
					player.fullName.toLowerCase().includes(query.trim().toLowerCase()),
				)
				.slice(0, 8),
		[candidates, query],
	);

	const handleSelect = (playerId: Id<"players">): void => {
		onAddPlayer(playerId);
		setIsOpen(false);
		setQuery("");
	};

	useEffect(() => {
		if (!isOpen) return;

		const updateMenuPosition = (): void => {
			const rect = inputRef.current?.getBoundingClientRect();
			if (!rect) return;
			setMenuPosition({
				left: rect.left,
				top: rect.bottom + 4,
				width: rect.width,
			});
		};

		updateMenuPosition();
		window.addEventListener("resize", updateMenuPosition);
		window.addEventListener("scroll", updateMenuPosition, true);

		return () => {
			window.removeEventListener("resize", updateMenuPosition);
			window.removeEventListener("scroll", updateMenuPosition, true);
		};
	}, [isOpen]);

	const input = (
		<div ref={inputRef} className="relative">
			<div className="flex h-10 items-center border border-[#cbdbcc] bg-white px-3">
				<Search className="mr-2 h-3.5 w-3.5 text-[#6c866d]" />
				<input
					value={query}
					onBlur={() => {
						window.setTimeout(() => setIsOpen(false), 100);
					}}
					onChange={(event) => {
						setQuery(event.target.value);
						setIsOpen(true);
					}}
					onFocus={() => setIsOpen(true)}
					placeholder={
						candidates.length === 0 ? "All players added" : "Add player..."
					}
					className="w-full bg-transparent text-sm text-[#021e00] outline-none placeholder:text-[#8aab8a]"
					disabled={candidates.length === 0}
				/>
			</div>
		</div>
	);

	const menu =
		isOpen && candidates.length > 0 && menuPosition
			? createPortal(
					<div
						className="fixed z-50 max-h-64 overflow-y-auto border border-[#cbdbcc] bg-white shadow-lg"
						style={{
							left: menuPosition.left,
							top: menuPosition.top,
							width: menuPosition.width,
						}}
					>
						{filteredCandidates.length === 0 ? (
							<div className="px-4 py-2.5 text-sm text-[#6c866d]">
								No players found
							</div>
						) : (
							filteredCandidates.map((player) => (
								<button
									key={player._id}
									type="button"
									onClick={() => handleSelect(player._id)}
									onMouseDown={(event) => event.preventDefault()}
									className="block w-full px-4 py-2.5 text-left text-sm text-[#021e00] hover:bg-[#eef4f1]"
								>
									{player.fullName}
								</button>
							))
						)}
					</div>,
					document.body,
				)
			: null;

	if (layout === "mobile") {
		return (
			<>
				<div className="border-x border-b border-[#cbdbcc] bg-white px-4 py-4">
					<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
						Add Player
					</p>
					<div className="mt-2">{input}</div>
				</div>
				{menu}
			</>
		);
	}

	return (
		<>
			<div className="grid grid-cols-[minmax(136px,1.16fr)_minmax(72px,0.64fr)_minmax(140px,1fr)] items-center gap-4 border-x border-b border-[#cbdbcc] bg-white px-4 py-3">
				<div className="min-w-0">{input}</div>
				<p className="text-xs text-[#8aab8a]">New row</p>
				<div
					className={cn(
						"text-xs text-[#8aab8a]",
						candidates.length === 0 && "opacity-60",
					)}
				>
					Select a player not already in this session
				</div>
			</div>
			{menu}
		</>
	);
};
