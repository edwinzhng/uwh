import { type RefObject, useEffect, useRef } from "react";
import type { ScrollView } from "react-native";

export const useScrollRevealInput = (
	ref: RefObject<ScrollView | null>,
	enabled: boolean,
	interrupt: () => void,
): void => {
	const handler = useRef(interrupt);
	handler.current = interrupt;
	useEffect(() => {
		if (!enabled) return;
		const element = ref.current?.getScrollableNode();
		if (!(element instanceof HTMLElement)) return;
		const stop = (): void => handler.current();
		element.addEventListener("wheel", stop, { passive: true });
		element.addEventListener("pointerdown", stop, { passive: true });
		return (): void => {
			element.removeEventListener("wheel", stop);
			element.removeEventListener("pointerdown", stop);
		};
	}, [enabled, ref]);
};
