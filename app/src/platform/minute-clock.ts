import { startMinuteTimer } from "../shared/minute-timer";
import { createSharedSubscription } from "../shared/shared-subscription";
import { appIsActive, subscribeAppActivity } from "./app-activity";

export const currentMinute = (): number =>
	Math.floor(Date.now() / 60000) * 60000;
export const subscribeMinute = createSharedSubscription((notify) => {
	const state: { stop?: () => void } = {};
	const sync = (): void => {
		state.stop?.();
		state.stop = appIsActive()
			? startMinuteTimer(notify, {
					now: Date.now,
					schedule: (callback, delay): (() => void) => {
						const timer = setTimeout(callback, delay);
						return (): void => clearTimeout(timer);
					},
				})
			: undefined;
		notify();
	};
	const unsubscribe = subscribeAppActivity(sync);
	sync();
	return (): void => {
		state.stop?.();
		unsubscribe();
	};
});
