"use client";

import { useAtom } from "jotai";
import { Loader2, Users, Users2, Baby } from "lucide-react";
import { useEffect, useState } from "react";
import {
	apiClient,
	type Player,
	type SportEasyEventAttendee,
	type SportEasyEventAttendeesResponse,
} from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../shared/button";
import { Modal } from "../shared/modal";

interface Game {
	id: string;
	name: string;
	players: Player[];
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

	// Helper functions
	const youthPlayers = presentPlayers.filter(player => player.youth);
	const adultPlayers = presentPlayers.filter(player => !player.youth);

	const updateGames = (newGames: Game[]) => {
		setGames(newGames);
		// If active game no longer exists, switch to first game
		if (!newGames.find(game => game.id === activeGameId)) {
			setActiveGameId(newGames[0]?.id || "main");
		}
	};

	const toggleYouthGame = (enabled: boolean) => {
		setHasSeparateYouthGame(enabled);
		if (enabled) {
			// Add youth game
			const newGames = [
				{ id: "main", name: "Main Game", players: adultPlayers, isYouthGame: false },
				{ id: "youth", name: "Youth Game", players: youthPlayers, isYouthGame: true },
			];
			updateGames(newGames);
		} else {
			// Remove youth game, put all players in main game
			const newGames = [
				{ id: "main", name: "Main Game", players: presentPlayers, isYouthGame: false },
			];
			updateGames(newGames);
		}
	};

	const movePlayerToGame = (playerId: number, targetGameId: string) => {
		const newGames = games.map(game => {
			if (game.id === targetGameId) {
				// Add player to target game
				const player = presentPlayers.find(p => p.id === playerId);
				if (player && !game.players.find(p => p.id === playerId)) {
					return { ...game, players: [...game.players, player] };
				}
			} else {
				// Remove player from other games
				return { ...game, players: game.players.filter(p => p.id !== playerId) };
			}
			return game;
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
			
			// Initialize games with all players in main game
			const initialGames = [
				{ id: "main", name: "Main Game", players: present, isYouthGame: false },
			];
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
		setGames([{ id: "main", name: "Main Game", players: [], isYouthGame: false }]);
		setActiveGameId("main");
		setHasSeparateYouthGame(false);
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Make Teams" fullScreen>
			<div className="space-y-6">
				{isLoading ? (
					<div className="text-center py-8">
						<Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
						<p
							className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							Loading event attendees...
						</p>
					</div>
				) : error ? (
					<div className="text-center py-8">
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
				) : presentPlayers.length === 0 ? (
					<div className="text-center py-8">
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
							Players need to be marked as "present" in SportEasy to appear here
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3
								className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
							>
								Present Players ({presentPlayers.length})
							</h3>
						</div>

						<div className="space-y-2 max-h-96 overflow-y-auto">
							{presentPlayers.map((player) => (
								<div
									key={player.id}
									className={`
										flex items-center justify-between p-3 rounded-lg
										${isDarkMode ? "bg-gray-800/20 border border-gray-700/30" : "bg-white/20 border border-gray-200/30"}
									`}
								>
									<div>
										<p
											className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
										>
											{player.fullName}
										</p>
										<p
											className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
										>
											{player.positions.join(", ")} • Rating: {player.rating}
										</p>
									</div>
									<div className="flex items-center gap-2">
										{player.youth && (
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													isDarkMode
														? "bg-yellow-900/40 text-yellow-300"
														: "bg-yellow-100 text-yellow-700"
												}`}
											>
												Youth
											</span>
										)}
									</div>
								</div>
							))}
						</div>

						<div className="flex gap-3 pt-4">
							<Button
								onClick={handleClose}
								variant="outline"
								className={`
									flex-1
									${
										isDarkMode
											? "bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/40"
											: "bg-white/60 border-gray-200 text-gray-700 hover:bg-white/40"
									}
								`}
							>
								Close
							</Button>
							<Button
								onClick={() => {
									// TODO: Implement team creation logic
									console.log("Create teams with players:", presentPlayers);
								}}
								className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
							>
								Create Teams
							</Button>
						</div>
					</div>
				)}
			</div>
		</Modal>
	);
}
