"use client";

import { motion } from "@calgarycrocs/design-system/tokens";
import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useTransition,
} from "react";

const NavigationContext = createContext<(href: string) => void>(() => {});

export const usePageNavigation = (): ((href: string) => void) =>
	useContext(NavigationContext);

export const PageTransition = ({
	header,
	children,
}: {
	header: ReactNode;
	children: ReactNode;
}): ReactElement => {
	const router = useRouter();
	const pathname = usePathname();
	const [leaving, setLeaving] = useState(false);
	const [departure, setDeparture] = useState<string>();
	const [pending, startTransition] = useTransition();
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => (): void => clearTimeout(timer.current), []);
	useLayoutEffect(() => {
		if (!pathname) return;
		const frames = { first: 0, second: 0 };
		frames.first = requestAnimationFrame((): void => {
			frames.second = requestAnimationFrame((): void => setLeaving(false));
		});
		return (): void => {
			cancelAnimationFrame(frames.first);
			cancelAnimationFrame(frames.second);
		};
	}, [pathname]);
	const navigate = (href: string): void => {
		clearTimeout(timer.current);
		if (href === pathname) {
			setLeaving(false);
			return;
		}
		setLeaving(true);
		setDeparture(pathname);
		const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
			.matches
			? motion.duration.instant
			: motion.duration.standard;
		timer.current = setTimeout((): void => {
			startTransition((): void => router.push(href, { scroll: false }));
		}, duration);
	};
	return (
		<NavigationContext.Provider value={navigate}>
			{header}
			<div
				key={pathname}
				className="page-transition"
				data-leaving={leaving || pending}
				data-exiting={(leaving || pending) && departure === pathname}
			>
				{children}
			</div>
		</NavigationContext.Provider>
	);
};
