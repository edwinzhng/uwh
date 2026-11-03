import { useEffect, useEffectEvent } from "react";
import { startToastLifetime } from "./toast-lifetime";

export const useToastLifetime = (
	startedAt: number,
	duration: number,
	onExpire: () => void,
	onProgress?: (remaining: number) => void,
): void => {
	const expire = useEffectEvent(onExpire);
	const progress = useEffectEvent((remaining: number): void =>
		onProgress?.(remaining),
	);
	const sampled = onProgress !== undefined;
	useEffect(
		() =>
			startToastLifetime({
				startedAt,
				duration,
				onProgress: sampled ? progress : undefined,
				onExpire: expire,
				clock: {
					now: Date.now,
					schedule: (callback, delay): (() => void) => {
						const timer = setTimeout(callback, delay);
						return (): void => clearTimeout(timer);
					},
				},
			}),
		[startedAt, duration, sampled],
	);
};
