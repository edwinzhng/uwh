import type { ReactElement } from "react";
import { useReduceTransparency } from "./material-accessibility";
import { headerFade } from "./materials";
import { useTheme } from "./theme";

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
				pointerEvents: "none",
				background: opaque
					? theme.background.primary
					: `linear-gradient(${theme.background.primary}33, ${theme.background.primary}00)`,
				backdropFilter: opaque ? undefined : "blur(4px)",
				WebkitBackdropFilter: opaque ? undefined : "blur(4px)",
				maskImage: opaque
					? undefined
					: `linear-gradient(black ${headerFade.start * 100}%, transparent ${headerFade.end * 100}%)`,
				WebkitMaskImage: opaque
					? undefined
					: `linear-gradient(black ${headerFade.start * 100}%, transparent ${headerFade.end * 100}%)`,
			}}
		/>
	);
};
