import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { GlassPanel } from "./glass-panel";

export const ToolbarGroup = ({
	children,
	nativeHeader = false,
}: {
	children: ReactNode;
	nativeHeader?: boolean;
}): ReactElement => {
	const controls = (
		<View
			accessibilityRole="toolbar"
			accessibilityLabel="Account and notifications"
			style={{ flexDirection: "row", alignItems: "center" }}
		>
			{children}
		</View>
	);
	return nativeHeader ? (
		controls
	) : (
		<GlassPanel padding="none" shape="pill" interactive seamless>
			{controls}
		</GlassPanel>
	);
};
