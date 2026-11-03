import { type ReactElement, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { corners, geometry } from "./tokens";

export const DashedBorder = ({ color }: { color: string }): ReactElement => {
	const [size, setSize] = useState({ width: 0, height: 0 });
	return (
		<View
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			onLayout={({ nativeEvent }): void => {
				const { width, height } = nativeEvent.layout;
				setSize((current) =>
					current.width === width && current.height === height
						? current
						: { width, height },
				);
			}}
			style={StyleSheet.absoluteFill}
		>
			<Svg width={size.width} height={size.height}>
				<Rect
					x={geometry.border / 2}
					y={geometry.border / 2}
					width={Math.max(0, size.width - geometry.border)}
					height={Math.max(0, size.height - geometry.border)}
					rx={corners.panel - geometry.border / 2}
					fill="none"
					stroke={color}
					strokeWidth={geometry.border}
					strokeDasharray="10 8"
				/>
			</Svg>
		</View>
	);
};
