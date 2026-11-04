import { type ReactElement, useLayoutEffect, useRef } from "react";
import { pageMotionAllowed } from "./page-motion-input";
import { playPageReveal } from "./page-reveal-playback.web";
import type { ContentRevealProps } from "./reveal-props";
import { space } from "./tokens";
import { useMotion } from "./use-motion";

export const ContentReveal = ({
	children,
	enabled = true,
	delay = 0,
	fill = false,
	gap,
}: ContentRevealProps): ReactElement => {
	const element = useRef<HTMLDivElement>(null);
	const allowed = useMotion() && enabled;
	const initial = useRef({ allowed, delay });
	const playback = useRef<Pick<Animation, "cancel"> | undefined>(undefined);
	useLayoutEffect(() => {
		const animation = element.current
			? playPageReveal(
					element.current,
					initial.current.allowed && pageMotionAllowed(),
					initial.current.delay,
				)
			: undefined;
		playback.current = animation;
		return (): void => animation?.cancel();
	}, []);
	useLayoutEffect((): void => {
		if (!allowed) playback.current?.cancel();
	}, [allowed]);
	return (
		<div
			ref={element}
			style={{
				display: "flex",
				flexDirection: "column",
				minWidth: 0,
				gap: gap ? space[gap] : undefined,
				minHeight: fill ? 0 : undefined,
				flex: fill ? 1 : undefined,
			}}
		>
			{children}
		</div>
	);
};
