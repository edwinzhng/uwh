import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const PracticeBanner = ({
	label,
	title,
	detail,
	attendance,
	onPress,
}: {
	label: string;
	title: string;
	detail: string;
	attendance: string;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${label}: ${title}. ${detail}. ${attendance}. Open practice`}
			onPress={onPress}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={({ pressed }) => ({
				marginHorizontal: space.sm,
				marginBottom: space.xs,
				padding: space.sm,
				borderRadius: corners.panel,
				borderWidth: geometry.border,
				borderColor: theme.colorScales.accent.border,
				backgroundColor:
					pressed || hovered
						? theme.colorScales.accent.muted
						: theme.colorScales.accent.subtle,
				flexDirection: "row",
				alignItems: "center",
				gap: space.sm,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: space.half,
			})}
		>
			<Icon name="calendar" tone="primary" />
			<View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						flexWrap: "wrap",
						gap: space.xs,
					}}
				>
					<Text variant="caption" weight="semibold" tone="brand">
						{label}
					</Text>
					<Text variant="caption" tone="secondary">
						{attendance}
					</Text>
				</View>
				<Text variant="small" weight="semibold" lines={1}>
					{title}
				</Text>
				<Text variant="caption" tone="secondary" lines={1}>
					{detail}
				</Text>
			</View>
			<Icon name="chevron" size="sm" tone="secondary" />
		</Pressable>
	);
};
