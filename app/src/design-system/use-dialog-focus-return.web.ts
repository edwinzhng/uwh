import { useEffect, useRef } from "react";

export const useDialogFocusReturn = (): void => {
	const trigger = useRef(
		typeof document === "undefined" ? undefined : document.activeElement,
	);
	useEffect(
		() => (): void => {
			const target = trigger.current;
			if (!(target instanceof HTMLElement)) return;
			queueMicrotask((): void => {
				if (
					target.isConnected &&
					(!document.activeElement || document.activeElement === document.body)
				)
					target.focus({ preventScroll: true });
			});
		},
		[],
	);
};
