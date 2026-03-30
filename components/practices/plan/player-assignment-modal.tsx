"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { Position } from "@/components/players/edit-player-modal";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
	type Assignment,
	type Player,
	POSITIONS,
	type Role,
	type TeamColor,
} from "./types";

export function PlayerAssignmentModal({
	player,
	assignment,
	onClose,
	onSave,
	onRemove,
}: {
	player: Player;
	assignment: Assignment;
	onClose: () => void;
	onSave: (updated: Assignment) => void;
	onRemove: (playerId: string) => void;
}) {
	const [team, setTeam] = useState<TeamColor>(assignment.team);
	const [position, setPosition] = useState<Position>(
		(assignment.position as unknown as Position) || "FORWARD",
	);
	const [isCapt, setIsCapt] = useState(assignment.role === "CAPTAIN");
	const [isRef, setIsRef] = useState(assignment.role === "REF");

	const initials = player.fullName
		.split(" ")
		.map((n: string) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
	const displayRole: Role | null = isCapt ? "CAPTAIN" : isRef ? "REF" : null;

	// Auto-save helper — called with the next state each time something changes
	const save = (patch: Partial<Assignment>) => {
		onSave({
			...assignment,
			team,
			position,
			role: isCapt ? "CAPTAIN" : isRef ? "REF" : null,
			...patch,
		});
	};

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
				{/* Header */}
				<div className="px-5 pt-5 pb-4 flex items-start justify-between">
					<div>
						<p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#4a8a40] mb-0.5">
							{team === "BLACK" ? "Black Team" : "White Team"} ·{" "}
							{POSITIONS.find((p) => p.key === position)?.label}
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

				{/* Body */}
				<div className="bg-[#eef4f1] flex flex-col">
					{/* Player row */}
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
								{displayRole && (
									<Badge variant={displayRole === "REF" ? "ref" : "capt"}>
										{displayRole === "CAPTAIN" ? "CAPT" : "REF"}
									</Badge>
								)}
							</div>
						</div>
						<span className="text-[#021e00] font-bold text-xl shrink-0">
							{player.rating}
							<span className="text-[#8aab8a] text-xs font-normal"> /100</span>
						</span>
					</div>

					{/* Team Assignment */}
					<div className="px-5 pb-4">
						<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-2">
							Team Assignment
						</p>
						<div className="flex border border-[#cbdbcc]">
							{(["BLACK", "WHITE"] as TeamColor[]).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										setTeam(t);
										save({ team: t });
									}}
									className={cn(
										"flex-1 py-3 text-sm font-semibold cursor-pointer transition-colors",
										team === t
											? t === "BLACK"
												? "bg-[#021e00] text-[#eef4f1]"
												: "bg-white text-[#021e00] border-l border-[#cbdbcc]"
											: "bg-[#eef4f1] text-[#8aab8a]",
									)}
								>
									{t === "BLACK" ? "Black Team" : "White Team"}
								</button>
							))}
						</div>
					</div>

					{/* Position */}
					<div className="px-5 pb-4">
						<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-2">
							Position
						</p>
						<div className="relative">
							<select
								value={position}
								onChange={(e) => {
									const p = e.target.value as unknown as Position;
									setPosition(p);
									save({ position: p });
								}}
								className="w-full h-12 pl-3 pr-10 border border-[#cbdbcc] bg-white text-[#021e00] text-sm appearance-none cursor-pointer focus:outline-none focus:border-[#298a29]"
							>
								{POSITIONS.map((pos) => (
									<option key={pos.key} value={pos.key}>
										{pos.label}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
								<svg
									aria-hidden="true"
									className="h-4 w-4 text-[#8aab8a]"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path
										d="M4 6l4 4 4-4"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
						</div>
					</div>

					{/* Match Roles */}
					<div className="px-5 pb-5">
						<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-2">
							Match Roles
						</p>
						<div className="border border-[#cbdbcc] bg-white divide-y divide-[#cbdbcc]">
							{[
								{
									role: "CAPTAIN" as Role,
									label: "Team Captain",
									badgeVariant: "capt" as const,
									badgeText: "CAPT",
									isOn: isCapt,
									setOn: (v: boolean) => {
										setIsCapt(v);
										if (v) setIsRef(false);
										save({ role: v ? "CAPTAIN" : null });
									},
								},
								{
									role: "REF" as Role,
									label: "Referee",
									badgeVariant: "ref" as const,
									badgeText: "REF",
									isOn: isRef,
									setOn: (v: boolean) => {
										setIsRef(v);
										if (v) setIsCapt(false);
										save({ role: v ? "REF" : null });
									},
								},
							].map(({ role, label, badgeVariant, badgeText, isOn, setOn }) => (
								<div key={role} className="flex items-center gap-3 px-4 py-3">
									<Badge variant={badgeVariant}>{badgeText}</Badge>
									<span className="flex-1 text-sm text-[#021e00]">{label}</span>
									<Switch
										checked={isOn}
										onCheckedChange={(checked) => setOn(checked)}
									/>
								</div>
							))}
						</div>
					</div>

					{/* Footer — single destructive CTA */}
					<div className="px-5 pb-6 border-t-2 border-[#021e00] pt-4">
						<Button
							variant="destructive"
							size="lg"
							className="w-full"
							onClick={() => {
								onRemove(player._id);
								onClose();
							}}
						>
							Remove from Line-up
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
