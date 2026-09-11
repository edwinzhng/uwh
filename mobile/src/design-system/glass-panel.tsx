import { type ReactElement, type ReactNode, useId } from "react";
import { View } from "react-native";
import { GlassBackdrop } from "./glass-backdrop";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import { corners, geometry, type SpaceToken, space } from "./tokens";

type Props = {
	children: ReactNode;
	background?: ReactNode;
	interactive?: boolean;
	padding?: SpaceToken;
	shape?: "panel" | "pill";
	material?: "floating";
};
export const GlassPanel = ({
	children,
	background,
	interactive = false,
	padding = "md",
	shape = "panel",
	material = "floating",
}: Props): ReactElement => {
	const id = useId();
	const colors = materialColors(useTheme());
	return (
		<View
			nativeID={interactive ? `floating-control-${id}` : undefined}
			style={{
				borderRadius: corners[shape],
				borderWidth: geometry.border,
				borderColor: colors.border,
				boxShadow: colors.shadow,
				overflow: "hidden",
			}}
		>
			{background}
			<GlassBackdrop material={material} />
			<View style={{ padding: space[padding] }}>{children}</View>
		</View>
	);
};
