"use client";

import { useAtom } from "jotai";
import { Mail, User } from "lucide-react";
import type { Player } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { DeletePlayerButton } from "./delete-player-button";
import { EditPlayerButton } from "./edit-player-button";

const POSITIONS = [
	{ value: "FORWARD", label: "Forward" },
	{ value: "WING", label: "Wing" },
	{ value: "CENTER", label: "Center" },
	{ value: "FULL_BACK", label: "Full Back" },
] as const;

interface PlayerCardProps {
	player: Player;
	onEdit: (player: Player) => void;
	onDelete: (player: Player) => void;
}

export function PlayerCard({
	player,
	onEdit,
	onDelete,
}: PlayerCardProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<div
			className={`
				p-4 rounded-xl transition-all duration-200
				${
					isDarkMode
						? "bg-gray-800/20 hover:bg-gray-800/40 border border-gray-700/30"
						: "bg-white/20 hover:bg-white/40 border border-gray-200/30"
				}
				backdrop-blur-sm
			`}
		>
			{/* Player info row */}
			<div className="flex items-start gap-4 mb-4">
				<div
					className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-gray-700/40" : "bg-gray-100"}`}
				>
					<User
						className={`h-4 w-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<p
						className={`font-medium mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						{player.fullName}
					</p>
					<div className="flex items-center gap-2">
						<Mail
							className={`h-3 w-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						/>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							{player.email || player.parentEmail || "Missing"}
							{!player.email && player.parentEmail && (
								<span
									className={`ml-1 text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
								>
									(parent)
								</span>
							)}
						</p>
					</div>
				</div>
			</div>
			
			{/* Tags row */}
			<div className="flex items-center gap-2 flex-wrap mb-4">
				{player.positions.map((position) => (
					<span
						key={position}
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							isDarkMode
								? "bg-blue-900/40 text-blue-300"
								: "bg-blue-100 text-blue-700"
						}`}
					>
						{POSITIONS.find((p) => p.value === position)?.label}
					</span>
				))}
				{player.youth && (
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							isDarkMode
								? "bg-purple-900/40 text-purple-300"
								: "bg-purple-100 text-purple-700"
						}`}
					>
						Youth
					</span>
				)}
				<span
					className={`px-2 py-1 rounded-full text-xs font-medium ${
						isDarkMode
							? "bg-yellow-900/40 text-yellow-300"
							: "bg-yellow-100 text-yellow-700"
					}`}
				>
					⭐ {player.rating}/10
				</span>
			</div>
			
			{/* Action buttons row */}
			<div className="flex items-center gap-2 flex-wrap">
				<EditPlayerButton
					player={player}
					onClick={onEdit}
				/>
				<DeletePlayerButton player={player} onClick={onDelete} />
			</div>
		</div>
	);
}

