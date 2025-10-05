"use client";

import { useAtom } from "jotai";
import { Calendar, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient, type Practice } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { PracticeList } from "../practice/practice-list";
import { Button } from "../shared/button";
import { GlassCard } from "../shared/glass-card";

export function PracticesTab() {
	const [practices, setPractices] = useState<Practice[]>([]);
	const [pastPractices, setPastPractices] = useState<Practice[]>([]);
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showPast, setShowPast] = useState(false);

	const fetchPractices = async () => {
		try {
			setIsLoading(true);
			const data = await apiClient.getPractices();
			setPractices(data);
		} catch (err) {
			console.error("Failed to fetch practices:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchPastPractices = async () => {
		try {
			const data = await apiClient.getPastPractices();
			setPastPractices(data);
		} catch (err) {
			console.error("Failed to fetch past practices:", err);
		}
	};

	const handleSyncSportEasy = async () => {
		setIsSyncing(true);
		setSyncMessage(null);
		try {
			const result = await apiClient.syncSportEasyEvents();
			const parts = [];
			if (result.imported > 0) parts.push(`${result.imported} new`);
			if (result.updated > 0) parts.push(`${result.updated} updated`);
			if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
			if (result.errors?.length && result.errors.length > 0)
				parts.push(`${result.errors.length} errors`);

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
		fetchPastPractices();
	}, []);

	return (
		<div className="space-y-6">
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

				<PracticeList practices={practices} />
			</GlassCard>

			{/* Past Practices */}
			{pastPractices.length > 0 && (
				<GlassCard className="p-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<div
								className={`p-2 rounded-lg ${isDarkMode ? "bg-gray-700/40" : "bg-gray-200"}`}
							>
								<Calendar
									className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
								/>
							</div>
							<h3
								className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
							>
								Past Practices ({pastPractices.length})
							</h3>
						</div>
						<button
							type="button"
							onClick={() => setShowPast(!showPast)}
							className={`
							text-sm font-medium cursor-pointer transition-colors
							${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}
						`}
						>
							{showPast ? "Hide" : "Show"}
						</button>
					</div>

					{showPast && <PracticeList practices={pastPractices} isPast />}
				</GlassCard>
			)}
		</div>
	);
}
