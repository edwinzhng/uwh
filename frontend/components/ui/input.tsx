"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
	label?: string;
	hint?: string;
	error?: string;
	prefix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, label, hint, error, prefix, id, ...props }, ref) => {
		const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
		return (
			<div className="w-full">
				{label && (
					<label
						htmlFor={inputId}
						className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5"
					>
						{label}
						{hint && (
							<span className="text-[#8aab8a] ml-2 font-normal normal-case tracking-normal text-[10px]">
								— {hint}
							</span>
						)}
					</label>
				)}
				<div className="relative">
					{prefix && (
						<div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8aab8a]">
							{prefix}
						</div>
					)}
					<input
						ref={ref}
						id={inputId}
						className={cn(
							"w-full h-11  border bg-white px-3 text-sm text-[#021e00]",
							"placeholder:text-[#8aab8a]",
							" ",
							"focus:outline-none focus:border-[#298a29] focus:ring-0",
							error
								? "border-red-400"
								: "border-[#cbdbcc] hover:border-[#a0c0a0]",
							prefix && "pl-9",
							className,
						)}
						{...props}
					/>
				</div>
				{error && <p className="mt-1 text-xs text-red-500">{error}</p>}
			</div>
		);
	},
);
Input.displayName = "Input";

interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, label, error, id, ...props }, ref) => {
		const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
		return (
			<div className="w-full">
				{label && (
					<label
						htmlFor={inputId}
						className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5"
					>
						{label}
					</label>
				)}
				<textarea
					ref={ref}
					id={inputId}
					className={cn(
						"w-full  border bg-white px-3 py-2.5 text-sm text-[#021e00]",
						"placeholder:text-[#8aab8a] resize-none",
						" ",
						"focus:outline-none focus:border-[#298a29]",
						error
							? "border-red-400"
							: "border-[#cbdbcc] hover:border-[#a0c0a0]",
						className,
					)}
					{...props}
				/>
				{error && <p className="mt-1 text-xs text-red-500">{error}</p>}
			</div>
		);
	},
);
Textarea.displayName = "Textarea";
