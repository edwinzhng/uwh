import type { ReactElement } from "react";

import { useTheme } from "./theme";

export const WaterBackground = (): ReactElement => {
	const theme = useTheme();
	return (
		<div
			aria-hidden
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				backgroundColor:
					theme.background.primary === "#FFFFFF" ? "#f3f4f4" : "#151719",
			}}
		/>
	);
};
