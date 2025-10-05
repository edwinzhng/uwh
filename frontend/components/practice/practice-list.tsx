"use client";

import { useAtom } from "jotai";
import { Calendar } from "lucide-react";
import type { Practice } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { FadeIn } from "../shared/fade-in";
import { PracticeCard } from "./practice-card";

interface PracticeListProps {
	practices: Practice[];
	isPast?: boolean;
	emptyMessage?: string;
	emptySubMessage?: string;
	onUpdateCoaches?: (practice: Practice) => void;
	onMakeTeams?: (practice: Practice) => void;
}

export function PracticeList({
	practices,
	isPast = false,
	emptyMessage = "No practices found",
	emptySubMessage = "Sync with SportEasy to import practice events",
	onUpdateCoaches,
	onMakeTeams,
}: PracticeListProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	if (practices.length === 0) {
		return (
			<div className="text-center py-8">
				<Calendar
					className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
				/>
				<p
					className={`text-lg font-thin ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
				>
					{emptyMessage}
				</p>
				<p
					className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
				>
					{emptySubMessage}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{practices.map((practice, index) => (
				<FadeIn key={practice.id} delay={index * 25}>
					<PracticeCard 
						practice={practice} 
						isPast={isPast}
						onUpdateCoaches={onUpdateCoaches}
						onMakeTeams={onMakeTeams}
					/>
				</FadeIn>
			))}
		</div>
	);
}

