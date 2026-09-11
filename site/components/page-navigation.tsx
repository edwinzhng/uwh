"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactElement, useEffect, useRef, useState } from "react";

const items = [
	{ href: "/#about", label: "About", section: "about" },
	{ href: "/#schedule", label: "Schedule", section: "schedule" },
	{ href: "/#policies", label: "Policies", section: "policies" },
	{ href: "/coaches", label: "Coaches" },
];

export const PageNavigation = (): ReactElement => {
	const pathname = usePathname();
	const nav = useRef<HTMLElement>(null);
	useEffect(() => {
		const update = (): void =>
			nav.current?.style.setProperty(
				"--nav-scroll",
				`${Math.min(window.scrollY, 120)}px`,
			);
		const measure = (): void => {
			const topRow = nav.current?.parentElement;
			const controls = topRow
				? Array.from(topRow.children).filter((child) => child !== nav.current)
				: [];
			const bottom = Math.max(
				0,
				...controls.map(
					(child) => child.getBoundingClientRect().bottom + window.scrollY,
				),
			);
			nav.current?.style.setProperty("--nav-start", `${bottom + 16}px`);
		};
		measure();
		window.addEventListener("resize", measure);
		update();
		window.addEventListener("scroll", update, { passive: true });
		return (): void => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", measure);
		};
	}, []);
	const [section, setSection] = useState<string>();
	const [pending, setPending] = useState<number>();
	useEffect(() => {
		if (pending === undefined) return;
		const release = (): void => setPending(undefined);
		const timer = window.setTimeout(release, 1200);
		window.addEventListener("scrollend", release);
		return (): void => {
			window.clearTimeout(timer);
			window.removeEventListener("scrollend", release);
		};
	}, [pending]);
	useEffect(() => {
		if (pathname !== "/") return;
		const update = (): void => {
			const active = items
				.filter((item) => item.section)
				.findLast((item) => {
					const element = document.getElementById(item.section ?? "");
					return (
						element &&
						element.getBoundingClientRect().top < window.innerHeight * 0.4
					);
				});
			setSection(active?.section);
		};
		update();
		window.addEventListener("scroll", update, { passive: true });
		return (): void => window.removeEventListener("scroll", update);
	}, [pathname]);
	const selected =
		pending ??
		items.findIndex((item) =>
			item.section
				? pathname === "/" && section === item.section
				: pathname.startsWith(item.href),
		);
	return (
		<nav ref={nav} className="nav-island" aria-label="Main navigation">
			<span
				className="nav-selection"
				aria-hidden
				style={{
					width: `calc((100% - ${10 + (items.length - 1) * 8}px) / ${items.length})`,
					opacity: selected < 0 ? 0 : 1,
					transform: `translateX(calc(${Math.max(selected, 0) * 100}% + ${Math.max(selected, 0) * 8}px))`,
				}}
			/>
			{items.map((item, index) => (
				<Link
					key={item.href}
					href={item.href}
					onClick={(event): void => {
						if (
							!event.metaKey &&
							!event.ctrlKey &&
							!event.shiftKey &&
							!event.altKey
						) {
							setPending(index);
							if (item.section && pathname === "/") {
								event.preventDefault();
								window.history.replaceState(
									window.history.state,
									"",
									item.href,
								);
								document.getElementById(item.section)?.scrollIntoView({
									behavior: window.matchMedia(
										"(prefers-reduced-motion: reduce)",
									).matches
										? "instant"
										: "smooth",
									block: "start",
								});
							}
						}
					}}
					aria-current={
						selected === index
							? item.section
								? "location"
								: "page"
							: undefined
					}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
};
