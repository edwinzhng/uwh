"use client";

import { useAtom } from "jotai";
import { Edit, Mail, Trash2, User, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient, type NewPlayer, type Player } from "@/lib/api";
import { errorAtom, isDarkModeAtom, isLoadingAtom } from "@/lib/atoms";
import { Button } from "../button";
import { GlassCard } from "../glass-card";

const POSITIONS = [
	{ value: "FORWARD", label: "Forward" },
	{ value: "WING", label: "Wing" },
	{ value: "CENTER", label: "Center" },
	{ value: "FULL_BACK", label: "Full Back" },
] as const;

export function PlayersTab() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [isLoading] = useAtom(isLoadingAtom);
	const [error] = useAtom(errorAtom);
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [newPlayer, setNewPlayer] = useState<NewPlayer>({
		fullName: "",
		email: "",
		sporteasyId: "",
		position: "FORWARD",
	});
	const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

	const fetchPlayers = async () => {
		try {
			const data = await apiClient.getPlayers();
			setPlayers(data);
		} catch (err) {
			console.error("Failed to fetch players:", err);
		}
	};

	const createPlayer = async () => {
		try {
			const data = await apiClient.createPlayer(newPlayer);
			setPlayers((prev) => [data, ...prev]);
			setNewPlayer({
				fullName: "",
				email: "",
				sporteasyId: "",
				position: "FORWARD",
			});
		} catch (err) {
			console.error("Failed to create player:", err);
		}
	};

	const updatePlayer = async (id: number, playerData: Partial<NewPlayer>) => {
		try {
			const data = await apiClient.updatePlayer(id, playerData);
			setPlayers((prev) => prev.map((p) => (p.id === id ? data : p)));
			setEditingPlayer(null);
		} catch (err) {
			console.error("Failed to update player:", err);
		}
	};

	const deletePlayer = async (id: number) => {
		try {
			await apiClient.deletePlayer(id);
			setPlayers((prev) => prev.filter((p) => p.id !== id));
		} catch (err) {
			console.error("Failed to delete player:", err);
		}
	};

	useEffect(() => {
		fetchPlayers();
	}, []);

	return (
		<div className="space-y-6">
			{/* Add Player Form */}
			<GlassCard className="p-6">
				<div className="flex items-center gap-3 mb-4">
					<div
						className={`p-2 rounded-lg ${isDarkMode ? "bg-blue-900/40" : "bg-blue-100"}`}
					>
						<UserPlus
							className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
						/>
					</div>
					<h3
						className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						Add New Player
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Full Name
						</label>
						<input
							type="text"
							placeholder="Enter full name"
							value={newPlayer.fullName}
							onChange={(e) =>
								setNewPlayer((prev) => ({ ...prev, fullName: e.target.value }))
							}
							className={`
                w-full px-4 py-3 rounded-xl border transition-all duration-200
                ${
									isDarkMode
										? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
										: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
                backdrop-blur-sm
              `}
						/>
					</div>
					<div>
						<label
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Email
						</label>
						<input
							type="email"
							placeholder="Enter email"
							value={newPlayer.email}
							onChange={(e) =>
								setNewPlayer((prev) => ({ ...prev, email: e.target.value }))
							}
							className={`
                w-full px-4 py-3 rounded-xl border transition-all duration-200
                ${
									isDarkMode
										? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
										: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
                backdrop-blur-sm
              `}
						/>
					</div>
					<div>
						<label
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Position
						</label>
						<select
							value={newPlayer.position}
							onChange={(e) =>
								setNewPlayer((prev) => ({
									...prev,
									position: e.target.value as NewPlayer["position"],
								}))
							}
							className={`
                w-full px-4 py-3 rounded-xl border transition-all duration-200
                ${
									isDarkMode
										? "bg-gray-800/40 border-gray-700/50 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
										: "bg-white/40 border-gray-200/50 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
                backdrop-blur-sm
              `}
						>
							{POSITIONS.map((pos) => (
								<option key={pos.value} value={pos.value}>
									{pos.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							SportEasy ID (Optional)
						</label>
						<input
							type="text"
							placeholder="Enter SportEasy ID"
							value={newPlayer.sporteasyId}
							onChange={(e) =>
								setNewPlayer((prev) => ({
									...prev,
									sporteasyId: e.target.value,
								}))
							}
							className={`
                w-full px-4 py-3 rounded-xl border transition-all duration-200
                ${
									isDarkMode
										? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
										: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
                backdrop-blur-sm
              `}
						/>
					</div>
				</div>

				<Button
					onClick={createPlayer}
					disabled={isLoading || !newPlayer.fullName || !newPlayer.email}
					className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
				>
					{isLoading ? "Creating..." : "Add Player"}
				</Button>
			</GlassCard>

			{/* Players List */}
			<GlassCard className="p-6">
				<div className="flex items-center gap-3 mb-6">
					<div
						className={`p-2 rounded-lg ${isDarkMode ? "bg-green-900/40" : "bg-green-100"}`}
					>
						<Users
							className={`h-5 w-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
						/>
					</div>
					<h3
						className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						Players ({players.length})
					</h3>
				</div>

				{players.length === 0 ? (
					<div className="text-center py-8">
						<User
							className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
						/>
						<p
							className={`text-lg font-thin ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							No players found
						</p>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
						>
							Add your first player above
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{players.map((player) => (
							<div
								key={player.id}
								className={`
                  flex items-center justify-between p-4 rounded-xl transition-all duration-200
                  ${
										isDarkMode
											? "bg-gray-800/20 hover:bg-gray-800/40 border border-gray-700/30"
											: "bg-white/20 hover:bg-white/40 border border-gray-200/30"
									}
                  backdrop-blur-sm
                `}
							>
								<div className="flex items-center gap-4">
									<div
										className={`p-2 rounded-lg ${isDarkMode ? "bg-gray-700/40" : "bg-gray-100"}`}
									>
										<User
											className={`h-4 w-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
										/>
									</div>
									<div>
										<p
											className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
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
												{player.email}
											</p>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											isDarkMode
												? "bg-blue-900/40 text-blue-300"
												: "bg-blue-100 text-blue-700"
										}`}
									>
										{POSITIONS.find((p) => p.value === player.position)?.label}
									</span>
									<Button
										size="sm"
										variant="outline"
										onClick={() => setEditingPlayer(player)}
										className={`
                      ${
												isDarkMode
													? "border-gray-700 text-gray-300 hover:bg-gray-800/40"
													: "border-gray-200 text-gray-700 hover:bg-white/40"
											}
                    `}
									>
										<Edit className="h-3 w-3" />
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => deletePlayer(player.id)}
										className={`
                      ${
												isDarkMode
													? "border-red-700 text-red-300 hover:bg-red-900/40"
													: "border-red-200 text-red-700 hover:bg-red-100"
											}
                    `}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</GlassCard>
		</div>
	);
}
