"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps
	extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
	label?: string;
	description?: string;
}

export function Switch({
	label,
	description,
	className,
	...props
}: SwitchProps) {
	return (
		<div className="flex items-center justify-between gap-4">
			{(label || description) && (
				<div>
					{label && (
						<p className="text-sm font-medium text-[#021e00]">{label}</p>
					)}
					{description && (
						<p className="text-xs text-[#4a8a40] mt-0.5">{description}</p>
					)}
				</div>
			)}
			<SwitchPrimitive.Root
				className={cn(
					"relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#298a29]",
					"data-[state=checked]:bg-[#298a29] data-[state=unchecked]:bg-[#cbdbcc]",
					"disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			>
				<SwitchPrimitive.Thumb
					className={cn(
						"block h-5 w-5 bg-white shadow-sm",
						"data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
					)}
				/>
			</SwitchPrimitive.Root>
		</div>
	);
}
