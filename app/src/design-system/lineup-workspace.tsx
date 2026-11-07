import { type ReactElement, type ReactNode, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBackdrop } from "./header-backdrop";
import { LineupBackdrop } from "./lineup-backdrop";
import { LineupScrollContext } from "./lineup-scroll-context";
import { ScrollArea } from "./scroll-area";
import { geometry, space } from "./tokens";
export const LineupWorkspace = ({
	children,
	controls,
	footer,
}: {
	children: ReactNode;
	controls: ReactNode;
	footer?: ReactNode;
}): ReactElement => {
	const insets = useSafeAreaInsets();
	const desktop =
		useWindowDimensions().width >= geometry.wide && Boolean(footer);
	const [dragging, setDragging] = useState(false);
	const scrollGesture = useMemo(() => Gesture.Native(), []);
	const scrollContext = useMemo(
		() => ({ gesture: scrollGesture, setDragging }),
		[scrollGesture],
	);
	const [headerHeight, setHeaderHeight] = useState(
		geometry.touch + space.sm * 2 + insets.top,
	);
	return (
		<LineupScrollContext value={scrollContext}>
			<View style={{ flex: 1 }}>
				<LineupBackdrop />
				<ScrollArea
					scrollGesture={scrollGesture}
					scrollEnabled={!dragging}
					edgeFades={false}
					style={{ flexGrow: desktop ? 0 : 1, flexShrink: 1, minHeight: 0 }}
					contentContainerStyle={{
						flexGrow: desktop ? 0 : 1,
						padding: space.xs,
						paddingTop: headerHeight + space.xs,
						paddingBottom: Math.max(space.xs, insets.bottom),
						paddingLeft: Math.max(space.xs, insets.left),
						paddingRight: Math.max(space.xs, insets.right),
					}}
				>
					<View style={{ flexGrow: desktop ? 0 : 1, gap: space.xs }}>
						{children}
					</View>
				</ScrollArea>
				{footer}
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
		</LineupScrollContext>
	);
};
