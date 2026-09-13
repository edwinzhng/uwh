import type { ReactElement } from "react";
export const SocialIcon = ({
	name,
}: {
	name: "Facebook" | "Instagram";
}): ReactElement =>
	name === "Facebook" ? (
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.972h-1.513c-1.491 0-1.956.931-1.956 1.887v2.262h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
		</svg>
	) : (
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			aria-hidden="true"
		>
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4" />
			<circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
		</svg>
	);
