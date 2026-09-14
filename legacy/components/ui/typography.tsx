"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/** Muted helper/metadata text. */
export function Muted({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<"p">) {
	return (
		<p className={cn("text-[#8aab8a] text-xs", className)} {...props}>
			{children}
		</p>
	);
}

/** Uppercase tracked label for table headers and section eyebrows. */
export function SectionLabel({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<"span">) {
	return (
		<span
			className={cn(
				"text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]",
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}
