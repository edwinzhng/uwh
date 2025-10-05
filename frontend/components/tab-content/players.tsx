"use client";

import { useAtom } from "jotai";
import { RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiClient, type NewPlayer, type Player, type Position } from "@/lib/api";
import { isDarkModeAtom, isLoadingAtom } from "@/lib/atoms";
import { PlayerCard } from "../player/player-card";
import { Button } from "../shared/button";
import { ConfirmationDialog } from "../shared/confirmation-dialog";
import { FadeIn } from "../shared/fade-in";
import { GlassCard } from "../shared/glass-card";
import { Modal } from "../shared/modal";

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
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
	const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [formData, setFormData] = useState<NewPlayer>({
		fullName: "",
		email: "",
		positions: [],
		rating: undefined,
		youth: false,
	});
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

	const handleEdit = (player: Player) => {
		setEditingPlayer(player);
		setFormData({
			fullName: player.fullName,
			email: player.email,
			positions: player.positions,
			rating: player.rating,
			youth: player.youth,
		});
		setValidationErrors({});
		setIsModalOpen(true);
	};

	const handleDelete = (player: Player) => {
		setDeletingPlayer(player);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		setEditingPlayer(null);
		setFormData({
			fullName: "",
			email: "",
			positions: [],
			rating: undefined,
			youth: false,
		});
		setValidationErrors({});
	};

	const handleSubmit = async () => {
		if (!editingPlayer) return;

		try {
			const validated = playerSchema.parse(formData);
			setValidationErrors({});
			const data = await apiClient.updatePlayer(editingPlayer.id, validated);
			setPlayers((prev) =>
				prev
					.map((p) => (p.id === editingPlayer.id ? data : p))
					.sort((a, b) => a.fullName.localeCompare(b.fullName)),
			);
			handleModalClose();
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
		<>
			<Modal isOpen={isModalOpen} onClose={handleModalClose} title="Edit Player">
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
								value={formData.fullName}
								onChange={(e) => {
									setFormData((prev) => ({
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
								{editingPlayer &&
									!editingPlayer.email &&
									editingPlayer.parentEmail && (
										<span
											className={`ml-2 text-xs font-normal ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
										>
											(parent)
										</span>
									)}
							</label>
							<input
								id="player-email"
								type="email"
								placeholder="Enter email"
								value={(formData.email || editingPlayer?.parentEmail) ?? ""}
								disabled={true}
								className={`
									w-full px-4 py-3 rounded-xl border transition-all duration-200
									opacity-60 cursor-not-allowed
									${isDarkMode
										? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400"
										: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500"
									}
									backdrop-blur-sm
								`}
							/>
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
								value={formData.rating ?? ""}
								onChange={(e) => {
									const value =
										e.target.value === "" ? undefined : Number.parseInt(e.target.value);
									setFormData((prev) => ({
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
													formData.positions.includes(pos.value as Position)
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
												checked={formData.positions.includes(
													pos.value as Position,
												)}
												onChange={(e) => {
													setFormData((prev) => ({
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
										setFormData((prev) => ({ ...prev, youth: false }))
									}
									className={`
										flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
										${
											!formData.youth
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
										setFormData((prev) => ({ ...prev, youth: true }))
									}
									className={`
										flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
										${
											formData.youth
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
					onClick={handleSubmit}
					disabled={isLoading}
					className="mt-4 bg-blue-600 hover:bg-blue-700 text-white w-full"
				>
					{isLoading ? "Updating..." : "Update Player"}
				</Button>
			</Modal>

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

			<FadeIn>
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
						{players.map((player, index) => (
							<FadeIn key={player.id} delay={index * 25}>
								<PlayerCard
									player={player}
									onEdit={handleEdit}
									onDelete={handleDelete}
								/>
							</FadeIn>
						))}
					</div>
					)}
				</GlassCard>
			</FadeIn>
		</>
	);
}
