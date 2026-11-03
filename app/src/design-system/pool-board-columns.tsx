import { Children, type ReactElement, type ReactNode, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { geometry, space } from "./tokens";

export const PoolBoardColumns = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const [wide, setWide] = useState(false);
	const viewport = useWindowDimensions();
	const sideBySide = wide || viewport.width > viewport.height;
	return (
		<View
			onLayout={({ nativeEvent: { layout } }): void =>
				setWide(layout.width >= geometry.reading)
			}
			style={{
				flexDirection: sideBySide ? "row" : "column",
				gap: space.md,
				alignItems: "stretch",
			}}
		>
			{Children.map(children, (child) => (
				<View style={{ flex: sideBySide ? 1 : undefined, minWidth: 0 }}>
					{child}
				</View>
			))}
		</View>
	);
};
