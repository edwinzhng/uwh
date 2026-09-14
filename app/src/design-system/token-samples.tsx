import type { ReactElement } from "react";
import { View } from "react-native";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, radius, space } from "./tokens";

export const TokenSamples = (): ReactElement => {
	const theme = useTheme();
	return (
		<Stack gap="lg">
			<Stack>
				<Text variant="h4">Spacing</Text>
				<Row wrap>
					{Object.values(space)
						.filter((value) => value > 0)
						.map((value) => (
							<Stack key={value} gap="xs">
								<View
									style={{
										height: space.md,
										width: value,
										backgroundColor: theme.background.contrast,
										borderRadius: radius.xs,
									}}
								/>
								<Text variant="caption" tone="secondary">
									{value}
								</Text>
							</Stack>
						))}
				</Row>
			</Stack>
			<Stack>
				<Text variant="h4">Radius</Text>
				<Row wrap>
					{[radius.xs, radius.sm, radius.md, radius.lg, radius.xl].map(
						(value) => (
							<Stack key={value} gap="xs">
								<View
									style={{
										width: geometry.swatch,
										height: geometry.swatch,
										borderRadius: value,
										borderWidth: geometry.border,
										borderColor: theme.controlBorder,
										backgroundColor: theme.background.secondary,
									}}
								/>
								<Text variant="caption" tone="secondary">
									{value}
								</Text>
							</Stack>
						),
					)}
				</Row>
			</Stack>
		</Stack>
	);
};
