import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { CardBackground } from "./card-background";
import { FeatureIcon } from "./feature-icon";
import { useButtonHaptics } from "./haptics";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	categoryPalette,
	corners,
	geometry,
	space,
} from "./tokens";

export const SummaryCard = ({
	title,
	icon,
	category = "sky",
	variant = "default",
	tone = "default",
	metadata,
	children,
	onPress,
	accessibilityLabel,
	action,
}: {
	title: string;
	icon?: IconName;
	category?: CategoryColor;
	variant?: "default" | "metric";
	tone?: "default" | "brand" | "recognition";
	metadata?: string;
	children: ReactNode;
	onPress?: () => void;
	accessibilityLabel?: string;
	action?: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const [pressed, setPressed] = useState(false);
	const [hovered, setHovered] = useState(false);
	const color =
		tone === "brand" ? theme.brand : categoryPalette[theme.mode][category];
	const content = (
		<View
			style={{
				flexDirection: variant === "metric" ? "row" : "column",
				gap: space.md,
				minWidth: 0,
			}}
		>
			{variant === "metric" && icon ? (
				<FeatureIcon name={icon} category={category} large />
			) : undefined}
			<View
				style={{
					flex: variant === "metric" ? 1 : undefined,
					minWidth: 0,
					gap: space.sm,
				}}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: space.xs,
					}}
				>
					{variant === "default" && icon ? (
						<Icon name={icon} color={color.foreground} />
					) : undefined}
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text variant="h3" tone={tone === "brand" ? "onBrand" : "primary"}>
							{title}
						</Text>
					</View>
					{onPress ? (
						<Icon
							name="chevron"
							size="sm"
							color={
								tone === "brand" ? theme.brand.foreground : theme.text.secondary
							}
						/>
					) : undefined}
				</View>
				{children}
				{metadata ? (
					<Text variant="caption" tone="secondary">
						{metadata}
					</Text>
				) : undefined}
			</View>
		</View>
	);
	return (
		<View
			style={{
				borderWidth: geometry.border,
				borderColor: tone === "brand" ? "transparent" : theme.border,
				borderRadius: corners.panel,
				minWidth: 0,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
			}}
		>
			<CardBackground
				color={
					tone === "brand"
						? pressed
							? theme.accent.pressed
							: hovered
								? theme.accent.hover
								: theme.brand.background
						: pressed
							? theme.background.pressed
							: hovered
								? theme.background.hover
								: tone === "recognition"
									? categoryPalette[theme.mode].amber.background
									: theme.background.card
				}
			/>
			{onPress ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={accessibilityLabel ?? title}
					onPress={(): void => {
						haptic();
						onPress();
					}}
					onFocus={(): void => setFocused(true)}
					onBlur={(): void => {
						setFocused(false);
						setPressed(false);
					}}
					onPressIn={(): void => setPressed(true)}
					onPressOut={(): void => setPressed(false)}
					onHoverIn={(): void => setHovered(true)}
					onHoverOut={(): void => setHovered(false)}
					style={{
						padding: space.lg,
						borderRadius: corners.panel,
						minHeight: geometry.touch,
						minWidth: 0,
						backgroundColor: "transparent",
					}}
				>
					{content}
				</Pressable>
			) : (
				<View style={{ padding: space.lg }}>{content}</View>
			)}
			{action ? (
				<View
					style={{
						paddingHorizontal: space.lg,
						paddingBottom: space.lg,
						alignItems: "flex-start",
					}}
				>
					{action}
				</View>
			) : undefined}
		</View>
	);
};
