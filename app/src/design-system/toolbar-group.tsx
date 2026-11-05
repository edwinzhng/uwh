import { Children, type ReactElement, type ReactNode } from "react";
import { View } from "react-native";
import { FloatingControlContext } from "./floating-control-context";
import { GlassPanel } from "./glass-panel";
import { space } from "./tokens";

export const ToolbarGroup = ({
	children,
	label = "Account and notifications",
}: {
	children: ReactNode;
	label?: string;
}): ReactElement => {
	const controls = (
		<View
			accessibilityRole="toolbar"
			accessibilityLabel={label}
			style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}
		>
			{Children.map(children, (child) =>
				child == null ? undefined : (
					<GlassPanel padding="none" shape="pill" interactive seamless>
						{child}
					</GlassPanel>
				),
			)}
		</View>
	);
	return <FloatingControlContext value>{controls}</FloatingControlContext>;
};
