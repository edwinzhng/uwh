/** biome-ignore-all lint/a11y/useSemanticElements: skip */
"use client";

import { useAtom } from "jotai";
import { Baby, Loader2, Users, Users2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	apiClient,
	type Player,
	type Position,
	type SportEasyEventAttendee,
} from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../shared/button";
import { Modal } from "../shared/modal";
import { TeamSection } from "./team-section";

interface PlayerWithTeam extends Player {
	team: "black" | "white" | null;
	assignedPositions?: string[];
}

interface Game {
	id: string;
	name: string;
	players: PlayerWithTeam[];
	isYouthGame: boolean;
}

interface MakeTeamsModalProps {
	isOpen: boolean;
	onClose: () => void;
	practiceId?: number;
}

export function MakeTeamsModal({
	isOpen,
	onClose,
	practiceId,
}: MakeTeamsModalProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [isLoading, setIsLoading] = useState(false);
	const [presentPlayers, setPresentPlayers] = useState<Player[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [games, setGames] = useState<Game[]>([
		{ id: "main", name: "Main Game", players: [], isYouthGame: false },
	]);
	const [activeGameId, setActiveGameId] = useState<string>("main");
	const [hasSeparateYouthGame, setHasSeparateYouthGame] = useState(false);
	const [draggedPlayer, setDraggedPlayer] = useState<PlayerWithTeam | null>(null);
	const [hoveredDropZone, setHoveredDropZone] = useState<"black" | "white" | null>(null);

	// Helper functions
	const youthPlayers = presentPlayers.filter((player) => player.youth);
	const adultPlayers = presentPlayers.filter((player) => !player.youth);

	const getPositionAbbreviation = (position: string) => {
		const abbreviations: { [key: string]: string } = {
			FORWARD: "F",
			WING: "W", 
			CENTER: "C",
			FULL_BACK: "FB"
		};
		return abbreviations[position] || position;
	};

	const handleDragStart = (e: React.DragEvent, player: PlayerWithTeam) => {
		setDraggedPlayer(player);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragOver = (e: React.DragEvent, targetTeam: "black" | "white", _targetPosition?: "FORWARD" | "BACK") => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setHoveredDropZone(targetTeam);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setHoveredDropZone(null);
	};

	const handleDrop = (e: React.DragEvent, targetTeam: "black" | "white", targetPosition?: "FORWARD" | "BACK") => {
		e.preventDefault();
		if (draggedPlayer) {
			assignPlayerToTeam(draggedPlayer.id, activeGameId, targetTeam);
			if (targetPosition) {
				movePlayerToPosition(draggedPlayer.id, activeGameId, targetPosition);
			}
			setDraggedPlayer(null);
		}
		setHoveredDropZone(null);
	};

	const handleDragEnd = () => {
		setDraggedPlayer(null);
		setHoveredDropZone(null);
	};

	const updateGames = (newGames: Game[]) => {
		setGames(newGames);
		// If active game no longer exists, switch to first game
		if (!newGames.find((game) => game.id === activeGameId)) {
			setActiveGameId(newGames[0]?.id || "main");
		}
	};

	const toggleYouthGame = (enabled: boolean) => {
		setHasSeparateYouthGame(enabled);
		if (enabled) {
			// Add youth game
			const adultPlayersWithTeams: PlayerWithTeam[] = adultPlayers.map(
				(player) => ({ ...player, team: null }),
			);
			const youthPlayersWithTeams: PlayerWithTeam[] = youthPlayers.map(
				(player) => ({ ...player, team: null }),
			);
			const newGames = [
				{
					id: "main",
					name: "Main Game",
					players: adultPlayersWithTeams,
					isYouthGame: false,
				},
				{
					id: "youth",
					name: "Youth Game",
					players: youthPlayersWithTeams,
					isYouthGame: true,
				},
			];
			updateGames(newGames);
		} else {
			// Remove youth game, put all players in main game
			const allPlayersWithTeams: PlayerWithTeam[] = presentPlayers.map(
				(player) => ({ ...player, team: null }),
			);
			const newGames = [
				{
					id: "main",
					name: "Main Game",
					players: allPlayersWithTeams,
					isYouthGame: false,
				},
			];
			updateGames(newGames);
		}
	};

	const movePlayerToGame = (playerId: number, targetGameId: string) => {
		const newGames = games.map((game) => {
			if (game.id === targetGameId) {
				// Add player to target game
				const player = presentPlayers.find((p) => p.id === playerId);
				if (player && !game.players.find((p) => p.id === playerId)) {
					const playerWithTeam: PlayerWithTeam = { ...player, team: null };
					return { ...game, players: [...game.players, playerWithTeam] };
				}
			} else {
				// Remove player from other games
				return {
					...game,
					players: game.players.filter((p) => p.id !== playerId),
				};
			}
			return game;
		});
		updateGames(newGames);
	};

	const assignPlayerToTeam = (
		playerId: number,
		gameId: string,
		team: "black" | "white" | null,
	) => {
		const newGames = games.map((game) => {
			if (game.id === gameId) {
				return {
					...game,
					players: game.players.map((player) =>
						player.id === playerId ? { ...player, team } : player,
					),
				};
			}
			return game;
		});
		updateGames(newGames);
	};

	const assignPlayerPosition = (
		playerId: number,
		gameId: string,
		position: "FORWARD" | "WING" | "CENTER" | "FULL_BACK",
	) => {
		const newGames = games.map((game) => {
			if (game.id === gameId) {
				return {
					...game,
					players: game.players.map((player) => {
						if (player.id === playerId) {
							const currentPositions = player.assignedPositions || [];
							
							if (position === "FORWARD") {
								// If assigning forward, clear all back positions
								return { ...player, assignedPositions: ["FORWARD"] };
							} else {
								// For back positions, toggle the position
								if (currentPositions.includes(position)) {
									// Only remove if there are other positions
									const newPositions = currentPositions.filter(p => p !== position);
									if (newPositions.length > 0) {
										return { ...player, assignedPositions: newPositions };
									}
									// If this would remove the last position, don't remove it
									return player;
								} else {
									// Add the position (remove forward if present)
									const newPositions = currentPositions.filter(p => p !== "FORWARD");
									return { ...player, assignedPositions: [...newPositions, position] };
								}
							}
						}
						return player;
					}),
				};
			}
			return game;
		});
		updateGames(newGames);
	};

	const movePlayerToPosition = (playerId: number, gameId: string, targetPosition: "FORWARD" | "BACK") => {
		const newGames = games.map((game) => {
			if (game.id === gameId) {
				return {
					...game,
					players: game.players.map((player) => {
						if (player.id === playerId) {
							if (targetPosition === "FORWARD") {
								return { ...player, assignedPositions: ["FORWARD"] };
							} else {
								// For BACK, assign to first available back position
								const availablePositions = player.positions.filter(pos => 
									pos === "WING" || pos === "CENTER" || pos === "FULL_BACK"
								);
								return { 
									...player, 
									assignedPositions: availablePositions.length > 0 ? [availablePositions[0]] : ["WING"] 
								};
							}
						}
						return player;
					}),
				};
			}
			return game;
		});
		updateGames(newGames);
	};

	const assignPositionsToTeam = (teamPlayers: PlayerWithTeam[]): PlayerWithTeam[] => {
		// Position requirements: 2F, 2W, 1C, 1FB, then round robin through the rest
		const positionRequirements = {
			FORWARD: 2,
			WING: 2,
			CENTER: 1,
			FULL_BACK: 1,
		};

		// Sort players by preference: single position players first, then by rating
		const sortedPlayers = [...teamPlayers].sort((a, b) => {
			// Prefer players with only one position
			if (a.positions.length !== b.positions.length) {
				return a.positions.length - b.positions.length;
			}
			// Then by rating (higher first)
			return b.rating - a.rating;
		});

		const assignedPlayers: PlayerWithTeam[] = [];
		const positionCounts = { FORWARD: 0, WING: 0, CENTER: 0, FULL_BACK: 0 };

		// First pass: assign players who can only play one position
		for (const player of sortedPlayers) {
			if (player.positions.length === 1) {
				const position = player.positions[0];
				if (positionCounts[position as keyof typeof positionCounts] < positionRequirements[position as keyof typeof positionRequirements]) {
					assignedPlayers.push({ ...player, assignedPositions: [position] });
					positionCounts[position as keyof typeof positionCounts]++;
				}
			}
		}

		// Second pass: assign remaining players to fill required positions
		for (const player of sortedPlayers) {
			if (player.positions.length > 1 && !assignedPlayers.find(p => p.id === player.id)) {
				// Find the first available required position this player can play
				for (const position of player.positions) {
					if (positionCounts[position as keyof typeof positionCounts] < positionRequirements[position as keyof typeof positionRequirements]) {
						assignedPlayers.push({ ...player, assignedPositions: [position] });
						positionCounts[position as keyof typeof positionCounts]++;
						break;
					}
				}
			}
		}

		// Third pass: round robin through remaining players for any remaining slots
		const unassignedPlayers = sortedPlayers.filter(player => !assignedPlayers.find(p => p.id === player.id));
		const roundRobinPositions = ["FORWARD", "WING", "CENTER", "FULL_BACK"];
		let positionIndex = 0;

		for (const player of unassignedPlayers) {
			// Find a position this player can play, starting from current round robin position
			let assigned = false;
			for (let i = 0; i < roundRobinPositions.length && !assigned; i++) {
				const position = roundRobinPositions[(positionIndex + i) % roundRobinPositions.length];
				if (player.positions.includes(position as Position)) {
					assignedPlayers.push({ ...player, assignedPositions: [position] });
					positionCounts[position as keyof typeof positionCounts]++;
					positionIndex = (positionIndex + i + 1) % roundRobinPositions.length;
					assigned = true;
				}
			}
			
			// If no position found, assign to first available position
			if (!assigned) {
				for (const position of player.positions) {
					assignedPlayers.push({ ...player, assignedPositions: [position] });
					positionCounts[position as keyof typeof positionCounts]++;
					break;
				}
			}
		}

		return assignedPlayers;
	};

	const autoGenerateTeams = (gameId: string) => {
		const game = games.find((g) => g.id === gameId);
		if (!game || game.players.length === 0) return;

		const players = [...game.players];

		// Sort players by rating (descending) for better balance
		players.sort((a, b) => b.rating - a.rating);

		// Assign teams alternating by player order
		const blackTeam: PlayerWithTeam[] = [];
		const whiteTeam: PlayerWithTeam[] = [];

		players.forEach((player, index) => {
			const playerWithTeam: PlayerWithTeam = { ...player, team: null };
			if (index % 2 === 0) {
				playerWithTeam.team = "black";
				blackTeam.push(playerWithTeam);
			} else {
				playerWithTeam.team = "white";
				whiteTeam.push(playerWithTeam);
			}
		});

		// Balance teams by rating if needed
		const blackRating = blackTeam.reduce((sum, p) => sum + p.rating, 0);
		const whiteRating = whiteTeam.reduce((sum, p) => sum + p.rating, 0);

		// If rating difference is significant, swap highest rated players
		if (Math.abs(blackRating - whiteRating) > 2) {
			const blackHighest = blackTeam.reduce((max, p) =>
				p.rating > max.rating ? p : max,
			);
			const whiteHighest = whiteTeam.reduce((max, p) =>
				p.rating > max.rating ? p : max,
			);

			// Swap teams for these players
			blackHighest.team = "white";
			whiteHighest.team = "black";
		}

		// Assign positions to each team
		const blackTeamWithPositions = assignPositionsToTeam(blackTeam);
		const whiteTeamWithPositions = assignPositionsToTeam(whiteTeam);

		// Update the game with assigned teams and positions (replace all players)
		const newGames = games.map((g) => {
			if (g.id === gameId) {
				return {
					...g,
					players: [...blackTeamWithPositions, ...whiteTeamWithPositions],
				};
			}
			return g;
		});
		updateGames(newGames);
	};

	const fetchEventAttendees = async () => {
		if (!practiceId) {
			setError("No practice ID provided");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Fetch event attendees from SportEasy using practice ID
			const eventResponse =
				await apiClient.getSportEasyEventAttendees(practiceId);

			// Fetch all players from our database
			const allPlayers = await apiClient.getPlayers();

			// Find present players by matching SportEasy IDs
			const presentSportEasyIds = new Set<number>();
			eventResponse.attendees.forEach((attendee: SportEasyEventAttendee) => {
				if (attendee.attendance_status === "present") {
					attendee.results.forEach((result) => {
						presentSportEasyIds.add(result.profile.id);
					});
				}
			});

			const present = allPlayers.filter(
				(player) =>
					player.sporteasyId && presentSportEasyIds.has(player.sporteasyId),
			);

			setPresentPlayers(present);

			// Check if we should default to separate youth game (>= 6 youth players)
			const youthCount = present.filter(player => player.youth).length;
			const shouldSeparateYouth = youthCount >= 6;
			setHasSeparateYouthGame(shouldSeparateYouth);

			// Initialize games based on youth count
			const playersWithTeams: PlayerWithTeam[] = present.map((player) => ({
				...player,
				team: null,
			}));

			let initialGames: Game[];
			if (shouldSeparateYouth) {
				const adultPlayersWithTeams = playersWithTeams.filter(player => !player.youth);
				const youthPlayersWithTeams = playersWithTeams.filter(player => player.youth);
				initialGames = [
					{
						id: "main",
						name: "Main Game",
						players: adultPlayersWithTeams,
						isYouthGame: false,
					},
					{
						id: "youth",
						name: "Youth Game",
						players: youthPlayersWithTeams,
						isYouthGame: true,
					},
				];
			} else {
				initialGames = [
					{
						id: "main",
						name: "Main Game",
						players: playersWithTeams,
						isYouthGame: false,
					},
				];
			}
			setGames(initialGames);
		} catch (err) {
			console.error("Failed to fetch event attendees:", err);
			setError("Failed to fetch event attendees");
		} finally {
			setIsLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: first fetch
	useEffect(() => {
		if (isOpen && practiceId) {
			fetchEventAttendees();
		}
	}, [isOpen, practiceId]);

	const handleClose = () => {
		setPresentPlayers([]);
		setError(null);
		setGames([
			{ id: "main", name: "Main Game", players: [], isYouthGame: false },
		]);
		setActiveGameId("main");
		setHasSeparateYouthGame(false);
		onClose();
	};

	const activeGame = games.find((game) => game.id === activeGameId);
	const unassignedPlayers = presentPlayers.filter(
		(player) =>
			!games.some((game) => game.players.find((p) => p.id === player.id)),
	);

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Make Teams" fullScreen>
			<div className="h-full flex flex-col">
				{isLoading ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
							<p
								className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
							>
								Loading event attendees...
							</p>
						</div>
					</div>
				) : error ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<Users
								className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-red-400" : "text-red-500"}`}
							/>
							<p
								className={`text-lg font-medium ${isDarkMode ? "text-red-400" : "text-red-600"}`}
							>
								{error}
							</p>
							<Button
								onClick={fetchEventAttendees}
								className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
							>
								Try Again
							</Button>
						</div>
					</div>
				) : presentPlayers.length === 0 ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
				<Users
					className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
				/>
				<p
					className={`text-lg font-thin ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
				>
								No players marked as present
							</p>
							<p
								className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
							>
								Players need to be marked as "present" in SportEasy to appear
								here
							</p>
						</div>
					</div>
				) : (
					<>
						{/* Stats Header */}
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-gray-200/20 gap-3">
							<div className="flex items-center gap-4 sm:gap-6">
								<div className="flex items-center gap-2">
									<Users
										className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
									/>
									<span
										className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
									>
										Adults: {adultPlayers.length}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Baby
										className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
									/>
									<span
										className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
									>
										Youth: {youthPlayers.length}
									</span>
								</div>
							</div>

							{/* Youth Game Toggle */}
							{youthPlayers.length > 0 && (
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={hasSeparateYouthGame}
										onChange={(e) => toggleYouthGame(e.target.checked)}
										className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
									/>
									<span
										className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
									>
										Separate Youth Game
									</span>
								</label>
							)}
						</div>

						{/* Game Tabs */}
						{games.length > 1 && (
							<div className="flex border-b border-gray-200/20 overflow-x-auto">
								{games.map((game) => (
									<button
										type="button"
										key={game.id}
										onClick={() => setActiveGameId(game.id)}
										className={`
											px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0
											${
												activeGameId === game.id
													? isDarkMode
														? "border-blue-500 text-blue-400"
														: "border-blue-600 text-blue-600"
													: isDarkMode
														? "border-transparent text-gray-400 hover:text-gray-300"
														: "border-transparent text-gray-500 hover:text-gray-700"
											}
										`}
									>
										{game.name} ({game.players.length})
									</button>
								))}
							</div>
						)}

						{/* Main Content */}
						<div className="flex-1 flex overflow-hidden">
							{/* Active Game Players */}
							<div className="w-full p-3 sm:p-4">
								<div className="flex items-center justify-between mb-3 sm:mb-4">
									<h3
										className={`text-base sm:text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
									>
										{activeGame?.name} ({activeGame?.players.length || 0})
									</h3>
									{activeGame && activeGame.players.length > 0 && (
										<Button
											onClick={() => autoGenerateTeams(activeGameId)}
											className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 bg-green-600 hover:bg-green-700 text-white"
										>
											Auto Generate Teams
										</Button>
									)}
								</div>

								{/* Team Assignment UI */}
								<div className="space-y-4">
									{/* Unassigned Players */}
									{unassignedPlayers.length > 0 && (
										<div>
											<h4
												className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
											>
												Available Players ({unassignedPlayers.length})
											</h4>
											<div className="space-y-1 max-h-[40vh] overflow-y-auto">
												{unassignedPlayers.map((player) => (
													<button
														type="button"
														key={player.id}
														className={`
															flex items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer transition-colors touch-manipulation w-full text-left
															${isDarkMode ? "bg-gray-800/20 border border-gray-700/30 hover:bg-gray-800/40" : "bg-white/20 border border-gray-200/30 hover:bg-white/40"}
														`}
														onClick={() => movePlayerToGame(player.id, activeGameId)}
													>
														<div className="flex-1 min-w-0">
															<p
																className={`font-medium text-sm sm:text-base truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}
															>
																{player.fullName}
															</p>
															<p
																className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"} truncate`}
															>
																{player.positions.map(getPositionAbbreviation).join(", ")} • Rating:{" "}
																{player.rating}
															</p>
														</div>
														<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
															{player.youth && (
																<span
																	className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
																		isDarkMode
																			? "bg-yellow-900/40 text-yellow-300"
																			: "bg-yellow-100 text-yellow-700"
																	}`}
																>
																	Youth
																</span>
															)}
															<Users2
																className={`h-3 w-3 sm:h-4 sm:w-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
															/>
														</div>
													</button>
												))}
											</div>
										</div>
									)}
									{/* Unassigned Players in Game */}
									{activeGame && activeGame.players.filter(p => !p.team).length > 0 && (
										<div>
											<h4
												className={`text-sm font-medium mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
											>
												Unassigned Players ({activeGame.players.filter(p => !p.team).length})
											</h4>
											<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
												{activeGame.players
													.filter(player => !player.team)
													.map((player) => (
													<div
														key={player.id}
														role="button"
														tabIndex={0}
														draggable
														onDragStart={(e) => handleDragStart(e, player)}
														onDragEnd={handleDragEnd}
														onKeyDown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault();
																movePlayerToGame(player.id, activeGameId);
															}
														}}
														className={`
															flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-left
															${isDarkMode ? "border-gray-600 bg-gray-800/20 hover:bg-gray-800/40" : "border-gray-300 bg-gray-50/20 hover:bg-gray-50/40"}
															${draggedPlayer?.id === player.id ? "opacity-50 scale-95" : ""}
														`}
													>
															<div className="flex-1 min-w-0">
																<p
																	className={`font-medium text-sm sm:text-base truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}
																>
																	{player.fullName}
																</p>
																<p
																	className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"} truncate`}
																>
																	{player.positions.map(getPositionAbbreviation).join(", ")}
																	{" • Rating: "}
																	{player.rating}
																</p>
															</div>
															<div className="flex items-center gap-1 flex-shrink-0">
																{player.youth && (
																	<span
																		className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
																			isDarkMode
																				? "bg-yellow-900/40 text-yellow-300"
																				: "bg-yellow-100 text-yellow-700"
																		}`}
																	>
																		Youth
																	</span>
																)}
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		assignPlayerToTeam(player.id, activeGameId, "black");
																	}}
																	className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
																		isDarkMode
																			? "bg-black text-white hover:bg-gray-800"
																			: "bg-gray-900 text-white hover:bg-black"
																	}`}
																>
																	Black
																</button>
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		assignPlayerToTeam(player.id, activeGameId, "white");
																	}}
																	className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
																		isDarkMode
																			? "bg-gray-300 text-gray-900 hover:bg-gray-200"
																			: "bg-gray-200 text-gray-900 hover:bg-gray-100"
																	}`}
																>
																	White
																</button>
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		// Remove from current game
																		const newGames = games.map((game) =>
																			game.id === activeGameId
																				? {
																						...game,
																						players: game.players.filter(
																							(p) => p.id !== player.id,
																						),
																					}
																				: game,
																		);
																		updateGames(newGames);
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
										</div>
									)}

									{/* Teams - Two Column Layout */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<TeamSection
											team="black"
											players={activeGame?.players.filter(p => p.team === "black") || []}
											isDarkMode={isDarkMode}
											hoveredDropZone={hoveredDropZone}
											draggedPlayer={draggedPlayer}
											onDragStart={handleDragStart}
											onDragEnd={handleDragEnd}
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
											onDrop={handleDrop}
											onAssignPlayerPosition={(playerId, position) => assignPlayerPosition(playerId, activeGameId, position)}
											onAssignPlayerToTeam={(playerId, targetTeam) => assignPlayerToTeam(playerId, activeGameId, targetTeam)}
											getPositionAbbreviation={getPositionAbbreviation}
										/>
										<TeamSection
											team="white"
											players={activeGame?.players.filter(p => p.team === "white") || []}
											isDarkMode={isDarkMode}
											hoveredDropZone={hoveredDropZone}
											draggedPlayer={draggedPlayer}
											onDragStart={handleDragStart}
											onDragEnd={handleDragEnd}
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
											onDrop={handleDrop}
											onAssignPlayerPosition={(playerId, position) => assignPlayerPosition(playerId, activeGameId, position)}
											onAssignPlayerToTeam={(playerId, targetTeam) => assignPlayerToTeam(playerId, activeGameId, targetTeam)}
											getPositionAbbreviation={getPositionAbbreviation}
										/>
									</div>

								</div>
							</div>
						</div>

					</>
				)}
			</div>
		</Modal>
	);
}
