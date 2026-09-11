"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
export const PageNavigation = (): ReactElement => {
	const pathname = usePathname();
	const selected = pathname.startsWith("/coaches")
		? 0
		: pathname.startsWith("/documents")
			? 1
			: undefined;
	return (
		<nav className="nav-island" aria-label="Main navigation">
			<span
				className="nav-selection"
				aria-hidden="true"
				style={{
					opacity: selected === undefined ? 0 : 1,
					transform: `translateX(calc(${(selected ?? 0) * 100}% + ${(selected ?? 0) * 8}px))`,
				}}
			/>
			{[
				{ href: "/coaches", label: "Coaches" },
				{ href: "/documents", label: "Documents" },
			].map((item, index) => (
				<Link
					key={item.href}
					href={item.href}
					aria-current={selected === index ? "page" : undefined}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
};
