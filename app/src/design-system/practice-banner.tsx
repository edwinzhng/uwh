import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { CardAtmosphere } from "./card-atmosphere";
import { GlassBackdrop } from "./glass-backdrop";
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
	material = "solid",
}: {
	label: string;
	title: string;
	detail: string;
	attendance: string;
	onPress: () => void;
	material?: "solid" | "liquid";
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
				marginBottom: space.sm,
				marginTop: space.sm / 2,
				padding: space.sm,
				borderRadius: corners.panel,
				borderWidth: geometry.border,
				borderColor: theme.border,
				backgroundColor:
					material === "liquid"
						? "transparent"
						: pressed || hovered
							? theme.background.pressed
							: theme.background.card,
				flexDirection: "row",
				alignItems: "center",
				gap: space.sm,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: space.half,
			})}
		>
			{material === "liquid" ? (
				<GlassBackdrop material="floating" radius={corners.panel} />
			) : (
				<CardAtmosphere />
			)}
			<Icon name="calendar" tone="secondary" size="sm" />
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
