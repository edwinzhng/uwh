import { createSharedSubscription } from "../shared/shared-subscription";
import { appIsActive, subscribeAppActivity } from "./app-activity";

export const currentMinute = (): number =>
	Math.floor(Date.now() / 60000) * 60000;
export const subscribeMinute = createSharedSubscription((notify) => {
	const state: { timer?: ReturnType<typeof setInterval> } = {};
	const sync = (): void => {
		if (state.timer !== undefined) clearInterval(state.timer);
		state.timer = appIsActive() ? setInterval(notify, 60000) : undefined;
		notify();
	};
	const unsubscribe = subscribeAppActivity(sync);
	sync();
	return (): void => {
		if (state.timer !== undefined) clearInterval(state.timer);
		unsubscribe();
	};
});
