import { useEffect, useState } from "react";
import {
	trackViewport,
	type ViewportMetrics,
	type ViewportObservation,
	type ViewportState,
} from "./viewport-metrics";

const editableFocused = (): boolean => {
	const element = document.activeElement;
	return (
		(element instanceof HTMLInputElement &&
			!element.disabled &&
			!element.readOnly &&
			!["button", "checkbox", "radio", "submit", "reset", "file"].includes(
				element.type,
			)) ||
		(element instanceof HTMLTextAreaElement &&
			!element.disabled &&
			!element.readOnly) ||
		(element instanceof HTMLElement && element.isContentEditable)
	);
};

const currentViewport = (): ViewportObservation => ({
	width: window.innerWidth,
	height: window.innerHeight,
	visualHeight: window.visualViewport?.height,
	visualTop: window.visualViewport?.offsetTop,
	scale: window.visualViewport?.scale,
	focused: editableFocused(),
});

export const useVisibleViewport = (enabled = true): ViewportMetrics => {
	const [viewport, setViewport] = useState<ViewportState>(() =>
		trackViewport(
			undefined,
			typeof window === "undefined"
				? { width: 0, height: 0, focused: false }
				: currentViewport(),
		),
	);
	useEffect(() => {
		if (!enabled) return;
		const state: {
			frame?: number;
		} = {};
		const update = (): void => {
			if (state.frame !== undefined) cancelAnimationFrame(state.frame);
			state.frame = requestAnimationFrame(() => {
				state.frame = undefined;
				const next = currentViewport();
				setViewport((previous) => trackViewport(previous, next));
			});
		};
		window.addEventListener("resize", update);
		window.visualViewport?.addEventListener("resize", update);
		window.visualViewport?.addEventListener("scroll", update);
		document.addEventListener("focusin", update);
		document.addEventListener("focusout", update);
		update();
		return (): void => {
			if (state.frame !== undefined) cancelAnimationFrame(state.frame);
			window.removeEventListener("resize", update);
			window.visualViewport?.removeEventListener("resize", update);
			window.visualViewport?.removeEventListener("scroll", update);
			document.removeEventListener("focusin", update);
			document.removeEventListener("focusout", update);
		};
	}, [enabled]);
	return viewport.metrics;
};
