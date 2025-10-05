"use client";

import { useAtom } from "jotai";
import { BarChart3, Plus, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiClient, type Coach, type CoachStatistics, type NewCoach } from "@/lib/api";
import { isDarkModeAtom, isLoadingAtom } from "@/lib/atoms";
import { Button } from "../shared/button";
import { ConfirmationDialog } from "../shared/confirmation-dialog";
import { FadeIn } from "../shared/fade-in";
import { GlassCard } from "../shared/glass-card";
import { Modal } from "../shared/modal";

const coachSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.min(2, "Name must be at least 2 characters"),
});

export function CoachesTab() {
	const [coaches, setCoaches] = useState<Coach[]>([]);
	const [isLoading] = useAtom(isLoadingAtom);
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
	const [deletingCoach, setDeletingCoach] = useState<Coach | null>(null);
	const [formData, setFormData] = useState<NewCoach>({
		name: "",
		isActive: true,
	});
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	const [statistics, setStatistics] = useState<CoachStatistics[]>([]);
	const [isLoadingStats, setIsLoadingStats] = useState(false);
	const [selectedSeason, setSelectedSeason] = useState("2025-2026");
	const [startDate, setStartDate] = useState("2025-09-01");
	const [endDate, setEndDate] = useState("2026-08-31");

	const fetchCoaches = async () => {
		try {
			const data = await apiClient.getCoaches();
			const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
			setCoaches(sortedData);
		} catch (err) {
			console.error("Failed to fetch coaches:", err);
		}
	};

	const getSeasonDates = (season: string) => {
		const seasons = {
			"2024-2025": { start: "2024-09-01", end: "2025-08-31" },
			"2025-2026": { start: "2025-09-01", end: "2026-08-31" },
			"2026-2027": { start: "2026-09-01", end: "2027-08-31" },
		};
		return seasons[season as keyof typeof seasons] || seasons["2025-2026"];
	};

	const fetchStatistics = async () => {
		try {
			setIsLoadingStats(true);
			const data = await apiClient.getCoachStatistics(startDate, endDate);
			setStatistics(data);
		} catch (err) {
			console.error("Failed to fetch coach statistics:", err);
		} finally {
			setIsLoadingStats(false);
		}
	};

	const handleSeasonChange = (season: string) => {
		setSelectedSeason(season);
		const dates = getSeasonDates(season);
		setStartDate(dates.start);
		setEndDate(dates.end);
	};

	const handleAdd = () => {
		setEditingCoach(null);
		setFormData({
			name: "",
			isActive: true,
		});
		setValidationErrors({});
		setIsModalOpen(true);
	};

	const handleEdit = (coach: Coach) => {
		setEditingCoach(coach);
		setFormData({
			name: coach.name,
			isActive: coach.isActive,
		});
		setValidationErrors({});
		setIsModalOpen(true);
	};

	const handleDelete = (coach: Coach) => {
		setDeletingCoach(coach);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		setEditingCoach(null);
		setFormData({
			name: "",
			isActive: true,
		});
		setValidationErrors({});
	};

	const handleSubmit = async () => {
		try {
			const validated = coachSchema.parse(formData);
			setValidationErrors({});

			if (editingCoach) {
				const data = await apiClient.updateCoach(editingCoach.id, {
					...validated,
					isActive: formData.isActive,
				});
				setCoaches((prev) =>
					prev
						.map((c) => (c.id === editingCoach.id ? data : c))
						.sort((a, b) => a.name.localeCompare(b.name)),
				);
			} else {
				const data = await apiClient.createCoach({
					...validated,
					isActive: formData.isActive,
				});
				setCoaches((prev) =>
					[...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
				);
			}
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
		if (!deletingCoach) return;
		try {
			await apiClient.deleteCoach(deletingCoach.id);
			setCoaches((prev) => prev.filter((c) => c.id !== deletingCoach.id));
			setDeletingCoach(null);
		} catch (err) {
			console.error("Failed to delete coach:", err);
			setDeletingCoach(null);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: first fetch
	useEffect(() => {
		fetchCoaches();
		fetchStatistics();
	}, []);

	// Fetch statistics when date range changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: date change
	useEffect(() => {
		fetchStatistics();
	}, [startDate, endDate]);

	return (
		<>
			<Modal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				title={editingCoach ? "Edit Coach" : "Add Coach"}
			>
				<div className="space-y-4">
					<div>
						<label
							htmlFor="coach-name"
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Name
						</label>
						<input
							id="coach-name"
							type="text"
							placeholder="Enter coach name"
							value={formData.name}
							onChange={(e) => {
								setFormData((prev) => ({
									...prev,
									name: e.target.value,
								}));
								setValidationErrors((prev) => ({ ...prev, name: "" }));
							}}
							className={`
								w-full px-4 py-3 rounded-xl border transition-all duration-200
								${
									validationErrors.name
										? "border-red-500 focus:ring-red-500/20"
										: isDarkMode
											? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
											: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
								backdrop-blur-sm
							`}
						/>
						{validationErrors.name && (
							<p className="text-red-500 text-xs mt-1">
								{validationErrors.name}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="coach-active"
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Status
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() =>
									setFormData((prev) => ({ ...prev, isActive: true }))
								}
								className={`
									flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
									${
										formData.isActive
											? isDarkMode
												? "bg-green-600/80 text-white border-green-500"
												: "bg-green-600 text-white border-green-500"
											: isDarkMode
												? "bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-800/60"
												: "bg-white/40 border-gray-200/50 text-gray-700 hover:bg-white/60"
									}
								`}
							>
								<span className="text-sm font-medium">Active</span>
							</button>
							<button
								type="button"
								onClick={() =>
									setFormData((prev) => ({ ...prev, isActive: false }))
								}
								className={`
									flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
									${
										!formData.isActive
											? isDarkMode
												? "bg-gray-600/80 text-white border-gray-500"
												: "bg-gray-600 text-white border-gray-500"
											: isDarkMode
												? "bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-800/60"
												: "bg-white/40 border-gray-200/50 text-gray-700 hover:bg-white/60"
									}
								`}
							>
								<span className="text-sm font-medium">Inactive</span>
							</button>
						</div>
					</div>
				</div>

				<Button
					onClick={handleSubmit}
					disabled={isLoading}
					className="mt-4 bg-blue-600 hover:bg-blue-700 text-white w-full"
				>
					{isLoading
						? editingCoach
							? "Updating..."
							: "Creating..."
						: editingCoach
							? "Update Coach"
							: "Add Coach"}
				</Button>
			</Modal>

			<ConfirmationDialog
				isOpen={!!deletingCoach}
				onClose={() => setDeletingCoach(null)}
				onConfirm={handleDeleteConfirm}
				title="Delete Coach"
				message={`Are you sure you want to delete ${deletingCoach?.name}? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				isDestructive
			/>

		<FadeIn>
			<GlassCard className="p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div
							className={`p-2 rounded-lg ${isDarkMode ? "bg-blue-900/40" : "bg-blue-100"}`}
						>
							<UserCog
								className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
							/>
						</div>
					<h3
						className={`text-lg font-semibold flex items-center gap-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						Coaches
						<span 
							className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
						>
							({coaches.length})
						</span>
					</h3>
					</div>
					<Button
						onClick={handleAdd}
						className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Coach
					</Button>
				</div>

				{coaches.length === 0 ? (
					<div className="text-center py-8">
						<Users
							className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
						/>
						<p
							className={`text-lg font-thin ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							No coaches found
						</p>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
						>
							Add your first coach with the button above
						</p>
					</div>
				) : (
				<div className="space-y-3">
					{coaches.map((coach, index) => (
						<FadeIn key={coach.id} delay={index * 25}>
								<div
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
											<UserCog
												className={`h-4 w-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
											/>
										</div>
										<div>
											<p
												className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
											>
												{coach.name}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												coach.isActive
													? isDarkMode
														? "bg-green-900/40 text-green-300"
														: "bg-green-100 text-green-700"
													: isDarkMode
														? "bg-gray-700/40 text-gray-400"
														: "bg-gray-200 text-gray-600"
											}`}
										>
											{coach.isActive ? "Active" : "Inactive"}
										</span>
										<Button
											variant="outline"
											onClick={() => handleEdit(coach)}
											className={`
												px-3 py-1.5 h-auto cursor-pointer
												${
													isDarkMode
														? "bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/40"
														: "bg-white/60 border-gray-200 text-gray-700 hover:bg-white/40"
												}
											`}
										>
											Edit
										</Button>
										<Button
											variant="outline"
											onClick={() => handleDelete(coach)}
											className={`
												px-3 py-1.5 h-auto cursor-pointer
												${
													isDarkMode
														? "bg-transparent border-red-800 text-red-400 hover:bg-red-800/40"
														: "bg-white/60 border-red-400 text-red-600 hover:bg-red-400/20"
												}
											`}
										>
											Delete
										</Button>
									</div>
								</div>
							</FadeIn>
						))}
					</div>
				)}
			</GlassCard>
		</FadeIn>

		{/* Statistics Section */}
		<FadeIn delay={100}>
			<GlassCard className="p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div
							className={`p-2 rounded-lg ${isDarkMode ? "bg-purple-900/40" : "bg-purple-100"}`}
						>
							<BarChart3
								className={`h-5 w-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
							/>
						</div>
						<h3
							className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Coaching Hours
						</h3>
					</div>
				</div>

				{/* Season Filter */}
				<div className="mb-6">
					<label
						htmlFor="season"
						className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Season
					</label>
					<select
						id="season"
						value={selectedSeason}
						onChange={(e) => handleSeasonChange(e.target.value)}
						className={`
							w-full px-4 py-2 rounded-xl border transition-all duration-200
							${isDarkMode
								? "bg-gray-800/40 border-gray-700/50 text-white"
								: "bg-white/40 border-gray-200/50 text-gray-900"
							}
							backdrop-blur-sm
						`}
					>
						<option value="2024-2025">2024-2025</option>
						<option value="2025-2026">2025-2026</option>
						<option value="2026-2027">2026-2027</option>
					</select>
				</div>

				{/* Statistics Table */}
				{isLoadingStats ? (
					<div className="text-center py-8">
						<p
							className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							Loading statistics...
						</p>
					</div>
				) : statistics.length === 0 ? (
					<div className="text-center py-8">
						<BarChart3
							className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
						/>
						<p
							className={`text-lg font-thin ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							No coaching hours recorded
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr
									className={`border-b ${isDarkMode ? "border-gray-700/50" : "border-gray-200/50"}`}
								>
									<th
										className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Coach
									</th>
									<th
										className={`text-right py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Practices
									</th>
									<th
										className={`text-right py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Total Hours
									</th>
								</tr>
							</thead>
							<tbody>
								{statistics.map((stat) => (
									<tr
										key={stat.coachId}
										className={`
											border-b transition-colors
											${isDarkMode ? "border-gray-700/30 hover:bg-gray-800/20" : "border-gray-200/30 hover:bg-white/20"}
										`}
									>
										<td
											className={`py-3 px-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
										>
											{stat.coachName}
										</td>
										<td
											className={`text-right py-3 px-4 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
										>
											{stat.practiceCount}
										</td>
										<td
											className={`text-right py-3 px-4 font-semibold ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
										>
											{stat.totalHours.toFixed(1)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</GlassCard>
		</FadeIn>
		</>
	);
}

