import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import type { CalendarDayProps } from "./calendar-day-props";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export const CalendarDay = ({
	value,
	label,
	selected,
	today,
	muted,
	count,
	onPress,
}: CalendarDayProps): ReactElement => {
	const theme = useTheme();
	const foreground = selected
		? theme.accent.foreground
		: muted
			? theme.text.secondary
			: theme.text.primary;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ selected }}
			onPress={onPress}
			style={({ pressed }) => ({
				minHeight: geometry.touch + space.xs,
				alignItems: "center",
				justifyContent: "center",
				gap: space.xxs,
				borderRadius: corners.panel,
				borderWidth: geometry.border,
				borderColor:
					today && !selected ? theme.accent.background : "transparent",
				backgroundColor: selected
					? theme.accent.background
					: pressed
						? theme.background.hover
						: "transparent",
			})}
		>
			<Text
				style={{
					color: foreground,
					fontFamily: today || selected ? font.semibold : font.regular,
					fontSize: typography.small.fontSize,
					lineHeight: typography.small.lineHeight,
				}}
			>
				{Number(value.slice(-2))}
			</Text>
			<View
				style={{
					height: space.xxs,
					width: space.xxs,
					borderRadius: corners.pill,
					backgroundColor: count ? foreground : "transparent",
				}}
			/>
		</Pressable>
	);
};
