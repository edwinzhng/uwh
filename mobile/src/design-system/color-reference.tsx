import { chartColors } from "@calgarycrocs/design-system/tokens";
import type { ReactElement } from "react";
import { chartPalette } from "./chart-palette";
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
			<Text variant="h4">Semantic treatments</Text>
			<Text variant="small" tone="secondary">
				Status and role names describe usage, not additional base colors.
				Pending is the violet treatment for an unanswered RSVP.
			</Text>
			<ColorScaleRow
				label="Success"
				steps={scaleSteps(theme.colorScales.success)}
			/>
			<ColorScaleRow
				label="Warning"
				steps={scaleSteps(theme.colorScales.warning)}
			/>
			<ColorScaleRow
				label="Unanswered RSVP (pending)"
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
			<ColorScaleRow
				label="Chart palette · 700"
				steps={Object.entries(chartColors).map(([label, color]) => ({
					label,
					color,
				}))}
			/>
			<ColorScaleRow
				label="Attendance chart"
				steps={[
					{ label: "On time", color: chartPalette.onTime },
					{ label: "Late", color: chartPalette.late },
					{ label: "No-show", color: chartPalette.absent },
					{ label: "Unmarked", color: chartPalette.unmarked },
				]}
			/>
		</Stack>
	);
};
