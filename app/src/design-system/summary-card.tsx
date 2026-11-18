import { type ReactElement, type ReactNode, useContext, useState } from "react";
import { Pressable, View } from "react-native";
import { CardAtmosphere } from "./card-atmosphere";
import { CardContentContext } from "./card-content-context";
import { DashedBorder } from "./dashed-border";
import { useButtonHaptics } from "./haptics";
import { HomeCardBackground } from "./home-card-background";
import {
	type HomeCardTreatment,
	HomeCardTreatmentContext,
} from "./home-card-treatment";
import { Icon, type IconName } from "./icon";
import { roleGlow } from "./role-glow";
import { useRoleTone } from "./role-scope";
import { Text } from "./text";
import { useTheme } from "./theme";
import { ThemeScope } from "./theme-scope";
import {
	type CategoryColor,
	corners,
	geometry,
	space,
	unmarkedCardColors,
} from "./tokens";
import { TonalWatercolor } from "./tonal-watercolor";
import { WatercolorShader } from "./watercolor-shader";

type Props = {
	title: string;
	compact?: boolean;
	titleVariant?: "overline" | "h3";
	icon?: IconName;
	category?: CategoryColor;
	headerTexture?: "watercolor" | "watercolor-tonal";
	treatment?: HomeCardTreatment;
	variant?: "default" | "metric" | "section";
	tone?: "default" | "highlight" | "recognition";
	metadata?: string;
	children: ReactNode;
	onPress?: () => void;
	accessibilityLabel?: string;
	action?: ReactNode;
	trailingAction?: ReactNode;
	borderStyle?: "solid" | "dashed";
};

export const SummaryCard = (props: Props): ReactElement => {
	const treatment =
		useContext(HomeCardTreatmentContext) ?? props.treatment ?? "current";
	return props.tone === "highlight" ? (
		<ThemeScope appearance="dark">
			<SummaryCardContent {...props} />
		</ThemeScope>
	) : treatment === "spotlight" && props.icon === "megaphone" ? (
		<ThemeScope appearance="light">
			<SummaryCardContent {...props} />
		</ThemeScope>
	) : (
		<SummaryCardContent {...props} />
	);
};

const SummaryCardContent = ({
	title,
	titleVariant = "overline",
	icon,
	category = "sky",
	headerTexture,
	treatment: explicitTreatment,
	variant = "default",
	metadata,
	children,
	onPress,
	accessibilityLabel,
	action,
	trailingAction,
	borderStyle = "solid",
	compact = false,
	tone = "default",
}: Props): ReactElement => {
	const theme = useTheme();
	const roleTone = useRoleTone();
	const treatment =
		useContext(HomeCardTreatmentContext) ?? explicitTreatment ?? "current";
	const announcement = icon === "megaphone";
	const cardTreatment =
		treatment === "spotlight" && !announcement ? "current" : treatment;
	const textureCategory = announcement ? "amber" : category;
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const [pressed, setPressed] = useState(false);
	const section = variant === "section";
	const unmarked = borderStyle === "dashed" && !section;
	const unmarkedColors = unmarkedCardColors[theme.mode];
	const highlight = tone === "highlight";
	const background = highlight
		? theme.highlight.background
		: unmarked
			? unmarkedColors.background
			: theme.background.card;
	const interactiveBackground =
		cardTreatment !== "current" && !highlight
			? "transparent"
			: pressed && !highlight
				? theme.background.pressed
				: background;
	const texture =
		headerTexture && cardTreatment === "current" ? (
			headerTexture === "watercolor-tonal" ? (
				<TonalWatercolor
					category={category}
					seed={`practice-header:${title}`}
				/>
			) : (
				<WatercolorShader
					category={category}
					seed={`practice-header:${title}`}
				/>
			)
		) : undefined;
	const content = (
		<CardContentContext value={!section}>
			<View style={{ gap: space.xs, minWidth: 0 }}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: space.xs,
						paddingEnd: trailingAction ? geometry.touch : undefined,
						minHeight: trailingAction ? geometry.touch - space.sm : undefined,
					}}
				>
					{icon ? (
						<Icon name={icon} size="sm" color={theme.text.secondary} />
					) : undefined}
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text variant={section ? "h3" : titleVariant} weight="semibold">
							{title}
						</Text>
					</View>
					{onPress && !trailingAction ? (
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
				...(roleTone && !section
					? { boxShadow: roleGlow(roleTone, theme.mode) }
					: {}),
			}}
		>
			<View
				style={{
					minWidth: 0,
					overflow: section ? "visible" : "hidden",
					borderRadius: corners.panel,
					borderWidth: section ? 0 : geometry.border,
					borderColor: unmarked || highlight ? "transparent" : theme.border,
					backgroundColor: section ? "transparent" : background,
				}}
			>
				{cardTreatment !== "current" && !section && !highlight ? (
					<HomeCardBackground
						treatment={cardTreatment}
						category={textureCategory}
						seed={`home:${title}`}
					/>
				) : undefined}
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
						{cardTreatment === "current" &&
						!headerTexture &&
						!section &&
						!unmarked &&
						!highlight ? (
							<CardAtmosphere />
						) : undefined}
						{content}
					</Pressable>
				) : (
					<View
						style={{
							padding: section ? 0 : compact ? space.sm : space.md,
							backgroundColor:
								section || cardTreatment !== "current"
									? "transparent"
									: background,
						}}
					>
						{texture}
						{cardTreatment === "current" &&
						!headerTexture &&
						!section &&
						!unmarked &&
						!highlight ? (
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
				{trailingAction ? (
					<View
						style={{ position: "absolute", top: space.xxs, end: space.xxs }}
					>
						{trailingAction}
					</View>
				) : undefined}
			</View>
		</View>
	);
};
