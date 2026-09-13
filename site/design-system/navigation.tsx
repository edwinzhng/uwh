"use client";
import Link from "next/link";
import type { ReactElement } from "react";

type NavigationItem = {
	label: string;
	href?: string;
	current?: "page" | "location";
	onSelect?: () => void;
	onNavigate?: () => void;
};
export const Navigation = ({
	items,
	selected,
}: {
	items: NavigationItem[];
	selected?: number;
}): ReactElement => (
	<nav className="nav-island" aria-label="Main navigation">
		<span
			className="nav-selection"
			aria-hidden="true"
			style={{
				opacity: selected === undefined ? 0 : 1,
				transform: `translateX(calc(${(selected ?? 0) * 100}% + ${(selected ?? 0) * 4}px))`,
			}}
		/>
		{items.map((item) =>
			item.href ? (
				<Link
					key={item.label}
					href={item.href}
					aria-current={item.current}
					scroll={false}
					onClick={item.onSelect}
					onNavigate={
						item.onNavigate
							? (event): void => {
									event.preventDefault();
									item.onNavigate?.();
								}
							: undefined
					}
				>
					{item.label}
				</Link>
			) : (
				<button
					key={item.label}
					type="button"
					aria-current={item.current}
					onClick={item.onSelect}
				>
					{item.label}
				</button>
			),
		)}
	</nav>
);
