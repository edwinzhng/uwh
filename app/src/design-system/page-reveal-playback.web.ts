import { motion } from "./tokens";

export const playPageReveal = (
	element: {
		animate: (
			frames: Keyframe[],
			options: KeyframeAnimationOptions,
		) => Pick<Animation, "cancel">;
	},
	enabled: boolean,
): Pick<Animation, "cancel"> | undefined =>
	enabled && typeof element.animate === "function"
		? element.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: motion.duration.slow,
				easing: `cubic-bezier(${motion.easing.out.join(",")})`,
			})
		: undefined;
