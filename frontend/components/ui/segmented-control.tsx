"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
	options: { label: string; value: T; badge?: number }[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
	size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	className,
	size = "md",
}: SegmentedControlProps<T>) {
	return (
		<div
			className={cn(
				"inline-flex  border border-[#cbdbcc] overflow-hidden",
				className,
			)}
		>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					className={cn(
						"relative px-4 font-semibold tracking-[0.08em] uppercase text-xs  cursor-pointer",
						size === "sm" ? "h-8 px-3" : "h-10 px-5",
						value === option.value
							? "bg-[#021e00] text-[#eef4f1]"
							: "bg-white text-[#021e00] hover:bg-[#eef4f1]",
					)}
				>
					{option.label}
					{option.badge !== undefined && (
						<span
							className={cn(
								"ml-1.5 inline-flex items-center justify-center  text-[9px] h-4 w-4",
								value === option.value
									? "bg-[#298a29] text-white"
									: "bg-[#cbdbcc] text-[#4a8a40]",
							)}
						>
							{option.badge}
						</span>
					)}
				</button>
			))}
		</div>
	);
}
