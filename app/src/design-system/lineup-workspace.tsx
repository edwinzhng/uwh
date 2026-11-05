import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
	return (
		<View style={{ flex: 1, paddingTop: insets.top }}>
			<ScrollArea
				edgeFades={false}
				style={{ flex: 1, minHeight: 0 }}
				contentContainerStyle={{
					flexGrow: 1,
					padding: space.xs,
					paddingLeft: Math.max(space.xs, insets.left),
					paddingRight: Math.max(space.xs, insets.right),
				}}
			>
				<View style={{ flexGrow: 1, gap: space.xs }}>{children}</View>
			</ScrollArea>
			<View
				style={{
					padding: space.sm,
					paddingBottom: Math.max(space.sm, insets.bottom),
					paddingLeft:
						Math.max(space.sm, insets.left) + geometry.touch + space.xs,
					paddingRight: Math.max(space.sm, insets.right),
				}}
			>
				{controls}
			</View>
		</View>
	);
};
