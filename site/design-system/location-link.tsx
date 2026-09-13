import type { ReactElement } from "react";

type LocationLinkProps = { name: string; address: string; href: string };
export const LocationLink = ({
	name,
	address,
	href,
}: LocationLinkProps): ReactElement => (
	<a
		className="pool-location"
		href={href}
		target="_blank"
		rel="noopener noreferrer"
	>
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			aria-hidden="true"
		>
			<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
			<circle cx="12" cy="10" r="2.5" />
		</svg>
		<span>
			<span className="pool-name">{name}</span>
			<span className="pool-address">{address}</span>
		</span>
	</a>
);
