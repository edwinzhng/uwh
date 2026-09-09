import { useEffect, useEffectEvent } from "react";
import { AppState } from "react-native";

export const useAppInactive = (onInactive: () => void): void => {
	const notify = useEffectEvent(onInactive);
	useEffect(() => {
		const listener = AppState.addEventListener("change", (state): void => {
			if (state !== "active") notify();
		});
		return (): void => listener.remove();
	}, []);
};
