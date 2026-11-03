import type { ReactElement } from "react";
import { useTheme } from "./theme";
import { corners, geometry, motion, progressColors } from "./tokens";
import { useMotion } from "./use-motion";

type Props = { label: string; value: number; max: number };

export const Progress = ({ label, value, max }: Props): ReactElement => {
	const theme = useTheme();
	const animate = useMotion();
	const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
	return (
		<div
			role="progressbar"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={value}
			style={{
				height: geometry.progress,
				background: theme.background.secondary,
				borderRadius: corners.pill,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					height: "100%",
					borderRadius: "inherit",
					background: `linear-gradient(90deg, ${progressColors.join(",")})`,
					transform: `scaleX(${fraction})`,
					transformOrigin: "left center",
					transitionProperty: "transform",
					transitionDuration: `${animate ? motion.duration.slow : motion.duration.instant}ms`,
					transitionTimingFunction: `cubic-bezier(${motion.easing.out.join(",")})`,
				}}
			/>
		</div>
	);
};
