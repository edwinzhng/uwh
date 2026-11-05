import { type ReactElement, type ReactNode, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBackdrop } from "./header-backdrop";
import { LineupBackdrop } from "./lineup-backdrop";
import { ScrollArea } from "./scroll-area";
import { geometry, space } from "./tokens";
export const LineupWorkspace = ({
	children,
	controls,
}: {
	children: ReactNode;
	controls: ReactNode;
}): ReactElement => {
	const insets = useSafeAreaInsets();
	const [headerHeight, setHeaderHeight] = useState(
		geometry.touch + space.sm * 2 + insets.top,
	);
	return (
		<View style={{ flex: 1 }}>
			<LineupBackdrop />
			<ScrollArea
				edgeFades={false}
				style={{ flex: 1, minHeight: 0 }}
				contentContainerStyle={{
					flexGrow: 1,
					padding: space.xs,
					paddingTop: headerHeight + space.xs,
					paddingBottom: Math.max(space.xs, insets.bottom),
					paddingLeft: Math.max(space.xs, insets.left),
					paddingRight: Math.max(space.xs, insets.right),
				}}
			>
				<View style={{ flexGrow: 1, gap: space.xs }}>{children}</View>
			</ScrollArea>
			<View
				onLayout={({ nativeEvent: { layout } }): void =>
					setHeaderHeight(layout.height)
				}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 10,
					padding: space.sm,
					paddingTop: insets.top + space.sm,
					paddingLeft: Math.max(space.sm, insets.left),
					paddingRight:
						Math.max(space.sm, insets.right) + geometry.touch + space.xs,
				}}
			>
				<HeaderBackdrop />
				{controls}
			</View>
		</View>
	);
};
