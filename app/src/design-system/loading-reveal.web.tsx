import type { ReactElement } from "react";
import type { LoadingRevealProps } from "./loading-reveal-props";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";
export const LoadingReveal = ({
	ready,
	distance = 0,
	children,
	wordmark = false,
}: LoadingRevealProps): ReactElement => {
	const enabled = useMotion();
	return (
		<div
			style={{
				width: "100%",
				opacity: wordmark ? (ready ? 0.9 : 1) : ready ? 1 : 0,
				transform: `translateY(${wordmark && ready ? distance : 0}px)`,
				transitionProperty: "transform, opacity",
				transitionDuration: `${enabled ? (wordmark ? motion.duration.extended : motion.duration.slow) : motion.duration.instant}ms`,
				transitionTimingFunction: `cubic-bezier(${motion.easing.out.join(",")})`,
			}}
		>
			{children}
		</div>
	);
};
