import type { ReactElement } from "react";
import { useId } from "react";
import type { GlassBackdropProps } from "./glass-backdrop-props";
import { previewGlassColors, useGlassPreview } from "./glass-preview-context";
import { useReduceTransparency } from "./material-accessibility";
import { materialColors, materials } from "./materials";
import { useTheme } from "./theme";
import { space } from "./tokens";

export const GlassBackdrop = ({
	material,
	showRim = true,
	softEdge = false,
}: GlassBackdropProps): ReactElement => {
	const theme = useTheme();
	const colors = materialColors(theme);
	const id = `glass-${useId().replaceAll(":", "")}`;
	const opaque = useReduceTransparency();
	const preview = useGlassPreview();
	const recipe = preview
		? previewGlassColors(theme.mode === "dark", preview)
		: undefined;
	const background = opaque
		? theme.background.primary
		: softEdge
			? colors.header
			: recipe
				? recipe.fill
				: material === "selection"
					? materials[theme.mode].selection
					: theme.mode === "light"
						? "rgba(250,250,244,0.84)"
						: "rgba(28,37,28,0.84)";
	const filter = opaque
		? "none"
		: `blur(${materials.blur.floating}px) saturate(${materials.saturation})`;
	return (
		<>
			<style>{`#${id} { backdrop-filter: ${filter}; -webkit-backdrop-filter: ${filter}; } @media (prefers-reduced-transparency: reduce) { #${id} { background: ${theme.background.primary} !important; mask-image: none !important; bottom: 0 !important; } #${id} { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } } @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { #${id} { background: ${theme.background.primary} !important; mask-image: none !important; bottom: 0 !important; } }`}</style>
			<div
				id={id}
				aria-hidden
				style={{
					pointerEvents: "none",
					position: "absolute",
					inset: 0,
					bottom: softEdge && !opaque ? -space.md : 0,
					borderRadius: "inherit",
					backgroundColor: background,
					backgroundImage:
						recipe && !opaque && !softEdge
							? `linear-gradient(135deg, ${recipe.highlight}, transparent 45%, transparent 75%, ${recipe.highlight})`
							: undefined,
					boxShadow: showRim ? recipe?.rim : undefined,
					maskImage:
						softEdge && !opaque
							? `linear-gradient(to bottom, #000 calc(100% - ${space.md}px), transparent)`
							: undefined,
				}}
			/>
		</>
	);
};
