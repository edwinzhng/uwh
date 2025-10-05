"use client";

import { useAtom } from "jotai";
import { Award, BarChart3, TrendingUp, Trophy } from "lucide-react";
import { isDarkModeAtom } from "@/lib/atoms";
import { GlassCard } from "../glass-card";

export function CoachingHistoryTab() {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<div className="space-y-6">
			{/* Coming Soon Card */}
			<GlassCard className="p-8 text-center">
				<div className="flex items-center justify-center gap-3 mb-4">
					<div
						className={`p-3 rounded-lg ${isDarkMode ? "bg-purple-900/40" : "bg-purple-100"}`}
					>
						<Trophy
							className={`h-8 w-8 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
						/>
					</div>
					<h2
						className={`text-2xl font-thin ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						Coaching History
					</h2>
				</div>
				<p
					className={`text-lg mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
				>
					Coming soon! This section will track your coaching progress, player
					development, and team performance over time.
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
					<div
						className={`p-4 rounded-xl ${
							isDarkMode ? "bg-gray-800/20" : "bg-white/20"
						}`}
					>
						<TrendingUp
							className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
						/>
						<h3
							className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Progress Tracking
						</h3>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Monitor player skill development
						</p>
					</div>
					<div
						className={`p-4 rounded-xl ${
							isDarkMode ? "bg-gray-800/20" : "bg-white/20"
						}`}
					>
						<Award
							className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}
						/>
						<h3
							className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Achievements
						</h3>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Track team and individual milestones
						</p>
					</div>
					<div
						className={`p-4 rounded-xl ${
							isDarkMode ? "bg-gray-800/20" : "bg-white/20"
						}`}
					>
						<BarChart3
							className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
						/>
						<h3
							className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Analytics
						</h3>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Performance insights and statistics
						</p>
					</div>
					<div
						className={`p-4 rounded-xl ${
							isDarkMode ? "bg-gray-800/20" : "bg-white/20"
						}`}
					>
						<Trophy
							className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}
						/>
						<h3
							className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Competitions
						</h3>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Tournament and match history
						</p>
					</div>
				</div>
			</GlassCard>
		</div>
	);
}
