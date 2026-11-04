import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { CardAtmosphere } from "./card-atmosphere";
import { CardContentContext } from "./card-content-context";
import { DashedBorder } from "./dashed-border";
import { useButtonHaptics } from "./haptics";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	corners,
	geometry,
	space,
	unmarkedCardColors,
} from "./tokens";
import { WatercolorShader } from "./watercolor-shader";

export const SummaryCard = ({
	title,
	titleVariant = "overline",
	icon,
	category = "sky",
	headerTexture,
	variant = "default",
	metadata,
	children,
	onPress,
	accessibilityLabel,
	action,
	borderStyle = "solid",
	compact = false,
}: {
	title: string;
	compact?: boolean;
	titleVariant?: "overline" | "h3";
	icon?: IconName;
	category?: CategoryColor;
	headerTexture?: "watercolor";
	variant?: "default" | "metric" | "section";
	tone?: "default" | "brand" | "recognition";
	metadata?: string;
	children: ReactNode;
	onPress?: () => void;
	accessibilityLabel?: string;
	action?: ReactNode;
	borderStyle?: "solid" | "dashed";
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const [pressed, setPressed] = useState(false);
	const section = variant === "section";
	const unmarked = borderStyle === "dashed" && !section;
	const unmarkedColors = unmarkedCardColors[theme.mode];
	const background = unmarked
		? unmarkedColors.background
		: theme.background.card;
	const interactiveBackground = pressed ? theme.background.pressed : background;
	const texture = headerTexture ? (
		<WatercolorShader category={category} seed={`practice-header:${title}`} />
	) : undefined;
	const content = (
		<CardContentContext value={!section}>
			<View style={{ gap: space.xs, minWidth: 0 }}>
				<View
					style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}
				>
					{icon ? (
						<Icon name={icon} size="sm" color={theme.text.secondary} />
					) : undefined}
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text variant={section ? "h3" : titleVariant} weight="semibold">
							{title}
						</Text>
					</View>
					{onPress ? (
						<Icon name="chevron" size="sm" color={theme.text.secondary} />
					) : undefined}
				</View>
				{children}
				{metadata ? (
					<Text variant="caption" tone="secondary">
						{metadata}
					</Text>
				) : undefined}
			</View>
		</CardContentContext>
	);
	return (
		<View
			style={{
				minWidth: 0,
				borderRadius: corners.panel,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
			}}
		>
			<View
				style={{
					minWidth: 0,
					overflow: section ? "visible" : "hidden",
					borderRadius: corners.panel,
					borderWidth: section ? 0 : geometry.border,
					borderColor: unmarked ? "transparent" : theme.border,
					backgroundColor: section ? "transparent" : background,
				}}
			>
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
						style={{
							padding: section ? 0 : compact ? space.sm : space.md,
							minHeight: geometry.touch,
							minWidth: 0,
							backgroundColor: section ? "transparent" : interactiveBackground,
						}}
					>
						{texture}
						{!headerTexture && !section && !unmarked ? (
							<CardAtmosphere />
						) : undefined}
						{content}
					</Pressable>
				) : (
					<View
						style={{
							padding: section ? 0 : compact ? space.sm : space.md,
							backgroundColor: section ? "transparent" : background,
						}}
					>
						{texture}
						{!headerTexture && !section && !unmarked ? (
							<CardAtmosphere />
						) : undefined}
						{content}
					</View>
				)}
				{action ? (
					<View
						style={{
							padding: compact ? space.sm : space.md,
							paddingTop: compact ? 0 : space.md,
							gap: space.sm,
							borderTopWidth: compact ? 0 : geometry.border,
							borderTopColor: theme.border,
						}}
					>
						{action}
					</View>
				) : undefined}
				{unmarked ? <DashedBorder color={unmarkedColors.border} /> : undefined}
			</View>
		</View>
	);
};
