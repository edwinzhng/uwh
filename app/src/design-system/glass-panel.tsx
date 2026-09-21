import { type ReactElement, type ReactNode, useId } from "react";
import { Platform, View } from "react-native";
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
	seamless?: boolean;
};
export const GlassPanel = ({
	children,
	background,
	interactive = false,
	padding = "md",
	shape = "panel",
	material = "floating",
	seamless = false,
}: Props): ReactElement => {
	const id = useId();
	const colors = materialColors(useTheme());
	const seamlessEdges = seamless && Platform.OS !== "web";
	return (
		<View
			nativeID={interactive ? `floating-control-${id}` : undefined}
			style={{
				borderRadius: corners[shape],
				borderWidth: seamlessEdges ? 0 : geometry.border,
				borderColor: colors.border,
				boxShadow: seamlessEdges ? "none" : colors.shadow,
				overflow: "hidden",
			}}
		>
			{background}
			<GlassBackdrop material={material} showRim={!seamlessEdges} />
			<View style={{ padding: space[padding] }}>{children}</View>
		</View>
	);
};
