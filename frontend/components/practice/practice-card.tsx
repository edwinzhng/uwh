"use client";

import { useAtom } from "jotai";
import { Calendar } from "lucide-react";
import type { Practice } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../shared/button";

interface PracticeCardProps {
	practice: Practice;
	isPast?: boolean;
	onUpdateCoaches?: (practice: Practice) => void;
	onMakeTeams?: (practice: Practice) => void;
}

export function PracticeCard({
	practice,
	isPast = false,
	onUpdateCoaches,
	onMakeTeams,
}: PracticeCardProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<div
			className={`
				p-4 rounded-xl transition-all duration-200
				${
					isDarkMode
						? "bg-gray-800/20 border border-gray-700/30"
						: "bg-white/20 border border-gray-200/30"
				}
				backdrop-blur-sm
				${isPast ? "opacity-75" : ""}
			`}
		>
			{/* Practice info row */}
			<div className="flex items-center gap-4 mb-3">
				<div
					className={`p-2 rounded-lg ${isDarkMode ? "bg-gray-700/40" : "bg-gray-100"}`}
				>
					<Calendar
						className={`h-4 w-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<p
						className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						{new Date(practice.date).toLocaleDateString("en-US", {
							weekday: "short",
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</p>
					{practice.notes && (
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							{practice.notes}
						</p>
					)}
				</div>
			</div>
			
			{/* Coach count and buttons row */}
			<div className="flex flex-col gap-3">
				{/* Coach count row */}
				{practice.practiceCoaches.length > 0 && (
					<div className="flex items-center">
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${
								isDarkMode
									? "bg-blue-900/40 text-blue-300"
									: "bg-blue-100 text-blue-700"
							}`}
						>
							{practice.practiceCoaches.length}{" "}
							{practice.practiceCoaches.length === 1 ? "Coach" : "Coaches"}
						</span>
					</div>
				)}
				
				{/* Action buttons row */}
				<div className="flex items-center gap-2 flex-wrap">
					<Button
						variant="outline"
						onClick={() => onUpdateCoaches?.(practice)}
						className={`
							px-3 py-1.5 h-auto
							${
								isDarkMode
									? "bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/40"
									: "bg-white/60 border-gray-200 text-gray-700 hover:bg-white/40"
							}
						`}
					>
						Update Coaches
					</Button>
					{!isPast && (
						<Button
							variant="outline"
							onClick={() => onMakeTeams?.(practice)}
							className={`
								px-3 py-1.5 h-auto
								${
									isDarkMode
										? "bg-transparent border-green-700 text-green-300 hover:bg-green-800/40"
										: "bg-white/60 border-green-200 text-green-700 hover:bg-green-50"
								}
							`}
						>
							Make Teams
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
