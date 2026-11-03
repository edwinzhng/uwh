import {
	type ReactElement,
	useCallback,
	useContext,
	useLayoutEffect,
	useRef,
} from "react";
import { pageMotionAllowed } from "./page-motion-input.web";
import { PageRevealContext } from "./page-reveal-context";
import { playPageReveal } from "./page-reveal-playback.web";
import type { PageRevealProps } from "./reveal-props";
import { space } from "./tokens";
import { useMotion } from "./use-motion";
import { usePageReveal } from "./use-page-reveal";

export const PageReveal = ({
	children,
	fill = false,
	gap,
	enabled = true,
	replayOnFocus = true,
	replayKey,
}: PageRevealProps): ReactElement => {
	const motionEnabled = useMotion();
	const nested = useContext(PageRevealContext);
	const element = useRef<HTMLDivElement>(null);
	const animation = useRef<Pick<Animation, "cancel"> | undefined>(undefined);
	const animate = motionEnabled && enabled && (!nested || !replayOnFocus);
	const stop = useCallback((): void => {
		animation.current?.cancel();
		animation.current = undefined;
	}, []);
	const reveal = useCallback((): void => {
		stop();
		if (element.current)
			animation.current = playPageReveal(
				element.current,
				animate && pageMotionAllowed(),
			);
	}, [animate, stop]);
	usePageReveal({ replayOnFocus, replayKey, nested, reveal, stop });
	useLayoutEffect((): void => {
		if (!animate) stop();
	}, [animate, stop]);
	return (
		<PageRevealContext value={true}>
			<div
				ref={element}
				style={{
					display: "flex",
					flexDirection: "column",
					flex: fill ? 1 : undefined,
					minHeight: fill ? 0 : undefined,
					minWidth: 0,
					gap: gap === "none" ? space.none : fill ? space.md : space.xl,
				}}
			>
				{children}
			</div>
		</PageRevealContext>
	);
};
