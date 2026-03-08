"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = "primary",
			size = "md",
			loading,
			disabled,
			children,
			...props
		},
		ref,
	) => {
		const base =
			"inline-flex items-center justify-center font-medium tracking-[0.08em] uppercase text-xs   cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";

		const variants = {
			primary:
				"bg-[#021e00] text-[#eef4f1] hover:bg-[#0a3a00] border border-[#021e00]",
			secondary:
				"bg-[#298a29] text-white hover:bg-[#1f6b1f] border border-[#298a29]",
			outline:
				"bg-transparent text-[#021e00] border border-[#021e00] hover:bg-[#021e00] hover:text-[#eef4f1]",
			ghost:
				"bg-transparent text-[#4a8a40] hover:bg-[#eef4f1] border border-transparent",
			destructive:
				"bg-red-600 text-white hover:bg-red-700 border border-red-600",
		};

		const sizes = {
			sm: "h-8 px-3 text-[10px]",
			md: "h-11 px-6",
			lg: "h-12 px-8",
		};

		return (
			<button
				ref={ref}
				disabled={disabled || loading}
				className={cn(base, variants[variant], sizes[size], className)}
				{...props}
			>
				{loading ? (
					<span className="flex items-center gap-2">
						<span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
						{children}
					</span>
				) : (
					children
				)}
			</button>
		);
	},
);
Button.displayName = "Button";
