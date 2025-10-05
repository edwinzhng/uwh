"use client";

import { useAtom } from "jotai";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { isDarkModeAtom } from "@/lib/atoms";
import { GlassCard } from "../glass-card";

export function PracticesTab() {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<div className="space-y-6">
			{/* Coming Soon Card */}
			<GlassCard className="p-8 text-center">
				<div className="flex items-center justify-center gap-3 mb-4">
					<div
						className={`p-3 rounded-lg ${isDarkMode ? "bg-orange-900/40" : "bg-orange-100"}`}
					>
						<Calendar
							className={`h-8 w-8 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}
						/>
					</div>
					<h2
						className={`text-2xl font-thin ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						Practices Management
					</h2>
				</div>
				<p
					className={`text-lg mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
				>
					Coming soon! This section will allow you to manage practice sessions,
					schedule training, and track attendance.
				</p>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
					<div
						className={`p-4 rounded-xl ${
							isDarkMode ? "bg-gray-800/20" : "bg-white/20"
						}`}
					>
						<Clock
							className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
						/>
						<h3
							className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Schedule
						</h3>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Plan and schedule practice sessions
						</p>
					</div>
					<div
						className={`p-4 rounded-xl ${
							isDarkMode ? "bg-gray-800/20" : "bg-white/20"
						}`}
					>
						<MapPin
							className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
						/>
						<h3
							className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Locations
						</h3>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Manage practice venues and pools
						</p>
					</div>
					<div
						className={`p-4 rounded-xl ${
							isDarkMode ? "bg-gray-800/20" : "bg-white/20"
						}`}
					>
						<Users
							className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
						/>
						<h3
							className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Attendance
						</h3>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Track player attendance and participation
						</p>
					</div>
				</div>
			</GlassCard>
		</div>
	);
}
