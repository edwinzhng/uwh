import type { ReactElement } from "react";
import type { NavigationFrameGeometry } from "./navigation-model";
import { SelectionIndicator } from "./selection-indicator";
import { useTheme } from "./theme";
import { corners } from "./tokens";

export const NavigationIndicator = ({
	frame,
	height,
	value,
}: {
	frame: NavigationFrameGeometry;
	height: number;
	value: string;
}): ReactElement => {
	const theme = useTheme();
	return (
		<SelectionIndicator
			frame={{ x: frame.left, y: 0, width: frame.width, height }}
			value={value}
			radius={corners.pill}
			color={theme.navigation.selected}
		/>
	);
};
