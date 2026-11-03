import { type ReactElement, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { loadingColors } from "./loading-colors";
import { geometry, space } from "./tokens";

export const LoadingBackdrop = ({
	canvas = loadingColors.canvas,
	line = loadingColors.grid,
}: {
	canvas?: string;
	line?: string;
}): ReactElement => {
	const cell = space.xl * 0.8;
	const grid = useId();
	return (
		<View
			pointerEvents="none"
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			style={[StyleSheet.absoluteFill, { backgroundColor: canvas }]}
		>
			<Svg width="100%" height="100%">
				<Defs>
					<Pattern
						id={grid}
						x="50%"
						y="50%"
						width={cell}
						height={cell}
						patternUnits="userSpaceOnUse"
					>
						<Path
							d={`M 0 ${cell} V 0 H ${cell}`}
							fill="none"
							stroke={line}
							strokeWidth={geometry.border}
						/>
					</Pattern>
				</Defs>
				<Rect width="100%" height="100%" fill={`url(#${grid})`} />
			</Svg>
		</View>
	);
};
