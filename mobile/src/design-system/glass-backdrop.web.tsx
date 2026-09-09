import type { ReactElement } from "react";
import { type GlassMaterial, materialColors, materials } from "./materials";
import { useTheme } from "./theme";

export const GlassBackdrop = ({
	material,
}: {
	material: GlassMaterial;
}): ReactElement => {
	const colors = materialColors(useTheme());
	const filter =
		material === "floating"
			? `blur(${materials.blur.floating}px) saturate(${materials.saturation})`
			: undefined;
	return (
		<div
			aria-hidden
			style={{
				pointerEvents: "none",
				position: "absolute",
				inset: 0,
				borderRadius: "inherit",
				background: `linear-gradient(180deg, ${colors.shine}, transparent), ${colors[material]}`,
				backdropFilter: filter,
				WebkitBackdropFilter: filter,
				boxShadow: colors.rim,
			}}
		/>
	);
};
