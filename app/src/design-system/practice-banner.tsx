import { LinearGradient } from "expo-linear-gradient";
import Waves from "lucide-react-native/icons/waves-horizontal";
import { type ReactElement, useState } from "react";
import { Text as NativeText, Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { font, geometry, radius, space, typography } from "./tokens";

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
	const green = theme.mode === "dark" ? "#70E9BC" : "#00CB89";
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${label}: ${title}. ${detail}. ${attendance}. Open practice`}
			onPress={onPress}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				paddingHorizontal: space.md,
				paddingVertical: space.sm,
				minHeight: geometry.touch + space.md,
				borderRadius: radius.xl,
				borderWidth: geometry.border,
				borderColor: theme.border,
				flexDirection: "row",
				alignItems: "center",
				gap: space.sm,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: space.half,
				overflow: "hidden",
				opacity: pressed ? geometry.pressedOpacity : 1,
			})}
		>
			<LinearGradient
				pointerEvents="none"
				colors={
					theme.mode === "dark"
						? ["#194E45", "#263D55"]
						: ["#AEEDD6", "#D7E5FA"]
				}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
			/>
			<Waves
				color={green}
				size={22}
				strokeWidth={2}
				style={{ position: "relative" }}
				aria-hidden
			/>
			<View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
				<NativeText
					numberOfLines={1}
					style={{
						...typography.overline,
						fontFamily: font.semibold,
						color: green,
					}}
				>
					{label.toUpperCase()}
				</NativeText>
				<Text variant="small" weight="semibold" lines={1}>
					{detail}
				</Text>
			</View>
			<Icon name="chevron" size="sm" tone="secondary" />
			<Text variant="caption" tone="secondary">
				{attendance}
			</Text>
		</Pressable>
	);
};
