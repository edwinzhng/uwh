import type { ReactElement } from "react";
import { useReduceTransparency } from "./material-accessibility";
import { headerFade } from "./materials";
import { useTheme } from "./theme";

export const HeaderBackdrop = ({
	topInset = 0,
	edge = "top",
	fadeInset = 0,
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
				top: edge === "top" ? -topInset : -fadeInset,
				bottom: edge === "top" ? -fadeInset : -topInset,
				pointerEvents: "none",
				background: opaque
					? theme.background.primary
					: `linear-gradient(${edge === "top" ? "to bottom" : "to top"}, ${theme.background.primary}33, ${theme.background.primary}00)`,
				backdropFilter: opaque ? undefined : "blur(4px)",
				WebkitBackdropFilter: opaque ? undefined : "blur(4px)",
				maskImage: opaque
					? undefined
					: `linear-gradient(${edge === "top" ? "to bottom" : "to top"}, black ${headerFade.start * 100}%, transparent ${headerFade.end * 100}%)`,
				WebkitMaskImage: opaque
					? undefined
					: `linear-gradient(${edge === "top" ? "to bottom" : "to top"}, black ${headerFade.start * 100}%, transparent ${headerFade.end * 100}%)`,
			}}
		/>
	);
};
