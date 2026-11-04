import { type ReactElement, type ReactNode, useId } from "react";
import { Platform, View } from "react-native";
import { GlassBackdrop } from "./glass-backdrop";
import { previewGlassColors, useGlassPreview } from "./glass-preview-context";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import { corners, geometry, type SpaceToken, space } from "./tokens";

type Props = {
	children: ReactNode;
	interactive?: boolean;
	padding?: SpaceToken;
	shape?: "panel" | "pill";
	material?: "floating";
	seamless?: boolean;
};
export const GlassPanel = ({
	children,
	interactive = false,
	padding = "md",
	shape = "panel",
	material = "floating",
	seamless = true,
}: Props): ReactElement => {
	const id = useId();
	const theme = useTheme();
	const colors = materialColors(theme);
	const treatment = useGlassPreview();
	const preview = treatment
		? previewGlassColors(theme.mode === "dark", treatment)
		: undefined;
	const seamlessEdges = seamless && Platform.OS === "ios";
	return (
		<View
			nativeID={interactive ? `floating-control-${id}` : undefined}
			style={{
				borderRadius: corners[shape],
				borderWidth: seamlessEdges ? 0 : geometry.border,
				borderColor: preview?.edge ?? colors.border,
				boxShadow: seamlessEdges ? "none" : colors.shadow,
				overflow: "hidden",
			}}
		>
			<GlassBackdrop
				material={material}
				showRim={!seamlessEdges}
				radius={corners[shape]}
			/>
			<View style={{ padding: space[padding] }}>{children}</View>
		</View>
	);
};
