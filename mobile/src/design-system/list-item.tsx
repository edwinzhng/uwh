import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icon";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

type Props = {
	title: string;
	description?: string;
	descriptionLines?: 1 | 2 | 3;
	accessibilityLabel?: string;
	icon?: IconName;
	avatar?: string;
	trailing?: ReactNode;
	onPress?: () => void;
	selected?: boolean;
	flush?: boolean;
};
export const ListItem = ({
	title,
	description,
	descriptionLines,
	accessibilityLabel,
	icon,
	avatar,
	trailing,
	onPress,
	selected = false,
	flush = false,
}: Props): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const content = (
		<Row>
			{avatar ? (
				<Avatar name={avatar} />
			) : icon ? (
				<Icon name={icon} tone="secondary" />
			) : undefined}
			<Stack gap="xxs" grow>
				<Text variant="label">{title}</Text>
				{description ? (
					<Text variant="small" tone="secondary" lines={descriptionLines}>
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
				paddingVertical: space.sm,
				paddingHorizontal: flush ? space.none : space.sm,
				minHeight: geometry.touch,
				borderRadius: corners.panel,
				backgroundColor: selected
					? theme.background.secondary
					: hovered || pressed
						? theme.background.hover
						: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
			})}
		>
			{content}
		</Pressable>
	) : (
		<View
			style={{
				paddingVertical: space.sm,
				paddingHorizontal: flush ? space.none : space.sm,
			}}
		>
			{content}
		</View>
	);
};
