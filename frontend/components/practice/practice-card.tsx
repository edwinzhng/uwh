"use client";

import { useAtom } from "jotai";
import { Calendar } from "lucide-react";
import type { Practice } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";

interface PracticeCardProps {
	practice: Practice;
	isPast?: boolean;
}

export function PracticeCard({ practice, isPast = false }: PracticeCardProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<div
			className={`
				flex items-center justify-between p-4 rounded-xl transition-all duration-200
				${
					isDarkMode
						? "bg-gray-800/20 hover:bg-gray-800/40 border border-gray-700/30"
						: "bg-white/20 hover:bg-white/40 border border-gray-200/30"
				}
				backdrop-blur-sm
				${isPast ? "opacity-75" : ""}
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
	);
}

