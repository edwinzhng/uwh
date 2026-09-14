"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
	title?: string;
	icon?: LucideIcon;
	actions?: ReactNode;
	className?: string;
	bodyClassName?: string;
	children: ReactNode;
}

/** Bordered panel. Pass `title` to render the dark header bar. */
export function Card({
	title,
	icon: Icon,
	actions,
	className,
	bodyClassName,
	children,
}: CardProps) {
	return (
		<div className={cn("border border-[#cbdbcc] overflow-hidden", className)}>
			{title && (
				<div className="flex items-center gap-2 bg-[#021e00] px-5 py-3">
					{Icon && <Icon className="h-4 w-4 text-[#8aab8a]" />}
					<p className="text-[#eef4f1] text-xs font-semibold tracking-[0.12em] uppercase">
						{title}
					</p>
					{actions && <div className="ml-auto">{actions}</div>}
				</div>
			)}
			<div className={cn("bg-white p-5", bodyClassName)}>{children}</div>
		</div>
	);
}

interface CardTileProps {
	title: string;
	description?: string;
	children?: ReactNode;
	className?: string;
}

/** Compact bordered tile, e.g. an action or stat inside a Card grid. */
export function CardTile({
	title,
	description,
	children,
	className,
}: CardTileProps) {
	return (
		<div
			className={cn(
				"border border-[#cbdbcc] p-4 flex flex-col gap-3",
				className,
			)}
		>
			<div>
				<p className="text-[#021e00] font-semibold text-sm">{title}</p>
				{description && (
					<p className="text-[#8aab8a] text-xs mt-1 leading-relaxed">
						{description}
					</p>
				)}
			</div>
			{children && <div className="mt-auto">{children}</div>}
		</div>
	);
}
