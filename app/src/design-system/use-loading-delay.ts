import { useLayoutEffect, useMemo, useState } from "react";
import { createLoadingDelay } from "./loading-delay";
import { motion } from "./tokens";

export const useLoadingDelay = (loading: boolean): boolean => {
	const [visible, setVisible] = useState(false);
	const controller = useMemo(
		() =>
			createLoadingDelay({
				delay: motion.duration.fast,
				onChange: setVisible,
				schedule: (callback, delay): (() => void) => {
					const timer = setTimeout(callback, delay);
					return (): void => clearTimeout(timer);
				},
			}),
		[],
	);
	useLayoutEffect(
		(): void => controller.update(loading),
		[controller, loading],
	);
	useLayoutEffect(() => (): void => controller.dispose(), [controller]);
	return loading && visible;
};
