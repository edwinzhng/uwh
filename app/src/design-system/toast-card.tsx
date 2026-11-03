import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Info from "lucide-react-native/icons/info";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import { type ReactElement, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ContentReveal } from "./content-reveal";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import type { ToastViewProps } from "./toast-lifetime";
import {
	corners,
	elevation,
	font,
	geometry,
	radius,
	space,
	typography,
} from "./tokens";
import { useToastLifetime } from "./use-toast-lifetime";

const statusIcons = {
	success: CircleCheck,
	error: CircleAlert,
	warning: TriangleAlert,
	info: Info,
};

export const ToastCard = ({
	copy,
	kind,
	startedAt,
	duration,
	onExpire,
}: ToastViewProps): ReactElement => {
	const theme = useTheme();
	const tone = kind === "error" ? "danger" : kind;
	const Glyph = statusIcons[kind];
	const [focused, setFocused] = useState(false);
	useToastLifetime(startedAt, duration, onExpire);
	return (
		<View
			accessibilityRole="alert"
			accessibilityLiveRegion="polite"
			accessibilityActions={[{ name: "dismiss", label: "Dismiss" }]}
			onAccessibilityAction={(event): void => {
				if (event.nativeEvent.actionName === "dismiss") onExpire();
			}}
			style={{
				width: "100%",
				flexDirection: "row",
				alignItems: "center",
				gap: space.sm,
				paddingLeft: space.md,
				paddingRight: space.xxs,
				paddingVertical: space.sm,
				backgroundColor: theme.background.primary,
				borderWidth: geometry.border,
				borderColor: theme.border,
				borderRadius: corners.menu,
				...elevation.floating,
			}}
		>
			<ContentReveal>
				<View
					accessible={false}
					style={{
						width: geometry.compactControl,
						height: geometry.compactControl,
						borderRadius: radius.round,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: theme[tone].background,
					}}
				>
					<Glyph
						size={geometry.iconSmall}
						color={theme[tone].foreground}
						strokeWidth={geometry.iconStroke}
						aria-hidden
					/>
				</View>
			</ContentReveal>
			<View style={{ flex: 1, minWidth: 0, gap: space.half }}>
				<Text
					style={{
						fontFamily: font.medium,
						fontSize: typography.small.fontSize,
						lineHeight: typography.small.lineHeight,
						color: theme.text.primary,
					}}
				>
					{copy.title}
				</Text>
				{copy.description ? (
					<Text
						style={{
							fontFamily: font.regular,
							fontSize: typography.small.fontSize,
							lineHeight: typography.small.lineHeight,
							color: theme.text.secondary,
						}}
					>
						{copy.description}
					</Text>
				) : undefined}
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Dismiss notification"
				onPress={onExpire}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={({ pressed }) => ({
					width: geometry.touch,
					height: geometry.touch,
					alignItems: "center",
					justifyContent: "center",
					borderRadius: radius.round,
					backgroundColor: pressed ? theme.background.pressed : "transparent",
					outlineColor: theme.focus,
					outlineWidth: focused ? geometry.focus : 0,
				})}
			>
				<Icon name="close" size="sm" tone="secondary" />
			</Pressable>
		</View>
	);
};
