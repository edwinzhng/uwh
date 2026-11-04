import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "./avatar";
import { FeatureIcon } from "./feature-icon";
import { Icon, type IconName } from "./icon";
import { interactiveRow, listRowSpacing } from "./interactive-row-layout";
import { roleGlow } from "./role-glow";
import { useRoleTone } from "./role-scope";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

type Props = {
	title: string;
	density?: "standard" | "compact";
	titleLines?: 1 | 2 | 3;
	titleAccessory?: ReactNode;
	emphasis?: "default" | "strong" | "subtle";
	description?: string;
	descriptionItalic?: boolean;
	descriptionLines?: 1 | 2 | 3;
	accessibilityLabel?: string;
	icon?: IconName;
	avatar?: string;
	avatarId?: string;
	leading?: ReactNode;
	trailing?: ReactNode;
	action?: ReactNode;
	showChevron?: boolean;
	onPress?: () => void;
	selected?: boolean;
	flush?: boolean;
	cardRow?: boolean;
};
export const ListItem = ({
	title,
	density = "standard",
	titleLines,
	titleAccessory,
	emphasis = "default",
	description,
	descriptionItalic,
	descriptionLines,
	accessibilityLabel,
	icon,
	avatar,
	avatarId,
	leading,
	trailing,
	action,
	showChevron = true,
	onPress,
	selected = false,
	flush = false,
	cardRow = false,
}: Props): ReactElement => {
	const theme = useTheme();
	const roleTone = useRoleTone();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const [actionPressed, setActionPressed] = useState(false);
	const spacing = listRowSpacing({
		interactive: Boolean(onPress),
		flush,
		cardRow,
		hasLeading: Boolean(leading || avatar || icon),
	});
	const titleWeight =
		emphasis === "strong"
			? "semibold"
			: emphasis === "subtle"
				? "regular"
				: undefined;
	const content = (
		<Row>
			{leading || avatar || icon ? (
				<View
					style={{
						width: geometry.touch,
						minHeight: geometry.touch,
						flexShrink: 0,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{leading ??
						(avatar ? (
							<Avatar name={avatar} personId={avatarId} />
						) : icon ? (
							<FeatureIcon name={icon} />
						) : undefined)}
				</View>
			) : undefined}
			<Stack gap="none" grow>
				{titleAccessory ? (
					<Row gap="xs" wrap>
						<Text
							variant={density === "compact" ? "small" : "label"}
							lines={titleLines}
							weight={titleWeight ?? "medium"}
						>
							{title}
						</Text>
						{titleAccessory}
					</Row>
				) : (
					<Text
						variant={density === "compact" ? "small" : "label"}
						lines={titleLines}
						weight={titleWeight ?? "medium"}
					>
						{title}
					</Text>
				)}
				{description ? (
					<Text
						variant={density === "compact" ? "navigation" : "small"}
						weight="regular"
						tone="secondary"
						lines={descriptionLines}
						italic={descriptionItalic}
					>
						{description}
					</Text>
				) : undefined}
			</Stack>
			{trailing}
			{onPress && showChevron ? (
				<Icon name="chevron" size="sm" tone="secondary" />
			) : undefined}
		</Row>
	);
	const item = onPress ? (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected }}
			accessibilityLabel={accessibilityLabel ?? title}
			onPress={onPress}
			onPressIn={action ? (): void => setActionPressed(true) : undefined}
			onPressOut={action ? (): void => setActionPressed(false) : undefined}
			onHoverIn={action ? undefined : (): void => setHovered(true)}
			onHoverOut={action ? undefined : (): void => setHovered(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				...(action ? { paddingVertical: spacing.paddingVertical } : spacing),
				boxShadow: roleTone ? roleGlow(roleTone, theme.mode) : undefined,
				minHeight: interactiveRow.minHeight,
				justifyContent: "center",
				borderRadius: interactiveRow.borderRadius,
				backgroundColor: selected
					? theme.background.selected
					: !action && (hovered || pressed)
						? theme.background.hover
						: "transparent",
				outlineWidth: focused && !action ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: interactiveRow.focusOffset,
			})}
		>
			{content}
		</Pressable>
	) : (
		<View style={spacing}>{content}</View>
	);
	return action ? (
		<View
			onPointerEnter={(): void => setHovered(true)}
			onPointerLeave={(): void => setHovered(false)}
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				paddingHorizontal: spacing.paddingHorizontal,
				marginHorizontal: spacing.marginHorizontal,
				borderRadius: interactiveRow.borderRadius,
				backgroundColor:
					hovered || actionPressed ? theme.background.hover : "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: interactiveRow.focusOffset,
			}}
		>
			<View style={{ flex: 1, minWidth: 0 }}>{item}</View>
			{action}
		</View>
	) : (
		item
	);
};
