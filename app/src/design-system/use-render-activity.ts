import { NavigationContext } from "expo-router/react-navigation";
import { useContext, useEffect, useRef } from "react";
import { appIsActive, subscribeAppActivity } from "../platform/app-activity";
import { subscribeRenderActivity } from "./render-activity";

export const useRenderActivity = (
	onChange: (active: boolean) => void,
): void => {
	const navigation = useContext(NavigationContext);
	const callback = useRef(onChange);
	callback.current = onChange;
	useEffect(
		() =>
			subscribeRenderActivity(
				[
					{ read: appIsActive, subscribe: subscribeAppActivity },
					{
						read: (): boolean => navigation?.isFocused() ?? true,
						subscribe: (notify): (() => void) => {
							const focus = navigation?.addListener("focus", notify);
							const blur = navigation?.addListener("blur", notify);
							return (): void => {
								focus?.();
								blur?.();
							};
						},
					},
				],
				(active): void => callback.current(active),
			),
		[navigation],
	);
};
