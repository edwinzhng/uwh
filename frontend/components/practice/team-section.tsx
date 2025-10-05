/** biome-ignore-all lint/a11y/noStaticElementInteractions: skip */
"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import type { Player } from "@/lib/api";

interface PlayerWithTeam extends Player {
	team: "black" | "white" | null;
	assignedPositions?: string[];
}

interface TeamSectionProps {
	team: "black" | "white";
	players: PlayerWithTeam[];
	isDarkMode: boolean;
	hoveredDropZone: "black" | "white" | null;
	draggedPlayer: PlayerWithTeam | null;
	onDragStart: (e: React.DragEvent, player: PlayerWithTeam) => void;
	onDragEnd: () => void;
	onDragOver: (
		e: React.DragEvent,
		targetTeam: "black" | "white",
		targetPosition?: "FORWARD" | "BACK",
	) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (
		e: React.DragEvent,
		targetTeam: "black" | "white",
		targetPosition?: "FORWARD" | "BACK",
	) => void;
	onAssignPlayerPosition: (
		playerId: number,
		position: "FORWARD" | "WING" | "CENTER" | "FULL_BACK",
	) => void;
	onAssignPlayerToTeam: (
		playerId: number,
		targetTeam: "black" | "white" | null,
	) => void;
	getPositionAbbreviation: (position: string) => string;
}

export function TeamSection({
	team,
	players,
	isDarkMode,
	hoveredDropZone,
	draggedPlayer,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDragLeave,
	onDrop,
	onAssignPlayerPosition,
	onAssignPlayerToTeam,
	getPositionAbbreviation,
}: TeamSectionProps) {
	const [copySuccess, setCopySuccess] = useState(false);
	const oppositeTeam = team === "black" ? "white" : "black";

	const forwardPlayers = players.filter((player) =>
		player.assignedPositions?.includes("FORWARD"),
	);
	const backPlayers = players.filter(
		(player) =>
			player.assignedPositions && !player.assignedPositions.includes("FORWARD"),
	);

	const copyTeamToClipboard = async () => {
		const teamName = team === "black" ? "Black" : "White";
		const positionGroups = {
			FORWARD: forwardPlayers,
			WING: backPlayers.filter((p) => p.assignedPositions?.includes("WING")),
			CENTER: backPlayers.filter((p) =>
				p.assignedPositions?.includes("CENTER"),
			),
			FULL_BACK: backPlayers.filter((p) =>
				p.assignedPositions?.includes("FULL_BACK"),
			),
		};

		let teamText = `${teamName} team:\n`;

		// Add players by position
		Object.entries(positionGroups).forEach(([position, positionPlayers]) => {
			const positionAbbr = getPositionAbbreviation(position);
			positionPlayers.forEach((player) => {
				const firstName = player.fullName.split(" ")[0];
				teamText += `${positionAbbr} - ${firstName}\n`;
			});
		});

		try {
			await navigator.clipboard.writeText(teamText);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (err) {
			console.error("Failed to copy team to clipboard:", err);
		}
	};

	return (
		<section
			aria-label={`${team === "black" ? "Black" : "White"} Team drop zone`}
			className={`
				p-3 rounded-lg border transition-all duration-300 ease-out
				${isDarkMode ? "bg-gray-800/20" : "bg-gray-50/20"}
				${
					hoveredDropZone === team
						? `border-2 border-blue-400 bg-blue-100/10 shadow-2xl shadow-blue-400/30 ring-2 ring-blue-400/20 backdrop-blur-sm`
						: `border border-gray-400`
				}
				${draggedPlayer && hoveredDropZone !== team ? `border-gray-500 bg-gray-100/5` : ""}
			`}
			onDragOver={(e) => onDragOver(e, team)}
			onDragLeave={onDragLeave}
			onDrop={(e) => onDrop(e, team)}
		>
			<div className="flex items-center justify-between mb-3">
				<h4
					className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
				>
					{team === "black" ? "Black" : "White"} Team ({players.length})
				</h4>
				<button
					type="button"
					onClick={copyTeamToClipboard}
					className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
						copySuccess
							? isDarkMode
								? "bg-green-700 text-green-200"
								: "bg-green-200 text-green-800"
							: isDarkMode
								? "bg-gray-700 text-gray-300 hover:bg-gray-600"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
					}`}
				>
					{copySuccess ? <Check className="h-3 w-3" /> : null}
					{copySuccess ? "Copied" : "Copy team"}
				</button>
			</div>
			<div className="space-y-3">
				{/* Forward Section */}
				<section
					aria-label={`${team === "black" ? "Black" : "White"} Team Forward drop zone`}
					className={`
						p-2 rounded-lg border transition-all duration-300 ease-out
						${isDarkMode ? "bg-gray-800/10" : "bg-gray-50/10"}
						${hoveredDropZone === team ? "border-orange-400 bg-orange-100/10" : "border-gray-500"}
					`}
					onDragOver={(e) => onDragOver(e, team, "FORWARD")}
					onDragLeave={onDragLeave}
					onDrop={(e) => onDrop(e, team, "FORWARD")}
				>
					<h5
						className={`text-xs font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Forward ({forwardPlayers.length})
					</h5>
					<div className="space-y-1">
						{forwardPlayers.map((player) => (
							<div
								key={player.id}
								draggable
								onDragStart={(e) => onDragStart(e, player)}
								onDragEnd={onDragEnd}
								className={`
									flex items-center justify-between p-2 rounded-lg border-l-2 border-orange-500 transition-colors w-full
									${isDarkMode ? "bg-gray-800/30" : "bg-gray-100/50"}
								`}
							>
								<div className="flex-1 min-w-0">
									<p
										className={`font-medium text-sm truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}
									>
										{player.fullName}
									</p>
									<p
										className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} truncate`}
									>
										<span className="font-medium text-orange-500">
											{getPositionAbbreviation("FORWARD")}
										</span>
										{" • "}
										{player.positions.map(getPositionAbbreviation).join(", ")} •
										Rating: {player.rating}
									</p>
								</div>
								<div className="flex items-center gap-1 flex-shrink-0">
									{player.youth && (
										<span
											className={`px-1 py-0.5 rounded-full text-xs font-medium ${
												isDarkMode
													? "bg-yellow-900/40 text-yellow-300"
													: "bg-yellow-100 text-yellow-700"
											}`}
										>
											Youth
										</span>
									)}
									{/* Position buttons */}
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onAssignPlayerPosition(player.id, "FORWARD");
										}}
										className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${
											isDarkMode
												? "border-gray-500 text-gray-300 hover:border-gray-400"
												: "border-gray-400 text-gray-600 hover:border-gray-500"
										}`}
									>
										Make Back
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onAssignPlayerToTeam(player.id, oppositeTeam);
										}}
										className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
											oppositeTeam === "white"
												? isDarkMode
													? "bg-gray-300 text-gray-900 hover:bg-gray-200"
													: "bg-gray-200 text-gray-900 hover:bg-gray-100"
												: isDarkMode
													? "bg-gray-900 text-white hover:bg-black"
													: "bg-gray-900 text-white hover:bg-black"
										}`}
									>
										Make {oppositeTeam === "black" ? "Black" : "White"}
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onAssignPlayerToTeam(player.id, null);
										}}
										className={`p-1 rounded transition-colors cursor-pointer ${
											isDarkMode
												? "text-gray-500 hover:text-gray-400"
												: "text-gray-400 hover:text-gray-600"
										}`}
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* Back Section */}
				<section
					aria-label={`${team === "black" ? "Black" : "White"} Team Back drop zone`}
					className={`
						p-2 rounded-lg border transition-all duration-300 ease-out
						${isDarkMode ? "bg-gray-800/10" : "bg-gray-50/10"}
						${hoveredDropZone === team ? "border-blue-400 bg-blue-100/10" : "border-gray-500"}
					`}
					onDragOver={(e) => onDragOver(e, team, "BACK")}
					onDragLeave={onDragLeave}
					onDrop={(e) => onDrop(e, team, "BACK")}
				>
					<h5
						className={`text-xs font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Back ({backPlayers.length})
					</h5>
					<div className="space-y-1">
						{backPlayers
							.sort((a, b) => {
								const positionOrder = { WING: 1, CENTER: 2, FULL_BACK: 3 };
								const aPos = a.assignedPositions?.[0] || "WING";
								const bPos = b.assignedPositions?.[0] || "WING";
								return (
									positionOrder[aPos as keyof typeof positionOrder] -
									positionOrder[bPos as keyof typeof positionOrder]
								);
							})
							.map((player) => (
								<button
									key={player.id}
									type="button"
									draggable
									onDragStart={(e) => onDragStart(e, player)}
									onDragEnd={onDragEnd}
									className={`
										flex items-center justify-between p-2 rounded-lg border-l-2 border-blue-500 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-left
										${isDarkMode ? "bg-gray-800/30 hover:bg-gray-800/50" : "bg-gray-100/50 hover:bg-gray-100/70"}
									`}
								>
									<div className="flex-1 min-w-0">
										<p
											className={`font-medium text-sm truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}
										>
											{player.fullName}
										</p>
										<p
											className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} truncate`}
										>
											<span className="font-medium text-blue-500">
												{player.assignedPositions
													?.map(getPositionAbbreviation)
													.join(", ") || getPositionAbbreviation("WING")}
											</span>
											{" • "}
											{player.positions.map(getPositionAbbreviation).join(", ")}
											{" • Rating: "}
											{player.rating}
										</p>
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										{player.youth && (
											<span
												className={`px-1 py-0.5 rounded-full text-xs font-medium ${
													isDarkMode
														? "bg-yellow-900/40 text-yellow-300"
														: "bg-yellow-100 text-yellow-700"
												}`}
											>
												Youth
											</span>
										)}
										{/* Position buttons */}
										{["WING", "CENTER", "FULL_BACK"].map((position) => (
											<button
												key={position}
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													onAssignPlayerPosition(
														player.id,
														position as "WING" | "CENTER" | "FULL_BACK",
													);
												}}
												className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
													player.assignedPositions?.includes(position)
														? isDarkMode
															? "bg-blue-600 text-blue-100"
															: "bg-blue-500 text-white"
														: isDarkMode
															? "bg-gray-700 text-gray-300 hover:bg-gray-600"
															: "bg-gray-200 text-gray-700 hover:bg-gray-300"
												}`}
											>
												{getPositionAbbreviation(position)}
											</button>
										))}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onAssignPlayerPosition(player.id, "FORWARD");
											}}
											className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${
												isDarkMode
													? "border-gray-500 text-gray-300 hover:border-gray-400"
													: "border-gray-400 text-gray-600 hover:border-gray-500"
											}`}
										>
											Make Forward
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onAssignPlayerToTeam(player.id, oppositeTeam);
											}}
											className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
												oppositeTeam === "white"
													? isDarkMode
														? "bg-gray-300 text-gray-900 hover:bg-gray-200"
														: "bg-gray-200 text-gray-900 hover:bg-gray-100"
													: isDarkMode
														? "bg-gray-900 text-white hover:bg-black"
														: "bg-gray-900 text-white hover:bg-black"
											}`}
										>
											Make {oppositeTeam === "black" ? "Black" : "White"}
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onAssignPlayerToTeam(player.id, null);
											}}
											className={`p-1 rounded transition-colors cursor-pointer ${
												isDarkMode
													? "text-gray-500 hover:text-gray-400"
													: "text-gray-400 hover:text-gray-600"
											}`}
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								</button>
							))}
					</div>
				</section>
			</div>
		</section>
	);
}
