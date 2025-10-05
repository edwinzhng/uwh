"use client";

import { Presence } from "@radix-ui/react-presence";
import * as React from "react";

interface FadeInProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
}

export function FadeIn({
	children,
	className = "",
	delay = 0,
	duration = 150,
}: FadeInProps) {
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		const timer = setTimeout(() => setMounted(true), delay);
		return () => clearTimeout(timer);
	}, [delay]);

	return (
		<Presence present={mounted}>
			<div
				data-state={mounted ? "open" : "closed"}
				className={className}
				style={{
					animation: mounted ? `fadeIn ${duration}ms ease-in-out` : "none",
				}}
			>
				{children}
			</div>
		</Presence>
	);
}
