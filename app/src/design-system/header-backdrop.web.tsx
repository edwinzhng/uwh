import type { ReactElement } from "react";
import { useReduceTransparency } from "./material-accessibility";
import { useTheme } from "./theme";
import { space } from "./tokens";

export const HeaderBackdrop = ({
	topInset = 0,
	edge = "top",
	fadeInset = space.md,
}: {
	topInset?: number;
	edge?: "top" | "bottom";
	fadeInset?: number;
}): ReactElement => {
	const theme = useTheme();
	const opaque = useReduceTransparency();
	return (
		<div
			aria-hidden
			style={{
				position: "absolute",
				inset: 0,
				top: edge === "top" ? -topInset : opaque ? 0 : -fadeInset,
				bottom: edge === "top" ? (opaque ? 0 : -fadeInset) : -topInset,
				pointerEvents: "none",
				background: opaque
					? theme.background.primary
					: `linear-gradient(${edge === "top" ? "to bottom" : "to top"}, ${theme.background.primary}33 calc(100% - ${fadeInset}px), ${theme.background.primary}00)`,
				backdropFilter: opaque ? undefined : "blur(4px)",
				WebkitBackdropFilter: opaque ? undefined : "blur(4px)",
				maskImage: opaque
					? undefined
					: `linear-gradient(${edge === "top" ? "to bottom" : "to top"}, black calc(100% - ${fadeInset}px), transparent 100%)`,
				WebkitMaskImage: opaque
					? undefined
					: `linear-gradient(${edge === "top" ? "to bottom" : "to top"}, black calc(100% - ${fadeInset}px), transparent 100%)`,
			}}
		/>
	);
};
