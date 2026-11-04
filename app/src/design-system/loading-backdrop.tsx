import { type ReactElement, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
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
	const { width, height } = useWindowDimensions();
	const path = useMemo((): string => {
		const columns = Array.from(
			{ length: Math.ceil(width / cell) },
			(_, index) => `M ${((width / 2) % cell) + index * cell} 0 V ${height}`,
		);
		const rows = Array.from(
			{ length: Math.ceil(height / cell) },
			(_, index) => `M 0 ${((height / 2) % cell) + index * cell} H ${width}`,
		);
		return [...columns, ...rows].join(" ");
	}, [cell, width, height]);
	return (
		<View
			pointerEvents="none"
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			style={[StyleSheet.absoluteFill, { backgroundColor: canvas }]}
		>
			<Svg width={width} height={height}>
				<Path
					d={path}
					fill="none"
					stroke={line}
					strokeWidth={geometry.border}
					strokeOpacity={0.45}
				/>
			</Svg>
		</View>
	);
};
