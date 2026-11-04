import { useLayoutEffect, useMemo, useState } from "react";
import { createLoadingHold } from "./loading-hold";

export const useLoadingHold = (loading: boolean, minimum: number): boolean => {
	const [visible, setVisible] = useState(loading);
	const hold = useMemo(
		() =>
			createLoadingHold({
				minimum,
				onChange: setVisible,
				clock: {
					now: (): number => performance.now(),
					schedule: (callback, delay): (() => void) => {
						const timer = setTimeout(callback, delay);
						return (): void => clearTimeout(timer);
					},
				},
			}),
		[minimum],
	);
	useLayoutEffect((): void => hold.setLoading(loading), [hold, loading]);
	useLayoutEffect(() => (): void => hold.dispose(), [hold]);
	return loading || visible;
};
