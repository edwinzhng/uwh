"use client";

import { useAtom } from "jotai";
import { Edit, Mail, Trash2, User, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
	apiClient,
	type NewPlayer,
	type Player,
	type Position,
} from "@/lib/api";
import { isDarkModeAtom, isLoadingAtom } from "@/lib/atoms";
import { Button } from "../button";
import { GlassCard } from "../glass-card";

const POSITIONS = [
	{ value: "FORWARD", label: "Forward" },
	{ value: "WING", label: "Wing" },
	{ value: "CENTER", label: "Center" },
	{ value: "FULL_BACK", label: "Full Back" },
] as const;

const playerSchema = z.object({
	fullName: z
		.string()
		.min(1, "Full name is required")
		.min(2, "Full name must be at least 2 characters"),
	email: z.string().min(1, "Email is required").email("Invalid email address"),
	positions: z
		.array(z.enum(["FORWARD", "WING", "CENTER", "FULL_BACK"]))
		.min(1, "At least one position is required"),
	rating: z
		.number()
		.min(1, "Rating must be at least 1")
		.max(10, "Rating must be at most 10"),
	youth: z.boolean().optional(),
});

export function PlayersTab() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [isLoading] = useAtom(isLoadingAtom);
	const [isDarkMode] = useAtom(isDarkModeAtom);

	const [newPlayer, setNewPlayer] = useState<NewPlayer>({
		fullName: "",
		email: "",
		positions: [],
		rating: undefined,
		youth: false,
	});
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});
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
			// Validate with Zod
			const validated = playerSchema.parse(newPlayer);
			setValidationErrors({});

			const data = await apiClient.createPlayer(validated);
			setPlayers((prev) => [data, ...prev]);
			setNewPlayer({
				fullName: "",
				email: "",
				positions: [],
				rating: undefined,
				youth: false,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				const errors: Record<string, string> = {};
				err.errors.forEach((error) => {
					if (error.path[0]) {
						errors[error.path[0].toString()] = error.message;
					}
				});
				setValidationErrors(errors);
			}
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: first fetch
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

				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
						<div className="lg:col-span-2">
							<label
								htmlFor="player-full-name"
								className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Full Name
							</label>
							<input
								id="player-full-name"
								type="text"
								placeholder="Enter full name"
								value={newPlayer.fullName}
								onChange={(e) => {
									setNewPlayer((prev) => ({
										...prev,
										fullName: e.target.value,
									}));
									setValidationErrors((prev) => ({ ...prev, fullName: "" }));
								}}
								className={`
									w-full px-4 py-3 rounded-xl border transition-all duration-200
									${
										validationErrors.fullName
											? "border-red-500 focus:ring-red-500/20"
											: isDarkMode
												? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
												: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
									}
									backdrop-blur-sm
								`}
							/>
							{validationErrors.fullName && (
								<p className="text-red-500 text-xs mt-1">
									{validationErrors.fullName}
								</p>
							)}
						</div>
						<div className="lg:col-span-2">
							<label
								htmlFor="player-email"
								className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Email
							</label>
							<input
								id="player-email"
								type="email"
								placeholder="Enter email"
								value={newPlayer.email}
								onChange={(e) => {
									setNewPlayer((prev) => ({ ...prev, email: e.target.value }));
									setValidationErrors((prev) => ({ ...prev, email: "" }));
								}}
								className={`
									w-full px-4 py-3 rounded-xl border transition-all duration-200
									${
										validationErrors.email
											? "border-red-500 focus:ring-red-500/20"
											: isDarkMode
												? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
												: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
									}
									backdrop-blur-sm
								`}
							/>
							{validationErrors.email && (
								<p className="text-red-500 text-xs mt-1">
									{validationErrors.email}
								</p>
							)}
						</div>
						<div>
							<label
								htmlFor="player-rating"
								className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Rating (1-10)
							</label>
							<input
								id="player-rating"
								type="number"
								min="1"
								max="10"
								placeholder="1-10"
								value={newPlayer.rating ?? ""}
								onChange={(e) => {
									const value =
										e.target.value === ""
											? undefined
											: parseInt(e.target.value);
									setNewPlayer((prev) => ({
										...prev,
										rating: value,
									}));
									setValidationErrors((prev) => ({ ...prev, rating: "" }));
								}}
								className={`
									w-full px-4 py-3 rounded-xl border transition-all duration-200
									${
										validationErrors.rating
											? "border-red-500 focus:ring-red-500/20"
											: isDarkMode
												? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
												: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
									}
									backdrop-blur-sm
								`}
							/>
							{validationErrors.rating && (
								<p className="text-red-500 text-xs mt-1">
									{validationErrors.rating}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="player-positions"
								className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Positions
							</label>
							<div
								className={`
								p-4 rounded-xl border backdrop-blur-sm
								${
									validationErrors.positions
										? "border-red-500"
										: isDarkMode
											? "bg-gray-800/40 border-gray-700/50"
											: "bg-white/40 border-gray-200/50"
								}
							`}
							>
								<div className="grid grid-cols-2 gap-2">
									{POSITIONS.map((pos) => (
										<label
											key={pos.value}
											className={`
												flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
												${
													newPlayer.positions.includes(pos.value as Position)
														? isDarkMode
															? "bg-blue-600/80 text-white border border-blue-500"
															: "bg-blue-600 text-white border border-blue-500"
														: isDarkMode
															? "bg-gray-700/40 text-gray-300 border border-gray-600/50 hover:bg-gray-700/60"
															: "bg-white/60 text-gray-700 border border-gray-300/50 hover:bg-white/80"
												}
											`}
										>
											<input
												type="checkbox"
												checked={newPlayer.positions.includes(
													pos.value as Position,
												)}
												onChange={(e) => {
													setNewPlayer((prev) => ({
														...prev,
														positions: e.target.checked
															? [...prev.positions, pos.value as Position]
															: prev.positions.filter((p) => p !== pos.value),
													}));
													setValidationErrors((prev) => ({
														...prev,
														positions: "",
													}));
												}}
												className="sr-only"
											/>
											<span className="text-sm font-medium">{pos.label}</span>
										</label>
									))}
								</div>
							</div>
							{validationErrors.positions && (
								<p className="text-red-500 text-xs mt-1">
									{validationErrors.positions}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="player-youth"
								className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Player Type
							</label>
							<div className="flex gap-2 h-12">
								<button
									type="button"
									onClick={() =>
										setNewPlayer((prev) => ({ ...prev, youth: false }))
									}
									className={`
										flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
										${
											!newPlayer.youth
												? isDarkMode
													? "bg-blue-600/80 text-white border-blue-500"
													: "bg-blue-600 text-white border-blue-500"
												: isDarkMode
													? "bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-800/60"
													: "bg-white/40 border-gray-200/50 text-gray-700 hover:bg-white/60"
										}
									`}
								>
									<span className="text-sm font-medium">Adult</span>
								</button>
								<button
									type="button"
									onClick={() =>
										setNewPlayer((prev) => ({ ...prev, youth: true }))
									}
									className={`
										flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
										${
											newPlayer.youth
												? isDarkMode
													? "bg-blue-600/80 text-white border-blue-500"
													: "bg-blue-600 text-white border-blue-500"
												: isDarkMode
													? "bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-800/60"
													: "bg-white/40 border-gray-200/50 text-gray-700 hover:bg-white/60"
										}
									`}
								>
									<span className="text-sm font-medium">Youth</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				<Button
					onClick={createPlayer}
					disabled={isLoading}
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
								<div className="flex items-center gap-2 flex-wrap">
									<span
										className={`px-3 py-1 rounded-full text-sm font-semibold ${
											isDarkMode
												? "bg-yellow-900/40 text-yellow-300"
												: "bg-yellow-100 text-yellow-700"
										}`}
									>
										⭐ {player.rating}/10
									</span>
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
