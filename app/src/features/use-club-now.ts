import { useSyncExternalStore } from "react";
import { currentMinute, subscribeMinute } from "../platform/minute-clock";

export const useClubNow = (): number =>
	useSyncExternalStore(subscribeMinute, currentMinute, currentMinute);
