import { type ReactElement, useCallback, useRef } from "react";
import { playPageReveal } from "./page-reveal-playback.web";
import type { ContentRevealProps } from "./reveal-props";
import { space } from "./tokens";
import {
	useContentRevealEnvironment,
	useContentRevealPlayback,
} from "./use-content-reveal";

export const ContentReveal = ({
	children,
	enabled = true,
	delay = 0,
	fill = false,
	gap,
}: ContentRevealProps): ReactElement => {
	const element = useRef<HTMLDivElement>(null);
	const playback = useRef<Pick<Animation, "cancel"> | undefined>(undefined);
	const environment = useContentRevealEnvironment(enabled);
	const show = useCallback((): void => {
		playback.current?.cancel();
		playback.current = undefined;
		if (element.current) element.current.style.opacity = "1";
	}, []);
	const play = useCallback((): void => {
		if (!element.current) return;
		element.current.style.opacity = "1";
		playback.current = playPageReveal(element.current, true, delay);
	}, [delay]);
	useContentRevealPlayback(environment, play, show);
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
				opacity: environment.eligible ? 0 : 1,
			}}
		>
			{children}
		</div>
	);
};
