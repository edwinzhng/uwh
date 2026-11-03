import { type ReactElement, useState } from "react";
import { Text as NativeText, Pressable, View } from "react-native";
import { CardBackground } from "./card-background";
import { FeatureIcon } from "./feature-icon";
import { useButtonHaptics } from "./haptics";
import { Icon, type IconName } from "./icon";
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
	category,
	description,
	onPress,
	density = "standard",
}: {
	title: string;
	icon: IconName;
	category: CategoryColor;
	description?: string;
	onPress: () => void;
	density?: "standard" | "compact";
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={description ? `${title}, ${description}` : title}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				flex: 1,
				minWidth: 0,
				minHeight: geometry.touch * 2,
				flexDirection: "row",
				alignItems: "center",
				borderRadius: corners.panel,
				padding: density === "compact" ? space.md : space.lg,
				borderWidth: geometry.border,
				borderColor: theme.border,
				opacity: pressed ? geometry.pressedOpacity : 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
				gap: space.md,
			})}
		>
			<CardBackground color={theme.background.card} />
			<FeatureIcon
				name={icon}
				category={category}
				large={density !== "compact"}
			/>
			<View style={{ gap: space.xxs, minWidth: 0, flex: 1 }}>
				<NativeText
					style={{
						fontSize: typography.h4.fontSize,
						lineHeight: typography.h4.lineHeight,
						fontFamily: font.semibold,
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
			<Icon name="chevron" size="sm" tone="secondary" />
		</Pressable>
	);
};
