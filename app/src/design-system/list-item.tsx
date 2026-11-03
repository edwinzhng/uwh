import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "./avatar";
import { FeatureIcon } from "./feature-icon";
import { Icon, type IconName } from "./icon";
import { interactiveRow, listRowSpacing } from "./interactive-row-layout";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry } from "./tokens";

type Props = {
	title: string;
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
	onPress?: () => void;
	selected?: boolean;
	flush?: boolean;
	cardRow?: boolean;
};
export const ListItem = ({
	title,
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
	onPress,
	selected = false,
	flush = false,
	cardRow = false,
}: Props): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
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
			{leading ??
				(avatar ? (
					<Avatar name={avatar} personId={avatarId} />
				) : icon ? (
					<FeatureIcon name={icon} />
				) : undefined)}
			<Stack gap="none" grow>
				{titleAccessory ? (
					<Row gap="xs" wrap>
						<Text variant="label" lines={titleLines} weight={titleWeight}>
							{title}
						</Text>
						{titleAccessory}
					</Row>
				) : (
					<Text variant="label" lines={titleLines} weight={titleWeight}>
						{title}
					</Text>
				)}
				{description ? (
					<Text
						variant="small"
						tone="secondary"
						lines={descriptionLines}
						italic={descriptionItalic}
					>
						{description}
					</Text>
				) : undefined}
			</Stack>
			{trailing ??
				(onPress ? (
					<Icon name="chevron" size="sm" tone="secondary" />
				) : undefined)}
		</Row>
	);
	return onPress ? (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? title}
			onPress={onPress}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				...spacing,
				minHeight: interactiveRow.minHeight,
				justifyContent: "center",
				borderRadius: interactiveRow.borderRadius,
				backgroundColor: selected
					? theme.background.secondary
					: hovered || pressed
						? theme.background.hover
						: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: interactiveRow.focusOffset,
			})}
		>
			{content}
		</Pressable>
	) : (
		<View style={spacing}>{content}</View>
	);
};
