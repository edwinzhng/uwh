import { useContext, useLayoutEffect, useRef } from "react";
import { createContentRevealState } from "./content-reveal-state";
import {
	LoadingCoveredContext,
	PageContentReadyContext,
} from "./loading-state";
import { pageMotionAllowed } from "./page-motion-input";
import { MotionSettingsReadyContext, useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";

export const useContentRevealEnvironment = (
	enabled: boolean,
): { eligible: boolean; ready: boolean; active: boolean; animate: boolean } => {
	const pageReady = useContext(PageContentReadyContext);
	const covered = useContext(LoadingCoveredContext);
	const settingsReady = useContext(MotionSettingsReadyContext);
	const motion = useMotion();
	const active = useScreenActive();
	const eligible = useRef(enabled && (pageReady !== true || covered));
	return {
		eligible: eligible.current,
		ready: pageReady !== false && !covered && settingsReady,
		active,
		animate: enabled && motion && pageMotionAllowed(),
	};
};

export const useContentRevealPlayback = (
	environment: ReturnType<typeof useContentRevealEnvironment>,
	play: () => void,
	show: () => void,
): void => {
	const controller = useRef(createContentRevealState());
	const { eligible, ready, active, animate } = environment;
	useLayoutEffect(() => {
		const action = controller.current.update({
			eligible,
			ready,
			active,
			animate,
		});
		if (action === "play") play();
		else if (action === "show") show();
		return action === "play" ? show : undefined;
	}, [eligible, ready, active, animate, play, show]);
};
