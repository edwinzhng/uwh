import type { ReactElement } from "react";
import { useReduceTransparency } from "./material-accessibility";
import { useTheme } from "./theme";
import { space } from "./tokens";

export const HeaderBackdrop = ({
	topInset = 0,
}: {
	topInset?: number;
}): ReactElement => {
	const theme = useTheme();
	const opaque = useReduceTransparency();
	return (
		<div
			aria-hidden
			style={{
				position: "absolute",
				inset: 0,
				top: -topInset,
				bottom: opaque ? 0 : -space.lg,
				pointerEvents: "none",
				background: opaque
					? theme.background.primary
					: `linear-gradient(${theme.background.primary}33, ${theme.background.primary}00)`,
				backdropFilter: opaque ? undefined : "blur(4px)",
				WebkitBackdropFilter: opaque ? undefined : "blur(4px)",
				maskImage: opaque
					? undefined
					: "linear-gradient(black 60%, transparent)",
				WebkitMaskImage: opaque
					? undefined
					: "linear-gradient(black 60%, transparent)",
			}}
		/>
	);
};
