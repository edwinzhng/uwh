import type { ToastCopy } from "./toast-messages";

export type ToastKind = "success" | "error" | "warning" | "info";
export type ToastViewProps = {
	copy: ToastCopy;
	kind: ToastKind;
	startedAt: number;
	duration: number;
	onExpire: () => void;
};
export const defaultToastDuration = 5000;
export const toastDuration = (value?: number): number =>
	value !== undefined && Number.isFinite(value) && value > 0
		? value
		: defaultToastDuration;
export const toastRemaining = (
	startedAt: number,
	duration: number,
	now: number,
): number => Math.max(0, Math.min(1, (startedAt + duration - now) / duration));

type Clock = {
	now: () => number;
	schedule: (callback: () => void, delay: number) => () => void;
};
export const startToastLifetime = ({
	startedAt,
	duration,
	clock,
	onProgress,
	onExpire,
}: {
	startedAt: number;
	duration: number;
	clock: Clock;
	onProgress?: (remaining: number) => void;
	onExpire: () => void;
}): (() => void) => {
	const lifetime: { active: boolean; cancel?: () => void } = { active: true };
	const tick = (): void => {
		if (!lifetime.active) return;
		const remaining = toastRemaining(startedAt, duration, clock.now());
		onProgress?.(remaining);
		if (remaining === 0) {
			lifetime.active = false;
			onExpire();
			return;
		}
		lifetime.cancel = clock.schedule(
			tick,
			onProgress ? Math.min(100, remaining * duration) : remaining * duration,
		);
	};
	tick();
	return (): void => {
		lifetime.active = false;
		lifetime.cancel?.();
	};
};
