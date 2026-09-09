import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { GlassBackdrop } from "./glass-backdrop";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import { corners, geometry, type SpaceToken, space } from "./tokens";

type Props = {
	children: ReactNode;
	padding?: SpaceToken;
	shape?: "panel" | "pill";
	material?: "floating";
};
export const GlassPanel = ({
	children,
	padding = "md",
	shape = "panel",
	material = "floating",
}: Props): ReactElement => {
	const colors = materialColors(useTheme());
	return (
		<View
			style={{
				borderRadius: corners[shape],
				borderWidth: geometry.border,
				borderColor: colors.border,
				boxShadow: colors.shadow,
				overflow: "hidden",
			}}
		>
			<GlassBackdrop material={material} />
			<View style={{ padding: space[padding] }}>{children}</View>
		</View>
	);
};
