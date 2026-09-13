"use client";

import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

export const SectionReveal = ({
	children,
	className,
	id,
	labelledBy,
}: {
	children?: ReactNode;
	className: string;
	id?: string;
	labelledBy?: string;
}): ReactElement => {
	const element = useRef<HTMLElement>(null);
	const [revealed, setRevealed] = useState(false);
	useEffect((): (() => void) | undefined => {
		if (
			!element.current ||
			!globalThis.IntersectionObserver ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		)
			return;
		const observer = new IntersectionObserver(
			(entries): void => {
				if (entries.some((entry): boolean => entry.isIntersecting)) {
					setRevealed(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.05 },
		);
		observer.observe(element.current);
		return (): void => observer.disconnect();
	}, []);
	return (
		<section
			ref={element}
			id={id}
			className={`${className} section-reveal`}
			aria-labelledby={labelledBy}
			data-revealed={revealed}
		>
			{children}
		</section>
	);
};
