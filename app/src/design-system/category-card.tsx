import { type ReactElement, useState } from "react";
import { Text as NativeText, Pressable, View } from "react-native";
import { CardAtmosphere } from "./card-atmosphere";
import { CardBackground } from "./card-background";
import { useButtonHaptics } from "./haptics";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	corners,
	font,
	geometry,
	space,
	typography,
} from "./tokens";

export const CategoryCard = ({
	title,
	icon,
	description,
	onPress,
	density = "standard",
	stat,
}: {
	title: string;
	icon: IconName;
	category?: CategoryColor;
	description?: string;
	onPress: () => void;
	density?: "standard" | "compact" | "dashboard" | "row";
	stat?: { value: number; label: string };
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const dashboard = density === "dashboard";
	const row = density === "row";
	const dense = dashboard || row;
	const contentHeight = density === "compact" ? space.md : geometry.touch;
	const metric = stat ? (
		<View
			style={{
				flexDirection: "row",
				alignItems: "baseline",
				flexWrap: "nowrap",
				gap: space.xs,
			}}
		>
			<Text variant="number">{stat.value}</Text>
			<Text variant="caption" tone="secondary">
				{stat.label}
			</Text>
		</View>
	) : undefined;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={
				stat
					? `${title}, ${stat.value} ${stat.label}`
					: description
						? `${title}, ${description}`
						: title
			}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				flex: 1,
				minWidth: 0,
				minHeight:
					geometry.touch +
					(row
						? stat
							? space.lg
							: space.sm
						: dashboard
							? geometry.touch + space.lg
							: contentHeight),
				flexDirection: dashboard ? "column" : "row",
				alignItems: dense ? "stretch" : "center",
				justifyContent: dashboard ? "flex-start" : "center",
				borderRadius: corners.panel,
				padding: dense ? space.xs : density === "compact" ? space.sm : space.md,
				borderWidth: geometry.border,
				borderColor: theme.border,
				opacity: pressed ? geometry.pressedOpacity : 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
				gap: space.xs,
			})}
		>
			<CardBackground color={theme.background.card} />
			<CardAtmosphere />
			<View
				style={{
					width: "100%",
					flexDirection: "row",
					alignItems: "center",
					gap: dense ? space.xxs : space.xs,
				}}
			>
				<Icon name={icon} size="sm" tone="secondary" />
				<View style={{ gap: space.xxs, minWidth: 0, flex: 1 }}>
					<NativeText
						numberOfLines={dense ? 1 : undefined}
						style={{
							fontSize: dense
								? typography.small.fontSize
								: typography.overline.fontSize,
							lineHeight: dense
								? typography.small.lineHeight
								: typography.overline.lineHeight,
							fontFamily: font.semibold,
							textTransform: dense ? "none" : "uppercase",
							letterSpacing: dense ? 0 : 0.8,
							color: theme.text.primary,
						}}
					>
						{title}
					</NativeText>
					{description ? (
						<NativeText
							style={{
								fontSize: typography.caption.fontSize,
								lineHeight: typography.caption.lineHeight,
								fontFamily: font.regular,
								color: theme.text.secondary,
							}}
						>
							{description}
						</NativeText>
					) : undefined}
				</View>
				{row ? metric : undefined}
				<Icon name="chevron" size="sm" tone="secondary" />
			</View>
			{!row ? metric : undefined}
		</Pressable>
	);
};
