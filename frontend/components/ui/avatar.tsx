"use client";

import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
	name: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function Avatar({
	name,
	size = "md",
	className,
	bgClass = "bg-[#cbdbcc]",
	textClass = "text-[#4a8a40]",
}: AvatarProps & { bgClass?: string; textClass?: string }) {
	const initials = getInitials(name);

	const sizes = {
		sm: "h-8 w-8 text-xs",
		md: "h-10 w-10 text-sm",
		lg: "h-12 w-12 text-base",
	};

	return (
		<div
			className={cn(
				"flex items-center justify-center font-medium",
				bgClass,
				textClass,
				sizes[size],
				className,
			)}
		>
			{initials}
		</div>
	);
}
