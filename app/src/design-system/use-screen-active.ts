import { NavigationContext } from "expo-router/react-navigation";
import { useCallback, useContext, useSyncExternalStore } from "react";
import { appIsActive, subscribeAppActivity } from "../platform/app-activity";

export const useScreenActive = (): boolean => {
	const navigation = useContext(NavigationContext);
	const subscribe = useCallback(
		(notify: () => void): (() => void) => {
			const focus = navigation?.addListener("focus", notify);
			const blur = navigation?.addListener("blur", notify);
			return (): void => {
				focus?.();
				blur?.();
			};
		},
		[navigation],
	);
	const focused = useSyncExternalStore(
		subscribe,
		useCallback((): boolean => navigation?.isFocused() ?? true, [navigation]),
		(): boolean => true,
	);
	const active = useSyncExternalStore(
		subscribeAppActivity,
		appIsActive,
		(): boolean => true,
	);
	return focused && active;
};
