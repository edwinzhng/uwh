import { useEffect, useReducer, useSyncExternalStore } from "react";
import { appIsActive, subscribeAppActivity } from "../platform/app-activity";
import { currentMinute, subscribeMinute } from "../platform/minute-clock";
import { nextClockBoundary } from "../shared/minute-timer";

export const useClubNow = (
	boundaries?: readonly (number | undefined)[],
): number => {
	useSyncExternalStore(subscribeAppActivity, appIsActive, appIsActive);
	const minute = useSyncExternalStore(
		subscribeMinute,
		currentMinute,
		currentMinute,
	);
	const [, refresh] = useReducer((revision: number): number => revision + 1, 0);
	const now = boundaries ? Date.now() : minute;
	const boundary = nextClockBoundary(boundaries ?? [], now);
	useEffect(() => {
		if (boundary === undefined) return;
		const timer = setTimeout(refresh, Math.max(0, boundary - Date.now()));
		return (): void => clearTimeout(timer);
	}, [boundary]);
	return now;
};
