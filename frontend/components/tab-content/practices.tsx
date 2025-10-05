"use client";

import { useAtom } from "jotai";
import { Calendar, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../button";
import { GlassCard } from "../glass-card";

interface Practice {
	id: number;
	date: string;
	notes: string | null;
	sporteasyId: number | null;
	createdAt: string;
	updatedAt: string;
}

export function PracticesTab() {
	const [practices, setPractices] = useState<Practice[]>([]);
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetchPractices = async () => {
		try {
			setIsLoading(true);
			const response = await fetch(
				`${process.env.NODE_ENV === "production" ? "https://uwh-api.vercel.app" : "http://localhost:3101"}/api/practices`,
			);
			const data = await response.json();
			setPractices(data);
		} catch (err) {
			console.error("Failed to fetch practices:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSyncSportEasy = async () => {
		setIsSyncing(true);
		setSyncMessage(null);
		try {
			const response = await fetch(
				`${process.env.NODE_ENV === "production" ? "https://uwh-api.vercel.app" : "http://localhost:3101"}/api/sporteasy/import-events`,
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
			if (result.errors?.length > 0) parts.push(`${result.errors.length} errors`);
			
			setSyncMessage(
				`Found ${result.total} from SportEasy: ${parts.join(", ")}`,
			);

			// Refresh practice list
			await fetchPractices();

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
		fetchPractices();
	}, []);

	return (
		<GlassCard className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div
						className={`p-2 rounded-lg ${isDarkMode ? "bg-orange-900/40" : "bg-orange-100"}`}
					>
						<Calendar
							className={`h-5 w-5 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}
						/>
					</div>
					<h3
						className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						Practices{!isLoading && ` (${practices.length})`}
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

			{practices.length === 0 ? (
				<div className="text-center py-8">
					<Calendar
						className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
					/>
					<p
						className={`text-lg font-thin ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
					>
						No practices found
					</p>
					<p
						className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
					>
						Sync with SportEasy to import practice events
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{practices.map((practice) => (
						<div
							key={practice.id}
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
									<Calendar
										className={`h-4 w-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
									/>
								</div>
								<div>
									<p
										className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
									>
										{practice.notes || "Practice"}
									</p>
									<p
										className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
									>
										{new Date(practice.date).toLocaleString("en-US", {
											weekday: "short",
											month: "short",
											day: "numeric",
											year: "numeric",
											hour: "numeric",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</GlassCard>
	);
}
