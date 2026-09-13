"use client";

import { usePathname } from "next/navigation";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { Navigation, usePageNavigation } from "../design-system";
import { activeSectionForScroll } from "../lib/active-section";
import { coachesEnabled } from "../lib/features";

const sections = [
	{ id: "about", label: "About" },
	{ id: "schedule", label: "Schedule" },
	{ id: "policies", label: "Policies" },
];

export const PageNavigation = (): ReactElement => {
	const pathname = usePathname();
	const navigate = usePageNavigation();
	const [destination, setDestination] = useState<string>();
	const [openingCoaches, setOpeningCoaches] = useState(false);
	const [activeSection, setActiveSection] = useState<number>();
	const pendingSection = useRef<string | undefined>(undefined);
	const selected = destination
		? sections.findIndex((section): boolean => section.id === destination)
		: openingCoaches || pathname === "/coaches"
			? 3
			: activeSection;
	useEffect(() => {
		if (pathname !== "/") return;
		const frame = { id: 0 };
		const update = (): void => {
			frame.id = 0;
			const nav = document.querySelector(".nav-island");
			const threshold = (nav?.getBoundingClientRect().bottom ?? 72) + 24;
			const headings = sections.map(({ id }) =>
				document.getElementById(id)?.querySelector("h2, h1"),
			);
			const pending = pendingSection.current;
			if (pending) {
				const heading = document
					.getElementById(pending)
					?.querySelector("h2, h1");
				if (
					heading &&
					Math.abs(
						heading.getBoundingClientRect().top -
							Number.parseFloat(getComputedStyle(heading).scrollMarginTop),
					) > 12
				)
					return;
				pendingSection.current = undefined;
			}
			const tops = headings.map(
				(heading): number | undefined => heading?.getBoundingClientRect().top,
			);
			setActiveSection((current): number | undefined =>
				activeSectionForScroll(tops, threshold, current),
			);
		};
		const schedule = (): void => {
			if (!frame.id) frame.id = requestAnimationFrame(update);
		};
		const release = (): void => {
			pendingSection.current = undefined;
			schedule();
		};
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		window.addEventListener("scrollend", schedule);
		window.addEventListener("wheel", release, { passive: true });
		window.addEventListener("touchstart", release, { passive: true });
		schedule();
		return (): void => {
			cancelAnimationFrame(frame.id);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			window.removeEventListener("scrollend", schedule);
			window.removeEventListener("wheel", release);
			window.removeEventListener("touchstart", release);
		};
	}, [pathname]);
	useEffect((): void => {
		setOpeningCoaches(false);
		if (pathname === "/coaches")
			window.scrollTo({ top: 0, behavior: "instant" });
	}, [pathname]);
	useEffect(() => {
		const previous = window.history.scrollRestoration;
		window.history.scrollRestoration = "manual";
		window.scrollTo({ top: 0, behavior: "instant" });
		return (): void => {
			window.history.scrollRestoration = previous;
		};
	}, []);
	useEffect(() => {
		if (pathname !== "/" || !destination) return;
		const frame = requestAnimationFrame((): void => {
			const section = document.getElementById(destination);
			const heading = section?.querySelector("h2, h1") ?? section;
			heading?.scrollIntoView({
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "instant"
					: "smooth",
				block: "start",
			});
			setDestination(undefined);
		});
		return (): void => cancelAnimationFrame(frame);
	}, [pathname, destination]);
	return (
		<Navigation
			selected={selected}
			items={[
				...sections.map((section, index) => ({
					label: section.label,
					current: selected === index ? ("location" as const) : undefined,
					onSelect: (): void => {
						setOpeningCoaches(false);
						pendingSection.current = section.id;
						setActiveSection(index);
						setDestination(section.id);
						navigate("/");
					},
				})),
				...(coachesEnabled
					? [
							{
								label: "Coaches",
								href: "/coaches",
								onNavigate: (): void => {
									navigate("/coaches");
									if (pathname === "/coaches")
										window.scrollTo({ top: 0, behavior: "smooth" });
								},
								onSelect: (): void => {
									setOpeningCoaches(true);
									pendingSection.current = undefined;
									setDestination(undefined);
								},
								current: selected === 3 ? ("page" as const) : undefined,
							},
						]
					: []),
			]}
		/>
	);
};
