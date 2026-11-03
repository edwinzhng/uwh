import { geometry, space } from "./tokens";

type SwipeMotion = {
	translationX: number;
	translationY: number;
	velocityX: number;
	velocityY: number;
};
export type ToastSwipeDirection = "left" | "right" | "bottom";

export const toastSwipeDirection = (
	motion: SwipeMotion,
): ToastSwipeDirection | undefined => {
	"worklet";
	const horizontal = Math.abs(motion.translationX);
	const vertical = Math.abs(motion.translationY);
	if (horizontal >= vertical && horizontal >= space.xs) {
		const continuing = motion.translationX * motion.velocityX > 0;
		return horizontal >= geometry.touch ||
			(continuing && Math.abs(motion.velocityX) >= 600)
			? motion.translationX < 0
				? "left"
				: "right"
			: undefined;
	}
	if (motion.translationY >= space.xs && vertical > horizontal)
		return vertical >= geometry.touch || motion.velocityY >= 600
			? "bottom"
			: undefined;
	return undefined;
};
