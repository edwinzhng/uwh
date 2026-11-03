import { Children, type ReactElement, type ReactNode } from "react";
import { View } from "react-native";
import { FloatingControlContext } from "./floating-control-context";
import { GlassPanel } from "./glass-panel";
import { space } from "./tokens";

export const ToolbarGroup = ({
	children,
	nativeHeader = false,
	label = "Account and notifications",
}: {
	children: ReactNode;
	nativeHeader?: boolean;
	label?: string;
}): ReactElement => {
	const controls = (
		<View
			accessibilityRole="toolbar"
			accessibilityLabel={label}
			style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}
		>
			{nativeHeader
				? children
				: Children.map(children, (child) =>
						child == null ? undefined : (
							<GlassPanel padding="none" shape="pill" interactive seamless>
								{child}
							</GlassPanel>
						),
					)}
		</View>
	);
	return nativeHeader ? (
		controls
	) : (
		<FloatingControlContext value>{controls}</FloatingControlContext>
	);
};
