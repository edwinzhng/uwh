"use client";

import { useAtom } from "jotai";
import { RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient, type NewPlayer, type Player } from "@/lib/api";
import { isDarkModeAtom, isLoadingAtom } from "@/lib/atoms";
import { PlayerCard } from "../player/player-card";
import { Button } from "../shared/button";
import { GlassCard } from "../shared/glass-card";

export function PlayersTab() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [isLoading] = useAtom(isLoadingAtom);
	const [isDarkMode] = useAtom(isDarkModeAtom);
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
		} catch (err) {
			console.error("Failed to update player:", err);
		}
	};

	const handlePlayerDeleted = async (playerId: number) => {
		try {
			await apiClient.deletePlayer(playerId);
			setPlayers((prev) => prev.filter((p) => p.id !== playerId));
		} catch (err) {
			console.error("Failed to delete player:", err);
		}
	};

	const handleSyncSportEasy = async () => {
		setIsSyncing(true);
		setSyncMessage(null);
		try {
			const result = await apiClient.syncSportEasyPlayers();
			const parts = [];
			if (result.imported > 0) parts.push(`${result.imported} new`);
			if (result.updated > 0) parts.push(`${result.updated} updated`);
			if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
			if (result.errors?.length && result.errors.length > 0)
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
						Players{!isLoading && ` (${players.length})`}
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
										? "bg-transparent border-purple-500 text-purple-400 hover:bg-purple-900/40"
										: "bg-white/60 border-purple-400 text-purple-600 hover:bg-purple-50"
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
					<Users
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
						Sync with SportEasy to import players
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{players.map((player) => (
						<PlayerCard
							key={player.id}
							player={player}
							onPlayerUpdated={handlePlayerUpdated}
							onPlayerDeleted={handlePlayerDeleted}
							isLoading={isLoading}
						/>
					))}
				</div>
			)}
		</GlassCard>
	);
}
