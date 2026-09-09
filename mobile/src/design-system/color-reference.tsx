import type { ReactElement } from "react";
import { ColorScaleRow } from "./color-scale-row";
import type { ColorScale } from "./color-scales";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { palette } from "./tokens";

const scaleSteps = (scale: ColorScale): { label: string; color: string }[] => [
	{ label: "Subtle", color: scale.subtle },
	{ label: "Muted", color: scale.muted },
	{ label: "Border", color: scale.border },
	{ label: "Solid", color: scale.solid },
	{ label: "Text", color: scale.text },
];

export const ColorReference = (): ReactElement => {
	const theme = useTheme();
	return (
		<Stack gap="lg">
			<Text variant="h4">Colors</Text>
			<ColorScaleRow
				label="Background"
				steps={[
					{ label: "Primary", color: theme.background.primary },
					{ label: "Secondary", color: theme.background.secondary },
					{ label: "Tertiary", color: theme.background.tertiary },
					{ label: "Hover", color: theme.background.hover },
					{ label: "Pressed", color: theme.background.pressed },
					{ label: "Contrast", color: theme.background.contrast },
				]}
			/>
			<ColorScaleRow
				label="Text"
				steps={[
					{ label: "Primary", color: theme.text.primary },
					{ label: "Secondary", color: theme.text.secondary },
					{ label: "Contrast", color: theme.text.contrast },
				]}
			/>
			<ColorScaleRow
				label="Brand"
				steps={[
					{ label: "Pine", color: palette.pine },
					{ label: "Moss", color: palette.moss },
				]}
			/>
			<ColorScaleRow
				label="Accent"
				steps={scaleSteps(theme.colorScales.accent)}
			/>
			<ColorScaleRow
				label="Success"
				steps={scaleSteps(theme.colorScales.success)}
			/>
			<ColorScaleRow
				label="Warning"
				steps={scaleSteps(theme.colorScales.warning)}
			/>
			<ColorScaleRow
				label="Pending"
				steps={scaleSteps(theme.colorScales.pending)}
			/>
			<ColorScaleRow
				label="Danger"
				steps={scaleSteps(theme.colorScales.danger)}
			/>
			<ColorScaleRow
				label="Coach"
				steps={scaleSteps(theme.colorScales.coach)}
			/>
			<ColorScaleRow
				label="Admin"
				steps={scaleSteps(theme.colorScales.admin)}
			/>
		</Stack>
	);
};
