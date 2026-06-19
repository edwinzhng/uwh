"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const FIELD_LABEL_CLASS =
	"block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5";

interface FieldLabelProps {
	children: ReactNode;
	htmlFor?: string;
	className?: string;
}

/** Uppercase label above a form field. Renders <label> when htmlFor is set, else <p>. */
export function FieldLabel({ children, htmlFor, className }: FieldLabelProps) {
	const classes = cn(FIELD_LABEL_CLASS, className);
	if (htmlFor) {
		return (
			<label htmlFor={htmlFor} className={classes}>
				{children}
			</label>
		);
	}
	return <p className={classes}>{children}</p>;
}
