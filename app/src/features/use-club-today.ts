import { useSyncExternalStore } from "react";
import { useApp } from "../demo/app-state";
import { clubDate } from "../domain/event-time";
import { subscribeMinute } from "../platform/minute-clock";

export const useClubToday = (): string => {
	const { data } = useApp();
	const today = (): string => clubDate(Date.now(), data.timeZone);
	return useSyncExternalStore(subscribeMinute, today, today);
};
