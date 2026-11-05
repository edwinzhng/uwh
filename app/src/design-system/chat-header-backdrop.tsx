import type { ReactElement } from "react";
import { View } from "react-native";
import { GlassBackdrop } from "./glass-backdrop";

export const ChatHeaderBackdrop = ({
	topInset,
}: {
	topInset: number;
}): ReactElement => (
	<View
		pointerEvents="none"
		accessible={false}
		accessibilityElementsHidden
		importantForAccessibility="no-hide-descendants"
		style={{
			position: "absolute",
			top: -topInset,
			bottom: 0,
			left: 0,
			right: 0,
			overflow: "hidden",
		}}
	>
		<GlassBackdrop material="floating" radius={0} showRim={false} />
	</View>
);
