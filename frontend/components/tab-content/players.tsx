"use client";

import { useAtom } from "jotai";
import { Edit, Mail, RefreshCw, Trash2, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient, type NewPlayer, type Player } from "@/lib/api";
import { isDarkModeAtom, isLoadingAtom } from "@/lib/atoms";
import { AddPlayerModal } from "../add-player-modal";
import { Button } from "../button";
import { ConfirmationDialog } from "../confirmation-dialog";
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
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
	const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	const fetchPlayers = async () => {
		try {
			const data = await apiClient.getPlayers();
			const sortedData = data.sort((a, b) =>
				a.fullName.localeCompare(b.fullName),
			);
			setPlayers(sortedData);
		} catch (err) {
			console.error("Failed to fetch players:", err);
		}
	};

	const handlePlayerAdded = async (player: NewPlayer) => {
		const data = await apiClient.createPlayer(player);
		setPlayers((prev) =>
			[...prev, data].sort((a, b) => a.fullName.localeCompare(b.fullName)),
		);
		setIsModalOpen(false);
	};

	const handlePlayerUpdated = async (
		id: number,
		playerData: Partial<NewPlayer>,
	) => {
		try {
			const data = await apiClient.updatePlayer(id, playerData);
			setPlayers((prev) =>
				prev
					.map((p) => (p.id === id ? data : p))
					.sort((a, b) => a.fullName.localeCompare(b.fullName)),
			);
			setEditingPlayer(null);
			setIsModalOpen(false);
		} catch (err) {
			console.error("Failed to update player:", err);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deletingPlayer) return;
		try {
			await apiClient.deletePlayer(deletingPlayer.id);
			setPlayers((prev) => prev.filter((p) => p.id !== deletingPlayer.id));
			setDeletingPlayer(null);
		} catch (err) {
			console.error("Failed to delete player:", err);
			setDeletingPlayer(null);
		}
	};

	const handleEdit = (player: Player) => {
		setEditingPlayer(player);
		setIsModalOpen(true);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		setEditingPlayer(null);
	};

	const handleSyncSportEasy = async () => {
		setIsSyncing(true);
		setSyncMessage(null);
		try {
			const response = await fetch(
				`${process.env.NODE_ENV === "production" ? "https://uwh-api.vercel.app" : "http://localhost:3101"}/api/sporteasy/import`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to sync: ${response.statusText}`);
			}

			const result = await response.json();
			const parts = [];
			if (result.imported > 0) parts.push(`${result.imported} new`);
			if (result.updated > 0) parts.push(`${result.updated} updated`);
			if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
			if (result.errors?.length > 0)
				parts.push(`${result.errors.length} errors`);

			setSyncMessage(
				`Found ${result.total} from SportEasy: ${parts.join(", ")}`,
			);

			// Refresh player list
			await fetchPlayers();

			// Clear message after 5 seconds
			setTimeout(() => setSyncMessage(null), 5000);
		} catch (error) {
			console.error("Failed to sync SportEasy:", error);
			setSyncMessage("Failed to sync with SportEasy");
			setTimeout(() => setSyncMessage(null), 5000);
		} finally {
			setIsSyncing(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: first fetch
	useEffect(() => {
		fetchPlayers();
	}, []);

	return (
		<>
			<AddPlayerModal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				onPlayerAdded={handlePlayerAdded}
				onPlayerUpdated={handlePlayerUpdated}
				isLoading={isLoading}
				editingPlayer={editingPlayer}
			/>

			<ConfirmationDialog
				isOpen={!!deletingPlayer}
				onClose={() => setDeletingPlayer(null)}
				onConfirm={handleDeleteConfirm}
				title="Delete Player"
				message={`Are you sure you want to delete ${deletingPlayer?.fullName}? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				isDestructive
			/>

			{/* Players List */}
			<GlassCard className="p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
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
						{syncMessage && (
							<p
								className={`text-sm ${
									isDarkMode ? "text-green-400" : "text-green-600"
								}`}
							>
								{syncMessage}
							</p>
						)}
					</div>
					<div className="flex gap-2">
						<Button
							onClick={handleSyncSportEasy}
							disabled={isSyncing}
							variant="outline"
							className={`
								cursor-pointer
								${
									isDarkMode
										? "border-purple-500 text-purple-400 hover:bg-purple-900/40"
										: "border-purple-400 text-purple-600 hover:bg-purple-50"
								}
							`}
						>
							<RefreshCw
								className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
							/>
							{isSyncing ? "Syncing..." : "Sync SportEasy"}
						</Button>
					</div>
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
							Add your first player with the button above
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
												{player.email || player.parentEmail || 'Missing'}
												{!player.email && player.parentEmail && (
													<span className={`ml-1 text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
														(parent)
													</span>
												)}
											</p>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
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
										variant="outline"
										onClick={() => handleEdit(player)}
										className={`
											px-3 py-1.5 h-auto cursor-pointer
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
										variant="outline"
										onClick={() => setDeletingPlayer(player)}
										className={`
											px-3 py-1.5 h-auto cursor-pointer
											${
												isDarkMode
													? "border-red-800 text-red-400 hover:bg-red-800/40"
													: "border-red-400 text-red-600 hover:bg-red-400/20"
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
		</>
	);
}
