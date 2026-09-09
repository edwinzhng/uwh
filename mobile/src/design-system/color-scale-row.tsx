import type { ReactElement } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, radius, space, typography } from "./tokens";

type Props = {
	label: string;
	steps: readonly { label: string; color: string }[];
};

export const ColorScaleRow = ({ label, steps }: Props): ReactElement => {
	const theme = useTheme();
	const { fontScale } = useWindowDimensions();
	return (
		<Stack gap="xs">
			<Text variant="label">{label}</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={{
					height:
						geometry.swatch +
						space.xxs +
						typography.caption.lineHeight * fontScale,
					flexGrow: 0,
				}}
				contentContainerStyle={{ flexGrow: 1, gap: space.half }}
			>
				{steps.map((step) => (
					<View
						key={step.label}
						style={{
							flex: 1,
							minWidth: geometry.tab * fontScale,
							gap: space.xxs,
						}}
					>
						<View
							accessible
							accessibilityLabel={`${label}, ${step.label}, ${step.color}`}
							style={{
								height: geometry.swatch,
								backgroundColor: step.color,
								borderRadius: radius.xs,
								borderWidth: geometry.border,
								borderColor: theme.border,
							}}
						/>
						<Text variant="caption" tone="secondary" align="center">
							{step.label}
						</Text>
					</View>
				))}
			</ScrollView>
		</Stack>
	);
};
