"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
	checked: boolean;
	onChange: () => void;
	className?: string;
}

export function Checkbox({ checked, onChange, className }: CheckboxProps) {
	return (
		<label
			className={cn(
				"relative h-[14px] w-[14px] flex-shrink-0 block cursor-pointer",
				className,
			)}
		>
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
				onClick={(e) => e.stopPropagation()}
				className="sr-only"
			/>
			<span
				className={cn(
					"absolute inset-0 flex items-center justify-center border transition-colors",
					checked
						? "bg-[#021e00] border-[#021e00]"
						: "bg-white border-[#cbdbcc] hover:border-[#021e00]",
				)}
				aria-hidden="true"
			>
				{checked && <Check className="h-2.5 w-2.5 text-[#eef4f1] stroke-[3]" />}
			</span>
		</label>
	);
}
