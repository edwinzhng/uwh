import type { ReactElement } from "react";
import { useTheme } from "./theme";

export const NavigationHighlight = (): ReactElement => {
	const light = useTheme().background.primary === "#FFFFFF";
	return (
		<div
			aria-hidden
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				boxShadow: light
					? "0 3px 9px rgba(25,45,40,0.14)"
					: "0 2px 5px rgba(0,0,0,0.18)",
				borderRadius: "inherit",
				backgroundColor: light
					? "rgba(255,255,255,0.38)"
					: "rgba(255,255,255,0.08)",
				border: `1px solid ${light ? "rgba(40,65,60,0.2)" : "rgba(255,255,255,0.18)"}`,
				backdropFilter: "blur(8px)",
				WebkitBackdropFilter: "blur(8px)",
			}}
		/>
	);
};
