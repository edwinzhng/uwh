"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
	children: React.ReactNode;
	variant?: "position" | "youth" | "coach" | "capt" | "ref" | "default";
	className?: string;
}

export function Badge({
	children,
	variant = "default",
	className,
}: BadgeProps) {
	const variants = {
		position: "bg-[#cbdbcc] text-[#4a8a40] font-semibold",
		youth: "bg-[#c7dcf0] text-[#2a5c8a] font-semibold",
		coach: "bg-[#f0c7c7] text-[#8a2a2a] font-semibold",
		capt: "bg-[#f0a040] text-white font-semibold",
		ref: "bg-[#f0a040] text-white font-semibold",
		default: "bg-[#eef4f1] text-[#4a8a40]",
	};

	return (
		<span
			className={cn(
				"inline-flex items-center justify-center px-1.5 py-0.5  text-[10px] tracking-[0.08em] uppercase",
				variants[variant],
				className,
			)}
		>
			{children}
		</span>
	);
}

interface PositionBadgeProps {
	position: string;
	className?: string;
}

const POSITION_LABELS: Record<string, string> = {
	FORWARD: "F",
	WING: "W",
	CENTER: "C",
	FULL_BACK: "FB",
};

export function PositionBadge({ position, className }: PositionBadgeProps) {
	const label = POSITION_LABELS[position] || position;
	return (
		<Badge variant="position" className={className}>
			{label}
		</Badge>
	);
}
