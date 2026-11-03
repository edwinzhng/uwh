export type ClockScheduler = {
	now: () => number;
	schedule: (notify: () => void, delay: number) => () => void;
};
export const nextMinuteDelay = (now: number): number =>
	60000 - (((now % 60000) + 60000) % 60000);
export const nextClockBoundary = (
	boundaries: readonly (number | undefined)[],
	now: number,
): number | undefined =>
	boundaries.reduce<number | undefined>(
		(next, boundary) =>
			boundary !== undefined &&
			boundary > now &&
			boundary - now <= 60000 &&
			(next === undefined || boundary < next)
				? boundary
				: next,
		undefined,
	);
export const startMinuteTimer = (
	notify: () => void,
	clock: ClockScheduler,
): (() => void) => {
	const state: { cancel?: () => void; active: boolean } = { active: true };
	const schedule = (): void => {
		if (!state.active) return;
		state.cancel = clock.schedule(() => {
			notify();
			schedule();
		}, nextMinuteDelay(clock.now()));
	};
	schedule();
	return (): void => {
		state.active = false;
		state.cancel?.();
	};
};
