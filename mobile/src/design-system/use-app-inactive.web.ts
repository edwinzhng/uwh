import { useEffect, useEffectEvent } from "react";

export const useAppInactive = (onInactive: () => void): void => {
	const notify = useEffectEvent(onInactive);
	useEffect(() => {
		const change = (): void => {
			if (document.hidden) notify();
		};
		document.addEventListener("visibilitychange", change);
		return (): void => document.removeEventListener("visibilitychange", change);
	}, []);
};
