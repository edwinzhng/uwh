import { Children, type ReactElement, type ReactNode, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const PoolBoardColumns = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
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
				gap: space.xs,
				flexGrow: 1,
				alignItems: "stretch",
			}}
		>
			{Children.map(children, (child, index) => (
				<View
					style={{
						flexGrow: 1,
						flexShrink: sideBySide ? 1 : 0,
						flexBasis: sideBySide ? 0 : "auto",
						minWidth: 0,
						borderLeftWidth: sideBySide && index > 0 ? geometry.border : 0,
						borderTopWidth: !sideBySide && index > 0 ? geometry.border : 0,
						borderColor: theme.controlBorder,
						paddingLeft: sideBySide && index > 0 ? space.xs : 0,
						paddingTop: !sideBySide && index > 0 ? space.sm : 0,
					}}
				>
					{child}
				</View>
			))}
		</View>
	);
};
