"use client";

import { useAtom } from "jotai";
import { isDarkModeAtom } from "@/lib/atoms";
import { cn } from "@/lib/utils";

interface GlassCardProps {
	children: React.ReactNode;
	className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<div
			className={cn(
				"rounded-2xl backdrop-blur-xl border transition-all duration-300",
				isDarkMode
					? "bg-gray-900/20 border-gray-700/50 shadow-2xl shadow-gray-900/20"
					: "bg-white/20 border-gray-200/50 shadow-2xl shadow-gray-200/20",
				className,
			)}
		>
			{children}
		</div>
	);
}
